import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './types';

contextBridge.exposeInMainWorld('norot', {
  // --- App ---
  relaunchApp: (rendererUrl?: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.RELAUNCH_APP, rendererUrl);
  },

  // --- Telemetry ---
  startTelemetry: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.START_TELEMETRY);
  },

  stopTelemetry: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.STOP_TELEMETRY);
  },

  isTelemetryActive: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IS_TELEMETRY_ACTIVE);
  },

  // --- Scores ---
  getLatestScore: (): Promise<unknown> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_LATEST_SCORE);
  },

  onScoreUpdate: (callback: (score: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, score: unknown) => {
      callback(score);
    };
    ipcRenderer.on(IPC_CHANNELS.ON_SCORE_UPDATE, handler);
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_SCORE_UPDATE, handler);
    };
  },

  onLiveScoreUpdate: (callback: (score: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, score: unknown) => {
      callback(score);
    };
    ipcRenderer.on(IPC_CHANNELS.ON_LIVE_SCORE_UPDATE, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_LIVE_SCORE_UPDATE, handler);
    };
  },

  // --- Interventions ---
  respondToIntervention: (
    eventId: string,
    response: 'snoozed' | 'dismissed' | 'working'
  ): Promise<void> => {
    return ipcRenderer.invoke(
      IPC_CHANNELS.RESPOND_TO_INTERVENTION,
      eventId,
      response
    );
  },

  onIntervention: (callback: (event: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.ON_INTERVENTION, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_INTERVENTION, handler);
    };
  },

  onInterventionDismiss: (callback: (data: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.ON_INTERVENTION_DISMISS, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_INTERVENTION_DISMISS, handler);
    };
  },

  testIntervention: (): Promise<unknown> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TEST_INTERVENTION);
  },

  // --- Settings ---
  getSettings: (): Promise<unknown> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS);
  },

  updateSettings: (settings: Record<string, unknown>): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, settings);
  },

  // --- Audio ---
  reportAudioPlayed: (interventionId: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REPORT_AUDIO_PLAYED, interventionId);
  },

  onPlayAudio: (callback: (data: unknown) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.ON_PLAY_AUDIO, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_PLAY_AUDIO, handler);
    };
  },

  // --- Usage ---
  getUsageHistory: (): Promise<unknown[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_USAGE_HISTORY);
  },

  getAppStats: (minutes?: number): Promise<unknown[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_APP_STATS, minutes);
  },

  // --- Wins ---
  getWins: (): Promise<unknown> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_WINS);
  },

  // --- Permissions ---
  checkPermissions: (): Promise<{ screenRecording: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CHECK_PERMISSIONS);
  },

  requestPermissions: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REQUEST_PERMISSIONS);
  },

  // --- Window lifecycle ---
  onWindowShown: (callback: () => void): (() => void) => {
    const handler = () => { callback(); };
    ipcRenderer.on(IPC_CHANNELS.ON_WINDOW_SHOWN, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_WINDOW_SHOWN, handler);
    };
  },

  // --- Chat ---
  sendChatMessage: (message: string, sessionId: string): void => {
    ipcRenderer.send(IPC_CHANNELS.CHAT_SEND, { message, sessionId });
  },

  cancelChat: (): void => {
    ipcRenderer.send(IPC_CHANNELS.CHAT_CANCEL);
  },

  onChatToken: (callback: (token: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, token: string) => {
      callback(token);
    };
    ipcRenderer.on(IPC_CHANNELS.ON_CHAT_TOKEN, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_CHAT_TOKEN, handler);
    };
  },

  onChatDone: (callback: () => void): (() => void) => {
    const handler = () => { callback(); };
    ipcRenderer.on(IPC_CHANNELS.ON_CHAT_DONE, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_CHAT_DONE, handler);
    };
  },

  onChatError: (callback: (error: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string) => {
      callback(error);
    };
    ipcRenderer.on(IPC_CHANNELS.ON_CHAT_ERROR, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_CHAT_ERROR, handler);
    };
  },

  // --- Todos ---
  extractTodos: (transcript: string): Promise<unknown[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXTRACT_TODOS, transcript);
  },

  getTodos: (): Promise<unknown[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_TODOS);
  },

  addTodo: (item: unknown): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ADD_TODO, item);
  },

  toggleTodo: (id: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_TODO, id);
  },

  deleteTodo: (id: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DELETE_TODO, id);
  },

  updateTodo: (id: string, fields: unknown): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_TODO, id, fields);
  },

  reorderTodos: (id: string, newOrder: number): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.REORDER_TODOS, id, newOrder);
  },

  setTodos: (items: unknown[]): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.SET_TODOS, items);
  },

  appendTodos: (items: unknown[]): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.APPEND_TODOS, items);
  },

  onTodosUpdated: (callback: (todos: unknown[]) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, todos: unknown[]) => {
      callback(todos);
    };
    ipcRenderer.on(IPC_CHANNELS.ON_TODOS_UPDATED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_TODOS_UPDATED, handler);
    };
  },

  // --- Todo Overlay ---
  openTodoOverlay: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_TODO_OVERLAY);
  },

  closeTodoOverlay: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CLOSE_TODO_OVERLAY);
  },

  isTodoOverlayOpen: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IS_TODO_OVERLAY_OPEN);
  },

  // --- Voice Status ---
  broadcastVoiceStatus: (isSpeaking: boolean, severity: number, amplitude: number, lastWordBoundaryAt: number): void => {
    ipcRenderer.send(IPC_CHANNELS.BROADCAST_VOICE_STATUS, { isSpeaking, severity, amplitude, lastWordBoundaryAt });
  },

  onVoiceStatus: (callback: (data: { isSpeaking: boolean; severity: number; amplitude: number; lastWordBoundaryAt: number }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { isSpeaking: boolean; severity: number; amplitude: number; lastWordBoundaryAt: number }) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.ON_VOICE_STATUS, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_VOICE_STATUS, handler);
    };
  },

  // --- App Focus ---
  onAppFocusChanged: (callback: (data: { focused: boolean }) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { focused: boolean }) => {
      callback(data);
    };
    ipcRenderer.on(IPC_CHANNELS.ON_APP_FOCUS_CHANGED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_APP_FOCUS_CHANGED, handler);
    };
  },

  // --- Voice Agent ---
  ensureVoiceAgent: (): Promise<{ agentId: string; signedUrl: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ENSURE_VOICE_AGENT);
  },

  // --- Check-in Agent ---
  ensureCheckinAgent: (): Promise<{ agentId: string; signedUrl: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ENSURE_CHECKIN_AGENT);
  },

  // --- Voice Chat ---
  openVoiceChat: (): void => {
    ipcRenderer.send(IPC_CHANNELS.VOICE_CHAT_OPEN);
  },

  onVoiceChatOpen: (callback: () => void): (() => void) => {
    const handler = () => { callback(); };
    ipcRenderer.on(IPC_CHANNELS.ON_VOICE_CHAT_OPEN, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.ON_VOICE_CHAT_OPEN, handler);
    };
  },

  hasElevenLabsKey: (): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HAS_ELEVENLABS_KEY);
  },

  // --- ElevenLabs TTS (main-process proxy to avoid CORS issues) ---
  synthesizeElevenLabsTts: (text: string, voiceId: string, tts: unknown): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_TTS, { text, voiceId, tts });
  },
});
