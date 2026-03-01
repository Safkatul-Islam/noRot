import { useEffect, useRef, useCallback } from 'react';
import type { TodoItem } from '@norot/shared';
import { getNorotAPI } from '@/lib/norot-api';

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

export interface ExtractionCallbacks {
  getProposedTodos: () => TodoItem[];
  setProposedTodos: (todos: TodoItem[]) => void;
  setIsExtracting: (v: boolean) => void;
  setMissingGeminiKey: (v: boolean) => void;
}

export function useTranscriptTodoExtraction(
  transcript: ChatMessage[],
  status: string,
  callbacks: ExtractionCallbacks,
  opts?: { enabled?: boolean },
) {
  const enabled = opts?.enabled ?? true;
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

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

  const runExtraction = useCallback(async (opts?: { ignoreCooldown?: boolean }) => {
    if (!enabledRef.current) return;
    if (!mountedRef.current) return;

    // Check for Gemini key
    const settings = await getNorotAPI().getSettings();
    if (!settings.geminiApiKey) {
      callbacksRef.current.setMissingGeminiKey(true);
      return;
    }
    callbacksRef.current.setMissingGeminiKey(false);

    // Build transcript text for extraction (read from ref for stable callback)
    const currentTranscript = transcriptRef.current;
    const fullText = currentTranscript
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    if (!fullText.trim()) return;

    // Cooldown check — moved here so debounce timer isn't blocked
    const elapsed = Date.now() - lastExtractedAtRef.current;
    if (!opts?.ignoreCooldown && elapsed < COOLDOWN_MS) return;

    callbacksRef.current.setIsExtracting(true);
    try {
      const extracted = await getNorotAPI().extractTodos(fullText) as TodoItemWithEdited[];
      if (!mountedRef.current) return;

      lastExtractedAtRef.current = Date.now();
      lastExtractedLenRef.current = currentTranscript.length;

      // Merge: accumulate extracted todos.
      // If a todo was edited by the user, only enrich missing optional fields.
      const currentTodos = callbacksRef.current.getProposedTodos() as TodoItemWithEdited[];
      const normalizedKey = (text: string) => text.trim().toLowerCase();
      const hasText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
      const hasDuration = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

      const merged: TodoItemWithEdited[] = [...currentTodos];
      const indexByText = new Map<string, number>();
      for (let i = 0; i < merged.length; i++) {
        const key = normalizedKey(merged[i]?.text ?? '');
        if (key && !indexByText.has(key)) indexByText.set(key, i);
      }

      let changed = false;
      for (const t of extracted) {
        const key = normalizedKey(t.text);
        if (!key) continue;

        const existingIdx = indexByText.get(key);
        if (typeof existingIdx === 'number') {
          const existing = merged[existingIdx];
          if (!existing._userEdited) {
            merged[existingIdx] = {
              ...existing,
              ...t,
              id: existing.id,
              done: existing.done,
              order: existing.order,
              _userEdited: false,
            };
            changed = true;
            continue;
          }

          // Edited todos: only fill missing optional fields.
          const next: TodoItemWithEdited = { ...existing };
          if (!hasText(next.app) && hasText(t.app)) next.app = t.app;
          if (!hasText(next.url) && hasText(t.url)) next.url = t.url;
          if ((!Array.isArray(next.allowedApps) || next.allowedApps.length === 0)
            && Array.isArray(t.allowedApps)
            && t.allowedApps.length > 0
          ) {
            next.allowedApps = t.allowedApps;
          }
          if (!hasText(next.deadline) && hasText(t.deadline)) next.deadline = t.deadline;
          if (!hasText(next.startTime) && hasText(t.startTime)) next.startTime = t.startTime;
          if (!hasDuration(next.durationMinutes) && hasDuration(t.durationMinutes)) next.durationMinutes = t.durationMinutes;

          // Ensure these never change in this merge path.
          next.id = existing.id;
          next.done = existing.done;
          next.order = existing.order;
          next._userEdited = true;

          if (JSON.stringify(next) !== JSON.stringify(existing)) {
            merged[existingIdx] = next;
            changed = true;
          }
        } else {
          merged.push({ ...t, _userEdited: false });
          indexByText.set(key, merged.length - 1);
          changed = true;
        }
      }

      if (changed) callbacksRef.current.setProposedTodos(merged);
    } catch (err) {
      console.warn('[transcript-extraction] Extraction failed:', err);
    } finally {
      if (mountedRef.current) callbacksRef.current.setIsExtracting(false);
    }
  }, []);

  // Debounced extraction on new transcript messages
  useEffect(() => {
    if (!enabled) return;
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
    if (!enabled) {
      prevStatusRef.current = status;
      return;
    }
    if (prevStatusRef.current !== 'disconnected' && status === 'disconnected') {
      if (transcript.length > 0 && transcript.length > lastExtractedLenRef.current) {
        // Clear any pending debounce and run immediately
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        runExtraction({ ignoreCooldown: true });
      }
    }
    prevStatusRef.current = status;
  }, [status, transcript, runExtraction]);

  const updateProposedTodos = useCallback((todos: TodoItem[]) => {
    const prev = callbacksRef.current.getProposedTodos() as TodoItemWithEdited[];
    const prevById = new Map(prev.map((t) => [t.id, t]));

    const changedKeys: (keyof TodoItem)[] = [
      'text',
      'done',
      'order',
      'app',
      'url',
      'deadline',
      'startTime',
      'durationMinutes',
      'allowedApps',
    ];

    const next = (todos as TodoItemWithEdited[]).map((t) => {
      const prevTodo = prevById.get(t.id);
      if (!prevTodo) return { ...t, _userEdited: true };
      if (prevTodo._userEdited) return { ...t, _userEdited: true };

      const edited = changedKeys.some((k) => {
        const a = prevTodo[k];
        const b = t[k];
        if (Array.isArray(a) || Array.isArray(b)) {
          return JSON.stringify(a ?? []) !== JSON.stringify(b ?? []);
        }
        return a !== b;
      });

      return { ...t, _userEdited: edited };
    });

    callbacksRef.current.setProposedTodos(next);
  }, []);

  return {
    setProposedTodos: updateProposedTodos,
  };
}
