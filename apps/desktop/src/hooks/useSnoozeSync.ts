import { useEffect } from 'react';
import { getNorotAPI, isElectron } from '@/lib/norot-api';
import { useSnoozeStore } from '@/stores/snooze-store';

export function useSnoozeSync() {
  useEffect(() => {
    if (!isElectron()) return;
    const api = getNorotAPI();

    api.getSnoozeState()
      .then((s) => {
        // Avoid a startup race where the user snoozes before this resolves.
        const cur = useSnoozeStore.getState().snoozedUntil;
        if (cur === null) {
          useSnoozeStore.getState().setSnoozedUntil(s?.snoozedUntil ?? null);
        }
      })
      .catch(() => {});

    const unsub = api.onSnoozeUpdated?.((data) => {
      useSnoozeStore.getState().setSnoozedUntil(data?.snoozedUntil ?? null);
    });

    return () => { unsub?.(); };
  }, []);
}
