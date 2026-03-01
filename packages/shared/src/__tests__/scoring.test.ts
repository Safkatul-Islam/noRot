import { describe, expect, test } from 'vitest'
import type { UsageSnapshot } from '../types.js'
import { applySnoozeEscalation, calculateScore, scoreToSeverity } from '../scoring.js'

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
      timeOfDayLocal: 12,
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
  test('maps score boundaries to severity bands', () => {
    expect(scoreToSeverity(0)).toBe(0)
    expect(scoreToSeverity(24)).toBe(0)
    expect(scoreToSeverity(25)).toBe(1)
    expect(scoreToSeverity(49)).toBe(1)
    expect(scoreToSeverity(50)).toBe(2)
    expect(scoreToSeverity(69)).toBe(2)
    expect(scoreToSeverity(70)).toBe(3)
    expect(scoreToSeverity(89)).toBe(3)
    expect(scoreToSeverity(90)).toBe(4)
    expect(scoreToSeverity(100)).toBe(4)
  })
})

describe('calculateScore', () => {
  test('prefers focusScore when present', () => {
    const snap = makeSnapshot({ signals: { focusScore: 80, timeOfDayLocal: 23 } })
    const result = calculateScore(snap, 5)
    expect(result.procrastinationScore).toBe(25)
    expect(result.severity).toBe(1)
  })

  test('floors distract ratio to 0.9 when currently distracting', () => {
    const snap = makeSnapshot({
      signals: { sessionMinutes: 10, distractingMinutes: 1 },
      categories: { activeCategory: 'social' }
    })
    const result = calculateScore(snap)
    // base = 100*(0.55*0.9) = 49.5 -> round 50
    expect(result.procrastinationScore).toBe(50)
    expect(result.severity).toBe(2)
  })

  test('does not apply switch penalty when not distracting and ratio < 0.2', () => {
    const snap = makeSnapshot({
      signals: {
        sessionMinutes: 10,
        distractingMinutes: 1, // 0.1
        appSwitchesLast5Min: 50 // extremely high, but should be ignored
      },
      categories: { activeCategory: 'productive' }
    })
    const result = calculateScore(snap)
    // base = 100*(0.55*0.1) = 5.5 -> round 6
    expect(result.procrastinationScore).toBe(6)
    expect(result.severity).toBe(0)
  })

  test('applies late-night multiplier at hour >= 23', () => {
    const snap = makeSnapshot({
      signals: {
        sessionMinutes: 10,
        distractingMinutes: 5, // 0.5
        timeOfDayLocal: 23
      }
    })
    const result = calculateScore(snap)
    // base = 100*(0.55*0.5) = 27.5; mult 1.25 => 34.375 -> round 34
    expect(result.procrastinationScore).toBe(34)
    expect(result.severity).toBe(1)
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
