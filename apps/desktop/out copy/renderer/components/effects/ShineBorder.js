import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
export function ShineBorder({ children, className, innerClassName, color = '#8b5cf6', duration = 3, borderWidth = 1, }) {
    const colors = Array.isArray(color) ? color.join(', ') : `${color}, transparent, ${color}`;
    return (_jsxs("div", { className: cn('relative overflow-hidden rounded-xl p-[var(--border-width)]', className), style: {
            '--border-width': `${borderWidth}px`,
        }, children: [_jsx("div", { className: "absolute inset-[-100%] pointer-events-none", style: {
                    background: `conic-gradient(from 0deg, ${colors})`,
                    animation: `spin-around ${duration}s linear infinite`,
                } }), _jsx("div", { className: cn('relative z-10 rounded-[calc(0.75rem-var(--border-width))] bg-surface', innerClassName), children: children })] }));
}
