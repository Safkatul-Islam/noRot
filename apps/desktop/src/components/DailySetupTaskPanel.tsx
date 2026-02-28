import { Loader2, ListTodo } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TodoPreviewList } from '@/components/TodoPreviewList';
import { cn } from '@/lib/utils';
import type { TodoItem } from '@norot/shared';

interface TodoItemWithEdited extends TodoItem {
  _userEdited?: boolean;
}

interface DailySetupTaskPanelProps {
  isReviewing: boolean;
  isExtracting: boolean;
  missingGeminiKey: boolean;
  todos: TodoItem[];
  floatingIds: Set<string>;
  onUpdateTodos: (todos: TodoItem[]) => void;
}

export function DailySetupTaskPanel({
  isReviewing,
  isExtracting,
  missingGeminiKey,
  todos,
  floatingIds,
  onUpdateTodos,
}: DailySetupTaskPanelProps) {
  const allCount = todos.length;
  const withTimes = todos.filter((t) => typeof t.deadline === 'string' && t.deadline).length;
  const timeProgress = allCount === 0 ? 0 : withTimes / allCount;
  const planProgress = allCount === 0 ? 0 : 0.4 + 0.6 * timeProgress;

  const visibleTodos = todos.filter((t) => !floatingIds.has(t.id));

  const title = isReviewing ? 'Your Tasks' : 'Draft Tasks';
  const showEmptyTalking = !isReviewing && visibleTodos.length === 0 && !missingGeminiKey;

  return (
    <GlassCard
      variant="dense"
      className={cn(
        'w-full md:w-[340px] px-5 py-5 gap-4',
        'shrink-0 overflow-hidden',
        'max-h-[calc(100vh-240px)]',
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
              {!isReviewing && withTimes < allCount && (
                <p className="mt-1 text-[11px] text-text-secondary/70">
                  Add times as you go, or set them here.
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

          {showEmptyTalking ? (
            <p className="text-sm text-text-secondary/60 italic px-1 py-8 text-center">
              Tasks will appear as you talk...
            </p>
          ) : (
            <TodoPreviewList
              todos={visibleTodos as TodoItemWithEdited[]}
              onUpdate={onUpdateTodos}
              itemLayoutIdPrefix="task-bubble-"
            />
          )}
        </div>
      </ScrollArea>
    </GlassCard>
  );
}
