import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, } from 'recharts';
import { ChartTooltip } from '@/components/ChartTooltip';
import { getNorotAPI } from '@/lib/norot-api';
import { BarChart3 } from 'lucide-react';
export function UsageChart() {
    const [data, setData] = useState([]);
    const formatNumber = (value) => {
        if (typeof value !== 'number' || !Number.isFinite(value))
            return '';
        return (Math.round(value * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
    };
    useEffect(() => {
        const api = getNorotAPI();
        api.getUsageHistory().then((history) => {
            setData(history.map((p) => ({
                ...p,
                label: new Date(p.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            })));
        });
    }, []);
    if (data.length === 0) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center h-[200px] text-text-muted", children: [_jsx(BarChart3, { className: "size-10 mb-3 opacity-30" }), _jsx("p", { className: "text-sm", children: "No usage data yet." }), _jsx("p", { className: "text-xs mt-1", children: "Usage data will appear as you work." })] }));
    }
    return (_jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(AreaChart, { data: data, margin: { top: 8, right: 8, left: -16, bottom: 0 }, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "colorProductive", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#22c55e", stopOpacity: 0.2 }), _jsx("stop", { offset: "95%", stopColor: "#22c55e", stopOpacity: 0 })] }), _jsxs("linearGradient", { id: "colorDistracting", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#f97316", stopOpacity: 0.2 }), _jsx("stop", { offset: "95%", stopColor: "#f97316", stopOpacity: 0 })] }), _jsxs("filter", { id: "glow-green", x: "-20%", y: "-20%", width: "140%", height: "140%", children: [_jsx("feGaussianBlur", { stdDeviation: "3", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] }), _jsxs("filter", { id: "glow-orange", x: "-20%", y: "-20%", width: "140%", height: "140%", children: [_jsx("feGaussianBlur", { stdDeviation: "3", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] })] }), _jsx(XAxis, { dataKey: "label", stroke: "var(--color-text-muted)", tick: { fontSize: 9 }, interval: 9, axisLine: false, tickLine: false }), _jsx(YAxis, { stroke: "var(--color-text-muted)", tick: { fontSize: 9 }, axisLine: false, tickLine: false, tickFormatter: formatNumber }), _jsx(Tooltip, { content: _jsx(ChartTooltip, {}) }), _jsx(Area, { type: "monotone", dataKey: "productive", stroke: "#22c55e", fill: "none", strokeWidth: 6, opacity: 0.2, name: "Productive", filter: "url(#glow-green)" }), _jsx(Area, { type: "monotone", dataKey: "distracting", stroke: "#f97316", fill: "none", strokeWidth: 6, opacity: 0.2, name: "Distracting", filter: "url(#glow-orange)" }), _jsx(Area, { type: "monotone", dataKey: "productive", stroke: "#22c55e", fill: "url(#colorProductive)", strokeWidth: 2, name: "Productive" }), _jsx(Area, { type: "monotone", dataKey: "distracting", stroke: "#f97316", fill: "url(#colorDistracting)", strokeWidth: 2, name: "Distracting" })] }) }));
}
