import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Check, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TodoItem } from '@norot/shared';

interface TodoItemListProps {
  todos: TodoItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (text: string, app?: string, url?: string) => void;
  showAddInput?: boolean;
}

export function TodoItemList({ todos, onToggle, onDelete, onAdd, showAddInput = true }: TodoItemListProps) {
  const [newText, setNewText] = useState('');
  const [showExtraFields, setShowExtraFields] = useState(false);
  const [newApp, setNewApp] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleAdd = () => {
    const text = newText.trim();
    if (!text) return;
    const app = newApp.trim() || undefined;
    const url = newUrl.trim() || undefined;
    onAdd(text, app, url);
    setNewText('');
    setNewApp('');
    setNewUrl('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
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
                'flex items-start gap-2.5 px-3 py-2 rounded-lg',
                'bg-[var(--color-glass-well)] border border-white/[0.05]',
                'transition-all duration-200',
              )}
            >
              {/* Custom checkbox */}
              <button
                onClick={() => onToggle(todo.id)}
                className={cn(
                  'shrink-0 w-4 h-4 rounded-[4px] flex items-center justify-center mt-0.5',
                  'transition-all duration-200',
                  todo.done
                    ? 'bg-success/20 border border-success/40'
                    : 'bg-[var(--color-glass-well)] border border-white/[0.1] hover:border-white/[0.2]',
                )}
                style={todo.done ? {
                  boxShadow: '0 0 8px var(--color-glow-success)',
                } : undefined}
              >
                {todo.done && <Check className="size-2.5 text-success" />}
              </button>

              {/* Text + badges */}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    'text-sm leading-relaxed block truncate',
                    todo.done
                      ? 'line-through text-text-muted opacity-60'
                      : 'text-text-primary',
                  )}
                >
                  {todo.text}
                </span>
                {(todo.app || todo.url) && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {todo.app && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md text-cyan-400 bg-cyan-400/10 border border-cyan-400/20">
                        {todo.app}
                      </span>
                    )}
                    {todo.url && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md text-orange-400 bg-orange-400/10 border border-orange-400/20">
                        {todo.url}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Delete button — visible on hover */}
              <button
                onClick={() => onDelete(todo.id)}
                className={cn(
                  'shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5',
                  'text-text-muted opacity-0 group-hover:opacity-100',
                  'hover:text-danger hover:bg-danger/10',
                  'transition-all duration-200',
                )}
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add input */}
      {showAddInput && (
        <div className="flex flex-col gap-1.5">
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg',
              'bg-[var(--color-glass-well)] border border-white/[0.04]',
            )}
          >
            <Plus className="shrink-0 size-3.5 text-text-muted" />
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a task..."
              className={cn(
                'flex-1 bg-transparent text-sm text-text-primary',
                'placeholder:text-text-muted focus:outline-none',
              )}
            />
            <button
              onClick={() => setShowExtraFields(!showExtraFields)}
              className={cn(
                'shrink-0 w-6 h-6 rounded-md flex items-center justify-center',
                'transition-all duration-200',
                showExtraFields
                  ? 'text-primary bg-primary/10'
                  : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]',
              )}
              title="Add app/URL metadata"
            >
              <Link2 className="size-3" />
            </button>
            {newText.trim() && (
              <button
                onClick={handleAdd}
                className="shrink-0 text-primary hover:text-primary-hover text-xs font-medium"
              >
                Add
              </button>
            )}
          </div>

          <AnimatePresence>
            {showExtraFields && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-1.5 overflow-hidden"
              >
                <input
                  value={newApp}
                  onChange={(e) => setNewApp(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="App name (e.g. VS Code)"
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs',
                    'bg-[var(--color-glass-well)] border border-white/[0.04]',
                    'text-text-primary placeholder:text-text-muted focus:outline-none',
                  )}
                />
                <input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="URL (e.g. github.com)"
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs',
                    'bg-[var(--color-glass-well)] border border-white/[0.04]',
                    'text-text-primary placeholder:text-text-muted focus:outline-none',
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
