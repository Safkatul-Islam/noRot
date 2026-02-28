import { describe, expect, test } from 'vitest'

import { toDateKey } from '../date'

describe('toDateKey', () => {
  test('formats YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 0, 2))).toBe('2026-01-02')
    expect(toDateKey(new Date(2026, 10, 9))).toBe('2026-11-09')
  })
})

