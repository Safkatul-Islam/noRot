import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
export function GlassToggle({ checked, onCheckedChange }) {
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { role: "switch", "aria-checked": checked, onClick: () => onCheckedChange(!checked), className: cn('relative w-9 h-5 rounded-full border transition-colors cursor-pointer', checked
                    ? 'bg-success/15 border-success/30'
                    : 'bg-white/[0.04] border-white/[0.08]'), children: _jsx(motion.span, { className: cn('absolute top-0.5 left-0.5 w-4 h-4 rounded-full', checked ? 'bg-success' : 'bg-text-muted'), animate: { x: checked ? 16 : 0 }, transition: { type: 'spring', stiffness: 500, damping: 30 }, style: {
                        boxShadow: checked
                            ? '0 0 8px var(--color-success)'
                            : '0 1px 3px rgba(0,0,0,0.3)',
                    } }) }), _jsx(AnimatePresence, { mode: "wait", children: _jsx(motion.span, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 }, className: cn('text-xs', checked ? 'text-success' : 'text-text-muted'), children: checked ? 'Monitoring' : 'Paused' }, checked ? 'on' : 'off') })] }));
}
