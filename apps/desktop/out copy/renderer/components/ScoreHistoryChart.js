import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, } from 'recharts';
import { toFocusScore } from '@norot/shared';
import { useScoreStore } from '@/stores/score-store';
import { ChartTooltip } from '@/components/ChartTooltip';
import { TrendingUp } from 'lucide-react';
export function ScoreHistoryChart() {
    const scoreHistory = useScoreStore((s) => s.scoreHistory);
    const data = scoreHistory.map((entry) => ({
        ...entry,
        score: toFocusScore(entry.score),
        label: new Date(entry.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        }),
    }));
    if (data.length === 0) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center h-full min-h-[200px] text-text-muted", children: [_jsx(TrendingUp, { className: "size-10 mb-3 opacity-30" }), _jsx("p", { className: "text-sm", children: "No score history yet." }), _jsx("p", { className: "text-xs mt-1", children: "Your focus score will appear here as you work." })] }));
    }
    return (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(LineChart, { data: data, margin: { top: 8, right: 8, left: -16, bottom: 0 }, children: [_jsx("defs", { children: _jsxs("filter", { id: "line-neon", x: "-20%", y: "-20%", width: "140%", height: "140%", children: [_jsx("feGaussianBlur", { stdDeviation: "4", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] }) }), _jsx(XAxis, { dataKey: "label", stroke: "var(--color-text-muted)", tick: { fontSize: 9 }, interval: Math.max(Math.floor(data.length / 10), 1), axisLine: false, tickLine: false }), _jsx(YAxis, { stroke: "var(--color-text-muted)", tick: { fontSize: 9 }, domain: [0, 100], axisLine: false, tickLine: false }), _jsx(Tooltip, { content: _jsx(ChartTooltip, {}) }), _jsx(ReferenceLine, { y: 75, stroke: "#eab308", strokeDasharray: "4 4", strokeOpacity: 0.35, label: { value: 'Drifting', position: 'right', fontSize: 11, fill: '#eab30899' } }), _jsx(ReferenceLine, { y: 50, stroke: "#f97316", strokeDasharray: "4 4", strokeOpacity: 0.35, label: { value: 'Distracted', position: 'right', fontSize: 11, fill: '#f9731699' } }), _jsx(ReferenceLine, { y: 30, stroke: "#ef4444", strokeDasharray: "4 4", strokeOpacity: 0.35, label: { value: 'Procrastinating', position: 'right', fontSize: 11, fill: '#ef444499' } }), _jsx(ReferenceLine, { y: 10, stroke: "#a855f7", strokeDasharray: "4 4", strokeOpacity: 0.35, label: { value: 'Crisis', position: 'right', fontSize: 11, fill: '#a855f799' } }), _jsx(Line, { type: "monotone", dataKey: "score", stroke: "var(--color-primary)", strokeWidth: 8, opacity: 0.15, dot: false, fill: "none", name: "Focus", filter: "url(#line-neon)" }), _jsx(Line, { type: "monotone", dataKey: "score", stroke: "var(--color-primary)", strokeWidth: 2, dot: false, name: "Focus" })] }) }));
}
