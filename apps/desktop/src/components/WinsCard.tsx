import { useState, useEffect, useMemo } from 'react';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { GlassCard } from '@/components/GlassCard';
import { Trophy, RotateCcw, Clock } from 'lucide-react';
import { getNorotAPI } from '@/lib/norot-api';
import { getRandomHealthStat } from '@norot/shared';
import type { WinsData } from '@norot/shared';

const POLL_INTERVAL_MS = 30_000;

export function WinsCard() {
  const [wins, setWins] = useState<WinsData>({ refocusCount: 0, totalFocusedMinutes: 0 });
  const healthTip = useMemo(() => getRandomHealthStat(), []);

  useEffect(() => {
    const api = getNorotAPI();

    function fetchWins() {
      api.getWins().then(setWins).catch((err: unknown) => {
        console.error('[WinsCard] Failed to fetch wins:', err);
      });
    }

    fetchWins();
    const interval = setInterval(fetchWins, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <GlassCard variant="dense">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-4 text-warning" />
          Your Wins Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-[var(--color-glass-well)] p-3">
            <RotateCcw className="size-5 text-success shrink-0" />
            <div>
              <p className="text-2xl font-bold text-text-primary">{wins.refocusCount}</p>
              <p className="text-xs text-text-muted">Refocuses</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-[var(--color-glass-well)] p-3">
            <Clock className="size-5 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold text-text-primary">{wins.totalFocusedMinutes}</p>
              <p className="text-xs text-text-muted">Focused Min</p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs italic text-text-muted leading-relaxed">
          Did you know? {healthTip}
        </p>
      </CardContent>
    </GlassCard>
  );
}
