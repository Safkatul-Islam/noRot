import { shell, systemPreferences } from 'electron'

import { getActiveWindow } from './active-window'

export type ScreenRecordingStatus = 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown'

export interface PermissionsStatus {
  screenRecording: ScreenRecordingStatus
  accessibilityTrusted: boolean
  canReadActiveWindow: boolean
}

function getScreenRecordingStatus(): ScreenRecordingStatus {
  if (process.platform !== 'darwin') return 'granted'
  const status = systemPreferences.getMediaAccessStatus('screen')
  if (
    status === 'not-determined'
    || status === 'granted'
    || status === 'denied'
    || status === 'restricted'
    || status === 'unknown'
  ) {
    return status
  }
  return 'unknown'
}

function getAccessibilityTrusted(): boolean {
  if (process.platform !== 'darwin') return true
  return systemPreferences.isTrustedAccessibilityClient(false)
}

export async function getPermissionsStatus(): Promise<PermissionsStatus> {
  const screenRecording = getScreenRecordingStatus()
  const accessibilityTrusted = getAccessibilityTrusted()

  let canReadActiveWindow = false
  try {
    const win = await getActiveWindow()
    canReadActiveWindow = !!win && typeof win.owner?.name === 'string' && win.owner.name.length > 0
  } catch {
    canReadActiveWindow = false
  }

  return { screenRecording, accessibilityTrusted, canReadActiveWindow }
}

export async function requestPermissions(): Promise<{ ok: true }> {
  if (process.platform !== 'darwin') return { ok: true }

  const screenRecording = getScreenRecordingStatus()
  const accessibilityTrusted = getAccessibilityTrusted()

  if (screenRecording !== 'granted') {
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture')
  }

  if (!accessibilityTrusted) {
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
  }

  return { ok: true }
}

