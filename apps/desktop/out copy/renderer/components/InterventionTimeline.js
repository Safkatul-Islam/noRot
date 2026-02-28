import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InterventionCard } from '@/components/InterventionCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, } from '@/components/ui/dialog';
import { SeverityBadge } from '@/components/SeverityBadge';
import { History } from 'lucide-react';
import { SEVERITY_BANDS, PERSONAS, stripEmotionTags } from '@norot/shared';
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
 * Flow Timeline — vertical line on the left with severity-colored glowing nodes.
 * Each intervention hangs off the line as a compact card.
 */
export function InterventionTimeline({ interventions }) {
    const [selectedEvent, setSelectedEvent] = useState(null);
    if (interventions.length === 0) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center h-full p-5 text-center text-text-muted", children: [_jsx("div", { className: "absolute left-6 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" }), _jsx(History, { className: "size-8 mb-2 opacity-35" }), _jsx("p", { className: "text-sm text-text-secondary", children: "No interventions yet." }), _jsx("p", { className: "text-xs mt-1 max-w-[42ch] leading-relaxed", children: "When an intervention triggers, it will show up here." })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(ScrollArea, { className: "h-full", children: _jsxs("div", { className: "relative pl-6 pr-3", children: [_jsx("div", { className: "absolute left-[9px] top-0 bottom-0 w-px", style: {
                                background: 'linear-gradient(to bottom, transparent, var(--color-primary) 10%, var(--color-primary) 90%, transparent)',
                                opacity: 0.2,
                            } }), _jsx(AnimatePresence, { initial: false, children: interventions.map((event, i) => (_jsxs(motion.div, { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -12 }, transition: { duration: 0.25, delay: i * 0.03 }, className: "relative mb-3", children: [_jsx(TimelineNode, { event: event, isFirst: i === 0 }), _jsx(InterventionCard, { event: event, onClick: () => setSelectedEvent(event) })] }, event.id))) })] }) }), _jsx(InterventionDetailDialog, { event: selectedEvent, onClose: () => setSelectedEvent(null) })] }));
}
function TimelineNode({ event, isFirst }) {
    const color = SEVERITY_BANDS[event.severity]?.color ?? '#8b5cf6';
    return (_jsxs("div", { className: "absolute -left-6 top-3 flex items-center justify-center", style: { width: 18, height: 18 }, children: [isFirst && (_jsx("span", { className: "absolute inset-0 rounded-full animate-pulse-glow", style: { boxShadow: `0 0 8px ${color}60` } })), _jsx("span", { className: "w-2.5 h-2.5 rounded-full border-2", style: {
                    backgroundColor: color,
                    borderColor: 'var(--color-background)',
                    boxShadow: `0 0 6px ${color}50`,
                } })] }));
}
function InterventionDetailDialog({ event, onClose, }) {
    if (!event)
        return null;
    const severityColor = SEVERITY_BANDS[event.severity]?.color ?? '#8b5cf6';
    const ts = new Date(event.timestamp);
    const formattedDate = ts.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const formattedTime = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (_jsx(Dialog, { open: true, onOpenChange: (open) => { if (!open)
            onClose(); }, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsx("div", { className: "absolute inset-0 pointer-events-none rounded-xl", style: { background: `radial-gradient(ellipse at center, ${severityColor}15, transparent 70%)` } }), _jsxs(DialogHeader, { children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(SeverityBadge, { severity: event.severity }), _jsx(DialogTitle, { children: "Intervention Details" })] }), _jsx(DialogDescription, { asChild: true, children: _jsxs("div", { className: "flex items-center gap-2 text-sm text-text-muted mt-1", children: [_jsxs("span", { children: [formattedDate, ", ", formattedTime] }), _jsx("span", { className: "text-white/20", children: "|" }), _jsx("span", { children: PERSONAS[event.persona].label }), _jsx("span", { className: "text-white/20", children: "|" }), _jsxs("span", { children: ["Score: ", event.score] })] }) })] }), _jsx("p", { className: "text-sm text-text-primary leading-relaxed mt-2", children: stripEmotionTags(event.text) }), _jsxs("div", { className: "mt-3 text-xs", children: [_jsx("span", { className: "text-text-muted", children: "Your response: " }), _jsx("span", { className: "font-medium", style: { color: responseColors[event.userResponse] }, children: responseLabels[event.userResponse] })] })] }) }));
}
