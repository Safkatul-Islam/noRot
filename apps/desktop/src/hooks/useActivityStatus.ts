import { useEffect } from 'react';
import { getNorotAPI } from '@/lib/norot-api';
import { useAppStore } from '@/stores/app-store';

export function useActivityStatus() {
  const setActivityStatus = useAppStore((s) => s.setActivityStatus);

  useEffect(() => {
    const api = getNorotAPI();
    let cancelled = false;

    const unsub = api.onActivityStatus?.((data) => {
      if (cancelled || !data) return;
      setActivityStatus(data);
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [setActivityStatus]);
}

