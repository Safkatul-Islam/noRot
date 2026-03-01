import { Loader2, ListTodo } from 'lucide-react';
import type { TodoItem } from '@norot/shared';
import { GlassCard } from '@/components/GlassCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TodoPreviewList } from '@/components/TodoPreviewList';
import { cn } from '@/lib/utils';

interface TodoItemWithEdited extends TodoItem {
  _userEdited?: boolean;
}

interface VoiceTaskPanelProps {
  title: string;
  isExtracting: boolean;
  missingGeminiKey: boolean;
  todos: TodoItem[];
  floatingIds?: Set<string>;
  onUpdateTodos: (todos: TodoItem[]) => void;
  itemLayoutIdPrefix?: string;
  emptyText?: string;
  showOptionalTimeHint?: boolean;
  timeHintText?: string;
  footer?: React.ReactNode;
  className?: string;
}

export function VoiceTaskPanel({
  title,
  isExtracting,
  missingGeminiKey,
  todos,
  floatingIds,
  onUpdateTodos,
  itemLayoutIdPrefix,
  emptyText,
  showOptionalTimeHint = false,
  timeHintText = 'Optional: add start times / durations / deadlines as you go.',
  footer,
  className,
}: VoiceTaskPanelProps) {
  const allCount = todos.length;
  const withTiming = todos.filter((t) =>
    (typeof t.deadline === 'string' && t.deadline)
    || (typeof t.startTime === 'string' && t.startTime)
    || (typeof t.durationMinutes === 'number' && Number.isFinite(t.durationMinutes) && t.durationMinutes > 0)
  ).length;
  const timeProgress = allCount === 0 ? 0 : withTiming / allCount;
  const planProgress = allCount === 0 ? 0 : 0.4 + 0.6 * timeProgress;

  const hidden = floatingIds ?? new Set<string>();
  const visibleTodos = todos.filter((t) => !hidden.has(t.id));

  const shouldShowEmptyText = Boolean(emptyText) && visibleTodos.length === 0 && !missingGeminiKey;

  return (
    <GlassCard
      variant="dense"
      className={cn(
        'w-full md:w-[320px] px-5 py-5 gap-4',
        'shrink-0 overflow-hidden',
        'max-h-[min(calc(100vh-180px),600px)]',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
          <ListTodo className="size-3.5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            {isExtracting && (
              <Loader2 className="size-3.5 text-text-secondary animate-spin" />
            )}
            {allCount > 0 && (
              <span className="ml-auto text-[10px] font-medium text-text-secondary/70">
                {Math.round(planProgress * 100)}%
              </span>
            )}
          </div>
          {allCount > 0 && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.round(planProgress * 100)}%` }}
                />
              </div>
              {showOptionalTimeHint && withTiming < allCount && (
                <p className="mt-1 text-[11px] text-text-secondary/70">
                  {timeHintText}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1 min-h-0 pr-2">
        <div className="py-1">
          {missingGeminiKey && (
            <p className="text-xs text-text-secondary/70 italic px-1 pb-3 text-center">
              Add a Gemini API key in Settings to auto-extract tasks from your conversation.
            </p>
          )}

          {shouldShowEmptyText ? (
            <p className="text-sm text-text-secondary/60 italic px-1 py-8 text-center">
              {emptyText}
            </p>
          ) : (
            <TodoPreviewList
              todos={visibleTodos as TodoItemWithEdited[]}
              onUpdate={onUpdateTodos}
              itemLayoutIdPrefix={itemLayoutIdPrefix}
            />
          )}
        </div>
      </ScrollArea>

      {footer && (
        <div className="shrink-0 pt-3 border-t border-white/10">
          {footer}
        </div>
      )}
    </GlassCard>
  );
}
