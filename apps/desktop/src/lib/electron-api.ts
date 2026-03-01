import type { ScoreResponse, InterventionEvent, TodoItem, WinsData, TTSSettings, Severity } from '@norot/shared';

export interface CategoryRule {
  id: string;
  matchType: 'app' | 'title';
  pattern: string;
  category: 'productive' | 'neutral' | 'social' | 'entertainment';
}

export interface UserSettings {
  persona: 'calm_friend' | 'coach' | 'tough_love';
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
  scriptSource: 'default' | 'gemini';
  visionEnabled: boolean;
  categoryRules: CategoryRule[];
  hasCompletedOnboarding: boolean;
  userName: string;
  autoShowTodoOverlay: boolean;
  timeFormat: '12h' | '24h';
  timeZone: string;
  lastDailySetupDate: string;
  elevenLabsAgentId: string;
  elevenLabsAgentPersona: string;
  elevenLabsAgentVersion: number;
  monitoringEnabled: boolean;
  selectedVoiceId: string;
}

export interface UsageHistoryPoint {
  timestamp: string;
  productive: number;
  distracting: number;
}

export interface AppStats {
  appName: string;
  domain?: string;
  category: string;
  totalSeconds: number;
  lastSeen: string;
}

export interface NoRotAPI {
  relaunchApp(rendererUrl?: string): Promise<void>;
  startTelemetry(): Promise<void>;
  stopTelemetry(): Promise<void>;
  isTelemetryActive(): Promise<boolean>;
  getLatestScore(): Promise<ScoreResponse | null>;
  onScoreUpdate(callback: (score: ScoreResponse) => void): () => void;
  onLiveScoreUpdate(callback: (score: { procrastinationScore: number; severity: Severity }) => void): () => void;
  respondToIntervention(
    eventId: string,
    response: 'snoozed' | 'dismissed' | 'working'
  ): Promise<void>;
  getActiveIntervention(): Promise<InterventionEvent | null>;
  onIntervention(callback: (event: InterventionEvent) => void): () => void;
  onInterventionDismiss(callback: (data: { interventionId: string }) => void): () => void;
  onInterventionResponse(callback: (data: { interventionId: string; response: 'snoozed' | 'dismissed' | 'working' }) => void): () => void;

  // Snooze (cross-window)
  getSnoozeState(): Promise<{ snoozedUntil: number | null }>;
  setSnooze(durationMs: number): Promise<void>;
  cancelSnooze(): Promise<void>;
  onSnoozeUpdated(callback: (data: { snoozedUntil: number | null }) => void): () => void;

  testIntervention(): Promise<InterventionEvent>;
  getUsageHistory(): Promise<UsageHistoryPoint[]>;
  getAppStats(minutes?: number): Promise<AppStats[]>;
  getInstalledApps(): Promise<string[]>;
  getWins(): Promise<WinsData>;
  getSettings(): Promise<UserSettings>;
  updateSettings(settings: Partial<UserSettings>): Promise<void>;

  reportAudioPlayed(interventionId: string): Promise<void>;
  onPlayAudio(callback: (score: ScoreResponse) => void): () => void;
  checkPermissions(): Promise<{
    screenRecording: boolean;
    status?: 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';
    canReadActiveWindow?: boolean;
  }>;
  requestPermissions(): Promise<void>;
  onWindowShown(callback: () => void): () => void;

  // Chat
  sendChatMessage(message: string, sessionId: string): void;
  cancelChat(): void;
  onChatToken(callback: (token: string) => void): () => void;
  onChatDone(callback: () => void): () => void;
  onChatError(callback: (error: string) => void): () => void;

  // Todos
  extractTodos(transcript: string): Promise<TodoItem[]>;
  getTodos(): Promise<TodoItem[]>;
  addTodo(item: TodoItem): Promise<void>;
  toggleTodo(id: string): Promise<void>;
  deleteTodo(id: string): Promise<void>;
  updateTodo(id: string, fields: Partial<Omit<TodoItem, 'id'>>): Promise<void>;
  reorderTodos(id: string, newOrder: number): Promise<void>;
  setTodos(items: TodoItem[]): Promise<void>;
  appendTodos(items: TodoItem[]): Promise<void>;
  onTodosUpdated(callback: (todos: TodoItem[]) => void): () => void;

  // Todo overlay
  openTodoOverlay(): Promise<void>;
  closeTodoOverlay(): Promise<void>;
  isTodoOverlayOpen(): Promise<boolean>;

  // App focus tracking
  onAppFocusChanged(callback: (data: { focused: boolean }) => void): () => void;

  // Voice status broadcast (for overlay VoiceOrb)
  broadcastVoiceStatus(isSpeaking: boolean, severity: number, amplitude: number, lastWordBoundaryAt: number): void;
  onVoiceStatus(callback: (data: { isSpeaking: boolean; severity: number; amplitude: number; lastWordBoundaryAt: number }) => void): () => void;

  // Voice agent
  ensureVoiceAgent(): Promise<{ agentId: string; signedUrl: string }>;

  // Check-in agent (severity 3+ voice conversations)
  ensureCheckinAgent(): Promise<{ agentId: string; signedUrl: string }>;

  // Voice chat
  openVoiceChat(): void;
  onVoiceChatOpen(callback: () => void): () => void;
  hasElevenLabsKey(): Promise<boolean>;

  // ElevenLabs TTS via main process (avoids renderer CORS)
  synthesizeElevenLabsTts?(text: string, voiceId: string, tts: TTSSettings): Promise<string>;
}

declare global {
  interface Window {
    norot: NoRotAPI;
  }
}

export const norotAPI: NoRotAPI = window.norot;
export type { ScoreResponse, InterventionEvent, TodoItem, WinsData };
