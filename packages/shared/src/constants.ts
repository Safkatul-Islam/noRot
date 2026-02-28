import type { PersonaId, RecommendationMode, Severity } from './types'

export type SeverityColor = 'green' | 'yellow' | 'orange' | 'red' | 'purple'

export interface SeverityBand {
  severity: Severity
  min: number
  max: number
  label: string
  mode: RecommendationMode
  color: SeverityColor
}

export const SEVERITY_BANDS: readonly SeverityBand[] = [
  { severity: 0, min: 0, max: 24, label: 'Focused', mode: 'none', color: 'green' },
  { severity: 1, min: 25, max: 49, label: 'Drifting', mode: 'nudge', color: 'yellow' },
  { severity: 2, min: 50, max: 69, label: 'Distracted', mode: 'remind', color: 'orange' },
  { severity: 3, min: 70, max: 89, label: 'Procrastinating', mode: 'interrupt', color: 'red' },
  { severity: 4, min: 90, max: 100, label: 'Crisis', mode: 'crisis', color: 'purple' }
]

export const PERSONAS: Readonly<Record<PersonaId, { voiceId: string }>> = {
  calm_friend: { voiceId: 'EXAVITQu4vr4xnSDxMaL' },
  coach: { voiceId: 'onwK4e9ZLuTAKqWW03F9' },
  tough_love: { voiceId: 'N2lVS1w4EtoT3dr4eOWO' }
} as const

export const SCORING_WEIGHTS = {
  distractRatio: 0.55,
  switchRate: 0.3,
  intentGap: 0.0,
  snoozePressure: 0.15
} as const

export const LATE_NIGHT_MULTIPLIER = 1.25 as const

export const SNOOZE_PRESSURE_POINTS = 5 as const
export const SNOOZE_PRESSURE_DURATION_MIN = 10 as const
export const MAX_SNOOZE_PRESSURE = 3 as const

export const AUDIO_TAGS: Readonly<Record<Severity, string>> = {
  0: '',
  1: '[thoughtful]',
  2: '[thoughtful]',
  3: '[concerned]',
  4: '[thoughtful]'
} as const

export function toFocusScore(procrastinationScore: number): number {
  const raw = 100 - procrastinationScore
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(100, Math.round(raw)))
}

export const FOCUS_SEVERITY_BANDS: readonly SeverityBand[] = [
  { severity: 0, min: 76, max: 100, label: 'Focused', mode: 'none', color: 'green' },
  { severity: 1, min: 51, max: 75, label: 'Drifting', mode: 'nudge', color: 'yellow' },
  { severity: 2, min: 31, max: 50, label: 'Distracted', mode: 'remind', color: 'orange' },
  { severity: 3, min: 11, max: 30, label: 'Procrastinating', mode: 'interrupt', color: 'red' },
  { severity: 4, min: 0, max: 10, label: 'Crisis', mode: 'crisis', color: 'purple' }
]

export function getFocusBand(focusScore: number): SeverityBand {
  const score = Math.max(0, Math.min(100, Math.round(focusScore)))
  const band = FOCUS_SEVERITY_BANDS.find(b => score >= b.min && score <= b.max)
  return band ?? FOCUS_SEVERITY_BANDS[FOCUS_SEVERITY_BANDS.length - 1]
}

export function stripEmotionTags(text: string): string {
  return text.replace(/\[[^\]]+]/g, '').replace(/\s+/g, ' ').trim()
}

export const INTERVENTION_SCRIPTS: Readonly<Record<PersonaId, Readonly<Record<Severity, string>>>> = {
  calm_friend: {
    0: "You're focused — keep it up!",
    1: "[thoughtful] Quick check-in: you're drifting a bit. Want to refocus for 5 minutes?",
    2: "[thoughtful] You're getting pulled off-task. Close the distraction and do one small step.",
    3: "[concerned] You're procrastinating hard right now. Pause, breathe, and switch back to your task.",
    4: "[thoughtful] Crisis mode: stop scrolling. Open your task and start the first step—right now."
  },
  coach: {
    0: "Solid focus. Keep going.",
    1: "[thoughtful] Reset. Pick the next tiny action and start it now.",
    2: "[thoughtful] You're slipping into distraction. Set a 10-minute sprint and begin.",
    3: "[concerned] This is procrastination. Close the tab, open your work, and execute the first step.",
    4: "[thoughtful] Crisis: stop negotiating. Take immediate action—start the task for 2 minutes."
  },
  tough_love: {
    0: 'Good. Stay locked in.',
    1: "[thoughtful] You're drifting. Cut it out and get back to work.",
    2: "[thoughtful] You're distracted. Stop the nonsense and do the task.",
    3: "[concerned] YOU'RE PROCRASTINATING. CLOSE IT. START WORKING. NOW.",
    4: "[thoughtful] CRISIS MODE. DROP THE DISTRACTION AND WORK—IMMEDIATELY."
  }
} as const

