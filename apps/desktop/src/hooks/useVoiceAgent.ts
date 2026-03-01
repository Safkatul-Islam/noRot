import { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import { useVoiceStatusStore } from '@/stores/voice-status-store';
import { getNorotAPI } from '@/lib/norot-api';
import { createTodoClientTools } from '@/lib/voice-client-tools';
import type { VoiceAgentError } from '@/lib/voice-errors';
import { parseVoiceError } from '@/lib/voice-errors';
import type { ChatMessage } from '@norot/shared';

export function useVoiceAgent(opts?: { mode?: 'coach' | 'checkin' }) {
  const mode = opts?.mode ?? 'coach';
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<VoiceAgentError | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const isConnecting = useRef(false);
  const mountedRef = useRef(true);
  const userInitiatedStopRef = useRef(false);
  const prevStatusRef = useRef<string>('idle');

  // Track mount state so retry timeout doesn't update unmounted component
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const conversation = useConversation({
    micMuted,
    volume,
    onMessage: (message) => {
      setTranscript(prev => [...prev, {
        // SDK role is 'user' | 'agent' — map 'agent' to 'assistant' for our types
        role: message.role === 'agent' ? 'assistant' : 'user',
        content: message.message,
      }]);
    },
    onError: (err) => {
      console.error(`[voice-agent:${mode}]`, err);
      setError({
        code: 'NETWORK',
        message: 'Voice connection lost. Please try again.',
        canRetry: true,
      });
    },
    clientTools: createTodoClientTools(mode === 'checkin' ? 'checkin-agent' : 'voice-agent'),
  });

  useEffect(() => {
    useVoiceStatusStore.getState().setIsSpeaking(conversation.isSpeaking);
  }, [conversation.isSpeaking]);

  const startConversation = async () => {
    // Prevent double-connect from useEffect re-fire during retry timeout
    if (isConnecting.current) return;
    isConnecting.current = true;

    setError(null);
    setTranscript([]);
    userInitiatedStopRef.current = false;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError({
        code: 'UNKNOWN',
        message: 'Microphone access is required for voice mode. Please allow mic access and try again.',
        canRetry: true,
      });
      isConnecting.current = false;
      return;
    }
    try {
      const connect = async () => {
        const api = getNorotAPI();
        const { signedUrl } = mode === 'checkin'
          ? await api.ensureCheckinAgent()
          : await api.ensureVoiceAgent();
        await conversation.startSession({ signedUrl });
      };

      try {
        await connect();
      } catch (firstErr) {
        const firstParsed = parseVoiceError(firstErr);
        if (firstParsed.canRetry && mountedRef.current) {
          await new Promise((r) => setTimeout(r, 1500));
          if (!mountedRef.current) return; // Bail if unmounted during wait
          try {
            await connect();
          } catch (retryErr) {
            if (mountedRef.current) setError(parseVoiceError(retryErr));
          }
        } else {
          if (mountedRef.current) setError(firstParsed);
        }
      }
    } catch (outerErr) {
      if (mountedRef.current) setError(parseVoiceError(outerErr));
    } finally {
      isConnecting.current = false;
    }
  };

  const stopConversation = async () => {
    isConnecting.current = false;
    userInitiatedStopRef.current = true;
    try {
      await conversation.endSession();
    } catch {
      // Session may already be disconnected
    }
    useVoiceStatusStore.getState().setIsSpeaking(false);
  };

  // Show a helpful retry UI when the session drops unexpectedly.
  useEffect(() => {
    const prev = prevStatusRef.current;
    const next = conversation.status;
    prevStatusRef.current = next;

    if (!mountedRef.current) return;
    if (userInitiatedStopRef.current) return;

    if (prev === 'connected' && next === 'disconnected') {
      setError({
        code: 'NETWORK',
        message: 'Voice session ended unexpectedly. Click Retry to reconnect.',
        canRetry: true,
      });
    }
  }, [conversation.status]);

  // Lets the UI signal "I'm here" during silence so the agent doesn't
  // re-engage with default timeout prompts.
  const sendUserActivity = () => {
    try {
      if (conversation.status !== 'connected') return;
      // @elevenlabs/react provides this; optional-chain for safety.
      conversation.sendUserActivity?.();
    } catch {
      // ignore
    }
  };

  return {
    startConversation,
    stopConversation,
    status: conversation.status,
    isSpeaking: conversation.isSpeaking,
    transcript,
    error,
    micMuted,
    setMicMuted,
    volume,
    setVolume,
    sendUserActivity,
  };
}
