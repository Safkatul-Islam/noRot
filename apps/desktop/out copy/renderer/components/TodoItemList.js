import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Plus, Check, Link2, ChevronDown, X, Clock, AlarmClock, Timer } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { AppNameCombobox } from '@/components/AppNameCombobox';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';
import { formatDurationMinutes, formatTimeOfDay, getTimeZoneLabel, resolveTimeZone } from '@/lib/time-utils';
export function TodoItemList({ todos, onToggle, onDelete, onAdd, onUpdate, showAddInput = true, enableAppDropdown = true }) {
    const [newText, setNewText] = useState('');
    const [showExtraFields, setShowExtraFields] = useState(false);
    const [newApp, setNewApp] = useState('');
    const [newUrl, setNewUrl] = useState('');
    // Inline editing state
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    // Detail editing state
    const [editApp, setEditApp] = useState('');
    const [editUrl, setEditUrl] = useState('');
    const [editDeadline, setEditDeadline] = useState('');
    const [newAllowedApp, setNewAllowedApp] = useState('');
    const [timeFormat, setTimeFormat] = useState('12h');
    const [timeZoneLabel, setTimeZoneLabel] = useState('');
    const editInputRef = useRef(null);
    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingId]);
    useEffect(() => {
        let cancelled = false;
        getNorotAPI().getSettings()
            .then((settings) => {
            if (cancelled)
                return;
            const fmt = settings?.timeFormat === '24h' ? '24h' : '12h';
            setTimeFormat(fmt);
            const tz = typeof settings?.timeZone === 'string' && settings.timeZone.trim()
                ? settings.timeZone.trim()
                : 'system';
            const resolved = resolveTimeZone(tz);
            setTimeZoneLabel(tz !== 'system' ? getTimeZoneLabel(resolved) : '');
        })
            .catch(() => {
            // ignore
        });
        return () => { cancelled = true; };
    }, []);
    const handleAdd = () => {
        const text = newText.trim();
        if (!text)
            return;
        const app = newApp.trim() || undefined;
        const url = newUrl.trim() || undefined;
        onAdd(text, app, url);
        setNewText('');
        setNewApp('');
        setNewUrl('');
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };
    const handleStartEdit = (todo) => {
        if (!onUpdate)
            return;
        setEditingId(todo.id);
        setEditText(todo.text);
    };
    const handleFinishEdit = (id) => {
        const text = editText.trim();
        if (text && text !== todos.find((t) => t.id === id)?.text) {
            onUpdate?.(id, { text });
        }
        setEditingId(null);
        setEditText('');
    };
    const handleCancelEdit = () => {
        setEditingId(null);
        setEditText('');
    };
    const handleToggleExpand = (todo) => {
        if (!onUpdate)
            return;
        if (expandedId === todo.id) {
            setExpandedId(null);
        }
        else {
            setExpandedId(todo.id);
            setEditApp(todo.app ?? '');
            setEditUrl(todo.url ?? '');
            setEditDeadline(todo.deadline ?? '');
            setNewAllowedApp('');
        }
    };
    const handleDeadlineChange = (id, deadline) => {
        setEditDeadline(deadline);
        onUpdate?.(id, { deadline: deadline || undefined });
    };
    const setDeadlinePreset = (id, offsetHours) => {
        const d = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        handleDeadlineChange(id, `${hh}:${mm}`);
    };
    const handleAppChange = (id, app) => {
        setEditApp(app);
        onUpdate?.(id, { app: app || undefined });
    };
    const handleUrlChange = (id, url) => {
        setEditUrl(url);
    };
    const handleUrlBlur = (id) => {
        const url = editUrl.trim();
        onUpdate?.(id, { url: url || undefined });
    };
    const handleRemoveAllowedApp = (id, appToRemove, currentAllowedApps) => {
        const updated = currentAllowedApps.filter((a) => a !== appToRemove);
        onUpdate?.(id, { allowedApps: updated.length > 0 ? updated : undefined });
    };
    const handleAddAllowedApp = (id, currentAllowedApps) => {
        const app = newAllowedApp.trim();
        if (!app || currentAllowedApps.includes(app))
            return;
        onUpdate?.(id, { allowedApps: [...currentAllowedApps, app] });
        setNewAllowedApp('');
    };
    const formatTime = (hhmm) => formatTimeOfDay(hhmm, timeFormat);
    return (_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx(AnimatePresence, { initial: false, children: todos.map((todo) => (_jsx(motion.div, { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto' }, exit: { opacity: 0, height: 0 }, transition: { duration: 0.2 }, className: "group", children: _jsxs("div", { className: cn('flex flex-col rounded-lg', 'bg-[var(--color-glass-well)] border border-white/[0.05]', 'transition-all duration-200', expandedId === todo.id && 'border-primary/20'), children: [_jsxs("div", { className: "flex items-start gap-2.5 px-3 py-2", children: [_jsx("button", { onClick: () => onToggle(todo.id), className: cn('shrink-0 w-4 h-4 rounded-[4px] flex items-center justify-center mt-0.5', 'transition-all duration-200', todo.done
                                            ? 'bg-success/20 border border-success/40'
                                            : 'bg-[var(--color-glass-well)] border border-white/[0.1] hover:border-white/[0.2]'), style: todo.done ? {
                                            boxShadow: '0 0 8px var(--color-glow-success)',
                                        } : undefined, children: todo.done && _jsx(Check, { className: "size-2.5 text-success" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [editingId === todo.id ? (_jsx("input", { ref: editInputRef, value: editText, onChange: (e) => setEditText(e.target.value), onBlur: () => handleFinishEdit(todo.id), onKeyDown: (e) => {
                                                    if (e.key === 'Enter')
                                                        handleFinishEdit(todo.id);
                                                    if (e.key === 'Escape')
                                                        handleCancelEdit();
                                                }, className: cn('w-full bg-transparent text-sm text-text-primary', 'border-b border-primary/40 focus:outline-none') })) : (_jsx("span", { onClick: () => handleStartEdit(todo), className: cn('text-sm leading-relaxed block truncate', todo.done
                                                    ? 'line-through text-text-muted opacity-60'
                                                    : 'text-text-primary', onUpdate && 'cursor-text hover:text-primary transition-colors'), children: todo.text })), (todo.app || todo.url || todo.deadline || todo.startTime || todo.durationMinutes) && (_jsxs("div", { className: "flex flex-wrap items-center gap-1.5 mt-1", children: [todo.app && (_jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded-md text-cyan-400 bg-cyan-400/10 border border-cyan-400/20", children: todo.app })), todo.url && (_jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded-md text-orange-400 bg-orange-400/10 border border-orange-400/20", children: todo.url })), todo.deadline && (_jsxs("span", { className: "text-[10px] px-1.5 py-0.5 rounded-md text-violet-400 bg-violet-400/10 border border-violet-400/20 flex items-center gap-0.5", children: [_jsx(AlarmClock, { className: "size-2.5" }), formatTime(todo.deadline), timeZoneLabel ? ` ${timeZoneLabel}` : ''] })), todo.startTime && (_jsxs("span", { className: "text-[10px] px-1.5 py-0.5 rounded-md text-violet-400 bg-violet-400/10 border border-violet-400/20 flex items-center gap-0.5", children: [_jsx(Clock, { className: "size-2.5" }), formatTime(todo.startTime), timeZoneLabel ? ` ${timeZoneLabel}` : ''] })), typeof todo.durationMinutes === 'number' && todo.durationMinutes > 0 && (_jsxs("span", { className: "text-[10px] px-1.5 py-0.5 rounded-md text-violet-400 bg-violet-400/10 border border-violet-400/20 flex items-center gap-0.5", children: [_jsx(Timer, { className: "size-2.5" }), formatDurationMinutes(todo.durationMinutes)] }))] }))] }), _jsxs("div", { className: "shrink-0 flex items-center gap-0.5 mt-0.5", children: [onUpdate && (_jsx("button", { onClick: () => handleToggleExpand(todo), className: cn('w-6 h-6 rounded-md flex items-center justify-center', 'transition-all duration-200', expandedId === todo.id
                                                    ? 'text-primary bg-primary/10'
                                                    : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-text-secondary hover:bg-white/[0.04]'), children: _jsx(ChevronDown, { className: cn('size-3 transition-transform duration-200', expandedId === todo.id && 'rotate-180') }) })), _jsx("button", { onClick: () => onDelete(todo.id), className: cn('w-6 h-6 rounded-md flex items-center justify-center', 'text-text-muted opacity-0 group-hover:opacity-100', 'hover:text-danger hover:bg-danger/10', 'transition-all duration-200'), children: _jsx(Trash2, { className: "size-3" }) })] })] }), _jsx(AnimatePresence, { children: expandedId === todo.id && onUpdate && (_jsx(motion.div, { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto' }, exit: { opacity: 0, height: 0 }, transition: { duration: 0.15 }, className: "overflow-hidden", children: _jsxs("div", { className: "px-3 pb-2.5 pt-1 flex flex-col gap-2 border-t border-white/[0.04]", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-[10px] text-text-muted w-14 shrink-0", children: "Deadline" }), _jsxs("div", { className: "flex items-center gap-1 flex-1", children: [!editDeadline && (_jsxs(_Fragment, { children: [[1, 2].map((h) => (_jsxs("button", { onClick: () => setDeadlinePreset(todo.id, h), className: cn('px-1.5 py-0.5 rounded text-[10px] text-text-muted', 'border border-white/10 hover:border-primary/40 hover:text-primary transition-colors'), children: [h, "h"] }, h))), _jsx("button", { onClick: () => handleDeadlineChange(todo.id, '17:00'), className: cn('px-1.5 py-0.5 rounded text-[10px] text-text-muted', 'border border-white/10 hover:border-primary/40 hover:text-primary transition-colors'), children: "5pm" })] })), _jsx("input", { type: "time", value: editDeadline, onChange: (e) => handleDeadlineChange(todo.id, e.target.value), className: cn('bg-transparent text-xs text-text-muted', 'border border-white/10 rounded px-2 py-0.5', 'focus:outline-none focus:border-primary/40', editDeadline ? 'text-text-primary' : '') }), editDeadline && (_jsx("button", { onClick: () => handleDeadlineChange(todo.id, ''), className: "text-text-muted hover:text-danger transition-colors", children: _jsx(X, { className: "size-3" }) }))] })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-[10px] text-text-muted w-14 shrink-0", children: "App" }), _jsx("div", { className: "flex items-center gap-1 flex-1", children: editApp ? (_jsxs("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] text-cyan-400 bg-cyan-400/10 border border-cyan-400/20", children: [editApp, _jsx("button", { onClick: () => handleAppChange(todo.id, ''), className: "hover:text-danger transition-colors", children: _jsx(X, { className: "size-2.5" }) })] })) : (_jsx(AppNameCombobox, { value: editApp, onChange: (v) => handleAppChange(todo.id, v), enableDropdown: enableAppDropdown, placeholder: "Set app...", className: "flex-1" })) })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-[10px] text-text-muted w-14 shrink-0", children: "URL" }), _jsx("div", { className: "flex items-center gap-1 flex-1", children: todo.url && !editUrl ? (_jsxs("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] text-orange-400 bg-orange-400/10 border border-orange-400/20", children: [todo.url, _jsx("button", { onClick: () => {
                                                                        setEditUrl('');
                                                                        onUpdate(todo.id, { url: undefined });
                                                                    }, className: "hover:text-danger transition-colors", children: _jsx(X, { className: "size-2.5" }) })] })) : (_jsx("input", { value: editUrl, onChange: (e) => handleUrlChange(todo.id, e.target.value), onBlur: () => handleUrlBlur(todo.id), onKeyDown: (e) => {
                                                                if (e.key === 'Enter')
                                                                    handleUrlBlur(todo.id);
                                                            }, placeholder: "Set URL...", className: cn('flex-1 bg-transparent text-[11px] text-text-muted', 'border-b border-white/10 focus:border-primary/40', 'placeholder:text-text-muted/50 focus:outline-none focus:text-text-primary', 'py-0.5') })) })] }), _jsxs("div", { className: "flex items-start gap-1.5", children: [_jsx("span", { className: "text-[10px] text-text-muted w-14 shrink-0 mt-1", children: "Focus" }), _jsxs("div", { className: "flex flex-wrap items-center gap-1 flex-1", children: [(todo.allowedApps ?? []).map((app) => (_jsxs("span", { className: cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full', 'text-[10px] font-medium bg-primary/15 text-primary'), children: [app, _jsx("button", { onClick: () => handleRemoveAllowedApp(todo.id, app, todo.allowedApps ?? []), className: "hover:text-danger transition-colors", children: _jsx(X, { className: "size-2" }) })] }, app))), _jsx("input", { value: newAllowedApp, onChange: (e) => setNewAllowedApp(e.target.value), onKeyDown: (e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        handleAddAllowedApp(todo.id, todo.allowedApps ?? []);
                                                                    }
                                                                }, placeholder: "+ app", className: cn('w-16 bg-transparent text-[10px] text-text-muted py-0.5', 'placeholder:text-text-muted/50 focus:outline-none focus:text-text-primary') })] })] })] }) })) })] }) }, todo.id))) }), showAddInput && (_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsxs("div", { className: cn('flex items-center gap-2 px-3 py-2 rounded-lg', 'bg-[var(--color-glass-well)] border border-white/[0.04]'), children: [_jsx(Plus, { className: "shrink-0 size-3.5 text-text-muted" }), _jsx("input", { value: newText, onChange: (e) => setNewText(e.target.value), onKeyDown: handleKeyDown, placeholder: "Add a task...", className: cn('flex-1 bg-transparent text-sm text-text-primary', 'placeholder:text-text-muted focus:outline-none') }), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { onClick: () => setShowExtraFields(!showExtraFields), className: cn('shrink-0 w-6 h-6 rounded-md flex items-center justify-center', 'transition-all duration-200', showExtraFields
                                                ? 'text-primary bg-primary/10'
                                                : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]'), children: _jsx(Link2, { className: "size-3.5" }) }) }), _jsx(TooltipContent, { children: "Link app & URL" })] }), newText.trim() && (_jsx("button", { onClick: handleAdd, className: "shrink-0 text-primary hover:text-primary-hover text-xs font-medium", children: "Add" }))] }), _jsx(AnimatePresence, { children: showExtraFields && (_jsxs(motion.div, { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto' }, exit: { opacity: 0, height: 0 }, transition: { duration: 0.15 }, className: "flex flex-col gap-1.5 overflow-hidden", children: [_jsx(AppNameCombobox, { value: newApp, onChange: setNewApp, enableDropdown: enableAppDropdown, placeholder: "App name (e.g. VS Code)" }), _jsx("input", { value: newUrl, onChange: (e) => setNewUrl(e.target.value), onKeyDown: handleKeyDown, placeholder: "URL (e.g. github.com)", className: cn('px-3 py-1.5 rounded-lg text-xs', 'bg-[var(--color-glass-well)] border border-white/[0.04]', 'text-text-primary placeholder:text-text-muted focus:outline-none') })] })) })] }))] }));
}
