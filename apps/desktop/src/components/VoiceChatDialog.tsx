import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { RotateCcw, Save, Settings, X } from 'lucide-react';
import type { TodoItem } from '@norot/shared';
import { Button } from '@/components/ui/button';
import { VoiceOrb } from '@/components/VoiceOrb';
import { VoiceControls } from '@/components/VoiceControls';
import { VoiceTaskPanel } from '@/components/VoiceTaskPanel';
import { FloatingTaskBubble } from '@/components/FloatingTaskBubble';
import type { FloatingBubble } from '@/components/FloatingTaskBubble';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { useTranscriptTodoExtraction } from '@/hooks/useTranscriptTodoExtraction';
import { useVoiceChatStore, selectHasProposedTodos } from '@/stores/voice-chat-store';
import { useAppStore } from '@/stores/app-store';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';

interface TodoItemWithEdited extends TodoItem {
  _userEdited?: boolean;
}

export function VoiceChatDialog() {
  const { isOpen, mode, close, clearProposedTodos } = useVoiceChatStore();
  const storeHasProposed = useVoiceChatStore(selectHasProposedTodos);
  const proposedTodos = useVoiceChatStore((s) => s.proposedTodos) as TodoItemWithEdited[];
  const dbTodos = useVoiceChatStore((s) => s.dbTodos);
  const isExtracting = useVoiceChatStore((s) => s.isExtracting);
  const missingGeminiKey = useVoiceChatStore((s) => s.missingGeminiKey);

  const [confirmingClose, setConfirmingClose] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const isReviewingRef = useRef(false);
  isReviewingRef.current = isReviewing;
  const [floatingBubbles, setFloatingBubbles] = useState<FloatingBubble[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const draftTodos = useMemo(() => ({
    getDrafts: () => useVoiceChatStore.getState().proposedTodos,
    setDrafts: (todos: TodoItem[]) => {
      const prevTodos = useVoiceChatStore.getState().proposedTodos as TodoItemWithEdited[];
      const prevIds = new Set(prevTodos.map((t) => t.id));

      useVoiceChatStore.getState().setProposedTodos(todos);

      const nowState = useVoiceChatStore.getState();
      if (!nowState.isOpen) return;
      if (nowState.mode !== 'coach') return;
      if (isReviewingRef.current) return;

      const newExtracted = (todos as TodoItemWithEdited[])
        .filter((t) => !prevIds.has(t.id) && !t._userEdited);
      if (newExtracted.length === 0) return;

      const now = Date.now();
      const bubbles: FloatingBubble[] = newExtracted.map((t, i) => ({
        id: t.id,
        text: t.text,
        spawnedAt: now,
        delayMs: i * 200,
      }));
      setFloatingBubbles((prevB) => [...prevB, ...bubbles]);
    },
  }), []);

  const {
    startConversation,
    stopConversation,
    status,
    isSpeaking,
    transcript,
    error,
    micMuted,
    setMicMuted,
    volume,
    setVolume,
    sendUserActivity,
  } = useVoiceAgent({ mode, draftTodos });

  const hasStartedRef = useRef(false);
  const startConversationRef = useRef(startConversation);
  startConversationRef.current = startConversation;
  const sendUserActivityRef = useRef(sendUserActivity);
  sendUserActivityRef.current = sendUserActivity;
  const lastTranscriptAtRef = useRef<number>(Date.now());

  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  const settleBubble = useCallback((id: string) => {
    setFloatingBubbles((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const floatingIds = useMemo(() => new Set(floatingBubbles.map((b) => b.id)), [floatingBubbles]);

  const extractionCallbacks = useMemo(() => ({
    getProposedTodos: () => useVoiceChatStore.getState().proposedTodos,
    setProposedTodos: (todos: TodoItem[]) => {
      const prev = useVoiceChatStore.getState().proposedTodos as TodoItemWithEdited[];
      const prevIds = new Set(prev.map((t) => t.id));

      useVoiceChatStore.getState().setProposedTodos(todos);

      if (mode !== 'coach') return;
      if (isReviewing) return;

      const newExtracted = (todos as TodoItemWithEdited[])
        .filter((t) => !prevIds.has(t.id) && !t._userEdited);
      if (newExtracted.length === 0) return;

      const now = Date.now();
      const bubbles: FloatingBubble[] = newExtracted.map((t, i) => ({
        id: t.id,
        text: t.text,
        spawnedAt: now,
        delayMs: i * 200,
      }));
      setFloatingBubbles((prevB) => [...prevB, ...bubbles]);
    },
    setIsExtracting: (v: boolean) => useVoiceChatStore.getState().setIsExtracting(v),
    setMissingGeminiKey: (v: boolean) => useVoiceChatStore.getState().setMissingGeminiKey(v),
  }), [mode, isReviewing]);

  const { setProposedTodos: updateProposedTodos } = useTranscriptTodoExtraction(
    transcript,
    status,
    extractionCallbacks,
    { enabled: false },
  );

  // Auto-start conversation when dialog opens
  useEffect(() => {
    if (isOpen && !hasStartedRef.current) {
      hasStartedRef.current = true;
      isReviewingRef.current = false;
      setIsReviewing(false);
      setFloatingBubbles([]);
      setSaveError(null);
      startConversationRef.current();

      // Load existing DB todos for coach mode panel
      if (mode === 'coach') {
        getNorotAPI().getTodos()
          .then((todos) => useVoiceChatStore.getState().setDbTodos(todos.filter((t) => !t.done)))
          .catch(() => { /* ignore */ });
      }
    }
    if (!isOpen) {
      hasStartedRef.current = false;
      setConfirmingClose(false);
      isReviewingRef.current = false;
      setIsReviewing(false);
      setFloatingBubbles([]);
      setIsSaving(false);
      setSaveError(null);
    }
  }, [isOpen, mode]);

  // Subscribe to DB todo changes while dialog is open (coach mode)
  useEffect(() => {
    if (!isOpen || mode !== 'coach') return;
    const unsub = getNorotAPI().onTodosUpdated((updated: TodoItem[]) => {
      useVoiceChatStore.getState().setDbTodos(updated.filter((t) => !t.done));
    });
    return unsub;
  }, [isOpen, mode]);

  // Auto-scroll transcript
  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [transcript]);

  // Track transcript activity so we can avoid infinite keepalive pings.
  useEffect(() => {
    if (transcript.length > 0) lastTranscriptAtRef.current = Date.now();
  }, [transcript.length]);

  // Prevent ElevenLabs' default "Are you still there?"-style nudges by
  // periodically signaling user activity during silence.
  useEffect(() => {
    if (!isConnected) return;
    const IDLE_AFTER_MS = 25_000;
    const MAX_IDLE_MS = 4 * 60_000;
    // Kick once shortly after connect to establish "activity".
    lastTranscriptAtRef.current = Date.now();
    const kick = setTimeout(() => {
      sendUserActivityRef.current();
    }, 1500);

    const interval = setInterval(() => {
      // Only needed while waiting for the user (i.e., not while the agent talks)
      const sinceLastMsg = Date.now() - lastTranscriptAtRef.current;
      if (!isSpeaking && sinceLastMsg >= IDLE_AFTER_MS && sinceLastMsg <= MAX_IDLE_MS) {
        sendUserActivityRef.current();
      }
    }, 20_000);
    return () => {
      clearTimeout(kick);
      clearInterval(interval);
    };
  }, [isConnected, isSpeaking]);

  // Auto-dismiss confirmation if connection drops and no proposed todos
  useEffect(() => {
    if (!isConnected && !storeHasProposed && confirmingClose) {
      setConfirmingClose(false);
    }
  }, [isConnected, storeHasProposed, confirmingClose]);

  const doClose = () => {
    stopConversation();
    // Don't clear proposed todos — keep drafts unless user explicitly saves.
    close();
  };

  // Close with confirmation guard
  const requestClose = () => {
    if (isConnected || storeHasProposed) {
      setConfirmingClose(true);
    } else {
      doClose();
    }
  };

  const handleVoiceDone = async () => {
    if (isConnecting) return;
    if (mode === 'checkin') {
      await stopConversation();
      close();
      return;
    }

    setFloatingBubbles([]);
    isReviewingRef.current = true;
    setIsReviewing(true);
    await stopConversation();
  };

  const handleKeepTalking = () => {
    setSaveError(null);
    isReviewingRef.current = false;
    setIsReviewing(false);
    startConversationRef.current();
  };

  const handleSaveAndClose = async () => {
    const { proposedTodos: currentTodos } = useVoiceChatStore.getState();
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      if (currentTodos.length > 0) {
        await getNorotAPI().appendTodos(currentTodos);
        clearProposedTodos();
      }
    } catch (err) {
      console.error('[voice-chat] Failed to save tasks:', err);
      setSaveError('Failed to save tasks. Your drafts are still here.');
      setIsSaving(false);
      return;
    }
    setIsSaving(false);
    await stopConversation();
    close();
  };

  const hasExisting = dbTodos.length > 0;
  const taskTitle = isReviewing
    ? (proposedTodos.length > 0 ? 'Review & Save' : 'Your Tasks')
    : (hasExisting ? 'Your Tasks' : 'Draft Tasks');
  const showEmptyTalking = !isReviewing;

  const statusText = isReviewing
    ? (mode === 'coach' ? 'Review your tasks and save them.' : 'All set.')
    : isConnecting
      ? 'Connecting...'
      : isSpeaking
        ? (mode === 'checkin' ? 'noRot is speaking...' : 'Coach is speaking...')
        : (mode === 'checkin' ? 'Tell me what you\'re stuck on.' : 'Tell me what you need to get done.');

  const assistantLabel = mode === 'checkin' ? 'noRot' : 'Coach';

  // Escape key handler (Dialog used to handle this automatically)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (confirmingClose) {
          setConfirmingClose(false);
        } else {
          requestClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmingClose]);

  // Body scroll lock (Dialog used to handle this automatically)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="voice-overlay"
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Blur backdrop — click to close */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={requestClose}
          />

          {/* Centered content — no box, no border, no glass bg */}
          <div className="relative z-10 flex h-full items-center justify-center px-6 pointer-events-none">
            <div className="w-full max-w-4xl pointer-events-auto relative">
              {/* Close button */}
              <button
                onClick={requestClose}
                className="absolute -top-2 -right-2 z-20 inline-flex size-9 items-center justify-center rounded-md border border-transparent text-text-secondary opacity-80 transition-all hover:border-primary/35 hover:bg-primary/12 hover:text-primary hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>

              <LayoutGroup>
                <div className="flex flex-col md:flex-row gap-8 w-full md:items-center items-center">
                  {/* Left column: voice experience */}
                  <div className="flex-1 flex flex-col items-center gap-4 relative min-w-0">
                    {/* Orb + floating bubbles */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0, filter: 'blur(12px)' }}
                      animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                      transition={{ type: 'spring', duration: 0.8, bounce: 0.3, delay: 0.05 }}
                    >
                      <motion.div
                        className="relative mx-auto"
                        animate={{
                          width: isReviewing ? 80 : 160,
                          height: isReviewing ? 80 : 160,
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      >
                        <VoiceOrb
                          detail={10}
                          interactive={false}
                          paused={status !== 'connected'}
                        />
                        <AnimatePresence>
                          {!isReviewing && floatingBubbles.map((bubble, i) => (
                            <FloatingTaskBubble
                              key={bubble.id}
                              bubble={bubble}
                              index={i}
                              onSettle={settleBubble}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>

                    {/* Status indicator */}
                    <p className="text-text-secondary text-sm text-center">
                      {statusText}
                    </p>

                    {/* Error state / transcript */}
                    {error ? (
                      <div className="text-center space-y-3">
                        <p className="text-sm text-red-400">{error.message}</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {error.canRetry && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startConversationRef.current()}
                              className="gap-1"
                            >
                              <RotateCcw className="size-3" />
                              Try Again
                            </Button>
                          )}
                          {error.code === 'NO_API_KEY' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                doClose();
                                useAppStore.getState().setActivePage('settings');
                              }}
                              className="gap-1"
                            >
                              <Settings className="size-3" />
                              Open Settings
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <AnimatePresence>
                        {!isReviewing && transcript.length > 0 && (
                          <motion.div
                            key="transcript"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.35 }}
                            className="w-full max-w-lg"
                          >
                            <div
                              ref={transcriptScrollRef}
                              className="w-full max-h-40 overflow-y-auto space-y-2 px-4"
                            >
                              {transcript.map((msg, i) => (
                                <p
                                  key={i}
                                  className={cn(
                                    'text-sm',
                                    msg.role === 'user' ? 'text-text-secondary' : 'text-primary',
                                  )}
                                >
                                  <span className="font-medium">
                                    {msg.role === 'user' ? 'You' : assistantLabel}:
                                  </span>{' '}
                                  {msg.content}
                                </p>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}

                    {/* Controls */}
                    <VoiceControls
                      micMuted={micMuted}
                      onToggleMic={() => setMicMuted(!micMuted)}
                      volume={volume}
                      onVolumeChange={setVolume}
                      disabled={isConnecting}
                    />

                    {/* Primary actions */}
                    <div className="flex flex-wrap gap-2 justify-center pt-2">
                      {!isReviewing ? (
                        <Button
                          size="lg"
                          onClick={handleVoiceDone}
                          disabled={isConnecting}
                        >
                          I'm done
                        </Button>
                      ) : mode === 'coach' && proposedTodos.length > 0 ? (
                        <>
                          <Button
                            size="lg"
                            onClick={handleSaveAndClose}
                            disabled={isSaving}
                          >
                            <Save className="size-4 mr-2" />
                            {isSaving
                              ? 'Saving...'
                              : `Save ${proposedTodos.length} new task${proposedTodos.length !== 1 ? 's' : ''}`}
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={handleKeepTalking}
                            disabled={isSaving}
                          >
                            Keep talking
                          </Button>
                        </>
                      ) : (
                        <Button size="lg" variant="outline" onClick={requestClose}>
                          Close
                        </Button>
                      )}
                    </div>

                    {saveError && (
                      <p className="text-xs text-danger text-center">{saveError}</p>
                    )}
                  </div>

                  {/* Right column: tasks (coach mode only) */}
                  {mode === 'coach' && (
                    <VoiceTaskPanel
                      title={taskTitle}
                      existingTodos={dbTodos}
                      isExtracting={isExtracting}
                      missingGeminiKey={missingGeminiKey}
                      todos={proposedTodos}
                      floatingIds={floatingIds}
                      onUpdateTodos={updateProposedTodos}
                      itemLayoutIdPrefix="task-bubble-"
                      emptyText={showEmptyTalking ? 'Tasks will appear as you talk...' : undefined}
                      showOptionalTimeHint={!isReviewing}
                      timeHintText="Add times as you go, or set them here."
                    />
                  )}
                </div>
              </LayoutGroup>

              {/* Close Confirmation Overlay — full screen, above everything */}
              {confirmingClose && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="confirm-close-title"
                  aria-describedby="confirm-close-desc"
                  className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm"
                >
                  <p id="confirm-close-title" className="text-lg font-semibold text-text-primary">
                    {mode === 'checkin' ? 'End check-in?' : 'End conversation?'}
                  </p>
                  <p id="confirm-close-desc" className="text-sm text-text-secondary">
                    {storeHasProposed
                      ? 'You have unsaved draft tasks.'
                      : (mode === 'checkin' ? 'You can always open another check-in later.' : 'Your conversation will not be saved.')}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSaveError(null);
                        setConfirmingClose(false);
                      }}
                      disabled={isSaving}
                    >
                      Stay
                    </Button>
                    {storeHasProposed && (
                      <Button
                        variant="outline"
                        className="border-primary/30 text-primary hover:bg-primary/10"
                        onClick={handleSaveAndClose}
                        disabled={isSaving}
                      >
                        <Save className="size-3 mr-1" />
                        {isSaving ? 'Saving...' : 'Save & close'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="border-danger/30 text-danger hover:bg-danger/10"
                      onClick={doClose}
                      disabled={isSaving}
                    >
                      {storeHasProposed ? 'Close & keep drafts' : 'End chat'}
                    </Button>
                  </div>
                  {saveError && (
                    <p className="text-xs text-danger mt-2">{saveError}</p>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
