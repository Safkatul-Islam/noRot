import { randomUUID } from 'node:crypto'

import type { BrowserWindow } from 'electron'

import {
  FocusScoreEngine,
  INTERVENTION_SCRIPTS,
  SEVERITY_BANDS,
  SNOOZE_PRESSURE_DURATION_MIN,
  SNOOZE_PRESSURE_POINTS,
  MAX_SNOOZE_PRESSURE,
  applySnoozeEscalation,
  calculateScore,
  generateReasons,
  stripEmotionTags
} from '@norot/shared'

import type { PersonaId, Recommendation, ScoreResponse, Severity, UsageSnapshot } from '@norot/shared'
import { IPC_CHANNELS } from './types'
import { LocalDatabase } from './database'
import type { JsonValue, SettingsKey, WorkOverride } from './database'
import type { TelemetryService, TelemetryTick } from './telemetry'

function toDateKey(date: Date): string {
  const yyyy = String(date.getFullYear())
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getModeForSeverity(severity: Severity): Recommendation['mode'] {
  const band = SEVERITY_BANDS.find(b => b.severity === severity)
  return band?.mode ?? 'none'
}

function getDefaultTtsSettings(severity: Severity): Recommendation['tts'] {
  let stability = 45
  let speed = 1.0
  if (severity === 2 || severity === 3) {
    stability = 35
    speed = 1.08
  } else if (severity === 4) {
    stability = 55
    speed = 0.98
  }
  return { model: 'eleven_turbo_v2', stability, speed }
}

function getDefaultCooldown(severity: Severity): number {
  if (severity === 0) return 0
  if (severity === 1) return 300
  return 180
}

function enforceToughLove(text: string): string {
  const hasAllCaps = /[A-Z]{4,}/.test(text)
  const hasProfanity = /\b(fuck|shit|damn|bitch|ass)\b/i.test(text)
  if (hasAllCaps && hasProfanity) return text
  const upper = stripEmotionTags(text).toUpperCase()
  return `${upper} FUCKING DO IT.`
}

export class Orchestrator {
  private readonly db: LocalDatabase
  private readonly telemetry: TelemetryService
  private readonly mainWindow: BrowserWindow
  private readonly focusEngine = new FocusScoreEngine()

  private lastInterventionTs = 0
  private activeIntervention: { id: string; triggeringApp: string } | null = null
  private consecutiveCompliantSnapshots = 0

  constructor(options: { db: LocalDatabase; telemetry: TelemetryService; mainWindow: BrowserWindow }) {
    this.db = options.db
    this.telemetry = options.telemetry
    this.mainWindow = options.mainWindow
  }

  start(): void {
    this.telemetry.onTick = (t) => this.onTick(t)
    this.telemetry.onSnapshot = (s) => void this.onSnapshot(s)
  }

  private getSettingBoolean(key: SettingsKey, fallback: boolean): boolean {
    const v = this.db.getSetting<unknown>(key)
    if (typeof v === 'boolean') return v
    return fallback
  }

  private getSettingNumber(key: SettingsKey, fallback: number): number {
    const v = this.db.getSetting<unknown>(key)
    if (typeof v === 'number' && Number.isFinite(v)) return v
    return fallback
  }

  private getSettingString(key: SettingsKey, fallback: string): string {
    const v = this.db.getSetting<unknown>(key)
    if (typeof v === 'string') return v
    return fallback
  }

  private getPersona(): PersonaId {
    const v = this.getSettingString('persona', 'calm_friend')
    if (v === 'calm_friend' || v === 'coach' || v === 'tough_love') return v
    return 'calm_friend'
  }

  private isDailySetupDoneToday(): boolean {
    const key = this.db.getSetting<unknown>('dailySetupDate')
    if (typeof key !== 'string' || key.length === 0) return false
    return key === toDateKey(new Date())
  }

  shouldAutoStartTelemetry(): boolean {
    const onboarding = this.getSettingBoolean('onboardingComplete', false)
    const monitoringEnabled = this.getSettingBoolean('monitoringEnabled', true)
    return onboarding && this.isDailySetupDoneToday() && monitoringEnabled !== false
  }

  startTelemetry(): void {
    this.telemetry.start()
  }

  stopTelemetry(): void {
    this.telemetry.stop()
  }

  isTelemetryActive(): boolean {
    return this.telemetry.isActive()
  }

  snooze(): void {
    this.telemetry.recordSnooze()
    this.lastInterventionTs = Date.now()
  }

  markWorkingOverride(appName: string, domain?: string): void {
    const now = Date.now()
    const untilTs = now + 2 * 60 * 60 * 1000
    const existing = this.db.getSetting<unknown>('workOverrides')
    const overrides = Array.isArray(existing) ? (existing as WorkOverride[]) : []
    const next: WorkOverride[] = overrides.concat([{ app: appName, domain, untilTs }])
    this.db.setSetting('workOverrides', next as unknown as JsonValue)
  }

  respondToIntervention(id: string, response: 'snoozed' | 'dismissed' | 'working'): void {
    if (response === 'snoozed') {
      this.snooze()
    } else if (response === 'working') {
      this.db.incrementRefocusCount()
      const last = this.lastSnapshot
      if (last) {
        this.markWorkingOverride(last.categories.activeApp, last.categories.activeDomain)
      }
    }
    void id
    this.lastInterventionTs = Date.now()
    this.activeIntervention = null
    this.consecutiveCompliantSnapshots = 0
  }

  private lastSnapshot: UsageSnapshot | null = null

  private onTick(tick: TelemetryTick): void {
    const snap = tick.snapshotLike
    const r = this.focusEngine.tick({
      activeCategory: snap.categories.activeCategory,
      appSwitchesLast5Min: snap.signals.appSwitchesLast5Min,
      elapsedMs: tick.elapsedMs
    })

    const liveProcrastination = Math.max(0, Math.min(100, Math.round(100 - r.focusScore)))
    const liveSeverity = calculateScore(
      {
        ...snap,
        signals: { ...snap.signals, focusScore: r.focusScore }
      },
      0
    ).severity

    this.mainWindow.webContents.send(IPC_CHANNELS.interventions.onLiveScoreUpdate, {
      timestamp: tick.timestamp,
      focusScore: r.focusScore,
      procrastinationScore: liveProcrastination,
      severity: liveSeverity
    })
  }

  private computeSnoozePressure(now: number): number {
    const windowMs = SNOOZE_PRESSURE_DURATION_MIN * 60 * 1000
    const cutoff = now - windowMs
    const timestamps = this.telemetry.getSnoozeTimestamps().filter(ts => ts >= cutoff)
    const count = Math.min(MAX_SNOOZE_PRESSURE, timestamps.length)
    return count * SNOOZE_PRESSURE_POINTS
  }

  private async onSnapshot(snapshotLike: UsageSnapshot): Promise<void> {
    this.lastSnapshot = snapshotLike

    const focusScore = this.focusEngine.focusScore
    const snapshot: UsageSnapshot = {
      ...snapshotLike,
      signals: { ...snapshotLike.signals, focusScore }
    }

    this.db.insertTelemetrySnapshot(snapshot.timestamp, snapshot as unknown as never)

    const snoozePressure = this.computeSnoozePressure(snapshot.timestamp)
    const persona = this.getPersona()
    const apiUrl = this.getSettingString('apiUrl', 'http://localhost:8000')

    const scoreResponse = await this.tryApiScore(apiUrl, snapshot, snoozePressure, persona)
      ?? this.localScore(snapshot, snoozePressure, persona)

    this.db.insertScoreHistory(
      snapshot.timestamp,
      scoreResponse.procrastinationScore,
      scoreResponse.severity,
      scoreResponse.reasons,
      scoreResponse.recommendation as unknown as never
    )

    this.mainWindow.webContents.send(IPC_CHANNELS.interventions.onScoreUpdate, scoreResponse)

    this.maybeAutoDismiss(snapshot)
    this.maybeIntervene(snapshot, scoreResponse)
  }

  private localScore(snapshot: UsageSnapshot, snoozePressure: number, persona: PersonaId): ScoreResponse {
    const calculated = calculateScore(snapshot, snoozePressure)
    const escalated = applySnoozeEscalation(calculated.severity, snapshot.signals.snoozesLast60Min)
    const reasons = generateReasons(snapshot, calculated.procrastinationScore)

    const text = INTERVENTION_SCRIPTS[persona][escalated]
    const recommendation: Recommendation = {
      mode: getModeForSeverity(escalated),
      persona,
      text,
      tts: getDefaultTtsSettings(escalated),
      cooldownSeconds: getDefaultCooldown(escalated)
    }

    return {
      procrastinationScore: calculated.procrastinationScore,
      severity: escalated,
      reasons,
      recommendation
    }
  }

  private async tryApiScore(
    apiUrl: string,
    snapshot: UsageSnapshot,
    snoozePressure: number,
    persona: PersonaId
  ): Promise<ScoreResponse | null> {
    const url = new URL('/score', apiUrl)
    url.searchParams.set('snoozePressure', String(snoozePressure))
    url.searchParams.set('persona', persona)
    try {
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(snapshot)
      })
      if (!res.ok) return null
      const json = (await res.json()) as unknown
      return json as ScoreResponse
    } catch {
      return null
    }
  }

  private maybeIntervene(snapshot: UsageSnapshot, score: ScoreResponse): void {
    const now = Date.now()
    const threshold = this.getSettingNumber('scoreThreshold', 70)
    const cooldownSeconds = this.getSettingNumber('cooldownSeconds', 180)
    const cooldownOk = now - this.lastInterventionTs >= cooldownSeconds * 1000

    if (this.activeIntervention) return
    if (!cooldownOk) return
    if (score.procrastinationScore < threshold) return
    if (score.recommendation.mode === 'none') return

    const id = randomUUID()
    let text = score.recommendation.text
    if (score.recommendation.persona === 'tough_love') {
      text = enforceToughLove(text)
    }

    this.lastInterventionTs = now
    this.activeIntervention = { id, triggeringApp: snapshot.categories.activeApp }
    this.consecutiveCompliantSnapshots = 0

    const event = {
      id,
      timestamp: now,
      score: score.procrastinationScore,
      severity: score.severity,
      persona: score.recommendation.persona,
      text,
      userResponse: 'pending',
      audioPlayed: false
    }

    this.mainWindow.webContents.send(IPC_CHANNELS.interventions.onIntervention, event)
    this.mainWindow.webContents.send(IPC_CHANNELS.interventions.onPlayAudio, {
      id,
      text,
      persona: score.recommendation.persona,
      severity: score.severity,
      tts: score.recommendation.tts
    })
  }

  private maybeAutoDismiss(snapshot: UsageSnapshot): void {
    if (!this.activeIntervention) return

    const triggeringApp = this.activeIntervention.triggeringApp
    const switchedAway = snapshot.categories.activeApp !== triggeringApp
    const compliantCategory = snapshot.categories.activeCategory === 'productive' || snapshot.categories.activeCategory === 'neutral'

    if (switchedAway && compliantCategory) {
      this.consecutiveCompliantSnapshots += 1
    } else {
      this.consecutiveCompliantSnapshots = 0
    }

    if (this.consecutiveCompliantSnapshots >= 2) {
      const id = this.activeIntervention.id
      this.activeIntervention = null
      this.consecutiveCompliantSnapshots = 0
      this.mainWindow.webContents.send(IPC_CHANNELS.interventions.onIntervention, {
        id,
        timestamp: Date.now(),
        score: 0,
        severity: 0,
        persona: 'calm_friend',
        text: '',
        userResponse: 'dismissed',
        audioPlayed: false
      })
    }
  }
}
