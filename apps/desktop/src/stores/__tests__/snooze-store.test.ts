import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSnoozeStore } from '../snooze-store';

describe('snooze-store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('schedules a local clear timer when snooze is set', () => {
    useSnoozeStore.getState().startSnooze(1_000);

    expect(useSnoozeStore.getState().snoozedUntil).not.toBeNull();
    vi.advanceTimersByTime(1_000);
    expect(useSnoozeStore.getState().snoozedUntil).toBeNull();
  });

  it('clears snooze immediately when duration is 0', () => {
    useSnoozeStore.getState().startSnooze(1_000);
    expect(useSnoozeStore.getState().snoozedUntil).not.toBeNull();

    useSnoozeStore.getState().startSnooze(0);
    expect(useSnoozeStore.getState().snoozedUntil).toBeNull();
  });

  it('cancels snooze and clears timer', () => {
    useSnoozeStore.getState().startSnooze(5_000);
    expect(useSnoozeStore.getState().snoozedUntil).not.toBeNull();

    useSnoozeStore.getState().cancelSnooze();
    expect(useSnoozeStore.getState().snoozedUntil).toBeNull();

    vi.advanceTimersByTime(5_000);
    expect(useSnoozeStore.getState().snoozedUntil).toBeNull();
  });

  it('isSnoozeActive returns true when snoozed', () => {
    useSnoozeStore.getState().startSnooze(1_000);
    expect(useSnoozeStore.getState().snoozedUntil).not.toBeNull();
  });
});
