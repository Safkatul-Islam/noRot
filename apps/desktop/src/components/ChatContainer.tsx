import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { ChatBubble } from '@/components/ChatBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@norot/shared';

interface ChatContainerProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isStreaming: boolean;
  streamingText: string;
  inputAddon?: React.ReactNode;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className={cn(
          'px-4 py-3 rounded-2xl rounded-bl-sm',
          'bg-[var(--color-glass)] backdrop-blur-[14px]',
          'border border-[var(--color-glass-border)]',
        )}
      >
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-text-muted"
              style={{
                animation: 'typing-bounce 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatContainer({ messages, onSend, isStreaming, streamingText, inputAddon }: ChatContainerProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or streaming text updates
  useEffect(() => {
    const viewport = scrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages, streamingText, isStreaming]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || isStreaming) return;
    setDraft('');
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Build the display list: committed messages + in-progress streaming bubble
  const displayMessages: ChatMessage[] = [...messages];
  if (isStreaming && streamingText) {
    displayMessages.push({ role: 'assistant', content: streamingText });
  }

  return (
    <GlassCard className="flex flex-col h-full !gap-0 !py-0">
      {/* Messages area */}
      <ScrollArea ref={scrollRef} className="flex-1 min-h-0">
        <div className="flex flex-col gap-3 p-4">
          {displayMessages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}
          {isStreaming && !streamingText && <TypingIndicator />}
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="shrink-0 p-3 border-t border-white/[0.06]">
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl px-3 py-2',
            'bg-[var(--color-glass-well)] border border-white/[0.06]',
          )}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isStreaming}
            className={cn(
              'flex-1 bg-transparent text-sm text-text-primary',
              'placeholder:text-text-muted focus:outline-none',
            )}
          />
          {inputAddon}
          <button
            onClick={handleSend}
            disabled={!draft.trim() || isStreaming}
            className={cn(
              'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
              'transition-all duration-200',
              draft.trim() && !isStreaming
                ? 'bg-primary/20 text-primary hover:bg-primary/30'
                : 'text-text-muted opacity-40 cursor-not-allowed',
            )}
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
