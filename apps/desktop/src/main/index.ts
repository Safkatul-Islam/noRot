import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { initDb } from './services/local-db'
import { registerIpcHandlers } from './ipc-handlers'
import { createTray, updateTray, destroyTray } from './services/tray'
import { startPolling, stopPolling } from './services/window-poller'
import * as telemetry from './services/telemetry'
import {
  startInterventionEngine,
  stopInterventionEngine
} from './services/intervention-engine'
import { logActivity } from './services/local-db'
import { classifyApp } from '@norot/shared'

const TRAY_UPDATE_INTERVAL = 5000 // Update tray every 5 seconds
let trayUpdateTimer: ReturnType<typeof setInterval> | null = null

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 420,
    height: 720,
    frame: false,
    transparent: true,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  // Initialize the database first
  initDb()

  // Create the main window
  const mainWindow = createWindow()

  // Register IPC handlers
  registerIpcHandlers(mainWindow)

  // Create the system tray
  createTray(mainWindow)

  // Start window polling with telemetry recording
  let lastApp: string | null = null
  let lastAppStart: number = Date.now()

  startPolling((win) => {
    if (!win) return

    const appName = win.owner.name
    const title = win.title

    // Record to in-memory telemetry
    telemetry.recordWindow(appName, title)

    // Persist to database when the active app changes
    if (appName !== lastApp) {
      if (lastApp) {
        const duration = Math.round((Date.now() - lastAppStart) / 1000)
        if (duration > 0) {
          const { category } = classifyApp(lastApp, '')
          logActivity({
            timestamp: lastAppStart,
            app: lastApp,
            title: '',
            category,
            duration
          })
        }
      }
      lastApp = appName
      lastAppStart = Date.now()
    }

    // Send periodic score updates to the renderer
    const score = telemetry.getScore()
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('score-update', score.score)
    }
  })

  // Start the intervention engine
  startInterventionEngine(mainWindow)

  // Periodically update the tray icon based on current score
  trayUpdateTimer = setInterval(() => {
    const score = telemetry.getScore()
    updateTray(score.severity, score.score)
  }, TRAY_UPDATE_INTERVAL)

  // macOS: re-create window when dock icon is clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  // Clean up all timers and resources
  stopPolling()
  stopInterventionEngine()
  destroyTray()

  if (trayUpdateTimer) {
    clearInterval(trayUpdateTimer)
    trayUpdateTimer = null
  }
})
