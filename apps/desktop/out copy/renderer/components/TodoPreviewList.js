import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
export function TodoPreviewList({ todos, onUpdate, itemLayoutIdPrefix }) {
    const [newTaskText, setNewTaskText] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [newAppInputs, setNewAppInputs] = useState({});
    const handleAddTask = () => {
        const text = newTaskText.trim();
        if (!text)
            return;
        const newTodo = {
            id: crypto.randomUUID(),
            text,
            done: false,
            order: todos.length,
            allowedApps: [],
        };
        onUpdate([...todos, newTodo]);
        setNewTaskText('');
    };
    const handleDelete = (id) => {
        onUpdate(todos.filter((t) => t.id !== id));
    };
    const handleStartEdit = (todo) => {
        setEditingId(todo.id);
        setEditText(todo.text);
    };
    const handleFinishEdit = (id) => {
        const text = editText.trim();
        if (text) {
            onUpdate(todos.map((t) => t.id === id ? { ...t, text } : t));
        }
        setEditingId(null);
        setEditText('');
    };
    const handleDeadlineChange = (todoId, deadline) => {
        onUpdate(todos.map((t) => t.id === todoId
            ? { ...t, deadline: deadline || undefined }
            : t));
    };
    const handleStartTimeChange = (todoId, startTime) => {
        onUpdate(todos.map((t) => t.id === todoId
            ? { ...t, startTime: startTime || undefined }
            : t));
    };
    const handleDurationChange = (todoId, minutes) => {
        onUpdate(todos.map((t) => t.id === todoId
            ? { ...t, durationMinutes: minutes }
            : t));
    };
    const setDeadlinePreset = (todoId, offsetHours) => {
        const d = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        handleDeadlineChange(todoId, `${hh}:${mm}`);
    };
    const handleRemoveApp = (todoId, app) => {
        onUpdate(todos.map((t) => t.id === todoId
            ? { ...t, allowedApps: (t.allowedApps ?? []).filter((a) => a !== app) }
            : t));
    };
    const handleAddApp = (todoId) => {
        const app = (newAppInputs[todoId] ?? '').trim();
        if (!app)
            return;
        onUpdate(todos.map((t) => {
            if (t.id !== todoId)
                return t;
            const existing = t.allowedApps ?? [];
            if (existing.includes(app))
                return t;
            return { ...t, allowedApps: [...existing, app] };
        }));
        setNewAppInputs((prev) => ({ ...prev, [todoId]: '' }));
    };
    return (_jsxs("div", { className: "flex flex-col gap-2", children: [todos.map((todo) => (_jsxs(motion.div, { layout: true, layoutId: itemLayoutIdPrefix ? `${itemLayoutIdPrefix}${todo.id}` : undefined, className: cn('flex flex-col gap-1.5 px-3 py-2 rounded-lg', 'bg-[var(--color-glass-well)] border border-white/[0.06]'), children: [_jsxs("div", { className: "flex items-center gap-2", children: [editingId === todo.id ? (_jsx("input", { value: editText, onChange: (e) => setEditText(e.target.value), onBlur: () => handleFinishEdit(todo.id), onKeyDown: (e) => {
                                    if (e.key === 'Enter')
                                        handleFinishEdit(todo.id);
                                    if (e.key === 'Escape')
                                        setEditingId(null);
                                }, autoFocus: true, className: cn('flex-1 bg-transparent text-sm text-text-primary', 'border-b border-primary/40 focus:outline-none') })) : (_jsx("span", { onClick: () => handleStartEdit(todo), className: "flex-1 text-sm text-text-primary cursor-text hover:text-primary transition-colors", children: todo.text })), _jsxs("div", { className: "shrink-0 flex flex-wrap items-center gap-1", children: [!todo.deadline && (_jsxs(_Fragment, { children: [[1, 2].map((h) => (_jsxs("button", { onClick: () => setDeadlinePreset(todo.id, h), className: cn('px-1.5 py-0.5 rounded text-[10px] text-text-muted', 'border border-white/10 hover:border-primary/40 hover:text-primary transition-colors'), children: [h, "h"] }, h))), _jsx("button", { onClick: () => handleDeadlineChange(todo.id, '17:00'), className: cn('px-1.5 py-0.5 rounded text-[10px] text-text-muted', 'border border-white/10 hover:border-primary/40 hover:text-primary transition-colors'), children: "5pm" })] })), _jsx("input", { type: "time", value: todo.deadline ?? '', onChange: (e) => handleDeadlineChange(todo.id, e.target.value), className: cn('bg-transparent text-xs text-text-muted', 'border border-white/10 rounded px-2 py-1', 'focus:outline-none focus:border-primary/40', todo.deadline ? 'text-text-primary' : ''), title: "Set deadline" }), _jsx("input", { type: "time", value: todo.startTime ?? '', onChange: (e) => handleStartTimeChange(todo.id, e.target.value), className: cn('bg-transparent text-xs text-text-muted', 'border border-white/10 rounded px-2 py-1', 'focus:outline-none focus:border-primary/40', todo.startTime ? 'text-text-primary' : ''), title: "Start" }), !todo.durationMinutes && (_jsx(_Fragment, { children: [30, 60, 120].map((m) => (_jsx("button", { onClick: () => handleDurationChange(todo.id, m), className: cn('px-1.5 py-0.5 rounded text-[10px] text-text-muted', 'border border-white/10 hover:border-primary/40 hover:text-primary transition-colors'), children: m === 60 ? '1h' : m === 120 ? '2h' : `${m}m` }, m))) })), _jsx("input", { type: "number", min: 5, step: 5, value: todo.durationMinutes ?? '', onChange: (e) => {
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
                                        }, placeholder: "min", className: cn('w-16 bg-transparent text-xs text-text-muted', 'border border-white/10 rounded px-2 py-1', 'focus:outline-none focus:border-primary/40', typeof todo.durationMinutes === 'number' ? 'text-text-primary' : ''), title: "Duration (minutes)" })] }), _jsx("button", { onClick: () => handleDelete(todo.id), className: "shrink-0 p-1 text-text-muted hover:text-red-400 transition-colors", children: _jsx(Trash2, { className: "size-3.5" }) })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-1", children: [(todo.allowedApps ?? []).map((app) => (_jsxs("span", { className: cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full', 'text-[11px] font-medium bg-primary/15 text-primary'), children: [app, _jsx("button", { onClick: () => handleRemoveApp(todo.id, app), className: "hover:text-red-400 transition-colors", children: _jsx(X, { className: "size-2.5" }) })] }, app))), _jsx("input", { value: newAppInputs[todo.id] ?? '', onChange: (e) => setNewAppInputs((prev) => ({ ...prev, [todo.id]: e.target.value })), onKeyDown: (e) => {
                                    if (e.key === 'Enter')
                                        handleAddApp(todo.id);
                                }, placeholder: "+ app", className: cn('w-16 bg-transparent text-[11px] text-text-muted', 'placeholder:text-text-muted/50 focus:outline-none focus:text-text-primary') })] })] }, todo.id))), _jsxs(motion.div, { layout: true, className: cn('flex items-center gap-2 px-3 py-2 rounded-lg', 'bg-[var(--color-glass-well)]/50 border border-dashed border-white/[0.06]'), children: [_jsx(Plus, { className: "size-3.5 text-text-muted shrink-0" }), _jsx("input", { value: newTaskText, onChange: (e) => setNewTaskText(e.target.value), onKeyDown: (e) => {
                            if (e.key === 'Enter')
                                handleAddTask();
                        }, placeholder: "Add a task...", className: cn('flex-1 bg-transparent text-sm text-text-primary', 'placeholder:text-text-muted focus:outline-none') })] })] }));
}
