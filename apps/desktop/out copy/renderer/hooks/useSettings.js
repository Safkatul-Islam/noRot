import { useEffect } from 'react';
import { getNorotAPI } from '@/lib/norot-api';
import { useSettingsStore } from '@/stores/settings-store';
import { useAppStore } from '@/stores/app-store';
import { frequencyFromSettings, FREQUENCY_PRESETS } from '@/lib/frequency-presets';
function todayDateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function useSettings() {
    const { persona, interventionFrequency, muted, ttsEngine, toughLoveExplicitAllowed, hasCompletedOnboarding, lastDailySetupDate, setPersona, setThreshold, setCooldown, setInterventionFrequency, toggleMute, setTtsEngine, setToughLoveExplicitAllowed, setHasCompletedOnboarding, setLastDailySetupDate, } = useSettingsStore();
    useEffect(() => {
        const api = getNorotAPI();
        api.getSettings().then((settings) => {
            setPersona(settings.persona);
            setToughLoveExplicitAllowed(settings.toughLoveExplicitAllowed ?? false);
            setThreshold(settings.scoreThreshold);
            setCooldown(settings.cooldownSeconds);
            if (settings.muted !== muted)
                toggleMute();
            setHasCompletedOnboarding(settings.hasCompletedOnboarding ?? false);
            setLastDailySetupDate(settings.lastDailySetupDate ?? '');
            // Snap existing threshold + cooldown to the closest frequency preset
            const level = frequencyFromSettings(settings.scoreThreshold, settings.cooldownSeconds);
            setInterventionFrequency(level);
            if (settings.ttsEngine)
                setTtsEngine(settings.ttsEngine);
        });
        // Only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const updatePersona = async (p) => {
        setPersona(p);
        const api = getNorotAPI();
        await api.updateSettings({ persona: p });
    };
    const enableExplicitToughLove = async () => {
        setToughLoveExplicitAllowed(true);
        const api = getNorotAPI();
        await api.updateSettings({ toughLoveExplicitAllowed: true });
    };
    const updateFrequency = async (level) => {
        const preset = FREQUENCY_PRESETS[level];
        setInterventionFrequency(level);
        const api = getNorotAPI();
        await api.updateSettings({
            scoreThreshold: preset.scoreThreshold,
            cooldownSeconds: preset.cooldownSeconds,
        });
    };
    const updateMuted = async () => {
        toggleMute();
        const api = getNorotAPI();
        await api.updateSettings({ muted: !muted });
    };
    const updateTtsEngine = async (engine) => {
        setTtsEngine(engine);
        const api = getNorotAPI();
        await api.updateSettings({ ttsEngine: engine });
    };
    // Mark onboarding complete — does NOT start telemetry (that waits for daily setup)
    const completeOnboarding = async () => {
        setHasCompletedOnboarding(true);
        const api = getNorotAPI();
        await api.updateSettings({ hasCompletedOnboarding: true });
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
        }
        else {
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
        }
        else {
            useAppStore.getState().setTelemetryActive(false);
        }
        if (settings.autoShowTodoOverlay !== false) {
            await api.openTodoOverlay();
        }
    };
    return {
        persona,
        interventionFrequency,
        muted,
        ttsEngine,
        toughLoveExplicitAllowed,
        hasCompletedOnboarding,
        lastDailySetupDate,
        updatePersona,
        enableExplicitToughLove,
        updateFrequency,
        updateMuted,
        updateTtsEngine,
        completeOnboarding,
        completeDailySetup,
        continueSession,
    };
}
