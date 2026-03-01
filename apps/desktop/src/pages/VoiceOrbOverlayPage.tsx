import { useEffect } from 'react';
import { VoiceOrb } from '@/components/VoiceOrb';
import { getNorotAPI } from '@/lib/norot-api';
import { useVoiceStatusStore } from '@/stores/voice-status-store';
import { useScoreStore } from '@/stores/score-store';
import type { Severity } from '@norot/shared';

export function VoiceOrbOverlayPage() {
  useEffect(() => {
    // Make the page background transparent (Electron transparent window).
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';

    // Listen for voice status broadcasts from main window
    const api = getNorotAPI();
    const unsubVoice = api.onVoiceStatus?.((data: { isSpeaking: boolean; severity: number; amplitude: number }) => {
      useVoiceStatusStore.getState().setIsSpeaking(data.isSpeaking);
      useVoiceStatusStore.getState().setAmplitude(data.amplitude);
      useScoreStore.getState().setSeverity(data.severity as Severity);
    });

    return () => {
      unsubVoice?.();
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      <VoiceOrb />
    </div>
  );
}
