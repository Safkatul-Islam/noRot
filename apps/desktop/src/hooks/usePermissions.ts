import { useCallback, useEffect, useState } from 'react'

import { IPC_CHANNELS } from '../ipc-channels'

export interface PermissionsStatus {
  screenRecording: string
  accessibilityTrusted: boolean
  canReadActiveWindow: boolean
}

export function usePermissions() {
  const [status, setStatus] = useState<PermissionsStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await window.norot.invoke<PermissionsStatus>(IPC_CHANNELS.permissions.getStatus)
      setStatus(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const request = useCallback(async () => {
    try {
      await window.norot.invoke(IPC_CHANNELS.permissions.request)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [refresh])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { status, loading, error, refresh, request }
}

