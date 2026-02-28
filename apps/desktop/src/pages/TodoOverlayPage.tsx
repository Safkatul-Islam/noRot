import { useEffect, useMemo, useState } from 'react'

import { IPC_CHANNELS } from '../ipc-channels'
import { useTodos } from '../hooks/useTodos'

interface VoiceStatus {
  speaking: boolean
  amplitude: number
  source: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseVoiceStatus(payload: unknown): VoiceStatus | null {
  if (!isRecord(payload)) return null
  const speaking = payload.speaking
  const amplitude = payload.amplitude
  const source = payload.source
  if (typeof speaking !== 'boolean') return null
  if (typeof amplitude !== 'number' || !Number.isFinite(amplitude)) return null
  if (typeof source !== 'string') return null
  return { speaking, amplitude, source }
}

export function TodoOverlayPage() {
  const { todos } = useTodos()
  const [voice, setVoice] = useState<VoiceStatus>({ speaking: false, amplitude: 0, source: 'none' })

  useEffect(() => {
    document.body.classList.remove('bg-black')
    document.body.classList.add('bg-transparent')
    return () => {
      document.body.classList.remove('bg-transparent')
      document.body.classList.add('bg-black')
    }
  }, [])

  useEffect(() => {
    const off = window.norot.on(IPC_CHANNELS.voice.statusBroadcast, (payload) => {
      const next = parseVoiceStatus(payload)
      if (next) setVoice(next)
    })
    return () => off()
  }, [])

  const scale = useMemo(() => 1 + Math.max(0, Math.min(1, voice.amplitude)) * 0.4, [voice.amplitude])

  return (
    <div className="h-screen w-screen select-none p-4 text-white">
      <div className="rounded-xl border border-white/10 bg-black/30 p-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Todos</div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-white/70">{voice.speaking ? 'speaking' : 'idle'}</div>
            <div
              className="h-3 w-3 rounded-full bg-white/80"
              style={{ transform: `scale(${scale})`, transition: 'transform 120ms linear' }}
              title={voice.source}
            />
          </div>
        </div>

        <ul className="mt-3 space-y-2">
          {todos.filter(t => !t.done).slice(0, 12).map(t => (
            <li key={t.id} className="rounded bg-white/5 px-3 py-2 text-sm">
              {t.text}
            </li>
          ))}
          {todos.filter(t => !t.done).length === 0 ? (
            <li className="text-sm text-white/60">No pending todos.</li>
          ) : null}
        </ul>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="rounded bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
            onClick={() => void window.norot.invoke(IPC_CHANNELS.voice.openVoiceChat, { mode: 'coach' })}
          >
            Open voice chat
          </button>
          <button
            type="button"
            className="rounded bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
            onClick={() => void window.norot.invoke(IPC_CHANNELS.todoOverlay.close)}
          >
            Hide
          </button>
        </div>
      </div>
    </div>
  )
}

