import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PERSONAS, SEVERITY_BANDS, stripEmotionTags } from '@norot/shared';
import { SeverityBadge } from '@/components/SeverityBadge';
const responseLabels = {
    snoozed: 'Snoozed',
    dismissed: 'Dismissed',
    working: 'Working',
    pending: 'Pending',
};
const responseColors = {
    snoozed: '#eab308',
    dismissed: '#8888aa',
    working: '#22c55e',
    pending: '#8b5cf6',
};
/**
 * Compact timeline card — designed to hang off the flow timeline line.
 * Uses glass-well variant styling (inline) for minimal opacity.
 */
export function InterventionCard({ event, onClick }) {
    const borderColor = SEVERITY_BANDS[event.severity]?.color ?? '#8b5cf6';
    return (_jsxs("div", { className: "rounded-lg border border-white/[0.05] bg-[var(--color-glass-well)] backdrop-blur-[16px] p-2.5 space-y-1.5 transition-all duration-200 hover:border-white/[0.08] hover:bg-[var(--color-glass)] cursor-pointer", style: { boxShadow: `inset 3px 0 6px ${borderColor}25` }, onClick: onClick, role: "button", tabIndex: 0, onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
            }
        }, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-[10px] text-text-muted", children: new Date(event.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                }) }), _jsx(SeverityBadge, { severity: event.severity })] }), _jsx("span", { className: "text-[10px] text-text-muted", children: PERSONAS[event.persona].label })] }), _jsx("p", { className: "text-xs text-text-primary leading-relaxed line-clamp-2", children: stripEmotionTags(event.text) }), _jsx("span", { className: "text-[10px] font-medium", style: { color: responseColors[event.userResponse] }, children: responseLabels[event.userResponse] })] }));
}
