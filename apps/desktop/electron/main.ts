import { app, BrowserWindow, nativeImage, shell, Tray, Menu } from 'electron'
import { join } from 'node:path'

import { IPC_CHANNELS } from './types'
import { registerIpcHandlers } from './ipc-handlers'
import { LocalDatabase } from './database'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let focusDebounce: NodeJS.Timeout | null = null
let db: LocalDatabase | null = null

function getArgValue(prefix: string): string | null {
  const match = process.argv.find(arg => arg.startsWith(prefix))
  if (!match) return null
  const [, value] = match.split('=', 2)
  return value ?? null
}

function resolveRendererUrl(): string | null {
  return getArgValue('--renderer-url') ?? process.env.ELECTRON_RENDERER_URL ?? null
}

function createTray(window: BrowserWindow): void {
  if (tray) return
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('noRot')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show noRot', click: () => window.show() },
      { label: 'Hide noRot', click: () => window.hide() },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])
  )
  tray.on('click', () => window.isVisible() ? window.hide() : window.show())
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
  registerIpcHandlers({ mainWindow, db: openedDb })
  createTray(mainWindow)

  app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      return
    }
    mainWindow = createMainWindow()
    if (!db) {
      db = LocalDatabase.open()
    }
    registerIpcHandlers({ mainWindow, db })
    createTray(mainWindow)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
