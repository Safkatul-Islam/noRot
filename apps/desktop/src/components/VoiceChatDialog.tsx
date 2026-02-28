import { useEffect, useMemo, useState } from 'react'

import { useConversation } from '@elevenlabs/react'
import type { SessionConfig } from '@elevenlabs/react'
import type { IncomingSocketEvent } from '@elevenlabs/client'

import { IPC_CHANNELS } from '../ipc-channels'

type VoiceChatMode = 'coach' | 'checkin'

interface EnsureAgentResult {
  agentId: string
  conversationToken?: string
  signedUrl?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseStructuredError(error: unknown): { code: string; message: string } | null {
  const message = errorMessage(error)
  try {
    const parsed = JSON.parse(message) as unknown
    if (!isRecord(parsed)) return null
    const code = parsed.code
    const msg = parsed.message
    if (typeof code === 'string' && typeof msg === 'string') return { code, message: msg }
    return null
  } catch {
    return null
  }
}

function eventToLine(event: IncomingSocketEvent): string {
  const type = (event as { type?: unknown }).type
  if (typeof type !== 'string') return 'event'
  const text = (event as { text?: unknown }).text
  if (typeof text === 'string' && text.trim()) return `${type}: ${text.trim()}`
  const agentText = (event as { message?: unknown }).message
  if (typeof agentText === 'string' && agentText.trim()) return `${type}: ${agentText.trim()}`
  return type
}

function toSessionConfig(ensure: EnsureAgentResult, preferred: 'webrtc' | 'websocket'): SessionConfig {
  if (preferred === 'websocket' && typeof ensure.signedUrl === 'string' && ensure.signedUrl.length > 0) {
    return { signedUrl: ensure.signedUrl, connectionType: 'websocket' }
  }
  if (typeof ensure.conversationToken === 'string' && ensure.conversationToken.length > 0) {
    return { conversationToken: ensure.conversationToken, connectionType: 'webrtc' }
  }
  return { agentId: ensure.agentId, connectionType: 'webrtc' }
}

export function VoiceChatDialog(props: { open: boolean; mode: VoiceChatMode; onClose: () => void }) {
  const [lines, setLines] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const title = props.mode === 'checkin' ? 'Check-in' : 'Coach'

  const conversation = useConversation({
    onMessage: (event) => {
      setLines(prev => [eventToLine(event), ...prev].slice(0, 200))
    },
    onError: (err) => {
      const structured = parseStructuredError(err)
      setError(structured ? structured.message : errorMessage(err))
    }
  })

  const canStart = props.open && conversation.status !== 'connecting' && conversation.status !== 'connected'
  const canEnd = props.open && conversation.status === 'connected'

  useEffect(() => {
    if (!props.open) return
    setError(null)
  }, [props.open])

  useEffect(() => {
    if (!props.open) return
    return () => {
      void conversation.endSession()
    }
  }, [conversation, props.open])

  const ensureChannel = useMemo(() => {
    return props.mode === 'checkin' ? IPC_CHANNELS.voice.ensureCheckinAgent : IPC_CHANNELS.voice.ensureVoiceAgent
  }, [props.mode])

  const start = async () => {
    setError(null)
    setLines([])
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      setError(errorMessage(err))
      return
    }

    let ensure: EnsureAgentResult
    try {
      ensure = await window.norot.invoke<EnsureAgentResult>(ensureChannel, { connectionType: 'webrtc' })
    } catch (err) {
      const structured = parseStructuredError(err)
      setError(structured ? structured.message : errorMessage(err))
      return
    }

    try {
      const id = await conversation.startSession(toSessionConfig(ensure, 'webrtc'))
      setConversationId(id)
    } catch (err) {
      const structured = parseStructuredError(err)
      setError(structured ? structured.message : errorMessage(err))
    }
  }

  const end = async () => {
    setError(null)
    try {
      await conversation.endSession()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (!props.open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-black/70 p-5 backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-white/60">Voice chat</div>
            <div className="text-xl font-semibold">{title}</div>
            <div className="mt-1 text-xs text-white/60">
              Status: {conversation.status}{conversationId ? ` · ${conversationId}` : ''}
            </div>
          </div>
          <button
            type="button"
            className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            onClick={props.onClose}
          >
            Close
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canStart}
            className="rounded bg-white/15 px-4 py-2 text-sm enabled:hover:bg-white/20 disabled:opacity-50"
            onClick={() => void start()}
          >
            Start
          </button>
          <button
            type="button"
            disabled={!canEnd}
            className="rounded bg-white/10 px-4 py-2 text-sm enabled:hover:bg-white/15 disabled:opacity-50"
            onClick={() => void end()}
          >
            End
          </button>
        </div>

        <div className="mt-4 max-h-80 overflow-auto rounded border border-white/10 bg-white/5 p-3 text-sm">
          {lines.length === 0 ? (
            <div className="text-white/60">No messages yet.</div>
          ) : (
            <ul className="space-y-1">
              {lines.map((l, idx) => <li key={`${idx}:${l}`}>{l}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function errorMessage(value: unknown): string {
  if (typeof value === 'string') return value
  if (isRecord(value)) {
    const msg = value.message
    if (typeof msg === 'string') return msg
  }
  return String(value)
}
