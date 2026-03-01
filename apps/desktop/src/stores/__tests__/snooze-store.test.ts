import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

async function loadStoreWithMock(mock: { isElectron: boolean; api: any }) {
  vi.resetModules();
  vi.doMock('@/lib/norot-api', () => ({
    isElectron: () => mock.isElectron,
    getNorotAPI: () => mock.api,
  }));
  const mod = await import('../snooze-store');
  return mod.useSnoozeStore;
}

describe('snooze-store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('schedules a local clear timer when not in Electron', async () => {
    const useSnoozeStore = await loadStoreWithMock({ isElectron: false, api: {} });
    useSnoozeStore.getState().startSnooze(1_000);

    expect(useSnoozeStore.getState().snoozedUntil).not.toBeNull();
    vi.advanceTimersByTime(1_000);
    expect(useSnoozeStore.getState().snoozedUntil).toBeNull();
  });

  it('delegates snooze to the Electron API when available', async () => {
    const api = {
      setSnooze: vi.fn().mockResolvedValue(undefined),
      cancelSnooze: vi.fn().mockResolvedValue(undefined),
    };
    const useSnoozeStore = await loadStoreWithMock({ isElectron: true, api });

    useSnoozeStore.getState().startSnooze(5_000);
    expect(api.setSnooze).toHaveBeenCalledWith(5_000);
    expect(useSnoozeStore.getState().snoozedUntil).not.toBeNull();

    useSnoozeStore.getState().cancelSnooze();
    expect(api.cancelSnooze).toHaveBeenCalledOnce();
    expect(useSnoozeStore.getState().snoozedUntil).toBeNull();
  });
});

