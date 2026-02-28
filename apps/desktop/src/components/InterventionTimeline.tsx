import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InterventionCard } from '@/components/InterventionCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SeverityBadge } from '@/components/SeverityBadge';
import { History } from 'lucide-react';
import { SEVERITY_BANDS, PERSONAS, stripEmotionTags } from '@norot/shared';
import type { InterventionEvent } from '@norot/shared';

interface InterventionTimelineProps {
  interventions: InterventionEvent[];
}

const responseLabels: Record<string, string> = {
  snoozed: 'Snoozed',
  dismissed: 'Dismissed',
  working: 'Working',
  pending: 'Pending',
};

const responseColors: Record<string, string> = {
  snoozed: '#eab308',
  dismissed: '#8888aa',
  working: '#22c55e',
  pending: '#8b5cf6',
};

/**
 * Flow Timeline — vertical line on the left with severity-colored glowing nodes.
 * Each intervention hangs off the line as a compact card.
 */
export function InterventionTimeline({ interventions }: InterventionTimelineProps) {
  const [selectedEvent, setSelectedEvent] = useState<InterventionEvent | null>(null);

  if (interventions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-5 text-center text-text-muted">
        {/* Ghost timeline line */}
        <div className="absolute left-6 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />
        <History className="size-8 mb-2 opacity-35" />
        <p className="text-sm text-text-secondary">No interventions yet.</p>
        <p className="text-xs mt-1 max-w-[42ch] leading-relaxed">
          When an intervention triggers, it will show up here.
        </p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="relative pl-6 pr-3">
          {/* Vertical timeline line */}
          <div
            className="absolute left-[9px] top-0 bottom-0 w-px"
            style={{
              background: 'linear-gradient(to bottom, transparent, var(--color-primary) 10%, var(--color-primary) 90%, transparent)',
              opacity: 0.2,
            }}
          />

          <AnimatePresence initial={false}>
            {interventions.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                className="relative mb-3"
              >
                {/* Timeline node dot */}
                <TimelineNode event={event} isFirst={i === 0} />
                <InterventionCard event={event} onClick={() => setSelectedEvent(event)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      <InterventionDetailDialog
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </>
  );
}

function TimelineNode({ event, isFirst }: { event: InterventionEvent; isFirst: boolean }) {
  const color = SEVERITY_BANDS[event.severity]?.color ?? '#8b5cf6';

  return (
    <div
      className="absolute -left-6 top-3 flex items-center justify-center"
      style={{ width: 18, height: 18 }}
    >
      {/* Glow ring on most recent (first) item */}
      {isFirst && (
        <span
          className="absolute inset-0 rounded-full animate-pulse-glow"
          style={{ boxShadow: `0 0 8px ${color}60` }}
        />
      )}
      {/* Dot */}
      <span
        className="w-2.5 h-2.5 rounded-full border-2"
        style={{
          backgroundColor: color,
          borderColor: 'var(--color-background)',
          boxShadow: `0 0 6px ${color}50`,
        }}
      />
    </div>
  );
}

function InterventionDetailDialog({
  event,
  onClose,
}: {
  event: InterventionEvent | null;
  onClose: () => void;
}) {
  if (!event) return null;

  const severityColor = SEVERITY_BANDS[event.severity]?.color ?? '#8b5cf6';
  const ts = new Date(event.timestamp);
  const formattedDate = ts.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const formattedTime = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        {/* Severity-colored radial gradient */}
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{ background: `radial-gradient(ellipse at center, ${severityColor}15, transparent 70%)` }}
        />

        <DialogHeader>
          <div className="flex items-center gap-3">
            <SeverityBadge severity={event.severity} />
            <DialogTitle>Intervention Details</DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="flex items-center gap-2 text-sm text-text-muted mt-1">
              <span>{formattedDate}, {formattedTime}</span>
              <span className="text-white/20">|</span>
              <span>{PERSONAS[event.persona].label}</span>
              <span className="text-white/20">|</span>
              <span>Score: {event.score}</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-text-primary leading-relaxed mt-2">
          {stripEmotionTags(event.text)}
        </p>

        <div className="mt-3 text-xs">
          <span className="text-text-muted">Your response: </span>
          <span
            className="font-medium"
            style={{ color: responseColors[event.userResponse] }}
          >
            {responseLabels[event.userResponse]}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
