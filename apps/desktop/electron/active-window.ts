import { systemPreferences } from 'electron'
import type { Options, Result } from 'get-windows'

let cached: typeof import('get-windows') | null = null

function shouldAllowScreenRecordingPrompt(): boolean {
  if (process.platform !== 'darwin') return true
  const status = systemPreferences.getMediaAccessStatus('screen')
  return status === 'granted'
}

function shouldAllowAccessibilityPrompt(): boolean {
  if (process.platform !== 'darwin') return true
  // Do not prompt automatically; UI should request.
  return systemPreferences.isTrustedAccessibilityClient(false)
}

export async function getActiveWindow(): Promise<Result | undefined> {
  if (!cached) {
    cached = await import('get-windows')
  }

  const options: Options = {
    accessibilityPermission: shouldAllowAccessibilityPrompt(),
    screenRecordingPermission: shouldAllowScreenRecordingPrompt()
  }

  return cached.activeWindow(options)
}

