import type { TodoItem } from '@norot/shared';
import type { TodoToolBackend } from '@/lib/todo-tool-backend';
import { formatDurationMinutes, formatTimeOfDay, getTimeZoneLabel, normalizeTimeInput, resolveTimeZone } from '@/lib/time-utils';

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

  return undefined;
}

export function createTodoClientTools(backend: TodoToolBackend) {
  return {
    add_todo: async (params: {
      text?: string;
      duration_minutes?: number;
      start_time?: string;
      deadline?: string;
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

        const startTime = params.start_time ? normalizeTimeInput(params.start_time, tz) : undefined;
        const deadline = params.deadline ? normalizeTimeInput(params.deadline, tz) : undefined;
        const durationMinutes =
          typeof params.duration_minutes === 'number' && Number.isFinite(params.duration_minutes) && params.duration_minutes > 0
            ? Math.trunc(params.duration_minutes)
            : undefined;

        const existingTodos = await backend.getTodos();
        const maxOrder = existingTodos.reduce((max, t) => Math.max(max, t.order), -1);

        const app = typeof params.app === 'string' ? params.app.trim() : '';
        const url = typeof params.url === 'string' ? params.url.trim() : '';

        const newItem: TodoItem = {
          id: crypto.randomUUID(),
          text,
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
        const parts: string[] = [`Added task: "${text}"`];
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
        if (params.deadline) {
          const normalized = normalizeTimeInput(params.deadline, tz);
          if (normalized) fields.deadline = normalized;
        }
        if (params.start_time) {
          const normalized = normalizeTimeInput(params.start_time, tz);
          if (normalized) fields.startTime = normalized;
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

        await backend.toggleTodo(todo.id);
        return `${todo.done ? 'Unmarked' : 'Marked'} task as ${todo.done ? 'not done' : 'done'}: "${todo.text}"`;
      } catch (err) {
        console.error('[voice-tools] toggle_todo error:', err);
        return 'Failed to toggle the task. Please try again.';
      }
    },
  };
}
