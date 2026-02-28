import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CategoryRulesEditor } from '@/components/CategoryRulesEditor';
import { BlurFade } from '@/components/effects/BlurFade';
import { getNorotAPI } from '@/lib/norot-api';
import type { AppStats, CategoryRule, UserSettings } from '@/lib/electron-api';
import { cn } from '@/lib/utils';
import { AppWindow, Search, ChevronDown, Loader2 } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  productive: '#22c55e',
  neutral: '#6b7280',
  social: '#3b82f6',
  entertainment: '#f97316',
};

const TIME_RANGES = [
  { label: 'Last 24h', minutes: 1440 },
  { label: 'Last 7d', minutes: 10080 },
  { label: 'All time', minutes: undefined },
] as const;

function formatSeconds(seconds: number): string {
  if (seconds < 60) return '<1m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function AppsPage() {
  const [appStats, setAppStats] = useState<AppStats[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [timeRange, setTimeRange] = useState<number | undefined>(1440);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [rulesOpen, setRulesOpen] = useState(false);

  const statKey = (stat: AppStats): string =>
    `${stat.appName}||${stat.domain ?? ''}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const api = getNorotAPI();
    Promise.all([
      api.getAppStats(timeRange),
      api.getSettings(),
    ]).then(([stats, settings]) => {
      if (!cancelled) {
        setAppStats(stats);
        setRules(settings.categoryRules ?? []);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [timeRange]);

  const getCategoryForApp = (stat: AppStats): string => {
    if (stat.domain) {
      const exact = rules.find((r) => r.matchType === 'title' && r.pattern === stat.domain);
      if (exact) return exact.category;
      const match = rules.find((r) => r.matchType === 'title' && stat.domain!.includes(r.pattern));
      if (match) return match.category;
    }

    const exact = rules.find((r) => r.matchType === 'app' && r.pattern === stat.appName);
    if (exact) return exact.category;
    const match = rules.find((r) => r.matchType === 'app' && stat.appName.includes(r.pattern));
    return match ? match.category : stat.category;
  };

  const handleCategoryChange = (stat: AppStats, newCategory: string) => {
    const matchType: CategoryRule['matchType'] = stat.domain ? 'title' : 'app';
    const pattern = stat.domain ?? stat.appName;

    const existingIndex = rules.findIndex((r) => r.matchType === matchType && r.pattern === pattern);
    let updatedRules: CategoryRule[];
    if (existingIndex >= 0) {
      updatedRules = rules.map((r, i) =>
        i === existingIndex
          ? { ...r, category: newCategory as CategoryRule['category'] }
          : r
      );
    } else {
      updatedRules = [
        ...rules,
        {
          id: crypto.randomUUID(),
          matchType,
          pattern,
          category: newCategory as CategoryRule['category'],
        },
      ];
    }
    setRules(updatedRules);
    setAppStats((prev) =>
      prev.map((s) =>
        statKey(s) === statKey(stat) ? { ...s, category: newCategory } : s
      )
    );
    const api = getNorotAPI();
    api.updateSettings({ categoryRules: updatedRules }).catch(() => {});
  };

  // Derive category totals from appStats
  const categoryTotals = appStats.reduce<Record<string, number>>((acc, stat) => {
    const cat = getCategoryForApp(stat);
    acc[cat] = (acc[cat] || 0) + stat.totalSeconds;
    return acc;
  }, {});
  const totalSeconds = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  // Filter and sort apps
  const filteredApps = appStats
    .filter((s) => {
      const hay = `${s.appName} ${s.domain ?? ''}`.toLowerCase();
      return hay.includes(search.toLowerCase());
    })
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  return (
    <div className="flex flex-col gap-5">
      {/* Section A: Category Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {['productive', 'neutral', 'social', 'entertainment'].map((cat, i) => {
          const secs = categoryTotals[cat] || 0;
          const pct = totalSeconds > 0 ? Math.round((secs / totalSeconds) * 100) : 0;
          return (
            <BlurFade key={cat} delay={i * 0.05}>
              <GlassCard variant="dense">
                <CardContent className="flex items-center gap-3 !pt-0 !pb-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: CATEGORY_COLORS[cat],
                      boxShadow: `0 0 6px ${CATEGORY_COLORS[cat]}50`,
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary capitalize">
                      {cat}
                    </p>
                    <p className="text-xs text-text-muted tabular-nums">
                      {formatSeconds(secs)} &middot; {pct}%
                    </p>
                  </div>
                </CardContent>
              </GlassCard>
            </BlurFade>
          );
        })}
      </div>

      {/* Section B: App List */}
      <BlurFade delay={0.2}>
        <GlassCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AppWindow className="size-5 text-primary" />
              Apps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-lg border border-white/[0.06] overflow-hidden">
                {TIME_RANGES.map((tr) => (
                  <button
                    key={tr.label}
                    onClick={() => setTimeRange(tr.minutes)}
                    className={cn(
                      'px-3 py-1.5 text-xs transition-colors',
                      timeRange === tr.minutes
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'
                    )}
                  >
                    {tr.label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search apps..."
                  spellCheck={false}
                  className="w-full bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md pl-8 pr-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/40"
                />
              </div>
            </div>

            {/* App rows */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 text-text-muted animate-spin" />
              </div>
            ) : filteredApps.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">
                {appStats.length === 0
                  ? 'No app data yet. Start monitoring to see your apps here.'
                  : 'No apps match your search.'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {filteredApps.map((stat) => {
                  const cat = getCategoryForApp(stat);
                  const label = stat.domain ? `${stat.appName} (${stat.domain})` : stat.appName;
                  return (
                    <div
                      key={statKey(stat)}
                      className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] backdrop-blur-[12px] px-2.5 py-1.5"
                    >
                      <span className="text-sm font-medium text-text-primary truncate min-w-0 flex-1">
                        {label}
                      </span>
                      <span className="text-xs text-text-muted tabular-nums shrink-0">
                        {formatSeconds(stat.totalSeconds)}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: CATEGORY_COLORS[cat] ?? '#6b7280',
                            boxShadow: `0 0 4px ${CATEGORY_COLORS[cat] ?? '#6b7280'}50`,
                          }}
                        />
                        <select
                          value={cat}
                          onChange={(e) => handleCategoryChange(stat, e.target.value)}
                          className="bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-1.5 py-1 text-xs text-text-primary focus:outline-none focus:border-primary/40"
                        >
                          <option value="productive">Productive</option>
                          <option value="neutral">Neutral</option>
                          <option value="social">Social</option>
                          <option value="entertainment">Entertainment</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </GlassCard>
      </BlurFade>

      {/* Section C: Advanced Rules (collapsible) */}
      <BlurFade delay={0.25}>
        <GlassCard>
          <CardHeader>
            <button
              onClick={() => setRulesOpen((v) => !v)}
              className="flex items-center gap-2 w-full text-left"
            >
              <ChevronDown
                className={cn(
                  'size-4 text-text-muted transition-transform duration-200',
                  rulesOpen ? 'rotate-0' : '-rotate-90'
                )}
              />
              <CardTitle className="flex items-center gap-2">
                Advanced Rules
              </CardTitle>
            </button>
          </CardHeader>
          {rulesOpen && (
            <CardContent>
              <CategoryRulesEditor />
            </CardContent>
          )}
        </GlassCard>
      </BlurFade>
    </div>
  );
}
