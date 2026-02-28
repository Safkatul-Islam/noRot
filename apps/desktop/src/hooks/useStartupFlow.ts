import { useEffect } from 'react';
import { getNorotAPI } from '@/lib/norot-api';
import { useStartupFlowStore } from '@/stores/startup-flow-store';

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useStartupFlow() {
  const screen = useStartupFlowStore((s) => s.screen);
  const setScreen = useStartupFlowStore((s) => s.setScreen);
  const goToDailySetup = useStartupFlowStore((s) => s.goToDailySetup);
  const goToContinuePrompt = useStartupFlowStore((s) => s.goToContinuePrompt);
  const goToDashboard = useStartupFlowStore((s) => s.goToDashboard);

  // Initial load — decide which screen to show
  useEffect(() => {
    getNorotAPI().getSettings().then((settings) => {
      if (!settings.hasCompletedOnboarding) {
        setScreen('first-time-welcome');
      } else if (settings.lastDailySetupDate === todayDateStr()) {
        setScreen('continue-prompt');
      } else {
        setScreen('daily-setup');
      }
    }).catch(() => {
      setScreen('daily-setup');
    });
  }, [setScreen]);

  return { screen, goToDailySetup, goToContinuePrompt, goToDashboard };
}
