import { BrowserWindow, ipcMain } from 'electron'

import { IPC_CHANNELS } from './types'

let telemetryActive = false

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
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
    return {
      onboardingComplete: false
    }
  })

  ipcMain.handle(IPC_CHANNELS.settings.update, (_event, payload: unknown) => {
    void payload
    return { ok: true }
  })

  ipcMain.handle(IPC_CHANNELS.scores.getLatest, () => {
    return null
  })

  ipcMain.on(IPC_CHANNELS.window.focusChanged, (_event, payload: unknown) => {
    // Forward focus changes to all windows except sender.
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.id === mainWindow.id) continue
      win.webContents.send(IPC_CHANNELS.window.focusChanged, payload)
    }
  })
}
