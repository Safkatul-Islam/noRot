import { useEffect, useState } from 'react';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { GlassCard } from '@/components/GlassCard';
import { BlurFade } from '@/components/effects/BlurFade';
import { AuroraText } from '@/components/effects/AuroraText';
import { ScoreGauge } from '@/components/ScoreGauge';
import { UsageChart } from '@/components/UsageChart';
import { WinsCard } from '@/components/WinsCard';

import { InterventionTimeline } from '@/components/InterventionTimeline';
import { AudioControls } from '@/components/AudioControls';
import { SEVERITY_BANDS, stripEmotionTags } from '@norot/shared';
import { useScoreStore } from '@/stores/score-store';
import { useAppStore } from '@/stores/app-store';
import { getNorotAPI } from '@/lib/norot-api';
import type { InterventionEvent } from '@norot/shared';
import { Activity, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardPageProps {
  interventions: InterventionEvent[];
  activeIntervention: InterventionEvent | null;
  onRespond: (id: string, response: 'snoozed' | 'dismissed' | 'working') => void;
}

export function DashboardPage({ interventions, activeIntervention, onRespond }: DashboardPageProps) {
  const { currentSeverity, reasons, recommendation } = useScoreStore();
  const setActivePage = useAppStore((s) => s.setActivePage);
  const activityStatus = useAppStore((s) => s.activityStatus);
  const telemetryActive = useAppStore((s) => s.telemetryActive);
  const [permissions, setPermissions] = useState<{
    screenRecording: boolean;
    status?: 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';
    canReadActiveWindow?: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const api = getNorotAPI();

    const check = async () => {
      try {
        if (typeof api.checkPermissions !== 'function') return;
        const p = await api.checkPermissions();
        if (cancelled) return;
        setPermissions(p);
      } catch {
        if (!cancelled) setPermissions({ screenRecording: false });
      }
    };

    void check();
    const interval = setInterval(() => { void check(); }, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const missingScreenPermission =
    permissions !== null && permissions.screenRecording !== true;

  const requestPermissions = async () => {
    try {
      const api = getNorotAPI();
      await api.requestPermissions?.();
    } catch {
      // ignore
    }
  };

  const activeInterventionText = stripEmotionTags(activeIntervention?.text ?? '').trim();
  const recommendationText = stripEmotionTags(recommendation?.text ?? '').trim();
  const hasScoreData = reasons.length > 0 || !!recommendation;
  const currentMessage = activeInterventionText
    ? activeInterventionText
    : recommendationText
      ? recommendationText
    : !hasScoreData
      ? 'Your focus score is based on time spent in apps, how often you switch between them, and whether you dismiss reminders.'
      : currentSeverity === 0
        ? 'Your focus is strong. Keep it up.'
        : 'No message for this score.';

  const uiCategory =
    activityStatus?.activeCategory === 'social' || activityStatus?.activeCategory === 'entertainment'
      ? 'unproductive'
      : activityStatus?.activeCategory ?? 'unknown';

  const visionLine = (() => {
    if (!activityStatus) return 'AI vision: waiting for telemetry…';
    if (activityStatus.visionStatus === 'disabled') return 'AI vision: off';
    if (activityStatus.visionStatus === 'classifying') {
      const domain = activityStatus.activeDomain ? ` (${activityStatus.activeDomain})` : '';
      return activityStatus.visionMessage
        ? `AI vision: ${activityStatus.visionMessage}`
        : `AI vision: analyzing ${activityStatus.appName}${domain}…`;
    }
    if (activityStatus.activitySource === 'vision') {
      return `AI vision: classified as ${uiCategory}`;
    }
    return 'AI vision: idle';
  })();

  return (
    <div className="flex flex-col gap-5 flex-1">
      {/* Row 1: Score Hero + Sim/History column */}
      <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Hero — uses "well" variant: most transparent, ether shows through the gauge */}
        <BlurFade delay={0} className="col-span-8 h-full min-h-0">
          <GlassCard glow variant="well" className="h-full min-h-0">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  <AuroraText className="text-base font-semibold">Focus Score</AuroraText>
                </span>
                <span
                  className="text-xs font-medium"
                  style={{ color: SEVERITY_BANDS[currentSeverity]?.color }}
                >
                  {SEVERITY_BANDS[currentSeverity]?.label}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <div className="flex items-stretch gap-6 h-full min-h-0">
                <div className="shrink-0 flex items-center">
                  <ScoreGauge />
                </div>
                <div className="flex-1 flex flex-col gap-4 min-w-0 py-2">
                  {!telemetryActive && (
                    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                      <p className="text-xs text-text-primary font-medium">
                        Monitoring is paused — your focus score won't update.
                      </p>
                      <p className="text-[11px] text-text-secondary mt-1">
                        Turn it on using the toggle in the bottom-right corner.
                      </p>
                    </div>
                  )}
                  {missingScreenPermission && (
                    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                      <p className="text-xs text-text-primary font-medium">
                        Screen Recording permission is off — focus scoring will be slow/inaccurate.
                      </p>
                      <p className="text-[11px] text-text-secondary mt-1">
                        Enable it in Settings so noRot can detect which app/site you’re using.
                        {permissions?.status ? ` (Status: ${permissions.status})` : ''}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={requestPermissions}>
                          Turn On Permissions
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setActivePage('settings')}>
                          Open Settings
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg border border-white/[0.06] bg-[var(--color-glass-well)] backdrop-blur-[16px] p-3">
                    <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">Current Message</p>
                    <p className="text-sm text-text-primary leading-relaxed">
                      {currentMessage}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/[0.06] bg-[var(--color-glass-well)] backdrop-blur-[16px] p-3">
                    <p className="text-xs text-text-muted mb-1 uppercase tracking-wider">AI Classification</p>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {visionLine}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs text-text-muted uppercase tracking-wider">Contributing Factors</p>
                    {reasons.length > 0 ? (
                      reasons.map((reason, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" style={{ boxShadow: '0 0 6px var(--color-glow-primary)' }} />
                          <p className="text-xs text-text-secondary leading-relaxed">
                            {reason}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-text-secondary leading-relaxed">
                        No strong signals yet. Your focus score is based on time spent in apps, how often you switch between them, and whether you dismiss reminders.
                      </p>
                    )}
                  </div>

                  <div className="mt-auto pt-2 border-t border-white/[0.06]">
                    <AudioControls
                      activeInterventionId={activeIntervention?.id ?? null}
                      onRespond={onRespond}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </GlassCard>
        </BlurFade>

        {/* Right column: History */}
        <div className="col-span-4 flex flex-col gap-5 min-h-0 h-full">
          <BlurFade delay={0.05} className="flex-1 min-h-0">
            <GlassCard className="h-full min-h-[180px] flex flex-col overflow-hidden py-5 gap-4">
              <CardHeader className="px-5">
                <CardTitle className="flex items-center gap-2">
                  <History className="size-4 text-warning" />
                  Intervention History
                  {interventions.length > 0 && (
                    <span className="text-xs text-text-muted font-normal ml-1">
                      ({interventions.length})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-hidden px-5">
                <InterventionTimeline interventions={interventions} />
              </CardContent>
            </GlassCard>
          </BlurFade>
        </div>
      </div>

      {/* Row 2: Wins + Usage Chart */}
      <div className="grid grid-cols-12 gap-5 shrink-0">
        <BlurFade delay={0.10} className="col-span-4">
          <WinsCard />
        </BlurFade>
        <BlurFade delay={0.15} className="col-span-8">
          <GlassCard variant="dense">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4 text-success" />
                Usage (Last 60 min)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UsageChart />
            </CardContent>
          </GlassCard>
        </BlurFade>
      </div>
    </div>
  );
}
