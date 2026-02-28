import { create } from 'zustand'
import type { PersonaId, Settings } from '@norot/shared'

interface SettingsState {
  persona: PersonaId
  onboardingComplete: boolean
  visionEnabled: boolean
  elevenLabsApiKey: string
  geminiApiKey: string
  loaded: boolean
}

interface SettingsActions {
  fetchSettings: () => Promise<void>
  updatePersona: (persona: PersonaId) => Promise<void>
  completeOnboarding: () => Promise<void>
  updateSettings: (settings: Partial<Settings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
  persona: 'chill_friend',
  onboardingComplete: false,
  visionEnabled: false,
  elevenLabsApiKey: '',
  geminiApiKey: '',
  loaded: false,

  fetchSettings: async () => {
    try {
      const settings = (await window.electronAPI.getSettings()) as Settings
      set({
        persona: settings.persona ?? 'chill_friend',
        onboardingComplete: settings.onboardingComplete ?? false,
        visionEnabled: settings.visionEnabled ?? false,
        elevenLabsApiKey: settings.elevenLabsApiKey ?? '',
        geminiApiKey: settings.geminiApiKey ?? '',
        loaded: true,
      })
    } catch (err) {
      console.error('Failed to fetch settings:', err)
      set({ loaded: true })
    }
  },

  updatePersona: async (persona: PersonaId) => {
    try {
      await window.electronAPI.updateSettings({ persona })
      set({ persona })
    } catch (err) {
      console.error('Failed to update persona:', err)
    }
  },

  completeOnboarding: async () => {
    try {
      await window.electronAPI.updateSettings({ onboardingComplete: true })
      set({ onboardingComplete: true })
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
    }
  },

  updateSettings: async (settings: Partial<Settings>) => {
    try {
      await window.electronAPI.updateSettings(settings as Record<string, unknown>)
      set((state) => ({
        ...state,
        ...settings,
      }))
    } catch (err) {
      console.error('Failed to update settings:', err)
    }
  },
}))
