import { useEffect, useMemo, useState } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BlurFade } from '@/components/effects/BlurFade';
import { getNorotAPI } from '@/lib/norot-api';
import type { AppStats, CategoryRule } from '@/lib/electron-api';
import { cn } from '@/lib/utils';
import { ChevronDown, Loader2, Plus } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  productive: '#22c55e',
  neutral: '#6b7280',
  social: '#3b82f6',
  entertainment: '#f97316',
};

const CATEGORIES = ['productive', 'neutral', 'social', 'entertainment'] as const;

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
  const [loading, setLoading] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [addWebsiteOpen, setAddWebsiteOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newUrlCategory, setNewUrlCategory] = useState<string>('neutral');

  const statKey = (stat: AppStats): string =>
    `${stat.appName}||${stat.domain ?? ''}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const api = getNorotAPI();
    Promise.all([
      api.getAppStats(timeRange),
      api.getSettings(),
      api.getInstalledApps(),
    ]).then(([stats, settings, installedApps]) => {
      if (cancelled) return;

      // Merge installed apps: add synthetic entries for apps not already tracked
      const trackedNames = new Set(stats.map((s) => s.appName.toLowerCase()));
      for (const name of installedApps) {
        if (!trackedNames.has(name.toLowerCase())) {
          stats.push({
            appName: name,
            category: 'neutral',
            totalSeconds: 0,
            lastSeen: '',
          });
        }
      }

      setAppStats(stats);
      setRules(settings.categoryRules ?? []);
      setLoading(false);
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

  // Group apps by category, sorted by totalSeconds descending within each group
  const groupedApps = useMemo(() => {
    const groups: Record<string, AppStats[]> = {};
    for (const cat of CATEGORIES) {
      groups[cat] = [];
    }
    for (const stat of appStats) {
      const cat = getCategoryForApp(stat);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(stat);
    }
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => b.totalSeconds - a.totalSeconds);
    }
    return groups;
  }, [appStats, rules]);

  const totalSeconds = appStats.reduce((sum, s) => sum + s.totalSeconds, 0);

  const toggleGroup = (cat: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleAddWebsite = () => {
    const url = newUrl.trim();
    if (!url) return;

    const rule: CategoryRule = {
      id: crypto.randomUUID(),
      matchType: 'title',
      pattern: url,
      category: newUrlCategory as CategoryRule['category'],
    };
    const updatedRules = [...rules, rule];
    setRules(updatedRules);

    // Add a synthetic app entry so it shows up immediately as a ghost card
    setAppStats((prev) => [
      ...prev,
      {
        appName: url,
        domain: url,
        category: newUrlCategory,
        totalSeconds: 0,
        lastSeen: new Date().toISOString(),
      },
    ]);

    const api = getNorotAPI();
    api.updateSettings({ categoryRules: updatedRules }).catch(() => {});

    setNewUrl('');
    setNewUrlCategory('neutral');
    setAddWebsiteOpen(false);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top bar: time range + add website */}
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
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setAddWebsiteOpen(true)}
        >
          <Plus className="size-3.5 mr-1.5" />
          Add Website
        </Button>
      </div>

      {/* Loading spinner */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 text-text-muted animate-spin" />
        </div>
      ) : appStats.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-12">
          No app data yet. Start monitoring to see your apps here.
        </p>
      ) : (
        /* Category groups */
        CATEGORIES.map((cat, i) => {
          const apps = groupedApps[cat] ?? [];
          const groupSeconds = apps.reduce((sum, s) => sum + s.totalSeconds, 0);
          const pct = totalSeconds > 0 ? Math.round((groupSeconds / totalSeconds) * 100) : 0;
          const collapsed = collapsedGroups.has(cat);

          return (
            <BlurFade key={cat} delay={i * 0.05}>
              <GlassCard>
                <CardContent className="!p-0">
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(cat)}
                    className="flex items-center gap-3 w-full text-left px-4 py-3"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: CATEGORY_COLORS[cat],
                        boxShadow: `0 0 6px ${CATEGORY_COLORS[cat]}50`,
                      }}
                    />
                    <span className="text-sm font-semibold text-text-primary capitalize">
                      {cat}
                    </span>
                    <span className="text-xs text-text-muted tabular-nums">
                      {formatSeconds(groupSeconds)} &middot; {pct}%
                    </span>
                    <span className="text-[10px] text-text-muted bg-white/[0.06] rounded-full px-2 py-0.5">
                      {apps.length}
                    </span>
                    <div className="flex-1" />
                    <ChevronDown
                      className={cn(
                        'size-4 text-text-muted transition-transform duration-200',
                        collapsed ? '-rotate-90' : 'rotate-0'
                      )}
                    />
                  </button>

                  {/* App rows */}
                  {!collapsed && (
                    <div className="px-3 pb-3 space-y-1.5">
                      {apps.length === 0 ? (
                        <p className="text-xs text-text-muted text-center py-3">
                          No apps in this category
                        </p>
                      ) : (
                        apps.map((stat) => {
                          const isGhost = stat.totalSeconds === 0;
                          return (
                            <div
                              key={statKey(stat)}
                              className={cn(
                                'flex items-center gap-2 rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] backdrop-blur-[12px] px-2.5 py-1.5',
                                isGhost && 'opacity-50'
                              )}
                            >
                              <span className="text-sm font-medium text-text-primary truncate min-w-0 flex-1">
                                {stat.appName}
                                {stat.domain && stat.domain !== stat.appName && (
                                  <span className="text-text-muted font-normal"> ({stat.domain})</span>
                                )}
                              </span>
                              <span className="text-xs text-text-muted tabular-nums shrink-0">
                                {isGhost ? 'No usage yet' : formatSeconds(stat.totalSeconds)}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: CATEGORY_COLORS[getCategoryForApp(stat)] ?? '#6b7280',
                                    boxShadow: `0 0 4px ${CATEGORY_COLORS[getCategoryForApp(stat)] ?? '#6b7280'}50`,
                                  }}
                                />
                                <select
                                  value={getCategoryForApp(stat)}
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
                        })
                      )}
                    </div>
                  )}
                </CardContent>
              </GlassCard>
            </BlurFade>
          );
        })
      )}

      {/* Add Website Dialog */}
      <Dialog open={addWebsiteOpen} onOpenChange={setAddWebsiteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Website</DialogTitle>
            <DialogDescription>
              Pre-categorize a website or domain so it appears in the right group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-text-muted mb-1 block">URL or domain</label>
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="e.g. github.com"
                spellCheck={false}
                className="w-full bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/40"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Category</label>
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: CATEGORY_COLORS[newUrlCategory] ?? '#6b7280',
                    boxShadow: `0 0 4px ${CATEGORY_COLORS[newUrlCategory] ?? '#6b7280'}50`,
                  }}
                />
                <select
                  value={newUrlCategory}
                  onChange={(e) => setNewUrlCategory(e.target.value)}
                  className="flex-1 bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary/40"
                >
                  <option value="productive">Productive</option>
                  <option value="neutral">Neutral</option>
                  <option value="social">Social</option>
                  <option value="entertainment">Entertainment</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddWebsiteOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddWebsite} disabled={!newUrl.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

