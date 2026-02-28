export type Severity = 0 | 1 | 2 | 3 | 4

export type RecommendationMode = 'none' | 'nudge' | 'remind' | 'interrupt' | 'crisis'
export type PersonaId = 'calm_friend' | 'coach' | 'tough_love'

export interface FocusIntent {
  label: string
  minutesRemaining: number
}

export interface UsageSignals {
  sessionMinutes: number
  distractingMinutes: number
  productiveMinutes: number
  appSwitchesLast5Min: number
  idleSecondsLast5Min: number
  /** Local hour (0–23). */
  timeOfDayLocal: number
  snoozesLast60Min: number
  recentDistractRatio?: number
  focusScore?: number
}

export type ActiveCategory = 'productive' | 'neutral' | 'social' | 'entertainment' | 'unknown'

export interface UsageCategories {
  activeApp: string
  activeCategory: ActiveCategory
  activeDomain?: string
  activityLabel?: string
  activityKind?: string
  activityConfidence?: number
  activitySource?: string
  contextTodo?: string
  contextOverride?: string
}

export interface UsageSnapshot {
  timestamp: number
  focusIntent: FocusIntent | null
  signals: UsageSignals
  categories: UsageCategories
}

export interface TTSSettings {
  model: string
  stability: number
  speed: number
}

export interface Recommendation {
  mode: RecommendationMode
  persona: PersonaId
  text: string
  tts: TTSSettings
  cooldownSeconds: number
}

export interface ScoreResponse {
  procrastinationScore: number
  severity: Severity
  reasons: string[]
  recommendation: Recommendation
}

export type InterventionUserResponse = 'pending' | 'snoozed' | 'dismissed' | 'working'

export interface InterventionEvent {
  id: string
  timestamp: number
  score: number
  severity: Severity
  persona: PersonaId
  text: string
  userResponse: InterventionUserResponse
  audioPlayed: boolean
}

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  id: string
  timestamp: number
  role: ChatRole
  content: string
}

export interface TodoItem {
  id: number
  text: string
  done: boolean
  order: number
  app?: string
  url?: string
  allowedApps?: string[]
  deadline?: number
  startTime?: number
  durationMinutes?: number
}

export interface WinsData {
  refocusCount: number
  totalFocusedMinutes: number
}

