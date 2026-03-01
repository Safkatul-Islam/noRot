import type { ScoreResponse, InterventionEvent, TodoItem } from '@norot/shared';

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

export interface UsageHistoryPoint {
  timestamp: string;
  productive: number;
  distracting: number;
}

export interface AppStats {
  appName: string;
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
  respondToIntervention(
    eventId: string,
    response: 'snoozed' | 'dismissed' | 'working'
  ): Promise<void>;
  onIntervention(callback: (event: InterventionEvent) => void): () => void;
  onInterventionDismiss(callback: (data: { interventionId: string }) => void): () => void;
  testIntervention(): Promise<InterventionEvent>;
  getHistory(limit?: number): Promise<ScoreResponse[]>;
  getUsageHistory(): Promise<UsageHistoryPoint[]>;
  getAppStats(minutes?: number): Promise<AppStats[]>;
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
  getTodos(): Promise<TodoItem[]>;
  addTodo(item: TodoItem): Promise<void>;
  toggleTodo(id: string): Promise<void>;
  deleteTodo(id: string): Promise<void>;
  reorderTodos(id: string, newOrder: number): Promise<void>;
  setTodos(items: TodoItem[]): Promise<void>;
  onTodosUpdated(callback: (todos: TodoItem[]) => void): () => void;

  // Todo overlay
  openTodoOverlay(): Promise<void>;
  closeTodoOverlay(): Promise<void>;

  // Voice status broadcast (for overlay VoiceOrb)
  broadcastVoiceStatus(isSpeaking: boolean, severity: number, amplitude: number): void;
  onVoiceStatus(callback: (data: { isSpeaking: boolean; severity: number; amplitude: number }) => void): () => void;
}

declare global {
  interface Window {
    norot: NoRotAPI;
  }
}

export const norotAPI: NoRotAPI = window.norot;
export type { ScoreResponse, InterventionEvent, TodoItem };
