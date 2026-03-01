import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TodoItem } from '@norot/shared';
import { DraftAwareTodoBackend, DbTodoBackend } from '../todo-tool-backend';

// Mock the norot-api module
vi.mock('@/lib/norot-api', () => ({
  getNorotAPI: () => mockApi,
}));

const mockApi = {
  getTodos: vi.fn<() => Promise<TodoItem[]>>(),
  addTodo: vi.fn<(item: TodoItem) => Promise<void>>(),
  updateTodo: vi.fn<(id: string, fields: Partial<Omit<TodoItem, 'id'>>) => Promise<void>>(),
  deleteTodo: vi.fn<(id: string) => Promise<void>>(),
  toggleTodo: vi.fn<(id: string) => Promise<void>>(),
  completeTodo: vi.fn<(id: string) => Promise<void>>(),
  getSettings: vi.fn(),
};

const makeTodo = (overrides: Partial<TodoItem> = {}): TodoItem => ({
  id: crypto.randomUUID(),
  text: 'Test task',
  done: false,
  order: 0,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.getSettings.mockResolvedValue({ timeFormat: '12h', timeZone: 'system' });
  mockApi.getTodos.mockResolvedValue([]);
  mockApi.addTodo.mockResolvedValue(undefined);
  mockApi.updateTodo.mockResolvedValue(undefined);
  mockApi.deleteTodo.mockResolvedValue(undefined);
  mockApi.toggleTodo.mockResolvedValue(undefined);
  mockApi.completeTodo.mockResolvedValue(undefined);
});

describe('DbTodoBackend', () => {
  it('delegates getTodos to the API', async () => {
    const todo = makeTodo({ text: 'DB task' });
    mockApi.getTodos.mockResolvedValue([todo]);

    const backend = new DbTodoBackend();
    const result = await backend.getTodos();

    expect(result).toEqual([todo]);
    expect(mockApi.getTodos).toHaveBeenCalledOnce();
  });

  it('delegates addTodo to the API', async () => {
    const todo = makeTodo({ text: 'New task' });

    const backend = new DbTodoBackend();
    await backend.addTodo(todo);

    expect(mockApi.addTodo).toHaveBeenCalledWith(todo);
  });

  it('delegates updateTodo to the API', async () => {
    const backend = new DbTodoBackend();
    await backend.updateTodo('abc', { text: 'Updated' });

    expect(mockApi.updateTodo).toHaveBeenCalledWith('abc', { text: 'Updated' });
  });

  it('delegates deleteTodo to the API', async () => {
    const backend = new DbTodoBackend();
    await backend.deleteTodo('abc');

    expect(mockApi.deleteTodo).toHaveBeenCalledWith('abc');
  });

  it('delegates toggleTodo to the API', async () => {
    const backend = new DbTodoBackend();
    await backend.toggleTodo('abc');

    expect(mockApi.toggleTodo).toHaveBeenCalledWith('abc');
  });
});

describe('DraftAwareTodoBackend', () => {
  let drafts: TodoItem[];
  let backend: DraftAwareTodoBackend;

  beforeEach(() => {
    drafts = [];
    backend = new DraftAwareTodoBackend({
      getDrafts: () => drafts,
      setDrafts: (todos) => { drafts = todos; },
    });
  });

  it('getTodos() merges drafts + DB, deduped by draft IDs', async () => {
    const draft = makeTodo({ id: 'draft-1', text: 'Draft task' });
    const dbTodo = makeTodo({ id: 'db-1', text: 'DB task' });
    const dbDuplicate = makeTodo({ id: 'draft-1', text: 'Old version' });

    drafts = [draft];
    mockApi.getTodos.mockResolvedValue([dbTodo, dbDuplicate]);

    const result = await backend.getTodos();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(draft); // Draft version wins
    expect(result[1]).toEqual(dbTodo);
  });

  it('addTodo() only modifies drafts, not DB', async () => {
    const newTodo = makeTodo({ text: 'New draft' });

    await backend.addTodo(newTodo);

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toEqual(newTodo);
    expect(mockApi.addTodo).not.toHaveBeenCalled();
  });

  it('updateTodo() routes to draft store when target is a draft', async () => {
    const draft = makeTodo({ id: 'draft-1', text: 'Original' });
    drafts = [draft];

    await backend.updateTodo('draft-1', { text: 'Updated' });

    expect(drafts[0].text).toBe('Updated');
    expect(mockApi.updateTodo).not.toHaveBeenCalled();
  });

  it('updateTodo() routes to DB when target is not a draft', async () => {
    drafts = [];

    await backend.updateTodo('db-1', { text: 'Updated in DB' });

    expect(mockApi.updateTodo).toHaveBeenCalledWith('db-1', { text: 'Updated in DB' });
  });

  it('deleteTodo() removes from drafts when target is a draft', async () => {
    const draft = makeTodo({ id: 'draft-1', text: 'To delete' });
    drafts = [draft];

    await backend.deleteTodo('draft-1');

    expect(drafts).toHaveLength(0);
    expect(mockApi.deleteTodo).not.toHaveBeenCalled();
  });

  it('deleteTodo() routes to DB when target is not a draft', async () => {
    drafts = [];

    await backend.deleteTodo('db-1');

    expect(mockApi.deleteTodo).toHaveBeenCalledWith('db-1');
  });

  it('toggleTodo() toggles draft done status', async () => {
    const draft = makeTodo({ id: 'draft-1', done: false });
    drafts = [draft];

    await backend.toggleTodo('draft-1');

    expect(drafts[0].done).toBe(true);
  });

  it('toggleTodo() routes to DB when target is not a draft', async () => {
    drafts = [];

    await backend.toggleTodo('db-1');

    expect(mockApi.toggleTodo).toHaveBeenCalledWith('db-1');
  });
});
