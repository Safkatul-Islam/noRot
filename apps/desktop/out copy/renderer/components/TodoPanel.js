import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, PanelRightClose } from 'lucide-react';
import { TodoItemList } from '@/components/TodoItemList';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';
export function TodoPanel({ open, onToggle }) {
    const [todos, setTodos] = useState([]);
    const loadTodos = useCallback(async () => {
        try {
            const api = getNorotAPI();
            const items = await api.getTodos();
            setTodos(items);
        }
        catch {
            // ignore
        }
    }, []);
    useEffect(() => {
        loadTodos();
        const api = getNorotAPI();
        const unsub = api.onTodosUpdated((updated) => setTodos(updated));
        return unsub;
    }, [loadTodos]);
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
    const handlePopOut = async () => {
        try {
            await getNorotAPI().openTodoOverlay();
        }
        catch { /* ignore */ }
    };
    return (_jsx(AnimatePresence, { initial: false, children: open && (_jsxs(motion.aside, { initial: { width: 0, opacity: 0 }, animate: { width: 280, opacity: 1 }, exit: { width: 0, opacity: 0 }, transition: { type: 'spring', stiffness: 350, damping: 30 }, className: cn('shrink-0 flex flex-col h-full overflow-hidden', 'border-l border-white/[0.06]', 'bg-[var(--color-glass)] backdrop-blur-[14px]'), style: {
                boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.04)',
            }, children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-white/[0.06]", children: [_jsx("h3", { className: "text-sm font-semibold text-text-primary", children: "Todo" }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: handlePopOut, className: cn('w-7 h-7 rounded-md flex items-center justify-center', 'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]', 'transition-colors duration-200'), title: "Pop out as floating window", children: _jsx(Maximize2, { className: "size-3.5" }) }), _jsx("button", { onClick: onToggle, className: cn('w-7 h-7 rounded-md flex items-center justify-center', 'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]', 'transition-colors duration-200'), title: "Collapse panel", children: _jsx(PanelRightClose, { className: "size-3.5" }) })] })] }), _jsx(ScrollArea, { className: "flex-1 min-h-0", children: _jsx("div", { className: "p-3", children: _jsx(TodoItemList, { todos: todos, onToggle: handleToggle, onDelete: handleDelete, onAdd: handleAdd, onUpdate: handleUpdate }) }) })] })) }));
}
