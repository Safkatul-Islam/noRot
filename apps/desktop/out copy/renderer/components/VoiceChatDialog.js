import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useSpring } from 'motion/react';
import { Mic, MicOff, PhoneOff, RotateCcw, Save, Settings, Volume2, VolumeX, X } from 'lucide-react';
import { PERSONAS } from '@norot/shared';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { VoiceOrb } from '@/components/VoiceOrb';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { useTranscriptTodoExtraction } from '@/hooks/useTranscriptTodoExtraction';
import { PANEL_SPRING } from '@/components/ProposedTasksPanel';
import { useVoiceChatStore, selectHasProposedTodos, selectShowProposedPanel } from '@/stores/voice-chat-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useAppStore } from '@/stores/app-store';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';
import { PERSONA_ICON_MAP } from '@/lib/persona-icons';
export function VoiceChatDialog() {
    const { isOpen, close, clearProposedTodos } = useVoiceChatStore();
    const storeHasProposed = useVoiceChatStore(selectHasProposedTodos);
    const showProposed = useVoiceChatStore(selectShowProposedPanel);
    const persona = useSettingsStore((s) => s.persona);
    const { startConversation, stopConversation, status, isSpeaking, transcript, error, micMuted, setMicMuted, volume, setVolume, sendUserActivity, } = useVoiceAgent();
    // Extraction runs inside the dialog (needs transcript + status).
    // The ProposedTasksPanel is rendered separately in App.tsx (outside motion wrappers).
    useTranscriptTodoExtraction(transcript, status, {
        getProposedTodos: () => useVoiceChatStore.getState().proposedTodos,
        setProposedTodos: (todos) => useVoiceChatStore.getState().setProposedTodos(todos),
        setIsExtracting: (v) => useVoiceChatStore.getState().setIsExtracting(v),
        setMissingGeminiKey: (v) => useVoiceChatStore.getState().setMissingGeminiKey(v),
    });
    const scrollRef = useRef(null);
    const hasStartedRef = useRef(false);
    const startConversationRef = useRef(startConversation);
    startConversationRef.current = startConversation;
    const sendUserActivityRef = useRef(sendUserActivity);
    sendUserActivityRef.current = sendUserActivity;
    const lastTranscriptAtRef = useRef(Date.now());
    const [confirmingClose, setConfirmingClose] = useState(false);
    // Auto-start conversation when dialog opens
    useEffect(() => {
        if (isOpen && !hasStartedRef.current) {
            hasStartedRef.current = true;
            startConversationRef.current();
        }
        if (!isOpen) {
            hasStartedRef.current = false;
            setConfirmingClose(false);
        }
    }, [isOpen]);
    const isConnected = status === 'connected';
    const isConnecting = status === 'connecting';
    // Track transcript activity so we can avoid infinite keepalive pings.
    useEffect(() => {
        if (transcript.length > 0)
            lastTranscriptAtRef.current = Date.now();
    }, [transcript.length]);
    // Prevent ElevenLabs' default "Are you still there?"-style nudges by
    // periodically signaling user activity during silence.
    useEffect(() => {
        if (!isConnected)
            return;
        // Kick once on connect so we beat the default timeout window.
        lastTranscriptAtRef.current = Date.now();
        sendUserActivityRef.current();
        const KEEPALIVE_WINDOW_MS = 60_000;
        const interval = setInterval(() => {
            // Only needed while waiting for the user (i.e., not while the agent talks)
            const sinceLastMsg = Date.now() - lastTranscriptAtRef.current;
            if (sinceLastMsg <= KEEPALIVE_WINDOW_MS && !isSpeaking) {
                sendUserActivityRef.current();
            }
        }, 5_000);
        return () => clearInterval(interval);
    }, [isConnected, isSpeaking]);
    // Auto-dismiss confirmation if connection drops and no proposed todos
    useEffect(() => {
        if (!isConnected && !storeHasProposed && confirmingClose) {
            setConfirmingClose(false);
        }
    }, [isConnected, storeHasProposed, confirmingClose]);
    // Close with confirmation guard
    const requestClose = () => {
        if (isConnected || storeHasProposed) {
            setConfirmingClose(true);
        }
        else {
            doClose();
        }
    };
    const doClose = () => {
        stopConversation();
        // Don't clear proposed todos — the standalone panel persists after close
        close();
    };
    const handleSaveAndClose = async () => {
        const { proposedTodos } = useVoiceChatStore.getState();
        try {
            if (proposedTodos.length > 0) {
                await getNorotAPI().appendTodos(proposedTodos);
                clearProposedTodos();
            }
        }
        catch (err) {
            console.error('[voice-chat] Failed to save tasks:', err);
        }
        stopConversation();
        close();
    };
    // Auto-scroll transcript — target the Radix ScrollArea viewport, not the inner div
    useEffect(() => {
        const el = scrollRef.current;
        if (!el)
            return;
        // The actual scrollable element is the ScrollArea viewport (parent of our div)
        const viewport = el.closest('[data-slot="scroll-area-viewport"]') ?? el.parentElement;
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }, [transcript]);
    const statusText = isConnecting
        ? 'Connecting...'
        : isConnected
            ? (isSpeaking ? 'noRot is speaking...' : 'Listening...')
            : 'Ready to connect';
    const PersonaIcon = PERSONA_ICON_MAP[persona];
    const personaLabel = PERSONAS[persona].label;
    const keepTalkingRef = useRef(null);
    // Shift dialog left when proposed panel is visible
    const dialogContentRef = useRef(null);
    const shiftX = useSpring(0, PANEL_SPRING);
    useEffect(() => {
        shiftX.set(showProposed ? -170 : 0);
    }, [showProposed, shiftX]);
    useEffect(() => {
        return shiftX.on('change', (v) => {
            if (dialogContentRef.current) {
                dialogContentRef.current.style.transform = `translateX(${v}px)`;
            }
        });
    }, [shiftX]);
    return (_jsx(Dialog, { open: isOpen, onOpenChange: (open) => {
            if (!open)
                requestClose();
        }, children: _jsx(AnimatePresence, { children: isOpen && (_jsx(DialogContent, { ref: dialogContentRef, showCloseButton: false, className: "w-[calc(100vw-4rem)] max-w-6xl h-[calc(100vh-4rem)] flex flex-col p-0 gap-0 overflow-hidden", onEscapeKeyDown: (e) => {
                    // Escape goes through confirmation when connected or has proposed todos
                    if (isConnected || storeHasProposed) {
                        e.preventDefault();
                        setConfirmingClose(true);
                    }
                }, children: _jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 }, className: "flex flex-col h-full", children: [_jsx(DialogHeader, { className: "shrink-0 px-6 pt-5 pb-4 border-b border-white/[0.06]", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex size-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20", children: _jsx(PersonaIcon, { className: "size-4 text-primary" }) }), _jsxs("div", { children: [_jsx(DialogTitle, { className: "text-base", children: "noRot Coach" }), _jsxs(DialogDescription, { className: "text-xs text-text-secondary mt-0.5", children: [personaLabel, " \u2014 plan tasks, break down work, get unstuck"] })] })] }), _jsx("button", { onClick: requestClose, className: "inline-flex size-8 items-center justify-center rounded-md border border-transparent text-text-secondary opacity-80 transition-all hover:border-primary/35 hover:bg-primary/12 hover:text-primary hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60", "aria-label": "Close", children: _jsx(X, { className: "size-4" }) })] }) }), _jsxs("div", { className: "shrink-0 flex flex-col items-center py-4 gap-2", children: [_jsx("div", { style: { width: 120, height: 120 }, children: _jsx(VoiceOrb, { interactive: false, paused: !isConnected }) }), _jsx("span", { className: "text-xs text-text-secondary", children: statusText })] }), _jsx("div", { className: "flex-1 min-h-0 px-6 pb-4", children: _jsx(ScrollArea, { className: "h-full rounded-lg border border-white/6 bg-black/20 p-3", children: _jsxs("div", { ref: scrollRef, className: "space-y-3", children: [transcript.length === 0 ? (_jsx("div", { className: "flex items-center justify-center h-full min-h-[120px]", children: _jsx("p", { className: "text-sm text-text-secondary/50 italic text-center", children: isConnecting
                                                    ? 'Connecting to your coach...'
                                                    : isConnected
                                                        ? 'Say something to get started. Try "What should I work on first?"'
                                                        : 'Conversation will appear here...' }) })) : (transcript.map((msg, i) => {
                                            const prevRole = i > 0 ? transcript[i - 1].role : null;
                                            const showLabel = msg.role !== prevRole;
                                            return (_jsxs("div", { children: [showLabel && (_jsx("p", { className: cn('text-[10px] font-medium uppercase tracking-wider mb-1', msg.role === 'user'
                                                            ? 'text-right text-text-secondary/60'
                                                            : 'text-text-secondary/60'), children: msg.role === 'user' ? 'You' : 'noRot' })), _jsx("div", { className: cn('text-sm rounded-xl px-3 py-2 max-w-[85%] leading-relaxed', msg.role === 'user'
                                                            ? 'ml-auto bg-primary/15 text-text-primary'
                                                            : 'bg-white/5 text-text-secondary border border-white/[0.04]'), children: msg.content })] }, i));
                                        })), isConnected && isSpeaking && (_jsx("div", { className: "flex items-center gap-1 pt-1", children: [0, 1, 2].map((i) => (_jsx("span", { className: "size-1.5 rounded-full bg-text-secondary/40", style: {
                                                    animation: 'typing-bounce 1s ease-in-out infinite',
                                                    animationDelay: `${i * 0.15}s`,
                                                } }, i))) }))] }) }) }), error && (_jsxs("div", { className: "shrink-0 mx-6 mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm", children: [_jsx("p", { className: "text-danger", children: error.message }), _jsxs("div", { className: "flex gap-2 mt-2", children: [error.canRetry && (_jsxs(Button, { size: "sm", variant: "outline", className: "border-danger/30 text-danger hover:bg-danger/10", onClick: () => {
                                                hasStartedRef.current = false;
                                                startConversation();
                                                hasStartedRef.current = true;
                                            }, children: [_jsx(RotateCcw, { className: "size-3 mr-1" }), "Retry"] })), error.code === 'NO_API_KEY' && (_jsxs(Button, { size: "sm", variant: "outline", onClick: () => {
                                                doClose();
                                                useAppStore.getState().setActivePage('settings');
                                            }, children: [_jsx(Settings, { className: "size-3 mr-1" }), "Open Settings"] }))] })] })), _jsxs("div", { className: "shrink-0 flex items-center gap-3 px-6 py-4 border-t border-white/[0.06]", children: [_jsx(Button, { size: "icon", variant: "outline", "aria-label": micMuted ? 'Unmute microphone' : 'Mute microphone', className: cn('size-9', micMuted && 'border-danger/30 text-danger hover:bg-danger/10'), onClick: () => setMicMuted(!micMuted), children: micMuted ? _jsx(MicOff, { className: "size-4" }) : _jsx(Mic, { className: "size-4" }) }), _jsxs("div", { className: "flex items-center gap-2 min-w-[140px]", children: [volume === 0 ? (_jsx(VolumeX, { className: "size-4 shrink-0 text-text-secondary" })) : (_jsx(Volume2, { className: "size-4 shrink-0 text-text-secondary" })), _jsx(Slider, { value: [Math.round(volume * 100)], min: 0, max: 100, "aria-label": "AI voice volume", onValueChange: ([val]) => setVolume(val / 100), className: "w-24" })] }), _jsxs(Button, { variant: "outline", className: "ml-auto border-danger/30 text-danger hover:bg-danger/10", onClick: requestClose, children: [_jsx(PhoneOff, { className: "size-4 mr-1" }), "End Conversation"] })] }), confirmingClose && (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 }, role: "alertdialog", "aria-modal": "true", "aria-labelledby": "confirm-close-title", "aria-describedby": "confirm-close-desc", className: "absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/60 backdrop-blur-sm", onKeyDown: (e) => {
                                if (e.key === 'Escape') {
                                    e.stopPropagation();
                                    setConfirmingClose(false);
                                }
                            }, children: [_jsx("p", { id: "confirm-close-title", className: "text-lg font-semibold text-text-primary", children: "End conversation?" }), _jsx("p", { id: "confirm-close-desc", className: "text-sm text-text-secondary", children: storeHasProposed
                                        ? 'You have unsaved proposed tasks.'
                                        : 'Your conversation will not be saved.' }), _jsxs("div", { className: "flex gap-3 mt-2", children: [_jsx(Button, { ref: keepTalkingRef, autoFocus: true, variant: "outline", onClick: () => setConfirmingClose(false), children: "Keep talking" }), storeHasProposed && (_jsxs(Button, { variant: "outline", className: "border-primary/30 text-primary hover:bg-primary/10", onClick: handleSaveAndClose, children: [_jsx(Save, { className: "size-3 mr-1" }), "Save tasks & close"] })), _jsx(Button, { variant: "outline", className: "border-danger/30 text-danger hover:bg-danger/10", onClick: doClose, children: storeHasProposed ? 'Close & keep drafts' : 'End chat' })] })] }))] }) })) }) }));
}
