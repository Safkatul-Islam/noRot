import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { ChatBubble } from '@/components/ChatBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
function TypingIndicator() {
    return (_jsx("div", { className: "flex justify-start", children: _jsx("div", { className: cn('px-4 py-3 rounded-2xl rounded-bl-sm', 'bg-[var(--color-glass)] backdrop-blur-[14px]', 'border border-[var(--color-glass-border)]'), children: _jsx("div", { className: "flex gap-1", children: [0, 1, 2].map((i) => (_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-text-muted", style: {
                        animation: 'typing-bounce 1.2s ease-in-out infinite',
                        animationDelay: `${i * 0.15}s`,
                    } }, i))) }) }) }));
}
export function ChatContainer({ messages, onSend, isStreaming, streamingText, inputAddon }) {
    const [draft, setDraft] = useState('');
    const scrollRef = useRef(null);
    // Auto-scroll to bottom when messages change or streaming text updates
    useEffect(() => {
        const viewport = scrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }, [messages, streamingText, isStreaming]);
    const handleSend = () => {
        const text = draft.trim();
        if (!text || isStreaming)
            return;
        setDraft('');
        onSend(text);
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    // Build the display list: committed messages + in-progress streaming bubble
    const displayMessages = [...messages];
    if (isStreaming && streamingText) {
        displayMessages.push({ role: 'assistant', content: streamingText });
    }
    return (_jsxs(GlassCard, { className: "flex flex-col h-full !gap-0 !py-0", children: [_jsx(ScrollArea, { ref: scrollRef, className: "flex-1 min-h-0", children: _jsxs("div", { className: "flex flex-col gap-3 p-4", children: [displayMessages.map((msg, i) => (_jsx(ChatBubble, { message: msg }, i))), isStreaming && !streamingText && _jsx(TypingIndicator, {})] }) }), _jsx("div", { className: "shrink-0 p-3 border-t border-white/[0.06]", children: _jsxs("div", { className: cn('flex items-center gap-2 rounded-xl px-3 py-2', 'bg-[var(--color-glass-well)] border border-white/[0.06]'), children: [_jsx("input", { value: draft, onChange: (e) => setDraft(e.target.value), onKeyDown: handleKeyDown, placeholder: "Type a message...", disabled: isStreaming, className: cn('flex-1 bg-transparent text-sm text-text-primary', 'placeholder:text-text-muted focus:outline-none') }), inputAddon, _jsx("button", { onClick: handleSend, disabled: !draft.trim() || isStreaming, className: cn('shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', 'transition-all duration-200', draft.trim() && !isStreaming
                                ? 'bg-primary/20 text-primary hover:bg-primary/30'
                                : 'text-text-muted opacity-40 cursor-not-allowed'), children: _jsx(Send, { className: "size-4" }) })] }) })] }));
}
