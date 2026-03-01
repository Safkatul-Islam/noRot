import { useState, useEffect, useCallback, useRef } from 'react';
import { getNorotAPI } from '@/lib/norot-api';
import type { TodoItem, CompletedTodoItem } from '@norot/shared';

const COMPLETE_DELAY_MS = 3000;

export function useTodos(enabled = true) {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [completedTodos, setCompletedTodos] = useState<CompletedTodoItem[]>([]);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const loadTodos = useCallback(async () => {
    try {
      const items = await getNorotAPI().getTodos();
      setTodos(items);
    } catch { /* ignore */ }
  }, []);

  const loadCompletedTodos = useCallback(async () => {
    try {
      const items = await getNorotAPI().getCompletedTodos();
      setCompletedTodos(items);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    loadTodos();
    loadCompletedTodos();
    const api = getNorotAPI();
    const unsubTodos = api.onTodosUpdated((updated) => setTodos(updated));
    const unsubCompleted = api.onCompletedTodosUpdated((updated) => setCompletedTodos(updated));
    return () => {
      unsubTodos();
      unsubCompleted();
    };
  }, [enabled, loadTodos, loadCompletedTodos]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
    };
  }, []);

  const handleToggle = useCallback((id: string) => {
    const timers = timersRef.current;

    // If already completing, cancel (undo)
    if (timers.has(id)) {
      clearTimeout(timers.get(id)!);
      timers.delete(id);
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    // Start 3s countdown
    setCompletingIds((prev) => new Set(prev).add(id));

    const timer = setTimeout(async () => {
      timers.delete(id);
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      try {
        await getNorotAPI().completeTodo(id);
      } catch { /* ignore */ }
    }, COMPLETE_DELAY_MS);

    timers.set(id, timer);
  }, []);

  const handleDelete = async (id: string) => {
    // Cancel any pending completion timer
    const timers = timersRef.current;
    if (timers.has(id)) {
      clearTimeout(timers.get(id)!);
      timers.delete(id);
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
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

  const handleUpdate = async (id: string, fields: Partial<Omit<TodoItem, 'id'>>) => {
    try {
      await getNorotAPI().updateTodo(id, fields);
    } catch { /* ignore */ }
  };

  const handleRestore = async (id: string) => {
    try { await getNorotAPI().restoreTodo(id); } catch { /* ignore */ }
  };

  const handleDeleteCompleted = async (id: string) => {
    try { await getNorotAPI().deleteCompletedTodo(id); } catch { /* ignore */ }
  };

  return {
    todos,
    completedTodos,
    completingIds,
    handleToggle,
    handleDelete,
    handleAdd,
    handleUpdate,
    handleRestore,
    handleDeleteCompleted,
  };
}
