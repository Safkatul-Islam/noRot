import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { getNorotAPI } from '@/lib/norot-api';
import { useAppStore } from '@/stores/app-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useVoiceStatusStore } from '@/stores/voice-status-store';
import { useScoreStore } from '@/stores/score-store';
import { useSnoozeStore } from '@/stores/snooze-store';
import { VoiceService } from '../services/voice/voice-service';
export function useVoice() {
    const serviceRef = useRef(null);
    const shownToastRef = useRef(false);
    const shownMutedToastRef = useRef(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const settingsMuted = useSettingsStore((s) => s.muted);
    const ttsEngine = useSettingsStore((s) => s.ttsEngine);
    const toughLoveExplicitAllowed = useSettingsStore((s) => s.toughLoveExplicitAllowed);
    const snoozedUntil = useSnoozeStore((s) => s.snoozedUntil);
    const snoozeActive = typeof snoozedUntil === 'number' && snoozedUntil > Date.now();
    const muted = settingsMuted || snoozeActive;
    useEffect(() => {
        const voice = new VoiceService();
        serviceRef.current = voice;
        voice.setTtsEngine(ttsEngine);
        voice.setToughLoveExplicitAllowed(toughLoveExplicitAllowed);
        // Best-effort prime immediately (Electron often allows this without gesture).
        // Still keep the user-gesture unlock as a fallback for stricter Chromium policies.
        voice.getPlayer().prime().catch(() => { });
        // Prime/unlock the voice AudioContext on the first user gesture so
        // interventions can play audio even when triggered asynchronously (IPC).
        const unlock = () => {
            voice.getPlayer().prime().catch((err) => {
                console.warn('[voice] Audio prime/unlock failed:', err);
            });
        };
        window.addEventListener('pointerdown', unlock, { capture: true, once: true });
        window.addEventListener('keydown', unlock, { capture: true, once: true });
        // Expose analyser getter to store so VoiceOrb can read it
        useVoiceStatusStore.getState().setAnalyserGetter(() => voice.getAnalyser());
        // Poll unified isSpeaking (AudioPlayer + LocalTTS)
        let prevSpeaking = null;
        let prevSeverity = null;
        let lastBroadcastAt = 0;
        const interval = setInterval(() => {
            const speaking = voice.isSpeaking();
            setIsPlaying(speaking);
            useVoiceStatusStore.getState().setIsSpeaking(speaking);
            // Compute amplitude from analyser (normalized 0-1)
            const analyser = voice.getAnalyser();
            let amplitude = 0;
            // Only sample amplitude while actively speaking to avoid idle noise pulsing.
            if (speaking && analyser) {
                const data = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(data);
                let sum = 0;
                for (let i = 0; i < data.length; i++)
                    sum += data[i];
                amplitude = sum / data.length / 255;
            }
            useVoiceStatusStore.getState().setAmplitude(amplitude);
            // Broadcast voice status to overlay window:
            // - always while speaking (for smooth amplitude)
            // - whenever severity changes (orb color must match tray)
            // - plus a slow heartbeat so a newly-created overlay window syncs state
            const severity = useScoreStore.getState().currentSeverity;
            const now = Date.now();
            const heartbeat = !speaking && now - lastBroadcastAt > 1000;
            const shouldBroadcast = prevSpeaking === null ||
                prevSeverity === null ||
                speaking !== prevSpeaking ||
                severity !== prevSeverity ||
                speaking ||
                heartbeat;
            if (shouldBroadcast) {
                const lastWordBoundaryAt = useVoiceStatusStore.getState().lastWordBoundaryAt;
                window.norot?.broadcastVoiceStatus?.(speaking, severity, amplitude, lastWordBoundaryAt);
                lastBroadcastAt = now;
            }
            prevSpeaking = speaking;
            prevSeverity = severity;
        }, 200);
        const api = getNorotAPI();
        const unsubscribe = api.onPlayAudio(async (data) => {
            const nowSnoozedUntil = useSnoozeStore.getState().snoozedUntil;
            const nowSnoozeActive = typeof nowSnoozedUntil === 'number' && nowSnoozedUntil > Date.now();
            const nowSettingsMuted = useSettingsStore.getState().muted;
            const nowMuted = nowSnoozeActive || nowSettingsMuted;
            if (nowMuted) {
                if (!shownMutedToastRef.current) {
                    if (nowSnoozeActive) {
                        toast.info('Voice is snoozed (muted temporarily).', {
                            action: {
                                label: 'Cancel snooze',
                                onClick: () => useSnoozeStore.getState().cancelSnooze(),
                            },
                        });
                    }
                    else {
                        toast.info('Voice is muted in Settings.', {
                            action: {
                                label: 'Unmute',
                                onClick: () => {
                                    const store = useSettingsStore.getState();
                                    if (store.muted)
                                        store.toggleMute();
                                    getNorotAPI().updateSettings({ muted: false }).catch(() => { });
                                },
                            },
                        });
                    }
                    shownMutedToastRef.current = true;
                }
                return;
            }
            const result = await voice.speak(data, () => {
                useVoiceStatusStore.getState().triggerWordBoundary();
            });
            console.log('[voice] speak result: source=%s severity=%s error=%s errorCode=%s', result.source, data.severity, result.error ?? 'none', result.errorCode ?? 'none');
            // Report audio playback to main process
            const interventionId = data.interventionId;
            if (interventionId) {
                try {
                    await api.reportAudioPlayed(interventionId);
                }
                catch {
                    // not critical
                }
            }
            // Update voice status store
            if (result.source === 'elevenlabs') {
                useVoiceStatusStore.getState().setVoiceSource('elevenlabs');
            }
            else if (result.source === 'fallback') {
                useVoiceStatusStore.getState().setVoiceSource('fallback');
            }
            else if (result.source === 'local') {
                useVoiceStatusStore.getState().setVoiceSource('fallback');
            }
            else if (result.source === 'none' && result.error) {
                useVoiceStatusStore.getState().setVoiceSource('error');
            }
            if (result.source === 'fallback' && !shownToastRef.current) {
                if (result.errorCode === 401 || result.errorCode === 403) {
                    toast.warning('ElevenLabs key is invalid — check Settings.');
                }
                else {
                    toast.info('Using local voice. For natural AI voice, add your ElevenLabs key in Settings.', {
                        action: {
                            label: 'Settings',
                            onClick: () => useAppStore.getState().setActivePage('settings'),
                        },
                    });
                }
                shownToastRef.current = true;
            }
            if (result.source === 'none' && result.error && !shownToastRef.current) {
                toast.error('Voice playback failed. Check your audio settings.');
                shownToastRef.current = true;
            }
        });
        return () => {
            clearInterval(interval);
            if (typeof unsubscribe === 'function')
                unsubscribe();
            // Event listeners are `once: true`, so they should be gone, but remove defensively.
            window.removeEventListener('pointerdown', unlock, true);
            window.removeEventListener('keydown', unlock, true);
            voice.stop();
            voice.getPlayer().dispose();
            serviceRef.current = null;
        };
    }, []);
    useEffect(() => {
        const voice = serviceRef.current;
        if (!voice)
            return;
        if (muted)
            voice.mute();
        else
            voice.unmute();
    }, [muted]);
    useEffect(() => {
        serviceRef.current?.setTtsEngine(ttsEngine);
    }, [ttsEngine]);
    useEffect(() => {
        serviceRef.current?.setToughLoveExplicitAllowed(toughLoveExplicitAllowed);
    }, [toughLoveExplicitAllowed]);
    const mute = useCallback(() => {
        serviceRef.current?.mute();
    }, []);
    const unmute = useCallback(() => {
        serviceRef.current?.unmute();
    }, []);
    const stop = useCallback(() => {
        serviceRef.current?.stop();
    }, []);
    const getAnalyser = useCallback(() => {
        return serviceRef.current?.getAnalyser() ?? null;
    }, []);
    return { mute, unmute, stop, isMuted: muted, isPlaying, getAnalyser };
}
