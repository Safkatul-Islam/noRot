import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Mic, List, RotateCcw, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/GlassCard';
import { TodoItemList } from '@/components/TodoItemList';

import { VoiceOrb } from '@/components/VoiceOrb';
import { VoiceControls } from '@/components/VoiceControls';
import { DailySetupTaskPanel } from '@/components/DailySetupTaskPanel';
import { FloatingTaskBubble } from '@/components/FloatingTaskBubble';
import { slideVariants, slideTransition } from '@/lib/animation-variants';
import { getNorotAPI, isElectron } from '@/lib/norot-api';
import { useDailySetupStore } from '@/stores/daily-setup-store';
import { useTranscriptTodoExtraction } from '@/hooks/useTranscriptTodoExtraction';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { cn } from '@/lib/utils';
import type { TodoItem } from '@norot/shared';

interface DailySetupPageProps {
  onComplete: () => void;
  onSkip?: () => void;
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const STEPS = ['greeting', 'chat', 'preview'] as const;

interface TodoItemWithEdited extends TodoItem {
  _userEdited?: boolean;
}

export function DailySetupPage({ onComplete, onSkip }: DailySetupPageProps) {
  const {
    step,
    inputMode,
    previewTodos,
    isReviewing,
    isExtracting,
    missingGeminiKey,
    floatingBubbles,
    setStep,
    setInputMode,
    setPreviewTodos,
    setIsReviewing,
    setIsExtracting,
    setMissingGeminiKey,
    addFloatingBubbles,
    removeFloatingBubble,
    clearFloatingBubbles,
    reset,
  } = useDailySetupStore();

  const [direction, setDirection] = useState(1);
  const [hasGemini, setHasGemini] = useState<boolean | null>(null);
  const [hasElevenLabs, setHasElevenLabs] = useState(false);
  // Manual todo state
  const [manualTodos, setManualTodos] = useState<TodoItem[]>([]);

  // Voice agent hook
  const voiceAgent = useVoiceAgent();

  // Check if API keys are configured & load persona
  useEffect(() => {
    getNorotAPI().getSettings()
      .then((settings) => {
        const geminiKey = typeof settings.geminiApiKey === 'string' ? settings.geminiApiKey.trim() : '';
        setHasGemini(geminiKey.length > 0);
        const elKey = typeof settings.elevenLabsApiKey === 'string' ? settings.elevenLabsApiKey.trim() : '';
        setHasElevenLabs(elKey.length > 0);
      })
      .catch(() => {
        setHasGemini(false);
        setHasElevenLabs(false);
      });
  }, []);

  // Reset store on mount
  useEffect(() => {
    reset();
  }, [reset]);

  // Cleanup voice agent when mode changes or component unmounts
  useEffect(() => {
    return () => {
      voiceAgent.stopConversation();
    };
  }, [inputMode]);

  // Start voice conversation when entering voice step
  useEffect(() => {
    if (step === 'chat' && inputMode === 'voice' && voiceAgent.status === 'disconnected') {
      voiceAgent.startConversation();
    }
  }, [step, inputMode]);

  const extractionCallbacks = useMemo(() => ({
    getProposedTodos: () => useDailySetupStore.getState().previewTodos,
    setProposedTodos: (todos: TodoItem[]) => {
      useDailySetupStore.setState((prev) => {
        const prevIds = new Set((prev.previewTodos as TodoItemWithEdited[]).map((t) => t.id));
        const newExtracted = (todos as TodoItemWithEdited[]).filter((t) => !prevIds.has(t.id) && !t._userEdited);
        if (prev.isReviewing || newExtracted.length === 0) {
          return { previewTodos: todos };
        }

        const now = Date.now();
        const bubbles = newExtracted.map((t, i) => ({
          id: t.id,
          text: t.text,
          spawnedAt: now,
          delayMs: i * 200,
        }));

        return {
          previewTodos: todos,
          floatingBubbles: [...prev.floatingBubbles, ...bubbles],
        };
      });
    },
    setIsExtracting: (v: boolean) => useDailySetupStore.getState().setIsExtracting(v),
    setMissingGeminiKey: (v: boolean) => useDailySetupStore.getState().setMissingGeminiKey(v),
  }), []);

  const { setProposedTodos: setExtractedTodos } = useTranscriptTodoExtraction(
    voiceAgent.transcript,
    voiceAgent.status,
    extractionCallbacks,
  );

  const settleBubble = useCallback((id: string) => {
    removeFloatingBubble(id);
  }, [removeFloatingBubble]);

  const floatingIds = useMemo(() => new Set(floatingBubbles.map((b) => b.id)), [floatingBubbles]);

  const goTo = (target: typeof STEPS[number]) => {
    const currentIdx = STEPS.indexOf(step);
    const targetIdx = STEPS.indexOf(target);
    setDirection(targetIdx > currentIdx ? 1 : -1);
    setStep(target);
  };

  const handleSelectMode = (mode: 'voice' | 'manual') => {
    setInputMode(mode);
    setIsReviewing(false);
    setIsExtracting(false);
    setMissingGeminiKey(false);
    clearFloatingBubbles();
    setPreviewTodos([]);
    setManualTodos([]);
    goTo('chat');
  };

  const handleVoiceDone = async () => {
    clearFloatingBubbles();
    setIsReviewing(true);
    await voiceAgent.stopConversation();
  };

  const handleStartDay = async () => {
    await handleFinish();
  };

  const handleManualContinue = async () => {
    await handleFinish(manualTodos);
  };

  const handleManualTodoAdd = (text: string, app?: string, url?: string) => {
    const todo: TodoItem = {
      id: crypto.randomUUID(),
      text,
      done: false,
      order: manualTodos.length,
      ...(app ? { app } : {}),
      ...(url ? { url } : {}),
    };
    setManualTodos((prev) => [...prev, todo]);
  };

  const handleManualTodoToggle = (id: string) => {
    setManualTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleManualTodoDelete = (id: string) => {
    setManualTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const handleManualTodoUpdate = (id: string, fields: Partial<Omit<TodoItem, 'id'>>) => {
    setManualTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...fields } : t)));
  };

  const handleFinish = async (todosOverride?: TodoItem[]) => {
    const todosToSaveRaw = (todosOverride ?? previewTodos) as TodoItemWithEdited[];
    const todosToSave = todosToSaveRaw.map((t, i) => {
      // Strip internal edit marker before persisting
      const { _userEdited: _ignored, ...rest } = t;
      return { ...rest, order: i } satisfies TodoItem;
    });
    try {
      const api = getNorotAPI();
      if (todosToSave.length > 0) {
        await api.setTodos(todosToSave);
      }
    } catch {
      // Continue even on error
    }
    onComplete();
  };

  if (hasGemini === null) return null;

  const canVoice = isElectron() && hasElevenLabs;

  const stepsForDots = step === 'chat' && inputMode === 'voice'
    ? (['greeting', 'chat'] as const)
    : STEPS;
  const stepIndex = Math.max(0, (stepsForDots as readonly string[]).indexOf(step));

  return (
    <div className="flex flex-col min-h-screen">
      {/* Draggable title bar for macOS */}
      <div
        className="h-10 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
      <div className="flex flex-col flex-1 items-center justify-center px-6">
      {/* Step dots */}
      <div className="flex gap-2 mb-8">
        {stepsForDots.map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              i === stepIndex
                ? 'bg-primary scale-125 shadow-[0_0_8px_var(--color-glow-primary)]'
                : i < stepIndex
                  ? 'bg-primary/40'
                  : 'bg-white/15',
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div
        className={cn(
          'w-full',
          step === 'chat' && inputMode === 'voice' ? 'max-w-4xl' : 'max-w-lg',
        )}
      >
        <AnimatePresence mode="wait" custom={direction}>
          {/* Step 1: Greeting + Mode Selection */}
          {step === 'greeting' && (
            <motion.div
              key="greeting"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
            >
              <GlassCard className="items-center text-center px-8">
                <h1 className="text-3xl font-bold text-text-primary tracking-tight">
                  {getTimeOfDayGreeting()}!
                </h1>
                <p className="text-text-secondary text-sm leading-relaxed">
                  What's on your plate today?
                </p>

                {/* Mode selection buttons */}
                <div className="flex flex-col gap-2 w-full mt-2">
                  {canVoice && (
                    <Button
                      size="lg"
                      onClick={() => handleSelectMode('voice')}
                      className="w-full gap-2"
                    >
                      <Mic className="size-4" />
                      Talk to AI
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => handleSelectMode('manual')}
                    className="w-full gap-2"
                  >
                    <List className="size-4" />
                    Add Manually
                  </Button>
                  {!isElectron() && (
                    <p className="text-xs text-text-muted">
                      Voice mode is only available in the desktop app.
                    </p>
                  )}
                  {isElectron() && !hasElevenLabs && (
                    <p className="text-xs text-text-muted">
                      Add an ElevenLabs API key in Settings to unlock voice mode.
                    </p>
                  )}
                  {isElectron() && hasElevenLabs && !hasGemini && (
                    <p className="text-xs text-text-muted">
                      Voice mode is enabled. Add a Gemini API key in Settings to auto-extract tasks from your conversation.
                    </p>
                  )}
                </div>
                {onSkip && (
                  <button
                    onClick={onSkip}
                    className="text-xs text-text-muted hover:text-text-secondary transition-colors py-1 px-2"
                  >
                    Skip setup &rarr;
                  </button>
                )}
              </GlassCard>
            </motion.div>
          )}

          {/* Step 2: Task Input */}
          {step === 'chat' && (
            <motion.div
              key="chat"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
            >
              {inputMode === 'manual' ? (
                <GlassCard className="px-8">
                  <h2 className="text-2xl font-bold text-text-primary tracking-tight text-center">
                    Add Your Tasks
                  </h2>
                  <p className="text-text-secondary text-sm text-center">
                    What do you need to get done today?
                  </p>
                  <TodoItemList
                    todos={manualTodos}
                    onToggle={handleManualTodoToggle}
                    onDelete={handleManualTodoDelete}
                    onAdd={handleManualTodoAdd}
                    onUpdate={handleManualTodoUpdate}
                  />
                  <div className="flex justify-center">
                    <Button
                      size="lg"
                      onClick={handleManualContinue}
                      disabled={manualTodos.length === 0}
                    >
                      Start my day
                    </Button>
                  </div>
                </GlassCard>
              ) : (
                <LayoutGroup>
                  <div className="flex flex-col md:flex-row gap-8 w-full md:items-center items-center">
                    {/* Left column: voice experience */}
                    <div className="flex-1 flex flex-col items-center gap-4 relative min-w-0">
                      {/* Orb + floating bubbles */}
                      <motion.div
                        initial={{ scale: 0, opacity: 0, filter: 'blur(12px)' }}
                        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                        transition={{ type: 'spring', duration: 0.8, bounce: 0.3, delay: 0.1 }}
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
                            paused={voiceAgent.status !== 'connected'}
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
                        {isReviewing
                          ? 'Review your tasks and start your day.'
                          : voiceAgent.status === 'connecting'
                            ? 'Connecting...'
                            : voiceAgent.isSpeaking
                              ? 'Coach is speaking...'
                              : 'Tell me about your day.'}
                      </p>

                      {/* Voice error state */}
                      {voiceAgent.error ? (
                        <div className="text-center space-y-3">
                          <p className="text-sm text-red-400">{voiceAgent.error.message}</p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {voiceAgent.error.canRetry ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => voiceAgent.startConversation()}
                                className="gap-1"
                              >
                                <RotateCcw className="size-3" />
                                Try Again
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  voiceAgent.stopConversation();
                                  reset();
                                }}
                                className="gap-1"
                              >
                                <ChevronLeft className="size-3" />
                                Go Back
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                voiceAgent.stopConversation();
                                handleSelectMode('manual');
                              }}
                            >
                              Switch to Manual
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {!isReviewing && voiceAgent.transcript.length > 0 && (
                            <motion.div
                              key="transcript"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.35 }}
                              className="w-full max-w-lg"
                            >
                              <div className="w-full max-h-40 overflow-y-auto space-y-2 px-4">
                                {voiceAgent.transcript.map((msg, i) => (
                                  <p
                                    key={i}
                                    className={cn(
                                      'text-sm',
                                      msg.role === 'user' ? 'text-text-secondary' : 'text-primary',
                                    )}
                                  >
                                    <span className="font-medium">
                                      {msg.role === 'user' ? 'You' : 'Coach'}:
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
                        micMuted={voiceAgent.micMuted}
                        onToggleMic={() => voiceAgent.setMicMuted(!voiceAgent.micMuted)}
                        volume={voiceAgent.volume}
                        onVolumeChange={voiceAgent.setVolume}
                        disabled={voiceAgent.status === 'connecting'}
                      />

                      {/* Primary action */}
                      <div className="flex justify-center pt-2">
                        <Button
                          size="lg"
                          onClick={isReviewing ? handleStartDay : handleVoiceDone}
                          disabled={
                            (!isReviewing && voiceAgent.status === 'connecting')
                            || (isReviewing && (isExtracting || previewTodos.length === 0))
                          }
                        >
                          {isReviewing
                            ? (isExtracting ? 'Finishing...' : 'Start my day')
                            : "I'm done"}
                        </Button>
                      </div>
                    </div>

                    {/* Right column: task panel (always visible) */}
                    <DailySetupTaskPanel
                      isReviewing={isReviewing}
                      isExtracting={isExtracting}
                      missingGeminiKey={missingGeminiKey}
                      todos={previewTodos}
                      floatingIds={floatingIds}
                      onUpdateTodos={setExtractedTodos}
                    />
                  </div>
                </LayoutGroup>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </div>
  );
}
