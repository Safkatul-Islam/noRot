import { describe, expect, test } from 'vitest'
import { FocusScoreEngine } from '../focus-score-engine.js'

/**
 * Helper: simulate N seconds of a given category, ticking every tickMs.
 * Returns the final focus score.
 */
function simulate(
  engine: FocusScoreEngine,
  category: string,
  durationSec: number,
  opts?: { tickMs?: number; switches?: number },
): number {
  const tickMs = opts?.tickMs ?? 1000
  const switches = opts?.switches ?? 0
  const ticks = Math.round((durationSec * 1000) / tickMs)
  let result = { focusScore: 100, decayPerSec: 0, recoveryPerSec: 0 }
  for (let i = 0; i < ticks; i++) {
    result = engine.tick({
      activeCategory: category,
      appSwitchesLast5Min: switches,
      elapsedMs: tickMs,
    })
  }
  return result.focusScore
}

describe('FocusScoreEngine — new three-layer architecture', () => {
  test('starts at 100 and returns correct initial score', () => {
    const engine = new FocusScoreEngine()
    expect(engine.getFocusScore()).toBe(100)
  })

  test('quick glance (<10 sec) at social barely moves score', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 100 })

    // Establish some focus history first (10 sec)
    simulate(engine, 'productive', 10)

    const before = engine.getFocusScore()
    // 8-second Instagram glance
    const after = simulate(engine, 'social', 8)

    // Score should barely change — momentum buffer absorbs it
    // The distracted ratio in 30-sec window will be < 0.33 so decay gate = 0
    expect(after).toBeGreaterThanOrEqual(before - 5)
  })

  test('extended distraction (5 min) drops score significantly', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 100 })

    // 5 minutes of social media
    const score = simulate(engine, 'social', 300)

    // Should be in "Very Distracted" range or lower (below 40)
    expect(score).toBeLessThan(40)
  })

  test('long focus session protects against brief distraction', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 100 })

    // 60 minutes of focused work
    simulate(engine, 'productive', 3600)
    const beforeDistraction = engine.getFocusScore()

    // 1 minute of social media
    const afterDistraction = simulate(engine, 'social', 60)

    // Score should stay relatively high thanks to:
    // - Session history (good session = 40% decay)
    // - Focus streak shield (60 min = 0.5x decay)
    // With all modifiers, ~30-35 pt drop for 1 min distraction after 60 min focus
    expect(afterDistraction).toBeGreaterThanOrEqual(beforeDistraction - 35)
  })

  test('slow recovery after heavy distraction session', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 100 })

    // 30 minutes of YouTube
    simulate(engine, 'entertainment', 1800)
    const afterDistraction = engine.getFocusScore()
    expect(afterDistraction).toBeLessThanOrEqual(5)

    // 2 minutes of VS Code — should not bounce back quickly
    const afterRecovery = simulate(engine, 'productive', 120)

    // Session history keeps recovery slow — should still be well below 50
    expect(afterRecovery).toBeLessThan(50)
  })

  test('rapid switching causes net decline', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 80 })

    // Alternate between productive and social every 5 seconds for 2 minutes
    for (let i = 0; i < 24; i++) {
      const category = i % 2 === 0 ? 'productive' : 'social'
      simulate(engine, category, 5, { switches: 50 })
    }

    const score = engine.getFocusScore()
    // Should decline from 80 due to switching + partial momentum gates
    expect(score).toBeLessThan(80)
  })

  test('momentum buffer: 30-sec grace period works for recovery too', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 100 })

    // Tank the score first
    simulate(engine, 'social', 300)
    const tanked = engine.getFocusScore()
    expect(tanked).toBeLessThan(20)

    // 8 seconds of VS Code shouldn't recover much (momentum buffer blocks it)
    const after8sec = simulate(engine, 'productive', 8)
    expect(after8sec - tanked).toBeLessThanOrEqual(5)
  })

  test('session history: time-weighted ratio favors recent activity', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 100 })

    // 30 minutes of focused work, then 10 min of distraction
    simulate(engine, 'productive', 1800)
    simulate(engine, 'social', 600)
    const afterDistraction = engine.getFocusScore()

    // Now recover — session history still remembers good session, recovery should be decent
    simulate(engine, 'productive', 120)
    const afterRecovery = engine.getFocusScore()

    expect(afterRecovery).toBeGreaterThan(afterDistraction)
  })

  test('distraction streak accelerator: longer on distraction = faster decay', () => {
    // Engine A: 1 minute of distraction
    const engineA = new FocusScoreEngine({ initialFocusScore: 80 })
    // Build up some buffer so momentum gate opens
    simulate(engineA, 'social', 30)
    const scoreA30 = engineA.getFocusScore()
    simulate(engineA, 'social', 30)
    const scoreA60 = engineA.getFocusScore()
    const dropA = scoreA30 - scoreA60

    // Engine B: start at same point but has been distracted for 4 minutes already
    const engineB = new FocusScoreEngine({ initialFocusScore: 80 })
    simulate(engineB, 'social', 240) // 4 minutes to build streak
    const scoreBBefore = engineB.getFocusScore()
    simulate(engineB, 'social', 30)
    const scoreBAfter = engineB.getFocusScore()
    const dropB = scoreBBefore - scoreBAfter

    // dropB should be larger due to streak acceleration
    expect(dropB).toBeGreaterThanOrEqual(dropA)
  })

  test('neutral apps drift slowly toward session average', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 50 })

    // Build a good session
    simulate(engine, 'productive', 600)
    const before = engine.getFocusScore()

    // Neutral app for 30 seconds
    const after = simulate(engine, 'neutral', 30)

    // Should drift slightly upward since session is focused
    expect(after).toBeGreaterThanOrEqual(before - 1)
  })

  test('decayScale of 0 prevents decay', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 100 })

    // Build enough history for momentum gate to open
    simulate(engine, 'social', 30)
    const scoreBefore = engine.getFocusScore()

    // Now tick with decayScale = 0
    for (let i = 0; i < 10; i++) {
      engine.tick({
        activeCategory: 'social',
        appSwitchesLast5Min: 0,
        elapsedMs: 1000,
        decayScale: 0,
      })
    }
    const scoreAfter = engine.getFocusScore()

    // Should not have decayed further
    expect(scoreAfter).toBe(scoreBefore)
  })

  test('reset clears all state', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 100 })

    // Accumulate some history
    simulate(engine, 'social', 120)
    expect(engine.getFocusScore()).toBeLessThan(100)

    engine.reset(100)
    expect(engine.getFocusScore()).toBe(100)

    // After reset, a quick glance should be absorbed again (fresh momentum buffer)
    simulate(engine, 'productive', 10)
    const afterGlance = simulate(engine, 'social', 5)
    expect(afterGlance).toBeGreaterThanOrEqual(95)
  })
})
