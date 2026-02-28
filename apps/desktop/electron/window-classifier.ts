import type { Result } from 'get-windows'
import type { UsageCategories } from '@norot/shared'

import type { CategoryRule, WorkOverride } from './database'
import { extractDomainFromTitle, extractDomainFromUrl } from './domain-utils'

export interface ClassificationInput {
  window: Result
  rules: CategoryRule[]
  workOverrides: WorkOverride[]
}

function matchesRule(rule: CategoryRule, appName: string, title: string): boolean {
  const needle = rule.pattern.toLowerCase().trim()
  if (!needle) return false
  if (rule.matchType === 'app') return appName.toLowerCase().includes(needle)
  return title.toLowerCase().includes(needle)
}

function getActiveDomain(win: Result): string | undefined {
  if ('url' in win && typeof win.url === 'string') {
    const d = extractDomainFromUrl(win.url)
    if (d) return d
  }
  const fromTitle = extractDomainFromTitle(win.title)
  return fromTitle ?? undefined
}

function hasWorkOverride(overrides: WorkOverride[], app: string, domain?: string): WorkOverride | null {
  const now = Date.now()
  for (const o of overrides) {
    if (o.untilTs <= now) continue
    if (o.app && o.app === app) return o
    if (o.domain && domain && o.domain === domain) return o
  }
  return null
}

export function classifyActiveWindow(input: ClassificationInput): UsageCategories {
  const appName = input.window.owner.name
  const title = input.window.title ?? ''
  const domain = getActiveDomain(input.window)

  const override = hasWorkOverride(input.workOverrides, appName, domain)
  if (override) {
    return {
      activeApp: appName,
      activeCategory: 'productive',
      activeDomain: domain,
      contextOverride: 'Working override',
      contextTodo: undefined
    }
  }

  for (const rule of input.rules) {
    if (matchesRule(rule, appName, title)) {
      return {
        activeApp: appName,
        activeCategory: rule.category,
        activeDomain: domain
      }
    }
  }

  return {
    activeApp: appName,
    activeCategory: 'unknown',
    activeDomain: domain
  }
}

