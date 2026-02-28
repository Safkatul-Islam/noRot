import { Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { SnoozeControl } from '@/components/SnoozeControl';

interface AudioControlsProps {
  activeInterventionId?: string | null;
  onRespond?: (id: string, response: 'snoozed' | 'dismissed' | 'working') => void;
}

/**
 * Floating pill-shaped controls.
 * Each button is its own glass capsule instead of a plain ghost button.
 */
export function AudioControls({ activeInterventionId, onRespond }: AudioControlsProps) {
  const { muted, updateMuted } = useSettings();

  return (
    <div className="flex items-center gap-2">
      <PillButton
        onClick={updateMuted}
        active={muted}
        activeColor="var(--color-danger)"
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        <span className="text-xs">{muted ? 'Unmute' : 'Mute'}</span>
      </PillButton>

      <SnoozeControl
        activeInterventionId={activeInterventionId ?? null}
        onRespond={onRespond}
      />
    </div>
  );
}

interface PillButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  activeColor?: string;
  highlight?: boolean;
}

function PillButton({ children, onClick, disabled, active, activeColor, highlight }: PillButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5',
        'bg-[var(--color-glass-well)] backdrop-blur-[14px]',
        'border border-white/[0.04] text-text-secondary',
        'transition-all duration-200',
        'hover:text-text-primary hover:border-white/[0.08]',
        disabled && 'opacity-40 pointer-events-none',
        active && 'border-opacity-30',
        highlight && !disabled && 'bg-success/10 border-success/20 text-success hover:text-success'
      )}
      style={active && activeColor ? {
        borderColor: activeColor,
        color: activeColor,
        boxShadow: `0 0 8px color-mix(in srgb, ${activeColor} 30%, transparent)`,
      } : undefined}
    >
      {children}
    </motion.button>
  );
}
