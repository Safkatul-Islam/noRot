import { useEffect, useState, useCallback } from 'react';
import { getNorotAPI } from '@/lib/norot-api';
import type { InterventionEvent } from '@norot/shared';

const ACTIVE_INTERVENTION_TTL_MS = 30_000;

export function useInterventions() {
  const [interventions, setInterventions] = useState<InterventionEvent[]>([]);
  const [activeIntervention, setActiveIntervention] = useState<InterventionEvent | null>(null);

  useEffect(() => {
    const api = getNorotAPI();
    const unsubscribe = api.onIntervention((event: InterventionEvent) => {
      setInterventions((prev) => [event, ...prev].slice(0, 50));
      if (event.userResponse === 'pending') {
        setActiveIntervention(event);
        window.setTimeout(() => {
          setActiveIntervention((cur) => (cur?.id === event.id ? null : cur));
        }, ACTIVE_INTERVENTION_TTL_MS);
      }
    });

    const unsubDismiss = api.onInterventionDismiss?.((data: { interventionId: string }) => {
      const { interventionId } = data;
      setActiveIntervention((cur) => (cur?.id === interventionId ? null : cur));
      setInterventions((prev) =>
        prev.map((item) =>
          item.id === interventionId ? { ...item, userResponse: 'dismissed' } : item
        )
      );
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (typeof unsubDismiss === 'function') unsubDismiss();
    };
  }, []);

  const respondToIntervention = useCallback(
    async (id: string, response: 'snoozed' | 'dismissed' | 'working') => {
      const api = getNorotAPI();
      await api.respondToIntervention(id, response);
      setInterventions((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, userResponse: response } : item
        )
      );
      if (activeIntervention?.id === id) {
        setActiveIntervention(null);
      }
    },
    [activeIntervention]
  );

  return { interventions, activeIntervention, respondToIntervention };
}
