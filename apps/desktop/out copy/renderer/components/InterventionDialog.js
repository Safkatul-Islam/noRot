import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/SeverityBadge';
import { ShineBorder } from '@/components/effects/ShineBorder';
import { Meteors } from '@/components/effects/Meteors';
import { ShimmerButton } from '@/components/effects/ShimmerButton';
import { CheckinVoicePanel } from '@/components/CheckinVoicePanel';
import { SEVERITY_BANDS, stripEmotionTags } from '@norot/shared';
import { getNorotAPI } from '@/lib/norot-api';
import { Clock, X, Briefcase, HelpCircle } from 'lucide-react';
function getSeverityDuration(severity) {
    if (severity === 2)
        return 3;
    if (severity === 3)
        return 2;
    return 1;
}
export function InterventionDialog({ intervention, onRespond }) {
    const open = intervention !== null;
    const shouldPulse = intervention && intervention.severity >= 3;
    const severityColor = intervention ? SEVERITY_BANDS[intervention.severity]?.color ?? '#8b5cf6' : '#8b5cf6';
    const useShine = intervention !== null && intervention.severity >= 2;
    const isHighSeverity = intervention !== null && intervention.severity >= 3;
    const [showCheckin, setShowCheckin] = useState(false);
    const [hasElevenLabsKey, setHasElevenLabsKey] = useState(false);
    // Check for ElevenLabs key when dialog opens
    useEffect(() => {
        if (open) {
            setShowCheckin(false);
            getNorotAPI().getSettings().then((s) => {
                setHasElevenLabsKey(Boolean(s.elevenLabsApiKey));
            }).catch(() => { });
        }
    }, [open]);
    const checkinContent = showCheckin ? (_jsxs("div", { className: "mt-4 space-y-3", children: [hasElevenLabsKey && (_jsx(CheckinVoicePanel, { onEnd: () => {
                    setShowCheckin(false);
                    if (intervention) {
                        onRespond(intervention.id, 'working');
                    }
                } })), _jsx("div", { className: "p-3 rounded-md bg-surface-secondary text-text-secondary text-sm", children: "What's blocking you? Try breaking your task into smaller steps." })] })) : null;
    const highSeverityFooter = intervention ? (_jsx(DialogFooter, { className: "mt-4", children: _jsxs("div", { className: "grid grid-cols-2 gap-2 w-full", children: [_jsxs(Button, { variant: "outline", className: "border-warning text-warning hover:bg-warning/10", onClick: () => onRespond(intervention.id, 'snoozed'), children: [_jsx(Clock, { className: "size-4 mr-1" }), "Snooze 5 min"] }), _jsxs(Button, { variant: "outline", className: "text-text-secondary", onClick: () => onRespond(intervention.id, 'dismissed'), children: [_jsx(X, { className: "size-4 mr-1" }), "Dismiss"] }), _jsxs(Button, { variant: "outline", className: "border-primary text-primary hover:bg-primary/10", onClick: () => setShowCheckin(true), children: [_jsx(HelpCircle, { className: "size-4 mr-1" }), "I'm stuck"] }), _jsxs(ShimmerButton, { shimmerColor: "#22c55e", className: "w-full", onClick: () => onRespond(intervention.id, 'working'), children: [_jsx(Briefcase, { className: "size-4" }), "I'm working!"] })] }) })) : null;
    const defaultFooter = intervention ? (_jsxs(DialogFooter, { className: "flex-row gap-2 mt-4", children: [_jsxs(Button, { variant: "outline", className: "flex-1 border-warning text-warning hover:bg-warning/10", onClick: () => onRespond(intervention.id, 'snoozed'), children: [_jsx(Clock, { className: "size-4 mr-1" }), "Snooze 5 min"] }), _jsxs(Button, { variant: "outline", className: "flex-1 text-text-secondary", onClick: () => onRespond(intervention.id, 'dismissed'), children: [_jsx(X, { className: "size-4 mr-1" }), "Dismiss"] }), _jsxs(ShimmerButton, { shimmerColor: "#22c55e", className: "flex-1", onClick: () => onRespond(intervention.id, 'working'), children: [_jsx(Briefcase, { className: "size-4" }), "I'm working!"] })] })) : null;
    const innerContent = intervention ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "absolute inset-0 pointer-events-none rounded-lg", style: { background: `radial-gradient(ellipse at center, ${severityColor}15, transparent 70%)` } }), intervention.severity === 4 && _jsx(Meteors, { count: 30 }), _jsxs(DialogHeader, { children: [_jsxs("div", { className: "flex items-center gap-3", children: [shouldPulse && (_jsxs("span", { className: "relative flex size-3", children: [_jsx("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" }), _jsx("span", { className: "relative inline-flex size-3 rounded-full bg-danger" })] })), _jsx(DialogTitle, { className: "text-text-primary", children: showCheckin ? 'Voice Check-in' : 'Intervention' }), _jsx(SeverityBadge, { severity: intervention.severity })] }), !showCheckin && (_jsx(DialogDescription, { className: "text-text-secondary mt-2", children: stripEmotionTags(intervention.text) }))] }), showCheckin ? checkinContent : (isHighSeverity ? highSeverityFooter : defaultFooter)] })) : null;
    const dialogContent = intervention ? (_jsx(DialogContent, { showCloseButton: false, className: useShine ? 'sm:max-w-md p-0 border-0 before:hidden' : 'sm:max-w-md', children: _jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 }, className: "relative", children: useShine ? (_jsx(ShineBorder, { color: severityColor, duration: getSeverityDuration(intervention.severity), innerClassName: "bg-[var(--color-glass)] backdrop-blur-xl", children: _jsx("div", { className: "p-6", children: innerContent }) })) : (innerContent) }) })) : null;
    return (_jsx(Dialog, { open: open, onOpenChange: (isOpen) => {
            if (!isOpen && intervention) {
                onRespond(intervention.id, 'dismissed');
            }
        }, children: _jsx(AnimatePresence, { children: intervention && dialogContent }) }));
}
