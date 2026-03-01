import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface VoiceControlsProps {
  micMuted: boolean;
  onToggleMic: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  onEnd?: () => void;
  endLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function VoiceControls({
  micMuted,
  onToggleMic,
  volume,
  onVolumeChange,
  onEnd,
  endLabel,
  disabled = false,
  className,
}: VoiceControlsProps) {
  return (
    <div className={cn('flex items-center gap-3 w-full max-w-lg', className)}>
      <Button
        size="icon"
        variant="outline"
        aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'}
        className={cn(
          'size-9',
          micMuted && 'border-danger/30 text-danger hover:bg-danger/10',
        )}
        onClick={onToggleMic}
        disabled={disabled}
      >
        {micMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
      </Button>

      <div className="flex items-center gap-2 flex-1">
        {volume === 0 ? (
          <VolumeX className="size-4 shrink-0 text-text-secondary" />
        ) : (
          <Volume2 className="size-4 shrink-0 text-text-secondary" />
        )}
        <Slider
          value={[Math.round(volume * 100)]}
          min={0}
          max={100}
          aria-label="AI voice volume"
          onValueChange={([val]) => onVolumeChange(val / 100)}
          className="w-full"
          disabled={disabled}
        />
      </div>

      {onEnd && (
        <Button
          variant="outline"
          className="border-danger/30 text-danger hover:bg-danger/10"
          onClick={onEnd}
          disabled={disabled}
        >
          {endLabel ?? 'End'}
        </Button>
      )}
    </div>
  );
}
