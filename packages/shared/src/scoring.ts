import type { ActivityEntry, AppCategory, ProcrastinationScore, Severity } from './types'
import {
  APP_RULES,
  DISTRACTION_CATEGORIES,
  LATE_NIGHT_END,
  LATE_NIGHT_MULTIPLIER,
  LATE_NIGHT_START,
  SCORE_WEIGHTS,
  SEVERITY_BANDS,
  SNOOZE_ESCALATION
} from './constants'

export function classifyApp(appName: string, title: string = ''): { category: AppCategory; label: string } {
  const searchStr = `${appName} ${title}`.toLowerCase()

  for (const rule of APP_RULES) {
    if (searchStr.includes(rule.pattern.toLowerCase())) {
      return { category: rule.category, label: rule.label || appName }
    }
  }

  return { category: 'unknown', label: appName }
}

export function isDistraction(category: AppCategory): boolean {
  return DISTRACTION_CATEGORIES.has(category)
}

export function computeScore(
  activities: ActivityEntry[],
  snoozeCount: number = 0
): ProcrastinationScore {
  if (activities.length === 0) {
    return {
      score: 0,
      severity: 'chill',
      distractionRatio: 0,
      switchRate: 0,
      snoozePressure: 0,
      topDistraction: null,
      minutesMonitored: 0
    }
  }

  const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0)
  const minutesMonitored = totalDuration / 60

  // 1. Distraction ratio (0-100)
  const distractionDuration = activities
    .filter(a => isDistraction(a.category))
    .reduce((sum, a) => sum + a.duration, 0)
  const distractionRatio = totalDuration > 0 ? (distractionDuration / totalDuration) * 100 : 0

  // 2. Switch rate (normalized 0-100)
  // Count app switches (consecutive different apps)
  let switches = 0
  for (let i = 1; i < activities.length; i++) {
    if (activities[i].app !== activities[i - 1].app) {
      switches++
    }
  }
  // Normalize: > 20 switches per 10 min = 100
  const switchRate = Math.min((switches / Math.max(minutesMonitored, 1)) * 5, 100)

  // 3. Snooze pressure (0-100)
  const snoozeIndex = Math.min(snoozeCount, SNOOZE_ESCALATION.length - 1)
  const snoozePressure = SNOOZE_ESCALATION[snoozeIndex] * 4 // scale to max 100

  // Weighted score
  let score =
    distractionRatio * SCORE_WEIGHTS.distractionRatio +
    switchRate * SCORE_WEIGHTS.switchRate +
    snoozePressure * SCORE_WEIGHTS.snoozePressure

  // Late night multiplier
  const hour = new Date().getHours()
  if (hour >= LATE_NIGHT_START || hour < LATE_NIGHT_END) {
    score *= LATE_NIGHT_MULTIPLIER
  }

  score = Math.min(Math.round(score), 100)

  // Find top distraction app
  const distractionApps = new Map<string, number>()
  for (const a of activities) {
    if (isDistraction(a.category)) {
      distractionApps.set(a.app, (distractionApps.get(a.app) || 0) + a.duration)
    }
  }
  let topDistraction: string | null = null
  let maxDuration = 0
  for (const [app, dur] of distractionApps) {
    if (dur > maxDuration) {
      maxDuration = dur
      topDistraction = app
    }
  }

  return {
    score,
    severity: getSeverity(score),
    distractionRatio: Math.round(distractionRatio),
    switchRate: Math.round(switchRate),
    snoozePressure: Math.round(snoozePressure),
    topDistraction,
    minutesMonitored: Math.round(minutesMonitored * 10) / 10
  }
}

export function getSeverity(score: number): Severity {
  for (const band of SEVERITY_BANDS) {
    if (score <= band.max) {
      return band.severity
    }
  }
  return 'critical'
}
