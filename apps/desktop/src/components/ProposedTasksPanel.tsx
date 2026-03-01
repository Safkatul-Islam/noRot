import { useLayoutEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { ListTodo, Loader2, Save } from 'lucide-react';
import type { TodoItem } from '@norot/shared';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TodoPreviewList } from '@/components/TodoPreviewList';
import { useVoiceChatStore } from '@/stores/voice-chat-store';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';

interface TodoItemWithEdited extends TodoItem {
  _userEdited?: boolean;
}

/** Shared spring config — must match VoiceChatDialog's shift spring */
export const PANEL_SPRING = { stiffness: 400, damping: 40, mass: 1 };

const PANEL_WIDTH_PX = 300;
const PANEL_GAP_PX = 16;
const VIEWPORT_MARGIN_PX = 32;

interface ProposedTasksPanelProps {
  open: boolean;
}

export function ProposedTasksPanel({ open }: ProposedTasksPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const proposedTodos = useVoiceChatStore((s) => s.proposedTodos) as TodoItemWithEdited[];
  const isExtracting = useVoiceChatStore((s) => s.isExtracting);
  const missingGeminiKey = useVoiceChatStore((s) => s.missingGeminiKey);
  const setProposedTodos = useVoiceChatStore((s) => s.setProposedTodos);
  const clearProposedTodos = useVoiceChatStore((s) => s.clearProposedTodos);
  const hasProposedTodos = proposedTodos.length > 0;

  useLayoutEffect(() => {
    if (!open) return;

    let rafId = 0;
    let lastRight: number | null = null;
    let lastTop: number | null = null;
    let lastHeight: number | null = null;

    const update = () => {
      const el = panelRef.current;
      if (!el) {
        rafId = requestAnimationFrame(update);
        return;
      }

      const dialog = document.querySelector('[data-slot="dialog-content"]') as HTMLElement | null;
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
  const proposedWithTimes = proposedTodos.filter(
    (t) => typeof t.deadline === 'string' && t.deadline,
  ).length;
  const proposedMissingTimes = Math.max(0, proposedCount - proposedWithTimes);
  const timeProgress = proposedCount === 0 ? 0 : proposedWithTimes / proposedCount;
  const planProgress = proposedCount === 0 ? 0 : 0.4 + 0.6 * timeProgress;
  const scheduleComplete = proposedCount > 0 && proposedMissingTimes === 0;
  const panelTitle = scheduleComplete ? 'Proposed Tasks' : 'Draft Tasks';

  const handleUpdateTodos = (todos: TodoItemWithEdited[]) => {
    setProposedTodos(todos.map((t) => ({ ...t, _userEdited: true })));
  };

  const handleSaveTasks = async () => {
    if (!scheduleComplete) return;
    try {
      if (proposedTodos.length > 0) {
        await getNorotAPI().appendTodos(proposedTodos);
        clearProposedTodos();
      }
    } catch (err) {
      console.error('[proposed-panel] Failed to save tasks:', err);
    }
  };

  const panel = (
    <AnimatePresence>
      {open && (
        <motion.aside
          ref={panelRef}
          initial={{ x: -500, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -500, opacity: 0 }}
          transition={{ type: 'spring', ...PANEL_SPRING }}
          className={cn(
            'fixed z-[49] top-[2rem] right-[2rem] h-[calc(100vh-4rem)] w-[300px]',
            'flex flex-col overflow-hidden',
            'rounded-xl border border-white/12',
            'bg-[var(--color-glass)] backdrop-blur-xl',
            'shadow-[0_30px_70px_-34px_rgba(0,0,0,0.95),0_0_42px_-24px_var(--color-glow-primary)]',
          )}
        >
          {/* Panel header */}
          <div className="shrink-0 px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <ListTodo className="size-4 text-primary" />
              <span className="text-sm font-medium text-text-primary">{panelTitle}</span>
              {proposedCount > 0 && (
                <span className="ml-auto text-[10px] font-medium text-text-secondary/70">
                  {Math.round(planProgress * 100)}%
                </span>
              )}
              {isExtracting && (
                <Loader2 className="size-3.5 text-text-secondary animate-spin" />
              )}
            </div>

            {proposedCount > 0 && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.round(planProgress * 100)}%` }}
                  />
                </div>
                {!scheduleComplete && (
                  <p className="mt-1 text-[11px] text-text-secondary/70">
                    Need a time for {proposedMissingTimes} task{proposedMissingTimes !== 1 ? 's' : ''}. Say when you want to do them, or set times here.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Panel body */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-3 py-2">
              {missingGeminiKey ? (
                <p className="text-xs text-text-secondary/60 italic px-1 py-4 text-center">
                  Add a Gemini API key in Settings to auto-extract tasks from your conversation.
                </p>
              ) : proposedTodos.length === 0 && isExtracting ? (
                <p className="text-xs text-text-secondary/60 italic px-1 py-4 text-center">
                  Listening for tasks...
                </p>
              ) : proposedTodos.length === 0 ? (
                <p className="text-xs text-text-secondary/60 italic px-1 py-4 text-center">
                  Tasks mentioned in your conversation will appear here.
                </p>
              ) : (
                <TodoPreviewList todos={proposedTodos} onUpdate={handleUpdateTodos} />
              )}
            </div>
          </ScrollArea>

          {/* Save button */}
          {hasProposedTodos && (
            <div className="shrink-0 px-3 py-2 border-t border-white/[0.06]">
              <Button
                size="sm"
                className="w-full"
                onClick={handleSaveTasks}
                disabled={!scheduleComplete}
              >
                <Save className="size-3.5 mr-1.5" />
                {scheduleComplete
                  ? `Save ${proposedTodos.length} task${proposedTodos.length !== 1 ? 's' : ''}`
                  : 'Add times to save'}
              </Button>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(panel, document.body);
}
