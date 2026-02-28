import { create } from 'zustand';

export type StartupScreen =
  | 'loading'
  | 'first-time-welcome'
  | 'daily-setup'
  | 'continue-prompt'
  | 'dashboard';

interface StartupFlowState {
  screen: StartupScreen;
  setScreen: (screen: StartupScreen) => void;
  goToDailySetup: () => void;
  goToContinuePrompt: () => void;
  goToDashboard: () => void;
}

export const useStartupFlowStore = create<StartupFlowState>((set) => ({
  screen: 'loading',
  setScreen: (screen) => set({ screen }),
  goToDailySetup: () => set({ screen: 'daily-setup' }),
  goToContinuePrompt: () => set({ screen: 'continue-prompt' }),
  goToDashboard: () => set({ screen: 'dashboard' }),
}));
