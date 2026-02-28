import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'

import { IPC_CHANNELS } from './types'
import { registerIpcHandlers } from './ipc-handlers'
import { LocalDatabase } from './database'
import { TelemetryService } from './telemetry'
import { Orchestrator } from './orchestrator'
import type { CategoryRule, WorkOverride } from './database'
import { TodoOverlayManager } from './todo-overlay'
import { TrayManager } from './tray'

let mainWindow: BrowserWindow | null = null
let trayManager: TrayManager | null = null
let isQuitting = false
let focusDebounce: NodeJS.Timeout | null = null
let db: LocalDatabase | null = null
let telemetry: TelemetryService | null = null
let orchestrator: Orchestrator | null = null
let todoOverlay: TodoOverlayManager | null = null

function toDateKey(date: Date): string {
  const yyyy = String(date.getFullYear())
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getArgValue(prefix: string): string | null {
  const match = process.argv.find(arg => arg.startsWith(prefix))
  if (!match) return null
  const [, value] = match.split('=', 2)
  return value ?? null
}

function resolveRendererUrl(): string | null {
  return (
    getArgValue('--renderer-url')
    ?? process.env.VITE_DEV_SERVER_URL
    ?? process.env.ELECTRON_RENDERER_URL
    ?? null
  )
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0b0b10',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  })

  window.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const rendererUrl = resolveRendererUrl()
  if (rendererUrl) {
    void window.loadURL(rendererUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  window.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    window.hide()
  })

  window.on('show', () => {
    window.webContents.send(IPC_CHANNELS.window.shown, { shown: true })
    window.webContents.invalidate()
  })

  const broadcastFocus = (isFocused: boolean) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNELS.window.focusChanged, { isFocused })
    }
  }

  const scheduleFocusBroadcast = (isFocused: boolean) => {
    if (focusDebounce) clearTimeout(focusDebounce)
    focusDebounce = setTimeout(() => broadcastFocus(isFocused), 150)
  }

  window.on('focus', () => scheduleFocusBroadcast(true))
  window.on('blur', () => scheduleFocusBroadcast(false))

  return window
}

app.on('before-quit', () => {
  isQuitting = true
})

app.whenReady().then(() => {
  const openedDb = LocalDatabase.open()
  db = openedDb
  mainWindow = createMainWindow()

  telemetry = new TelemetryService({
    getRules: () => (openedDb.getSetting<CategoryRule[]>('categoryRules') ?? []),
    getWorkOverrides: () => (openedDb.getSetting<WorkOverride[]>('workOverrides') ?? [])
  })

  trayManager = new TrayManager(mainWindow)

  orchestrator = new Orchestrator({ db: openedDb, telemetry, mainWindow, tray: trayManager })
  orchestrator.start()

  todoOverlay = new TodoOverlayManager(resolveRendererUrl)
  registerIpcHandlers({ mainWindow, db: openedDb, telemetry, orchestrator, todoOverlay })

  if (orchestrator.shouldAutoStartTelemetry()) {
    orchestrator.startTelemetry()
  }

  const shouldAutoCreateOverlay = () => {
    const onboarding = openedDb.getSetting<boolean>('onboardingComplete')
    const daily = openedDb.getSetting<string | null>('dailySetupDate')
    const autoShow = openedDb.getSetting<boolean>('autoShowTodoOverlay')
    const today = toDateKey(new Date())
    return onboarding && daily === today && autoShow !== false
  }

  if (shouldAutoCreateOverlay()) {
    todoOverlay.ensureCreated()
  }

  mainWindow.on('focus', () => todoOverlay?.hide())
  mainWindow.on('blur', () => {
    if (openedDb.getSetting<boolean>('autoShowTodoOverlay') !== false) {
      todoOverlay?.show()
    }
  })

  app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      return
    }
    mainWindow = createMainWindow()
    if (trayManager) {
      trayManager.destroy()
      trayManager = null
    }
    trayManager = new TrayManager(mainWindow)
    if (!db) {
      db = LocalDatabase.open()
    }
    if (!telemetry) {
      telemetry = new TelemetryService({
        getRules: () => (db?.getSetting<CategoryRule[]>('categoryRules') ?? []),
        getWorkOverrides: () => (db?.getSetting<WorkOverride[]>('workOverrides') ?? [])
      })
    }
    if (!orchestrator && telemetry) {
      orchestrator = new Orchestrator({ db, telemetry, mainWindow, tray: trayManager })
      orchestrator.start()
    }
    if (!todoOverlay) {
      todoOverlay = new TodoOverlayManager(resolveRendererUrl)
    }
    registerIpcHandlers({ mainWindow, db, telemetry: telemetry!, orchestrator: orchestrator!, todoOverlay })
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
