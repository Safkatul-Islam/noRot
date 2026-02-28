import { useEffect, useState } from 'react'

import { IPC_CHANNELS } from '../ipc-channels'

export interface AppStatRow {
  appName: string
  domain: string | null
  category: string
  count: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseAppStatRow(raw: unknown): AppStatRow | null {
  if (!isRecord(raw)) return null
  const appName = raw.appName
  const domain = raw.domain
  const category = raw.category
  const count = raw.count
  if (typeof appName !== 'string' || appName.trim().length === 0) return null
  if (domain !== null && typeof domain !== 'string') return null
  if (typeof category !== 'string') return null
  if (typeof count !== 'number' || !Number.isFinite(count)) return null
  return { appName, domain, category, count }
}

export function useAppStats(minutes: number) {
  const [rows, setRows] = useState<AppStatRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const raw = await window.norot.invoke<unknown>(IPC_CHANNELS.scores.getAppStats, { minutes })
        if (canceled) return
        if (!Array.isArray(raw)) {
          setRows([])
          return
        }
        const parsed = raw.map(parseAppStatRow).filter((r): r is AppStatRow => r !== null)
        setRows(parsed)
      } catch (err) {
        if (!canceled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!canceled) setLoading(false)
      }
    })()
    return () => { canceled = true }
  }, [minutes])

  return { rows, loading, error }
}

