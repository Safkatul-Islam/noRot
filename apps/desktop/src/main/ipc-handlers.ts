import { ipcMain, BrowserWindow } from 'electron'
import type { AppStats, AppCategory } from '@norot/shared'
import { classifyApp } from '@norot/shared'
import * as telemetry from './services/telemetry'
import * as localDb from './services/local-db'
import * as windowPoller from './services/window-poller'
import { setCooldown } from './services/intervention-engine'

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // ── Score & Activity ────────────────────────────────────────────────────

  ipcMain.handle('get-score', () => {
    return telemetry.getScore()
  })

  ipcMain.handle('get-activities', () => {
    return telemetry.getActivities()
  })

  ipcMain.handle('get-app-stats', () => {
    const activities = telemetry.getActivities()
    const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0)

    // Aggregate by app
    const appMap = new Map<
      string,
      { category: AppCategory; totalSeconds: number; switches: number }
    >()

    for (let i = 0; i < activities.length; i++) {
      const a = activities[i]
      const existing = appMap.get(a.app)

      if (existing) {
        existing.totalSeconds += a.duration
      } else {
        const { category } = classifyApp(a.app, a.title)
        appMap.set(a.app, {
          category,
          totalSeconds: a.duration,
          switches: 0
        })
      }

      // Count switches: when current app differs from previous
      if (i > 0 && activities[i].app !== activities[i - 1].app) {
        const entry = appMap.get(a.app)
        if (entry) entry.switches++
      }
    }

    const stats: AppStats[] = []
    for (const [app, data] of appMap) {
      stats.push({
        app,
        category: data.category,
        totalSeconds: data.totalSeconds,
        percentage: totalDuration > 0
          ? Math.round((data.totalSeconds / totalDuration) * 1000) / 10
          : 0,
        switches: data.switches
      })
    }

    // Sort by total time descending
    stats.sort((a, b) => b.totalSeconds - a.totalSeconds)

    return stats
  })

  // ── Interventions ───────────────────────────────────────────────────────

  ipcMain.handle('get-interventions', () => {
    return localDb.getInterventions()
  })

  // ── Todos ─────────────────────────────────────────────────────────────

  ipcMain.handle('get-todos', () => {
    return localDb.getTodos()
  })

  ipcMain.handle('add-todo', (_event, text: string) => {
    return localDb.addTodo(text)
  })

  ipcMain.handle('toggle-todo', (_event, id: number) => {
    localDb.toggleTodo(id)
  })

  ipcMain.handle('delete-todo', (_event, id: number) => {
    localDb.deleteTodo(id)
  })

  // ── Wins ──────────────────────────────────────────────────────────────

  ipcMain.handle('get-wins', () => {
    return localDb.getWins()
  })

  // ── Settings ──────────────────────────────────────────────────────────

  ipcMain.handle('get-settings', () => {
    return localDb.getAllSettings()
  })

  ipcMain.handle('update-settings', (_event, settings: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(settings)) {
      localDb.setSetting(key, value)
    }
  })

  // ── Intervention Responses ────────────────────────────────────────────

  ipcMain.handle('snooze', (_event, _minutes: number) => {
    telemetry.incrementSnooze()
    setCooldown()
  })

  ipcMain.handle('dismiss-intervention', () => {
    // Dismissal is already logged when the intervention was saved.
    // This handler just acknowledges the dismissal from the renderer.
    setCooldown()
  })

  ipcMain.handle('commit-to-work', () => {
    telemetry.resetSnooze()
    setCooldown()
  })

  // ── Monitoring Controls ───────────────────────────────────────────────

  ipcMain.handle('start-monitoring', () => {
    if (!windowPoller.isPolling()) {
      windowPoller.startPolling((win) => {
        if (win) {
          telemetry.recordWindow(win.owner.name, win.title)
        }
      })
    }
  })

  ipcMain.handle('stop-monitoring', () => {
    windowPoller.stopPolling()
  })

  // ── Window Controls ───────────────────────────────────────────────────

  ipcMain.handle('minimize-window', () => {
    mainWindow.minimize()
  })

  ipcMain.handle('maximize-window', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.handle('close-window', () => {
    mainWindow.close()
  })
}
