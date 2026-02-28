import { useEffect, useMemo, useState } from 'react'

import type { ScoreResponse, Severity } from '@norot/shared'

import { IPC_CHANNELS } from '../ipc-channels'

export interface LiveScoreUpdate {
  timestamp: number
  focusScore: number
  procrastinationScore: number
  severity: Severity
}

export interface ConnectionStatus {
  connected: boolean
  lastChecked: number | null
}

export function useScore(apiUrl: string) {
  const [score, setScore] = useState<ScoreResponse | null>(null)
  const [live, setLive] = useState<LiveScoreUpdate | null>(null)
  const [connection, setConnection] = useState<ConnectionStatus>({ connected: false, lastChecked: null })

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const latest = await window.norot.invoke<LatestScoreRow | null>(IPC_CHANNELS.scores.getLatest)
        if (!active || !latest) return
        setScore({
          procrastinationScore: latest.score,
          severity: latest.severity as Severity,
          reasons: latest.reasons,
          recommendation: latest.recommendation as ScoreResponse['recommendation']
        })
      } catch {
        // ignore
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const offScore = window.norot.on(IPC_CHANNELS.interventions.onScoreUpdate, (payload) => {
      const next = parseScoreResponse(payload)
      if (next) setScore(next)
    })
    const offLive = window.norot.on(IPC_CHANNELS.interventions.onLiveScoreUpdate, (payload) => {
      const next = parseLiveUpdate(payload)
      if (next) setLive(next)
    })
    return () => {
      offScore()
      offLive()
    }
  }, [])

  const pingUrl = useMemo(() => {
    try {
      return new URL('/', apiUrl).toString()
    } catch {
      return null
    }
  }, [apiUrl])

  useEffect(() => {
    if (!pingUrl) {
      setConnection({ connected: false, lastChecked: Date.now() })
      return
    }

    let timer: number | null = null
    let canceled = false

    const ping = async () => {
      try {
        const res = await fetch(pingUrl)
        if (canceled) return
        setConnection({ connected: res.ok, lastChecked: Date.now() })
      } catch {
        if (canceled) return
        setConnection({ connected: false, lastChecked: Date.now() })
      }
    }

    void ping()
    timer = window.setInterval(() => void ping(), 10_000)

    return () => {
      canceled = true
      if (timer !== null) window.clearInterval(timer)
    }
  }, [pingUrl])

  return { score, live, connection }
}

interface LatestScoreRow {
  timestamp: number
  score: number
  severity: number
  reasons: string[]
  recommendation: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseScoreResponse(payload: unknown): ScoreResponse | null {
  if (!isRecord(payload)) return null
  const procrastinationScore = payload.procrastinationScore
  const severity = payload.severity
  const reasons = payload.reasons
  const recommendation = payload.recommendation

  if (typeof procrastinationScore !== 'number' || !Number.isFinite(procrastinationScore)) return null
  if (severity !== 0 && severity !== 1 && severity !== 2 && severity !== 3 && severity !== 4) return null
  if (!Array.isArray(reasons) || !reasons.every(r => typeof r === 'string')) return null
  if (!isRecord(recommendation)) return null

  return payload as unknown as ScoreResponse
}

function parseLiveUpdate(payload: unknown): LiveScoreUpdate | null {
  if (!isRecord(payload)) return null
  const timestamp = payload.timestamp
  const focusScore = payload.focusScore
  const procrastinationScore = payload.procrastinationScore
  const severity = payload.severity

  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return null
  if (typeof focusScore !== 'number' || !Number.isFinite(focusScore)) return null
  if (typeof procrastinationScore !== 'number' || !Number.isFinite(procrastinationScore)) return null
  if (severity !== 0 && severity !== 1 && severity !== 2 && severity !== 3 && severity !== 4) return null

  return { timestamp, focusScore, procrastinationScore, severity }
}
