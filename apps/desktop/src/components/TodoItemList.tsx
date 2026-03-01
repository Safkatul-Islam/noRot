import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Plus, Check, Link2, ChevronDown, X, Play, Hourglass, Flag, Pencil } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { AppNameCombobox } from '@/components/AppNameCombobox';
import { getNorotAPI } from '@/lib/norot-api';
import { cn } from '@/lib/utils';
import { formatDurationMinutes, formatTimeOfDay, getTimeZoneLabel, resolveTimeZone, type TimeFormat } from '@/lib/time-utils';
import type { TodoItem } from '@norot/shared';

interface TodoItemListProps {
  todos: TodoItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (text: string, app?: string, url?: string) => void;
  onUpdate?: (id: string, fields: Partial<Omit<TodoItem, 'id'>>) => void;
  showAddInput?: boolean;
  enableAppDropdown?: boolean;
  completingIds?: Set<string>;
}

export function TodoItemList({ todos, onToggle, onDelete, onAdd, onUpdate, showAddInput = true, enableAppDropdown = true, completingIds }: TodoItemListProps) {
  const [newText, setNewText] = useState('');
  const [showExtraFields, setShowExtraFields] = useState(false);
  const [newApp, setNewApp] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Detail editing state
  const [editApp, setEditApp] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editDurationText, setEditDurationText] = useState('');
  const [newAllowedApp, setNewAllowedApp] = useState('');

  const [timeFormat, setTimeFormat] = useState<TimeFormat>('12h');
  const [timeZoneLabel, setTimeZoneLabel] = useState('');

  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  useEffect(() => {
    let cancelled = false;
    getNorotAPI().getSettings()
      .then((settings) => {
        if (cancelled) return;
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

  const handleStartEdit = (todo: TodoItem) => {
    if (!onUpdate) return;
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const handleFinishEdit = (id: string) => {
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

  const handleToggleExpand = (todo: TodoItem) => {
    if (!onUpdate) return;
    if (expandedId === todo.id) {
      setExpandedId(null);
    } else {
      setExpandedId(todo.id);
      setEditApp(todo.app ?? '');
      setEditUrl(todo.url ?? '');
      setEditDeadline(todo.deadline ?? '');
      setEditStartTime(todo.startTime ?? '');
      setEditDurationText(typeof todo.durationMinutes === 'number' ? String(todo.durationMinutes) : '');
      setNewAllowedApp('');
    }
  };

  const handleDeadlineChange = (id: string, deadline: string) => {
    setEditDeadline(deadline);
    onUpdate?.(id, { deadline: deadline || undefined });
  };

  const setDeadlinePreset = (id: string, offsetHours: number) => {
    const d = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    handleDeadlineChange(id, `${hh}:${mm}`);
  };

  const handleStartTimeChange = (id: string, value: string) => {
    setEditStartTime(value);
    onUpdate?.(id, { startTime: value || undefined });
  };

  const setStartTimePreset = (id: string, offsetMinutes: number) => {
    const d = new Date(Date.now() + offsetMinutes * 60 * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    handleStartTimeChange(id, `${hh}:${mm}`);
  };

  const parseDurationText = (text: string): number | undefined => {
    const trimmed = text.trim();
    if (!trimmed) return undefined;
    // "1h 30m" or "1h30m"
    const hm = trimmed.match(/^(\d+)\s*h\s*(\d+)\s*m?$/i);
    if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2]);
    // "2h"
    const h = trimmed.match(/^(\d+)\s*h$/i);
    if (h) return parseInt(h[1]) * 60;
    // "45m"
    const m = trimmed.match(/^(\d+)\s*m$/i);
    if (m) return parseInt(m[1]);
    // plain number → minutes
    const n = parseInt(trimmed);
    if (!isNaN(n) && n > 0) return n;
    return undefined;
  };

  const handleDurationBlur = (id: string) => {
    const minutes = parseDurationText(editDurationText);
    if (minutes !== undefined) {
      setEditDurationText(String(minutes));
      onUpdate?.(id, { durationMinutes: minutes });
    } else if (!editDurationText.trim()) {
      onUpdate?.(id, { durationMinutes: undefined });
    }
  };

  const handleAppChange = (id: string, app: string) => {
    setEditApp(app);
    onUpdate?.(id, { app: app || undefined });
  };

  const handleUrlChange = (id: string, url: string) => {
    setEditUrl(url);
  };

  const handleUrlBlur = (id: string) => {
    const url = editUrl.trim();
    onUpdate?.(id, { url: url || undefined });
  };

  const handleRemoveAllowedApp = (id: string, appToRemove: string, currentAllowedApps: string[]) => {
    const updated = currentAllowedApps.filter((a) => a !== appToRemove);
    onUpdate?.(id, { allowedApps: updated.length > 0 ? updated : undefined });
  };

  const handleAddAllowedApp = (id: string, currentAllowedApps: string[]) => {
    const app = newAllowedApp.trim();
    if (!app || currentAllowedApps.includes(app)) return;
    onUpdate?.(id, { allowedApps: [...currentAllowedApps, app] });
    setNewAllowedApp('');
  };

  const formatTime = (hhmm: string): string => formatTimeOfDay(hhmm, timeFormat);

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
                'flex flex-col rounded-lg',
                'bg-[var(--color-glass-well)] border border-white/[0.05]',
                'transition-all duration-200',
                expandedId === todo.id && 'border-primary/20',
              )}
            >
              {/* Main row */}
              <div className="flex items-start gap-2.5 px-3 py-2">
                {/* Custom checkbox */}
                <button
                  onClick={() => onToggle(todo.id)}
                  className={cn(
                    'shrink-0 w-4 h-4 rounded-[4px] flex items-center justify-center mt-0.5',
                    'transition-all duration-200',
                    (todo.done || completingIds?.has(todo.id))
                      ? 'bg-success/20 border border-success/40'
                      : 'bg-[var(--color-glass-well)] border border-white/[0.1] hover:border-white/[0.2]',
                  )}
                  style={(todo.done || completingIds?.has(todo.id)) ? {
                    boxShadow: '0 0 8px var(--color-glow-success)',
                  } : undefined}
                >
                  {(todo.done || completingIds?.has(todo.id)) && <Check className="size-2.5 text-success" />}
                </button>

                {/* Text — click to edit */}
                <div className="flex-1 min-w-0">
                  {editingId === todo.id ? (
                    <input
                      ref={editInputRef}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => handleFinishEdit(todo.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishEdit(todo.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className={cn(
                        'w-full bg-transparent text-sm text-text-primary',
                        'border-b border-primary/40 focus:outline-none',
                      )}
                    />
                  ) : (
                    <div
                      onClick={() => handleStartEdit(todo)}
                      className={cn(
                        'group/text flex items-baseline gap-1',
                        onUpdate && 'cursor-text',
                      )}
                    >
                      <span
                        className={cn(
                          'text-sm leading-relaxed block truncate',
                          (todo.done || completingIds?.has(todo.id))
                            ? 'line-through text-text-muted opacity-60'
                            : 'text-text-primary',
                          onUpdate && 'group-hover/text:text-primary transition-colors',
                        )}
                      >
                        {todo.text}
                      </span>
                      {onUpdate && !todo.done && !completingIds?.has(todo.id) && (
                        <Pencil className="size-2.5 shrink-0 text-text-muted opacity-0 group-hover/text:opacity-60 transition-opacity" />
                      )}
                    </div>
                  )}
                    {(todo.app || todo.url || todo.deadline || todo.startTime || todo.durationMinutes) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
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
                      {todo.startTime && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md text-violet-400 bg-violet-400/10 border border-violet-400/20 flex items-center gap-0.5">
                          <Play className="size-2.5" />
                          {formatTime(todo.startTime)}
                          {timeZoneLabel ? ` ${timeZoneLabel}` : ''}
                        </span>
                      )}
                      {typeof todo.durationMinutes === 'number' && todo.durationMinutes > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md text-violet-400 bg-violet-400/10 border border-violet-400/20 flex items-center gap-0.5">
                          <Hourglass className="size-2.5" />
                          {formatDurationMinutes(todo.durationMinutes)}
                        </span>
                      )}
                      {todo.deadline && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md text-violet-400 bg-violet-400/10 border border-violet-400/20 flex items-center gap-0.5">
                          <Flag className="size-2.5" />
                          {formatTime(todo.deadline)}
                          {timeZoneLabel ? ` ${timeZoneLabel}` : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expand + Delete buttons */}
                <div className="shrink-0 flex items-center gap-0.5 mt-0.5">
                  {onUpdate && (
                    <button
                      onClick={() => handleToggleExpand(todo)}
                      className={cn(
                        'w-6 h-6 rounded-md flex items-center justify-center',
                        'transition-all duration-200',
                        expandedId === todo.id
                          ? 'text-primary bg-primary/10'
                          : 'text-text-muted opacity-30 group-hover:opacity-100 hover:text-text-secondary hover:bg-white/[0.04]',
                      )}
                    >
                      <ChevronDown
                        className={cn(
                          'size-3 transition-transform duration-200',
                          expandedId === todo.id && 'rotate-180',
                        )}
                      />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(todo.id)}
                    className={cn(
                      'w-6 h-6 rounded-md flex items-center justify-center',
                      'text-text-muted opacity-0 group-hover:opacity-100',
                      'hover:text-danger hover:bg-danger/10',
                      'transition-all duration-200',
                    )}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>

              {/* Expandable detail panel */}
              <AnimatePresence>
                {expandedId === todo.id && onUpdate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-2.5 pt-1 flex flex-col gap-2 border-t border-white/[0.04]">
                      {/* Deadline */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-muted w-14 shrink-0">Deadline</span>
                        <div className="flex items-center gap-1 flex-1">
                          {!editDeadline && (
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
                            value={editDeadline}
                            onChange={(e) => handleDeadlineChange(todo.id, e.target.value)}
                            className={cn(
                              'bg-transparent text-xs text-text-muted',
                              'border border-white/10 rounded px-2 py-0.5',
                              'focus:outline-none focus:border-primary/40',
                              editDeadline ? 'text-text-primary' : '',
                            )}
                          />
                          {editDeadline && (
                            <button
                              onClick={() => handleDeadlineChange(todo.id, '')}
                              className="text-text-muted hover:text-danger transition-colors"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Start Time */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-muted w-14 shrink-0">Start</span>
                        <div className="flex items-center gap-1 flex-1">
                          {!editStartTime && (
                            <>
                              <button
                                onClick={() => setStartTimePreset(todo.id, 0)}
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[10px] text-text-muted',
                                  'border border-white/10 hover:border-primary/40 hover:text-primary transition-colors',
                                )}
                              >
                                Now
                              </button>
                              {[30, 60].map((m) => (
                                <button
                                  key={m}
                                  onClick={() => setStartTimePreset(todo.id, m)}
                                  className={cn(
                                    'px-1.5 py-0.5 rounded text-[10px] text-text-muted',
                                    'border border-white/10 hover:border-primary/40 hover:text-primary transition-colors',
                                  )}
                                >
                                  +{m >= 60 ? `${m / 60}h` : `${m}m`}
                                </button>
                              ))}
                            </>
                          )}
                          <input
                            type="time"
                            value={editStartTime}
                            onChange={(e) => handleStartTimeChange(todo.id, e.target.value)}
                            className={cn(
                              'bg-transparent text-xs text-text-muted',
                              'border border-white/10 rounded px-2 py-0.5',
                              'focus:outline-none focus:border-primary/40',
                              editStartTime ? 'text-text-primary' : '',
                            )}
                          />
                          {editStartTime && (
                            <button
                              onClick={() => handleStartTimeChange(todo.id, '')}
                              className="text-text-muted hover:text-danger transition-colors"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-muted w-14 shrink-0">Duration</span>
                        <div className="flex items-center gap-1 flex-1">
                          {!editDurationText && (
                            <>
                              {[30, 60, 90].map((m) => (
                                <button
                                  key={m}
                                  onClick={() => {
                                    setEditDurationText(String(m));
                                    onUpdate?.(todo.id, { durationMinutes: m });
                                  }}
                                  className={cn(
                                    'px-1.5 py-0.5 rounded text-[10px] text-text-muted',
                                    'border border-white/10 hover:border-primary/40 hover:text-primary transition-colors',
                                  )}
                                >
                                  {formatDurationMinutes(m)}
                                </button>
                              ))}
                            </>
                          )}
                          <input
                            value={editDurationText}
                            onChange={(e) => setEditDurationText(e.target.value)}
                            onBlur={() => handleDurationBlur(todo.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleDurationBlur(todo.id);
                            }}
                            placeholder="min"
                            className={cn(
                              'w-16 bg-transparent text-xs text-text-muted',
                              'border border-white/10 rounded px-2 py-0.5',
                              'focus:outline-none focus:border-primary/40',
                              'placeholder:text-text-muted/50',
                              editDurationText ? 'text-text-primary' : '',
                            )}
                          />
                          {editDurationText && (
                            <button
                              onClick={() => {
                                setEditDurationText('');
                                onUpdate?.(todo.id, { durationMinutes: undefined });
                              }}
                              className="text-text-muted hover:text-danger transition-colors"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* App */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-muted w-14 shrink-0">App</span>
                        <div className="flex items-center gap-1 flex-1">
                          {editApp ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] text-cyan-400 bg-cyan-400/10 border border-cyan-400/20">
                              {editApp}
                              <button
                                onClick={() => handleAppChange(todo.id, '')}
                                className="hover:text-danger transition-colors"
                              >
                                <X className="size-2.5" />
                              </button>
                            </span>
                          ) : (
                            <AppNameCombobox
                              value={editApp}
                              onChange={(v) => handleAppChange(todo.id, v)}
                              enableDropdown={enableAppDropdown}
                              placeholder="Set app..."
                              className="flex-1"
                            />
                          )}
                        </div>
                      </div>

                      {/* URL */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-muted w-14 shrink-0">URL</span>
                        <div className="flex items-center gap-1 flex-1">
                          {todo.url && !editUrl ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] text-orange-400 bg-orange-400/10 border border-orange-400/20">
                              {todo.url}
                              <button
                                onClick={() => {
                                  setEditUrl('');
                                  onUpdate(todo.id, { url: undefined });
                                }}
                                className="hover:text-danger transition-colors"
                              >
                                <X className="size-2.5" />
                              </button>
                            </span>
                          ) : (
                            <input
                              value={editUrl}
                              onChange={(e) => handleUrlChange(todo.id, e.target.value)}
                              onBlur={() => handleUrlBlur(todo.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUrlBlur(todo.id);
                              }}
                              placeholder="Set URL..."
                              className={cn(
                                'flex-1 bg-transparent text-[11px] text-text-muted',
                                'border-b border-white/10 focus:border-primary/40',
                                'placeholder:text-text-muted/50 focus:outline-none focus:text-text-primary',
                                'py-0.5',
                              )}
                            />
                          )}
                        </div>
                      </div>

                      {/* Allowed Apps */}
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] text-text-muted w-14 shrink-0 mt-1">Focus</span>
                        <div className="flex flex-wrap items-center gap-1 flex-1">
                          {(todo.allowedApps ?? []).map((app) => (
                            <span
                              key={app}
                              className={cn(
                                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full',
                                'text-[10px] font-medium bg-primary/15 text-primary',
                              )}
                            >
                              {app}
                              <button
                                onClick={() => handleRemoveAllowedApp(todo.id, app, todo.allowedApps ?? [])}
                                className="hover:text-danger transition-colors"
                              >
                                <X className="size-2" />
                              </button>
                            </span>
                          ))}
                          <input
                            value={newAllowedApp}
                            onChange={(e) => setNewAllowedApp(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddAllowedApp(todo.id, todo.allowedApps ?? []);
                              }
                            }}
                            placeholder="+ app"
                            className={cn(
                              'w-16 bg-transparent text-[10px] text-text-muted py-0.5',
                              'placeholder:text-text-muted/50 focus:outline-none focus:text-text-primary',
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowExtraFields(!showExtraFields)}
                  className={cn(
                    'shrink-0 w-6 h-6 rounded-md flex items-center justify-center',
                    'transition-all duration-200',
                    showExtraFields
                      ? 'text-primary bg-primary/10'
                      : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]',
                  )}
                >
                  <Link2 className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Link app &amp; URL</TooltipContent>
            </Tooltip>
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
                <AppNameCombobox
                  value={newApp}
                  onChange={setNewApp}
                  enableDropdown={enableAppDropdown}
                  placeholder="App name (e.g. VS Code)"
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
