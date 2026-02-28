import { cn } from '@/lib/utils';

/**
 * EtherWindow — a deliberate transparent viewport into the fluid background.
 * Uses vignette edges + inset shadow + larger border-radius to look intentional
 * (like a porthole or lens) rather than a missing card.
 */
interface EtherWindowProps {
  className?: string;
}

export function EtherWindow({ className }: EtherWindowProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden',
        'border border-white/[0.04]',
        'shadow-[inset_0_2px_12px_rgba(0,0,0,0.4),inset_0_-2px_8px_rgba(0,0,0,0.3)]',
        className
      )}
    >
      {/* Vignette — darkened edges, bright center = porthole effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.35) 100%)',
        }}
      />
      {/* Subtle inner border glow */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          boxShadow: 'inset 0 0 20px rgba(var(--color-primary), 0.03)',
        }}
      />
    </div>
  );
}
