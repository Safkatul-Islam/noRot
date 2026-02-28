import { create } from 'zustand';
export const useStartupFlowStore = create((set) => ({
    screen: 'loading',
    setScreen: (screen) => set({ screen }),
    goToDailySetup: () => set({ screen: 'daily-setup' }),
    goToContinuePrompt: () => set({ screen: 'continue-prompt' }),
    goToDashboard: () => set({ screen: 'dashboard' }),
}));
