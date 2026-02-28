import { BrowserWindow } from 'electron'
import {
  INTERVENTION_SCORE_THRESHOLD,
  INTERVENTION_COOLDOWN,
  INTERVENTION_CHECK_INTERVAL,
  buildInterventionPrompt
} from '@norot/shared'
import type { PersonaId, Intervention } from '@norot/shared'
import * as telemetry from './telemetry'
import { getTodos, saveIntervention, getSetting } from './local-db'

let checkInterval: ReturnType<typeof setInterval> | null = null
let lastInterventionTime = 0
let mainWindowRef: BrowserWindow | null = null

function isCooldownElapsed(): boolean {
  return Date.now() - lastInterventionTime >= INTERVENTION_COOLDOWN
}

export function setCooldown(): void {
  lastInterventionTime = Date.now()
}

export function resetCooldown(): void {
  lastInterventionTime = 0
}

async function triggerIntervention(): Promise<void> {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return

  const score = telemetry.getScore()

  if (score.score < INTERVENTION_SCORE_THRESHOLD) return
  if (!isCooldownElapsed()) return

  // Get persona from settings, default to chill_friend
  const persona = getSetting<PersonaId>('persona') || 'chill_friend'
  const todos = getTodos()
  const recentApps = telemetry.getRecentApps(5)

  // Build the intervention prompt
  const script = buildInterventionPrompt(score, persona, todos, recentApps)

  // Record this intervention
  const intervention: Intervention = {
    timestamp: Date.now(),
    score: score.score,
    severity: score.severity,
    script,
    persona,
    snoozed: false,
    dismissed: false,
    committedToWork: false
  }

  const interventionId = saveIntervention(intervention)

  // Set cooldown so we don't spam
  setCooldown()

  // Send to renderer for display
  mainWindowRef.webContents.send('intervention', {
    id: interventionId,
    score: score.score,
    severity: score.severity,
    script,
    persona,
    topDistraction: score.topDistraction,
    distractionRatio: score.distractionRatio
  })
}

export function startInterventionEngine(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow

  if (checkInterval) {
    clearInterval(checkInterval)
  }

  checkInterval = setInterval(() => {
    triggerIntervention().catch((err) => {
      console.error('[intervention-engine] Error during intervention check:', err)
    })
  }, INTERVENTION_CHECK_INTERVAL)
}

export function stopInterventionEngine(): void {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
  mainWindowRef = null
}
