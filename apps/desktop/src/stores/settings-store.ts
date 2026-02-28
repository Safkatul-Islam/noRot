import { create } from 'zustand'

import type { PersonaId } from '@norot/shared'

import { IPC_CHANNELS } from '../ipc-channels'

export type ScriptSource = 'default' | 'gemini'
export type TtsEngine = 'auto' | 'elevenlabs' | 'local'

export interface CategoryRule {
  matchType: 'app' | 'title'
  pattern: string
  category: 'productive' | 'neutral' | 'social' | 'entertainment' | 'unknown'
}

export interface WorkOverride {
  app?: string
  domain?: string
  untilTs: number
}

export interface DesktopSettings {
  onboardingComplete: boolean
  monitoringEnabled: boolean
  dailySetupDate: string | null
  autoShowTodoOverlay: boolean
  apiUrl: string
  persona: PersonaId
  toughLoveEnabled: boolean
  scoreThreshold: number
  cooldownSeconds: number
  scriptSource: ScriptSource
  geminiKey: string
  elevenLabsApiKey: string
  voiceAgentId: string
  checkinAgentId: string
  visionEnabled: boolean
  muted: boolean
  ttsEngine: TtsEngine
  categoryRules: CategoryRule[]
  workOverrides: WorkOverride[]
  refocusCountDate: string | null
  refocusCount: number
}

export interface UpdateSettingsError {
  code: string
  message: string
}

export interface UpdateSettingsResult {
  ok: boolean
  error?: UpdateSettingsError
}

