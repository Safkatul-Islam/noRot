import type { NoRotAPI } from '@/lib/electron-api';
import type { TodoItem } from '@norot/shared';

/**
 * Mock implementation of the noRot Electron API for browser dev.
 * Stores state in memory so the app works outside Electron.
 */

let mockTodos: TodoItem[] = [];
let todoListeners: Array<(todos: TodoItem[]) => void> = [];

function broadcastTodos() {
  for (const cb of todoListeners) cb([...mockTodos]);
}

const MOCK_CHAT_RESPONSES = [
  'Hey! I\'m your noRot assistant. What are you working on today?',
  'Nice! Let me help you stay focused. What tends to distract you the most?',
  'Got it. I\'ll keep an eye out for those patterns. Anything else you want to tell me?',
];
let chatMsgIndex = 0;

export const mockNorotAPI: NoRotAPI = {
  relaunchApp: async () => {},
  startTelemetry: async () => {},
  stopTelemetry: async () => {},
  isTelemetryActive: async () => false,
  getLatestScore: async () => null,
  onScoreUpdate: () => () => {},
  respondToIntervention: async () => {},
  onIntervention: () => () => {},
  onInterventionDismiss: () => () => {},
  testIntervention: async () => ({
    id: 'mock-test',
    timestamp: new Date().toISOString(),
    score: 42,
    severity: 1 as const,
    persona: 'calm_friend' as const,
    text: 'This is a test intervention.',
    userResponse: 'pending' as const,
    audioPlayed: false,
  }),
  getHistory: async () => [],
  getUsageHistory: async () => [],
  getAppStats: async () => [],
  getSettings: async () => ({
    persona: 'calm_friend',
    scoreThreshold: 35,
    cooldownSeconds: 180,
    apiUrl: 'http://127.0.0.1:8000',
    elevenLabsApiKey: '',
    geminiApiKey: '',
    muted: false,
    ttsEngine: 'auto',
    scriptSource: 'default',
    visionEnabled: true,
    categoryRules: [],
    hasCompletedOnboarding: false,
    userName: '',
    autoShowTodoOverlay: true,
  }),
  updateSettings: async () => {},

  reportAudioPlayed: async () => {},
  onPlayAudio: () => () => {},
  checkPermissions: async () => ({ screenRecording: false }),
  requestPermissions: async () => {},
  onWindowShown: () => () => {},

  // Chat — simulate streaming with a canned response
  sendChatMessage: (_message: string, _sessionId: string) => {
    const response = MOCK_CHAT_RESPONSES[chatMsgIndex % MOCK_CHAT_RESPONSES.length];
    chatMsgIndex++;
    let i = 0;
    const interval = setInterval(() => {
      if (i < response.length) {
        for (const cb of chatTokenListeners) cb(response[i]);
        i++;
      } else {
        clearInterval(interval);
        for (const cb of chatDoneListeners) cb();
      }
    }, 20);
  },
  cancelChat: () => {},
  onChatToken: (callback: (token: string) => void) => {
    chatTokenListeners.push(callback);
    return () => {
      chatTokenListeners = chatTokenListeners.filter((cb) => cb !== callback);
    };
  },
  onChatDone: (callback: () => void) => {
    chatDoneListeners.push(callback);
    return () => {
      chatDoneListeners = chatDoneListeners.filter((cb) => cb !== callback);
    };
  },
  onChatError: (callback: (error: string) => void) => {
    chatErrorListeners.push(callback);
    return () => {
      chatErrorListeners = chatErrorListeners.filter((cb) => cb !== callback);
    };
  },

  // Todos — in-memory CRUD
  getTodos: async () => [...mockTodos],
  addTodo: async (item: TodoItem) => {
    mockTodos.push(item);
    broadcastTodos();
  },
  toggleTodo: async (id: string) => {
    const todo = mockTodos.find((t) => t.id === id);
    if (todo) todo.done = !todo.done;
    broadcastTodos();
  },
  deleteTodo: async (id: string) => {
    mockTodos = mockTodos.filter((t) => t.id !== id);
    broadcastTodos();
  },
  reorderTodos: async (id: string, newOrder: number) => {
    const idx = mockTodos.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const [item] = mockTodos.splice(idx, 1);
    item.order = newOrder;
    mockTodos.splice(newOrder, 0, item);
    broadcastTodos();
  },
  setTodos: async (items: TodoItem[]) => {
    mockTodos = [...items];
    broadcastTodos();
  },
  onTodosUpdated: (callback: (todos: TodoItem[]) => void) => {
    todoListeners.push(callback);
    return () => {
      todoListeners = todoListeners.filter((cb) => cb !== callback);
    };
  },

  // Todo overlay — no-op in browser
  openTodoOverlay: async () => {},
  closeTodoOverlay: async () => {},

  // Voice status broadcast — no-op in browser
  broadcastVoiceStatus: (_isSpeaking: boolean, _severity: number, _amplitude: number) => {},
  onVoiceStatus: () => () => {},
};

// Chat listener arrays
let chatTokenListeners: Array<(token: string) => void> = [];
let chatDoneListeners: Array<() => void> = [];
let chatErrorListeners: Array<(error: string) => void> = [];
