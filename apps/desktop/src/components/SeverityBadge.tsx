import { motion, AnimatePresence } from 'motion/react';
import { SEVERITY_BANDS } from '@norot/shared';
import type { Severity } from '@norot/shared';

interface SeverityBadgeProps {
  severity: Severity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const band = SEVERITY_BANDS[severity];

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={severity}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
        style={{
          backgroundColor: `${band.color}20`,
          color: band.color,
          border: `1px solid ${band.color}40`,
          boxShadow: `0 0 10px ${band.color}40`,
        }}
      >
        {band.label}
      </motion.span>
    </AnimatePresence>
  );
}
