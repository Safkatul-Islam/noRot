import { useEffect, useRef, useCallback } from 'react';
import type { TodoItem } from '@norot/shared';
import { getNorotAPI } from '@/lib/norot-api';
import { useVoiceChatStore } from '@/stores/voice-chat-store';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface TodoItemWithEdited extends TodoItem {
  _userEdited?: boolean;
}

const DEBOUNCE_MS = 3_000;
const COOLDOWN_MS = 15_000;
const MIN_ASSISTANT_CHAR_LENGTH = 50;

export function useTranscriptTodoExtraction(
  transcript: ChatMessage[],
  status: string,
) {
  const isExtracting = useVoiceChatStore((s) => s.isExtracting);
  const missingGeminiKey = useVoiceChatStore((s) => s.missingGeminiKey);
  const setIsExtracting = useVoiceChatStore((s) => s.setIsExtracting);
  const setMissingGeminiKey = useVoiceChatStore((s) => s.setMissingGeminiKey);

  const proposedTodos = useVoiceChatStore((s) => s.proposedTodos) as TodoItemWithEdited[];
  const setProposedTodos = useVoiceChatStore((s) => s.setProposedTodos);
  const hasProposedTodos = proposedTodos.length > 0;

  const lastExtractedAtRef = useRef(0);
  const lastExtractedLenRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevStatusRef = useRef(status);
  const mountedRef = useRef(true);
  const transcriptRef = useRef(transcript);
  transcriptRef.current = transcript;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const runExtraction = useCallback(async () => {
    if (!mountedRef.current) return;

    // Check for Gemini key
    const settings = await getNorotAPI().getSettings();
    if (!settings.geminiApiKey) {
      setMissingGeminiKey(true);
      return;
    }
    setMissingGeminiKey(false);

    // Build transcript text for extraction (read from ref for stable callback)
    const currentTranscript = transcriptRef.current;
    const fullText = currentTranscript
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    if (!fullText.trim()) return;

    // Cooldown check — moved here so debounce timer isn't blocked
    const elapsed = Date.now() - lastExtractedAtRef.current;
    if (elapsed < COOLDOWN_MS) return;

    setIsExtracting(true);
    try {
      const extracted = await getNorotAPI().extractTodos(fullText) as TodoItemWithEdited[];
      if (!mountedRef.current) return;

      lastExtractedAtRef.current = Date.now();
      lastExtractedLenRef.current = currentTranscript.length;

      // Merge: never overwrite user-edited todos
      const currentTodos = useVoiceChatStore.getState().proposedTodos as TodoItemWithEdited[];
      const editedMap = new Map<string, TodoItemWithEdited>();
      for (const t of currentTodos) {
        if (t._userEdited) {
          editedMap.set(t.text.toLowerCase(), t);
        }
      }

      const merged: TodoItemWithEdited[] = [];
      const seen = new Set<string>();

      // Keep all user-edited todos first
      for (const t of currentTodos) {
        if (t._userEdited) {
          merged.push(t);
          seen.add(t.text.toLowerCase());
        }
      }

      // Add extracted todos, skipping those that match user-edited ones
      for (const t of extracted) {
        const key = t.text.toLowerCase();
        if (!seen.has(key)) {
          merged.push({ ...t, _userEdited: false });
          seen.add(key);
        }
      }

      setProposedTodos(merged);
    } catch (err) {
      console.warn('[transcript-extraction] Extraction failed:', err);
    } finally {
      if (mountedRef.current) setIsExtracting(false);
    }
  }, [setProposedTodos]);

  // Debounced extraction on new transcript messages
  useEffect(() => {
    if (status !== 'connected') return;
    if (transcript.length === 0) return;

    // Check if there are new assistant messages (50+ chars) since last extraction
    const newMessages = transcript.slice(lastExtractedLenRef.current);
    const hasNewAssistantContent = newMessages.some(
      (m) => m.role === 'assistant' && m.content.length >= MIN_ASSISTANT_CHAR_LENGTH,
    );
    if (!hasNewAssistantContent) return;

    // Debounce — cooldown is checked inside runExtraction
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      runExtraction();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [transcript, status, runExtraction]);

  // Final extraction when status transitions to disconnected
  useEffect(() => {
    if (prevStatusRef.current !== 'disconnected' && status === 'disconnected') {
      if (transcript.length > 0 && transcript.length > lastExtractedLenRef.current) {
        // Clear any pending debounce and run immediately
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        runExtraction();
      }
    }
    prevStatusRef.current = status;
  }, [status, transcript, runExtraction]);

  const updateProposedTodos = useCallback((todos: TodoItemWithEdited[]) => {
    // Mark all as user-edited when the user modifies them through the preview list
    setProposedTodos(todos.map((t) => ({ ...t, _userEdited: true })));
  }, [setProposedTodos]);

  return {
    proposedTodos,
    setProposedTodos: updateProposedTodos,
    isExtracting,
    hasProposedTodos,
    missingGeminiKey,
  };
}
