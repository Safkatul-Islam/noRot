import { BrowserWindow, ipcMain } from 'electron'

import { IPC_CHANNELS } from './types'
import { LocalDatabase } from './database'
import type { TelemetryService } from './telemetry'
import type { Orchestrator } from './orchestrator'

let didRegister = false

export function registerIpcHandlers(options: {
  mainWindow: BrowserWindow
  db: LocalDatabase
  telemetry: TelemetryService
  orchestrator: Orchestrator
}): void {
  if (didRegister) return
  didRegister = true

  const { mainWindow, db, orchestrator, telemetry } = options

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
    for (const [key, value] of Object.entries(updates)) {
      db.setSetting(key as never, value as never)
    }
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.scores.getLatest, () => {
    return db.getLatestScore()
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
    void payload
    return { ok: true }
  })

  ipcMain.on(IPC_CHANNELS.window.focusChanged, (_event, payload: unknown) => {
    // Forward focus changes to all windows except sender.
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.id === mainWindow.id) continue
      win.webContents.send(IPC_CHANNELS.window.focusChanged, payload)
    }
  })

  void telemetry
}
