import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function formatNumber(value) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        return '';
    const rounded = Math.round(value * 100) / 100;
    return rounded.toFixed(2).replace(/\.?0+$/, '');
}
export function ChartTooltip({ active, payload, label }) {
    if (active !== true)
        return null;
    if (!Array.isArray(payload) || payload.length === 0)
        return null;
    // Recharts payload includes duplicate entries when multiple series share the same dataKey
    // (e.g., glow + main line). De-dupe by dataKey/name, keeping the last occurrence.
    const seen = new Set();
    const deduped = [];
    for (let i = payload.length - 1; i >= 0; i--) {
        const entry = payload[i];
        const keyRaw = typeof entry.dataKey === 'string'
            ? entry.dataKey
            : typeof entry.name === 'string'
                ? entry.name
                : null;
        if (!keyRaw || seen.has(keyRaw))
            continue;
        seen.add(keyRaw);
        deduped.unshift(entry);
    }
    return (_jsxs("div", { className: "rounded-lg border border-white/[0.08] bg-[var(--color-glass)] backdrop-blur-[14px] backdrop-saturate-[1.4] px-3 py-2 text-xs shadow-[0_12px_28px_-8px_rgba(0,0,0,0.9),0_0_16px_-8px_var(--color-glow-primary)]", children: [_jsx("p", { className: "text-text-secondary mb-1", children: typeof label === 'string' ? label : '' }), deduped.map((entry, i) => (_jsxs("p", { style: { color: typeof entry.color === 'string' ? entry.color : undefined }, children: [typeof entry.name === 'string' ? entry.name : 'Value', ": ", formatNumber(entry.value)] }, i)))] }));
}
