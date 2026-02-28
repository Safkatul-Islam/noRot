import { useEffect, useState } from 'react'

import { IPC_CHANNELS } from '../ipc-channels'

export interface ScoreHistoryRow {
  timestamp: number
  score: number
  severity: number
  reasons: string[]
  recommendation: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseHistoryRow(raw: unknown): ScoreHistoryRow | null {
  if (!isRecord(raw)) return null
  const timestamp = raw.timestamp
  const score = raw.score
  const severity = raw.severity
  const reasons = raw.reasons
  const recommendation = raw.recommendation

  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return null
  if (typeof score !== 'number' || !Number.isFinite(score)) return null
  if (typeof severity !== 'number' || !Number.isFinite(severity)) return null
  if (!Array.isArray(reasons) || !reasons.every(r => typeof r === 'string')) return null

  return {
    timestamp,
    score,
    severity,
    reasons,
    recommendation
  }
}

export function useHistory(limit: number = 200) {
  const [rows, setRows] = useState<ScoreHistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const raw = await window.norot.invoke<unknown>(IPC_CHANNELS.scores.getUsageHistory, { limit })
        if (canceled) return
        if (!Array.isArray(raw)) {
          setRows([])
          return
        }
        const parsed = raw.map(parseHistoryRow).filter((r): r is ScoreHistoryRow => r !== null)
        setRows(parsed)
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        if (!canceled) setLoading(false)
      }
    })()
    return () => {
      canceled = true
    }
  }, [limit])

  return { rows, loading, error }
}

