import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron'

import { SEVERITY_BANDS } from '@norot/shared'
import type { ActiveCategory, Severity } from '@norot/shared'

export interface TrayState {
  paused: boolean
  severity: Severity
  activeApp: string | null
  activeDomain: string | null
  activeCategory: ActiveCategory | null
}

const COLOR_MAP: Record<string, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#a855f7'
} as const

const PAUSED_COLOR = '#9ca3af'

export class TrayManager {
  private readonly tray: Tray
  private readonly window: BrowserWindow
  private state: TrayState = { paused: true, severity: 0, activeApp: null, activeDomain: null, activeCategory: null }

  constructor(window: BrowserWindow) {
    this.window = window
    this.tray = new Tray(nativeImage.createEmpty())
    this.tray.setToolTip('noRot')
    this.tray.on('click', () => this.toggleWindow())
    this.render()
  }

  update(next: Partial<TrayState>): void {
    this.state = { ...this.state, ...next }
    this.render()
  }

  destroy(): void {
    this.tray.destroy()
  }

  private toggleWindow(): void {
    if (this.window.isDestroyed()) return
    if (this.window.isVisible()) this.window.hide()
    else this.window.show()
    this.render()
  }

  private render(): void {
    const icon = this.renderIcon()
    this.tray.setImage(icon)
    this.tray.setContextMenu(this.renderMenu())
  }

  private renderIcon() {
    const band = SEVERITY_BANDS.find(b => b.severity === this.state.severity) ?? SEVERITY_BANDS[0]
    const color = this.state.paused ? PAUSED_COLOR : (COLOR_MAP[band.color] ?? PAUSED_COLOR)

    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">`,
      `<circle cx="16" cy="16" r="10" fill="${color}"/>`,
      `</svg>`
    ].join('')

    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`
    const image = nativeImage.createFromDataURL(dataUrl)
    if (process.platform === 'darwin') {
      return image.resize({ width: 16, height: 16 })
    }
    return image
  }

  private renderMenu(): Menu {
    const band = SEVERITY_BANDS.find(b => b.severity === this.state.severity) ?? SEVERITY_BANDS[0]
    const statusLabel = this.state.paused ? 'Paused' : band.label

    const domain = this.state.activeDomain ? ` — ${this.state.activeDomain}` : ''
    const category = this.state.activeCategory ? ` (${this.state.activeCategory})` : ''
    const appLine = this.state.activeApp ? `${this.state.activeApp}${domain}${category}` : 'No active window'

    const showHideLabel = this.window.isVisible() ? 'Hide noRot' : 'Show noRot'

    return Menu.buildFromTemplate([
      { label: `Status: ${statusLabel}`, enabled: false },
      { label: appLine, enabled: false },
      { type: 'separator' },
      { label: showHideLabel, click: () => this.toggleWindow() },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit()
        }
      }
    ])
  }
}
