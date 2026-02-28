import { cn } from '@/lib/utils';

interface ShimmerButtonProps {
  children: React.ReactNode;
  className?: string;
  shimmerColor?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function ShimmerButton({
  children,
  className,
  shimmerColor = 'var(--color-primary)',
  onClick,
  disabled = false,
  type = 'button',
}: ShimmerButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative overflow-hidden rounded-lg px-4 py-2 font-medium text-sm',
        'bg-surface border border-border text-text-primary',
        'hover:bg-surface-hover transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {/* Shimmer overlay */}
      {!disabled && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
          {/* Spinning border glow */}
          <div
            className="absolute inset-[-2px] rounded-lg opacity-60"
            style={{
              background: `conic-gradient(from 0deg, transparent 60%, ${shimmerColor} 80%, transparent 100%)`,
              animation: 'spin-around 3s linear infinite',
            }}
          />
          {/* Inner mask to show only the border */}
          <div className="absolute inset-[1px] rounded-[calc(0.5rem-1px)] bg-surface" />
          {/* Shimmer sweep */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `linear-gradient(90deg, transparent, ${shimmerColor}, transparent)`,
              animation: 'shimmer-slide 2s ease-in-out infinite',
            }}
          />
        </div>
      )}
      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-1.5">
        {children}
      </span>
    </button>
  );
}
