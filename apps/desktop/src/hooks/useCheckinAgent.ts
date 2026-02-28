import { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import type { ChatMessage } from '@norot/shared';
import { useVoiceStatusStore } from '@/stores/voice-status-store';
import { getNorotAPI } from '@/lib/norot-api';
import { createTodoClientTools } from '@/lib/voice-client-tools';
import type { VoiceAgentError } from '@/lib/voice-errors';
import { parseVoiceError } from '@/lib/voice-errors';

export function useCheckinAgent() {
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<VoiceAgentError | null>(null);
  const [micFailed, setMicFailed] = useState(false);
  const isConnecting = useRef(false);
  const mountedRef = useRef(true);

  // Track mount state so retry timeout doesn't update unmounted component
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const conversation = useConversation({
    onMessage: (message) => {
      setTranscript(prev => [...prev, {
        role: message.role === 'agent' ? 'assistant' : 'user',
        content: message.message,
      }]);
    },
    onError: (err) => {
      console.error('[checkin-agent]', err);
      setError({
        code: 'NETWORK',
        message: 'Voice connection lost. Please try again.',
        canRetry: true,
      });
    },
    clientTools: createTodoClientTools('checkin-agent'),
  });

  useEffect(() => {
    useVoiceStatusStore.getState().setIsSpeaking(conversation.isSpeaking);
  }, [conversation.isSpeaking]);

  const startConversation = async () => {
    if (isConnecting.current) return;
    isConnecting.current = true;

    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Mic not available — signal fallback to text mode
      setMicFailed(true);
      isConnecting.current = false;
      return;
    }
    try {
      const connect = async () => {
        const { signedUrl } = await getNorotAPI().ensureCheckinAgent();
        await conversation.startSession({ signedUrl });
      };

      try {
        await connect();
      } catch (firstErr) {
        const firstParsed = parseVoiceError(firstErr);
        if (firstParsed.canRetry && mountedRef.current) {
          await new Promise((r) => setTimeout(r, 1500));
          if (!mountedRef.current) return;
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
    try {
      await conversation.endSession();
    } catch {
      // Session may already be disconnected
    }
    useVoiceStatusStore.getState().setIsSpeaking(false);
  };

  return {
    startConversation,
    stopConversation,
    status: conversation.status,
    isSpeaking: conversation.isSpeaking,
    transcript,
    error,
    micFailed,
  };
}
