import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './types';
contextBridge.exposeInMainWorld('norot', {
    // --- App ---
    relaunchApp: (rendererUrl) => {
        return ipcRenderer.invoke(IPC_CHANNELS.RELAUNCH_APP, rendererUrl);
    },
    // --- Telemetry ---
    startTelemetry: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.START_TELEMETRY);
    },
    stopTelemetry: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.STOP_TELEMETRY);
    },
    isTelemetryActive: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.IS_TELEMETRY_ACTIVE);
    },
    // --- Scores ---
    getLatestScore: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.GET_LATEST_SCORE);
    },
    onScoreUpdate: (callback) => {
        const handler = (_event, score) => {
            callback(score);
        };
        ipcRenderer.on(IPC_CHANNELS.ON_SCORE_UPDATE, handler);
        // Return unsubscribe function
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.ON_SCORE_UPDATE, handler);
        };
    },
    // --- Interventions ---
    respondToIntervention: (eventId, response) => {
        return ipcRenderer.invoke(IPC_CHANNELS.RESPOND_TO_INTERVENTION, eventId, response);
    },
    onIntervention: (callback) => {
        const handler = (_event, data) => {
            callback(data);
        };
        ipcRenderer.on(IPC_CHANNELS.ON_INTERVENTION, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.ON_INTERVENTION, handler);
        };
    },
    onInterventionDismiss: (callback) => {
        const handler = (_event, data) => {
            callback(data);
        };
        ipcRenderer.on(IPC_CHANNELS.ON_INTERVENTION_DISMISS, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.ON_INTERVENTION_DISMISS, handler);
        };
    },
    testIntervention: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.TEST_INTERVENTION);
    },
    // --- Settings ---
    getSettings: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS);
    },
    updateSettings: (settings) => {
        return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, settings);
    },
    // --- Audio ---
    reportAudioPlayed: (interventionId) => {
        return ipcRenderer.invoke(IPC_CHANNELS.REPORT_AUDIO_PLAYED, interventionId);
    },
    onPlayAudio: (callback) => {
        const handler = (_event, data) => {
            callback(data);
        };
        ipcRenderer.on(IPC_CHANNELS.ON_PLAY_AUDIO, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.ON_PLAY_AUDIO, handler);
        };
    },
    // --- Usage ---
    getUsageHistory: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.GET_USAGE_HISTORY);
    },
    getAppStats: (minutes) => {
        return ipcRenderer.invoke(IPC_CHANNELS.GET_APP_STATS, minutes);
    },
    // --- Wins ---
    getWins: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.GET_WINS);
    },
    // --- Permissions ---
    checkPermissions: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.CHECK_PERMISSIONS);
    },
    requestPermissions: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.REQUEST_PERMISSIONS);
    },
    // --- Window lifecycle ---
    onWindowShown: (callback) => {
        const handler = () => { callback(); };
        ipcRenderer.on(IPC_CHANNELS.ON_WINDOW_SHOWN, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.ON_WINDOW_SHOWN, handler);
        };
    },
    // --- Chat ---
    sendChatMessage: (message, sessionId) => {
        ipcRenderer.send(IPC_CHANNELS.CHAT_SEND, { message, sessionId });
    },
    cancelChat: () => {
        ipcRenderer.send(IPC_CHANNELS.CHAT_CANCEL);
    },
    onChatToken: (callback) => {
        const handler = (_event, token) => {
            callback(token);
        };
        ipcRenderer.on(IPC_CHANNELS.ON_CHAT_TOKEN, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.ON_CHAT_TOKEN, handler);
        };
    },
    onChatDone: (callback) => {
        const handler = () => { callback(); };
        ipcRenderer.on(IPC_CHANNELS.ON_CHAT_DONE, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.ON_CHAT_DONE, handler);
        };
    },
    onChatError: (callback) => {
        const handler = (_event, error) => {
            callback(error);
        };
        ipcRenderer.on(IPC_CHANNELS.ON_CHAT_ERROR, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.ON_CHAT_ERROR, handler);
        };
    },
    // --- Todos ---
    extractTodos: (transcript) => {
        return ipcRenderer.invoke(IPC_CHANNELS.EXTRACT_TODOS, transcript);
    },
    getTodos: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.GET_TODOS);
    },
    addTodo: (item) => {
        return ipcRenderer.invoke(IPC_CHANNELS.ADD_TODO, item);
    },
    toggleTodo: (id) => {
        return ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_TODO, id);
    },
    deleteTodo: (id) => {
        return ipcRenderer.invoke(IPC_CHANNELS.DELETE_TODO, id);
    },
    updateTodo: (id, fields) => {
        return ipcRenderer.invoke(IPC_CHANNELS.UPDATE_TODO, id, fields);
    },
    reorderTodos: (id, newOrder) => {
        return ipcRenderer.invoke(IPC_CHANNELS.REORDER_TODOS, id, newOrder);
    },
    setTodos: (items) => {
        return ipcRenderer.invoke(IPC_CHANNELS.SET_TODOS, items);
    },
    appendTodos: (items) => {
        return ipcRenderer.invoke(IPC_CHANNELS.APPEND_TODOS, items);
    },
    onTodosUpdated: (callback) => {
        const handler = (_event, todos) => {
            callback(todos);
        };
        ipcRenderer.on(IPC_CHANNELS.ON_TODOS_UPDATED, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.ON_TODOS_UPDATED, handler);
        };
    },
    // --- Todo Overlay ---
    openTodoOverlay: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.OPEN_TODO_OVERLAY);
    },
    closeTodoOverlay: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.CLOSE_TODO_OVERLAY);
    },
    isTodoOverlayOpen: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.IS_TODO_OVERLAY_OPEN);
    },
    // --- Voice Status ---
    broadcastVoiceStatus: (isSpeaking, severity, amplitude, lastWordBoundaryAt) => {
        ipcRenderer.send(IPC_CHANNELS.BROADCAST_VOICE_STATUS, { isSpeaking, severity, amplitude, lastWordBoundaryAt });
    },
    onVoiceStatus: (callback) => {
        const handler = (_event, data) => {
            callback(data);
        };
        ipcRenderer.on(IPC_CHANNELS.ON_VOICE_STATUS, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.ON_VOICE_STATUS, handler);
        };
    },
    // --- App Focus ---
    onAppFocusChanged: (callback) => {
        const handler = (_event, data) => {
            callback(data);
        };
        ipcRenderer.on(IPC_CHANNELS.ON_APP_FOCUS_CHANGED, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.ON_APP_FOCUS_CHANGED, handler);
        };
    },
    // --- Voice Agent ---
    ensureVoiceAgent: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.ENSURE_VOICE_AGENT);
    },
    // --- Check-in Agent ---
    ensureCheckinAgent: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.ENSURE_CHECKIN_AGENT);
    },
    // --- Voice Chat ---
    openVoiceChat: () => {
        ipcRenderer.send(IPC_CHANNELS.VOICE_CHAT_OPEN);
    },
    onVoiceChatOpen: (callback) => {
        const handler = () => { callback(); };
        ipcRenderer.on(IPC_CHANNELS.ON_VOICE_CHAT_OPEN, handler);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.ON_VOICE_CHAT_OPEN, handler);
        };
    },
    hasElevenLabsKey: () => {
        return ipcRenderer.invoke(IPC_CHANNELS.HAS_ELEVENLABS_KEY);
    },
    // --- ElevenLabs TTS (main-process proxy to avoid CORS issues) ---
    synthesizeElevenLabsTts: (text, voiceId, tts) => {
        return ipcRenderer.invoke(IPC_CHANNELS.ELEVENLABS_TTS, { text, voiceId, tts });
    },
});
