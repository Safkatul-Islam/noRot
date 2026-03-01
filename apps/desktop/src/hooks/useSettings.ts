import { useEffect } from 'react';
import { getNorotAPI } from '@/lib/norot-api';
import { useSettingsStore } from '@/stores/settings-store';
import { useAppStore } from '@/stores/app-store';
import type { Persona } from '@norot/shared';

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useSettings() {
  const {
    persona, muted, ttsEngine, toughLoveExplicitAllowed,
    hasCompletedOnboarding, lastDailySetupDate, selectedVoiceId,
    setPersona, setThreshold, setCooldown, toggleMute, setTtsEngine, setToughLoveExplicitAllowed,
    setHasCompletedOnboarding, setLastDailySetupDate, setSelectedVoiceId,
  } = useSettingsStore();

  useEffect(() => {
    const api = getNorotAPI();
    api.getSettings().then(
      (settings: { persona: Persona; toughLoveExplicitAllowed?: boolean; scoreThreshold: number; cooldownSeconds: number; muted: boolean; ttsEngine?: 'auto' | 'elevenlabs' | 'local'; hasCompletedOnboarding?: boolean; lastDailySetupDate?: string; selectedVoiceId?: string }) => {
        setPersona(settings.persona);
        setToughLoveExplicitAllowed(settings.toughLoveExplicitAllowed ?? false);
        setThreshold(settings.scoreThreshold);
        setCooldown(settings.cooldownSeconds);
        if (settings.muted !== muted) toggleMute();
        setHasCompletedOnboarding(settings.hasCompletedOnboarding ?? false);
        setLastDailySetupDate(settings.lastDailySetupDate ?? '');
        setSelectedVoiceId(settings.selectedVoiceId ?? '');

        if (settings.ttsEngine) setTtsEngine(settings.ttsEngine);
      }
    );
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatePersona = async (p: Persona) => {
    const prev = persona;
    setPersona(p);
    const api = getNorotAPI();
    try {
      await api.updateSettings({ persona: p });
    } catch (err) {
      console.error('[useSettings] Failed to update persona, reverting:', err);
      setPersona(prev);
    }
  };

  const enableExplicitToughLove = async () => {
    setToughLoveExplicitAllowed(true);
    const api = getNorotAPI();
    try {
      await api.updateSettings({ toughLoveExplicitAllowed: true });
    } catch (err) {
      console.error('[useSettings] Failed to enable explicit tough love, reverting:', err);
      setToughLoveExplicitAllowed(false);
    }
  };

  const updateMuted = async () => {
    toggleMute();
    const api = getNorotAPI();
    try {
      await api.updateSettings({ muted: !muted });
    } catch (err) {
      console.error('[useSettings] Failed to update muted setting, reverting:', err);
      toggleMute(); // revert optimistic update
    }
  };

  const updateSelectedVoiceId = async (voiceId: string) => {
    const prev = selectedVoiceId;
    setSelectedVoiceId(voiceId);
    const api = getNorotAPI();
    try {
      await api.updateSettings({
        selectedVoiceId: voiceId,
        // Clear cached agent so it gets recreated with the new voice
        elevenLabsAgentId: '',
        elevenLabsAgentPersona: '',
        elevenLabsAgentVersion: 0,
      });
    } catch (err) {
      console.error('[useSettings] Failed to update voice, reverting:', err);
      setSelectedVoiceId(prev);
    }
  };

  const updateTtsEngine = async (engine: 'auto' | 'elevenlabs' | 'local') => {
    const prev = ttsEngine;
    setTtsEngine(engine);
    const api = getNorotAPI();
    try {
      await api.updateSettings({ ttsEngine: engine });
    } catch (err) {
      console.error('[useSettings] Failed to update TTS engine, reverting:', err);
      setTtsEngine(prev);
    }
  };

  // Mark onboarding complete — does NOT start telemetry (that waits for daily setup)
  const completeOnboarding = async () => {
    setHasCompletedOnboarding(true);
    const api = getNorotAPI();
    try {
      await api.updateSettings({ hasCompletedOnboarding: true });
    } catch (err) {
      console.error('[useSettings] Failed to complete onboarding, reverting:', err);
      setHasCompletedOnboarding(false);
    }
  };

  // Mark daily setup complete, persist date, start telemetry, and show todo overlay
  const completeDailySetup = async () => {
    const today = todayDateStr();
    setLastDailySetupDate(today);
    const api = getNorotAPI();
    await api.updateSettings({ lastDailySetupDate: today });
    const settings = await api.getSettings();
    if (settings.monitoringEnabled !== false) {
      await api.startTelemetry();
      useAppStore.getState().setTelemetryActive(true);
    } else {
      useAppStore.getState().setTelemetryActive(false);
    }
    if (settings.autoShowTodoOverlay !== false) {
      await api.openTodoOverlay();
    }
  };

  // Continue an existing session — respect saved monitoring state
  const continueSession = async () => {
    const api = getNorotAPI();
    const settings = await api.getSettings();
    if (settings.monitoringEnabled !== false) {
      await api.startTelemetry();
      useAppStore.getState().setTelemetryActive(true);
    } else {
      useAppStore.getState().setTelemetryActive(false);
    }
    if (settings.autoShowTodoOverlay !== false) {
      await api.openTodoOverlay();
    }
  };

  return {
    persona,
    muted,
    ttsEngine,
    toughLoveExplicitAllowed,
    hasCompletedOnboarding,
    lastDailySetupDate,
    updatePersona,
    enableExplicitToughLove,
    updateMuted,
    updateTtsEngine,
    selectedVoiceId,
    updateSelectedVoiceId,
    completeOnboarding,
    completeDailySetup,
    continueSession,
  };
}
