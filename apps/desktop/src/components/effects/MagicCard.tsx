import { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface MagicCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  spotlightFrom?: string;
  spotlightTo?: string;
}

export function MagicCard({
  children,
  className,
  style,
  spotlightFrom = 'color-mix(in srgb, var(--color-primary) 26%, transparent)',
  spotlightTo = 'transparent',
}: MagicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [spotlightPos, setSpotlightPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    setSpotlightPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  return (
    <div
      ref={cardRef}
      className={cn('relative overflow-hidden', className)}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Spotlight overlay — pointer-events: none so it doesn't block clicks */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-10"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 250px at ${spotlightPos.x}px ${spotlightPos.y}px, ${spotlightFrom}, ${spotlightTo})`,
        }}
      />
      {children}
    </div>
  );
}
