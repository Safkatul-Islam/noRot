import { describe, expect, test } from 'vitest'
import { FocusScoreEngine } from '../focus-score-engine.js'

describe('FocusScoreEngine', () => {
  test('decays while distracting and recovers while not distracting', () => {
    const engine = new FocusScoreEngine()

    const t1 = engine.tick({ activeCategory: 'social', appSwitchesLast5Min: 0, elapsedMs: 1000 })
    expect(t1.decayPerSec).toBe(3)
    expect(t1.focusScore).toBe(97)

    const t2 = engine.tick({ activeCategory: 'productive', appSwitchesLast5Min: 0, elapsedMs: 1000 })
    expect(t2.focusScore).toBe(99)

    const t3 = engine.tick({ activeCategory: 'productive', appSwitchesLast5Min: 0, elapsedMs: 1000 })
    expect(t3.focusScore).toBe(100)
  })

  test('decay rate increases with switch rate while distracting', () => {
    const engine = new FocusScoreEngine()
    const t = engine.tick({ activeCategory: 'entertainment', appSwitchesLast5Min: 50, elapsedMs: 1000 })
    // switchesPerMin = 10 => normSwitchRate = 0.8; decayPerSec = 3 + 3*0.8 = 5.4
    expect(t.decayPerSec).toBeCloseTo(5.4, 6)
    expect(t.focusScore).toBe(95)
  })
})

