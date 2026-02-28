import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface GlassToggleProps {
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
}

export function GlassToggle({ checked, onCheckedChange }: GlassToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative w-9 h-5 rounded-full border transition-colors cursor-pointer',
          checked
            ? 'bg-success/15 border-success/30'
            : 'bg-white/[0.04] border-white/[0.08]'
        )}
      >
        <motion.span
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full',
            checked ? 'bg-success' : 'bg-text-muted'
          )}
          animate={{ x: checked ? 16 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            boxShadow: checked
              ? '0 0 8px var(--color-success)'
              : '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </button>
      <AnimatePresence mode="wait">
        <motion.span
          key={checked ? 'on' : 'off'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'text-xs',
            checked ? 'text-success' : 'text-text-muted'
          )}
        >
          {checked ? 'Monitoring' : 'Paused'}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
