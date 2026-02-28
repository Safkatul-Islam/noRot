import { BrowserWindow } from 'electron'
import { join } from 'node:path'

export class TodoOverlayManager {
  private overlay: BrowserWindow | null = null
  private dragging = false
  private dragTimer: NodeJS.Timeout | null = null

  constructor(private readonly getRendererUrl: () => string | null) {}

  ensureCreated(): BrowserWindow {
    if (this.overlay && !this.overlay.isDestroyed()) return this.overlay

    const win = new BrowserWindow({
      width: 360,
      height: 520,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      resizable: true,
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    })

    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    const rendererUrl = this.getRendererUrl()
    if (rendererUrl) {
      void win.loadURL(`${rendererUrl}#todo-overlay`)
    } else {
      void win.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'todo-overlay' })
    }

    win.on('will-move', () => this.markDragging())
    win.on('will-resize', () => this.markDragging())

    this.overlay = win
    return win
  }

  private markDragging(): void {
    this.dragging = true
    if (this.dragTimer) clearTimeout(this.dragTimer)
    this.dragTimer = setTimeout(() => {
      this.dragging = false
      this.dragTimer = null
    }, 400)
  }

  isOpen(): boolean {
    return !!this.overlay && !this.overlay.isDestroyed() && this.overlay.isVisible()
  }

  show(): void {
    const win = this.ensureCreated()
    if (this.dragging) return
    win.showInactive()
  }

  hide(): void {
    if (!this.overlay || this.overlay.isDestroyed()) return
    this.overlay.hide()
  }

  toggle(): void {
    if (this.isOpen()) this.hide()
    else this.show()
  }

  destroy(): void {
    if (!this.overlay || this.overlay.isDestroyed()) return
    this.overlay.destroy()
    this.overlay = null
  }
}

