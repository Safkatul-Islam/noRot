import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Mic, List, RotateCcw, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/GlassCard';
import { TodoItemList } from '@/components/TodoItemList';
import { VoiceOrb } from '@/components/VoiceOrb';
import { DailySetupTaskPanel } from '@/components/DailySetupTaskPanel';
import { FloatingTaskBubble } from '@/components/FloatingTaskBubble';
import { slideVariants, slideTransition } from '@/lib/animation-variants';
import { getNorotAPI, isElectron } from '@/lib/norot-api';
import { useDailySetupStore } from '@/stores/daily-setup-store';
import { useTranscriptTodoExtraction } from '@/hooks/useTranscriptTodoExtraction';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { cn } from '@/lib/utils';
function getTimeOfDayGreeting() {
    const hour = new Date().getHours();
    if (hour < 12)
        return 'Good morning';
    if (hour < 17)
        return 'Good afternoon';
    return 'Good evening';
}
const STEPS = ['greeting', 'chat', 'preview'];
export function DailySetupPage({ onComplete, onSkip }) {
    const { step, inputMode, previewTodos, isReviewing, isExtracting, missingGeminiKey, floatingBubbles, setStep, setInputMode, setPreviewTodos, setIsReviewing, setIsExtracting, setMissingGeminiKey, addFloatingBubbles, removeFloatingBubble, clearFloatingBubbles, reset, } = useDailySetupStore();
    const [direction, setDirection] = useState(1);
    const [hasGemini, setHasGemini] = useState(null);
    const [hasElevenLabs, setHasElevenLabs] = useState(false);
    // Manual todo state
    const [manualTodos, setManualTodos] = useState([]);
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
        setProposedTodos: (todos) => {
            useDailySetupStore.setState((prev) => {
                const prevIds = new Set(prev.previewTodos.map((t) => t.id));
                const newExtracted = todos.filter((t) => !prevIds.has(t.id) && !t._userEdited);
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
        setIsExtracting: (v) => useDailySetupStore.getState().setIsExtracting(v),
        setMissingGeminiKey: (v) => useDailySetupStore.getState().setMissingGeminiKey(v),
    }), []);
    const { setProposedTodos: setExtractedTodos } = useTranscriptTodoExtraction(voiceAgent.transcript, voiceAgent.status, extractionCallbacks);
    const settleBubble = useCallback((id) => {
        removeFloatingBubble(id);
    }, [removeFloatingBubble]);
    const floatingIds = useMemo(() => new Set(floatingBubbles.map((b) => b.id)), [floatingBubbles]);
    const goTo = (target) => {
        const currentIdx = STEPS.indexOf(step);
        const targetIdx = STEPS.indexOf(target);
        setDirection(targetIdx > currentIdx ? 1 : -1);
        setStep(target);
    };
    const handleSelectMode = (mode) => {
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
    const handleManualTodoAdd = (text, app, url) => {
        const todo = {
            id: crypto.randomUUID(),
            text,
            done: false,
            order: manualTodos.length,
            ...(app ? { app } : {}),
            ...(url ? { url } : {}),
        };
        setManualTodos((prev) => [...prev, todo]);
    };
    const handleManualTodoToggle = (id) => {
        setManualTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
    };
    const handleManualTodoDelete = (id) => {
        setManualTodos((prev) => prev.filter((t) => t.id !== id));
    };
    const handleManualTodoUpdate = (id, fields) => {
        setManualTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...fields } : t)));
    };
    const handleFinish = async (todosOverride) => {
        const todosToSaveRaw = (todosOverride ?? previewTodos);
        const todosToSave = todosToSaveRaw.map((t, i) => {
            // Strip internal edit marker before persisting
            const { _userEdited: _ignored, ...rest } = t;
            return { ...rest, order: i };
        });
        try {
            const api = getNorotAPI();
            if (todosToSave.length > 0) {
                await api.setTodos(todosToSave);
            }
        }
        catch {
            // Continue even on error
        }
        onComplete();
    };
    if (hasGemini === null)
        return null;
    const canVoice = isElectron() && hasElevenLabs;
    const stepsForDots = step === 'chat' && inputMode === 'voice'
        ? ['greeting', 'chat']
        : STEPS;
    const stepIndex = Math.max(0, stepsForDots.indexOf(step));
    return (_jsxs("div", { className: "flex flex-col min-h-screen", children: [_jsx("div", { className: "h-10 shrink-0", style: { WebkitAppRegion: 'drag' } }), _jsxs("div", { className: "flex flex-col flex-1 items-center justify-center px-6", children: [_jsx("div", { className: "flex gap-2 mb-8", children: stepsForDots.map((_, i) => (_jsx("div", { className: cn('w-2 h-2 rounded-full transition-all duration-300', i === stepIndex
                                ? 'bg-primary scale-125 shadow-[0_0_8px_var(--color-glow-primary)]'
                                : i < stepIndex
                                    ? 'bg-primary/40'
                                    : 'bg-white/15') }, i))) }), _jsx("div", { className: cn('w-full', step === 'chat' && inputMode === 'voice' ? 'max-w-4xl' : 'max-w-lg'), children: _jsxs(AnimatePresence, { mode: "wait", custom: direction, children: [step === 'greeting' && (_jsx(motion.div, { custom: direction, variants: slideVariants, initial: "enter", animate: "center", exit: "exit", transition: slideTransition, children: _jsxs(GlassCard, { className: "items-center text-center px-8", children: [_jsxs("h1", { className: "text-3xl font-bold text-text-primary tracking-tight", children: [getTimeOfDayGreeting(), "!"] }), _jsx("p", { className: "text-text-secondary text-sm leading-relaxed", children: "What's on your plate today?" }), _jsxs("div", { className: "flex flex-col gap-2 w-full mt-2", children: [canVoice && (_jsxs(Button, { size: "lg", onClick: () => handleSelectMode('voice'), className: "w-full gap-2", children: [_jsx(Mic, { className: "size-4" }), "Talk to AI"] })), _jsxs(Button, { size: "lg", variant: "outline", onClick: () => handleSelectMode('manual'), className: "w-full gap-2", children: [_jsx(List, { className: "size-4" }), "Add Manually"] }), !isElectron() && (_jsx("p", { className: "text-xs text-text-muted", children: "Voice mode is only available in the desktop app." })), isElectron() && !hasElevenLabs && (_jsx("p", { className: "text-xs text-text-muted", children: "Add an ElevenLabs API key in Settings to unlock voice mode." })), isElectron() && hasElevenLabs && !hasGemini && (_jsx("p", { className: "text-xs text-text-muted", children: "Voice mode is enabled. Add a Gemini API key in Settings to auto-extract tasks from your conversation." }))] }), onSkip && (_jsx("button", { onClick: onSkip, className: "text-xs text-text-muted hover:text-text-secondary transition-colors py-1 px-2", children: "Skip setup \u2192" }))] }) }, "greeting")), step === 'chat' && (_jsx(motion.div, { custom: direction, variants: slideVariants, initial: "enter", animate: "center", exit: "exit", transition: slideTransition, children: inputMode === 'manual' ? (_jsxs(GlassCard, { className: "px-8", children: [_jsx("h2", { className: "text-2xl font-bold text-text-primary tracking-tight text-center", children: "Add Your Tasks" }), _jsx("p", { className: "text-text-secondary text-sm text-center", children: "What do you need to get done today?" }), _jsx(TodoItemList, { todos: manualTodos, onToggle: handleManualTodoToggle, onDelete: handleManualTodoDelete, onAdd: handleManualTodoAdd, onUpdate: handleManualTodoUpdate }), _jsx("div", { className: "flex justify-center", children: _jsx(Button, { size: "lg", onClick: handleManualContinue, disabled: manualTodos.length === 0, children: "Start my day" }) })] })) : (_jsx(LayoutGroup, { children: _jsxs("div", { className: "flex flex-col md:flex-row gap-6 w-full items-start", children: [_jsxs("div", { className: "flex-1 flex flex-col items-center gap-4 relative", children: [_jsx(motion.div, { initial: { scale: 0, opacity: 0, filter: 'blur(12px)' }, animate: { scale: 1, opacity: 1, filter: 'blur(0px)' }, transition: { type: 'spring', duration: 0.8, bounce: 0.3, delay: 0.1 }, children: _jsxs(motion.div, { className: "relative mx-auto", animate: {
                                                                    width: isReviewing ? 80 : 160,
                                                                    height: isReviewing ? 80 : 160,
                                                                }, transition: { type: 'spring', stiffness: 300, damping: 25 }, children: [_jsx(VoiceOrb, { detail: 10, interactive: false, paused: voiceAgent.status !== 'connected' }), _jsx(AnimatePresence, { children: !isReviewing && floatingBubbles.map((bubble, i) => (_jsx(FloatingTaskBubble, { bubble: bubble, index: i, onSettle: settleBubble }, bubble.id))) })] }) }), _jsx("p", { className: "text-text-secondary text-sm text-center", children: isReviewing
                                                                ? 'Review your tasks and start your day.'
                                                                : voiceAgent.status === 'connecting'
                                                                    ? 'Connecting...'
                                                                    : voiceAgent.isSpeaking
                                                                        ? 'Coach is speaking...'
                                                                        : 'Tell me about your day.' }), voiceAgent.error ? (_jsxs("div", { className: "text-center space-y-3", children: [_jsx("p", { className: "text-sm text-red-400", children: voiceAgent.error.message }), _jsxs("div", { className: "flex flex-wrap gap-2 justify-center", children: [voiceAgent.error.canRetry ? (_jsxs(Button, { size: "sm", variant: "outline", onClick: () => voiceAgent.startConversation(), className: "gap-1", children: [_jsx(RotateCcw, { className: "size-3" }), "Try Again"] })) : (_jsxs(Button, { size: "sm", variant: "outline", onClick: () => {
                                                                                voiceAgent.stopConversation();
                                                                                reset();
                                                                            }, className: "gap-1", children: [_jsx(ChevronLeft, { className: "size-3" }), "Go Back"] })), _jsx(Button, { size: "sm", variant: "outline", onClick: () => {
                                                                                voiceAgent.stopConversation();
                                                                                handleSelectMode('manual');
                                                                            }, children: "Switch to Manual" })] })] })) : (_jsx(AnimatePresence, { children: !isReviewing && voiceAgent.transcript.length > 0 && (_jsx(motion.div, { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto' }, exit: { opacity: 0, height: 0 }, transition: { duration: 0.35 }, className: "w-full max-w-md", children: _jsx("div", { className: "w-full max-h-48 overflow-y-auto space-y-2 px-4", children: voiceAgent.transcript.map((msg, i) => (_jsxs("p", { className: cn('text-sm', msg.role === 'user' ? 'text-text-secondary' : 'text-primary'), children: [_jsxs("span", { className: "font-medium", children: [msg.role === 'user' ? 'You' : 'Coach', ":"] }), ' ', msg.content] }, i))) }) }, "transcript")) })), _jsx("div", { className: "flex justify-center pt-2", children: _jsx(Button, { size: "lg", onClick: isReviewing ? handleStartDay : handleVoiceDone, disabled: (!isReviewing && voiceAgent.status === 'connecting')
                                                                    || (isReviewing && (isExtracting || previewTodos.length === 0)), children: isReviewing
                                                                    ? (isExtracting ? 'Finishing...' : 'Start my day')
                                                                    : "I'm done" }) })] }), _jsx(DailySetupTaskPanel, { isReviewing: isReviewing, isExtracting: isExtracting, missingGeminiKey: missingGeminiKey, todos: previewTodos, floatingIds: floatingIds, onUpdateTodos: setExtractedTodos })] }) })) }, "chat"))] }) })] })] }));
}