const DEFAULTS: DesktopSettings = {
  onboardingComplete: false,
  monitoringEnabled: true,
  dailySetupDate: null,
  autoShowTodoOverlay: true,
  apiUrl: 'http://localhost:8000',
  persona: 'calm_friend',
  toughLoveEnabled: false,
  scoreThreshold: 70,
  cooldownSeconds: 180,
  scriptSource: 'default',
  geminiKey: '',
  elevenLabsApiKey: '',
  voiceAgentId: '',
  checkinAgentId: '',
  visionEnabled: false,
  muted: false,
  ttsEngine: 'auto',
  categoryRules: [],
  workOverrides: [],
  refocusCountDate: null,
  refocusCount: 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseBoolean(raw: Record<string, unknown>, key: keyof DesktopSettings, fallback: boolean): boolean {
  const value = raw[key as string]
  return typeof value === 'boolean' ? value : fallback
}

function parseNumber(raw: Record<string, unknown>, key: keyof DesktopSettings, fallback: number): number {
  const value = raw[key as string]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseString(raw: Record<string, unknown>, key: keyof DesktopSettings, fallback: string): string {
  const value = raw[key as string]
  return typeof value === 'string' ? value : fallback
}

function parseNullableString(raw: Record<string, unknown>, key: keyof DesktopSettings, fallback: string | null): string | null {
  const value = raw[key as string]
  if (typeof value === 'string') return value
  if (value === null) return null
  return fallback
}

function parsePersona(raw: Record<string, unknown>, key: keyof DesktopSettings, fallback: PersonaId): PersonaId {
  const value = raw[key as string]
  if (value === 'calm_friend' || value === 'coach' || value === 'tough_love') return value
  return fallback
}

function parseScriptSource(raw: Record<string, unknown>, key: keyof DesktopSettings, fallback: ScriptSource): ScriptSource {
  const value = raw[key as string]
  if (value === 'default' || value === 'gemini') return value
  return fallback
}

function parseTtsEngine(raw: Record<string, unknown>, key: keyof DesktopSettings, fallback: TtsEngine): TtsEngine {
  const value = raw[key as string]
  if (value === 'auto' || value === 'elevenlabs' || value === 'local') return value
  return fallback
}

function parseCategoryRules(value: unknown): CategoryRule[] {
  if (!Array.isArray(value)) return []
  const out: CategoryRule[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const matchType = item.matchType
    const pattern = item.pattern
    const category = item.category
    if (matchType !== 'app' && matchType !== 'title') continue
    if (typeof pattern !== 'string') continue
    if (category !== 'productive' && category !== 'neutral' && category !== 'social' && category !== 'entertainment' && category !== 'unknown') continue
    out.push({ matchType, pattern, category })
  }
  return out
}

function parseWorkOverrides(value: unknown): WorkOverride[] {
  if (!Array.isArray(value)) return []
  const out: WorkOverride[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const untilTs = item.untilTs
    if (typeof untilTs !== 'number' || !Number.isFinite(untilTs)) continue
    const app = typeof item.app === 'string' ? item.app : undefined
    const domain = typeof item.domain === 'string' ? item.domain : undefined
    out.push({ untilTs: Math.trunc(untilTs), app, domain })
  }
  return out
}

function parseSettings(raw: unknown): DesktopSettings {
  if (!isRecord(raw)) return DEFAULTS
  return {
    onboardingComplete: parseBoolean(raw, 'onboardingComplete', DEFAULTS.onboardingComplete),
    monitoringEnabled: parseBoolean(raw, 'monitoringEnabled', DEFAULTS.monitoringEnabled),
    dailySetupDate: parseNullableString(raw, 'dailySetupDate', DEFAULTS.dailySetupDate),
    autoShowTodoOverlay: parseBoolean(raw, 'autoShowTodoOverlay', DEFAULTS.autoShowTodoOverlay),
    apiUrl: parseString(raw, 'apiUrl', DEFAULTS.apiUrl),
    persona: parsePersona(raw, 'persona', DEFAULTS.persona),
    toughLoveEnabled: parseBoolean(raw, 'toughLoveEnabled', DEFAULTS.toughLoveEnabled),
    scoreThreshold: parseNumber(raw, 'scoreThreshold', DEFAULTS.scoreThreshold),
    cooldownSeconds: parseNumber(raw, 'cooldownSeconds', DEFAULTS.cooldownSeconds),
    scriptSource: parseScriptSource(raw, 'scriptSource', DEFAULTS.scriptSource),
    geminiKey: parseString(raw, 'geminiKey', DEFAULTS.geminiKey),
    elevenLabsApiKey: parseString(raw, 'elevenLabsApiKey', DEFAULTS.elevenLabsApiKey),
    voiceAgentId: parseString(raw, 'voiceAgentId', DEFAULTS.voiceAgentId),
    checkinAgentId: parseString(raw, 'checkinAgentId', DEFAULTS.checkinAgentId),
    visionEnabled: parseBoolean(raw, 'visionEnabled', DEFAULTS.visionEnabled),
    muted: parseBoolean(raw, 'muted', DEFAULTS.muted),
    ttsEngine: parseTtsEngine(raw, 'ttsEngine', DEFAULTS.ttsEngine),
    categoryRules: parseCategoryRules(raw.categoryRules),
    workOverrides: parseWorkOverrides(raw.workOverrides),
    refocusCountDate: parseNullableString(raw, 'refocusCountDate', DEFAULTS.refocusCountDate),
    refocusCount: parseNumber(raw, 'refocusCount', DEFAULTS.refocusCount)
  }
}

interface SettingsStoreState {
  settings: DesktopSettings | null
  loading: boolean
  error: string | null
  load: () => Promise<void>
  update: (patch: Partial<DesktopSettings>) => Promise<UpdateSettingsResult>
}

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  settings: null,
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null })
    try {
      const raw = await window.norot.invoke<Record<string, unknown>>(IPC_CHANNELS.settings.get)
      set({ settings: parseSettings(raw), loading: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      set({ error: msg, loading: false })
    }
  },
  update: async (patch) => {
    try {
      const res = await window.norot.invoke<UpdateSettingsResult>(IPC_CHANNELS.settings.update, patch)
      if (res && res.ok) {
        await get().load()
      }
      return res ?? { ok: false }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, error: { code: 'ipc_error', message: msg } }
    }
  }
}))

