import type { TodoItem } from '@norot/shared';
import { getNorotAPI } from '@/lib/norot-api';

export interface TodoToolBackend {
  getTodos(): Promise<TodoItem[]>;
  addTodo(item: TodoItem): Promise<void>;
  updateTodo(id: string, fields: Partial<Omit<TodoItem, 'id'>>): Promise<void>;
  deleteTodo(id: string): Promise<void>;
  toggleTodo(id: string): Promise<void>;
  getSettings(): Promise<{ timeFormat: string; timeZone: string }>;
}

/**
 * Backend that delegates all operations to the Electron IPC / mock API.
 * Used for check-in mode where tasks go directly to the database.
 */
export class DbTodoBackend implements TodoToolBackend {
  async getTodos(): Promise<TodoItem[]> {
    return getNorotAPI().getTodos();
  }

  async addTodo(item: TodoItem): Promise<void> {
    await getNorotAPI().addTodo(item);
  }

  async updateTodo(id: string, fields: Partial<Omit<TodoItem, 'id'>>): Promise<void> {
    await getNorotAPI().updateTodo(id, fields);
  }

  async deleteTodo(id: string): Promise<void> {
    await getNorotAPI().deleteTodo(id);
  }

  async toggleTodo(id: string): Promise<void> {
    await getNorotAPI().toggleTodo(id);
  }

  async getSettings(): Promise<{ timeFormat: string; timeZone: string }> {
    const s = await getNorotAPI().getSettings();
    return {
      timeFormat: s?.timeFormat === '24h' ? '24h' : '12h',
      timeZone: typeof s?.timeZone === 'string' && s.timeZone.trim() ? s.timeZone.trim() : 'system',
    };
  }
}

export interface DraftAwareOptions {
  getDrafts: () => TodoItem[];
  setDrafts: (todos: TodoItem[]) => void;
}

/**
 * Backend for coach mode. Drafts live in-memory (zustand store) while DB
 * todos are fetched via the API. `addTodo` only appends to drafts — the
 * user must explicitly "Save" to persist them.
 *
 * Mutations (update/delete/toggle) check whether the target ID belongs to
 * a draft or the database and route accordingly.
 */
export class DraftAwareTodoBackend implements TodoToolBackend {
  private getDrafts: () => TodoItem[];
  private setDrafts: (todos: TodoItem[]) => void;

  constructor(opts: DraftAwareOptions) {
    this.getDrafts = opts.getDrafts;
    this.setDrafts = opts.setDrafts;
  }

  async getTodos(): Promise<TodoItem[]> {
    const drafts = this.getDrafts();
    const dbTodos = await getNorotAPI().getTodos();
    // Dedupe: draft IDs take priority over DB IDs
    const draftIds = new Set(drafts.map((t) => t.id));
    const uniqueDb = dbTodos.filter((t) => !draftIds.has(t.id));
    return [...drafts, ...uniqueDb];
  }

  async addTodo(item: TodoItem): Promise<void> {
    const drafts = this.getDrafts();
    this.setDrafts([...drafts, item]);
  }

  async updateTodo(id: string, fields: Partial<Omit<TodoItem, 'id'>>): Promise<void> {
    const drafts = this.getDrafts();
    const draftIdx = drafts.findIndex((t) => t.id === id);
    if (draftIdx !== -1) {
      const updated = [...drafts];
      updated[draftIdx] = { ...updated[draftIdx], ...fields };
      this.setDrafts(updated);
      return;
    }
    // Not a draft — delegate to DB
    await getNorotAPI().updateTodo(id, fields);
  }

  async deleteTodo(id: string): Promise<void> {
    const drafts = this.getDrafts();
    const draftIdx = drafts.findIndex((t) => t.id === id);
    if (draftIdx !== -1) {
      this.setDrafts(drafts.filter((t) => t.id !== id));
      return;
    }
    await getNorotAPI().deleteTodo(id);
  }

  async toggleTodo(id: string): Promise<void> {
    const drafts = this.getDrafts();
    const draftIdx = drafts.findIndex((t) => t.id === id);
    if (draftIdx !== -1) {
      const updated = [...drafts];
      updated[draftIdx] = { ...updated[draftIdx], done: !updated[draftIdx].done };
      this.setDrafts(updated);
      return;
    }
    await getNorotAPI().toggleTodo(id);
  }

  async getSettings(): Promise<{ timeFormat: string; timeZone: string }> {
    const s = await getNorotAPI().getSettings();
    return {
      timeFormat: s?.timeFormat === '24h' ? '24h' : '12h',
      timeZone: typeof s?.timeZone === 'string' && s.timeZone.trim() ? s.timeZone.trim() : 'system',
    };
  }
}
