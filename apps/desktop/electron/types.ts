import categorySeedsRaw from './activity/app-category-seeds.json';

// IPC channel constants
export const IPC_CHANNELS = {
  RELAUNCH_APP: 'app:relaunch',
  START_TELEMETRY: 'telemetry:start',
  STOP_TELEMETRY: 'telemetry:stop',
  IS_TELEMETRY_ACTIVE: 'telemetry:active',
  ON_ACTIVITY_STATUS: 'activity:status',
  GET_LATEST_SCORE: 'score:latest',
  ON_SCORE_UPDATE: 'score:update',
  ON_LIVE_SCORE_UPDATE: 'score:live',
  RESPOND_TO_INTERVENTION: 'intervention:respond',
  GET_ACTIVE_INTERVENTION: 'intervention:active',
  ON_INTERVENTION: 'intervention:new',
  ON_INTERVENTION_DISMISS: 'intervention:auto-dismiss',
  ON_INTERVENTION_RESPONSE: 'intervention:response',
  // Snooze (cross-window)
  GET_SNOOZE_STATE: 'snooze:get',
  SET_SNOOZE: 'snooze:set',
  CANCEL_SNOOZE: 'snooze:cancel',
  ON_SNOOZE_UPDATED: 'snooze:updated',
  GET_USAGE_HISTORY: 'usage:get',
  GET_APP_STATS: 'apps:stats',
  GET_INSTALLED_APPS: 'apps:installed',
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
  EXTRACT_TODOS: 'todos:extract',
  TITLEIZE_TODO_TEXTS: 'todos:titleize',
  GET_TODOS: 'todos:get',
  ADD_TODO: 'todos:add',
  TOGGLE_TODO: 'todos:toggle',
  DELETE_TODO: 'todos:delete',
  UPDATE_TODO: 'todos:update',
  REORDER_TODOS: 'todos:reorder',
  SET_TODOS: 'todos:set',
  APPEND_TODOS: 'todos:append',
  ON_TODOS_UPDATED: 'todos:updated',

  // Completed todos
  COMPLETE_TODO: 'todos:complete',
  GET_COMPLETED_TODOS: 'todos:completed:get',
  RESTORE_TODO: 'todos:restore',
  DELETE_COMPLETED_TODO: 'todos:completed:delete',
  ON_COMPLETED_TODOS_UPDATED: 'todos:completed:updated',

  // Todo overlay window
  OPEN_TODO_OVERLAY: 'todo-overlay:open',
  CLOSE_TODO_OVERLAY: 'todo-overlay:close',
  IS_TODO_OVERLAY_OPEN: 'todo-overlay:is-open',

  // Voice status broadcast (for todo overlay VoiceOrb)
  BROADCAST_VOICE_STATUS: 'voice:broadcast-status',
  ON_VOICE_STATUS: 'voice:status-update',

  // App focus tracking
  ON_APP_FOCUS_CHANGED: 'app:focus-changed',

  // Voice agent
  ENSURE_VOICE_AGENT: 'agent:ensure',
  ENSURE_CHECKIN_AGENT: 'agent:ensure-checkin',

  // Voice chat (todo overlay orb → main window)
  VOICE_CHAT_OPEN: 'voice:chat-open',
  ON_VOICE_CHAT_OPEN: 'voice:on-chat-open',
  HAS_ELEVENLABS_KEY: 'settings:has-elevenlabs-key',
  ELEVENLABS_TTS: 'tts:elevenlabs',

  // Wins tracker
  GET_WINS: 'wins:get',
} as const;

export interface CategoryRule {
  id: string;
  matchType: 'app' | 'title';
  pattern: string;
  category: 'productive' | 'neutral' | 'social' | 'entertainment';
}

type SeedCategory = 'productive' | 'neutral' | 'unproductive';
type SeedUnproductiveKind = 'social' | 'entertainment';
type SeedRule = { pattern: string; category: SeedCategory; unproductiveKind?: SeedUnproductiveKind };
type SeedFile = { apps: SeedRule[]; domains: SeedRule[] };

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function seedToInternalCategory(seed: SeedRule): CategoryRule['category'] {
  if (seed.category === 'productive') return 'productive';
  if (seed.category === 'neutral') return 'neutral';
  return seed.unproductiveKind === 'social' ? 'social' : 'entertainment';
}

export interface UserSettings {
  persona: 'calm_friend' | 'coach' | 'tough_love';
  /** If false, `tough_love` persona cannot be selected (explicit language). */
  toughLoveExplicitAllowed: boolean;
  /** @deprecated No longer drives intervention logic */
  scoreThreshold: number;
  /** @deprecated No longer drives intervention logic */
  cooldownSeconds: number;
  apiUrl: string;
  elevenLabsApiKey: string;
  geminiApiKey: string;
  muted: boolean;
  ttsEngine: 'auto' | 'elevenlabs' | 'local';
  scriptSource: 'default' | 'gemini' | 'amd';
  visionEnabled: boolean;
  categoryRules: CategoryRule[];
  hasCompletedOnboarding: boolean;
  userName: string;
  autoShowTodoOverlay: boolean;
  timeFormat: '12h' | '24h';
  /** Time zone for displaying/comparing todo times. Use 'system' to follow OS time zone. */
  timeZone: string;
  lastDailySetupDate: string;
  elevenLabsAgentId: string;
  elevenLabsAgentPersona: string;
  elevenLabsAgentVersion: number;
  monitoringEnabled: boolean;
  selectedVoiceId: string;
  amdEndpointUrl: string;
  amdApiKey: string;
}

export const KNOWN_BROWSERS = [
  'Google Chrome',
  'Chrome',
  'chrome.exe',
  'Safari',
  'Firefox',
  'firefox.exe',
  'Arc',
  'arc.exe',
  'Microsoft Edge',
  'Edge',
  'msedge',
  'msedge.exe',
  'Brave Browser',
  'Brave',
  'brave.exe',
  'Opera',
  'opera.exe',
  'Vivaldi',
  'vivaldi.exe',
  'Chromium',
  'chromium.exe',
];

const categorySeeds = categorySeedsRaw as unknown as SeedFile;

export const DEFAULT_CATEGORY_RULES: CategoryRule[] = [
  ...categorySeeds.apps.map((seed) => ({
    id: `seed-app-${slugify(seed.pattern)}`,
    matchType: 'app' as const,
    pattern: seed.pattern,
    category: seedToInternalCategory(seed),
  })),
  ...categorySeeds.domains.map((seed) => ({
    id: `seed-domain-${slugify(seed.pattern)}`,
    matchType: 'title' as const,
    pattern: seed.pattern,
    category: seedToInternalCategory(seed),
  })),
];

export const DEFAULT_SETTINGS: UserSettings = {
  persona: 'calm_friend',
  toughLoveExplicitAllowed: false,
  /** @deprecated No longer drives intervention logic */
  scoreThreshold: 25,
  /** @deprecated No longer drives intervention logic */
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
  autoShowTodoOverlay: true,
  timeFormat: '12h',
  timeZone: 'system',
  lastDailySetupDate: '',
  elevenLabsAgentId: '',
  elevenLabsAgentPersona: '',
  elevenLabsAgentVersion: 0,
  monitoringEnabled: true,
  selectedVoiceId: '',
  amdEndpointUrl: '',
  amdApiKey: '',
};
