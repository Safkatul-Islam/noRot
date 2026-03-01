import { create } from 'zustand';
import type { Severity, Recommendation } from '@norot/shared';

interface ScoreHistoryEntry {
  timestamp: string;
  score: number;
  severity: Severity;
}

interface ScoreState {
  currentScore: number;
  currentSeverity: Severity;
  reasons: string[];
  recommendation: Recommendation | null;
  scoreHistory: ScoreHistoryEntry[];
  setScore: (score: number, severity: Severity, reasons: string[], recommendation: Recommendation) => void;
  setLiveScore: (score: number, severity: Severity) => void;
  setSeverity: (severity: Severity) => void;
  addHistoryEntry: (entry: ScoreHistoryEntry) => void;
  reset: () => void;
}

export const useScoreStore = create<ScoreState>((set) => ({
  currentScore: 0,
  currentSeverity: 0,
  reasons: [],
  recommendation: null,
  scoreHistory: [],
  setScore: (score, severity, reasons, recommendation) =>
    set({ currentScore: score, currentSeverity: severity, reasons, recommendation }),
  setLiveScore: (score, severity) =>
    set({ currentScore: score, currentSeverity: severity }),
  setSeverity: (severity) => set({ currentSeverity: severity }),
  addHistoryEntry: (entry) =>
    set((state) => ({
      scoreHistory: [...state.scoreHistory.slice(-200), entry],
    })),
  reset: () =>
    set({
      currentScore: 0,
      currentSeverity: 0,
      reasons: [],
      recommendation: null,
      scoreHistory: [],
    }),
}));
