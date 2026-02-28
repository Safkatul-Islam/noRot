import { cn } from '@/lib/utils';

interface ShineBorderProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  color?: string | string[];
  duration?: number;
  borderWidth?: number;
}

export function ShineBorder({
  children,
  className,
  innerClassName,
  color = '#8b5cf6',
  duration = 3,
  borderWidth = 1,
}: ShineBorderProps) {
  const colors = Array.isArray(color) ? color.join(', ') : `${color}, transparent, ${color}`;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-[var(--border-width)]',
        className
      )}
      style={
        {
          '--border-width': `${borderWidth}px`,
        } as React.CSSProperties
      }
    >
      {/* Spinning gradient border */}
      <div
        className="absolute inset-[-100%] pointer-events-none"
        style={{
          background: `conic-gradient(from 0deg, ${colors})`,
          animation: `spin-around ${duration}s linear infinite`,
        }}
      />
      {/* Content */}
      <div className={cn('relative z-10 rounded-[calc(0.75rem-var(--border-width))] bg-surface', innerClassName)}>
        {children}
      </div>
    </div>
  );
}
