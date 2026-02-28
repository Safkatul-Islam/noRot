import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TodoItem } from '@norot/shared';

interface TodoPreviewListProps {
  todos: TodoItem[];
  onUpdate: (todos: TodoItem[]) => void;
  itemLayoutIdPrefix?: string;
}

export function TodoPreviewList({ todos, onUpdate, itemLayoutIdPrefix }: TodoPreviewListProps) {
  const [newTaskText, setNewTaskText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newAppInputs, setNewAppInputs] = useState<Record<string, string>>({});

  const handleAddTask = () => {
    const text = newTaskText.trim();
    if (!text) return;
    const newTodo: TodoItem = {
      id: crypto.randomUUID(),
      text,
      done: false,
      order: todos.length,
      allowedApps: [],
    };
    onUpdate([...todos, newTodo]);
    setNewTaskText('');
  };

  const handleDelete = (id: string) => {
    onUpdate(todos.filter((t) => t.id !== id));
  };

  const handleStartEdit = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const handleFinishEdit = (id: string) => {
    const text = editText.trim();
    if (text) {
      onUpdate(todos.map((t) => t.id === id ? { ...t, text } : t));
    }
    setEditingId(null);
    setEditText('');
  };

  const handleDeadlineChange = (todoId: string, deadline: string) => {
    onUpdate(
      todos.map((t) =>
        t.id === todoId
          ? { ...t, deadline: deadline || undefined }
          : t,
      ),
    );
  };

  const handleStartTimeChange = (todoId: string, startTime: string) => {
    onUpdate(
      todos.map((t) =>
        t.id === todoId
          ? { ...t, startTime: startTime || undefined }
          : t,
      ),
    );
  };

  const handleDurationChange = (todoId: string, minutes: number | undefined) => {
    onUpdate(
      todos.map((t) =>
        t.id === todoId
          ? { ...t, durationMinutes: minutes }
          : t,
      ),
    );
  };

  const setDeadlinePreset = (todoId: string, offsetHours: number) => {
    const d = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    handleDeadlineChange(todoId, `${hh}:${mm}`);
  };

  const handleRemoveApp = (todoId: string, app: string) => {
    onUpdate(
      todos.map((t) =>
        t.id === todoId
          ? { ...t, allowedApps: (t.allowedApps ?? []).filter((a) => a !== app) }
          : t,
      ),
    );
  };

  const handleAddApp = (todoId: string) => {
    const app = (newAppInputs[todoId] ?? '').trim();
    if (!app) return;
    onUpdate(
      todos.map((t) => {
        if (t.id !== todoId) return t;
        const existing = t.allowedApps ?? [];
        if (existing.includes(app)) return t;
        return { ...t, allowedApps: [...existing, app] };
      }),
    );
    setNewAppInputs((prev) => ({ ...prev, [todoId]: '' }));
  };

  return (
    <div className="flex flex-col gap-2">
      {todos.map((todo) => (
        <motion.div
          key={todo.id}
          layout
          layoutId={itemLayoutIdPrefix ? `${itemLayoutIdPrefix}${todo.id}` : undefined}
          className={cn(
            'flex flex-col gap-1.5 px-3 py-2 rounded-lg',
            'bg-[var(--color-glass-well)] border border-white/[0.06]',
          )}
        >
          <div className="flex items-center gap-2">
            {/* Task text — click to edit */}
            {editingId === todo.id ? (
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={() => handleFinishEdit(todo.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishEdit(todo.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                autoFocus
                className={cn(
                  'flex-1 bg-transparent text-sm text-text-primary',
                  'border-b border-primary/40 focus:outline-none',
                )}
              />
            ) : (
              <span
                onClick={() => handleStartEdit(todo)}
                className="flex-1 text-sm text-text-primary cursor-text hover:text-primary transition-colors"
              >
                {todo.text}
              </span>
            )}
            <div className="shrink-0 flex flex-wrap items-center gap-1">
              {!todo.deadline && (
                <>
                  {[1, 2].map((h) => (
                    <button
                      key={h}
                      onClick={() => setDeadlinePreset(todo.id, h)}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] text-text-muted',
                        'border border-white/10 hover:border-primary/40 hover:text-primary transition-colors',
                      )}
                    >
                      {h}h
                    </button>
                  ))}
                  <button
                    onClick={() => handleDeadlineChange(todo.id, '17:00')}
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] text-text-muted',
                      'border border-white/10 hover:border-primary/40 hover:text-primary transition-colors',
                    )}
                  >
                    5pm
                  </button>
                </>
              )}
              <input
                type="time"
                value={todo.deadline ?? ''}
                onChange={(e) => handleDeadlineChange(todo.id, e.target.value)}
                className={cn(
                  'bg-transparent text-xs text-text-muted',
                  'border border-white/10 rounded px-2 py-1',
                  'focus:outline-none focus:border-primary/40',
                  todo.deadline ? 'text-text-primary' : '',
                )}
                title="Set deadline"
              />

              <input
                type="time"
                value={todo.startTime ?? ''}
                onChange={(e) => handleStartTimeChange(todo.id, e.target.value)}
                className={cn(
                  'bg-transparent text-xs text-text-muted',
                  'border border-white/10 rounded px-2 py-1',
                  'focus:outline-none focus:border-primary/40',
                  todo.startTime ? 'text-text-primary' : '',
                )}
                title="Start"
              />

              {!todo.durationMinutes && (
                <>
                  {[30, 60, 120].map((m) => (
                    <button
                      key={m}
                      onClick={() => handleDurationChange(todo.id, m)}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] text-text-muted',
                        'border border-white/10 hover:border-primary/40 hover:text-primary transition-colors',
                      )}
                    >
                      {m === 60 ? '1h' : m === 120 ? '2h' : `${m}m`}
                    </button>
                  ))}
                </>
              )}
              <input
                type="number"
                min={5}
                step={5}
                value={todo.durationMinutes ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!raw) {
                    handleDurationChange(todo.id, undefined);
                    return;
                  }
                  const parsed = Number(raw);
                  if (!Number.isFinite(parsed) || parsed <= 0) {
                    handleDurationChange(todo.id, undefined);
                    return;
                  }
                  handleDurationChange(todo.id, Math.trunc(parsed));
                }}
                placeholder="min"
                className={cn(
                  'w-16 bg-transparent text-xs text-text-muted',
                  'border border-white/10 rounded px-2 py-1',
                  'focus:outline-none focus:border-primary/40',
                  typeof todo.durationMinutes === 'number' ? 'text-text-primary' : '',
                )}
                title="Duration (minutes)"
              />
            </div>
            <button
              onClick={() => handleDelete(todo.id)}
              className="shrink-0 p-1 text-text-muted hover:text-red-400 transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>

          {/* Allowed apps chips */}
          <div className="flex flex-wrap items-center gap-1">
            {(todo.allowedApps ?? []).map((app) => (
              <span
                key={app}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
                  'text-[11px] font-medium bg-primary/15 text-primary',
                )}
              >
                {app}
                <button
                  onClick={() => handleRemoveApp(todo.id, app)}
                  className="hover:text-red-400 transition-colors"
                >
                  <X className="size-2.5" />
                </button>
              </span>
            ))}
            <input
              value={newAppInputs[todo.id] ?? ''}
              onChange={(e) =>
                setNewAppInputs((prev) => ({ ...prev, [todo.id]: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddApp(todo.id);
              }}
              placeholder="+ app"
              className={cn(
                'w-16 bg-transparent text-[11px] text-text-muted',
                'placeholder:text-text-muted/50 focus:outline-none focus:text-text-primary',
              )}
            />
          </div>
        </motion.div>
      ))}

      {/* Add new task */}
      <motion.div
        layout
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-[var(--color-glass-well)]/50 border border-dashed border-white/[0.06]',
        )}
      >
        <Plus className="size-3.5 text-text-muted shrink-0" />
        <input
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddTask();
          }}
          placeholder="Add a task..."
          className={cn(
            'flex-1 bg-transparent text-sm text-text-primary',
            'placeholder:text-text-muted focus:outline-none',
          )}
        />
      </motion.div>
    </div>
  );
}
