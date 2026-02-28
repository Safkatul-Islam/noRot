import { useCallback, useEffect, useRef, useState } from 'react'

import type { InterventionEvent } from '@norot/shared'

import { IPC_CHANNELS } from '../ipc-channels'

export function useInterventions() {
  const [active, setActive] = useState<InterventionEvent | null>(null)
  const [timeline, setTimeline] = useState<InterventionEvent[]>([])
  const ttlTimer = useRef<number | null>(null)

  useEffect(() => {
    const off = window.norot.on(IPC_CHANNELS.interventions.onIntervention, (payload) => {
      const evt = parseIntervention(payload)
      if (!evt) return

      setTimeline(prev => [evt, ...prev].slice(0, 200))

      if (evt.userResponse === 'pending') {
        setActive(evt)
        if (ttlTimer.current !== null) window.clearTimeout(ttlTimer.current)
        ttlTimer.current = window.setTimeout(() => setActive(null), 30_000)
      } else {
        setActive(prev => (prev && prev.id === evt.id) ? null : prev)
      }
    })
    return () => {
      off()
      if (ttlTimer.current !== null) window.clearTimeout(ttlTimer.current)
    }
  }, [])

  const respond = useCallback(async (id: string, response: 'snoozed' | 'dismissed' | 'working') => {
    await window.norot.invoke(IPC_CHANNELS.interventions.respond, { id, response })
    setActive(prev => (prev && prev.id === id) ? { ...prev, userResponse: response } : prev)
  }, [])

  return { active, timeline, respond }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseIntervention(payload: unknown): InterventionEvent | null {
  if (!isRecord(payload)) return null
  const id = payload.id
  const timestamp = payload.timestamp
  const score = payload.score
  const severity = payload.severity
  const persona = payload.persona
  const text = payload.text
  const userResponse = payload.userResponse
  const audioPlayed = payload.audioPlayed

  if (typeof id !== 'string' || id.length === 0) return null
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return null
  if (typeof score !== 'number' || !Number.isFinite(score)) return null
  if (severity !== 0 && severity !== 1 && severity !== 2 && severity !== 3 && severity !== 4) return null
  if (persona !== 'calm_friend' && persona !== 'coach' && persona !== 'tough_love') return null
  if (typeof text !== 'string') return null
  if (userResponse !== 'pending' && userResponse !== 'snoozed' && userResponse !== 'dismissed' && userResponse !== 'working') return null
  if (typeof audioPlayed !== 'boolean') return null

  return payload as unknown as InterventionEvent
}
