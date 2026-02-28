export type AppCategory =
  | 'productive'
  | 'neutral'
  | 'distraction'
  | 'social_media'
  | 'gaming'
  | 'entertainment'
  | 'communication'
  | 'development'
  | 'design'
  | 'writing'
  | 'research'
  | 'unknown'

export type Severity = 'chill' | 'warning' | 'danger' | 'critical'

export interface WindowEvent {
  timestamp: number
  app: string
  title: string
  category: AppCategory
  isDistraction: boolean
}

export interface ActivityEntry {
  id?: number
  timestamp: number
  app: string
  title: string
  category: AppCategory
  duration: number // seconds spent
}

export interface ProcrastinationScore {
  score: number // 0-100
  severity: Severity
  distractionRatio: number
  switchRate: number
  snoozePressure: number
  topDistraction: string | null
  minutesMonitored: number
}

export interface Todo {
  id: number
  text: string
  completed: boolean
  createdAt: number
  completedAt: number | null
}

export interface Intervention {
  id?: number
  timestamp: number
  score: number
  severity: Severity
  script: string
  persona: string
  snoozed: boolean
  dismissed: boolean
  committedToWork: boolean
}

export interface Win {
  id?: number
  timestamp: number
  description: string
  score: number
  type: 'focus_streak' | 'todo_complete' | 'improvement' | 'custom'
}

export interface AppStats {
  app: string
  category: AppCategory
  totalSeconds: number
  percentage: number
  switches: number
}

export interface AppRule {
  pattern: string
  category: AppCategory
  label?: string
}

export type PersonaId = 'drill_sergeant' | 'disappointed_parent' | 'chill_friend' | 'anime_rival' | 'therapist'

export interface Persona {
  id: PersonaId
  name: string
  description: string
  voiceId: string // ElevenLabs voice ID
  style: string
  exampleLine: string
}

export interface Settings {
  persona: PersonaId
  onboardingComplete: boolean
  visionEnabled: boolean
  elevenLabsApiKey: string
  geminiApiKey: string
  customAppRules: AppRule[]
  snoozeCount: number
  lastSnoozeTime: number | null
}
