import { useState, useEffect, useRef, useMemo } from 'react';
import { useConversation } from '@elevenlabs/react';
import { useVoiceStatusStore } from '@/stores/voice-status-store';
import { getNorotAPI } from '@/lib/norot-api';
import { createTodoClientTools } from '@/lib/voice-client-tools';
import type { DraftAwareOptions, TodoToolBackend } from '@/lib/todo-tool-backend';
import { DraftAwareTodoBackend, DbTodoBackend } from '@/lib/todo-tool-backend';
import type { VoiceAgentError } from '@/lib/voice-errors';
import { parseVoiceError } from '@/lib/voice-errors';
import type { ChatMessage, TodoItem } from '@norot/shared';

export function useVoiceAgent(opts?: {
  mode?: 'coach' | 'checkin';
  /**
   * Where drafted todos should live in coach mode.
   * If omitted, coach-mode tools will write directly to the DB.
   */
  draftTodos?: DraftAwareOptions;
  /** Override the tool backend entirely (advanced). */
  backend?: TodoToolBackend;

  /**
   * Controls what we inject into the agent as {{existing_todos}}.
   * - 'db' (default): active DB todos
   * - 'none': always inject "none yet" (useful for onboarding/daily setup)
   */
  existingTodosContext?: 'db' | 'none';
}) {
  const mode = opts?.mode ?? 'coach';
  const existingTodosContext = opts?.existingTodosContext ?? 'db';
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<VoiceAgentError | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const isConnecting = useRef(false);
  const mountedRef = useRef(true);
  const userInitiatedStopRef = useRef(false);
  const prevStatusRef = useRef<string>('idle');

  const draftTodosRef = useRef<DraftAwareOptions | undefined>(opts?.draftTodos);
  draftTodosRef.current = opts?.draftTodos;

  // Track mount state so retry timeout doesn't update unmounted component
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Create the right backend based on mode:
  // - Coach mode: drafts are optional; if not provided, write to DB
  // - Check-in mode: writes go directly to the database
  const backend = useMemo(() => {
    if (opts?.backend) return opts.backend;
    if (mode === 'coach') {
      const draftTodos = draftTodosRef.current;
      if (draftTodos) return new DraftAwareTodoBackend(draftTodos);
      return new DbTodoBackend();
    }
    return new DbTodoBackend();
  }, [mode, opts?.backend]);

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
    clientTools: createTodoClientTools(backend),
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

        // Inject existing todo context for coach mode via ElevenLabs dynamicVariables
        let dynamicVariables: Record<string, string | number | boolean> | undefined;
        if (mode === 'coach') {
          if (existingTodosContext === 'none') {
            dynamicVariables = { existing_todos: 'none yet' };
          } else {
            try {
              const dbTodos = await api.getTodos();
              const active = dbTodos.filter((t: TodoItem) => !t.done);
              dynamicVariables = {
                existing_todos: active.length > 0
                  ? active.map((t: TodoItem) => {
                    let s = t.text;
                    if (typeof t.startTime === 'string' && t.startTime) s += ` (start ${t.startTime})`;
                    if (typeof t.deadline === 'string' && t.deadline) s += ` (due ${t.deadline})`;
                    return s;
                  }).join(', ')
                  : 'none yet',
              };
            } catch {
              dynamicVariables = { existing_todos: 'none yet' };
            }
          }
        }

        await conversation.startSession({
          signedUrl,
          ...(dynamicVariables ? { dynamicVariables } : {}),
        });
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
