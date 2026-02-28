import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { Activity, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function DashboardPage({ interventions, activeIntervention, onRespond }) {
    const { currentSeverity, reasons, recommendation } = useScoreStore();
    const setActivePage = useAppStore((s) => s.setActivePage);
    const [permissions, setPermissions] = useState(null);
    useEffect(() => {
        let cancelled = false;
        const api = getNorotAPI();
        const check = async () => {
            try {
                if (typeof api.checkPermissions !== 'function')
                    return;
                const p = await api.checkPermissions();
                if (cancelled)
                    return;
                setPermissions(p);
            }
            catch {
                if (!cancelled)
                    setPermissions({ screenRecording: false });
            }
        };
        void check();
        const interval = setInterval(() => { void check(); }, 5000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);
    const missingScreenPermission = permissions !== null &&
        (permissions.screenRecording !== true || permissions.canReadActiveWindow === false);
    const requestPermissions = async () => {
        try {
            const api = getNorotAPI();
            await api.requestPermissions?.();
        }
        catch {
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
    return (_jsxs("div", { className: "flex flex-col gap-5 flex-1", children: [_jsxs("div", { className: "grid grid-cols-12 gap-5 flex-1 min-h-0", children: [_jsx(BlurFade, { delay: 0, className: "col-span-8 h-full min-h-0", children: _jsxs(GlassCard, { glow: true, variant: "well", className: "h-full min-h-0", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center justify-between", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Activity, { className: "size-4 text-primary" }), _jsx(AuroraText, { className: "text-base font-semibold", children: "Focus Score" })] }), _jsx("span", { className: "text-xs font-medium", style: { color: SEVERITY_BANDS[currentSeverity]?.color }, children: SEVERITY_BANDS[currentSeverity]?.label })] }) }), _jsx(CardContent, { className: "flex-1 min-h-0", children: _jsxs("div", { className: "flex items-stretch gap-6 h-full min-h-0", children: [_jsx("div", { className: "shrink-0 flex items-center", children: _jsx(ScoreGauge, {}) }), _jsxs("div", { className: "flex-1 flex flex-col gap-4 min-w-0 py-2", children: [missingScreenPermission && (_jsxs("div", { className: "rounded-lg border border-primary/25 bg-primary/5 p-3", children: [_jsx("p", { className: "text-xs text-text-primary font-medium", children: "Screen Recording permission is off \u2014 focus scoring will be slow/inaccurate." }), _jsxs("p", { className: "text-[11px] text-text-secondary mt-1", children: ["Enable it in Settings so noRot can detect which app/site you\u2019re using.", permissions?.status ? ` (Status: ${permissions.status})` : ''] }), _jsxs("div", { className: "flex gap-2 mt-2", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: requestPermissions, children: "Turn On Permissions" }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => setActivePage('settings'), children: "Open Settings" })] })] })), _jsxs("div", { className: "rounded-lg border border-white/[0.06] bg-[var(--color-glass-well)] backdrop-blur-[16px] p-3", children: [_jsx("p", { className: "text-xs text-text-muted mb-1 uppercase tracking-wider", children: "Current Message" }), _jsx("p", { className: "text-sm text-text-primary leading-relaxed", children: currentMessage })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("p", { className: "text-xs text-text-muted uppercase tracking-wider", children: "Contributing Factors" }), reasons.length > 0 ? (reasons.map((reason, i) => (_jsxs("div", { className: "flex items-start gap-2", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0", style: { boxShadow: '0 0 6px var(--color-glow-primary)' } }), _jsx("p", { className: "text-xs text-text-secondary leading-relaxed", children: reason })] }, i)))) : (_jsx("p", { className: "text-xs text-text-secondary leading-relaxed", children: "No strong signals yet. Your focus score is based on time spent in apps, how often you switch between them, and whether you dismiss reminders." }))] }), _jsx("div", { className: "mt-auto pt-2 border-t border-white/[0.06]", children: _jsx(AudioControls, { activeInterventionId: activeIntervention?.id ?? null, onRespond: onRespond }) })] })] }) })] }) }), _jsx("div", { className: "col-span-4 flex flex-col gap-5 min-h-0 h-full", children: _jsx(BlurFade, { delay: 0.05, className: "flex-1 min-h-0", children: _jsxs(GlassCard, { className: "h-full min-h-[180px] flex flex-col overflow-hidden py-5 gap-4", children: [_jsx(CardHeader, { className: "px-5", children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(History, { className: "size-4 text-warning" }), "Intervention History", interventions.length > 0 && (_jsxs("span", { className: "text-xs text-text-muted font-normal ml-1", children: ["(", interventions.length, ")"] }))] }) }), _jsx(CardContent, { className: "flex-1 min-h-0 overflow-hidden px-5", children: _jsx(InterventionTimeline, { interventions: interventions }) })] }) }) })] }), _jsxs("div", { className: "grid grid-cols-12 gap-5 shrink-0", children: [_jsx(BlurFade, { delay: 0.10, className: "col-span-4", children: _jsx(WinsCard, {}) }), _jsx(BlurFade, { delay: 0.15, className: "col-span-8", children: _jsxs(GlassCard, { variant: "dense", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Activity, { className: "size-4 text-success" }), "Usage (Last 60 min)"] }) }), _jsx(CardContent, { children: _jsx(UsageChart, {}) })] }) })] })] }));
}
