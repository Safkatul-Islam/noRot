import { app, ipcMain, BrowserWindow, systemPreferences, shell } from 'electron';
import { randomUUID } from 'crypto';
import path from 'path';
import { IPC_CHANNELS } from './types';
import * as database from './database';
import * as orchestrator from './orchestrator';
import type { InterventionEvent, Severity, ChatMessage, TodoItem, TTSSettings, UsageCategories } from '@norot/shared';
import { generateScript, streamChat, extractTodosWithApps, titleizeTodoTexts } from './gemini-client';
import { buildInterventionText } from './intervention-text';
import { clearContextCache } from './context-checker';
import { closeInterventionOverlayWindow, getMainWindow, getTodoWindow, setTodoWindow, createTodoOverlayWindow, showInterventionOverlayWindow } from './window-manager';
import { ensureAgent, ensureCheckinAgent } from './elevenlabs-agent';
import { cancelSnooze, getSnoozedUntil, onSnoozeUpdated, setSnooze } from './snooze-state';
import { getActiveIntervention, clearActiveIntervention, setActiveIntervention } from './intervention-state';

let lastScreenProbeAt = 0;
let lastScreenProbeOk = false;
const MAX_CHAT_SESSIONS = 10;
const MAX_MESSAGES_PER_SESSION = 100;
const chatSessions = new Map<string, ChatMessage[]>();
const chatAbortControllers = new Map<string, AbortController>();

function broadcastSnoozeState(): void {
  const snoozedUntil = getSnoozedUntil();
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    win.webContents.send(IPC_CHANNELS.ON_SNOOZE_UPDATED, { snoozedUntil });
  }
}

onSnoozeUpdated(() => {
  broadcastSnoozeState();
});

async function canReadActiveWindow(): Promise<boolean> {
  try {
    const mod = await import('get-windows');
    const win = await mod.activeWindow();
    return Boolean(win?.owner?.name);
  } catch {
    return false;
  }
}

function resolveTimeZoneSetting(timeZoneSetting: string | undefined): string {
  const system = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timeZoneSetting || timeZoneSetting === 'system') return system || 'UTC';
  return timeZoneSetting;
}

