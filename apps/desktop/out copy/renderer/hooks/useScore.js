import { useEffect } from 'react';
import { getNorotAPI } from '@/lib/norot-api';
import { useScoreStore } from '@/stores/score-store';
import { useAppStore } from '@/stores/app-store';
export function useScore() {
    const setScore = useScoreStore((s) => s.setScore);
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
                    if (!cancelled)
                        setConnectionStatus(res.ok ? 'connected' : 'disconnected');
                }
                finally {
                    clearTimeout(timeout);
                }
            }
            catch {
                if (!cancelled)
                    setConnectionStatus('disconnected');
            }
        };
        void pingApi();
        const pingInterval = setInterval(() => {
            void pingApi();
        }, 10_000);
        // Sync telemetry state from main process
        const setTelemetryActive = useAppStore.getState().setTelemetryActive;
        api.isTelemetryActive().then((active) => {
            if (!cancelled)
                setTelemetryActive(active);
        }).catch(() => { });
        // Hydrate latest score (best-effort).
        api.getLatestScore().then((latest) => {
            if (!latest || cancelled)
                return;
            setScore(latest.procrastinationScore, latest.severity, latest.reasons, latest.recommendation);
        }).catch(() => {
            // ignore
        });
        const unsubscribe = api.onScoreUpdate((data) => {
            setScore(data.procrastinationScore, data.severity, data.reasons, data.recommendation);
            addHistoryEntry({
                timestamp: new Date().toISOString(),
                score: data.procrastinationScore,
                severity: data.severity,
            });
        });
        return () => {
            cancelled = true;
            clearInterval(pingInterval);
            if (typeof unsubscribe === 'function')
                unsubscribe();
        };
    }, [setScore, addHistoryEntry, setConnectionStatus]);
}
