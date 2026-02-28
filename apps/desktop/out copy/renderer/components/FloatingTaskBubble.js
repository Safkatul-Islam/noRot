import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo } from 'react';
import { motion, useTime, useTransform } from 'motion/react';
import { cn } from '@/lib/utils';
const FLOAT_MS = 2_500;
export function FloatingTaskBubble({ bubble, index, onSettle }) {
    const time = useTime();
    const { radius, phase } = useMemo(() => {
        const base = 74;
        const r = base + (index % 3) * 14;
        const p = index * 1.35;
        return { radius: r, phase: p };
    }, [index]);
    const x = useTransform(time, (ms) => {
        const t = ms / 1000;
        const a = t * 0.9 + phase;
        return Math.cos(a) * radius;
    });
    const y = useTransform(time, (ms) => {
        const t = ms / 1000;
        const a = t * 0.9 + phase;
        const orbit = Math.sin(a) * (radius * 0.55);
        const bob = Math.sin(t * 2.1 + phase * 2.0) * 10;
        return orbit + bob;
    });
    useEffect(() => {
        const settleAt = bubble.spawnedAt + (bubble.delayMs ?? 0) + FLOAT_MS;
        const remaining = Math.max(0, settleAt - Date.now());
        const t = setTimeout(() => onSettle(bubble.id), remaining);
        return () => clearTimeout(t);
    }, [bubble.id, bubble.spawnedAt, bubble.delayMs, onSettle]);
    return (_jsx("div", { className: "absolute inset-0 pointer-events-none", children: _jsx("div", { className: "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2", children: _jsx(motion.div, { layoutId: `task-bubble-${bubble.id}`, style: { x, y }, initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: {
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: (bubble.delayMs ?? 0) / 1000,
                }, className: cn('max-w-[220px] px-3 py-1.5 rounded-full', 'text-xs font-medium text-text-primary/95 truncate', 'bg-[var(--color-glass)] backdrop-blur-xl', 'border border-primary/30', 'shadow-[0_14px_40px_-26px_rgba(0,0,0,0.95),0_0_26px_-18px_var(--color-glow-primary)]'), title: bubble.text, children: bubble.text }) }) }));
}
