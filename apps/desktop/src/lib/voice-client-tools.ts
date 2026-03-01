import type { TodoItem } from '@norot/shared';
import type { TodoToolBackend } from '@/lib/todo-tool-backend';
import { getNorotAPI } from '@/lib/norot-api';
import { formatDurationMinutes, formatTimeOfDay, getTimeZoneLabel, hhmmToMinutes, minutesToHHMM, normalizeTimeInput, resolveOffsetToHHMM, resolveTimeZone } from '@/lib/time-utils';

async function maybeTitleizeTexts(texts: string[]): Promise<string[]> {
  const api = getNorotAPI();
  if (!api || typeof api.titleizeTodos !== 'function') return texts;
  try {
    const out = await api.titleizeTodos(texts);
    if (!Array.isArray(out) || out.length !== texts.length) return texts;
    return out.map((t, i) => {
      const next = typeof t === 'string' ? t.trim() : '';
      return next ? next : texts[i]!;
    });
  } catch {
    return texts;
  }
}

/**
 * Fuzzy-match a todo by text. Tries (in order):
 * 1. Exact match (case-insensitive)
 * 2. Starts-with
 * 3. Contains
 * 4. Reverse-contains (todo text contains the search string)
 */
export function findTodoByText(todos: TodoItem[], searchText: string): TodoItem | undefined {
  const needle = searchText.toLowerCase().trim();
  if (!needle) return undefined;

  // Exact match
  const exact = todos.find((t) => t.text.toLowerCase() === needle);
  if (exact) return exact;

  // Starts-with
  const startsWith = todos.find((t) => t.text.toLowerCase().startsWith(needle));
  if (startsWith) return startsWith;

  // Contains (needle in todo text)
  const contains = todos.find((t) => t.text.toLowerCase().includes(needle));
  if (contains) return contains;

  // Reverse-contains (todo text in needle)
  const reverseContains = todos.find((t) => needle.includes(t.text.toLowerCase()));
  if (reverseContains) return reverseContains;

  // Token overlap fallback (handles long user phrases vs short task titles)
  const STOPWORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'at',
    'my', 'your', 'our', 'their', 'this', 'that', 'then',
    'do', 'doing', 'finish', 'start', 'work', 'task',
    'homework', 'assignment', 'reading',
  ]);
  const tokenize = (s: string): string[] =>
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter(Boolean)
      .filter((w) => !STOPWORDS.has(w));

  const needleTokens = tokenize(needle);
  if (needleTokens.length === 0) return undefined;

  const needleSet = new Set(needleTokens);
  let best: { todo: TodoItem; score: number; overlap: number } | null = null;
  let tied = false;
  for (const t of todos) {
    const tt = tokenize(t.text);
    if (tt.length === 0) continue;
    let overlap = 0;
    for (const w of tt) {
      if (needleSet.has(w)) overlap++;
    }
    if (overlap === 0) continue;
    const score = overlap / Math.max(tt.length, needleTokens.length);
    if (!best || score > best.score) {
      best = { todo: t, score, overlap };
      tied = false;
    } else if (best && score === best.score) {
      tied = true;
    }
  }
  if (!best || tied) return undefined;
  if (best.overlap < 1 || best.score < 0.5) return undefined;
  return best.todo;

  return undefined;
}

