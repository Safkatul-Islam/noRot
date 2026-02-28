import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/GlassCard';
import { ChatContainer } from '@/components/ChatContainer';
import { TodoItemList } from '@/components/TodoItemList';
import { getNorotAPI } from '@/lib/norot-api';
import { slideVariants, slideTransition } from '@/lib/animation-variants';
import { cn } from '@/lib/utils';
const STEP_COUNT = 4;
const SESSION_ID = 'onboarding';
// Fallback persona options for scripted flow
const PERSONA_OPTIONS = [
    { id: 'calm_friend', label: 'Calm Friend', desc: 'Gentle nudges and encouragement' },
    { id: 'coach', label: 'Coach', desc: 'Structured, goal-oriented feedback' },
    { id: 'tough_love', label: 'Tough Love', desc: 'Direct and no-nonsense' },
];
export function OnboardingPage({ onComplete }) {
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);
    const [hasGemini, setHasGemini] = useState(null);
    // Chat state
    const [messages, setMessages] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const streamBuf = useRef('');
    // Todo state
    const [todos, setTodos] = useState([]);
    // Fallback form state
    const [goals, setGoals] = useState('');
    const [distractions, setDistractions] = useState('');
    const [selectedPersona, setSelectedPersona] = useState('calm_friend');
    // Check if Gemini key is configured
    useEffect(() => {
        getNorotAPI().getSettings()
            .then((settings) => {
            const key = typeof settings.geminiApiKey === 'string' ? settings.geminiApiKey.trim() : '';
            setHasGemini(key.length > 0);
        })
            .catch(() => setHasGemini(false));
    }, []);
    // Wire up chat streaming listeners
    useEffect(() => {
        const api = getNorotAPI();
        const unsubToken = api.onChatToken((token) => {
            streamBuf.current += token;
            setStreamingText(streamBuf.current);
        });
        const unsubDone = api.onChatDone(() => {
            const finalText = streamBuf.current;
            if (finalText) {
                setMessages((prev) => [...prev, { role: 'assistant', content: finalText }]);
            }
            streamBuf.current = '';
            setStreamingText('');
            setIsStreaming(false);
        });
        const unsubError = api.onChatError((err) => {
            console.error('[Onboarding] chat error:', err);
            streamBuf.current = '';
            setStreamingText('');
            setIsStreaming(false);
        });
        return () => { unsubToken(); unsubDone(); unsubError(); };
    }, []);
    // Send initial assistant greeting when entering chat step
    const greetingSent = useRef(false);
    useEffect(() => {
        if (step === 1 && hasGemini && !greetingSent.current && messages.length === 0) {
            greetingSent.current = true;
            setIsStreaming(true);
            getNorotAPI().sendChatMessage('Hello, I just started onboarding. Introduce yourself briefly and ask what I am working on today.', SESSION_ID);
        }
    }, [step, hasGemini, messages.length]);
    const handleChatSend = useCallback((text) => {
        setMessages((prev) => [...prev, { role: 'user', content: text }]);
        setIsStreaming(true);
        streamBuf.current = '';
        setStreamingText('');
        getNorotAPI().sendChatMessage(text, SESSION_ID);
    }, []);
    // Extract todos from chat when moving to step 2
    const handleExtractTodos = useCallback(async () => {
        // If we have chat messages, try to extract todos from the conversation context
        // For now, we just load any todos that may have been created
        try {
            const items = await getNorotAPI().getTodos();
            setTodos(items);
        }
        catch { /* ignore */ }
    }, []);
    const handleTodoToggle = (id) => {
        setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
    };
    const handleTodoDelete = (id) => {
        setTodos((prev) => prev.filter((t) => t.id !== id));
    };
    const handleTodoAdd = (text, app, url) => {
        const newTodo = {
            id: crypto.randomUUID(),
            text,
            done: false,
            order: todos.length,
            ...(app ? { app } : {}),
            ...(url ? { url } : {}),
        };
        setTodos((prev) => [...prev, newTodo]);
    };
    const handleTodoUpdate = (id, fields) => {
        setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...fields } : t)));
    };
    const next = () => {
        setDirection(1);
        setStep((s) => {
            const nextStep = s + 1;
            if (nextStep === 2)
                handleExtractTodos();
            return nextStep;
        });
    };
    const handleFinish = async () => {
        try {
            const api = getNorotAPI();
            // Save todos
            if (todos.length > 0) {
                await api.setTodos(todos);
            }
            // Save persona from fallback form if applicable
            if (!hasGemini && selectedPersona) {
                await api.updateSettings({ persona: selectedPersona });
            }
            // Save context (userName, etc) if set
            if (goals || distractions) {
                await api.updateSettings({
                    userName: goals.split(' ')[0] || '', // Best guess
                });
            }
        }
        catch {
            // ignore — continue completing onboarding
        }
        onComplete();
    };
    // Don't render until we know if Gemini is configured
    if (hasGemini === null)
        return null;
    return (_jsxs("div", { className: "flex flex-col min-h-screen", children: [_jsx("div", { className: "h-10 shrink-0", style: { WebkitAppRegion: 'drag' } }), _jsxs("div", { className: "flex flex-col flex-1 items-center justify-center px-6", children: [_jsx("div", { className: "flex gap-2 mb-8", children: Array.from({ length: STEP_COUNT }).map((_, i) => (_jsx("div", { className: cn('w-2 h-2 rounded-full transition-all duration-300', i === step
                                ? 'bg-primary scale-125 shadow-[0_0_8px_var(--color-glow-primary)]'
                                : i < step
                                    ? 'bg-primary/40'
                                    : 'bg-white/15') }, i))) }), _jsx("div", { className: "w-full max-w-lg", children: _jsxs(AnimatePresence, { mode: "wait", custom: direction, children: [step === 0 && (_jsx(motion.div, { custom: direction, variants: slideVariants, initial: "enter", animate: "center", exit: "exit", transition: slideTransition, children: _jsxs(GlassCard, { className: "items-center text-center px-8", children: [_jsx("h1", { className: "text-3xl font-bold text-text-primary tracking-tight", children: "Welcome to noRot" }), _jsx("p", { className: "text-text-secondary text-sm leading-relaxed max-w-sm", children: "noRot monitors your apps and speaks up when you are procrastinating. Let's set up your focus profile." }), _jsx(Button, { size: "lg", onClick: next, className: "mt-2", children: "Get Started" })] }) }, "welcome")), step === 1 && (_jsx(motion.div, { custom: direction, variants: slideVariants, initial: "enter", animate: "center", exit: "exit", transition: slideTransition, children: hasGemini ? (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsx("p", { className: "text-text-secondary text-sm text-center", children: "Chat with your AI assistant to set up your focus profile." }), _jsx("div", { className: "h-[400px]", children: _jsx(ChatContainer, { messages: messages, onSend: handleChatSend, isStreaming: isStreaming, streamingText: streamingText }) }), _jsx("div", { className: "flex justify-center", children: _jsx(Button, { size: "lg", onClick: next, disabled: messages.length < 2, children: "Continue to Todos" }) })] })) : (
                                    /* Fallback: scripted guided form */
                                    _jsxs(GlassCard, { className: "px-8", children: [_jsx("h2", { className: "text-2xl font-bold text-text-primary tracking-tight text-center", children: "Tell us about yourself" }), _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-xs font-semibold text-text-secondary uppercase tracking-wider", children: "What are you working on?" }), _jsx("input", { value: goals, onChange: (e) => setGoals(e.target.value), placeholder: "e.g., Building a side project, studying for exams...", className: cn('bg-[var(--color-glass-well)] border border-white/[0.06] rounded-lg px-3 py-2', 'text-sm text-text-primary placeholder:text-text-muted', 'focus:outline-none focus:border-primary/40') })] }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-xs font-semibold text-text-secondary uppercase tracking-wider", children: "What distracts you most?" }), _jsx("input", { value: distractions, onChange: (e) => setDistractions(e.target.value), placeholder: "e.g., Twitter, YouTube, Reddit...", className: cn('bg-[var(--color-glass-well)] border border-white/[0.06] rounded-lg px-3 py-2', 'text-sm text-text-primary placeholder:text-text-muted', 'focus:outline-none focus:border-primary/40') })] }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-xs font-semibold text-text-secondary uppercase tracking-wider", children: "Choose your coach style" }), _jsx("div", { className: "flex flex-col gap-2", children: PERSONA_OPTIONS.map((p) => (_jsxs("button", { onClick: () => setSelectedPersona(p.id), className: cn('flex flex-col gap-0.5 px-4 py-3 rounded-lg border text-left', 'transition-all duration-200', selectedPersona === p.id
                                                                        ? 'bg-primary/10 border-primary/30 text-text-primary'
                                                                        : 'bg-[var(--color-glass-well)] border-white/[0.06] text-text-secondary hover:border-white/[0.1]'), children: [_jsx("span", { className: "text-sm font-medium", children: p.label }), _jsx("span", { className: "text-xs text-text-muted", children: p.desc })] }, p.id))) })] })] }), _jsx("div", { className: "flex justify-center", children: _jsx(Button, { size: "lg", onClick: next, children: "Next" }) })] })) }, "setup")), step === 2 && (_jsx(motion.div, { custom: direction, variants: slideVariants, initial: "enter", animate: "center", exit: "exit", transition: slideTransition, children: _jsxs(GlassCard, { className: "px-8", children: [_jsx("h2", { className: "text-2xl font-bold text-text-primary tracking-tight text-center", children: "Your Focus Tasks" }), _jsx("p", { className: "text-text-secondary text-sm text-center", children: todos.length > 0
                                                    ? 'Review and edit your tasks. You can add, remove, or check off items.'
                                                    : 'Add some tasks you want to focus on today.' }), _jsx(TodoItemList, { todos: todos, onToggle: handleTodoToggle, onDelete: handleTodoDelete, onAdd: handleTodoAdd, onUpdate: handleTodoUpdate }), _jsx("div", { className: "flex justify-center", children: _jsx(Button, { size: "lg", onClick: next, children: "Finish Setup" }) })] }) }, "todos")), step === 3 && (_jsx(motion.div, { custom: direction, variants: slideVariants, initial: "enter", animate: "center", exit: "exit", transition: slideTransition, children: _jsxs(GlassCard, { className: "items-center text-center px-8", children: [_jsx("h2", { className: "text-2xl font-bold text-text-primary tracking-tight", children: "You're all set!" }), _jsx("p", { className: "text-text-secondary text-sm leading-relaxed max-w-sm", children: "noRot will now monitor your focus and step in when you drift off track. You can tweak everything in Settings anytime." }), _jsx(Button, { size: "lg", onClick: handleFinish, className: "mt-2", children: "Start Monitoring" })] }) }, "done"))] }) })] })] }));
}
