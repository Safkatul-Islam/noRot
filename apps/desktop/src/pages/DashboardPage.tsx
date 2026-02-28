import { useMemo, useState } from 'react'

import { IPC_CHANNELS } from '../ipc-channels'
import { useInterventions } from '../hooks/useInterventions'
import { usePermissions } from '../hooks/usePermissions'
import { useScore } from '../hooks/useScore'
import { useTodos } from '../hooks/useTodos'
import { useVoice } from '../hooks/useVoice'
import { useSettingsStore } from '../stores/settings-store'

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '–'
  return `${Math.round(value)}%`
}

export function DashboardPage() {
  const settings = useSettingsStore(s => s.settings)
  const apiUrl = settings?.apiUrl ?? 'http://localhost:8000'
  const { score, live, connection } = useScore(apiUrl)
  const { active, respond } = useInterventions()
  const { todos, createTodo, updateTodo, deleteTodo, openOverlay } = useTodos()
  const { status: permissions } = usePermissions()

  const [toast, setToast] = useState<string | null>(null)
  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 1500)
  }

  const hasElevenLabsKey = useMemo(() => (settings?.elevenLabsApiKey?.trim()?.length ?? 0) > 0, [settings?.elevenLabsApiKey])
  const muted = settings?.muted ?? false
  const ttsEngine = settings?.ttsEngine ?? 'auto'

  const { voiceStatus } = useVoice({ muted, ttsEngine, hasElevenLabsKey, onToast: showToast })

  const [newTodo, setNewTodo] = useState('')

  const permissionsBad = permissions
    ? (permissions.screenRecording !== 'granted' || permissions.canReadActiveWindow !== true)
    : false

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="rounded border border-white/10 bg-white/10 px-3 py-2 text-sm">
          {toast}
        </div>
      ) : null}

      {permissionsBad ? (
        <div className="rounded border border-yellow-400/30 bg-yellow-400/10 p-4 text-sm">
          Permissions missing: Screen Recording / Accessibility may be required for active window monitoring.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/70">Connection</div>
            <div className={`text-sm ${connection.connected ? 'text-green-300' : 'text-white/60'}`}>
              {connection.connected ? 'connected' : 'disconnected'}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded bg-white/5 p-3">
              <div className="text-white/60">Focus</div>
              <div className="mt-1 text-lg font-semibold">{live ? formatPercent(live.focusScore) : '–'}</div>
            </div>
            <div className="rounded bg-white/5 p-3">
              <div className="text-white/60">Procrastination</div>
              <div className="mt-1 text-lg font-semibold">{score ? formatPercent(score.procrastinationScore) : '–'}</div>
            </div>
            <div className="rounded bg-white/5 p-3">
              <div className="text-white/60">Voice</div>
              <div className="mt-1 text-lg font-semibold">{voiceStatus.speaking ? 'speaking' : 'idle'}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-white/70">Message</div>
            <div className="mt-2 text-sm">
              {score?.recommendation?.text ?? '—'}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-white/70">Reasons</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
              {(score?.reasons ?? []).map((r) => <li key={r}>{r}</li>)}
              {(score?.reasons?.length ?? 0) === 0 ? <li>—</li> : null}
            </ul>
          </div>
        </div>

        <div className="rounded border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/70">Intervention</div>
          {active && active.userResponse === 'pending' ? (
            <div className="mt-3 space-y-3">
              <div className="rounded bg-white/5 p-3 text-sm">
                {active.text}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded bg-white/15 px-3 py-2 text-sm hover:bg-white/20"
                  onClick={() => void respond(active.id, 'working')}
                >
                  I&apos;m working
                </button>
                <button
                  type="button"
                  className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
                  onClick={() => void respond(active.id, 'dismissed')}
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
                  onClick={() => void respond(active.id, 'snoozed')}
                >
                  Snooze
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-white/70">No active intervention.</div>
          )}
        </div>
      </div>

      <div className="rounded border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-white/70">Todos</div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/15"
              onClick={() => void window.norot.invoke(IPC_CHANNELS.voice.openVoiceChat, { mode: 'coach' })}
            >
              Voice chat
            </button>
            <button
              type="button"
              className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/15"
              onClick={() => void openOverlay()}
            >
              Open overlay
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a todo"
            className="w-full rounded border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
          <button
            type="button"
            className="rounded bg-white/15 px-3 py-2 text-sm hover:bg-white/20"
            onClick={() => {
              const text = newTodo.trim()
              if (!text) return
              setNewTodo('')
              void createTodo(text)
            }}
          >
            Add
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {todos.map(todo => (
            <li key={todo.id} className="flex items-center justify-between rounded bg-white/5 px-3 py-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={(e) => void updateTodo(todo.id, { done: e.target.checked })}
                />
                <span className={todo.done ? 'text-white/50 line-through' : ''}>{todo.text}</span>
              </label>
              <button
                type="button"
                className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/15"
                onClick={() => void deleteTodo(todo.id)}
              >
                Delete
              </button>
            </li>
          ))}
          {todos.length === 0 ? <li className="text-sm text-white/60">No todos yet.</li> : null}
        </ul>
      </div>
    </div>
  )
}
