import { useEffect, useMemo, useRef, useState } from 'react'

import type { PersonaId, Severity, TTSSettings } from '@norot/shared'

import { IPC_CHANNELS } from '../ipc-channels'
import { VoiceService } from '../lib/voice-service'

export interface VoiceStatusBroadcast {
  speaking: boolean
  amplitude: number
  source: string
}

export function useVoice(options: {
  muted: boolean
  ttsEngine: 'auto' | 'elevenlabs' | 'local'
  hasElevenLabsKey: boolean
  onToast?: (message: string) => void
}) {
  const { muted, ttsEngine, hasElevenLabsKey, onToast } = options
  const [status, setStatus] = useState(() => ({ speaking: false, amplitude: 0, source: 'none', error: null as string | null }))

  const onStartRef = useRef<(id: string) => void>(() => {})
  onStartRef.current = (id: string) => {
    void window.norot.invoke(IPC_CHANNELS.interventions.reportAudioPlayed, { id })
  }

  const voice = useMemo(() => new VoiceService((id) => onStartRef.current(id)), [])

  useEffect(() => {
    const unlock = () => voice.unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
    }
  }, [voice])

  useEffect(() => {
    const off = window.norot.on(IPC_CHANNELS.interventions.onPlayAudio, (payload) => {
      const evt = parsePlayAudio(payload)
      if (!evt) return

      const canUseEleven = hasElevenLabsKey && (ttsEngine === 'auto' || ttsEngine === 'elevenlabs')
      if (muted) {
        onToast?.('Muted')
        return
      }
      if (!canUseEleven) {
        onToast?.('Voice disabled (missing ElevenLabs config)')
        return
      }

      if (evt.severity >= 3) voice.interruptAndEnqueue(evt)
      else voice.enqueue(evt)
    })
    return () => off()
  }, [hasElevenLabsKey, muted, onToast, ttsEngine, voice])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = voice.getStatus()
      setStatus(next)
      const broadcast: VoiceStatusBroadcast = { speaking: next.speaking, amplitude: next.amplitude, source: next.source }
      window.norot.send(IPC_CHANNELS.voice.statusBroadcast, broadcast)
    }, 200)
    return () => window.clearInterval(timer)
  }, [voice])

  return { voiceStatus: status }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parsePlayAudio(payload: unknown): { id: string; text: string; persona: PersonaId; severity: Severity; tts: TTSSettings } | null {
  if (!isRecord(payload)) return null
  const id = payload.id
  const text = payload.text
  const persona = payload.persona
  const severity = payload.severity
  const tts = payload.tts

  if (typeof id !== 'string' || id.length === 0) return null
  if (typeof text !== 'string' || text.trim().length === 0) return null
  if (persona !== 'calm_friend' && persona !== 'coach' && persona !== 'tough_love') return null
  if (severity !== 0 && severity !== 1 && severity !== 2 && severity !== 3 && severity !== 4) return null
  if (!isRecord(tts)) return null

  return payload as { id: string; text: string; persona: PersonaId; severity: Severity; tts: TTSSettings }
}