function parseHHMMToMinutes(val: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(val.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function getNowMinutesInTimeZone(timeZoneSetting: string | undefined): number {
  const timeZone = resolveTimeZoneSetting(timeZoneSetting);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value);
    const m = Number(parts.find((p) => p.type === 'minute')?.value);
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
  } catch {
    // ignore
  }

  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
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
      // handleInterventionResponse is safe against double-close: if auto-dismiss
      // already cleared activeInterventionId, the state guard inside skips mutation.
      // The user's explicit response always wins (overwrites auto-dismiss DB value).
      orchestrator.handleInterventionResponse(eventId, response);
      clearActiveIntervention(eventId);
      closeInterventionOverlayWindow(); // idempotent — no-op if already closed
      for (const win of BrowserWindow.getAllWindows()) {
        if (win.isDestroyed()) continue;
        win.webContents.send(IPC_CHANNELS.ON_INTERVENTION_RESPONSE, { interventionId: eventId, response });
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.GET_ACTIVE_INTERVENTION, () => {
    return getActiveIntervention();
  });

  // --- Snooze (cross-window) ---

  ipcMain.handle(IPC_CHANNELS.GET_SNOOZE_STATE, () => {
    return { snoozedUntil: getSnoozedUntil() };
  });

  ipcMain.handle(IPC_CHANNELS.SET_SNOOZE, (_event, durationMs: number) => {
    setSnooze(durationMs);
  });

  ipcMain.handle(IPC_CHANNELS.CANCEL_SNOOZE, () => {
    cancelSnooze();
  });

  // --- Audio Played ---

  ipcMain.handle(
    IPC_CHANNELS.REPORT_AUDIO_PLAYED,
    (_event, interventionId: string) => {
      database.updateAudioPlayed(interventionId);
    }
  );

  // --- Usage ---

  ipcMain.handle(IPC_CHANNELS.GET_USAGE_HISTORY, () => {
    return database.getUsageHistory(60);
  });

  // --- App Stats ---

  ipcMain.handle(IPC_CHANNELS.GET_APP_STATS, (_event, minutes?: number) => {
    return database.getAppStats(minutes);
  });

  // --- Installed Apps (macOS /Applications scan) ---

  ipcMain.handle(IPC_CHANNELS.GET_INSTALLED_APPS, async () => {
    const fs = await import('fs');
    const path = await import('path');
    try {
      const entries = fs.readdirSync('/Applications');
      return entries
        .filter((e) => e.endsWith('.app'))
        .map((e) => e.replace(/\.app$/, ''))
        .sort();
    } catch {
      return [];
    }
  });

  // --- Wins ---

  ipcMain.handle(IPC_CHANNELS.GET_WINS, () => {
    return database.getWinsData();
  });

  // --- Settings ---

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return database.getSettings();
  });

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_SETTINGS,
    (_event, settings: Record<string, unknown>) => {
      const currentSettings = database.getSettings();

      // Safety gate: only allow the Tough Love persona if the user opted in.
      const nextToughLoveAllowed =
        typeof settings.toughLoveExplicitAllowed === 'boolean'
          ? settings.toughLoveExplicitAllowed
          : currentSettings.toughLoveExplicitAllowed;
      const nextPersona =
        typeof settings.persona === 'string'
          ? (settings.persona as typeof currentSettings.persona)
          : currentSettings.persona;
      if (nextPersona === 'tough_love' && !nextToughLoveAllowed) {
        settings.persona = 'coach';
      }

      // If the ElevenLabs API key is changing, clear the cached agent
      // (it belongs to the old account / key)
      if ('elevenLabsApiKey' in settings) {
        if (settings.elevenLabsApiKey !== currentSettings.elevenLabsApiKey) {
          database.updateSetting('elevenLabsAgentId', '');
          database.updateSetting('elevenLabsAgentPersona', '');
        }
      }

      for (const [key, value] of Object.entries(settings)) {
        database.updateSetting(key, value);
      }
      orchestrator.refreshSettings();
    }
  );

  // --- Test Intervention ---

  ipcMain.handle(IPC_CHANNELS.TEST_INTERVENTION, async () => {
    const settings = database.getSettings();
    const testCategories: UsageCategories = {
      activeApp: 'Chrome',
      activeCategory: 'entertainment',
      activeDomain: 'youtube.com',
    };
    let text = buildInterventionText(
      1 as Severity,
      settings.persona,
      testCategories,
    );

    // Try AI provider for a dynamic script, fall back to hardcoded text
    if (settings.scriptSource === 'gemini' && settings.geminiApiKey) {
      const geminiText = await generateScript(
        settings.geminiApiKey,
        1 as Severity,
        settings.persona,
        settings.toughLoveExplicitAllowed,
      );
      if (geminiText) text = geminiText;
    } else if (settings.scriptSource === 'amd' && settings.amdEndpointUrl) {
      const { generateScript: amdGenerate } = await import('./amd-client');
      const amdText = await amdGenerate(
        settings.amdEndpointUrl,
        settings.amdApiKey,
        1 as Severity,
        settings.persona,
        settings.toughLoveExplicitAllowed,
      );
      if (amdText) text = amdText;
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
    setActiveIntervention(intervention);
    showInterventionOverlayWindow(intervention);
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return intervention;
    mainWindow.webContents.send(IPC_CHANNELS.ON_INTERVENTION, intervention);
    // Always emit the audio request so the renderer can show a "muted/snoozed" toast
    // (main process doesn't know about renderer-side snooze).
    if (text) {
      const tts: TTSSettings = { model: 'eleven_v3', stability: 50, speed: 1.0 };
      mainWindow.webContents.send(IPC_CHANNELS.ON_PLAY_AUDIO, {
        procrastinationScore: 30,
        severity: 1 as Severity,
        reasons: ['Test intervention'],
        recommendation: { mode: 'nudge', persona: settings.persona, text: intervention.text, tts, cooldownSeconds: 180 },
        interventionId: intervention.id,
      });
    }
    return intervention;
  });

  // --- ElevenLabs TTS (main-process proxy for renderer) ---

  ipcMain.handle(
    IPC_CHANNELS.ELEVENLABS_TTS,
    async (_event, payload: { text: string; voiceId: string; tts: TTSSettings }) => {
      const settings = database.getSettings();
      const apiKey = typeof settings.elevenLabsApiKey === 'string' ? settings.elevenLabsApiKey.trim() : '';
      if (!apiKey) {
        throw new Error(JSON.stringify({ code: 'NO_KEY', message: 'ElevenLabs API key is not configured' }));
      }

      const text = typeof payload?.text === 'string' ? payload.text : '';
      const voiceId = typeof payload?.voiceId === 'string' ? payload.voiceId : '';
      const tts = payload?.tts as TTSSettings | undefined;
      if (!text || !voiceId || !tts) {
        throw new Error(JSON.stringify({ code: 'BAD_REQUEST', message: 'Missing text, voiceId, or tts settings' }));
      }

      const stabilityRaw = Number.isFinite(tts.stability) ? tts.stability : 0.5;
      const stability01 =
        stabilityRaw > 1 ? Math.max(0, Math.min(stabilityRaw / 100, 1)) : Math.max(0, Math.min(stabilityRaw, 1));
      // Newer ElevenLabs models validate stability as discrete values.
      // Map any numeric input onto the closest supported bucket.
      const stability =
        stability01 <= 0.25 ? 0.0 : stability01 <= 0.75 ? 0.5 : 1.0;
      const modelId = typeof tts.model === 'string' && tts.model ? tts.model : 'eleven_v3';
      const speed = Number.isFinite(tts.speed) ? tts.speed : 1.0;

      const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: 0.75,
            speed,
          },
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(JSON.stringify({ code: 'HTTP', statusCode: response.status, message: errorText }));
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('audio/')) {
        throw new Error(JSON.stringify({ code: 'NON_AUDIO', message: `Non-audio content-type: ${contentType}` }));
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 1000) {
        throw new Error(JSON.stringify({ code: 'SMALL_AUDIO', message: `Suspiciously small audio (${buffer.byteLength} bytes)` }));
      }

      // IPC payloads should stay JSON-safe.
      return Buffer.from(new Uint8Array(buffer)).toString('base64');
    }
  );

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

    return { screenRecording: true, status, canReadActiveWindow: lastScreenProbeOk };
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
    const isDailySetup = sessionId.startsWith('daily-setup');

    let systemInstruction: string;
    if (isDailySetup) {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      systemInstruction =
        `You are noRot, a friendly AI productivity companion.${nameClause} ` +
        `It is currently ${timeOfDay}. ` +
        'You are helping the user plan their day. Ask what they need to work on today. ' +
        'noRot works best for tasks the user will do on their computer (apps and websites). If they bring up offline / real-world activities, acknowledge it briefly and pivot to the computer side (look something up, send a message, set a reminder), or ask what computer task they want to focus on. ' +
        'Help break down big tasks into actionable items. ' +
        'Be concise, warm, and encouraging. Don\'t be preachy.';
    } else {
      systemInstruction =
        `You are noRot, a friendly AI productivity companion.${nameClause} ` +
        'Help the user plan their work, break down tasks, and stay focused. ' +
        'noRot works best for tasks the user will do on their computer (apps and websites). If they bring up offline / real-world activities, acknowledge it briefly and pivot to the computer side, or ask what computer task they want to focus on. ' +
        'Be concise and actionable. When the user describes tasks, help them create a clear plan.';
    }

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

  ipcMain.handle(IPC_CHANNELS.EXTRACT_TODOS, async (_event, transcript: string) => {
    const settings = database.getSettings();
    if (!settings.geminiApiKey) return [];
    return extractTodosWithApps(settings.geminiApiKey, transcript, settings.timeZone);
  });

  ipcMain.handle(IPC_CHANNELS.TITLEIZE_TODO_TEXTS, async (_event, texts: unknown) => {
    const list = Array.isArray(texts) ? texts : [];
    const cleaned = list
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t) => t.length > 0)
      .slice(0, 30);

    // Always return an array so the renderer can fall back safely.
    if (cleaned.length === 0) return [];

    const settings = database.getSettings();
    const apiKey = typeof settings.geminiApiKey === 'string' ? settings.geminiApiKey.trim() : '';
    if (!apiKey) return cleaned;

    const titled = await titleizeTodoTexts(apiKey, cleaned);
    return Array.isArray(titled) && titled.length === cleaned.length ? titled : cleaned;
  });

  ipcMain.handle(IPC_CHANNELS.GET_TODOS, () => {
    return database.getTodos();
  });

  ipcMain.handle(IPC_CHANNELS.ADD_TODO, (_event, item: TodoItem) => {
    database.addTodo(item);
    clearContextCache();
    broadcastTodos();
  });

  ipcMain.handle(IPC_CHANNELS.TOGGLE_TODO, (_event, id: string) => {
    database.toggleTodo(id);
    clearContextCache();
    broadcastTodos();
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_TODO, (_event, id: string) => {
    database.deleteTodo(id);
    clearContextCache();
    broadcastTodos();
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_TODO, (_event, id: string, fields: Partial<Omit<TodoItem, 'id'>>) => {
    database.updateTodo(id, fields);
    clearContextCache();
    broadcastTodos();
  });

  ipcMain.handle(IPC_CHANNELS.REORDER_TODOS, (_event, id: string, newOrder: number) => {
    database.reorderTodo(id, newOrder);
    broadcastTodos();
  });

  ipcMain.handle(IPC_CHANNELS.SET_TODOS, (_event, items: TodoItem[]) => {
    database.setTodos(items);
    clearContextCache();
    broadcastTodos();
  });

  ipcMain.handle(IPC_CHANNELS.APPEND_TODOS, (_event, items: TodoItem[]) => {
    database.appendTodos(items);
    clearContextCache();
    broadcastTodos();
  });

  // --- Completed Todos ---

  function broadcastCompletedTodos(): void {
    const completed = database.getCompletedTodos();
    const main = getMainWindow();
    if (main && !main.isDestroyed()) {
      main.webContents.send(IPC_CHANNELS.ON_COMPLETED_TODOS_UPDATED, completed);
    }
    const todo = getTodoWindow();
    if (todo && !todo.isDestroyed()) {
      todo.webContents.send(IPC_CHANNELS.ON_COMPLETED_TODOS_UPDATED, completed);
    }
  }

  ipcMain.handle(IPC_CHANNELS.COMPLETE_TODO, (_event, id: string) => {
    database.completeTodo(id);
    clearContextCache();
    broadcastTodos();
    broadcastCompletedTodos();
  });

  ipcMain.handle(IPC_CHANNELS.GET_COMPLETED_TODOS, () => {
    return database.getCompletedTodos();
  });

  ipcMain.handle(IPC_CHANNELS.RESTORE_TODO, (_event, id: string) => {
    database.restoreTodo(id);
    clearContextCache();
    broadcastTodos();
    broadcastCompletedTodos();
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_COMPLETED_TODO, (_event, id: string) => {
    database.deleteCompletedTodo(id);
    broadcastCompletedTodos();
  });

  // --- Todo Overlay Window ---

  ipcMain.handle(IPC_CHANNELS.OPEN_TODO_OVERLAY, () => {
    const settings = database.getSettings();
    if (!settings.hasCompletedOnboarding) return;
    createTodoOverlayWindow();

    // Overlay should only be visible when noRot is NOT focused.
    const todoWin = getTodoWindow();
    const anyFocused = BrowserWindow.getAllWindows().some(
      (w) => !w.isDestroyed() && w.isFocused() && w !== todoWin
    );
    if (todoWin && !todoWin.isDestroyed()) {
      if (anyFocused) {
        todoWin.hide();
      } else {
        todoWin.showInactive();
      }
    }
  });

  ipcMain.handle(IPC_CHANNELS.CLOSE_TODO_OVERLAY, () => {
    const todoWin = getTodoWindow();
    if (todoWin && !todoWin.isDestroyed()) {
      todoWin.destroy();
      setTodoWindow(null);
    }
  });

  ipcMain.handle(IPC_CHANNELS.IS_TODO_OVERLAY_OPEN, () => {
    const todoWin = getTodoWindow();
    return Boolean(todoWin && !todoWin.isDestroyed());
  });

  // --- Voice Status Broadcast ---

  ipcMain.on(IPC_CHANNELS.BROADCAST_VOICE_STATUS, (event, payload: { isSpeaking: boolean; severity: number; amplitude: number; lastWordBoundaryAt: number }) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed() && win.webContents !== event.sender) {
        win.webContents.send(IPC_CHANNELS.ON_VOICE_STATUS, payload);
      }
    }
  });

  // --- Voice Agent ---

  ipcMain.handle(IPC_CHANNELS.ENSURE_VOICE_AGENT, async () => {
    const settings = database.getSettings();
    if (!settings.elevenLabsApiKey) {
      throw new Error(JSON.stringify({
        code: 'NO_API_KEY',
        message: 'No ElevenLabs API key found. Add one in Settings to use voice.',
        canRetry: false,
      }));
    }

    try {
      return await ensureAgent(settings.elevenLabsApiKey, settings.persona);
    } catch (err) {
      console.error('[ipc] voice agent error:', err);
      const msg = err instanceof Error ? err.message : '';

      let code: string;
      let message: string;
      let canRetry: boolean;

      if (msg.includes(':401') || msg.includes(':403')) {
        code = 'AUTH';
        message = 'That API key doesn\'t seem to be valid. Double-check it in Settings.';
        canRetry = false;
      } else if (msg.includes(':429')) {
        code = 'RATE_LIMIT';
        message = 'Too many requests. Wait a few seconds and try again.';
        canRetry = true;
      } else if (msg.includes(':422')) {
        code = 'UNKNOWN';
        const detail = msg.split(':422:')[1]?.trim();
        message = detail
          ? `ElevenLabs rejected the voice agent config (422): ${detail}`
          : 'ElevenLabs rejected the voice agent config (422). Update noRot and try again.';
        canRetry = false;
      } else if (msg.includes(':network')) {
        code = 'NETWORK';
        message = 'Couldn\'t reach the voice servers. Check your internet and try again.';
        canRetry = true;
      } else if (/:5\d\d/.test(msg)) {
        code = 'NETWORK';
        message = 'The voice servers are temporarily unavailable. Try again in a moment.';
        canRetry = true;
      } else {
        code = 'UNKNOWN';
        message = 'Something went wrong starting voice. Try again, or switch to manual.';
        canRetry = true;
      }

      throw new Error(JSON.stringify({ code, message, canRetry }));
    }
  });

  // --- Check-in Agent (severity 3+) ---

  ipcMain.handle(IPC_CHANNELS.ENSURE_CHECKIN_AGENT, async () => {
    const settings = database.getSettings();
    if (!settings.elevenLabsApiKey) {
      throw new Error(JSON.stringify({
        code: 'NO_API_KEY',
        message: 'No ElevenLabs API key found. Add one in Settings to use voice.',
        canRetry: false,
      }));
    }

    try {
      const latestScore = database.getLatestScore();
      const latestSnapshot = database.getLatestSnapshot();
      const allTodos = database.getTodos();
      const activeTodos = allTodos.filter((t) => !t.done);
      const nowMinutes = getNowMinutesInTimeZone(settings.timeZone);
      const overdueTodos = activeTodos.filter((t) => {
        if (!t.deadline) return false;
        const dlMinutes = parseHHMMToMinutes(t.deadline);
        if (dlMinutes == null) return false;
        return nowMinutes > dlMinutes;
      });

      return await ensureCheckinAgent(settings.elevenLabsApiKey, settings.persona, {
        score: latestScore?.procrastinationScore ?? 0,
        severity: (latestScore?.severity ?? 0) as import('@norot/shared').Severity,
        activeApp: latestSnapshot?.activeApp ?? 'unknown',
        activeDomain: latestSnapshot?.activeDomain,
        activeTodos,
        overdueTodos,
      });
    } catch (err) {
      console.error('[ipc] check-in agent error:', err);
      const msg = err instanceof Error ? err.message : '';

      // If already a structured error, re-throw as-is
      try { const p = JSON.parse(msg); if (p.code) throw err; } catch { /* not JSON */ }

      let code: string;
      let message: string;
      let canRetry: boolean;

      if (msg.includes(':401') || msg.includes(':403')) {
        code = 'AUTH';
        message = 'That API key doesn\'t seem to be valid. Double-check it in Settings.';
        canRetry = false;
      } else if (msg.includes(':429')) {
        code = 'RATE_LIMIT';
        message = 'Too many requests. Wait a few seconds and try again.';
        canRetry = true;
      } else if (msg.includes(':422')) {
        code = 'UNKNOWN';
        const detail = msg.split(':422:')[1]?.trim();
        message = detail
          ? `ElevenLabs rejected the voice agent config (422): ${detail}`
          : 'ElevenLabs rejected the voice agent config (422). Update noRot and try again.';
        canRetry = false;
      } else if (msg.includes(':network')) {
        code = 'NETWORK';
        message = 'Couldn\'t reach the voice servers. Check your internet and try again.';
        canRetry = true;
      } else if (/:5\d\d/.test(msg)) {
        code = 'NETWORK';
        message = 'The voice servers are temporarily unavailable. Try again in a moment.';
        canRetry = true;
      } else {
        code = 'UNKNOWN';
        message = 'Something went wrong starting voice check-in. Try again, or switch to manual.';
        canRetry = true;
      }

      throw new Error(JSON.stringify({ code, message, canRetry }));
    }
  });

  // --- Voice Chat (todo overlay orb → main window) ---

  ipcMain.handle(IPC_CHANNELS.HAS_ELEVENLABS_KEY, () => {
    const settings = database.getSettings();
    return Boolean(typeof settings.elevenLabsApiKey === 'string' && settings.elevenLabsApiKey.trim());
  });

  ipcMain.on(IPC_CHANNELS.VOICE_CHAT_OPEN, () => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send(IPC_CHANNELS.ON_VOICE_CHAT_OPEN);
  });
}
