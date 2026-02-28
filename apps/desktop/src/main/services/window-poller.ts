import { POLL_INTERVAL } from '@norot/shared'

interface ActiveWindow {
  title: string
  owner: { name: string; path: string }
}

let pollInterval: ReturnType<typeof setInterval> | null = null
let onWindowChange: ((win: ActiveWindow | null) => void) | null = null

export function startPolling(callback: (win: ActiveWindow | null) => void): void {
  onWindowChange = callback
  pollInterval = setInterval(async () => {
    try {
      const getWindows = await import('get-windows')
      const win = await getWindows.activeWindow()
      if (win && onWindowChange) {
        onWindowChange({
          title: win.title,
          owner: { name: win.owner.name, path: win.owner.path }
        })
      }
    } catch {
      // Window detection can fail transiently
    }
  }, POLL_INTERVAL)
}

export function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  onWindowChange = null
}

export function isPolling(): boolean {
  return pollInterval !== null
}
