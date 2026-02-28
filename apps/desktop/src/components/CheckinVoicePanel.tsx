import { useEffect, useRef } from 'react';
import { PhoneOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VoiceOrb } from '@/components/VoiceOrb';
import { useCheckinAgent } from '@/hooks/useCheckinAgent';
import { cn } from '@/lib/utils';

const TEXT_FALLBACK_PROMPTS = [
  "What's blocking you right now? Is it...",
  'Overwhelm — too many things, not sure where to start?',
  'Boredom — the task feels tedious or uninteresting?',
  'Avoidance — something about it feels uncomfortable?',
  'Unclear next step — you don\'t know what to do first?',
  '',
  'Try picking ONE small thing you can do in the next 2 minutes — even just opening the file counts.',
];

interface CheckinVoicePanelProps {
  onEnd: () => void;
}

export function CheckinVoicePanel({ onEnd }: CheckinVoicePanelProps) {
  const { startConversation, stopConversation, status, isSpeaking, transcript, error, micFailed } = useCheckinAgent();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const startConversationRef = useRef(startConversation);
  startConversationRef.current = startConversation;

  // Auto-start conversation on mount
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      startConversationRef.current();
    }
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const viewport = el.closest('[data-slot="scroll-area-viewport"]') ?? el.parentElement;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [transcript]);

  const handleEnd = () => {
    stopConversation();
    onEnd();
  };

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  // Show text fallback if mic failed or if there's a non-retryable error
  const showTextFallback = micFailed || (error && !error.canRetry);

  if (showTextFallback) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-text-secondary space-y-2">
          {TEXT_FALLBACK_PROMPTS.map((line, i) =>
            line === '' ? (
              <div key={i} className="h-2" />
            ) : i === 0 ? (
              <p key={i} className="text-text-primary font-medium">{line}</p>
            ) : (
              <p key={i} className="pl-2">- {line}</p>
            )
          )}
        </div>
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleEnd}>
            Got it
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status text */}
      <p className="text-sm text-text-secondary text-center">
        {isConnecting && 'Connecting...'}
        {isConnected && (isSpeaking ? 'noRot is speaking...' : 'Listening...')}
        {status === 'disconnected' && !error && 'Ready to connect'}
      </p>

      {/* Small orb */}
      <div className="flex justify-center">
        <div style={{ width: 80, height: 80 }}>
          <VoiceOrb interactive={false} paused={!isConnected} />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm">
          <p className="text-danger">{error.message}</p>
          {error.canRetry && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 border-danger/30 text-danger hover:bg-danger/10"
              onClick={() => {
                hasStartedRef.current = false;
                startConversation();
                hasStartedRef.current = true;
              }}
            >
              <RotateCcw className="size-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Transcript */}
      {transcript.length > 0 && (
        <ScrollArea className="h-36 rounded-lg border border-white/6 bg-black/20 p-3">
          <div ref={scrollRef} className="space-y-2">
            {transcript.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'text-sm rounded-lg px-3 py-2 max-w-[85%]',
                  msg.role === 'user'
                    ? 'ml-auto bg-primary/15 text-text-primary'
                    : 'bg-white/5 text-text-secondary'
                )}
              >
                {msg.content}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* End conversation button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          className="border-danger/30 text-danger hover:bg-danger/10"
          onClick={handleEnd}
        >
          <PhoneOff className="size-4 mr-1" />
          End conversation
        </Button>
      </div>
    </div>
  );
}
