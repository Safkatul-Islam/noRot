import { useMemo } from 'react';

interface MeteorsProps {
  count?: number;
}

export function Meteors({ count = 20 }: MeteorsProps) {
  const meteors = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        top: `${Math.random() * 50 - 10}%`,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${1.5 + Math.random() * 2}s`,
        width: `${50 + Math.random() * 100}px`,
      })),
    [count]
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {meteors.map((m) => (
        <span
          key={m.id}
          className="absolute block"
          style={{
            top: m.top,
            left: m.left,
            width: m.width,
            height: '1px',
            background:
              'linear-gradient(90deg, rgba(168,85,247,0.8), rgba(168,85,247,0.3), transparent)',
            transform: 'rotate(215deg)',
            animation: `meteor ${m.duration} linear ${m.delay} infinite`,
            opacity: 0,
          }}
        >
          {/* Head glow */}
          <span
            className="absolute left-0 top-[-2px] w-1 h-1 rounded-full"
            style={{
              background: 'rgba(168,85,247,0.9)',
              boxShadow: '0 0 6px 2px rgba(168,85,247,0.5)',
            }}
          />
        </span>
      ))}
    </div>
  );
}
