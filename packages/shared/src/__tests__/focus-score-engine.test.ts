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

  test('distraction drops one level every 5 seconds', () => {
    const engine = new FocusScoreEngine()

    // After 5 seconds of social media → level 1 (score 75)
    const after5 = simulate(engine, 'social', 5)
    expect(after5).toBe(75)

    // After 10 seconds total → level 2 (score 50)
    const after10 = simulate(engine, 'social', 5)
    expect(after10).toBe(50)

    // After 15 seconds total → level 3 (score 25)
    const after15 = simulate(engine, 'social', 5)
    expect(after15).toBe(25)

    // After 20 seconds total → level 4 (score 0, Cooked)
    const after20 = simulate(engine, 'social', 5)
    expect(after20).toBe(0)
  })

  test('score caps at 0 (level 4) and does not go lower', () => {
    const engine = new FocusScoreEngine()

    // 60 seconds of distraction — should cap at 0
    const score = simulate(engine, 'social', 60)
    expect(score).toBe(0)
  })

  test('focused use recovers one level every 5 seconds (Locked In requires 10s)', () => {
    const engine = new FocusScoreEngine()

    // Get distracted for 15 seconds → level 3 (score 25)
    simulate(engine, 'social', 15)
    expect(engine.getFocusScore()).toBe(25)

    // 5 seconds of productive work → level 2 (score 50)
    const after5 = simulate(engine, 'productive', 5)
    expect(after5).toBe(50)

    // 5 more seconds → level 1 (score 75)
    const after10 = simulate(engine, 'productive', 5)
    expect(after10).toBe(75)

    // Next 5 seconds: still level 1 — need a full 10s of productive work to get back to Locked In
    const after15 = simulate(engine, 'productive', 5)
    expect(after15).toBe(75)

    // 5 more seconds (10s total at level 1) → level 0 (score 100, Locked In)
    const after20 = simulate(engine, 'productive', 5)
    expect(after20).toBe(100)
  })

  test('less than 5 seconds of productive use does not recover a level', () => {
    const engine = new FocusScoreEngine()

    // Get distracted → level 2 (score 50)
    simulate(engine, 'social', 10)
    expect(engine.getFocusScore()).toBe(50)

    // Only 4 seconds of productive use — not enough to recover a level
    const score = simulate(engine, 'productive', 4)
    expect(score).toBe(50)
  })

  test('neutral apps freeze the timer (no change)', () => {
    const engine = new FocusScoreEngine()

    // Get distracted → level 2 (score 50)
    simulate(engine, 'social', 10)
    expect(engine.getFocusScore()).toBe(50)

    // 30 seconds of neutral app — no change
    const score = simulate(engine, 'neutral', 30)
    expect(score).toBe(50)
  })

  test('neutral apps pause recovery without losing banked time', () => {
    const engine = new FocusScoreEngine()

    // Get distracted → level 3 (score 25)
    simulate(engine, 'social', 15)
    expect(engine.getFocusScore()).toBe(25)

    // 2 seconds of productive work (not enough for a full level — need 5s)
    simulate(engine, 'productive', 2)
    expect(engine.getFocusScore()).toBe(25)

    // Switch to neutral (e.g. Finder) — pauses but doesn't reset banked time
    simulate(engine, 'neutral', 3)
    expect(engine.getFocusScore()).toBe(25)

    // 3 more seconds of productive work — banked 2 + 3 = 5s → recover one level
    const score = simulate(engine, 'productive', 3)
    expect(score).toBe(50) // level 2
  })

  test('distraction wipes all recovery progress', () => {
    const engine = new FocusScoreEngine()

    // Get distracted → level 3 (score 25)
    simulate(engine, 'social', 15)
    expect(engine.getFocusScore()).toBe(25)

    // 4 seconds of productive work (banked some recovery time, but not enough for a level)
    simulate(engine, 'productive', 4)
    expect(engine.getFocusScore()).toBe(25)

    // Switch to distracted app — wipes all recovery progress
    simulate(engine, 'social', 1)
    expect(engine.getFocusScore()).toBe(25)

    // Now need a full 5 seconds of productive work to recover one level (banked time is gone)
    simulate(engine, 'productive', 4)
    expect(engine.getFocusScore()).toBe(25) // not enough yet

    const score = simulate(engine, 'productive', 1)
    expect(score).toBe(50) // now 5s total → recovered one level
  })

  test('switching from distracted to neutral to distracted resets timer', () => {
    const engine = new FocusScoreEngine()

    // 4 seconds of distraction (not yet at level 1)
    simulate(engine, 'social', 4)
    expect(engine.getFocusScore()).toBe(100)

    // Switch to neutral briefly (resets distraction timer)
    simulate(engine, 'neutral', 1)

    // 4 more seconds of distraction — timer restarted so still level 0
    const score = simulate(engine, 'social', 4)
    expect(score).toBe(100)
  })

  test('entertainment category counts as distraction', () => {
    const engine = new FocusScoreEngine()

    const score = simulate(engine, 'entertainment', 10)
    expect(score).toBe(50) // level 2
  })

  test('reset clears all state back to Locked In', () => {
    const engine = new FocusScoreEngine()

    // Get fully distracted
    simulate(engine, 'social', 20)
    expect(engine.getFocusScore()).toBe(0)

    engine.reset()
    expect(engine.getFocusScore()).toBe(100)

    // After reset, distraction starts fresh
    const score = simulate(engine, 'social', 5)
    expect(score).toBe(75) // level 1
  })

  test('decayScale is accepted but ignored (interface compatibility)', () => {
    const engine = new FocusScoreEngine()

    // decayScale = 0 should NOT prevent decay in new engine
    for (let i = 0; i < 5; i++) {
      engine.tick({
        activeCategory: 'social',
        appSwitchesLast5Min: 0,
        elapsedMs: 1000,
        decayScale: 0,
      })
    }
    // 5 seconds of distraction → level 1
    expect(engine.getFocusScore()).toBe(75)
  })
})
