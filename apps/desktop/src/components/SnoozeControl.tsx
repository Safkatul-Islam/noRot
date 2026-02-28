import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useSnoozeStore } from '@/stores/snooze-store';

interface SnoozeControlProps {
  activeInterventionId?: string | null;
  onRespond?: (id: string, response: 'snoozed' | 'dismissed' | 'working') => void;
}

export function SnoozeControl({ activeInterventionId, onRespond }: SnoozeControlProps) {
  const snoozedUntil = useSnoozeStore((s) => s.snoozedUntil);
  const startSnooze = useSnoozeStore((s) => s.startSnooze);
  const cancelSnooze = useSnoozeStore((s) => s.cancelSnooze);

  const [open, setOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState<number>(10);
  const [now, setNow] = useState(() => Date.now());
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  const isSnoozed = typeof snoozedUntil === 'number' && snoozedUntil > now;
  const remainingLabel = useMemo(() => {
    if (!isSnoozed || typeof snoozedUntil !== 'number') return null;
    const remainingMs = Math.max(0, snoozedUntil - now);
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [isSnoozed, snoozedUntil, now]);

  useEffect(() => {
    if (!isSnoozed) return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [isSnoozed]);

  useEffect(() => {
    if (!open) return;

    const updateRect = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setButtonRect(rect);
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choices = useMemo(
    () => ([
      { label: '5 min', minutes: 5 },
      { label: '15 min', minutes: 15 },
      { label: '30 min', minutes: 30 },
      { label: '60 min', minutes: 60 },
    ]),
    []
  );

  const applyMinutes = (minutes: number) => {
    const clampedMinutes = Math.min(240, Math.max(1, Math.floor(minutes)));
    startSnooze(clampedMinutes * 60 * 1000);
    setOpen(false);

    if (activeInterventionId && typeof onRespond === 'function') {
      onRespond(activeInterventionId, 'snoozed');
    }
  };

  const menuPosition = useMemo(() => {
    if (!buttonRect) return null;
    const MENU_WIDTH = 224; // tailwind w-56
    const MARGIN = 8;
    const top = Math.round(buttonRect.bottom + MARGIN);
    const left = Math.round(
      Math.min(
        window.innerWidth - MENU_WIDTH - MARGIN,
        Math.max(MARGIN, buttonRect.right - MENU_WIDTH)
      )
    );
    return { top, left, width: MENU_WIDTH };
  }, [buttonRect]);

  const buttonStyle = useMemo(() => {
    if (!buttonRect) return null;
    return {
      top: Math.round(buttonRect.top),
      left: Math.round(buttonRect.left),
      width: Math.round(buttonRect.width),
      height: Math.round(buttonRect.height),
    };
  }, [buttonRect]);

  const buttonContents = (
    <>
      <Clock className="size-4" />
      <span className="text-xs">{isSnoozed ? 'Snoozed' : 'Snooze'}</span>
      {isSnoozed ? (
        <span className="text-[10px] tabular-nums opacity-90 whitespace-nowrap">{remainingLabel ?? ''}</span>
      ) : (
        <ChevronDown className="size-3 opacity-70" />
      )}
    </>
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <motion.button
        ref={buttonRef}
        type="button"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={() => {
          if (isSnoozed) {
            cancelSnooze();
            setOpen(false);
            return;
          }
          setOpen((v) => !v);
        }}
        className={cn(
          'flex items-center gap-2 rounded-full px-3 py-1.5',
          'whitespace-nowrap',
          'bg-[var(--color-glass-well)] backdrop-blur-[14px]',
          'border border-white/[0.06] text-text-secondary',
          'transition-colors hover:text-text-primary hover:border-white/[0.10]',
          isSnoozed && 'border-warning/30 text-warning',
          open && 'opacity-0 pointer-events-none'
        )}
        style={isSnoozed ? { boxShadow: '0 0 10px color-mix(in srgb, var(--color-warning) 28%, transparent)' } : undefined}
      >
        {buttonContents}
      </motion.button>

      {open && buttonStyle && menuPosition && createPortal(
        <div className="fixed inset-0 z-[1000]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />

          {/* Keep the button above the overlay */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setOpen(false)}
            className={cn(
              'fixed z-[1002] flex items-center gap-2 rounded-full px-3 py-1.5',
              'whitespace-nowrap',
              'bg-[var(--color-glass-well)] backdrop-blur-[14px]',
              'border border-white/[0.06] text-text-secondary',
              'transition-colors hover:text-text-primary hover:border-white/[0.10]'
            )}
            style={{
              top: buttonStyle.top,
              left: buttonStyle.left,
              width: buttonStyle.width,
              height: buttonStyle.height,
            }}
          >
            {buttonContents}
          </motion.button>

          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={cn(
                'fixed z-[1001] w-56',
                'rounded-xl border border-white/[0.08] bg-[var(--color-glass)]',
                'backdrop-blur-[14px] backdrop-saturate-[1.4]',
                'shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] p-2'
              )}
              style={{ top: menuPosition.top, left: menuPosition.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[10px] text-text-muted uppercase tracking-wider px-2 py-1">
                Mute voice for
              </p>
              <div className="flex flex-col gap-1">
                {choices.map((c) => (
                  <button
                    key={c.minutes}
                    type="button"
                    onClick={() => applyMinutes(c.minutes)}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-2 rounded-lg',
                      'text-xs text-text-secondary hover:text-text-primary',
                      'hover:bg-white/[0.06] transition-colors'
                    )}
                  >
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>

              <div className="h-px bg-white/[0.06] my-2" />

              <p className="text-[10px] text-text-muted uppercase tracking-wider px-2 pb-1">
                Custom
              </p>
              <div className="flex items-center gap-2 px-2 pb-1">
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Number(e.target.value))}
                  className={cn(
                    'flex-1 bg-[var(--color-glass-well)] border border-white/[0.08]',
                    'rounded-md px-2 py-1 text-xs text-text-primary',
                    'focus:outline-none focus:border-warning/40'
                  )}
                />
                <span className="text-xs text-text-muted">min</span>
                <button
                  type="button"
                  onClick={() => applyMinutes(customMinutes)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium',
                    'bg-warning/10 border border-warning/20 text-warning',
                    'hover:bg-warning/15 transition-colors'
                  )}
                >
                  Set
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}
    </div>
  );
}
