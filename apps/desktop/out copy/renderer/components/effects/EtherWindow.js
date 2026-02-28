import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
export function EtherWindow({ className }) {
    return (_jsxs("div", { className: cn('relative rounded-2xl overflow-hidden', 'border border-white/[0.04]', 'shadow-[inset_0_2px_12px_rgba(0,0,0,0.4),inset_0_-2px_8px_rgba(0,0,0,0.3)]', className), children: [_jsx("div", { className: "absolute inset-0 pointer-events-none", style: {
                    background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.35) 100%)',
                } }), _jsx("div", { className: "absolute inset-0 pointer-events-none rounded-2xl", style: {
                    boxShadow: 'inset 0 0 20px rgba(var(--color-primary), 0.03)',
                } })] }));
}
