import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FREQUENCY_PRESETS, DEFAULT_FREQUENCY } from '@/lib/frequency-presets';
export const ACCENT_PRESETS = {
    violet: {
        id: 'violet',
        label: 'Violet',
        primary: '#8b5cf6',
        primaryHover: '#a78bfa',
        glow: 'rgba(139,92,246,0.5)',
        etherColors: ['#5227FF', '#9F7AEA', '#B19EEF'],
    },
    indigo: {
        id: 'indigo',
        label: 'Indigo',
        primary: '#6366f1',
        primaryHover: '#818cf8',
        glow: 'rgba(99,102,241,0.5)',
        etherColors: ['#4338CA', '#6366F1', '#A5B4FC'],
    },
    blue: {
        id: 'blue',
        label: 'Blue',
        primary: '#3b82f6',
        primaryHover: '#60a5fa',
        glow: 'rgba(59,130,246,0.5)',
        etherColors: ['#1D4ED8', '#3B82F6', '#93C5FD'],
    },
    cyan: {
        id: 'cyan',
        label: 'Cyan',
        primary: '#06b6d4',
        primaryHover: '#22d3ee',
        glow: 'rgba(6,182,212,0.5)',
        etherColors: ['#0E7490', '#06B6D4', '#67E8F9'],
    },
    emerald: {
        id: 'emerald',
        label: 'Emerald',
        primary: '#10b981',
        primaryHover: '#34d399',
        glow: 'rgba(16,185,129,0.5)',
        etherColors: ['#047857', '#10B981', '#6EE7B7'],
    },
    rose: {
        id: 'rose',
        label: 'Rose',
        primary: '#f43f5e',
        primaryHover: '#fb7185',
        glow: 'rgba(244,63,94,0.5)',
        etherColors: ['#BE123C', '#F43F5E', '#FDA4AF'],
    },
    amber: {
        id: 'amber',
        label: 'Amber',
        primary: '#f59e0b',
        primaryHover: '#fbbf24',
        glow: 'rgba(245,158,11,0.5)',
        etherColors: ['#B45309', '#F59E0B', '#FDE68A'],
    },
};
export const ACCENT_IDS = Object.keys(ACCENT_PRESETS);
export const useSettingsStore = create()(persist((set) => ({
    persona: 'calm_friend',
    scoreThreshold: 35,
    cooldownSeconds: 180,
    interventionFrequency: DEFAULT_FREQUENCY,
    muted: false,
    ttsEngine: 'auto',
    toughLoveExplicitAllowed: false,
    accentColor: 'violet',
    hasCompletedOnboarding: false,
    lastDailySetupDate: '',
    setPersona: (persona) => set({ persona }),
    setThreshold: (scoreThreshold) => set({ scoreThreshold }),
    setCooldown: (cooldownSeconds) => set({ cooldownSeconds }),
    setInterventionFrequency: (level) => {
        const preset = FREQUENCY_PRESETS[level];
        set({
            interventionFrequency: level,
            scoreThreshold: preset.scoreThreshold,
            cooldownSeconds: preset.cooldownSeconds,
        });
    },
    toggleMute: () => set((state) => ({ muted: !state.muted })),
    setTtsEngine: (ttsEngine) => set({ ttsEngine }),
    setToughLoveExplicitAllowed: (toughLoveExplicitAllowed) => set({ toughLoveExplicitAllowed }),
    setAccentColor: (accentColor) => set({ accentColor }),
    setHasCompletedOnboarding: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),
    setLastDailySetupDate: (lastDailySetupDate) => set({ lastDailySetupDate }),
}), {
    name: 'norot-settings',
}));
