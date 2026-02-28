import { BrowserWindow } from 'electron'
import {
  INTERVENTION_SCORE_THRESHOLD,
  INTERVENTION_COOLDOWN,
  INTERVENTION_CHECK_INTERVAL,
  PERSONA_CONFIGS,
  buildInterventionPrompt
} from '@norot/shared'
import type { PersonaId, Intervention } from '@norot/shared'
import * as telemetry from './telemetry'
import { getTodos, saveIntervention, getSetting } from './local-db'
import { initTts, synthesizeSpeech, isConfigured as isTtsConfigured } from './tts'
import { playAudioInRenderer } from './audio-player'

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

async function tryGetApiScript(
  score: ReturnType<typeof telemetry.getScore>,
  persona: PersonaId,
  recentApps: string[]
): Promise<string | null> {
  try {
    const response = await fetch('http://localhost:8000/intervention', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: score.score,
        severity: score.severity,
        persona,
        topDistraction: score.topDistraction,
        distractionRatio: score.distractionRatio,
        switchRate: score.switchRate,
        recentApps,
        minutesMonitored: score.minutesMonitored
      }),
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      console.warn(`[intervention-engine] API returned ${response.status}, using local fallback`)
      return null
    }

    const data = (await response.json()) as { script?: string }
    return data.script || null
  } catch (err) {
    console.warn('[intervention-engine] API call failed, using local fallback:', err)
    return null
  }
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

  // Step 1: Try API endpoint for Gemini-generated script, fallback to local prompt
  let script = await tryGetApiScript(score, persona, recentApps)
  if (!script) {
    script = buildInterventionPrompt(score, persona, todos, recentApps)
  }

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

  // Step 2: TTS audio — initialize if needed and synthesize speech
  const elevenLabsApiKey = getSetting<string>('elevenLabsApiKey')
  if (elevenLabsApiKey && !isTtsConfigured()) {
    initTts(elevenLabsApiKey)
  }

  if (isTtsConfigured()) {
    const personaConfig = PERSONA_CONFIGS[persona]
    const audioBuffer = await synthesizeSpeech(script, personaConfig.voiceId)
    if (audioBuffer && mainWindowRef && !mainWindowRef.isDestroyed()) {
      playAudioInRenderer(mainWindowRef, audioBuffer)
    }
  }
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
