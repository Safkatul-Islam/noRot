import { create } from 'zustand'
import type { Severity } from '@norot/shared'

interface ScoreState {
  score: number
  severity: Severity
  distractionRatio: number
  switchRate: number
  topDistraction: string | null
  minutesMonitored: number
  isMonitoring: boolean
  _pollingInterval: ReturnType<typeof setInterval> | null
}

interface ScoreActions {
  fetchScore: () => Promise<void>
  startPolling: () => void
  stopPolling: () => void
  setMonitoring: (isMonitoring: boolean) => void
}

export const useScoreStore = create<ScoreState & ScoreActions>((set, get) => ({
  score: 0,
  severity: 'chill',
  distractionRatio: 0,
  switchRate: 0,
  topDistraction: null,
  minutesMonitored: 0,
  isMonitoring: false,
  _pollingInterval: null,

  fetchScore: async () => {
    try {
      const result = await window.electronAPI.getScore()
      const stats = (result.stats ?? {}) as Record<string, unknown>
      set({
        score: result.score ?? 0,
        severity: (result.severity as Severity) ?? 'chill',
        distractionRatio: (stats.distractionRatio as number) ?? 0,
        switchRate: (stats.switchRate as number) ?? 0,
        topDistraction: (stats.topDistraction as string | null) ?? null,
        minutesMonitored: (stats.minutesMonitored as number) ?? 0,
      })
    } catch (err) {
      console.error('Failed to fetch score:', err)
    }
  },

  startPolling: () => {
    const { _pollingInterval, fetchScore } = get()
    if (_pollingInterval) return

    fetchScore()
    const interval = setInterval(fetchScore, 2000)
    set({ _pollingInterval: interval, isMonitoring: true })

    window.electronAPI.startMonitoring().catch(console.error)
  },

  stopPolling: () => {
    const { _pollingInterval } = get()
    if (_pollingInterval) {
      clearInterval(_pollingInterval)
    }
    set({ _pollingInterval: null, isMonitoring: false })

    window.electronAPI.stopMonitoring().catch(console.error)
  },

  setMonitoring: (isMonitoring: boolean) => {
    set({ isMonitoring })
  },
}))
