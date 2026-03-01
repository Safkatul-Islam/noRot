import { app, ipcMain, BrowserWindow, systemPreferences, shell } from 'electron';
import { randomUUID } from 'crypto';
import path from 'path';
import { IPC_CHANNELS } from './types';
import * as database from './database';
import * as orchestrator from './orchestrator';
import * as apiClient from './api-client';
import type { InterventionEvent, Severity, ChatMessage, TodoItem } from '@norot/shared';
import { INTERVENTION_SCRIPTS, stripEmotionTags } from '@norot/shared';
import { generateScript, streamChat, extractTodos } from './gemini-client';
import { getMainWindow, getTodoWindow, setTodoWindow, createTodoOverlayWindow } from './window-manager';

let lastScreenProbeAt = 0;
let lastScreenProbeOk = false;
const MAX_CHAT_SESSIONS = 10;
const MAX_MESSAGES_PER_SESSION = 100;
const chatSessions = new Map<string, ChatMessage[]>();
const chatAbortControllers = new Map<string, AbortController>();

async function canReadActiveWindow(): Promise<boolean> {
  try {
    const mod = await import('get-windows');
    const win = await mod.activeWindow();
    return Boolean(win?.owner?.name);
  } catch {
    return false;
  }
}

export function registerIpcHandlers(): void {
  // --- App ---

  ipcMain.handle(IPC_CHANNELS.RELAUNCH_APP, (_event, rendererUrl?: string) => {
    const nextArgs = process.argv.slice(1);

    if (typeof rendererUrl === 'string' && rendererUrl.startsWith('http')) {
      const hasRendererUrlArg = nextArgs.some((a) => a.startsWith('--renderer-url='));
      if (!hasRendererUrlArg) nextArgs.push(`--renderer-url=${rendererUrl}`);
    }

    app.relaunch({ args: nextArgs });
    app.exit(0);
  });

  // --- Telemetry ---

  ipcMain.handle(IPC_CHANNELS.START_TELEMETRY, () => {
    orchestrator.startTelemetry();
  });

  ipcMain.handle(IPC_CHANNELS.STOP_TELEMETRY, () => {
    orchestrator.stopTelemetry();
  });

  ipcMain.handle(IPC_CHANNELS.IS_TELEMETRY_ACTIVE, () => {
    return orchestrator.isTelemetryActive();
  });

  // --- Scores ---

  ipcMain.handle(IPC_CHANNELS.GET_LATEST_SCORE, () => {
    return database.getLatestScore();
  });

  // --- Interventions ---

  ipcMain.handle(
    IPC_CHANNELS.RESPOND_TO_INTERVENTION,
    (_event, eventId: string, response: 'snoozed' | 'dismissed' | 'working') => {
      orchestrator.handleInterventionResponse(eventId, response);
    }
  );

  // --- Audio Played ---

  ipcMain.handle(
    IPC_CHANNELS.REPORT_AUDIO_PLAYED,
    (_event, interventionId: string) => {
      database.updateAudioPlayed(interventionId);
    }
  );

  // --- History ---

  ipcMain.handle(IPC_CHANNELS.GET_HISTORY, (_event, limit?: number) => {
    return database.getScoreHistory(limit);
  });

  // --- Usage ---

  ipcMain.handle(IPC_CHANNELS.GET_USAGE_HISTORY, () => {
    return database.getUsageHistory(60);
  });

  // --- App Stats ---

  ipcMain.handle(IPC_CHANNELS.GET_APP_STATS, (_event, minutes?: number) => {
    return database.getAppStats(minutes);
  });

  // --- Settings ---

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return database.getSettings();
  });

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_SETTINGS,
    (_event, settings: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(settings)) {
        database.updateSetting(key, value);
      }
      orchestrator.refreshSettings();
    }
  );

  // --- Test Intervention ---

  ipcMain.handle(IPC_CHANNELS.TEST_INTERVENTION, async () => {
    const settings = database.getSettings();
    let text = stripEmotionTags(INTERVENTION_SCRIPTS[settings.persona][1]);

    // Try Gemini for a dynamic script, fall back to hardcoded text
    if (settings.scriptSource === 'gemini' && settings.geminiApiKey) {
      const geminiText = await generateScript(settings.geminiApiKey, 1 as Severity, settings.persona);
      if (geminiText) text = geminiText;
    }

    const intervention: InterventionEvent = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      score: 30,
      severity: 1 as Severity,
      persona: settings.persona,
      text,
      userResponse: 'pending',
      audioPlayed: false,
    };
    database.insertIntervention(intervention);
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return intervention;
    mainWindow.webContents.send(IPC_CHANNELS.ON_INTERVENTION, intervention);
    if (!settings.muted && text) {
      mainWindow.webContents.send(IPC_CHANNELS.ON_PLAY_AUDIO, {
        procrastinationScore: 30,
        severity: 1 as Severity,
        recommendation: { persona: settings.persona, text: intervention.text },
        interventionId: intervention.id,
      });
    }
    return intervention;
  });

  // --- Permissions ---

  ipcMain.handle(IPC_CHANNELS.CHECK_PERMISSIONS, async () => {
    if (process.platform !== 'darwin') {
      return { screenRecording: true, status: 'granted', canReadActiveWindow: true };
    }

    const status = systemPreferences.getMediaAccessStatus('screen');
    if (status !== 'granted') {
      return { screenRecording: false, status, canReadActiveWindow: false };
    }

    const now = Date.now();
    if (now - lastScreenProbeAt > 5000) {
      lastScreenProbeAt = now;
      lastScreenProbeOk = await canReadActiveWindow();
    }

    return { screenRecording: lastScreenProbeOk, status, canReadActiveWindow: lastScreenProbeOk };
  });

  ipcMain.handle(IPC_CHANNELS.REQUEST_PERMISSIONS, async () => {
    if (process.platform !== 'darwin') return;

    const statusBefore = systemPreferences.getMediaAccessStatus('screen');
    if (statusBefore === 'granted') return;

    lastScreenProbeAt = 0;
    lastScreenProbeOk = await canReadActiveWindow();
    if (lastScreenProbeOk) return;

    const statusAfter = systemPreferences.getMediaAccessStatus('screen');
    if (statusAfter !== 'granted') {
      shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
      );
    }
  });

  // --- Chat ---

  ipcMain.on(IPC_CHANNELS.CHAT_SEND, async (event, payload: { message: string; sessionId: string }) => {
    const { message, sessionId } = payload;
    const settings = database.getSettings();

    if (!settings.geminiApiKey) {
      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC_CHANNELS.ON_CHAT_ERROR, 'No Gemini API key configured');
        event.sender.send(IPC_CHANNELS.ON_CHAT_DONE);
      }
      return;
    }

    // Abort any in-flight stream for this session
    const existing = chatAbortControllers.get(sessionId);
    if (existing) {
      existing.abort();
      chatAbortControllers.delete(sessionId);
    }
    const controller = new AbortController();
    chatAbortControllers.set(sessionId, controller);
    const { signal } = controller;

    // Get or create session history (with eviction of oldest sessions)
    if (!chatSessions.has(sessionId)) {
      if (chatSessions.size >= MAX_CHAT_SESSIONS) {
        const oldest = chatSessions.keys().next().value;
        if (oldest !== undefined) chatSessions.delete(oldest);
      }
      chatSessions.set(sessionId, []);
    }
    const history = chatSessions.get(sessionId)!;
    history.push({ role: 'user', content: message });

    // Trim old messages to prevent unbounded growth
    if (history.length > MAX_MESSAGES_PER_SESSION) {
      history.splice(0, history.length - MAX_MESSAGES_PER_SESSION);
    }

    const nameClause = settings.userName ? ` The user's name is ${settings.userName}.` : '';
    const systemInstruction =
      `You are noRot, a friendly AI productivity companion.${nameClause} ` +
      'Help the user plan their work, break down tasks, and stay focused. ' +
      'Be concise and actionable. When the user describes tasks, help them create a clear plan.';

    let fullReply = '';
    try {
      for await (const token of streamChat(settings.geminiApiKey, history, systemInstruction)) {
        if (signal.aborted || event.sender.isDestroyed()) break;
        fullReply += token;
        event.sender.send(IPC_CHANNELS.ON_CHAT_TOKEN, token);
      }
      if (!signal.aborted) {
        history.push({ role: 'assistant', content: fullReply });
      }
    } catch (err) {
      if (!signal.aborted && !event.sender.isDestroyed()) {
        const errMsg = err instanceof Error ? err.message : 'Unknown chat error';
        console.error('[ipc] chat error:', errMsg);
        event.sender.send(IPC_CHANNELS.ON_CHAT_ERROR, errMsg);
      }
    } finally {
      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC_CHANNELS.ON_CHAT_DONE);
      }
      if (chatAbortControllers.get(sessionId)?.signal === signal) {
        chatAbortControllers.delete(sessionId);
      }
    }
  });

  ipcMain.on(IPC_CHANNELS.CHAT_CANCEL, () => {
    for (const [id, controller] of chatAbortControllers) {
      controller.abort();
      chatAbortControllers.delete(id);
    }
  });

  // --- Todos ---

  function broadcastTodos(): void {
    const todos = database.getTodos();
    const main = getMainWindow();
    if (main && !main.isDestroyed()) {
      main.webContents.send(IPC_CHANNELS.ON_TODOS_UPDATED, todos);
    }
    const todo = getTodoWindow();
    if (todo && !todo.isDestroyed()) {
      todo.webContents.send(IPC_CHANNELS.ON_TODOS_UPDATED, todos);
    }
  }

  ipcMain.handle(IPC_CHANNELS.GET_TODOS, () => {
    return database.getTodos();
  });

  ipcMain.handle(IPC_CHANNELS.ADD_TODO, (_event, item: TodoItem) => {
    database.addTodo(item);
    broadcastTodos();
  });

  ipcMain.handle(IPC_CHANNELS.TOGGLE_TODO, (_event, id: string) => {
    database.toggleTodo(id);
    broadcastTodos();
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_TODO, (_event, id: string) => {
    database.deleteTodo(id);
    broadcastTodos();
  });

  ipcMain.handle(IPC_CHANNELS.REORDER_TODOS, (_event, id: string, newOrder: number) => {
    database.reorderTodo(id, newOrder);
    broadcastTodos();
  });

  ipcMain.handle(IPC_CHANNELS.SET_TODOS, (_event, items: TodoItem[]) => {
    database.setTodos(items);
    broadcastTodos();
  });

  // --- Todo Overlay Window ---

  ipcMain.handle(IPC_CHANNELS.OPEN_TODO_OVERLAY, () => {
    createTodoOverlayWindow();
  });

  ipcMain.handle(IPC_CHANNELS.CLOSE_TODO_OVERLAY, () => {
    const todoWin = getTodoWindow();
    if (todoWin && !todoWin.isDestroyed()) {
      todoWin.destroy();
      setTodoWindow(null);
    }
  });

  // --- Voice Status Broadcast ---

  ipcMain.on(IPC_CHANNELS.BROADCAST_VOICE_STATUS, (_event, payload: { isSpeaking: boolean; severity: number; amplitude: number }) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.ON_VOICE_STATUS, payload);
      }
    }
  });
}
