// IPC channel constants
export const IPC_CHANNELS = {
  RELAUNCH_APP: 'app:relaunch',
  START_TELEMETRY: 'telemetry:start',
  STOP_TELEMETRY: 'telemetry:stop',
  IS_TELEMETRY_ACTIVE: 'telemetry:active',
  GET_LATEST_SCORE: 'score:latest',
  ON_SCORE_UPDATE: 'score:update',
  RESPOND_TO_INTERVENTION: 'intervention:respond',
  ON_INTERVENTION: 'intervention:new',
  ON_INTERVENTION_DISMISS: 'intervention:auto-dismiss',
  GET_HISTORY: 'history:get',
  GET_USAGE_HISTORY: 'usage:get',
  GET_APP_STATS: 'apps:stats',
  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',
  ON_PLAY_AUDIO: 'audio:play',
  REPORT_AUDIO_PLAYED: 'audio:played',
  TEST_INTERVENTION: 'intervention:test',
  CHECK_PERMISSIONS: 'permissions:check',
  REQUEST_PERMISSIONS: 'permissions:request',
  ON_WINDOW_SHOWN: 'window:shown',

  // Chat
  CHAT_SEND: 'chat:send',
  CHAT_CANCEL: 'chat:cancel',
  ON_CHAT_TOKEN: 'chat:token',
  ON_CHAT_DONE: 'chat:done',
  ON_CHAT_ERROR: 'chat:error',

  // Todos
  GET_TODOS: 'todos:get',
  ADD_TODO: 'todos:add',
  TOGGLE_TODO: 'todos:toggle',
  DELETE_TODO: 'todos:delete',
  REORDER_TODOS: 'todos:reorder',
  SET_TODOS: 'todos:set',
  ON_TODOS_UPDATED: 'todos:updated',

  // Todo overlay window
  OPEN_TODO_OVERLAY: 'todo-overlay:open',
  CLOSE_TODO_OVERLAY: 'todo-overlay:close',

  // Voice status broadcast (for overlay VoiceOrb)
  BROADCAST_VOICE_STATUS: 'voice:broadcast-status',
  ON_VOICE_STATUS: 'voice:status-update',
} as const;

export interface CategoryRule {
  id: string;
  matchType: 'app' | 'title';
  pattern: string;
  category: 'productive' | 'neutral' | 'social' | 'entertainment';
}

export interface UserSettings {
  persona: 'calm_friend' | 'coach' | 'tough_love';
  scoreThreshold: number;
  cooldownSeconds: number;
  apiUrl: string;
  elevenLabsApiKey: string;
  geminiApiKey: string;
  muted: boolean;
  ttsEngine: 'auto' | 'elevenlabs' | 'local';
  scriptSource: 'default' | 'gemini';
  visionEnabled: boolean;
  categoryRules: CategoryRule[];
  hasCompletedOnboarding: boolean;
  userName: string;
  autoShowTodoOverlay: boolean;
}

export const KNOWN_BROWSERS = [
  'Google Chrome',
  'Chrome',
  'Safari',
  'Firefox',
  'Arc',
  'Microsoft Edge',
  'Brave Browser',
  'Opera',
  'Vivaldi',
  'Chromium',
];

export const DEFAULT_CATEGORY_RULES: CategoryRule[] = [
  { id: 'prod-code', matchType: 'app', pattern: 'Code', category: 'productive' },
  { id: 'prod-terminal', matchType: 'app', pattern: 'Terminal', category: 'productive' },
  { id: 'prod-iterm', matchType: 'app', pattern: 'iTerm', category: 'productive' },
  { id: 'prod-xcode', matchType: 'app', pattern: 'Xcode', category: 'productive' },
  { id: 'prod-notion', matchType: 'app', pattern: 'Notion', category: 'productive' },
  { id: 'ent-twitter', matchType: 'app', pattern: 'Twitter', category: 'entertainment' },
  { id: 'ent-reddit', matchType: 'app', pattern: 'Reddit', category: 'entertainment' },
  { id: 'ent-tiktok', matchType: 'app', pattern: 'TikTok', category: 'entertainment' },
  { id: 'ent-youtube', matchType: 'app', pattern: 'YouTube', category: 'entertainment' },
  { id: 'ent-instagram', matchType: 'app', pattern: 'Instagram', category: 'entertainment' },
  { id: 'soc-slack', matchType: 'app', pattern: 'Slack', category: 'social' },
  { id: 'soc-discord', matchType: 'app', pattern: 'Discord', category: 'social' },
  { id: 'soc-messages', matchType: 'app', pattern: 'Messages', category: 'social' },
  // Domain-based rules (match browser window titles/URLs)
  { id: 'title-youtube', matchType: 'title', pattern: 'youtube.com', category: 'entertainment' },
  { id: 'title-reddit', matchType: 'title', pattern: 'reddit.com', category: 'entertainment' },
  { id: 'title-twitter', matchType: 'title', pattern: 'twitter.com', category: 'entertainment' },
  { id: 'title-x', matchType: 'title', pattern: 'x.com', category: 'entertainment' },
  { id: 'title-tiktok', matchType: 'title', pattern: 'tiktok.com', category: 'entertainment' },
  { id: 'title-instagram', matchType: 'title', pattern: 'instagram.com', category: 'entertainment' },
  { id: 'title-twitch', matchType: 'title', pattern: 'twitch.tv', category: 'entertainment' },
  { id: 'title-netflix', matchType: 'title', pattern: 'netflix.com', category: 'entertainment' },
  { id: 'title-facebook', matchType: 'title', pattern: 'facebook.com', category: 'entertainment' },
  { id: 'title-messenger', matchType: 'title', pattern: 'messenger.com', category: 'social' },
  { id: 'title-linkedin', matchType: 'title', pattern: 'linkedin.com', category: 'social' },
  { id: 'title-github', matchType: 'title', pattern: 'github.com', category: 'productive' },
  { id: 'title-stackoverflow', matchType: 'title', pattern: 'stackoverflow.com', category: 'productive' },
  { id: 'title-googledocs', matchType: 'title', pattern: 'docs.google.com', category: 'productive' },
];

export const DEFAULT_SETTINGS: UserSettings = {
  persona: 'calm_friend',
  scoreThreshold: 25,
  cooldownSeconds: 180,
  apiUrl: 'http://127.0.0.1:8000',
  elevenLabsApiKey: '',
  geminiApiKey: '',
  muted: false,
  ttsEngine: 'auto',
  scriptSource: 'default',
  visionEnabled: true,
  categoryRules: DEFAULT_CATEGORY_RULES,
  hasCompletedOnboarding: false,
  userName: '',
  autoShowTodoOverlay: false,
};
