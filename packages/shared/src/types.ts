export interface FocusIntent {
  label: string;
  minutesRemaining: number;
}

export interface UsageSignals {
  sessionMinutes: number;
  distractingMinutes: number;
  productiveMinutes: number;
  appSwitchesLast5Min: number;
  idleSecondsLast5Min: number;
  timeOfDayLocal: string; // "HH:MM"
  snoozesLast60Min: number;
  recentDistractRatio?: number;
}

export interface UsageCategories {
  activeApp: string;
  activeCategory: 'productive' | 'neutral' | 'social' | 'entertainment' | 'unknown';
  activeDomain?: string;
  activityLabel?: string;
  activityKind?:
    | 'unknown'
    | 'coding'
    | 'spreadsheets'
    | 'presentations'
    | 'writing'
    | 'docs'
    | 'email'
    | 'chat'
    | 'video'
    | 'social_feed'
    | 'shopping'
    | 'games'
    | 'settings'
    | 'file_manager';
  activityConfidence?: number;
  activitySource?: 'rules' | 'vision';
}

export interface UsageSnapshot {
  timestamp: string; // ISO 8601
  focusIntent: FocusIntent | null;
  signals: UsageSignals;
  categories: UsageCategories;
}

export interface TTSSettings {
  model: string;
  stability: number;
  speed: number;
}

export interface Recommendation {
  mode: 'none' | 'nudge' | 'remind' | 'interrupt' | 'crisis';
  persona: Persona;
  text: string;
  tts: TTSSettings;
  cooldownSeconds: number;
}

export interface ScoreResponse {
  procrastinationScore: number;
  severity: Severity;
  reasons: string[];
  recommendation: Recommendation;
}

export interface InterventionEvent {
  id: string;
  timestamp: string;
  score: number;
  severity: Severity;
  persona: Persona;
  text: string;
  userResponse: 'snoozed' | 'dismissed' | 'working' | 'pending';
  audioPlayed: boolean;
}

export type Severity = 0 | 1 | 2 | 3 | 4;
export type Persona = 'calm_friend' | 'coach' | 'tough_love';
export type InterventionMode = 'none' | 'nudge' | 'remind' | 'interrupt' | 'crisis';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  order: number;
  app?: string;   // e.g. "VS Code", "Chrome"
  url?: string;   // e.g. "github.com"
}
