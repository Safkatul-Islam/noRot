import { jsx as _jsx } from "react/jsx-runtime";
import { motion, AnimatePresence } from 'motion/react';
import { SEVERITY_BANDS } from '@norot/shared';
export function SeverityBadge({ severity }) {
    const band = SEVERITY_BANDS[severity];
    return (_jsx(AnimatePresence, { mode: "wait", children: _jsx(motion.span, { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.8 }, transition: { duration: 0.2 }, className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", style: {
                backgroundColor: `${band.color}20`,
                color: band.color,
                border: `1px solid ${band.color}40`,
                boxShadow: `0 0 10px ${band.color}40`,
            }, children: band.label }, severity) }));
}
