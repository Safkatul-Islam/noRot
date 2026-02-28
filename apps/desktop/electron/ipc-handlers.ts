import { BrowserWindow, ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'

import type { PersonaId, TTSSettings } from '@norot/shared'
import { PERSONAS } from '@norot/shared'

import { IPC_CHANNELS } from './types'
import { LocalDatabase } from './database'
import type { TelemetryService } from './telemetry'
import type { Orchestrator } from './orchestrator'
import type { TodoOverlayManager } from './todo-overlay'
import { getPermissionsStatus, requestPermissions } from './permissions'
import { clearGeminiCache, extractTodosWithGemini, streamGeminiChat } from './gemini'
import { getElevenLabsConversationToken, getElevenLabsSignedUrl, synthesizeElevenLabsTts } from './elevenlabs'

let didRegister = false

export function registerIpcHandlers(options: {
  mainWindow: BrowserWindow
  db: LocalDatabase
  telemetry: TelemetryService
  orchestrator: Orchestrator
  todoOverlay: TodoOverlayManager
}): void {
  if (didRegister) return
  didRegister = true

  const { mainWindow, db, orchestrator, todoOverlay } = options

  ipcMain.handle(IPC_CHANNELS.telemetry.start, () => {
    orchestrator.startTelemetry()
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.telemetry.stop, () => {
    orchestrator.stopTelemetry()
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.telemetry.isActive, () => ({ active: orchestrator.isTelemetryActive() }))

  ipcMain.handle(IPC_CHANNELS.settings.get, () => {
    return db.getAllSettings()
  })

  ipcMain.handle(IPC_CHANNELS.settings.update, (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') return { ok: false }
    const updates = payload as Record<string, unknown>
    const existingKeys = new Set(Object.keys(db.getAllSettings()))

    const beforeGeminiKey = db.getSetting<string>('geminiKey')
    const beforeElevenLabsKey = db.getSetting<string>('elevenLabsApiKey')

    const requestedPersona = updates.persona
    const requestedToughLoveEnabled = updates.toughLoveEnabled
    const currentToughLoveEnabled = db.getSetting<boolean>('toughLoveEnabled')
    if (
      requestedPersona === 'tough_love'
      && requestedToughLoveEnabled !== true
      && currentToughLoveEnabled !== true
    ) {
      return { ok: false, error: { code: 'tough_love_disabled', message: 'Enable tough love explicitly before selecting it.' } }
    }

    for (const [key, value] of Object.entries(updates)) {
      if (!existingKeys.has(key)) continue
      db.setSetting(key as never, value as never)
    }

    const afterGeminiKey = db.getSetting<string>('geminiKey')
    const afterElevenLabsKey = db.getSetting<string>('elevenLabsApiKey')
    if (beforeGeminiKey !== afterGeminiKey) {
      clearGeminiCache()
    }
    if (beforeElevenLabsKey !== afterElevenLabsKey) {
      // Placeholder for future ElevenLabs agent cache clearing.
    }

    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.scores.getLatest, () => {
    return db.getLatestScore()
  })

  ipcMain.handle(IPC_CHANNELS.scores.getUsageHistory, (_event, payload: unknown) => {
    const limit = (payload && typeof payload === 'object' && typeof (payload as { limit?: unknown }).limit === 'number')
      ? (payload as { limit: number }).limit
      : 200
    return db.getScoreHistory(Math.max(1, Math.min(1000, limit)))
  })

  ipcMain.handle(IPC_CHANNELS.scores.getAppStats, (_event, payload: unknown) => {
    const minutes = (payload && typeof payload === 'object' && typeof (payload as { minutes?: unknown }).minutes === 'number')
      ? (payload as { minutes: number }).minutes
      : 60
    return db.getAppStats(Math.max(1, Math.min(24 * 60, minutes)))
  })

  ipcMain.handle(IPC_CHANNELS.scores.getWins, () => {
    return db.getWinsData()
  })

  ipcMain.handle(IPC_CHANNELS.todos.list, () => db.listTodos())

  ipcMain.handle(IPC_CHANNELS.todos.create, (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload')
    const { text } = payload as { text?: unknown }
    if (typeof text !== 'string' || text.trim().length === 0) throw new Error('Todo text required')
    const todo = db.addTodo(text.trim())
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNELS.todos.onUpdated, { todos: db.listTodos() })
    }
    return todo
  })

  ipcMain.handle(IPC_CHANNELS.todos.update, (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload')
    const { id, patch } = payload as { id?: unknown; patch?: unknown }
    if (typeof id !== 'number' || !patch || typeof patch !== 'object') throw new Error('Invalid update')
    const todo = db.updateTodo(id, patch as never)
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNELS.todos.onUpdated, { todos: db.listTodos() })
    }
    return todo
  })

  ipcMain.handle(IPC_CHANNELS.todos.delete, (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload')
    const { id } = payload as { id?: unknown }
    if (typeof id !== 'number') throw new Error('Invalid id')
    db.deleteTodo(id)
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNELS.todos.onUpdated, { todos: db.listTodos() })
    }
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.todos.extract, async (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload')
    const transcript = (payload as { transcript?: unknown }).transcript
    if (typeof transcript !== 'string' || transcript.trim().length === 0) {
      return { todos: [] as const }
    }
    const apiKey = db.getSetting<string>('geminiKey')
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throwStructuredError({ code: 'missing_gemini_key', message: 'Gemini API key is not configured.' })
    }
    const todos = await extractTodosWithGemini({ apiKey, transcript, nowMs: Date.now() })
    return { todos }
  })

  ipcMain.handle(IPC_CHANNELS.interventions.respond, (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload')
    const { id, response } = payload as { id?: unknown; response?: unknown }
    if (typeof id !== 'string') throw new Error('Invalid id')
    if (response !== 'snoozed' && response !== 'dismissed' && response !== 'working') {
      throw new Error('Invalid response')
    }
    orchestrator.respondToIntervention(id, response)
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.interventions.testIntervention, (_event, payload: unknown) => {
    void payload
    const now = Date.now()
    mainWindow.webContents.send(IPC_CHANNELS.interventions.onIntervention, {
      id: 'test',
      timestamp: now,
      score: 90,
      severity: 4,
      persona: 'coach',
      text: 'Test intervention',
      userResponse: 'pending',
      audioPlayed: false
    })
    mainWindow.webContents.send(IPC_CHANNELS.interventions.onPlayAudio, {
      id: 'test',
      text: 'Test intervention',
      persona: 'coach',
      severity: 4,
      tts: { model: 'eleven_turbo_v2', stability: 55, speed: 0.98 }
    })
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.interventions.reportAudioPlayed, (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload')
    const { id } = payload as { id?: unknown }
    if (typeof id !== 'string') throw new Error('Invalid id')
    db.markInterventionAudioPlayed(id)
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.permissions.getStatus, async () => {
    return await getPermissionsStatus()
  })

  ipcMain.handle(IPC_CHANNELS.permissions.request, async () => {
    return await requestPermissions()
  })

  ipcMain.handle(IPC_CHANNELS.todoOverlay.open, () => {
    todoOverlay.show()
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.todoOverlay.close, () => {
    todoOverlay.hide()
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.todoOverlay.isOpen, () => ({ open: todoOverlay.isOpen() }))

  ipcMain.on(IPC_CHANNELS.voice.statusBroadcast, (event, payload: unknown) => {
    const senderId = event.sender.id
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.webContents.id === senderId) continue
      win.webContents.send(IPC_CHANNELS.voice.statusBroadcast, payload)
    }
  })

  ipcMain.handle(IPC_CHANNELS.voice.openVoiceChat, (_event, payload: unknown) => {
    const mode = payload && typeof payload === 'object' ? (payload as { mode?: unknown }).mode : undefined
    if (mode !== 'coach' && mode !== 'checkin') throw new Error('Invalid mode')
    if (!mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send(IPC_CHANNELS.voice.onVoiceChatOpen, { mode })
    }
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.voice.ensureVoiceAgent, async (_event, payload: unknown) => {
    return await ensureVoiceAgent(db, payload, 'voiceAgentId')
  })

  ipcMain.handle(IPC_CHANNELS.voice.ensureCheckinAgent, async (_event, payload: unknown) => {
    return await ensureVoiceAgent(db, payload, 'checkinAgentId')
  })

  ipcMain.handle(IPC_CHANNELS.elevenlabs.synthesizeTts, async (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload')
    const { text, persona, tts } = payload as { text?: unknown; persona?: unknown; tts?: unknown }
    if (typeof text !== 'string' || text.trim().length === 0) throw new Error('Invalid text')
    const personaId = parsePersona(persona)
    const ttsSettings = parseTtsSettings(tts)
    const apiKey = db.getSetting<string>('elevenLabsApiKey')
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throwStructuredError({ code: 'missing_elevenlabs_key', message: 'ElevenLabs API key is not configured.' })
    }
    const apiKeyTrimmed = apiKey.trim()
    const voiceId = PERSONAS[personaId].voiceId
    const stability01 = Math.max(0, Math.min(1, ttsSettings.stability / 100))
    return await synthesizeElevenLabsTts({
      apiKey: apiKeyTrimmed,
      voiceId,
      text: text.trim(),
      modelId: ttsSettings.model,
      stability: stability01
    })
  })

  ipcMain.handle(IPC_CHANNELS.chat.stream, async (event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload')
    const message = (payload as { message?: unknown }).message
    const sessionId = (payload as { sessionId?: unknown }).sessionId
    if (typeof message !== 'string' || message.trim().length === 0) throw new Error('Invalid message')

    const apiKey = db.getSetting<string>('geminiKey')
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throwStructuredError({ code: 'missing_gemini_key', message: 'Gemini API key is not configured.' })
    }

    const resolvedSessionId = typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : randomUUID()

    void (async () => {
      try {
        await streamGeminiChat(
          { apiKey, sessionId: resolvedSessionId, message: message.trim() },
          (delta) => event.sender.send(IPC_CHANNELS.chat.onToken, { sessionId: resolvedSessionId, delta })
        )
        event.sender.send(IPC_CHANNELS.chat.onDone, { sessionId: resolvedSessionId })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        event.sender.send(IPC_CHANNELS.chat.onError, { sessionId: resolvedSessionId, message: msg })
      }
    })()

    return { sessionId: resolvedSessionId }
  })
}

function parsePersona(value: unknown): PersonaId {
  if (value === 'calm_friend' || value === 'coach' || value === 'tough_love') return value
  return 'calm_friend'
}

function parseTtsSettings(value: unknown): TTSSettings {
  if (!value || typeof value !== 'object') {
    return { model: 'eleven_turbo_v2', stability: 45, speed: 1.0 }
  }
  const model = (value as { model?: unknown }).model
  const stability = (value as { stability?: unknown }).stability
  const speed = (value as { speed?: unknown }).speed
  return {
    model: typeof model === 'string' && model.trim() ? model : 'eleven_turbo_v2',
    stability: typeof stability === 'number' && Number.isFinite(stability) ? stability : 45,
    speed: typeof speed === 'number' && Number.isFinite(speed) ? speed : 1.0
  }
}

async function ensureVoiceAgent(
  db: LocalDatabase,
  payload: unknown,
  idKey: 'voiceAgentId' | 'checkinAgentId'
): Promise<{ agentId: string; conversationToken?: string; signedUrl?: string }> {
  const connectionType = payload && typeof payload === 'object'
    ? (payload as { connectionType?: unknown }).connectionType
    : undefined
  const type = connectionType === 'websocket' ? 'websocket' : 'webrtc'

  const apiKey = db.getSetting<string>('elevenLabsApiKey')
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throwStructuredError({ code: 'missing_elevenlabs_key', message: 'ElevenLabs API key is not configured.' })
  }
  const apiKeyTrimmed = apiKey.trim()

  const agentId = db.getSetting<string>(idKey)
  if (typeof agentId !== 'string' || agentId.trim().length === 0) {
    throwStructuredError({
      code: 'missing_agent_id',
      message: `Missing ${idKey}. Create an agent in ElevenLabs UI and paste the agent ID into Settings.`
    })
  }
  const agentIdTrimmed = agentId.trim()

  if (type === 'websocket') {
    const signedUrl = await getElevenLabsSignedUrl({ apiKey: apiKeyTrimmed, agentId: agentIdTrimmed })
    return { agentId: agentIdTrimmed, signedUrl }
  }

  const conversationToken = await getElevenLabsConversationToken({ apiKey: apiKeyTrimmed, agentId: agentIdTrimmed })
  return { agentId: agentIdTrimmed, conversationToken }
}

function throwStructuredError(payload: { code: string; message: string }): never {
  throw new Error(JSON.stringify(payload))
}
