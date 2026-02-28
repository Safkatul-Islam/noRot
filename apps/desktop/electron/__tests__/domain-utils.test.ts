import { describe, expect, test } from 'vitest'
import { extractDomainFromTitle, extractDomainFromUrl } from '../domain-utils'

describe('extractDomainFromUrl', () => {
  test('parses hostname', () => {
    expect(extractDomainFromUrl('https://github.com/openai/codex')).toBe('github.com')
  })

  test('returns null on invalid', () => {
    expect(extractDomainFromUrl('not a url')).toBeNull()
  })
})

describe('extractDomainFromTitle', () => {
  test('extracts a domain-looking token', () => {
    expect(extractDomainFromTitle('OpenAI · GitHub.com — something')).toBe('github.com')
  })

  test('prefers last match', () => {
    expect(extractDomainFromTitle('foo.com bar.com - Chrome')).toBe('bar.com')
  })
})

