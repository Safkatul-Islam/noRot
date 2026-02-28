"use strict";
const electron = require("electron");
const IPC_CHANNELS = {
  RELAUNCH_APP: "app:relaunch",
  START_TELEMETRY: "telemetry:start",
  STOP_TELEMETRY: "telemetry:stop",
  IS_TELEMETRY_ACTIVE: "telemetry:active",
  GET_LATEST_SCORE: "score:latest",
  ON_SCORE_UPDATE: "score:update",
  RESPOND_TO_INTERVENTION: "intervention:respond",
  ON_INTERVENTION: "intervention:new",
  ON_INTERVENTION_DISMISS: "intervention:auto-dismiss",
  GET_USAGE_HISTORY: "usage:get",
  GET_APP_STATS: "apps:stats",
  GET_SETTINGS: "settings:get",
  UPDATE_SETTINGS: "settings:update",
  ON_PLAY_AUDIO: "audio:play",
  REPORT_AUDIO_PLAYED: "audio:played",
  TEST_INTERVENTION: "intervention:test",
  CHECK_PERMISSIONS: "permissions:check",
  REQUEST_PERMISSIONS: "permissions:request",
  ON_WINDOW_SHOWN: "window:shown",
  // Chat
  CHAT_SEND: "chat:send",
  CHAT_CANCEL: "chat:cancel",
  ON_CHAT_TOKEN: "chat:token",
  ON_CHAT_DONE: "chat:done",
  ON_CHAT_ERROR: "chat:error",
  // Todos
  EXTRACT_TODOS: "todos:extract",
  GET_TODOS: "todos:get",
  ADD_TODO: "todos:add",
  TOGGLE_TODO: "todos:toggle",
  DELETE_TODO: "todos:delete",
  UPDATE_TODO: "todos:update",
  REORDER_TODOS: "todos:reorder",
  SET_TODOS: "todos:set",
  APPEND_TODOS: "todos:append",
  ON_TODOS_UPDATED: "todos:updated",
  // Todo overlay window
  OPEN_TODO_OVERLAY: "todo-overlay:open",
  CLOSE_TODO_OVERLAY: "todo-overlay:close",
  IS_TODO_OVERLAY_OPEN: "todo-overlay:is-open",
  // Voice status broadcast (for todo overlay VoiceOrb)
  BROADCAST_VOICE_STATUS: "voice:broadcast-status",
  ON_VOICE_STATUS: "voice:status-update",
  // App focus tracking
  ON_APP_FOCUS_CHANGED: "app:focus-changed",
  // Voice agent
  ENSURE_VOICE_AGENT: "agent:ensure",
  ENSURE_CHECKIN_AGENT: "agent:ensure-checkin",
  // Voice chat (todo overlay orb → main window)
  VOICE_CHAT_OPEN: "voice:chat-open",
  ON_VOICE_CHAT_OPEN: "voice:on-chat-open",
  HAS_ELEVENLABS_KEY: "settings:has-elevenlabs-key",
  ELEVENLABS_TTS: "tts:elevenlabs",
  // Wins tracker
  GET_WINS: "wins:get"
};
electron.contextBridge.exposeInMainWorld("norot", {
  // --- App ---
  relaunchApp: (rendererUrl) => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.RELAUNCH_APP, rendererUrl);
  },
  // --- Telemetry ---
  startTelemetry: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.START_TELEMETRY);
  },
  stopTelemetry: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.STOP_TELEMETRY);
  },
  isTelemetryActive: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.IS_TELEMETRY_ACTIVE);
  },
  // --- Scores ---
  getLatestScore: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.GET_LATEST_SCORE);
  },
  onScoreUpdate: (callback) => {
    const handler = (_event, score) => {
      callback(score);
    };
    electron.ipcRenderer.on(IPC_CHANNELS.ON_SCORE_UPDATE, handler);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.ON_SCORE_UPDATE, handler);
    };
  },
  // --- Interventions ---
  respondToIntervention: (eventId, response) => {
    return electron.ipcRenderer.invoke(
      IPC_CHANNELS.RESPOND_TO_INTERVENTION,
      eventId,
      response
    );
  },
  onIntervention: (callback) => {
    const handler = (_event, data) => {
      callback(data);
    };
    electron.ipcRenderer.on(IPC_CHANNELS.ON_INTERVENTION, handler);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.ON_INTERVENTION, handler);
    };
  },
  onInterventionDismiss: (callback) => {
    const handler = (_event, data) => {
      callback(data);
    };
    electron.ipcRenderer.on(IPC_CHANNELS.ON_INTERVENTION_DISMISS, handler);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.ON_INTERVENTION_DISMISS, handler);
    };
  },
  testIntervention: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.TEST_INTERVENTION);
  },
  // --- Settings ---
  getSettings: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS);
  },
  updateSettings: (settings) => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, settings);
  },
  // --- Audio ---
  reportAudioPlayed: (interventionId) => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.REPORT_AUDIO_PLAYED, interventionId);
  },
  onPlayAudio: (callback) => {
    const handler = (_event, data) => {
      callback(data);
    };
    electron.ipcRenderer.on(IPC_CHANNELS.ON_PLAY_AUDIO, handler);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.ON_PLAY_AUDIO, handler);
    };
  },
  // --- Usage ---
  getUsageHistory: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.GET_USAGE_HISTORY);
  },
  getAppStats: (minutes) => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.GET_APP_STATS, minutes);
  },
  // --- Wins ---
  getWins: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.GET_WINS);
  },
  // --- Permissions ---
  checkPermissions: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.CHECK_PERMISSIONS);
  },
  requestPermissions: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.REQUEST_PERMISSIONS);
  },
  // --- Window lifecycle ---
  onWindowShown: (callback) => {
    const handler = () => {
      callback();
    };
    electron.ipcRenderer.on(IPC_CHANNELS.ON_WINDOW_SHOWN, handler);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.ON_WINDOW_SHOWN, handler);
    };
  },
  // --- Chat ---
  sendChatMessage: (message, sessionId) => {
    electron.ipcRenderer.send(IPC_CHANNELS.CHAT_SEND, { message, sessionId });
  },
  cancelChat: () => {
    electron.ipcRenderer.send(IPC_CHANNELS.CHAT_CANCEL);
  },
  onChatToken: (callback) => {
    const handler = (_event, token) => {
      callback(token);
    };
    electron.ipcRenderer.on(IPC_CHANNELS.ON_CHAT_TOKEN, handler);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.ON_CHAT_TOKEN, handler);
    };
  },
  onChatDone: (callback) => {
    const handler = () => {
      callback();
    };
    electron.ipcRenderer.on(IPC_CHANNELS.ON_CHAT_DONE, handler);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.ON_CHAT_DONE, handler);
    };
  },
  onChatError: (callback) => {
    const handler = (_event, error) => {
      callback(error);
    };
    electron.ipcRenderer.on(IPC_CHANNELS.ON_CHAT_ERROR, handler);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.ON_CHAT_ERROR, handler);
    };
  },
  // --- Todos ---
  extractTodos: (transcript) => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.EXTRACT_TODOS, transcript);
  },
  getTodos: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.GET_TODOS);
  },
  addTodo: (item) => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.ADD_TODO, item);
  },
  toggleTodo: (id) => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_TODO, id);
  },
  deleteTodo: (id) => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.DELETE_TODO, id);
  },
  updateTodo: (id, fields) => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.UPDATE_TODO, id, fields);
  },
  reorderTodos: (id, newOrder) => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.REORDER_TODOS, id, newOrder);
  },
  setTodos: (items) => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.SET_TODOS, items);
  },
  appendTodos: (items) => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.APPEND_TODOS, items);
  },
  onTodosUpdated: (callback) => {
    const handler = (_event, todos) => {
      callback(todos);
    };
    electron.ipcRenderer.on(IPC_CHANNELS.ON_TODOS_UPDATED, handler);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.ON_TODOS_UPDATED, handler);
    };
  },
  // --- Todo Overlay ---
  openTodoOverlay: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.OPEN_TODO_OVERLAY);
  },
  closeTodoOverlay: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.CLOSE_TODO_OVERLAY);
  },
  isTodoOverlayOpen: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.IS_TODO_OVERLAY_OPEN);
  },
  // --- Voice Status ---
  broadcastVoiceStatus: (isSpeaking, severity, amplitude, lastWordBoundaryAt) => {
    electron.ipcRenderer.send(IPC_CHANNELS.BROADCAST_VOICE_STATUS, { isSpeaking, severity, amplitude, lastWordBoundaryAt });
  },
  onVoiceStatus: (callback) => {
    const handler = (_event, data) => {
      callback(data);
    };
    electron.ipcRenderer.on(IPC_CHANNELS.ON_VOICE_STATUS, handler);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.ON_VOICE_STATUS, handler);
    };
  },
  // --- App Focus ---
  onAppFocusChanged: (callback) => {
    const handler = (_event, data) => {
      callback(data);
    };
    electron.ipcRenderer.on(IPC_CHANNELS.ON_APP_FOCUS_CHANGED, handler);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.ON_APP_FOCUS_CHANGED, handler);
    };
  },
  // --- Voice Agent ---
  ensureVoiceAgent: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.ENSURE_VOICE_AGENT);
  },
  // --- Check-in Agent ---
  ensureCheckinAgent: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.ENSURE_CHECKIN_AGENT);
  },
  // --- Voice Chat ---
  openVoiceChat: () => {
    electron.ipcRenderer.send(IPC_CHANNELS.VOICE_CHAT_OPEN);
  },
  onVoiceChatOpen: (callback) => {
    const handler = () => {
      callback();
    };
    electron.ipcRenderer.on(IPC_CHANNELS.ON_VOICE_CHAT_OPEN, handler);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.ON_VOICE_CHAT_OPEN, handler);
    };
  },
  hasElevenLabsKey: () => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.HAS_ELEVENLABS_KEY);
  },
  // --- ElevenLabs TTS (main-process proxy to avoid CORS issues) ---
  synthesizeElevenLabsTts: (text, voiceId, tts) => {
    return electron.ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_TTS, { text, voiceId, tts });
  }
});