export function createTodoClientTools(backend: TodoToolBackend) {
  return {
    add_todo: async (params: {
      text?: string;
      duration_minutes?: number;
      start_time?: string;
      deadline?: string;
      start_offset_minutes?: number;
      deadline_offset_minutes?: number;
      app?: string;
      url?: string;
      allowed_apps?: string[];
    }) => {
      try {
        const text = params.text?.trim();
        if (!text) return 'No task text provided. Ask the user what the task is.';

        const { timeZone, timeFormat } = await backend.getSettings();
        const tz = resolveTimeZone(timeZone);
        const tf = timeFormat === '24h' ? '24h' : '12h';

        let startTime =
          (params.start_time ? normalizeTimeInput(params.start_time, tz) : undefined) ??
          resolveOffsetToHHMM(params.start_offset_minutes, tz, { allowZero: true });

        let deadline =
          (params.deadline ? normalizeTimeInput(params.deadline, tz) : undefined) ??
          resolveOffsetToHHMM(params.deadline_offset_minutes, tz);

        if (params.start_time && !normalizeTimeInput(params.start_time, tz) && startTime) {
          console.warn(`[voice-tools] start_time string parse failed for "${params.start_time}", used offset fallback`);
        }
        if (params.deadline && !normalizeTimeInput(params.deadline, tz) && deadline) {
          console.warn(`[voice-tools] deadline string parse failed for "${params.deadline}", used offset fallback`);
        }

        let durationMinutes =
          typeof params.duration_minutes === 'number' && Number.isFinite(params.duration_minutes) && params.duration_minutes > 0
            ? Math.trunc(params.duration_minutes)
            : undefined;

        // Infer deadline from start + duration
        if (!deadline && startTime && durationMinutes) {
          const startMins = hhmmToMinutes(startTime);
          if (startMins != null) deadline = minutesToHHMM(startMins + durationMinutes);
        }

        // Infer duration from start + deadline
        if (!durationMinutes && startTime && deadline) {
          const startMins = hhmmToMinutes(startTime);
          const deadlineMins = hhmmToMinutes(deadline);
          if (startMins != null && deadlineMins != null) {
            const rawDiff = deadlineMins - startMins;
            const diff = rawDiff >= 0 ? rawDiff : rawDiff + 24 * 60;
            if (diff >= 5 && diff <= 24 * 60) durationMinutes = diff;
          }
        }

        // Infer start from deadline + duration
        if (!startTime && deadline && durationMinutes) {
          const deadlineMins = hhmmToMinutes(deadline);
          if (deadlineMins != null) startTime = minutesToHHMM(deadlineMins - durationMinutes);
        }

        // Validation (after inference)
        if (!startTime && !deadline) {
          return 'Missing start time and deadline. Ask the user when this task starts and its deadline.';
        }
        if (!startTime) {
          return 'Missing start time. Ask the user when this task starts (so we have both start time and deadline).';
        }
        if (!deadline) {
          return 'Missing deadline. Ask the user when this task ends (so we have both start time and deadline).';
        }

        const existingTodos = await backend.getTodos();
        const maxOrder = existingTodos.reduce((max, t) => Math.max(max, t.order), -1);

        const app = typeof params.app === 'string' ? params.app.trim() : '';
        const url = typeof params.url === 'string' ? params.url.trim() : '';

        const [finalText] = await maybeTitleizeTexts([text]);

        const newItem: TodoItem = {
          id: crypto.randomUUID(),
          text: finalText ?? text,
          done: false,
          order: maxOrder + 1,
          ...(startTime != null && { startTime }),
          ...(deadline != null && { deadline }),
          ...(durationMinutes != null && { durationMinutes }),
          ...(app && { app }),
          ...(url && { url }),
          ...(Array.isArray(params.allowed_apps) && params.allowed_apps.length > 0 && { allowedApps: params.allowed_apps }),
        };

        await backend.addTodo(newItem);

        // Build confirmation string
        const parts: string[] = [`Added task: "${newItem.text}"`];
        if (durationMinutes) parts.push(`(${formatDurationMinutes(durationMinutes)})`);
        if (startTime) parts.push(`(start ${formatTimeOfDay(startTime, tf)})`);
        if (deadline) parts.push(`(due ${formatTimeOfDay(deadline, tf)})`);
        if (app) parts.push(`[${app}]`);
        return parts.join(' ');
      } catch (err) {
        console.error('[voice-tools] add_todo error:', err);
        return 'Failed to add the task. Please try again.';
      }
    },

    add_todos: async (params: {
      defaults?: {
        duration_minutes?: number;
        start_time?: string;
        deadline?: string;
        start_offset_minutes?: number;
        deadline_offset_minutes?: number;
      };
      tasks?: Array<{
        text?: string;
        duration_minutes?: number;
        start_time?: string;
        deadline?: string;
        start_offset_minutes?: number;
        deadline_offset_minutes?: number;
        app?: string;
        url?: string;
        allowed_apps?: string[];
      }>;
    }) => {
      try {
        const tasks = Array.isArray(params?.tasks) ? params.tasks : [];
        if (tasks.length === 0) return 'No tasks provided. Ask the user what tasks to add.';
        if (tasks.length > 20) return 'Too many tasks at once. Ask the user to do fewer than 20.';

        const defaults =
          params?.defaults && typeof params.defaults === 'object' && !Array.isArray(params.defaults)
            ? params.defaults
            : undefined;

        const { timeZone, timeFormat } = await backend.getSettings();
        const tz = resolveTimeZone(timeZone);
        const tf = timeFormat === '24h' ? '24h' : '12h';

        // Resolve "now" once so offsets are consistent across all tasks.
        const nowHHMM = normalizeTimeInput('now', tz);
        const nowMins = nowHHMM ? hhmmToMinutes(nowHHMM) : null;

        const resolveOffsetWithNow = (offsetMinutes: unknown, opts?: { allowZero?: boolean }): string | null => {
          if (nowMins == null) return null;
          if (typeof offsetMinutes !== 'number' || !Number.isFinite(offsetMinutes)) return null;
          const n = Math.round(offsetMinutes);
          if (opts?.allowZero ? n < 0 : n <= 0) return null;
          if (n > 24 * 60) return null;
          return minutesToHHMM(nowMins + n);
        };

        const existingTodos = await backend.getTodos();
        const maxOrder = existingTodos.reduce((max, t) => Math.max(max, t.order), -1);

        const built: Array<{ item: TodoItem; startTime: string; deadline: string; durationMinutes?: number }> = [];
        const missingTiming: string[] = [];
        const missingTextIdx: number[] = [];

        for (let i = 0; i < tasks.length; i++) {
          const raw = tasks[i] ?? {};
          const merged = {
            ...(defaults ?? {}),
            ...raw,
          } as {
            text?: string;
            duration_minutes?: number;
            start_time?: string;
            deadline?: string;
            start_offset_minutes?: number;
            deadline_offset_minutes?: number;
            app?: string;
            url?: string;
            allowed_apps?: string[];
          };

          const text = typeof merged.text === 'string' ? merged.text.trim() : '';
          if (!text) {
            missingTextIdx.push(i + 1);
            continue;
          }

          const startFromString = merged.start_time ? normalizeTimeInput(merged.start_time, tz) : undefined;
          const startTime =
            startFromString ??
            resolveOffsetWithNow(merged.start_offset_minutes, { allowZero: true });

          const deadlineFromString = merged.deadline ? normalizeTimeInput(merged.deadline, tz) : undefined;
          let deadline =
            deadlineFromString ??
            resolveOffsetWithNow(merged.deadline_offset_minutes);

          if (merged.start_time && !startFromString && startTime) {
            console.warn(`[voice-tools] start_time string parse failed for "${merged.start_time}", used offset fallback`);
          }
          if (merged.deadline && !deadlineFromString && deadline) {
            console.warn(`[voice-tools] deadline string parse failed for "${merged.deadline}", used offset fallback`);
          }

          let durationMinutes =
            typeof merged.duration_minutes === 'number' &&
            Number.isFinite(merged.duration_minutes) &&
            merged.duration_minutes > 0
              ? Math.trunc(merged.duration_minutes)
              : undefined;

          // Infer deadline from start + duration
          if (!deadline && startTime && durationMinutes) {
            const startMins = hhmmToMinutes(startTime);
            if (startMins != null) deadline = minutesToHHMM(startMins + durationMinutes);
          }

          // Infer duration from start + deadline
          if (!durationMinutes && startTime && deadline) {
            const startMins = hhmmToMinutes(startTime);
            const deadlineMins = hhmmToMinutes(deadline);
            if (startMins != null && deadlineMins != null) {
              const rawDiff = deadlineMins - startMins;
              const diff = rawDiff >= 0 ? rawDiff : rawDiff + 24 * 60;
              if (diff >= 5 && diff <= 24 * 60) durationMinutes = diff;
            }
          }

          // Infer start from deadline + duration
          let finalStartTime = startTime;
          if (!finalStartTime && deadline && durationMinutes) {
            const deadlineMins = hhmmToMinutes(deadline);
            if (deadlineMins != null) finalStartTime = minutesToHHMM(deadlineMins - durationMinutes);
          }

          // Validation (after inference)
          if (!finalStartTime || !deadline) {
            missingTiming.push(text);
            continue;
          }

          const app = typeof merged.app === 'string' ? merged.app.trim() : '';
          const url = typeof merged.url === 'string' ? merged.url.trim() : '';

          const item: TodoItem = {
            id: crypto.randomUUID(),
            text,
            done: false,
            order: maxOrder + 1 + built.length,
            ...(finalStartTime != null && { startTime: finalStartTime }),
            ...(deadline != null && { deadline }),
            ...(durationMinutes != null && { durationMinutes }),
            ...(app && { app }),
            ...(url && { url }),
            ...(Array.isArray(merged.allowed_apps) && merged.allowed_apps.length > 0 && { allowedApps: merged.allowed_apps }),
          };

          built.push({ item, startTime: finalStartTime, deadline, durationMinutes });
        }

        if (missingTextIdx.length > 0) {
          return `Some tasks are missing text (items ${missingTextIdx.join(', ')}). Ask the user to repeat the task names.`;
        }

        if (missingTiming.length > 0) {
          const names = missingTiming.slice(0, 8).map((t) => `"${t}"`).join(', ');
          const more = missingTiming.length > 8 ? ` (+${missingTiming.length - 8} more)` : '';
          return `Missing timing for: ${names}${more}. When do these start and when do they end (or what's the duration for each)?`;
        }

        // All tasks validated — optionally titleize (Gemini) before adding
        const titled = await maybeTitleizeTexts(built.map((b) => b.item.text));
        for (let i = 0; i < built.length; i++) {
          const next = titled[i];
          if (typeof next === 'string' && next.trim()) {
            built[i]!.item.text = next.trim();
          }
        }

        // All tasks validated — add them
        for (const b of built) {
          await backend.addTodo(b.item);
        }

        const count = built.length;
        const taskNames = built.map((b) => b.item.text);

        const allSameStart = built.every((b) => b.startTime === built[0]!.startTime);
        const allSameDeadline = built.every((b) => b.deadline === built[0]!.deadline);
        const allSameDuration = built.every((b) => b.durationMinutes === built[0]!.durationMinutes);

        const parts: string[] = [`Added ${count} tasks`];
        if (allSameDuration && built[0]!.durationMinutes) parts.push(`(${formatDurationMinutes(built[0]!.durationMinutes)} each)`);
        if (allSameStart) parts.push(`(start ${formatTimeOfDay(built[0]!.startTime, tf)})`);
        if (allSameDeadline) parts.push(`(due ${formatTimeOfDay(built[0]!.deadline, tf)})`);
        parts.push(`: ${taskNames.join('; ')}`);
        return parts.join(' ');
      } catch (err) {
        console.error('[voice-tools] add_todos error:', err);
        return 'Failed to add the tasks. Please try again.';
      }
    },

    update_todos: async (params: {
      updates?: Array<{
        todo_text?: string;
        new_text?: string;
        deadline?: string;
        start_time?: string;
        duration_minutes?: number;
        start_offset_minutes?: number;
        deadline_offset_minutes?: number;
        app?: string;
        url?: string;
        order?: number;
        allowed_apps?: string[];
      }>;
    }) => {
      try {
        const updates = Array.isArray(params?.updates) ? params.updates : [];
        if (updates.length === 0) return 'No updates provided. Ask the user what tasks to modify.';
        if (updates.length > 30) return 'Too many updates at once. Ask the user to do fewer than 30.';

        const todos = await backend.getTodos();
        const { timeZone, timeFormat } = await backend.getSettings();
        const tz = resolveTimeZone(timeZone);
        const tf = timeFormat === '24h' ? '24h' : '12h';

        // Resolve "now" once so offsets are consistent across all updates.
        const nowHHMM = normalizeTimeInput('now', tz);
        const nowMins = nowHHMM ? hhmmToMinutes(nowHHMM) : null;

        const resolveOffsetWithNow = (offsetMinutes: unknown, opts?: { allowZero?: boolean }): string | null => {
          if (nowMins == null) return null;
          if (typeof offsetMinutes !== 'number' || !Number.isFinite(offsetMinutes)) return null;
          const n = Math.round(offsetMinutes);
          if (opts?.allowZero ? n < 0 : n <= 0) return null;
          if (n > 24 * 60) return null;
          return minutesToHHMM(nowMins + n);
        };

        const ops: Array<{ todo: TodoItem; fields: Partial<Omit<TodoItem, 'id'>>; label: string }> = [];
        const missing: string[] = [];
        const duplicates: string[] = [];
        const seenIds = new Set<string>();

        for (const u of updates) {
          const label = typeof u?.todo_text === 'string' ? u.todo_text.trim() : '';
          if (!label) {
            missing.push('(missing task name)');
            continue;
          }

          const todo = findTodoByText(todos, label);
          if (!todo) {
            missing.push(label);
            continue;
          }
          if (seenIds.has(todo.id)) {
            duplicates.push(label);
            continue;
          }
          seenIds.add(todo.id);

          const fields: Partial<Omit<TodoItem, 'id'>> = {};

          if (typeof u.new_text === 'string') {
            const next = u.new_text.trim();
            if (next) fields.text = next;
          }

          if (typeof u.order === 'number' && Number.isFinite(u.order)) {
            fields.order = Math.trunc(u.order);
          }

          if (u.deadline || u.deadline_offset_minutes != null) {
            const normalized =
              (u.deadline ? normalizeTimeInput(u.deadline, tz) : undefined) ??
              resolveOffsetWithNow(u.deadline_offset_minutes);
            if (normalized) fields.deadline = normalized;
          }

          if (u.start_time || u.start_offset_minutes != null) {
            const normalized =
              (u.start_time ? normalizeTimeInput(u.start_time, tz) : undefined) ??
              resolveOffsetWithNow(u.start_offset_minutes, { allowZero: true });
            if (normalized) fields.startTime = normalized;
          }

          if (typeof u.duration_minutes === 'number' && Number.isFinite(u.duration_minutes) && u.duration_minutes > 0) {
            fields.durationMinutes = Math.trunc(u.duration_minutes);
          }

          if (typeof u.app === 'string') {
            const app = u.app.trim();
            if (app) fields.app = app;
          }

          if (typeof u.url === 'string') {
            const url = u.url.trim();
            if (url) fields.url = url;
          }

          if (Array.isArray(u.allowed_apps) && u.allowed_apps.length > 0) {
            fields.allowedApps = u.allowed_apps;
          }

          if (Object.keys(fields).length === 0) {
            return `No changes provided for "${todo.text}". Ask the user what should change.`;
          }

          ops.push({ todo, fields, label });
        }

        if (missing.length > 0) {
          const names = missing.slice(0, 8).map((t) => `"${t}"`).join(', ');
          const more = missing.length > 8 ? ` (+${missing.length - 8} more)` : '';
          return `Could not find these tasks to update: ${names}${more}.`;
        }

        if (duplicates.length > 0) {
          const names = duplicates.slice(0, 8).map((t) => `"${t}"`).join(', ');
          const more = duplicates.length > 8 ? ` (+${duplicates.length - 8} more)` : '';
          return `Ambiguous updates (duplicate matches) for: ${names}${more}. Ask the user to clarify the exact task names.`;
        }

        // Apply updates
        for (const op of ops) {
          // Infer duration if missing but we have both start+deadline.
          if (op.fields.durationMinutes == null && typeof op.fields.startTime === 'string' && typeof op.fields.deadline === 'string') {
            const startMins = hhmmToMinutes(op.fields.startTime);
            const deadlineMins = hhmmToMinutes(op.fields.deadline);
            if (startMins != null && deadlineMins != null) {
              const rawDiff = deadlineMins - startMins;
              const diff = rawDiff >= 0 ? rawDiff : rawDiff + 24 * 60;
              if (diff >= 5 && diff <= 24 * 60) {
                op.fields.durationMinutes = diff;
              }
            }
          }

          await backend.updateTodo(op.todo.id, op.fields);
        }

        if (ops.length === 1) {
          const only = ops[0]!;
          const parts: string[] = [`Updated task: "${only.fields.text ?? only.todo.text}"`];
          if (only.fields.durationMinutes) parts.push(`(${formatDurationMinutes(only.fields.durationMinutes)})`);
          if (typeof only.fields.startTime === 'string') parts.push(`(start ${formatTimeOfDay(only.fields.startTime, tf)})`);
          if (typeof only.fields.deadline === 'string') parts.push(`(due ${formatTimeOfDay(only.fields.deadline, tf)})`);
          return parts.join(' ');
        }

        const changedNames = ops.map((o) => o.todo.text).slice(0, 8).join('; ');
        const more = ops.length > 8 ? ` (+${ops.length - 8} more)` : '';
        return `Updated ${ops.length} tasks: ${changedNames}${more}`;
      } catch (err) {
        console.error('[voice-tools] update_todos error:', err);
        return 'Failed to update the tasks. Please try again.';
      }
    },

    sequence_todos: async (params: {
      todo_texts?: string[];
      duration_minutes?: number;
      start_time?: string;
      start_offset_minutes?: number;
      reorder_list?: boolean;
    }) => {
      try {
        const todoTexts = Array.isArray(params?.todo_texts)
          ? params.todo_texts.map((t) => (typeof t === 'string' ? t.trim() : '')).filter(Boolean)
          : [];
        if (todoTexts.length === 0) return 'No tasks provided to sequence. Ask the user which tasks and the order.';
        if (todoTexts.length > 20) return 'Too many tasks to sequence at once. Ask the user to do fewer than 20.';

        const duration =
          typeof params?.duration_minutes === 'number' && Number.isFinite(params.duration_minutes) && params.duration_minutes > 0
            ? Math.trunc(params.duration_minutes)
            : null;
        if (!duration) return 'Missing duration. Ask the user how long each block should be.';

        const todos = await backend.getTodos();
        const { timeZone, timeFormat } = await backend.getSettings();
        const tz = resolveTimeZone(timeZone);
        const tf = timeFormat === '24h' ? '24h' : '12h';

        // Resolve "now" once so offsets are consistent.
        const nowHHMM = normalizeTimeInput('now', tz);
        const nowMins = nowHHMM ? hhmmToMinutes(nowHHMM) : null;
        if (nowMins == null) return 'Could not determine the current time. Please try again.';

        let baseStartMins: number | null = null;
        if (typeof params?.start_time === 'string' && params.start_time.trim()) {
          const normalized = normalizeTimeInput(params.start_time, tz);
          const mins = normalized ? hhmmToMinutes(normalized) : null;
          if (mins == null) return 'Invalid start time. Ask the user when to start the first task.';
          baseStartMins = mins;
        } else if (typeof params?.start_offset_minutes === 'number' && Number.isFinite(params.start_offset_minutes)) {
          const n = Math.round(params.start_offset_minutes);
          if (n < 0 || n > 24 * 60) return 'Invalid start offset. Ask the user when to start.';
          baseStartMins = nowMins + n;
        } else {
          baseStartMins = nowMins;
        }

        const selected: TodoItem[] = [];
        const missing: string[] = [];
        const duplicates: string[] = [];
        const seenIds = new Set<string>();

        for (const label of todoTexts) {
          const todo = findTodoByText(todos, label);
          if (!todo) {
            missing.push(label);
            continue;
          }
          if (seenIds.has(todo.id)) {
            duplicates.push(label);
            continue;
          }
          seenIds.add(todo.id);
          selected.push(todo);
        }

        if (missing.length > 0) {
          const names = missing.slice(0, 8).map((t) => `"${t}"`).join(', ');
          const more = missing.length > 8 ? ` (+${missing.length - 8} more)` : '';
          return `Could not find these tasks to sequence: ${names}${more}.`;
        }

        if (duplicates.length > 0) {
          const names = duplicates.slice(0, 8).map((t) => `"${t}"`).join(', ');
          const more = duplicates.length > 8 ? ` (+${duplicates.length - 8} more)` : '';
          return `Ambiguous sequencing (duplicate matches) for: ${names}${more}. Ask the user to clarify the exact task names.`;
        }

        // Update timing sequentially
        for (let i = 0; i < selected.length; i++) {
          const todo = selected[i]!;
          const startTime = minutesToHHMM(baseStartMins + i * duration);
          const deadline = minutesToHHMM(baseStartMins + (i + 1) * duration);
          await backend.updateTodo(todo.id, {
            startTime,
            deadline,
            durationMinutes: duration,
          });
        }

        const reorderList = params?.reorder_list !== false;
        if (reorderList) {
          // Reorder the entire list so these tasks appear in the requested sequence.
          const byOrder = [...todos].sort((a, b) => (a.order - b.order) || a.text.localeCompare(b.text));
          const selectedSet = new Set(selected.map((t) => t.id));
          const minSelectedIdx = byOrder.reduce((min, t, idx) => (selectedSet.has(t.id) ? Math.min(min, idx) : min), Infinity);
          const insertIdx = Number.isFinite(minSelectedIdx) ? minSelectedIdx : 0;
          const remaining = byOrder.filter((t) => !selectedSet.has(t.id));
          const finalList = [
            ...remaining.slice(0, insertIdx),
            ...selected,
            ...remaining.slice(insertIdx),
          ];

          // Assign unique orders 0..N-1
          for (let i = 0; i < finalList.length; i++) {
            const t = finalList[i]!;
            if (t.order !== i) {
              await backend.updateTodo(t.id, { order: i });
            }
          }
        }

        const startLabel = minutesToHHMM(baseStartMins);
        const endLabel = minutesToHHMM(baseStartMins + selected.length * duration);
        const chain = selected.map((t) => t.text).join(' -> ');
        return `Sequenced ${selected.length} tasks (${formatDurationMinutes(duration)} each) ${formatTimeOfDay(startLabel, tf)}-${formatTimeOfDay(endLabel, tf)}: ${chain}`;
      } catch (err) {
        console.error('[voice-tools] sequence_todos error:', err);
        return 'Failed to sequence the tasks. Please try again.';
      }
    },

    list_todos: async (params: { include_done?: boolean; limit?: number } = {}) => {
      try {
        const todos = await backend.getTodos();
        const { timeFormat, timeZone } = await backend.getSettings();
        const tf = timeFormat === '24h' ? '24h' : '12h';
        const tzLabel = timeZone !== 'system'
          ? getTimeZoneLabel(resolveTimeZone(timeZone))
          : '';

        const includeDone = params.include_done === true;
        const filtered = includeDone ? todos : todos.filter((t) => !t.done);

        const limit =
          typeof params.limit === 'number' && Number.isFinite(params.limit)
            ? Math.max(1, Math.min(50, Math.trunc(params.limit)))
            : 50;

        const items = filtered.slice(0, limit);
        if (items.length === 0) return 'No tasks found.';

        return items
          .map((t, i) => {
            const parts: string[] = [`${i + 1}. ${t.text}`];
            if (t.startTime) {
              parts.push(`(start ${formatTimeOfDay(t.startTime, tf)}${tzLabel ? ` ${tzLabel}` : ''})`);
            }
            if (typeof t.durationMinutes === 'number' && t.durationMinutes > 0) {
              parts.push(`(duration ${formatDurationMinutes(t.durationMinutes)})`);
            }
            if (t.deadline) {
              parts.push(`(due ${formatTimeOfDay(t.deadline, tf)}${tzLabel ? ` ${tzLabel}` : ''})`);
            }
            if (t.app) parts.push(`[app: ${t.app}]`);
            if (t.done) parts.push('[done]');
            return parts.join(' ');
          })
          .join('\n');
      } catch (err) {
        console.error('[voice-tools] list_todos error:', err);
        return 'Failed to list tasks. Please try again.';
      }
    },
    update_todo: async (params: {
      todo_text?: string;
      new_text?: string;
      deadline?: string;
      app?: string;
      start_time?: string;
      duration_minutes?: number;
      start_offset_minutes?: number;
      deadline_offset_minutes?: number;
      url?: string;
      allowed_apps?: string[];
    }) => {
      try {
        const todos = await backend.getTodos();
        const todo = findTodoByText(todos, params.todo_text ?? '');
        if (!todo) return 'Could not find a matching task. Ask the user to clarify which task.';

        const { timeZone } = await backend.getSettings();
        const tz = resolveTimeZone(timeZone);

        const fields: Partial<Omit<TodoItem, 'id'>> = {};
        if (params.new_text) {
          const next = params.new_text.trim();
          if (next) fields.text = next;
        }
        if (params.deadline || params.deadline_offset_minutes != null) {
          const normalized =
            (params.deadline ? normalizeTimeInput(params.deadline, tz) : undefined) ??
            resolveOffsetToHHMM(params.deadline_offset_minutes, tz);
          if (normalized) fields.deadline = normalized;
          if (params.deadline && !normalizeTimeInput(params.deadline, tz) && normalized) {
            console.warn(`[voice-tools] deadline string parse failed for "${params.deadline}", used offset fallback`);
          }
        }
        if (params.start_time || params.start_offset_minutes != null) {
          const normalized =
            (params.start_time ? normalizeTimeInput(params.start_time, tz) : undefined) ??
            resolveOffsetToHHMM(params.start_offset_minutes, tz, { allowZero: true });
          if (normalized) fields.startTime = normalized;
          if (params.start_time && !normalizeTimeInput(params.start_time, tz) && normalized) {
            console.warn(`[voice-tools] start_time string parse failed for "${params.start_time}", used offset fallback`);
          }
        }
        if (typeof params.duration_minutes === 'number' && Number.isFinite(params.duration_minutes) && params.duration_minutes > 0) {
          fields.durationMinutes = Math.trunc(params.duration_minutes);
        }
        if (params.app) {
          const app = params.app.trim();
          if (app) fields.app = app;
        }
        if (params.url) {
          const url = params.url.trim();
          if (url) fields.url = url;
        }
        if (Array.isArray(params.allowed_apps) && params.allowed_apps.length > 0) {
          fields.allowedApps = params.allowed_apps;
        }

        await backend.updateTodo(todo.id, fields);
        return `Updated task: "${fields.text ?? todo.text}"`;
      } catch (err) {
        console.error('[voice-tools] update_todo error:', err);
        return 'Failed to update the task. Please try again.';
      }
    },
    delete_todo: async (params: { todo_text?: string }) => {
      try {
        const todos = await backend.getTodos();
        const todo = findTodoByText(todos, params.todo_text ?? '');
        if (!todo) return 'Could not find a matching task. Ask the user to clarify which task.';

        await backend.deleteTodo(todo.id);
        return `Deleted task: "${todo.text}"`;
      } catch (err) {
        console.error('[voice-tools] delete_todo error:', err);
        return 'Failed to delete the task. Please try again.';
      }
    },
    toggle_todo: async (params: { todo_text?: string }) => {
      try {
        const todos = await backend.getTodos();
        const todo = findTodoByText(todos, params.todo_text ?? '');
        if (!todo) return 'Could not find a matching task. Ask the user to clarify which task.';

        if (todo.done) {
          // Unchecking — use toggleTodo to flip back
          await backend.toggleTodo(todo.id);
          return `Unmarked task as not done: "${todo.text}"`;
        } else {
          // Marking done — use completeTodo (immediate, no 3s delay)
          await backend.completeTodo(todo.id);
          return `Completed task: "${todo.text}"`;
        }
      } catch (err) {
        console.error('[voice-tools] toggle_todo error:', err);
        return 'Failed to toggle the task. Please try again.';
      }
    },
  };
}
