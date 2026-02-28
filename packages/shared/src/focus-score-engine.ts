import type { ActiveCategory } from './types'

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

export interface FocusScoreTickInput {
  activeCategory: ActiveCategory
  appSwitchesLast5Min: number
  elapsedMs: number
}

export interface FocusScoreTickOutput {
  focusScore: number
  normSwitchRate: number
  decayPerSec: number
  recoveryPerSec: number
}

export class FocusScoreEngine {
  private focusScoreValue: number
  private readonly recoveryPerSecValue: number

  constructor(options?: { initialFocusScore?: number; recoveryPerSec?: number }) {
    this.focusScoreValue = clamp(options?.initialFocusScore ?? 100, 0, 100)
    this.recoveryPerSecValue = clamp(options?.recoveryPerSec ?? 2, 0, 10)
  }

  get focusScore(): number {
    return Math.round(this.focusScoreValue)
  }

  reset(score: number = 100): void {
    this.focusScoreValue = clamp(score, 0, 100)
  }

  tick(input: FocusScoreTickInput): FocusScoreTickOutput {
    const elapsedSec = Math.max(0, input.elapsedMs) / 1000
    const switchesPerMin = input.appSwitchesLast5Min / 5
    const normSwitchRate = clamp(normalizeSwitchRate(switchesPerMin), 0, 1)

    const distracting = isDistractingCategory(input.activeCategory)
    const decayPerSec = distracting ? clamp(3 + 3 * normSwitchRate, 3, 6) : 0

    if (distracting) {
      this.focusScoreValue = clamp(this.focusScoreValue - decayPerSec * elapsedSec, 0, 100)
    } else {
      this.focusScoreValue = clamp(this.focusScoreValue + this.recoveryPerSecValue * elapsedSec, 0, 100)
    }

    return {
      focusScore: Math.round(this.focusScoreValue),
      normSwitchRate,
      decayPerSec,
      recoveryPerSec: this.recoveryPerSecValue
    }
  }
}

