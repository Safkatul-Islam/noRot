import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cancelSnooze, getSnoozedUntil, isSnoozeActive, onSnoozeUpdated, setSnooze } from '../snooze-state';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-01T12:00:00.000Z'));
  cancelSnooze();
});

afterEach(() => {
  cancelSnooze();
  vi.useRealTimers();
});

describe('snooze-state', () => {
  it('starts snooze and reports active', () => {
    setSnooze(5_000);
    const until = getSnoozedUntil();
    expect(typeof until).toBe('number');
    expect(isSnoozeActive(Date.now())).toBe(true);
  });

  it('expires snooze and emits updates', () => {
    const seen: Array<number | null> = [];
    const unsub = onSnoozeUpdated((d) => seen.push(d.snoozedUntil));

    setSnooze(1_000);
    expect(isSnoozeActive(Date.now())).toBe(true);

    vi.advanceTimersByTime(1_000);
    expect(getSnoozedUntil()).toBeNull();
    expect(isSnoozeActive(Date.now())).toBe(false);

    unsub();

    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen[seen.length - 1]).toBeNull();
  });

  it('cancelSnooze clears immediately', () => {
    setSnooze(10_000);
    expect(isSnoozeActive(Date.now())).toBe(true);
    cancelSnooze();
    expect(getSnoozedUntil()).toBeNull();
    expect(isSnoozeActive(Date.now())).toBe(false);
  });

  it('setSnooze(0) cancels', () => {
    setSnooze(10_000);
    setSnooze(0);
    expect(getSnoozedUntil()).toBeNull();
  });
});

