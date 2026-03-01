import type { TodoItem } from '@norot/shared';
import { VoiceTaskPanel } from '@/components/VoiceTaskPanel';

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
  const title = isReviewing ? 'Your Tasks' : 'Draft Tasks';
  const showEmptyTalking = !isReviewing && todos.filter((t) => !floatingIds.has(t.id)).length === 0 && !missingGeminiKey;

  return (
    <VoiceTaskPanel
      title={title}
      isExtracting={isExtracting}
      missingGeminiKey={missingGeminiKey}
      todos={todos}
      floatingIds={floatingIds}
      onUpdateTodos={onUpdateTodos}
      itemLayoutIdPrefix="task-bubble-"
      emptyText={showEmptyTalking ? 'Tasks will appear as you talk...' : undefined}
      showOptionalTimeHint={!isReviewing}
      timeHintText="Add times as you go, or set them here."
    />
  );
}
