import { create } from 'zustand';
export const useScoreStore = create((set) => ({
    currentScore: 0,
    currentSeverity: 0,
    reasons: [],
    recommendation: null,
    scoreHistory: [],
    setScore: (score, severity, reasons, recommendation) => set({ currentScore: score, currentSeverity: severity, reasons, recommendation }),
    setSeverity: (severity) => set({ currentSeverity: severity }),
    addHistoryEntry: (entry) => set((state) => ({
        scoreHistory: [...state.scoreHistory.slice(-200), entry],
    })),
    reset: () => set({
        currentScore: 0,
        currentSeverity: 0,
        reasons: [],
        recommendation: null,
        scoreHistory: [],
    }),
}));
