import { classifyApp, computeScore, SCORING_WINDOW } from '@norot/shared'
import type { ActivityEntry, ProcrastinationScore } from '@norot/shared'

const MAX_BUFFER_SIZE = 600 // 10 min at 1s polling

interface TelemetryState {
  activities: ActivityEntry[]
  currentApp: string | null
  currentTitle: string | null
  currentStart: number
  snoozeCount: number
}

const state: TelemetryState = {
  activities: [],
  currentApp: null,
  currentTitle: null,
  currentStart: Date.now(),
  snoozeCount: 0
}

export function recordWindow(appName: string, title: string): void {
  const now = Date.now()

  if (appName === state.currentApp) {
    return // same app, keep accumulating
  }

  // Flush previous app
  if (state.currentApp) {
    const duration = Math.round((now - state.currentStart) / 1000)
    if (duration > 0) {
      const { category } = classifyApp(state.currentApp, state.currentTitle || '')
      state.activities.push({
        timestamp: state.currentStart,
        app: state.currentApp,
        title: state.currentTitle || '',
        category,
        duration
      })
    }
  }

  state.currentApp = appName
  state.currentTitle = title
  state.currentStart = now

  // Trim to scoring window
  const cutoff = now - SCORING_WINDOW
  state.activities = state.activities.filter(a => a.timestamp >= cutoff)

  // Also enforce max buffer
  if (state.activities.length > MAX_BUFFER_SIZE) {
    state.activities = state.activities.slice(-MAX_BUFFER_SIZE)
  }
}

export function getActivities(): ActivityEntry[] {
  // Include current app in progress
  const now = Date.now()
  const result = [...state.activities]

  if (state.currentApp) {
    const duration = Math.round((now - state.currentStart) / 1000)
    if (duration > 0) {
      const { category } = classifyApp(state.currentApp, state.currentTitle || '')
      result.push({
        timestamp: state.currentStart,
        app: state.currentApp,
        title: state.currentTitle || '',
        category,
        duration
      })
    }
  }

  return result
}

export function getScore(): ProcrastinationScore {
  return computeScore(getActivities(), state.snoozeCount)
}

export function incrementSnooze(): void {
  state.snoozeCount++
}

export function resetSnooze(): void {
  state.snoozeCount = 0
}

export function getSnoozeCount(): number {
  return state.snoozeCount
}

export function getRecentApps(count: number = 5): string[] {
  const activities = getActivities()
  const seen = new Set<string>()
  const result: string[] = []

  for (let i = activities.length - 1; i >= 0 && result.length < count; i--) {
    if (!seen.has(activities[i].app)) {
      seen.add(activities[i].app)
      result.push(activities[i].app)
    }
  }

  return result
}
