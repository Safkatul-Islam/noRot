import { BrowserWindow, ipcMain } from 'electron'

import { IPC_CHANNELS } from './types'
import { LocalDatabase } from './database'

let telemetryActive = false
let didRegister = false

export function registerIpcHandlers(options: { mainWindow: BrowserWindow; db: LocalDatabase }): void {
  if (didRegister) return
  didRegister = true

  const { mainWindow, db } = options

  ipcMain.handle(IPC_CHANNELS.telemetry.start, () => {
    telemetryActive = true
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.telemetry.stop, () => {
    telemetryActive = false
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.telemetry.isActive, () => ({ active: telemetryActive }))

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

  ipcMain.on(IPC_CHANNELS.window.focusChanged, (_event, payload: unknown) => {
    // Forward focus changes to all windows except sender.
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.id === mainWindow.id) continue
      win.webContents.send(IPC_CHANNELS.window.focusChanged, payload)
    }
  })
}
