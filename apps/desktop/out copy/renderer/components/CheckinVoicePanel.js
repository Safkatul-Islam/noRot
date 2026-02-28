import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { PhoneOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VoiceOrb } from '@/components/VoiceOrb';
import { useCheckinAgent } from '@/hooks/useCheckinAgent';
import { cn } from '@/lib/utils';
const TEXT_FALLBACK_PROMPTS = [
    "What's blocking you right now? Is it...",
    'Overwhelm — too many things, not sure where to start?',
    'Boredom — the task feels tedious or uninteresting?',
    'Avoidance — something about it feels uncomfortable?',
    'Unclear next step — you don\'t know what to do first?',
    '',
    'Try picking ONE small thing you can do in the next 2 minutes — even just opening the file counts.',
];
export function CheckinVoicePanel({ onEnd }) {
    const { startConversation, stopConversation, status, isSpeaking, transcript, error, micFailed } = useCheckinAgent();
    const scrollRef = useRef(null);
    const hasStartedRef = useRef(false);
    const startConversationRef = useRef(startConversation);
    startConversationRef.current = startConversation;
    // Auto-start conversation on mount
    useEffect(() => {
        if (!hasStartedRef.current) {
            hasStartedRef.current = true;
            startConversationRef.current();
        }
    }, []);
    // Auto-scroll transcript
    useEffect(() => {
        const el = scrollRef.current;
        if (!el)
            return;
        const viewport = el.closest('[data-slot="scroll-area-viewport"]') ?? el.parentElement;
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }, [transcript]);
    const handleEnd = () => {
        stopConversation();
        onEnd();
    };
    const isConnected = status === 'connected';
    const isConnecting = status === 'connecting';
    // Show text fallback if mic failed or if there's a non-retryable error
    const showTextFallback = micFailed || (error && !error.canRetry);
    if (showTextFallback) {
        return (_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-text-secondary space-y-2", children: TEXT_FALLBACK_PROMPTS.map((line, i) => line === '' ? (_jsx("div", { className: "h-2" }, i)) : i === 0 ? (_jsx("p", { className: "text-text-primary font-medium", children: line }, i)) : (_jsxs("p", { className: "pl-2", children: ["- ", line] }, i))) }), _jsx("div", { className: "flex justify-center", children: _jsx(Button, { variant: "outline", onClick: handleEnd, children: "Got it" }) })] }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("p", { className: "text-sm text-text-secondary text-center", children: [isConnecting && 'Connecting...', isConnected && (isSpeaking ? 'noRot is speaking...' : 'Listening...'), status === 'disconnected' && !error && 'Ready to connect'] }), _jsx("div", { className: "flex justify-center", children: _jsx("div", { style: { width: 80, height: 80 }, children: _jsx(VoiceOrb, { interactive: false, paused: !isConnected }) }) }), error && (_jsxs("div", { className: "rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm", children: [_jsx("p", { className: "text-danger", children: error.message }), error.canRetry && (_jsxs(Button, { size: "sm", variant: "outline", className: "mt-2 border-danger/30 text-danger hover:bg-danger/10", onClick: () => {
                            hasStartedRef.current = false;
                            startConversation();
                            hasStartedRef.current = true;
                        }, children: [_jsx(RotateCcw, { className: "size-3 mr-1" }), "Retry"] }))] })), transcript.length > 0 && (_jsx(ScrollArea, { className: "h-36 rounded-lg border border-white/6 bg-black/20 p-3", children: _jsx("div", { ref: scrollRef, className: "space-y-2", children: transcript.map((msg, i) => (_jsx("div", { className: cn('text-sm rounded-lg px-3 py-2 max-w-[85%]', msg.role === 'user'
                            ? 'ml-auto bg-primary/15 text-text-primary'
                            : 'bg-white/5 text-text-secondary'), children: msg.content }, i))) }) })), _jsx("div", { className: "flex justify-center", children: _jsxs(Button, { variant: "outline", className: "border-danger/30 text-danger hover:bg-danger/10", onClick: handleEnd, children: [_jsx(PhoneOff, { className: "size-4 mr-1" }), "End conversation"] }) })] }));
}
