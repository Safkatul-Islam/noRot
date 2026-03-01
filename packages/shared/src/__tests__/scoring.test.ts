import { describe, expect, test } from 'vitest'
import type { UsageSnapshot } from '../types.js'
import { applySnoozeEscalation, calculateScore } from '../scoring.js'
import { SEVERITY_BANDS } from '../constants.js'

/** Helper to map a procrastination score to its severity via SEVERITY_BANDS. */
function scoreToSeverity(score: number): number {
  const band = SEVERITY_BANDS.find(b => score >= b.scoreMin && score <= b.scoreMax)
  return band ? band.severity : 0
}

function makeSnapshot(overrides?: Partial<UsageSnapshot>): UsageSnapshot {
  const base: UsageSnapshot = {
    timestamp: Date.now(),
    focusIntent: null,
    signals: {
      sessionMinutes: 10,
      distractingMinutes: 0,
      productiveMinutes: 10,
      appSwitchesLast5Min: 0,
      idleSecondsLast5Min: 0,
      timeOfDayLocal: '12:00',
      snoozesLast60Min: 0
    },
    categories: {
      activeApp: 'TestApp',
      activeCategory: 'productive'
    }
  }

  return {
    ...base,
    ...overrides,
    signals: { ...base.signals, ...(overrides?.signals ?? {}) },
    categories: { ...base.categories, ...(overrides?.categories ?? {}) }
  }
}

describe('scoreToSeverity', () => {
  test('maps score boundaries to new severity bands', () => {
    // New bands: 0=Locked In (0-15), 1=Focused (16-35), 2=Slightly Distracted (36-60),
    // 3=Very Distracted (61-85), 4=Cooked (86-100)
    expect(scoreToSeverity(0)).toBe(0)
    expect(scoreToSeverity(15)).toBe(0)
    expect(scoreToSeverity(16)).toBe(1)
    expect(scoreToSeverity(35)).toBe(1)
    expect(scoreToSeverity(36)).toBe(2)
    expect(scoreToSeverity(60)).toBe(2)
    expect(scoreToSeverity(61)).toBe(3)
    expect(scoreToSeverity(85)).toBe(3)
    expect(scoreToSeverity(86)).toBe(4)
    expect(scoreToSeverity(100)).toBe(4)
  })
})

describe('calculateScore', () => {
  test('prefers focusScore when present', () => {
    const snap = makeSnapshot({ signals: { focusScore: 80, timeOfDayLocal: '12:00' } })
    const result = calculateScore(snap, 5)
    // procScore = 100 - 80 + 5 = 25
    expect(result.score).toBe(25)
    expect(result.severity).toBe(1) // 25 falls in Focused band (16-35)
  })

  test('floors distract ratio to 0.9 when currently distracting', () => {
    const snap = makeSnapshot({
      signals: { sessionMinutes: 10, distractingMinutes: 1, timeOfDayLocal: '12:00' },
      categories: { activeCategory: 'social' }
    })
    const result = calculateScore(snap)
    // base = 100*(0.55*0.9) = 49.5 -> round 50
    expect(result.score).toBe(50)
    expect(result.severity).toBe(2) // 50 falls in Slightly Distracted band (36-60)
  })

  test('does not apply switch penalty when not distracting and ratio < 0.2', () => {
    const snap = makeSnapshot({
      signals: {
        sessionMinutes: 10,
        distractingMinutes: 1, // 0.1
        appSwitchesLast5Min: 50, // extremely high, but should be ignored
        timeOfDayLocal: '12:00'
      },
      categories: { activeCategory: 'productive' }
    })
    const result = calculateScore(snap)
    // base = 100*(0.55*0.1) = 5.5 -> round 6
    expect(result.score).toBe(6)
    expect(result.severity).toBe(0) // 6 falls in Locked In band (0-15)
  })

  test('applies late-night multiplier at hour >= 23', () => {
    const snap = makeSnapshot({
      signals: {
        sessionMinutes: 10,
        distractingMinutes: 5, // 0.5
        timeOfDayLocal: '23:00'
      }
    })
    const result = calculateScore(snap)
    // base = 100*(0.55*0.5) = 27.5; mult 1.25 => 34.375 -> round 34
    expect(result.score).toBe(34)
    expect(result.severity).toBe(1) // 34 falls in Focused band (16-35)
  })
})

describe('applySnoozeEscalation', () => {
  test('bumps each 2 snoozes and caps at 4', () => {
    expect(applySnoozeEscalation(1, 0)).toBe(1)
    expect(applySnoozeEscalation(1, 1)).toBe(1)
    expect(applySnoozeEscalation(1, 2)).toBe(2)
    expect(applySnoozeEscalation(1, 3)).toBe(2)
    expect(applySnoozeEscalation(3, 10)).toBe(4)
  })
})
