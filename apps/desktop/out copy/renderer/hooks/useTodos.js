import { useState, useEffect, useCallback } from 'react';
import { getNorotAPI } from '@/lib/norot-api';
export function useTodos(enabled = true) {
    const [todos, setTodos] = useState([]);
    const loadTodos = useCallback(async () => {
        try {
            const items = await getNorotAPI().getTodos();
            setTodos(items);
        }
        catch { /* ignore */ }
    }, []);
    useEffect(() => {
        if (!enabled)
            return;
        loadTodos();
        const unsub = getNorotAPI().onTodosUpdated((updated) => setTodos(updated));
        return unsub;
    }, [enabled, loadTodos]);
    const handleToggle = async (id) => {
        try {
            await getNorotAPI().toggleTodo(id);
        }
        catch { /* ignore */ }
    };
    const handleDelete = async (id) => {
        try {
            await getNorotAPI().deleteTodo(id);
        }
        catch { /* ignore */ }
    };
    const handleAdd = async (text, app, url) => {
        try {
            const newTodo = {
                id: crypto.randomUUID(),
                text,
                done: false,
                order: todos.length,
                ...(app ? { app } : {}),
                ...(url ? { url } : {}),
            };
            await getNorotAPI().addTodo(newTodo);
        }
        catch { /* ignore */ }
    };
    const handleUpdate = async (id, fields) => {
        try {
            await getNorotAPI().updateTodo(id, fields);
        }
        catch { /* ignore */ }
    };
    return { todos, handleToggle, handleDelete, handleAdd, handleUpdate };
}
