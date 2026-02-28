import { describe, it, expect } from 'vitest';
import { shouldAutoCreateTodoOverlay, shouldAutoStartTelemetry } from '../startup';
describe('shouldAutoStartTelemetry', () => {
    it('returns true when onboarding complete, daily setup today, and monitoring enabled', () => {
        expect(shouldAutoStartTelemetry({
            hasCompletedOnboarding: true,
            lastDailySetupDate: '2026-02-25',
            monitoringEnabled: true,
        }, '2026-02-25')).toBe(true);
    });
    describe('shouldAutoCreateTodoOverlay', () => {
        it('returns true when onboarding complete, daily setup today, and autoShowTodoOverlay enabled', () => {
            expect(shouldAutoCreateTodoOverlay({
                hasCompletedOnboarding: true,
                lastDailySetupDate: '2026-02-25',
                autoShowTodoOverlay: true,
            }, '2026-02-25')).toBe(true);
        });
        it('returns false when autoShowTodoOverlay is explicitly disabled', () => {
            expect(shouldAutoCreateTodoOverlay({
                hasCompletedOnboarding: true,
                lastDailySetupDate: '2026-02-25',
                autoShowTodoOverlay: false,
            }, '2026-02-25')).toBe(false);
        });
    });
    it('returns false when monitoring is explicitly paused', () => {
        expect(shouldAutoStartTelemetry({
            hasCompletedOnboarding: true,
            lastDailySetupDate: '2026-02-25',
            monitoringEnabled: false,
        }, '2026-02-25')).toBe(false);
    });
    it('returns false when onboarding is not complete', () => {
        expect(shouldAutoStartTelemetry({
            hasCompletedOnboarding: false,
            lastDailySetupDate: '2026-02-25',
            monitoringEnabled: true,
        }, '2026-02-25')).toBe(false);
    });
    it('returns false when daily setup was not done today', () => {
        expect(shouldAutoStartTelemetry({
            hasCompletedOnboarding: true,
            lastDailySetupDate: '2026-02-24',
            monitoringEnabled: true,
        }, '2026-02-25')).toBe(false);
    });
});
