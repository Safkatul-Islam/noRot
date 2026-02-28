import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { GlassCard } from '@/components/GlassCard';
import { Trophy, RotateCcw, Clock } from 'lucide-react';
import { getNorotAPI } from '@/lib/norot-api';
import { getRandomHealthStat } from '@norot/shared';
const POLL_INTERVAL_MS = 30_000;
export function WinsCard() {
    const [wins, setWins] = useState({ refocusCount: 0, totalFocusedMinutes: 0 });
    const healthTip = useMemo(() => getRandomHealthStat(), []);
    useEffect(() => {
        const api = getNorotAPI();
        function fetchWins() {
            api.getWins().then(setWins).catch((err) => {
                console.error('[WinsCard] Failed to fetch wins:', err);
            });
        }
        fetchWins();
        const interval = setInterval(fetchWins, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, []);
    return (_jsxs(GlassCard, { variant: "dense", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Trophy, { className: "size-4 text-warning" }), "Your Wins Today"] }) }), _jsxs(CardContent, { children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { className: "flex items-center gap-3 rounded-lg border border-white/[0.06] bg-[var(--color-glass-well)] p-3", children: [_jsx(RotateCcw, { className: "size-5 text-success shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-2xl font-bold text-text-primary", children: wins.refocusCount }), _jsx("p", { className: "text-xs text-text-muted", children: "Refocuses" })] })] }), _jsxs("div", { className: "flex items-center gap-3 rounded-lg border border-white/[0.06] bg-[var(--color-glass-well)] p-3", children: [_jsx(Clock, { className: "size-5 text-primary shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-2xl font-bold text-text-primary", children: wins.totalFocusedMinutes }), _jsx("p", { className: "text-xs text-text-muted", children: "Focused Min" })] })] })] }), _jsxs("p", { className: "mt-3 text-xs italic text-text-muted leading-relaxed", children: ["Did you know? ", healthTip] })] })] }));
}
