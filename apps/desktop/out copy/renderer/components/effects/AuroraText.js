import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
/**
 * Animated aurora gradient text effect from Magic UI.
 * Use sparingly — only on hero/primary text elements.
 */
export function AuroraText({ children, className }) {
    return (_jsxs("span", { className: cn('relative inline-flex', className), children: [_jsx("span", { className: "animate-aurora bg-[length:200%_auto] bg-clip-text text-transparent pointer-events-none absolute inset-0 [--aurora-1:var(--color-primary)] [--aurora-2:var(--color-primary-hover)]", style: {
                    backgroundImage: 'linear-gradient(90deg, var(--aurora-1), var(--aurora-2), var(--aurora-1), var(--aurora-2))',
                    animation: 'aurora 4s linear infinite',
                }, "aria-hidden": "true", children: children }), _jsx("span", { className: "bg-[length:200%_auto] bg-clip-text text-transparent", style: {
                    backgroundImage: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-hover), var(--color-primary), var(--color-primary-hover))',
                    animation: 'aurora 4s linear infinite',
                }, children: children })] }));
}
