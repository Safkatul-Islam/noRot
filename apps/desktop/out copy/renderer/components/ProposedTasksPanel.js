import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLayoutEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { ListTodo, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TodoPreviewList } from '@/components/TodoPreviewList';
import { useVoiceChatStore } from '@/stores/voice-chat-store';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';
/** Shared spring config — must match VoiceChatDialog's shift spring */
export const PANEL_SPRING = { stiffness: 400, damping: 40, mass: 1 };
const PANEL_WIDTH_PX = 300;
const PANEL_GAP_PX = 16;
const VIEWPORT_MARGIN_PX = 32;
export function ProposedTasksPanel({ open }) {
    const panelRef = useRef(null);
    const proposedTodos = useVoiceChatStore((s) => s.proposedTodos);
    const isExtracting = useVoiceChatStore((s) => s.isExtracting);
    const missingGeminiKey = useVoiceChatStore((s) => s.missingGeminiKey);
    const setProposedTodos = useVoiceChatStore((s) => s.setProposedTodos);
    const clearProposedTodos = useVoiceChatStore((s) => s.clearProposedTodos);
    const hasProposedTodos = proposedTodos.length > 0;
    useLayoutEffect(() => {
        if (!open)
            return;
        let rafId = 0;
        let lastRight = null;
        let lastTop = null;
        let lastHeight = null;
        const update = () => {
            const el = panelRef.current;
            if (!el) {
                rafId = requestAnimationFrame(update);
                return;
            }
            const dialog = document.querySelector('[data-slot="dialog-content"]');
            if (dialog) {
                const rect = dialog.getBoundingClientRect();
                const desiredRight = Math.round(window.innerWidth - (rect.right + PANEL_GAP_PX + PANEL_WIDTH_PX));
                const rightPx = Math.max(VIEWPORT_MARGIN_PX, desiredRight);
                const topPx = Math.round(rect.top);
                const heightPx = Math.round(rect.height);
                if (rightPx !== lastRight) {
                    el.style.right = `${rightPx}px`;
                    lastRight = rightPx;
                }
                if (topPx !== lastTop) {
                    el.style.top = `${topPx}px`;
                    lastTop = topPx;
                }
                if (heightPx !== lastHeight) {
                    el.style.height = `${heightPx}px`;
                    lastHeight = heightPx;
                }
            }
            rafId = requestAnimationFrame(update);
        };
        rafId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafId);
    }, [open]);
    const proposedCount = proposedTodos.length;
    const proposedWithTiming = proposedTodos.filter((t) => (typeof t.deadline === 'string' && t.deadline) ||
        (typeof t.startTime === 'string' && t.startTime) ||
        (typeof t.durationMinutes === 'number' && Number.isFinite(t.durationMinutes) && t.durationMinutes > 0)).length;
    const proposedMissingTimes = Math.max(0, proposedCount - proposedWithTiming);
    const timeProgress = proposedCount === 0 ? 0 : proposedWithTiming / proposedCount;
    const planProgress = proposedCount === 0 ? 0 : 0.4 + 0.6 * timeProgress;
    const panelTitle = proposedCount > 0 ? 'Proposed Tasks' : 'Draft Tasks';
    const handleUpdateTodos = (todos) => {
        setProposedTodos(todos.map((t) => ({ ...t, _userEdited: true })));
    };
    const handleSaveTasks = async () => {
        try {
            if (proposedTodos.length > 0) {
                await getNorotAPI().appendTodos(proposedTodos);
                clearProposedTodos();
            }
        }
        catch (err) {
            console.error('[proposed-panel] Failed to save tasks:', err);
        }
    };
    const panel = (_jsx(AnimatePresence, { children: open && (_jsxs(motion.aside, { ref: panelRef, initial: { x: -500, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: -500, opacity: 0 }, transition: { type: 'spring', ...PANEL_SPRING }, className: cn('fixed z-[49] top-[2rem] right-[2rem] h-[calc(100vh-4rem)] w-[300px]', 'flex flex-col overflow-hidden', 'rounded-xl border border-white/12', 'bg-[var(--color-glass)] backdrop-blur-xl', 'shadow-[0_30px_70px_-34px_rgba(0,0,0,0.95),0_0_42px_-24px_var(--color-glow-primary)]'), children: [_jsxs("div", { className: "shrink-0 px-4 py-3 border-b border-white/[0.06]", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(ListTodo, { className: "size-4 text-primary" }), _jsx("span", { className: "text-sm font-medium text-text-primary", children: panelTitle }), proposedCount > 0 && (_jsxs("span", { className: "ml-auto text-[10px] font-medium text-text-secondary/70", children: [Math.round(planProgress * 100), "%"] })), isExtracting && (_jsx(Loader2, { className: "size-3.5 text-text-secondary animate-spin" }))] }), proposedCount > 0 && (_jsxs("div", { className: "mt-2", children: [_jsx("div", { className: "h-1.5 rounded-full bg-white/10 overflow-hidden", children: _jsx("div", { className: "h-full bg-primary", style: { width: `${Math.round(planProgress * 100)}%` } }) }), proposedMissingTimes > 0 && (_jsxs("p", { className: "mt-1 text-[11px] text-text-secondary/70", children: ["Optional: add start times / durations / deadlines for ", proposedMissingTimes, " task", proposedMissingTimes !== 1 ? 's' : '', "."] }))] }))] }), _jsx(ScrollArea, { className: "flex-1 min-h-0", children: _jsx("div", { className: "px-3 py-2", children: missingGeminiKey ? (_jsx("p", { className: "text-xs text-text-secondary/60 italic px-1 py-4 text-center", children: "Add a Gemini API key in Settings to auto-extract tasks from your conversation." })) : proposedTodos.length === 0 && isExtracting ? (_jsx("p", { className: "text-xs text-text-secondary/60 italic px-1 py-4 text-center", children: "Listening for tasks..." })) : proposedTodos.length === 0 ? (_jsx("p", { className: "text-xs text-text-secondary/60 italic px-1 py-4 text-center", children: "Tasks mentioned in your conversation will appear here." })) : (_jsx(TodoPreviewList, { todos: proposedTodos, onUpdate: handleUpdateTodos })) }) }), hasProposedTodos && (_jsx("div", { className: "shrink-0 px-3 py-2 border-t border-white/[0.06]", children: _jsxs(Button, { size: "sm", className: "w-full", onClick: handleSaveTasks, children: [_jsx(Save, { className: "size-3.5 mr-1.5" }), `Save ${proposedTodos.length} task${proposedTodos.length !== 1 ? 's' : ''}`] }) }))] })) }));
    if (typeof document === 'undefined')
        return null;
    return createPortal(panel, document.body);
}
