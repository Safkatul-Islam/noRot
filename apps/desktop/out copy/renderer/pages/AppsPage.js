import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CategoryRulesEditor } from '@/components/CategoryRulesEditor';
import { BlurFade } from '@/components/effects/BlurFade';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';
import { AppWindow, Search, ChevronDown, Loader2 } from 'lucide-react';
const CATEGORY_COLORS = {
    productive: '#22c55e',
    neutral: '#6b7280',
    social: '#3b82f6',
    entertainment: '#f97316',
};
const TIME_RANGES = [
    { label: 'Last 24h', minutes: 1440 },
    { label: 'Last 7d', minutes: 10080 },
    { label: 'All time', minutes: undefined },
];
function formatSeconds(seconds) {
    if (seconds < 60)
        return '<1m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0)
        return `${h}h ${m}m`;
    return `${m}m`;
}
export function AppsPage() {
    const [appStats, setAppStats] = useState([]);
    const [rules, setRules] = useState([]);
    const [timeRange, setTimeRange] = useState(1440);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [rulesOpen, setRulesOpen] = useState(false);
    const statKey = (stat) => `${stat.appName}||${stat.domain ?? ''}`;
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
            if (!cancelled)
                setLoading(false);
        });
        return () => { cancelled = true; };
    }, [timeRange]);
    const getCategoryForApp = (stat) => {
        if (stat.domain) {
            const exact = rules.find((r) => r.matchType === 'title' && r.pattern === stat.domain);
            if (exact)
                return exact.category;
            const match = rules.find((r) => r.matchType === 'title' && stat.domain.includes(r.pattern));
            if (match)
                return match.category;
        }
        const exact = rules.find((r) => r.matchType === 'app' && r.pattern === stat.appName);
        if (exact)
            return exact.category;
        const match = rules.find((r) => r.matchType === 'app' && stat.appName.includes(r.pattern));
        return match ? match.category : stat.category;
    };
    const handleCategoryChange = (stat, newCategory) => {
        const matchType = stat.domain ? 'title' : 'app';
        const pattern = stat.domain ?? stat.appName;
        const existingIndex = rules.findIndex((r) => r.matchType === matchType && r.pattern === pattern);
        let updatedRules;
        if (existingIndex >= 0) {
            updatedRules = rules.map((r, i) => i === existingIndex
                ? { ...r, category: newCategory }
                : r);
        }
        else {
            updatedRules = [
                ...rules,
                {
                    id: crypto.randomUUID(),
                    matchType,
                    pattern,
                    category: newCategory,
                },
            ];
        }
        setRules(updatedRules);
        setAppStats((prev) => prev.map((s) => statKey(s) === statKey(stat) ? { ...s, category: newCategory } : s));
        const api = getNorotAPI();
        api.updateSettings({ categoryRules: updatedRules }).catch(() => { });
    };
    // Derive category totals from appStats
    const categoryTotals = appStats.reduce((acc, stat) => {
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
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-4", children: ['productive', 'neutral', 'social', 'entertainment'].map((cat, i) => {
                    const secs = categoryTotals[cat] || 0;
                    const pct = totalSeconds > 0 ? Math.round((secs / totalSeconds) * 100) : 0;
                    return (_jsx(BlurFade, { delay: i * 0.05, children: _jsx(GlassCard, { variant: "dense", children: _jsxs(CardContent, { className: "flex items-center gap-3 !pt-0 !pb-0", children: [_jsx("span", { className: "w-3 h-3 rounded-full shrink-0", style: {
                                            backgroundColor: CATEGORY_COLORS[cat],
                                            boxShadow: `0 0 6px ${CATEGORY_COLORS[cat]}50`,
                                        } }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-text-primary capitalize", children: cat }), _jsxs("p", { className: "text-xs text-text-muted tabular-nums", children: [formatSeconds(secs), " \u00B7 ", pct, "%"] })] })] }) }) }, cat));
                }) }), _jsx(BlurFade, { delay: 0.2, children: _jsxs(GlassCard, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(AppWindow, { className: "size-5 text-primary" }), "Apps"] }) }), _jsxs(CardContent, { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("div", { className: "flex rounded-lg border border-white/[0.06] overflow-hidden", children: TIME_RANGES.map((tr) => (_jsx("button", { onClick: () => setTimeRange(tr.minutes), className: cn('px-3 py-1.5 text-xs transition-colors', timeRange === tr.minutes
                                                    ? 'bg-primary/20 text-primary font-medium'
                                                    : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03]'), children: tr.label }, tr.label))) }), _jsxs("div", { className: "relative flex-1 min-w-[160px]", children: [_jsx(Search, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" }), _jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search apps...", spellCheck: false, className: "w-full bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md pl-8 pr-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/40" })] })] }), loading ? (_jsx("div", { className: "flex items-center justify-center py-8", children: _jsx(Loader2, { className: "size-5 text-text-muted animate-spin" }) })) : filteredApps.length === 0 ? (_jsx("p", { className: "text-sm text-text-muted text-center py-8", children: appStats.length === 0
                                        ? 'No app data yet. Start monitoring to see your apps here.'
                                        : 'No apps match your search.' })) : (_jsx("div", { className: "space-y-1.5", children: filteredApps.map((stat) => {
                                        const cat = getCategoryForApp(stat);
                                        const label = stat.domain ? `${stat.appName} (${stat.domain})` : stat.appName;
                                        return (_jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] backdrop-blur-[12px] px-2.5 py-1.5", children: [_jsx("span", { className: "text-sm font-medium text-text-primary truncate min-w-0 flex-1", children: label }), _jsx("span", { className: "text-xs text-text-muted tabular-nums shrink-0", children: formatSeconds(stat.totalSeconds) }), _jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [_jsx("span", { className: "w-2 h-2 rounded-full shrink-0", style: {
                                                                backgroundColor: CATEGORY_COLORS[cat] ?? '#6b7280',
                                                                boxShadow: `0 0 4px ${CATEGORY_COLORS[cat] ?? '#6b7280'}50`,
                                                            } }), _jsxs("select", { value: cat, onChange: (e) => handleCategoryChange(stat, e.target.value), className: "bg-[var(--color-glass-well)] border border-white/[0.06] rounded-md px-1.5 py-1 text-xs text-text-primary focus:outline-none focus:border-primary/40", children: [_jsx("option", { value: "productive", children: "Productive" }), _jsx("option", { value: "neutral", children: "Neutral" }), _jsx("option", { value: "social", children: "Social" }), _jsx("option", { value: "entertainment", children: "Entertainment" })] })] })] }, statKey(stat)));
                                    }) }))] })] }) }), _jsx(BlurFade, { delay: 0.25, children: _jsxs(GlassCard, { children: [_jsx(CardHeader, { children: _jsxs("button", { onClick: () => setRulesOpen((v) => !v), className: "flex items-center gap-2 w-full text-left", children: [_jsx(ChevronDown, { className: cn('size-4 text-text-muted transition-transform duration-200', rulesOpen ? 'rotate-0' : '-rotate-90') }), _jsx(CardTitle, { className: "flex items-center gap-2", children: "Advanced Rules" })] }) }), rulesOpen && (_jsx(CardContent, { children: _jsx(CategoryRulesEditor, {}) }))] }) })] }));
}
