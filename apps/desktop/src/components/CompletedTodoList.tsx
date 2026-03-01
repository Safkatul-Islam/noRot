import { motion, AnimatePresence } from 'motion/react';
import { Undo2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompletedTodoItem } from '@norot/shared';

interface CompletedTodoListProps {
  todos: CompletedTodoItem[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatRelativeDate(isoDate: string): string {
  const completed = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - completed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  return `${Math.floor(diffDays / 7)} weeks ago`;
}

export function CompletedTodoList({ todos, onRestore, onDelete }: CompletedTodoListProps) {
  if (todos.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <AnimatePresence initial={false}>
        {todos.map((todo) => (
          <motion.div
            key={todo.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="group"
          >
            <div
              className={cn(
                'flex items-center gap-2.5 px-3 py-1.5 rounded-lg',
                'bg-[var(--color-glass-well)] border border-white/[0.05]',
              )}
            >
              <span className="flex-1 min-w-0 text-sm text-text-secondary line-through truncate">
                {todo.text}
              </span>

              <span className="shrink-0 text-[10px] text-text-muted">
                {formatRelativeDate(todo.completedAt)}
              </span>

              <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onRestore(todo.id)}
                  className={cn(
                    'w-6 h-6 rounded-md flex items-center justify-center',
                    'text-text-muted hover:text-primary hover:bg-primary/10',
                    'transition-all duration-200',
                  )}
                  title="Restore task"
                >
                  <Undo2 className="size-3" />
                </button>
                <button
                  onClick={() => onDelete(todo.id)}
                  className={cn(
                    'w-6 h-6 rounded-md flex items-center justify-center',
                    'text-text-muted hover:text-danger hover:bg-danger/10',
                    'transition-all duration-200',
                  )}
                  title="Delete permanently"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
