import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { TodoItemList } from '@/components/TodoItemList';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';
import type { TodoItem } from '@norot/shared';

export function TodoOverlayPage() {
  const [todos, setTodos] = useState<TodoItem[]>([]);

  const loadTodos = useCallback(async () => {
    try {
      const items = await getNorotAPI().getTodos();
      setTodos(items);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // Make body transparent for Electron transparent window
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';

    loadTodos();
    const api = getNorotAPI();
    const unsubTodos = api.onTodosUpdated((updated) => setTodos(updated));

    return () => {
      unsubTodos();
    };
  }, [loadTodos]);

  const handleToggle = async (id: string) => {
    try { await getNorotAPI().toggleTodo(id); } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try { await getNorotAPI().deleteTodo(id); } catch { /* ignore */ }
  };

  const handleAdd = async (text: string, app?: string, url?: string) => {
    try {
      const newTodo: TodoItem = {
        id: crypto.randomUUID(),
        text,
        done: false,
        order: todos.length,
        ...(app ? { app } : {}),
        ...(url ? { url } : {}),
      };
      await getNorotAPI().addTodo(newTodo);
    } catch { /* ignore */ }
  };

  const handleClose = async () => {
    try { await getNorotAPI().closeTodoOverlay(); } catch { /* ignore */ }
  };

  return (
    <div className="dark">
      <div
        className={cn(
          'flex flex-col h-screen w-screen overflow-hidden',
          'bg-[rgba(9,9,11,0.85)] backdrop-blur-[20px] rounded-xl',
        )}
      >
        {/* Drag bar */}
        <div
          className="h-8 shrink-0 flex items-center justify-between px-3"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <span className="text-xs font-medium text-text-secondary">Todo</span>
          <button
            onClick={handleClose}
            className={cn(
              'w-5 h-5 rounded flex items-center justify-center',
              'text-text-muted hover:text-text-primary hover:bg-white/[0.06]',
              'transition-colors duration-200',
            )}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <X className="size-3" />
          </button>
        </div>

        {/* Todo list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-3 pb-3">
            <TodoItemList
              todos={todos}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onAdd={handleAdd}
            />
          </div>
        </ScrollArea>

      </div>
    </div>
  );
}
