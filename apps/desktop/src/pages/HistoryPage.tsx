import { useMemo } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from '@/components/GlassCard';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScoreHistoryChart } from '@/components/ScoreHistoryChart';
import { BlurFade } from '@/components/effects/BlurFade';

import { useScoreStore } from '@/stores/score-store';
import { SEVERITY_BANDS, toFocusScore, getFocusBand } from '@norot/shared';
import {
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Trophy,
  Clock,
  Activity,
  Layers,
} from 'lucide-react';

export function HistoryPage() {
  const scoreHistory = useScoreStore((s) => s.scoreHistory);

  const stats = useMemo(() => {
    if (scoreHistory.length === 0) {
      return { avg: 0, worst: 0, best: 0, total: 0, trend: 'stable' as const };
    }
    const focusScores = scoreHistory.map((e) => toFocusScore(e.score));
    const avg = Math.round(focusScores.reduce((a, b) => a + b, 0) / focusScores.length);
    const worst = Math.min(...focusScores);
    const best = Math.max(...focusScores);
    const total = focusScores.length;

    const quarter = Math.max(1, Math.floor(focusScores.length / 4));
    const earlyAvg = focusScores.slice(0, quarter).reduce((a, b) => a + b, 0) / quarter;
    const lateAvg = focusScores.slice(-quarter).reduce((a, b) => a + b, 0) / quarter;
    const diff = lateAvg - earlyAvg;
    const trend = diff > 5 ? ('improving' as const) : diff < -5 ? ('worsening' as const) : ('stable' as const);

    return { avg, worst, best, total, trend };
  }, [scoreHistory]);

  const severityDistribution = useMemo(() => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    scoreHistory.forEach((e) => {
      counts[e.severity] = (counts[e.severity] || 0) + 1;
    });
    const total = scoreHistory.length || 1;
    return SEVERITY_BANDS.map((band) => ({
      ...band,
      count: counts[band.severity] || 0,
      pct: Math.round(((counts[band.severity] || 0) / total) * 100),
    }));
  }, [scoreHistory]);

  const recentEntries = useMemo(() => {
    return scoreHistory.slice(-20).reverse();
  }, [scoreHistory]);

  const trendColor = stats.trend === 'improving' ? 'text-success' : stats.trend === 'worsening' ? 'text-danger' : 'text-text-muted';
  const trendLabel = stats.trend === 'improving' ? 'Improving' : stats.trend === 'worsening' ? 'Worsening' : 'Stable';

  const statItems = [
    { icon: BarChart3, label: 'Average', value: getFocusBand(stats.avg).label, bandColor: getFocusBand(stats.avg).color },
    { icon: AlertTriangle, label: 'Worst', value: getFocusBand(stats.worst).label, bandColor: getFocusBand(stats.worst).color },
    { icon: Trophy, label: 'Best', value: getFocusBand(stats.best).label, bandColor: getFocusBand(stats.best).color },
  ];

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Top row: floating stat pills with staggered float animation */}
      <div className="flex items-center gap-3 shrink-0">
        {statItems.map(({ icon: Icon, label, value, bandColor }, i) => (
          <BlurFade key={label} delay={i * 0.05}>
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 5, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
              className="flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-[var(--color-glass-well)] backdrop-blur-[20px] px-4 py-3"
            >
              <Icon className="size-5 shrink-0" style={{ color: bandColor }} />
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
                <p className="text-sm font-bold" style={{ color: bandColor }}>{value}</p>
              </div>
            </motion.div>
          </BlurFade>
        ))}

        <BlurFade delay={0.15}>
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 5, repeat: Infinity, delay: 2.1, ease: 'easeInOut' }}
            className="flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-[var(--color-glass-well)] backdrop-blur-[20px] px-4 py-3"
          >
            <TrendingUp className={`size-5 shrink-0 ${trendColor}`} />
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Trend</p>
              <p className={`text-lg font-bold ${trendColor}`}>{trendLabel}</p>
              <p className="text-[10px] text-text-muted">{stats.total} samples</p>
            </div>
          </motion.div>
        </BlurFade>


      </div>

      {/* Main content: chart + insights */}
      <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">
        <BlurFade delay={0.1} className="col-span-8 flex flex-col min-h-0">
          <GlassCard variant="dense" className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                Focus History
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <div className="h-full min-h-[250px]">
                <ScoreHistoryChart />
              </div>
              <p className="text-xs text-text-muted mt-2">
                Higher is better. Dashed lines mark focus thresholds.
              </p>
            </CardContent>
          </GlassCard>
        </BlurFade>

        {/* Right column: insights */}
        <div className="col-span-4 flex flex-col gap-5 min-h-0">
          <BlurFade delay={0.15}>
            <GlassCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  Severity Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {severityDistribution.map((band) => (
                  <div key={band.severity} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: band.color, boxShadow: `0 0 4px ${band.color}50` }}
                        />
                        <span className="text-text-secondary">{band.label}</span>
                      </div>
                      <span className="text-text-muted tabular-nums">{band.count} ({band.pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${band.pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        style={{
                          backgroundColor: band.color,
                          boxShadow: `0 0 8px ${band.color}40`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </GlassCard>
          </BlurFade>

          <BlurFade delay={0.2} className="flex-1 min-h-0">
            <GlassCard variant="well" className="h-full flex flex-col overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  Recent Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0">
                {recentEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-text-muted text-sm">
                    <Activity className="size-8 mb-2 opacity-40" />
                    <p>No score data yet.</p>
                    <p className="text-xs mt-1">Scores will appear here as you work.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentEntries.map((entry, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-text-muted w-10 tabular-nums">
                            {new Date(entry.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: SEVERITY_BANDS[entry.severity]?.color,
                              boxShadow: `0 0 4px ${SEVERITY_BANDS[entry.severity]?.color}50`,
                            }}
                          />
                          <span
                            className="text-[10px]"
                            style={{ color: SEVERITY_BANDS[entry.severity]?.color }}
                          >
                            {SEVERITY_BANDS[entry.severity]?.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </GlassCard>
          </BlurFade>
        </div>
      </div>
    </div>
  );
}
