import { useCallback, useEffect, useMemo, useState } from 'react';
import type { InterventionEvent } from '@norot/shared';
import { getNorotAPI } from '@/lib/norot-api';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/SeverityBadge';
import { SEVERITY_BANDS, stripEmotionTags } from '@norot/shared';
import { Clock, X } from 'lucide-react';

export function InterventionOverlayPage() {
  const [intervention, setIntervention] = useState<InterventionEvent | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const api = getNorotAPI();

    // If the main process sent the IPC event before this window subscribed,
    // fetch the currently-active intervention so we never show a blank overlay.
    Promise.resolve((api as any).getActiveIntervention?.())
      .then((active: InterventionEvent | null | undefined) => {
        if (active) setIntervention(active);
      })
      .finally(() => setHydrated(true));

    const unsubNew = api.onIntervention((event) => {
      setIntervention(event);
    });

    const unsubDismiss = api.onInterventionDismiss?.(({ interventionId }) => {
      setIntervention((cur) => (cur?.id === interventionId ? null : cur));
    });

    const unsubResponse = api.onInterventionResponse?.(({ interventionId }) => {
      setIntervention((cur) => (cur?.id === interventionId ? null : cur));
    });

    return () => {
      unsubNew?.();
      unsubDismiss?.();
      unsubResponse?.();
    };
  }, []);

  // If we have no active intervention after hydration, close quickly so we don't
  // leave an always-on-top invisible "click eater" window around.
  useEffect(() => {
    if (!hydrated) return;
    if (intervention) return;
    const t = setTimeout(() => {
      try { window.close(); } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(t);
  }, [hydrated, intervention]);

  // Failsafe: if something clears the intervention but the window stays open,
  // don't leave an always-on-top overlay around forever.
  useEffect(() => {
    if (!intervention) return;
    const t = setTimeout(() => {
      if (document.visibilityState !== 'hidden') {
        try { window.close(); } catch { /* ignore */ }
      }
    }, 5 * 60 * 1000);
    return () => clearTimeout(t);
  }, [intervention]);

  const handleRespond = useCallback(async (id: string, response: 'snoozed' | 'dismissed' | 'working') => {
    try {
      await getNorotAPI().respondToIntervention(id, response);
    } finally {
      setIntervention(null);
    }
  }, []);

  const handleSnooze5Min = useCallback(async () => {
    if (!intervention) return;
    try {
      const api = getNorotAPI() as any;
      if (typeof api.setSnooze === 'function') {
        await api.setSnooze(5 * 60 * 1000);
      }
    } catch {
      // ignore
    }
    try {
      await handleRespond(intervention.id, 'snoozed');
    } finally {
      try { window.close(); } catch { /* ignore */ }
    }
  }, [handleRespond, intervention]);

  const handleDismiss = useCallback(async () => {
    if (!intervention) return;
    try {
      await handleRespond(intervention.id, 'dismissed');
    } finally {
      try { window.close(); } catch { /* ignore */ }
    }
  }, [handleRespond, intervention]);

  useEffect(() => {
    if (!intervention) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void handleDismiss();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); };
  }, [handleDismiss, intervention]);

  const severityColor = useMemo(() => {
    if (!intervention) return '#8b5cf6';
    return SEVERITY_BANDS[intervention.severity]?.color ?? '#8b5cf6';
  }, [intervention]);

  if (!intervention) {
    return <div className="h-screen w-screen bg-transparent" />;
  }

  return (
    <div className="h-screen w-screen bg-transparent p-3">
      <GlassCard
        variant="dense"
        className="h-full w-full py-4 px-4 gap-3 border border-white/10 hover:translate-y-0"
        style={{ boxShadow: `0 16px 50px -18px rgba(0,0,0,0.9), 0 0 26px -18px ${severityColor}` }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">Intervention</span>
            <SeverityBadge severity={intervention.severity} />
          </div>
          <span className="text-[11px] font-medium" style={{ color: severityColor }}>
            {SEVERITY_BANDS[intervention.severity]?.label}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <p className="text-sm text-text-primary leading-relaxed">
            {stripEmotionTags(intervention.text)}
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1 border-warning text-warning hover:bg-warning/10"
            onClick={() => { void handleSnooze5Min(); }}
          >
            <Clock className="size-4 mr-1" />
            Snooze 5 min
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-text-secondary"
            onClick={() => { void handleDismiss(); }}
          >
            <X className="size-4 mr-1" />
            Dismiss
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
