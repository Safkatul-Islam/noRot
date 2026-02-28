import { create } from 'zustand';
export const useVoiceStatusStore = create((set) => ({
    voiceSource: 'unknown',
    isSpeaking: false,
    amplitude: 0,
    lastWordBoundaryAt: 0,
    analyserGetter: null,
    setVoiceSource: (voiceSource) => set({ voiceSource }),
    setIsSpeaking: (isSpeaking) => set({ isSpeaking }),
    setAmplitude: (amplitude) => set({ amplitude }),
    setAnalyserGetter: (analyserGetter) => set({ analyserGetter }),
    triggerWordBoundary: () => set({ lastWordBoundaryAt: Date.now() }),
    resetWordBoundary: () => set({ lastWordBoundaryAt: 0 }),
}));
