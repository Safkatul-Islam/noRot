import { useEffect } from 'react';
import { getNorotAPI } from '@/lib/norot-api';
import { useScoreStore } from '@/stores/score-store';
import { useAppStore } from '@/stores/app-store';
import type { ScoreResponse, Severity } from '@norot/shared';

export function useScore() {
  const setScore = useScoreStore((s) => s.setScore);
  const setLiveScore = useScoreStore((s) => s.setLiveScore);
  const addHistoryEntry = useScoreStore((s) => s.addHistoryEntry);
  const setConnectionStatus = useAppStore((s) => s.setConnectionStatus);

  useEffect(() => {
    const api = getNorotAPI();

    let cancelled = false;

    const pingApi = async () => {
      try {
        const settings = await api.getSettings();
        const baseUrl = settings?.apiUrl || 'http://127.0.0.1:8000';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        try {
          const res = await fetch(`${baseUrl}/`, { signal: controller.signal });
          if (!cancelled) setConnectionStatus(res.ok ? 'connected' : 'disconnected');
        } finally {
          clearTimeout(timeout);
        }
      } catch {
        if (!cancelled) setConnectionStatus('disconnected');
      }
    };

    void pingApi();
    const pingInterval = setInterval(() => {
      void pingApi();
    }, 10_000);

    // Sync telemetry state from main process.
    // Only hydrate the latest score when telemetry is already running.
    // (If monitoring is paused, the last stored score can be from a previous session
    // and looks "wrong" right after opening the app.)
    const setTelemetryActive = useAppStore.getState().setTelemetryActive;
    api
      .isTelemetryActive()
      .then(async (active) => {
        if (cancelled) return;
        setTelemetryActive(active);

        if (!active) return;

        try {
          const latest = await api.getLatestScore();
          if (!latest || cancelled) return;
          setScore(
            latest.procrastinationScore,
            latest.severity,
            latest.reasons,
            latest.recommendation
          );
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // ignore
      });

    const unsubscribe = api.onScoreUpdate(
      (data: ScoreResponse) => {
        setScore(
          data.procrastinationScore,
          data.severity,
          data.reasons,
          data.recommendation
        );
        addHistoryEntry({
          timestamp: new Date().toISOString(),
          score: data.procrastinationScore,
          severity: data.severity,
        });
      }
    );

    const unsubscribeLive =
      typeof api.onLiveScoreUpdate === 'function'
        ? api.onLiveScoreUpdate((data: { procrastinationScore: number; severity: Severity }) => {
            if (cancelled || !data) return;
            setLiveScore(data.procrastinationScore, data.severity);
          })
        : null;

    return () => {
      cancelled = true;
      clearInterval(pingInterval);
      if (typeof unsubscribe === 'function') unsubscribe();
      if (typeof unsubscribeLive === 'function') unsubscribeLive();
    };
  }, [setScore, setLiveScore, addHistoryEntry, setConnectionStatus]);
}
