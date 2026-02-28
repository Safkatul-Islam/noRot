export function shouldAutoStartTelemetry(
  settings: {
    hasCompletedOnboarding: boolean;
    lastDailySetupDate: string;
    monitoringEnabled?: boolean;
  },
  today: string
): boolean {
  return (
    settings.hasCompletedOnboarding &&
    settings.lastDailySetupDate === today &&
    settings.monitoringEnabled !== false
  );
}

export function shouldAutoCreateTodoOverlay(
  settings: {
    hasCompletedOnboarding: boolean;
    lastDailySetupDate: string;
    autoShowTodoOverlay?: boolean;
  },
  today: string
): boolean {
  return (
    settings.hasCompletedOnboarding &&
    settings.lastDailySetupDate === today &&
    settings.autoShowTodoOverlay !== false
  );
}
