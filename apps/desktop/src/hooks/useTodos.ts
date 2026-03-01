import { useState, useEffect, useCallback } from 'react';
import { getNorotAPI } from '@/lib/norot-api';
import type { TodoItem } from '@norot/shared';

export function useTodos(enabled = true) {
  const [todos, setTodos] = useState<TodoItem[]>([]);

  const loadTodos = useCallback(async () => {
    try {
      const items = await getNorotAPI().getTodos();
      setTodos(items);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    loadTodos();
    const unsub = getNorotAPI().onTodosUpdated((updated) => setTodos(updated));
    return unsub;
  }, [enabled, loadTodos]);

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

  return { todos, handleToggle, handleDelete, handleAdd };
}
