import { useEffect, useRef, useCallback } from 'react';
import { getNorotAPI } from '@/lib/norot-api';
const DEBOUNCE_MS = 3_000;
const COOLDOWN_MS = 15_000;
const MIN_ASSISTANT_CHAR_LENGTH = 50;
export function useTranscriptTodoExtraction(transcript, status, callbacks) {
    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;
    const lastExtractedAtRef = useRef(0);
    const lastExtractedLenRef = useRef(0);
    const debounceTimerRef = useRef(null);
    const prevStatusRef = useRef(status);
    const mountedRef = useRef(true);
    const transcriptRef = useRef(transcript);
    transcriptRef.current = transcript;
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (debounceTimerRef.current)
                clearTimeout(debounceTimerRef.current);
        };
    }, []);
    const runExtraction = useCallback(async (opts) => {
        if (!mountedRef.current)
            return;
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
        if (!fullText.trim())
            return;
        // Cooldown check — moved here so debounce timer isn't blocked
        const elapsed = Date.now() - lastExtractedAtRef.current;
        if (!opts?.ignoreCooldown && elapsed < COOLDOWN_MS)
            return;
        callbacksRef.current.setIsExtracting(true);
        try {
            const extracted = await getNorotAPI().extractTodos(fullText);
            if (!mountedRef.current)
                return;
            lastExtractedAtRef.current = Date.now();
            lastExtractedLenRef.current = currentTranscript.length;
            // Merge: accumulate extracted todos, never overwrite user-edited todos
            const currentTodos = callbacksRef.current.getProposedTodos();
            const normalizedKey = (text) => text.trim().toLowerCase();
            const merged = [...currentTodos];
            const indexByText = new Map();
            for (let i = 0; i < merged.length; i++) {
                const key = normalizedKey(merged[i]?.text ?? '');
                if (key && !indexByText.has(key))
                    indexByText.set(key, i);
            }
            let changed = false;
            for (const t of extracted) {
                const key = normalizedKey(t.text);
                if (!key)
                    continue;
                const existingIdx = indexByText.get(key);
                if (typeof existingIdx === 'number') {
                    const existing = merged[existingIdx];
                    if (!existing._userEdited) {
                        merged[existingIdx] = {
                            ...existing,
                            ...t,
                            id: existing.id,
                            _userEdited: false,
                        };
                        changed = true;
                    }
                }
                else {
                    merged.push({ ...t, _userEdited: false });
                    indexByText.set(key, merged.length - 1);
                    changed = true;
                }
            }
            if (changed)
                callbacksRef.current.setProposedTodos(merged);
        }
        catch (err) {
            console.warn('[transcript-extraction] Extraction failed:', err);
        }
        finally {
            if (mountedRef.current)
                callbacksRef.current.setIsExtracting(false);
        }
    }, []);
    // Debounced extraction on new transcript messages
    useEffect(() => {
        if (status !== 'connected')
            return;
        if (transcript.length === 0)
            return;
        // Check if there are new assistant messages (50+ chars) since last extraction
        const newMessages = transcript.slice(lastExtractedLenRef.current);
        const hasNewAssistantContent = newMessages.some((m) => m.role === 'assistant' && m.content.length >= MIN_ASSISTANT_CHAR_LENGTH);
        if (!hasNewAssistantContent)
            return;
        // Debounce — cooldown is checked inside runExtraction
        if (debounceTimerRef.current)
            clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            runExtraction();
        }, DEBOUNCE_MS);
        return () => {
            if (debounceTimerRef.current)
                clearTimeout(debounceTimerRef.current);
        };
    }, [transcript, status, runExtraction]);
    // Final extraction when status transitions to disconnected
    useEffect(() => {
        if (prevStatusRef.current !== 'disconnected' && status === 'disconnected') {
            if (transcript.length > 0 && transcript.length > lastExtractedLenRef.current) {
                // Clear any pending debounce and run immediately
                if (debounceTimerRef.current)
                    clearTimeout(debounceTimerRef.current);
                runExtraction({ ignoreCooldown: true });
            }
        }
        prevStatusRef.current = status;
    }, [status, transcript, runExtraction]);
    const updateProposedTodos = useCallback((todos) => {
        // Mark all as user-edited when the user modifies them through the preview list
        callbacksRef.current.setProposedTodos(todos.map((t) => ({ ...t, _userEdited: true })));
    }, []);
    return {
        setProposedTodos: updateProposedTodos,
    };
}
