import { describe, expect, test } from 'vitest'
import { FocusScoreEngine } from '../focus-score-engine.js'

/**
 * Helper: simulate N seconds of a given category, ticking every tickMs.
 * Returns the final focus score.
 */
function simulate(
  engine: FocusScoreEngine,
  category: 'productive' | 'neutral' | 'social' | 'entertainment' | 'unknown',
  durationSec: number,
  opts?: { tickMs?: number },
): number {
  const tickMs = opts?.tickMs ?? 1000
  const ticks = Math.round((durationSec * 1000) / tickMs)
  let result = { focusScore: 100, decayPerSec: 0, recoveryPerSec: 0 }
  for (let i = 0; i < ticks; i++) {
    result = engine.tick({
      activeCategory: category,
      appSwitchesLast5Min: 0,
      elapsedMs: tickMs,
    })
  }
  return result.focusScore
}

describe('FocusScoreEngine — simple level-based timer', () => {
  test('starts at 100 (Locked In)', () => {
    const engine = new FocusScoreEngine()
    expect(engine.getFocusScore()).toBe(100)
  })

  test('distraction drops one level every 10 seconds', () => {
    const engine = new FocusScoreEngine()

    // After 10 seconds of social media → level 1 (score 75)
    const after10 = simulate(engine, 'social', 10)
    expect(after10).toBe(75)

    // After 20 seconds total → level 2 (score 50)
    const after20 = simulate(engine, 'social', 10)
    expect(after20).toBe(50)

    // After 30 seconds total → level 3 (score 25)
    const after30 = simulate(engine, 'social', 10)
    expect(after30).toBe(25)

    // After 40 seconds total → level 4 (score 0, Cooked)
    const after40 = simulate(engine, 'social', 10)
    expect(after40).toBe(0)
  })

  test('score caps at 0 (level 4) and does not go lower', () => {
    const engine = new FocusScoreEngine()

    // 60 seconds of distraction — should cap at 0
    const score = simulate(engine, 'social', 60)
    expect(score).toBe(0)
  })

  test('focused use returns to Locked In after 10 seconds of productive use', () => {
    const engine = new FocusScoreEngine()

    // Get distracted for 30 seconds → level 3 (score 25)
    simulate(engine, 'social', 30)
    expect(engine.getFocusScore()).toBe(25)

    // 9 seconds of productive work — not enough yet
    const after9 = simulate(engine, 'productive', 9)
    expect(after9).toBe(25)

    // 1 more second (10s total) → back to level 0 (score 100)
    const after10 = simulate(engine, 'productive', 1)
    expect(after10).toBe(100)
  })

  test('less than 10 seconds of productive use does not recover to Locked In', () => {
    const engine = new FocusScoreEngine()

    // Get distracted → level 2 (score 50)
    simulate(engine, 'social', 20)
    expect(engine.getFocusScore()).toBe(50)

    // Only 9 seconds of productive use — not enough
    const score = simulate(engine, 'productive', 9)
    expect(score).toBe(50)
  })

  test('neutral apps freeze the timer (no change)', () => {
    const engine = new FocusScoreEngine()

    // Get distracted → level 2 (score 50)
    simulate(engine, 'social', 20)
    expect(engine.getFocusScore()).toBe(50)

    // 30 seconds of neutral app — no change
    const score = simulate(engine, 'neutral', 30)
    expect(score).toBe(50)
  })

  test('neutral apps pause recovery without losing banked time', () => {
    const engine = new FocusScoreEngine()

    // Get distracted → level 3 (score 25)
    simulate(engine, 'social', 30)
    expect(engine.getFocusScore()).toBe(25)

    // 4 seconds of productive work (not enough for a full recovery — need 10s)
    simulate(engine, 'productive', 4)
    expect(engine.getFocusScore()).toBe(25)

    // Switch to neutral — pauses but doesn't reset banked time
    simulate(engine, 'neutral', 3)
    expect(engine.getFocusScore()).toBe(25)

    // 6 more seconds of productive work — banked 4 + 6 = 10s → full recovery
    const score = simulate(engine, 'productive', 6)
    expect(score).toBe(100)
  })

  test('distraction wipes all recovery progress', () => {
    const engine = new FocusScoreEngine()

    // Get distracted → level 3 (score 25)
    simulate(engine, 'social', 30)
    expect(engine.getFocusScore()).toBe(25)

    // 9 seconds of productive work (banked some recovery time, but not enough)
    simulate(engine, 'productive', 9)
    expect(engine.getFocusScore()).toBe(25)

    // Switch to distracted app — wipes all recovery progress
    simulate(engine, 'social', 1)
    expect(engine.getFocusScore()).toBe(25)

    // Now need a full 10 seconds of productive work (banked time is gone)
    simulate(engine, 'productive', 9)
    expect(engine.getFocusScore()).toBe(25) // not enough yet

    const score = simulate(engine, 'productive', 1)
    expect(score).toBe(100) // now 10s total → full recovery
  })

  test('neutral apps pause distraction timer (no reset)', () => {
    const engine = new FocusScoreEngine()

    // 9 seconds of distraction (not yet at level 1)
    simulate(engine, 'social', 9)
    expect(engine.getFocusScore()).toBe(100)

    // Switch to neutral briefly (pauses)
    simulate(engine, 'neutral', 2)
    expect(engine.getFocusScore()).toBe(100)

    // 1 more second of distraction — total distracted time now 10s → level 1
    const score = simulate(engine, 'social', 1)
    expect(score).toBe(75)
  })

  test('entertainment category counts as distraction', () => {
    const engine = new FocusScoreEngine()

    const score = simulate(engine, 'entertainment', 20)
    expect(score).toBe(50) // level 2
  })

  test('reset clears all state back to Locked In', () => {
    const engine = new FocusScoreEngine()

    // Get fully distracted
    simulate(engine, 'social', 40)
    expect(engine.getFocusScore()).toBe(0)

    engine.reset()
    expect(engine.getFocusScore()).toBe(100)

    // After reset, distraction starts fresh
    const score = simulate(engine, 'social', 10)
    expect(score).toBe(75) // level 1
  })

  test('decayScale is accepted but ignored (interface compatibility)', () => {
    const engine = new FocusScoreEngine()

    // decayScale = 0 should NOT prevent decay in new engine
    for (let i = 0; i < 10; i++) {
      engine.tick({
        activeCategory: 'social',
        appSwitchesLast5Min: 0,
        elapsedMs: 1000,
        decayScale: 0,
      })
    }
    // 10 seconds of distraction → level 1
    expect(engine.getFocusScore()).toBe(75)
  })
})
