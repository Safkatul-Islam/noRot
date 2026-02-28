import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron'
import type { Severity } from '@norot/shared'

let tray: Tray | null = null
let mainWindowRef: BrowserWindow | null = null
let isPaused = false

const SEVERITY_COLORS: Record<Severity, string> = {
  chill: '#22c55e',    // green
  warning: '#eab308',  // yellow
  danger: '#f97316',   // orange
  critical: '#ef4444'  // red
}

function createTrayIcon(color: string): Electron.NativeImage {
  // Create a 16x16 colored circle as a tray icon using raw pixel data
  const size = 16
  const canvas = Buffer.alloc(size * size * 4) // RGBA

  // Parse hex color
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = size / 2
      const cy = size / 2
      const radius = size / 2 - 1
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      const idx = (y * size + x) * 4

      if (dist <= radius) {
        canvas[idx] = r       // R
        canvas[idx + 1] = g   // G
        canvas[idx + 2] = b   // B
        canvas[idx + 3] = 255 // A (opaque)
      } else {
        canvas[idx] = 0
        canvas[idx + 1] = 0
        canvas[idx + 2] = 0
        canvas[idx + 3] = 0 // transparent
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size })
}

function buildContextMenu(severity: Severity, score: number): Electron.Menu {
  const window = mainWindowRef

  return Menu.buildFromTemplate([
    {
      label: `noRot — Score: ${score} (${severity})`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: window?.isVisible() ? 'Hide Window' : 'Show Window',
      click: (): void => {
        if (!window) return
        if (window.isVisible()) {
          window.hide()
        } else {
          window.show()
          window.focus()
        }
      }
    },
    {
      label: isPaused ? 'Resume Monitoring' : 'Pause Monitoring',
      click: (): void => {
        isPaused = !isPaused
        if (window) {
          window.webContents.send(isPaused ? 'monitoring-paused' : 'monitoring-resumed')
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit noRot',
      click: (): void => {
        app.quit()
      }
    }
  ])
}

export function createTray(mainWindow: BrowserWindow): Tray {
  mainWindowRef = mainWindow
  const icon = createTrayIcon(SEVERITY_COLORS.chill)

  tray = new Tray(icon)
  tray.setToolTip('noRot — Procrastination Monitor')
  tray.setContextMenu(buildContextMenu('chill', 0))

  tray.on('click', () => {
    if (!mainWindowRef) return
    if (mainWindowRef.isVisible()) {
      mainWindowRef.focus()
    } else {
      mainWindowRef.show()
      mainWindowRef.focus()
    }
  })

  return tray
}

export function updateTray(severity: Severity, score: number): void {
  if (!tray) return

  const color = SEVERITY_COLORS[severity]
  const icon = createTrayIcon(color)

  tray.setImage(icon)
  tray.setToolTip(`noRot — Score: ${score}/100 (${severity})`)
  tray.setContextMenu(buildContextMenu(severity, score))
}

export function updateTrayIcon(severity: Severity): void {
  if (!tray) return
  const color = SEVERITY_COLORS[severity]
  tray.setImage(createTrayIcon(color))
}

export function getIsPaused(): boolean {
  return isPaused
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
  mainWindowRef = null
}
