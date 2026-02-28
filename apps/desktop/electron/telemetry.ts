import { powerMonitor } from 'electron'
import type { UsageSnapshot } from '@norot/shared'

import { getActiveWindow } from './active-window'
import type { CategoryRule, WorkOverride } from './database'
import { classifyActiveWindow } from './window-classifier'

export interface TelemetryTick {
  timestamp: number
  elapsedMs: number
  snapshotLike: UsageSnapshot
}

export interface TelemetryOptions {
  getRules: () => CategoryRule[]
  getWorkOverrides: () => WorkOverride[]
}

function isDistracting(category: UsageSnapshot['categories']['activeCategory']): boolean {
  return category === 'social' || category === 'entertainment'
}

function bucket(category: UsageSnapshot['categories']['activeCategory']): 'productive' | 'distracting' | 'neutral' {
  if (category === 'productive') return 'productive'
  if (isDistracting(category)) return 'distracting'
  return 'neutral'
}

export class TelemetryService {
  private readonly options: TelemetryOptions
  private timer: NodeJS.Timeout | null = null
  private lastTickTs: number | null = null

  private sessionSeconds = 0
  private productiveSeconds = 0
  private distractingSeconds = 0
  private neutralSeconds = 0

  private appSwitchTimestamps: number[] = []
  private idleWindow: number[] = []
  private distractWindow: number[] = []
  private snoozeTimestamps: number[] = []

  private lastApp: string | null = null

  private tickCount = 0

  onTick: ((tick: TelemetryTick) => void) | null = null
  onSnapshot: ((snapshot: UsageSnapshot) => void) | null = null

  constructor(options: TelemetryOptions) {
    this.options = options
  }

  isActive(): boolean {
    return this.timer !== null
  }

  start(): void {
    if (this.timer) return
    this.resetSession('start')
    this.lastTickTs = Date.now()

    powerMonitor.on('lock-screen', this.onLockScreen)

    this.timer = setInterval(() => void this.tick(), 1000)
  }

  stop(): void {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
    powerMonitor.removeListener('lock-screen', this.onLockScreen)
  }

  recordSnooze(timestamp: number = Date.now()): void {
    this.snoozeTimestamps.push(timestamp)
    this.trimWindows(timestamp)
  }

  getSnoozesLast60Min(now: number = Date.now()): number {
    this.trimWindows(now)
    return this.snoozeTimestamps.length
  }

  getSnoozeTimestamps(): number[] {
    return [...this.snoozeTimestamps]
  }

  private onLockScreen = () => {
    this.resetSession('lock-screen')
  }

  private resetSession(_reason: string): void {
    this.sessionSeconds = 0
    this.productiveSeconds = 0
    this.distractingSeconds = 0
    this.neutralSeconds = 0
    this.appSwitchTimestamps = []
    this.idleWindow = []
    this.distractWindow = []
    this.lastApp = null
    this.tickCount = 0
  }

  private trimWindows(now: number): void {
    const fiveMinAgo = now - 5 * 60 * 1000
    this.appSwitchTimestamps = this.appSwitchTimestamps.filter(ts => ts >= fiveMinAgo)

    const sixtyMinAgo = now - 60 * 60 * 1000
    this.snoozeTimestamps = this.snoozeTimestamps.filter(ts => ts >= sixtyMinAgo)

    // idle window: last 300 seconds
    if (this.idleWindow.length > 300) this.idleWindow = this.idleWindow.slice(-300)
    // distract window: last 120 seconds
    if (this.distractWindow.length > 120) this.distractWindow = this.distractWindow.slice(-120)
  }

  private async tick(): Promise<void> {
    const now = Date.now()
    const last = this.lastTickTs ?? now
    this.lastTickTs = now
    const elapsedMs = Math.max(0, now - last)

    const idleSeconds = powerMonitor.getSystemIdleTime()
    const idleNow = idleSeconds >= 5
    this.idleWindow.push(idleNow ? 1 : 0)

    if (idleSeconds >= 10 * 60) {
      this.resetSession('idle-reset')
    }

    const win = await getActiveWindow()
    if (!win) return

    const categories = classifyActiveWindow({
      window: win,
      rules: this.options.getRules(),
      workOverrides: this.options.getWorkOverrides()
    })

    if (this.lastApp && categories.activeApp !== this.lastApp) {
      this.appSwitchTimestamps.push(now)
    }
    this.lastApp = categories.activeApp

    const bucketName = bucket(categories.activeCategory)
    this.sessionSeconds += 1
    if (bucketName === 'productive') this.productiveSeconds += 1
    else if (bucketName === 'distracting') this.distractingSeconds += 1
    else this.neutralSeconds += 1

    this.distractWindow.push(bucketName === 'distracting' ? 1 : 0)
    this.trimWindows(now)

    const recentDistractRatio = this.distractWindow.length > 0
      ? this.distractWindow.reduce((a, b) => a + b, 0) / this.distractWindow.length
      : 0

    const snapshotLike: UsageSnapshot = {
      timestamp: now,
      focusIntent: null,
      signals: {
        sessionMinutes: this.sessionSeconds / 60,
        distractingMinutes: this.distractingSeconds / 60,
        productiveMinutes: this.productiveSeconds / 60,
        appSwitchesLast5Min: this.appSwitchTimestamps.length,
        idleSecondsLast5Min: this.idleWindow.reduce((a, b) => a + b, 0),
        timeOfDayLocal: new Date(now).getHours(),
        snoozesLast60Min: this.snoozeTimestamps.length,
        recentDistractRatio
      },
      categories
    }

    this.onTick?.({ timestamp: now, elapsedMs, snapshotLike })

    this.tickCount += 1
    if (this.tickCount % 5 === 0) {
      this.onSnapshot?.(snapshotLike)
    }

  }
}
