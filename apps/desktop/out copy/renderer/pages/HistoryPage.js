import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { motion } from 'motion/react';
import { GlassCard } from '@/components/GlassCard';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScoreHistoryChart } from '@/components/ScoreHistoryChart';
import { BlurFade } from '@/components/effects/BlurFade';
import { useScoreStore } from '@/stores/score-store';
import { SEVERITY_BANDS, toFocusScore } from '@norot/shared';
import { TrendingUp, BarChart3, AlertTriangle, Trophy, Clock, Activity, Layers, } from 'lucide-react';
export function HistoryPage() {
    const scoreHistory = useScoreStore((s) => s.scoreHistory);
    const stats = useMemo(() => {
        if (scoreHistory.length === 0) {
            return { avg: 0, worst: 0, best: 0, total: 0, trend: 'stable' };
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
        const trend = diff > 5 ? 'improving' : diff < -5 ? 'worsening' : 'stable';
        return { avg, worst, best, total, trend };
    }, [scoreHistory]);
    const severityDistribution = useMemo(() => {
        const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
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
        { icon: BarChart3, color: 'text-primary', label: 'Average', value: stats.avg },
        { icon: AlertTriangle, color: 'text-danger', label: 'Worst', value: stats.worst },
        { icon: Trophy, color: 'text-success', label: 'Best', value: stats.best },
    ];
    return (_jsxs("div", { className: "flex flex-col gap-5 h-full", children: [_jsxs("div", { className: "flex items-center gap-3 shrink-0", children: [statItems.map(({ icon: Icon, color, label, value }, i) => (_jsx(BlurFade, { delay: i * 0.05, children: _jsxs(motion.div, { animate: { y: [0, -3, 0] }, transition: { duration: 5, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }, className: "flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-[var(--color-glass-well)] backdrop-blur-[20px] px-4 py-3", children: [_jsx(Icon, { className: `size-5 ${color} shrink-0` }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-text-muted uppercase tracking-wider", children: label }), _jsx("p", { className: "text-xl font-bold text-text-primary tabular-nums", children: value })] })] }) }, label))), _jsx(BlurFade, { delay: 0.15, children: _jsxs(motion.div, { animate: { y: [0, -3, 0] }, transition: { duration: 5, repeat: Infinity, delay: 2.1, ease: 'easeInOut' }, className: "flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-[var(--color-glass-well)] backdrop-blur-[20px] px-4 py-3", children: [_jsx(TrendingUp, { className: `size-5 shrink-0 ${trendColor}` }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-text-muted uppercase tracking-wider", children: "Trend" }), _jsx("p", { className: `text-lg font-bold ${trendColor}`, children: trendLabel }), _jsxs("p", { className: "text-[10px] text-text-muted", children: [stats.total, " samples"] })] })] }) })] }), _jsxs("div", { className: "grid grid-cols-12 gap-5 flex-1 min-h-0", children: [_jsx(BlurFade, { delay: 0.1, className: "col-span-8 flex flex-col min-h-0", children: _jsxs(GlassCard, { variant: "dense", className: "flex-1 flex flex-col", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(TrendingUp, { className: "size-4 text-primary" }), "Focus History"] }) }), _jsxs(CardContent, { className: "flex-1 min-h-0", children: [_jsx("div", { className: "h-full min-h-[250px]", children: _jsx(ScoreHistoryChart, {}) }), _jsx("p", { className: "text-xs text-text-muted mt-2", children: "Higher is better. Dashed lines mark focus thresholds." })] })] }) }), _jsxs("div", { className: "col-span-4 flex flex-col gap-5 min-h-0", children: [_jsx(BlurFade, { delay: 0.15, children: _jsxs(GlassCard, { children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Layers, { className: "size-4 text-primary" }), "Severity Breakdown"] }) }), _jsx(CardContent, { className: "space-y-2.5", children: severityDistribution.map((band) => (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-2 h-2 rounded-full", style: { backgroundColor: band.color, boxShadow: `0 0 4px ${band.color}50` } }), _jsx("span", { className: "text-text-secondary", children: band.label })] }), _jsxs("span", { className: "text-text-muted tabular-nums", children: [band.count, " (", band.pct, "%)"] })] }), _jsx("div", { className: "h-1.5 bg-white/[0.04] rounded-full overflow-hidden", children: _jsx(motion.div, { className: "h-full rounded-full", initial: { width: 0 }, animate: { width: `${band.pct}%` }, transition: { duration: 0.6, ease: 'easeOut' }, style: {
                                                                backgroundColor: band.color,
                                                                boxShadow: `0 0 8px ${band.color}40`,
                                                            } }) })] }, band.severity))) })] }) }), _jsx(BlurFade, { delay: 0.2, className: "flex-1 min-h-0", children: _jsxs(GlassCard, { variant: "well", className: "h-full flex flex-col overflow-hidden", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Clock, { className: "size-4 text-primary" }), "Recent Scores"] }) }), _jsx(CardContent, { className: "flex-1 overflow-y-auto min-h-0", children: recentEntries.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-8 text-text-muted text-sm", children: [_jsx(Activity, { className: "size-8 mb-2 opacity-40" }), _jsx("p", { children: "No score data yet." }), _jsx("p", { className: "text-xs mt-1", children: "Scores will appear here as you work." })] })) : (_jsx("div", { className: "space-y-1", children: recentEntries.map((entry, i) => (_jsxs("div", { className: "flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-[10px] text-text-muted w-10 tabular-nums", children: new Date(entry.timestamp).toLocaleTimeString([], {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                    }) }), _jsx("span", { className: "w-1.5 h-1.5 rounded-full shrink-0", style: {
                                                                        backgroundColor: SEVERITY_BANDS[entry.severity]?.color,
                                                                        boxShadow: `0 0 4px ${SEVERITY_BANDS[entry.severity]?.color}50`,
                                                                    } }), _jsx("span", { className: "text-[10px]", style: { color: SEVERITY_BANDS[entry.severity]?.color }, children: SEVERITY_BANDS[entry.severity]?.label })] }), _jsx("span", { className: "text-sm font-medium tabular-nums", style: { color: SEVERITY_BANDS[entry.severity]?.color ?? '#8b5cf6' }, children: toFocusScore(entry.score) })] }, i))) })) })] }) })] })] })] }));
}
