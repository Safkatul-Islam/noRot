import { create } from 'zustand';

type VoiceSource = 'elevenlabs' | 'fallback' | 'error' | 'unknown';

type AnalyserGetter = () => AnalyserNode | null;

interface VoiceStatusState {
  voiceSource: VoiceSource;
  isSpeaking: boolean;
  amplitude: number;
  analyserGetter: AnalyserGetter | null;
  setVoiceSource: (source: VoiceSource) => void;
  setIsSpeaking: (speaking: boolean) => void;
  setAmplitude: (v: number) => void;
  setAnalyserGetter: (getter: AnalyserGetter) => void;
}

export const useVoiceStatusStore = create<VoiceStatusState>((set) => ({
  voiceSource: 'unknown',
  isSpeaking: false,
  amplitude: 0,
  analyserGetter: null,
  setVoiceSource: (voiceSource) => set({ voiceSource }),
  setIsSpeaking: (isSpeaking) => set({ isSpeaking }),
  setAmplitude: (amplitude) => set({ amplitude }),
  setAnalyserGetter: (analyserGetter) => set({ analyserGetter }),
}));
