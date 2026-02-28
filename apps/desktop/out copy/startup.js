export function shouldAutoStartTelemetry(settings, today) {
    return (settings.hasCompletedOnboarding &&
        settings.lastDailySetupDate === today &&
        settings.monitoringEnabled !== false);
}
export function shouldAutoCreateTodoOverlay(settings, today) {
    return (settings.hasCompletedOnboarding &&
        settings.lastDailySetupDate === today &&
        settings.autoShowTodoOverlay !== false);
}
