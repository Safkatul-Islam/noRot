import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
import { MagicCard } from '@/components/effects/MagicCard';
const VARIANT_STYLES = {
    well: {
        bg: 'bg-[var(--color-glass-well)]',
        blur: 'backdrop-blur-[20px]',
        saturate: 'backdrop-saturate-[1.1]',
        shadow: 'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.15)]',
    },
    default: {
        bg: 'bg-[var(--color-glass)]',
        blur: 'backdrop-blur-[14px]',
        saturate: 'backdrop-saturate-[1.4]',
        shadow: 'shadow-[0_12px_36px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.2)]',
    },
    dense: {
        bg: 'bg-[var(--color-glass-dense)]',
        blur: 'backdrop-blur-[8px]',
        saturate: 'backdrop-saturate-[1.6]',
        shadow: 'shadow-[0_16px_44px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-1px_0_rgba(0,0,0,0.25)]',
    },
};
export function GlassCard({ children, className, glow = false, variant = 'default', style, }) {
    const v = VARIANT_STYLES[variant];
    const baseClassName = cn(
    // Core glass surface
    'relative overflow-hidden rounded-xl', v.bg, v.blur, v.saturate, v.shadow, 'py-6 flex flex-col gap-5', 
    // Border: luminance gradient (bright top, dark bottom via pseudo)
    'border border-transparent', 
    // Animated top-edge highlight shimmer
    'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px', 'before:bg-gradient-to-r before:from-transparent before:via-white/12 before:to-transparent', 'before:bg-[length:200%_100%] before:animate-border-flow', 
    // Noise overlay for glass texture (organic, not geometric)
    'after:pointer-events-none after:absolute after:inset-0 after:rounded-xl', 'after:bg-[url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")]', 'after:opacity-[0.025] after:mix-blend-overlay', 
    // Hover depth shift — lifts card, adds glow to shadow
    'transition-all duration-300', 'hover:-translate-y-[2px] hover:border-white/10', 'hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.9),0_0_20px_-10px_var(--color-glow-primary),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.2)]', className);
    if (glow) {
        return (_jsx(MagicCard, { className: cn(baseClassName, 'hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.9),0_0_32px_-8px_var(--color-glow-primary),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.2)]'), style: style, children: children }));
    }
    return (_jsx("div", { className: baseClassName, style: style, children: children }));
}
