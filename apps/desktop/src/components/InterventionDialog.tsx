import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/SeverityBadge';
import { ShineBorder } from '@/components/effects/ShineBorder';
import { Meteors } from '@/components/effects/Meteors';
import type { InterventionEvent } from '@norot/shared';
import { SEVERITY_BANDS, stripEmotionTags } from '@norot/shared';
import { getNorotAPI } from '@/lib/norot-api';
import { useVoiceChatStore } from '@/stores/voice-chat-store';
import { useSnoozeStore } from '@/stores/snooze-store';
import { toast } from 'sonner';
import { Clock, X, HelpCircle } from 'lucide-react';

interface InterventionDialogProps {
  intervention: InterventionEvent | null;
  onRespond: (id: string, response: 'snoozed' | 'dismissed' | 'working') => void;
}

function getSeverityDuration(severity: number): number {
  if (severity === 2) return 3;
  if (severity === 3) return 2;
  return 1;
}

export function InterventionDialog({ intervention, onRespond }: InterventionDialogProps) {
  const open = intervention !== null;
  const shouldPulse = intervention && intervention.severity >= 3;
  const severityColor = intervention ? SEVERITY_BANDS[intervention.severity]?.color ?? '#8b5cf6' : '#8b5cf6';
  const useShine = intervention !== null && intervention.severity >= 2;
  const isHighSeverity = intervention !== null && intervention.severity >= 3;
  const [hasElevenLabsKey, setHasElevenLabsKey] = useState(false);

  const startSnooze = useSnoozeStore((s) => s.startSnooze);
  const handleSnooze5Min = () => {
    if (!intervention) return;
    startSnooze(5 * 60 * 1000);
    onRespond(intervention.id, 'snoozed');
  };

  // Check for ElevenLabs key when dialog opens
  useEffect(() => {
    if (open) {
      getNorotAPI().getSettings().then((s) => {
        setHasElevenLabsKey(Boolean(s.elevenLabsApiKey));
      }).catch(() => {});
    }
  }, [open]);

  const highSeverityFooter = intervention ? (
    <DialogFooter className="mt-4">
      <div className="grid grid-cols-2 gap-2 w-full">
        <Button
          variant="outline"
          className="border-warning text-warning hover:bg-warning/10"
          onClick={handleSnooze5Min}
        >
          <Clock className="size-4 mr-1" />
          Snooze 5 min
        </Button>
        <Button
          variant="outline"
          className="text-text-secondary"
          onClick={() => onRespond(intervention.id, 'dismissed')}
        >
          <X className="size-4 mr-1" />
          Dismiss
        </Button>
        <Button
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10 col-span-2"
          onClick={() => {
            if (!intervention) return;
            if (!hasElevenLabsKey) {
              toast('Add your ElevenLabs API key in Settings to use voice check-in');
              return;
            }
            // Mark as working (closes the intervention) and open the unified voice UI.
            onRespond(intervention.id, 'working');
            useVoiceChatStore.getState().openCheckin();
          }}
        >
          <HelpCircle className="size-4 mr-1" />
          I'm stuck
        </Button>
      </div>
    </DialogFooter>
  ) : null;

  const defaultFooter = intervention ? (
    <DialogFooter className="flex-row gap-2 mt-4">
      <Button
        variant="outline"
        className="flex-1 border-warning text-warning hover:bg-warning/10"
        onClick={handleSnooze5Min}
      >
        <Clock className="size-4 mr-1" />
        Snooze 5 min
      </Button>
      <Button
        variant="outline"
        className="flex-1 text-text-secondary"
        onClick={() => onRespond(intervention.id, 'dismissed')}
      >
        <X className="size-4 mr-1" />
        Dismiss
      </Button>
    </DialogFooter>
  ) : null;

  const innerContent = intervention ? (
    <>
      {/* Severity-colored radial gradient */}
      <div
        className="absolute inset-0 pointer-events-none rounded-lg"
        style={{ background: `radial-gradient(ellipse at center, ${severityColor}15, transparent 70%)` }}
      />
      {/* Crisis meteors */}
      {intervention.severity === 4 && <Meteors count={30} />}
      <DialogHeader>
        <div className="flex items-center gap-3">
          {shouldPulse && (
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-danger" />
            </span>
          )}
          <DialogTitle className="text-text-primary">
            Intervention
          </DialogTitle>
          <SeverityBadge severity={intervention.severity} />
        </div>
        <DialogDescription className="text-text-secondary mt-2">
          {stripEmotionTags(intervention.text)}
        </DialogDescription>
      </DialogHeader>
      {isHighSeverity ? highSeverityFooter : defaultFooter}
    </>
  ) : null;

  const dialogContent = intervention ? (
    <DialogContent
      showCloseButton={false}
      className={useShine ? 'sm:max-w-md p-0 border-0 before:hidden' : 'sm:max-w-md'}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative"
      >
        {useShine ? (
          <ShineBorder
            color={severityColor}
            duration={getSeverityDuration(intervention.severity)}
            innerClassName="bg-[var(--color-glass)] backdrop-blur-xl"
          >
            <div className="p-6">{innerContent}</div>
          </ShineBorder>
        ) : (
          innerContent
        )}
      </motion.div>
    </DialogContent>
  ) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && intervention) {
          onRespond(intervention.id, 'dismissed');
        }
      }}
    >
      <AnimatePresence>
        {intervention && dialogContent}
      </AnimatePresence>
    </Dialog>
  );
}
