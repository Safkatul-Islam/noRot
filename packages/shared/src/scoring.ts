import { LATE_NIGHT_MULTIPLIER, SCORING_WEIGHTS, SEVERITY_BANDS } from './constants'
import type { ActiveCategory, Severity, UsageSnapshot } from './types'

export interface CalculatedScore {
  procrastinationScore: number
  severity: Severity
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function isDistractingCategory(category: ActiveCategory): boolean {
  return category === 'social' || category === 'entertainment'
}

function normalizeSwitchRate(switchesPerMin: number): number {
  const s = Math.max(0, switchesPerMin)
  if (s <= 4) return s / 10
  if (s <= 10) return 0.4 + (s - 4) * (0.4 / 6)
  return 0.8 + Math.min(s - 10, 5) * (0.2 / 5)
}

export function scoreToSeverity(score: number): Severity {
  const s = clamp(Math.round(score), 0, 100)
  const band = SEVERITY_BANDS.find(b => s >= b.min && s <= b.max)
  return (band?.severity ?? 4) as Severity
}

function isLateNightHour(hour: number): boolean {
  return hour >= 23 || hour < 5
}

function getLocalHour(snapshot: UsageSnapshot): number {
  const fromSignal = snapshot.signals.timeOfDayLocal
  if (Number.isFinite(fromSignal)) return clamp(Math.floor(fromSignal), 0, 23)
  return new Date(snapshot.timestamp).getHours()
}

export function calculateScore(snapshot: UsageSnapshot, snoozePressure: number = 0): CalculatedScore {
  const focusScore = snapshot.signals.focusScore
  if (typeof focusScore === 'number' && Number.isFinite(focusScore)) {
    const procrastinationScore = clamp(Math.round((100 - focusScore) + snoozePressure), 0, 100)
    return { procrastinationScore, severity: scoreToSeverity(procrastinationScore) }
  }

  const isDistractingNow = isDistractingCategory(snapshot.categories.activeCategory)

  const distractRatioRaw = typeof snapshot.signals.recentDistractRatio === 'number'
    ? snapshot.signals.recentDistractRatio
    : (snapshot.signals.sessionMinutes > 0
        ? snapshot.signals.distractingMinutes / snapshot.signals.sessionMinutes
        : 0)

  const distractRatio = clamp(distractRatioRaw, 0, 1)
  const effectiveDistractRatio = isDistractingNow ? Math.max(distractRatio, 0.9) : distractRatio

  const switchesPerMin = snapshot.signals.appSwitchesLast5Min / 5
  const normSwitchRate = clamp(normalizeSwitchRate(switchesPerMin), 0, 1)
  const normSwitchRateEffective = (isDistractingNow || effectiveDistractRatio >= 0.2) ? normSwitchRate : 0

  const intentGap = snapshot.focusIntent !== null && isDistractingNow ? 1 : 0
  const snoozePressureNorm = clamp(snapshot.signals.snoozesLast60Min, 0, 3) / 3

  const base = 100 * (
    SCORING_WEIGHTS.distractRatio * effectiveDistractRatio +
    SCORING_WEIGHTS.switchRate * normSwitchRateEffective +
    SCORING_WEIGHTS.intentGap * intentGap +
    SCORING_WEIGHTS.snoozePressure * snoozePressureNorm
  )

  const mult = isLateNightHour(getLocalHour(snapshot)) ? LATE_NIGHT_MULTIPLIER : 1.0
  const procrastinationScore = clamp(Math.round((base + snoozePressure) * mult), 0, 100)

  return { procrastinationScore, severity: scoreToSeverity(procrastinationScore) }
}

export function applySnoozeEscalation(severity: Severity, snoozesLast60Min: number): Severity {
  const bump = Math.floor(Math.max(0, snoozesLast60Min) / 2)
  return clamp(severity + bump, 0, 4) as Severity
}

export function generateReasons(snapshot: UsageSnapshot, score: number): string[] {
  const reasons: string[] = []

  const isDistractingNow = isDistractingCategory(snapshot.categories.activeCategory)

  const distractRatioRaw = typeof snapshot.signals.recentDistractRatio === 'number'
    ? snapshot.signals.recentDistractRatio
    : (snapshot.signals.sessionMinutes > 0
        ? snapshot.signals.distractingMinutes / snapshot.signals.sessionMinutes
        : 0)

  const distractRatio = clamp(distractRatioRaw, 0, 1)
  const effectiveDistractRatio = isDistractingNow ? Math.max(distractRatio, 0.9) : distractRatio

  if (effectiveDistractRatio >= 0.7) {
    reasons.push('High distracting time recently')
  } else if (effectiveDistractRatio >= 0.4) {
    reasons.push('A lot of recent time is distracting')
  } else if (effectiveDistractRatio >= 0.2) {
    reasons.push('Some recent time is distracting')
  }

  const switchesPerMin = snapshot.signals.appSwitchesLast5Min / 5
  if (isDistractingNow || effectiveDistractRatio >= 0.2) {
    if (switchesPerMin >= 8) reasons.push('Very frequent app switching')
    else if (switchesPerMin >= 4) reasons.push('Frequent app switching')
    else if (switchesPerMin >= 2) reasons.push('Some app switching')
  }

  if (snapshot.focusIntent !== null && isDistractingNow) {
    const where = snapshot.categories.activeDomain ?? snapshot.categories.activeApp
    reasons.push(`Focus intent "${snapshot.focusIntent.label}" — but you're on ${where}`)
  }

  if (snapshot.signals.snoozesLast60Min >= 2) {
    reasons.push(`Snoozed ${snapshot.signals.snoozesLast60Min} times in the last hour`)
  }

  if (isLateNightHour(getLocalHour(snapshot))) {
    reasons.push('Late-night hours increase distraction')
  }

  if (reasons.length === 0 && score > 0) {
    reasons.push('Mild distraction detected')
  }

  if (reasons.length === 0) {
    reasons.push("You're focused — keep it up!")
  }

  return reasons
}

