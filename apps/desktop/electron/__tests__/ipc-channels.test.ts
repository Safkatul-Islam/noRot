import { describe, expect, test } from 'vitest'
import { IPC_CHANNELS } from '../types'

function flattenStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(flattenStrings)
  }
  return []
}

describe('IPC_CHANNELS', () => {
  test('contains unique string channel names', () => {
    const channels = flattenStrings(IPC_CHANNELS)
    expect(channels.length).toBeGreaterThan(0)
    const unique = new Set(channels)
    expect(unique.size).toBe(channels.length)
  })
})

