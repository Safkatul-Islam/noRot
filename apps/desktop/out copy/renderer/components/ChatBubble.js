import { jsx as _jsx } from "react/jsx-runtime";
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
export function ChatBubble({ message }) {
    const isUser = message.role === 'user';
    return (_jsx(motion.div, { initial: { opacity: 0, filter: 'blur(6px)', y: 8 }, animate: { opacity: 1, filter: 'blur(0px)', y: 0 }, transition: { duration: 0.3, ease: 'easeOut' }, className: cn('flex', isUser ? 'justify-end' : 'justify-start'), children: _jsx("div", { className: cn('max-w-[80%] px-4 py-2.5', isUser
                ? 'bg-primary/15 border border-primary/25 rounded-2xl rounded-br-sm'
                : [
                    'bg-[var(--color-glass)] backdrop-blur-[14px]',
                    'border border-[var(--color-glass-border)]',
                    'shadow-[0_4px_12px_-4px_rgba(0,0,0,0.4)]',
                    'rounded-2xl rounded-bl-sm',
                ]), style: isUser ? {
                boxShadow: '0 0 12px -4px var(--color-glow-primary)',
            } : undefined, children: _jsx("p", { className: "text-sm text-text-primary leading-relaxed whitespace-pre-wrap", children: message.content }) }) }));
}
