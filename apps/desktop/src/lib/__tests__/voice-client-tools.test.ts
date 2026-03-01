import { describe, it, expect, vi } from 'vitest';
import type { TodoItem } from '@norot/shared';
import { findTodoByText, createTodoClientTools } from '../voice-client-tools';
import type { TodoToolBackend } from '../todo-tool-backend';

const makeTodo = (overrides: Partial<TodoItem> = {}): TodoItem => ({
  id: crypto.randomUUID(),
  text: 'Test task',
  done: false,
  order: 0,
  ...overrides,
});

function createMockBackend(initialTodos: TodoItem[] = []): TodoToolBackend & { todos: TodoItem[] } {
  const backend = {
    todos: [...initialTodos],
    getTodos: vi.fn(async () => backend.todos),
    addTodo: vi.fn(async (item: TodoItem) => { backend.todos.push(item); }),
    updateTodo: vi.fn(async (id: string, fields: Partial<Omit<TodoItem, 'id'>>) => {
      const idx = backend.todos.findIndex((t) => t.id === id);
      if (idx !== -1) backend.todos[idx] = { ...backend.todos[idx], ...fields };
    }),
    deleteTodo: vi.fn(async (id: string) => {
      backend.todos = backend.todos.filter((t) => t.id !== id);
    }),
    toggleTodo: vi.fn(async (id: string) => {
      const idx = backend.todos.findIndex((t) => t.id === id);
      if (idx !== -1) backend.todos[idx] = { ...backend.todos[idx], done: !backend.todos[idx].done };
    }),
    getSettings: vi.fn(async () => ({ timeFormat: '12h', timeZone: 'America/New_York' })),
  };
  return backend;
}

describe('findTodoByText', () => {
  const todos = [
    makeTodo({ text: 'Write essay' }),
    makeTodo({ text: 'Review pull request' }),
    makeTodo({ text: 'Fix bug in login' }),
  ];

  it('finds exact match (case-insensitive)', () => {
    expect(findTodoByText(todos, 'write essay')?.text).toBe('Write essay');
  });

  it('finds starts-with match', () => {
    expect(findTodoByText(todos, 'Review')?.text).toBe('Review pull request');
  });

  it('finds contains match', () => {
    expect(findTodoByText(todos, 'pull request')?.text).toBe('Review pull request');
  });

  it('finds reverse-contains match', () => {
    // Needle fully contains the todo text "Fix bug in login"
    expect(findTodoByText(todos, 'please fix bug in login now')?.text).toBe('Fix bug in login');
  });

  it('returns undefined for no match', () => {
    expect(findTodoByText(todos, 'nonexistent')).toBeUndefined();
  });

  it('returns undefined for empty search', () => {
    expect(findTodoByText(todos, '')).toBeUndefined();
  });
});

describe('createTodoClientTools', () => {
  describe('add_todo', () => {
    it('creates a draft with correct fields', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      const result = await tools.add_todo({
        text: 'Write essay',
        duration_minutes: 120,
        start_time: '14:00',
        app: 'Google Docs',
      });

       expect(result).toContain('Added task: "Write essay"');
       expect(result).toContain('2h');
       expect(result).toContain('2:00 PM');
       expect(result).toContain('Google Docs');
       expect(backend.addTodo).toHaveBeenCalledOnce();

      const addedItem = (backend.addTodo as ReturnType<typeof vi.fn>).mock.calls[0][0] as TodoItem;
      expect(addedItem.text).toBe('Write essay');
      expect(addedItem.durationMinutes).toBe(120);
      expect(addedItem.startTime).toBe('14:00');
      expect(addedItem.app).toBe('Google Docs');
      expect(addedItem.done).toBe(false);
      expect(addedItem.id).toBeTruthy();
    });

    it('returns error for empty text', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      const result = await tools.add_todo({ text: '' });

      expect(result).toContain('No task text');
      expect(backend.addTodo).not.toHaveBeenCalled();
    });

    it('assigns order after existing todos', async () => {
      const existing = makeTodo({ order: 5 });
      const backend = createMockBackend([existing]);
      const tools = createTodoClientTools(backend);

      await tools.add_todo({ text: 'New task' });

      const addedItem = (backend.addTodo as ReturnType<typeof vi.fn>).mock.calls[0][0] as TodoItem;
      expect(addedItem.order).toBe(6);
    });
  });

  describe('list_todos', () => {
    it('returns combined list from backend', async () => {
      const todos = [
        makeTodo({ text: 'Task A', startTime: '09:00' }),
        makeTodo({ text: 'Task B', durationMinutes: 30 }),
      ];
      const backend = createMockBackend(todos);
      const tools = createTodoClientTools(backend);

      const result = await tools.list_todos({});

      expect(result).toContain('Task A');
      expect(result).toContain('Task B');
      expect(backend.getTodos).toHaveBeenCalledOnce();
    });

    it('filters out done tasks by default', async () => {
      const todos = [
        makeTodo({ text: 'Active' }),
        makeTodo({ text: 'Completed', done: true }),
      ];
      const backend = createMockBackend(todos);
      const tools = createTodoClientTools(backend);

      const result = await tools.list_todos({});

      expect(result).toContain('Active');
      expect(result).not.toContain('Completed');
    });

    it('includes done tasks when requested', async () => {
      const todos = [
        makeTodo({ text: 'Active' }),
        makeTodo({ text: 'Completed', done: true }),
      ];
      const backend = createMockBackend(todos);
      const tools = createTodoClientTools(backend);

      const result = await tools.list_todos({ include_done: true });

      expect(result).toContain('Active');
      expect(result).toContain('Completed');
    });
  });

  describe('update_todo', () => {
    it('updates a matching todo via backend', async () => {
      const todo = makeTodo({ id: 'abc', text: 'Write essay' });
      const backend = createMockBackend([todo]);
      const tools = createTodoClientTools(backend);

      const result = await tools.update_todo({
        todo_text: 'Write essay',
        new_text: 'Write final essay',
        duration_minutes: 60,
      });

      expect(result).toContain('Updated task');
      expect(backend.updateTodo).toHaveBeenCalledWith('abc', expect.objectContaining({
        text: 'Write final essay',
        durationMinutes: 60,
      }));
    });

    it('returns error for no match', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      const result = await tools.update_todo({ todo_text: 'nonexistent' });

      expect(result).toContain('Could not find');
    });
  });

  describe('delete_todo', () => {
    it('deletes a matching todo via backend', async () => {
      const todo = makeTodo({ id: 'abc', text: 'Write essay' });
      const backend = createMockBackend([todo]);
      const tools = createTodoClientTools(backend);

      const result = await tools.delete_todo({ todo_text: 'essay' });

      expect(result).toContain('Deleted task');
      expect(backend.deleteTodo).toHaveBeenCalledWith('abc');
    });
  });

  describe('toggle_todo', () => {
    it('toggles a matching todo via backend', async () => {
      const todo = makeTodo({ id: 'abc', text: 'Write essay', done: false });
      const backend = createMockBackend([todo]);
      const tools = createTodoClientTools(backend);

      const result = await tools.toggle_todo({ todo_text: 'essay' });

      expect(result).toContain('Marked');
      expect(result).toContain('done');
      expect(backend.toggleTodo).toHaveBeenCalledWith('abc');
    });
  });
});
