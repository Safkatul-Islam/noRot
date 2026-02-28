import { useEffect, useMemo, useState } from 'react'

import type { PersonaId } from '@norot/shared'

import { IPC_CHANNELS } from '../ipc-channels'
import { usePermissions } from '../hooks/usePermissions'
import { useSettingsStore } from '../stores/settings-store'

function parsePersona(value: string): PersonaId {
  if (value === 'calm_friend' || value === 'coach' || value === 'tough_love') return value
  return 'calm_friend'
}

export function SettingsPage() {
  const settings = useSettingsStore(s => s.settings)
  const update = useSettingsStore(s => s.update)
  const { status: permissions, request: requestPermissions, refresh: refreshPermissions } = usePermissions()

  const [apiUrl, setApiUrl] = useState(settings?.apiUrl ?? 'http://localhost:8000')
  const [persona, setPersona] = useState<PersonaId>(settings?.persona ?? 'calm_friend')
  const [toughLoveEnabled, setToughLoveEnabled] = useState(settings?.toughLoveEnabled ?? false)
  const [monitoringEnabled, setMonitoringEnabled] = useState(settings?.monitoringEnabled ?? true)
  const [autoShowTodoOverlay, setAutoShowTodoOverlay] = useState(settings?.autoShowTodoOverlay ?? true)
  const [muted, setMuted] = useState(settings?.muted ?? false)
  const [geminiKey, setGeminiKey] = useState(settings?.geminiKey ?? '')
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState(settings?.elevenLabsApiKey ?? '')
  const [voiceAgentId, setVoiceAgentId] = useState(settings?.voiceAgentId ?? '')
  const [checkinAgentId, setCheckinAgentId] = useState(settings?.checkinAgentId ?? '')

  const [status, setStatus] = useState<string | null>(null)
  const [telemetryActive, setTelemetryActive] = useState<boolean | null>(null)

  useEffect(() => {
    if (!settings) return
    setApiUrl(settings.apiUrl)
    setPersona(settings.persona)
    setToughLoveEnabled(settings.toughLoveEnabled)
    setMonitoringEnabled(settings.monitoringEnabled)
    setAutoShowTodoOverlay(settings.autoShowTodoOverlay)
    setMuted(settings.muted)
    setGeminiKey(settings.geminiKey)
    setElevenLabsApiKey(settings.elevenLabsApiKey)
    setVoiceAgentId(settings.voiceAgentId)
    setCheckinAgentId(settings.checkinAgentId)
  }, [settings])

  const hasElevenLabsKey = useMemo(() => elevenLabsApiKey.trim().length > 0, [elevenLabsApiKey])

  const refreshTelemetry = async () => {
    const res = await window.norot.invoke<{ active: boolean }>(IPC_CHANNELS.telemetry.isActive)
    setTelemetryActive(!!res?.active)
  }

  useEffect(() => {
    void refreshTelemetry()
  }, [])

  const save = async () => {
    setStatus(null)
    const res = await update({
      apiUrl,
      persona,
      toughLoveEnabled,
      monitoringEnabled,
      autoShowTodoOverlay,
      muted,
      geminiKey,
      elevenLabsApiKey,
      voiceAgentId,
      checkinAgentId
    })
    if (!res.ok) {
      setStatus(res.error?.message ?? 'Failed to save')
      return
    }
    setStatus('Saved')
    if (monitoringEnabled) {
      await window.norot.invoke(IPC_CHANNELS.telemetry.start)
    } else {
      await window.norot.invoke(IPC_CHANNELS.telemetry.stop)
    }
    await refreshTelemetry()
  }

  return (
    <div className="space-y-6">
      {status ? <div className="rounded border border-white/10 bg-white/10 px-3 py-2 text-sm">{status}</div> : null}

      <div className="rounded border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/70">Connection</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <div className="text-white/60">API URL</div>
            <input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="mt-1 w-full rounded border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
            />
          </label>
          <div className="text-sm">
            <div className="text-white/60">Telemetry</div>
            <div className="mt-2 text-white/80">
              {telemetryActive === null ? '—' : (telemetryActive ? 'active' : 'paused')}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/70">Persona</div>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <div className="text-white/60">Persona</div>
            <select
              value={persona}
              onChange={(e) => setPersona(parsePersona(e.target.value))}
              className="mt-1 rounded border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
            >
              <option value="calm_friend">calm_friend</option>
              <option value="coach">coach</option>
              <option value="tough_love">tough_love</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={toughLoveEnabled} onChange={(e) => setToughLoveEnabled(e.target.checked)} />
            <span className="text-white/80">Enable tough love</span>
          </label>
        </div>
      </div>

      <div className="rounded border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/70">Voice</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <div className="text-white/60">ElevenLabs API key</div>
            <input
              value={elevenLabsApiKey}
              onChange={(e) => setElevenLabsApiKey(e.target.value)}
              className="mt-1 w-full rounded border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
              placeholder="xi-..."
            />
          </label>
          <div className="text-sm">
            <div className="text-white/60">Status</div>
            <div className="mt-2 text-white/80">{hasElevenLabsKey ? 'configured' : 'missing key'}</div>
          </div>
          <label className="text-sm">
            <div className="text-white/60">Coach agent ID</div>
            <input
              value={voiceAgentId}
              onChange={(e) => setVoiceAgentId(e.target.value)}
              className="mt-1 w-full rounded border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
              placeholder="agent_..."
            />
          </label>
          <label className="text-sm">
            <div className="text-white/60">Check-in agent ID</div>
            <input
              value={checkinAgentId}
              onChange={(e) => setCheckinAgentId(e.target.value)}
              className="mt-1 w-full rounded border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
              placeholder="agent_..."
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
            <span className="text-white/80">Mute audio</span>
          </label>
        </div>
      </div>

      <div className="rounded border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/70">AI</div>
        <label className="mt-3 block text-sm">
          <div className="text-white/60">Gemini API key</div>
          <input
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            className="mt-1 w-full rounded border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
          />
        </label>
      </div>

      <div className="rounded border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/70">Monitoring</div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={monitoringEnabled} onChange={(e) => setMonitoringEnabled(e.target.checked)} />
            <span className="text-white/80">Enable monitoring</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoShowTodoOverlay} onChange={(e) => setAutoShowTodoOverlay(e.target.checked)} />
            <span className="text-white/80">Auto show todo overlay</span>
          </label>
        </div>
      </div>

      <div className="rounded border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/70">Permissions</div>
        <div className="mt-2 text-sm text-white/80">
          Screen Recording: {permissions?.screenRecording ?? '—'} · Accessibility: {permissions?.accessibilityTrusted ? 'trusted' : 'not trusted'} · Window probe: {permissions?.canReadActiveWindow ? 'ok' : 'blocked'}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="rounded bg-white/15 px-3 py-2 text-sm hover:bg-white/20"
            onClick={() => void requestPermissions()}
          >
            Request permissions
          </button>
          <button
            type="button"
            className="rounded bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            onClick={() => void refreshPermissions()}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-white/15 px-4 py-2 text-sm hover:bg-white/20"
          onClick={() => void save()}
        >
          Save settings
        </button>
        <button
          type="button"
          className="rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          onClick={() => void window.norot.invoke(IPC_CHANNELS.interventions.testIntervention)}
        >
          Test intervention
        </button>
      </div>
    </div>
  )
}

