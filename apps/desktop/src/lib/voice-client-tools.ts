import type { TodoItem } from '@norot/shared';
import { getNorotAPI } from '@/lib/norot-api';
import { formatDurationMinutes, formatTimeOfDay, getTimeZoneLabel, resolveTimeZone } from '@/lib/time-utils';

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

export function createTodoClientTools(logPrefix: string) {
  return {
    list_todos: async (params: { include_done?: boolean; limit?: number } = {}) => {
      try {
        const api = getNorotAPI();
        const todos = await api.getTodos();
        const settings = await api.getSettings();
        const timeFormat = settings?.timeFormat === '24h' ? '24h' : '12h';
        const tzSetting = typeof settings?.timeZone === 'string' && settings.timeZone.trim()
          ? settings.timeZone.trim()
          : 'system';
        const tzLabel = tzSetting !== 'system'
          ? getTimeZoneLabel(resolveTimeZone(tzSetting))
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
              parts.push(`(start ${formatTimeOfDay(t.startTime, timeFormat)}${tzLabel ? ` ${tzLabel}` : ''})`);
            }
            if (typeof t.durationMinutes === 'number' && t.durationMinutes > 0) {
              parts.push(`(duration ${formatDurationMinutes(t.durationMinutes)})`);
            }
            if (t.deadline) {
              parts.push(`(due ${formatTimeOfDay(t.deadline, timeFormat)}${tzLabel ? ` ${tzLabel}` : ''})`);
            }
            if (t.app) parts.push(`[app: ${t.app}]`);
            if (t.done) parts.push('[done]');
            return parts.join(' ');
          })
          .join('\n');
      } catch (err) {
        console.error(`[${logPrefix}] list_todos error:`, err);
        return 'Failed to list tasks. Please try again.';
      }
    },
    update_todo: async (params: { todo_text?: string; new_text?: string; deadline?: string; app?: string }) => {
      try {
        const api = getNorotAPI();
        const todos = await api.getTodos();
        const todo = findTodoByText(todos, params.todo_text ?? '');
        if (!todo) return 'Could not find a matching task. Ask the user to clarify which task.';

        const fields: Partial<Omit<TodoItem, 'id'>> = {};
        if (params.new_text) fields.text = params.new_text;
        if (params.deadline) fields.deadline = params.deadline;
        if (params.app) fields.app = params.app;

        await api.updateTodo(todo.id, fields);
        return `Updated task: "${todo.text}"`;
      } catch (err) {
        console.error(`[${logPrefix}] update_todo error:`, err);
        return 'Failed to update the task. Please try again.';
      }
    },
    delete_todo: async (params: { todo_text?: string }) => {
      try {
        const api = getNorotAPI();
        const todos = await api.getTodos();
        const todo = findTodoByText(todos, params.todo_text ?? '');
        if (!todo) return 'Could not find a matching task. Ask the user to clarify which task.';

        await api.deleteTodo(todo.id);
        return `Deleted task: "${todo.text}"`;
      } catch (err) {
        console.error(`[${logPrefix}] delete_todo error:`, err);
        return 'Failed to delete the task. Please try again.';
      }
    },
    toggle_todo: async (params: { todo_text?: string }) => {
      try {
        const api = getNorotAPI();
        const todos = await api.getTodos();
        const todo = findTodoByText(todos, params.todo_text ?? '');
        if (!todo) return 'Could not find a matching task. Ask the user to clarify which task.';

        await api.toggleTodo(todo.id);
        return `${todo.done ? 'Unmarked' : 'Marked'} task as ${todo.done ? 'not done' : 'done'}: "${todo.text}"`;
      } catch (err) {
        console.error(`[${logPrefix}] toggle_todo error:`, err);
        return 'Failed to toggle the task. Please try again.';
      }
    },
  };
}
