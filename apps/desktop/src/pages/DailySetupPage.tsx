import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, List, RotateCcw, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/GlassCard';
import { TodoItemList } from '@/components/TodoItemList';
import { TodoPreviewList } from '@/components/TodoPreviewList';
import { PersonaSelector } from '@/components/PersonaSelector';
import { VoiceOrb } from '@/components/VoiceOrb';
import { slideVariants, slideTransition } from '@/lib/animation-variants';
import { getNorotAPI } from '@/lib/norot-api';
import { useDailySetupStore } from '@/stores/daily-setup-store';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { cn } from '@/lib/utils';
import type { TodoItem, Persona } from '@norot/shared';

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

const STEPS = ['greeting', 'chat', 'preview', 'confirm'] as const;

export function DailySetupPage({ onComplete, onSkip }: DailySetupPageProps) {
  const {
    step, inputMode, previewTodos,
    setStep, setInputMode, setPreviewTodos,
    reset,
  } = useDailySetupStore();

  const [direction, setDirection] = useState(1);
  const [hasGemini, setHasGemini] = useState<boolean | null>(null);
  const [hasElevenLabs, setHasElevenLabs] = useState(false);
  const [persona, setPersona] = useState<Persona>('calm_friend');
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);

  // Manual todo state
  const [manualTodos, setManualTodos] = useState<TodoItem[]>([]);

  // Extracting state
  const [isExtracting, setIsExtracting] = useState(false);

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
        setPersona(settings.persona);
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

  const goTo = (target: typeof STEPS[number]) => {
    const currentIdx = STEPS.indexOf(step);
    const targetIdx = STEPS.indexOf(target);
    setDirection(targetIdx > currentIdx ? 1 : -1);
    setStep(target);
  };

  const handleSelectMode = (mode: 'voice' | 'manual') => {
    setInputMode(mode);
    goTo('chat');
  };

  const handleVoiceDone = async () => {
    await voiceAgent.stopConversation();

    // Build transcript string from voice agent transcript
    const transcript = voiceAgent.transcript
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    if (!transcript.trim()) {
      // No transcript — go straight to manual
      goTo('preview');
      return;
    }

    setIsExtracting(true);
    try {
      const todos = await getNorotAPI().extractTodos(transcript);
      setPreviewTodos(todos);
    } catch (err) {
      console.error('[DailySetup] extract todos from voice error:', err);
    }
    setIsExtracting(false);
    goTo('preview');
  };

  const handleManualContinue = () => {
    setPreviewTodos(manualTodos);
    goTo('preview');
  };

  const handleManualTodoAdd = (text: string) => {
    const todo: TodoItem = {
      id: crypto.randomUUID(),
      text,
      done: false,
      order: manualTodos.length,
    };
    setManualTodos((prev) => [...prev, todo]);
  };

  const handleManualTodoToggle = (id: string) => {
    setManualTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  };

  const handleManualTodoDelete = (id: string) => {
    setManualTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const handlePreviewUpdate = (todos: TodoItem[]) => {
    setPreviewTodos(todos);
  };

  const handleFinish = async () => {
    try {
      const api = getNorotAPI();
      if (previewTodos.length > 0) {
        await api.setTodos(previewTodos);
      }
    } catch {
      // Continue even on error
    }
    onComplete();
  };

  const handlePersonaChange = async (p: Persona) => {
    setPersona(p);
    setShowPersonaPicker(false);
    try {
      await getNorotAPI().updateSettings({ persona: p });
    } catch { /* ignore */ }
  };

  if (hasGemini === null) return null;

  const stepIndex = STEPS.indexOf(step);

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
        {STEPS.map((_, i) => (
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
      <div className="w-full max-w-lg">
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

                {/* Current persona */}
                {showPersonaPicker ? (
                  <div className="w-full">
                    <PersonaSelector
                      selectedPersona={persona}
                      onSelect={handlePersonaChange}
                      compact
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPersonaPicker(true)}
                    className="text-xs text-text-muted hover:text-primary transition-colors"
                  >
                    Coach: <span className="text-text-secondary">{persona.replace('_', ' ')}</span> &middot; change
                  </button>
                )}

                {/* Mode selection buttons */}
                <div className="flex flex-col gap-2 w-full mt-2">
                  {hasElevenLabs && hasGemini && (
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
                  {!hasGemini && !hasElevenLabs && (
                    <p className="text-xs text-text-muted">
                      Add API keys in Settings to unlock AI features.
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
                  />
                  <div className="flex justify-center">
                    <Button
                      size="lg"
                      onClick={handleManualContinue}
                      disabled={manualTodos.length === 0}
                    >
                      Continue
                    </Button>
                  </div>
                </GlassCard>
              ) : (
                <div className="flex flex-col gap-4 items-center">
                  {/* Inline VoiceOrb with spring reveal */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0, filter: 'blur(12px)' }}
                    animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                    transition={{ type: 'spring', duration: 0.8, bounce: 0.3, delay: 0.2 }}
                    className="w-40 h-40 mx-auto mb-4"
                  >
                    <VoiceOrb detail={10} interactive={false} />
                  </motion.div>

                  {/* Voice error state */}
                  {voiceAgent.error ? (
                    <div className="text-center space-y-3">
                      <p className="text-sm text-red-400">{voiceAgent.error.message}</p>
                      <div className="flex gap-2 justify-center">
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
                              goTo('greeting');
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
                    <>
                      {/* Status indicator */}
                      <p className="text-text-secondary text-sm text-center">
                        {voiceAgent.status === 'connecting'
                          ? 'Connecting...'
                          : voiceAgent.isSpeaking
                            ? 'Coach is speaking...'
                            : 'Tell me about your day.'}
                      </p>

                      {/* Real-time transcript */}
                      {voiceAgent.transcript.length > 0 && (
                        <div className="w-full max-h-48 overflow-y-auto space-y-2 px-4">
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
                      )}
                    </>
                  )}

                  {/* Done button */}
                  <div className="flex justify-center">
                    <Button
                      size="lg"
                      onClick={handleVoiceDone}
                      disabled={voiceAgent.status === 'connecting' || isExtracting}
                    >
                      {isExtracting ? 'Generating...' : "I'm done"}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Task Preview */}
          {step === 'preview' && (
            <motion.div
              key="preview"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
            >
              <GlassCard className="px-8">
                <h2 className="text-2xl font-bold text-text-primary tracking-tight text-center">
                  Review Your Tasks
                </h2>
                <p className="text-text-secondary text-sm text-center">
                  Edit, add, or remove tasks. Click a task to rename it.
                </p>
                <TodoPreviewList
                  todos={previewTodos}
                  onUpdate={handlePreviewUpdate}
                />
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={() => goTo('confirm')}
                    disabled={previewTodos.length === 0}
                  >
                    Looks good!
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
            >
              <GlassCard className="items-center text-center px-8">
                <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                  You're all set!
                </h2>
                <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
                  Let's get to work! noRot will keep you on track.
                </p>
                <Button size="lg" onClick={handleFinish} className="mt-2">
                  Start my day
                </Button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </div>
  );
}
