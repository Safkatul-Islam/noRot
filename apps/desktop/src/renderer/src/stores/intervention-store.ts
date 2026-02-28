import { create } from 'zustand'
import type { Intervention, Severity } from '@norot/shared'

interface ActiveIntervention {
  script: string
  severity: Severity
  score: number
  persona: string
  timestamp: number
}

interface InterventionState {
  activeIntervention: ActiveIntervention | null
  isOverlayVisible: boolean
  interventionHistory: Intervention[]
}

interface InterventionActions {
  showIntervention: (data: ActiveIntervention) => void
  dismiss: () => Promise<void>
  snooze: (minutes: number) => Promise<void>
  commitToWork: () => Promise<void>
  fetchHistory: () => Promise<void>
  initListener: () => () => void
}

export const useInterventionStore = create<InterventionState & InterventionActions>((set) => ({
  activeIntervention: null,
  isOverlayVisible: false,
  interventionHistory: [],

  showIntervention: (data: ActiveIntervention) => {
    set({
      activeIntervention: data,
      isOverlayVisible: true,
    })
  },

  dismiss: async () => {
    try {
      await window.electronAPI.dismissIntervention()
    } catch (err) {
      console.error('Failed to dismiss intervention:', err)
    }
    set({
      activeIntervention: null,
      isOverlayVisible: false,
    })
  },

  snooze: async (minutes: number) => {
    try {
      await window.electronAPI.snooze(minutes)
    } catch (err) {
      console.error('Failed to snooze:', err)
    }
    set({
      activeIntervention: null,
      isOverlayVisible: false,
    })
  },

  commitToWork: async () => {
    try {
      await window.electronAPI.commitToWork()
    } catch (err) {
      console.error('Failed to commit to work:', err)
    }
    set({
      activeIntervention: null,
      isOverlayVisible: false,
    })
  },

  fetchHistory: async () => {
    try {
      const history = (await window.electronAPI.getInterventions()) as Intervention[]
      set({ interventionHistory: history })
    } catch (err) {
      console.error('Failed to fetch intervention history:', err)
    }
  },

  initListener: () => {
    const unsub = window.electronAPI.onIntervention((data) => {
      const intervention = data as ActiveIntervention
      set({
        activeIntervention: intervention,
        isOverlayVisible: true,
      })
    })
    return unsub
  },
}))
