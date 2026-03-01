import type { NoRotAPI } from '@/lib/electron-api';
import type { TodoItem } from '@norot/shared';

/**
 * Mock implementation of the noRot Electron API for browser dev.
 * Stores state in memory so the app works outside Electron.
 */

let mockTodos: TodoItem[] = [];
let todoListeners: Array<(todos: TodoItem[]) => void> = [];
let mockSettings: Record<string, unknown> = {
  persona: 'calm_friend',
  toughLoveExplicitAllowed: false,
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
  timeFormat: '12h',
  timeZone: 'system',
  lastDailySetupDate: '',
  elevenLabsAgentId: '',
  elevenLabsAgentPersona: '',
  elevenLabsAgentVersion: 0,
  monitoringEnabled: true,
  selectedVoiceId: '',
};

let mockSnoozedUntil: number | null = null;
let snoozeListeners: Array<(data: { snoozedUntil: number | null }) => void> = [];
let snoozeTimer: ReturnType<typeof setTimeout> | null = null;

function broadcastSnooze() {
  for (const cb of snoozeListeners) cb({ snoozedUntil: mockSnoozedUntil });
}

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
  onLiveScoreUpdate: () => () => {},
  respondToIntervention: async () => {},
  getActiveIntervention: async () => null,
  onIntervention: () => () => {},
  onInterventionDismiss: () => () => {},
  onInterventionResponse: () => () => {},

  getSnoozeState: async () => ({ snoozedUntil: mockSnoozedUntil }),
  setSnooze: async (durationMs: number) => {
    const ms = Math.max(0, Math.floor(durationMs));
    if (ms === 0) {
      mockSnoozedUntil = null;
      if (snoozeTimer) clearTimeout(snoozeTimer);
      snoozeTimer = null;
      broadcastSnooze();
      return;
    }

    mockSnoozedUntil = Date.now() + ms;
    if (snoozeTimer) clearTimeout(snoozeTimer);
    snoozeTimer = setTimeout(() => {
      snoozeTimer = null;
      mockSnoozedUntil = null;
      broadcastSnooze();
    }, ms);
    broadcastSnooze();
  },
  cancelSnooze: async () => {
    mockSnoozedUntil = null;
    if (snoozeTimer) clearTimeout(snoozeTimer);
    snoozeTimer = null;
    broadcastSnooze();
  },
  onSnoozeUpdated: (callback: (data: { snoozedUntil: number | null }) => void) => {
    snoozeListeners.push(callback);
    return () => {
      snoozeListeners = snoozeListeners.filter((cb) => cb !== callback);
    };
  },

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
  getUsageHistory: async () => [],
  getAppStats: async () => [
    { appName: 'VS Code', category: 'productive', totalSeconds: 7200, lastSeen: new Date().toISOString() },
    { appName: 'Chrome', category: 'neutral', totalSeconds: 5400, lastSeen: new Date().toISOString() },
    { appName: 'Terminal', category: 'productive', totalSeconds: 3600, lastSeen: new Date().toISOString() },
    { appName: 'Slack', category: 'social', totalSeconds: 1800, lastSeen: new Date().toISOString() },
    { appName: 'YouTube', domain: 'youtube.com', category: 'entertainment', totalSeconds: 4200, lastSeen: new Date().toISOString() },
    { appName: 'Netflix', category: 'entertainment', totalSeconds: 2100, lastSeen: new Date().toISOString() },
    { appName: 'Discord', category: 'social', totalSeconds: 1200, lastSeen: new Date().toISOString() },
    { appName: 'Twitter', domain: 'x.com', category: 'social', totalSeconds: 900, lastSeen: new Date().toISOString() },
    { appName: 'Notion', category: 'productive', totalSeconds: 1500, lastSeen: new Date().toISOString() },
    { appName: 'A Very Long Application Name For Testing', category: 'neutral', totalSeconds: 60, lastSeen: new Date().toISOString() },
  ],
  getInstalledApps: async () => [
    'Google Chrome', 'VS Code', 'Terminal', 'Slack', 'Discord',
    'Spotify', 'Notion', 'Figma', 'Safari', 'Messages',
    'Calendar', 'Notes', 'Preview',
  ],
  getWins: async () => ({ refocusCount: 3, totalFocusedMinutes: 47 }),
  getSettings: async () => ({ ...mockSettings } as any),
  updateSettings: async (settings: Record<string, unknown>) => {
    Object.assign(mockSettings, settings);
  },

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
  extractTodos: async (_transcript: string) => [
    {
      id: 'mock-todo-1',
      text: 'Review pull request on GitHub',
      done: false,
      order: 0,
      app: 'Chrome',
      url: 'github.com',
      allowedApps: ['Chrome', 'VS Code', 'Terminal'],
    },
    {
      id: 'mock-todo-2',
      text: 'Write unit tests for auth module',
      done: false,
      order: 1,
      app: 'VS Code',
      allowedApps: ['VS Code', 'Terminal', 'Chrome'],
    },
  ] as TodoItem[],
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
  updateTodo: async (id: string, fields: Partial<Omit<TodoItem, 'id'>>) => {
    const todo = mockTodos.find((t) => t.id === id);
    if (!todo) return;

    if (typeof fields.text === 'string' && fields.text.trim()) {
      todo.text = fields.text;
    }
    if (typeof fields.done === 'boolean') {
      todo.done = fields.done;
    }
    if (typeof fields.order === 'number') {
      todo.order = fields.order;
    }

    if ('app' in fields) {
      const app = typeof fields.app === 'string' ? fields.app.trim() : '';
      if (app) todo.app = app;
      else delete (todo as Partial<TodoItem>).app;
    }
    if ('url' in fields) {
      const url = typeof fields.url === 'string' ? fields.url.trim() : '';
      if (url) todo.url = url;
      else delete (todo as Partial<TodoItem>).url;
    }
    if ('allowedApps' in fields) {
      if (Array.isArray(fields.allowedApps)) todo.allowedApps = fields.allowedApps;
      else delete (todo as Partial<TodoItem>).allowedApps;
    }
    if ('deadline' in fields) {
      const deadline = typeof fields.deadline === 'string' ? fields.deadline.trim() : '';
      if (deadline) todo.deadline = deadline;
      else delete (todo as Partial<TodoItem>).deadline;
    }

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
  appendTodos: async (items: TodoItem[]) => {
    mockTodos.push(...items);
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
  isTodoOverlayOpen: async () => false,

  // App focus tracking — no-op in browser
  onAppFocusChanged: () => () => {},

  // Voice status broadcast — no-op in browser
  broadcastVoiceStatus: (_isSpeaking: boolean, _severity: number, _amplitude: number, _lastWordBoundaryAt: number) => {},
  onVoiceStatus: () => () => {},

  // Voice agent — not available in browser dev, throw structured error
  ensureVoiceAgent: async () => { throw new Error(JSON.stringify({ code: 'NETWORK', message: 'Voice is not available in browser dev mode.', canRetry: false })); },

  // Check-in agent — not available in browser dev, throw structured error
  ensureCheckinAgent: async () => { throw new Error(JSON.stringify({ code: 'NETWORK', message: 'Voice check-in is not available in browser dev mode.', canRetry: false })); },

  // Voice chat — no-op in browser
  openVoiceChat: () => { console.log('[mock] openVoiceChat'); },
  onVoiceChatOpen: () => () => {},
  hasElevenLabsKey: async () => false,
  synthesizeElevenLabsTts: async () => {
    throw new Error('Not supported outside Electron');
  },
};

// Chat listener arrays
let chatTokenListeners: Array<(token: string) => void> = [];
let chatDoneListeners: Array<() => void> = [];
let chatErrorListeners: Array<(error: string) => void> = [];
