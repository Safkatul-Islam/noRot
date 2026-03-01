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
    completeTodo: vi.fn(async (id: string) => {
      backend.todos = backend.todos.filter((t) => t.id !== id);
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
      expect(result).toContain('4:00 PM');
      expect(result).toContain('Google Docs');
      expect(backend.addTodo).toHaveBeenCalledOnce();

      const addedItem = (backend.addTodo as ReturnType<typeof vi.fn>).mock.calls[0][0] as TodoItem;
      expect(addedItem.text).toBe('Write essay');
      expect(addedItem.durationMinutes).toBe(120);
      expect(addedItem.startTime).toBe('14:00');
      expect(addedItem.deadline).toBe('16:00');
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

    it('rejects when no timing info is provided', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      const result = await tools.add_todo({ text: 'No times' });

      expect(result.toLowerCase()).toContain('missing');
      expect(result.toLowerCase()).toContain('start');
      expect(result.toLowerCase()).toContain('deadline');
      expect(backend.addTodo).not.toHaveBeenCalled();
    });

    it('rejects when only start_time is provided', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      const result = await tools.add_todo({ text: 'Only start', start_time: '14:00' });

      expect(result.toLowerCase()).toContain('missing');
      expect(result.toLowerCase()).toContain('deadline');
      expect(backend.addTodo).not.toHaveBeenCalled();
    });

    it('rejects when only deadline is provided', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      const result = await tools.add_todo({ text: 'Only deadline', deadline: '16:00' });

      expect(result.toLowerCase()).toContain('missing');
      expect(result.toLowerCase()).toContain('start');
      expect(backend.addTodo).not.toHaveBeenCalled();
    });

    it('rejects when only duration is provided', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      const result = await tools.add_todo({ text: 'Only duration', duration_minutes: 30 });

      expect(result.toLowerCase()).toContain('missing');
      expect(result.toLowerCase()).toContain('start');
      expect(result.toLowerCase()).toContain('deadline');
      expect(backend.addTodo).not.toHaveBeenCalled();
    });

    it('accepts deadline + duration and infers start time (wrap-around)', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      await tools.add_todo({ text: 'Infer start', deadline: '01:00', duration_minutes: 120 });

      const addedItem = (backend.addTodo as ReturnType<typeof vi.fn>).mock.calls[0][0] as TodoItem;
      expect(addedItem.startTime).toBe('23:00');
      expect(addedItem.deadline).toBe('01:00');
      expect(addedItem.durationMinutes).toBe(120);
    });

    it('assigns order after existing todos', async () => {
      const existing = makeTodo({ order: 5 });
      const backend = createMockBackend([existing]);
      const tools = createTodoClientTools(backend);

      await tools.add_todo({ text: 'New task', start_time: '09:00', deadline: '10:00' });

      const addedItem = (backend.addTodo as ReturnType<typeof vi.fn>).mock.calls[0][0] as TodoItem;
      expect(addedItem.order).toBe(6);
    });
  });

  describe('add_todos', () => {
    it('adds multiple tasks with shared defaults', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      const result = await tools.add_todos({
        defaults: { start_time: '14:00', duration_minutes: 120 },
        tasks: [
          { text: 'Computer science homework' },
          { text: 'Online math homework (Canvas)' },
          { text: 'Linguistics reading' },
        ],
      });

      expect(result).toContain('Added 3 tasks');
      expect(result).toContain('2h');
      expect(result).toContain('2:00 PM');
      expect(result).toContain('4:00 PM');
      expect(backend.addTodo).toHaveBeenCalledTimes(3);

      const added = (backend.addTodo as ReturnType<typeof vi.fn>).mock.calls
        .map((c) => c[0] as TodoItem);

      expect(added[0]?.order).toBe(0);
      expect(added[1]?.order).toBe(1);
      expect(added[2]?.order).toBe(2);

      for (const item of added) {
        expect(item.startTime).toBe('14:00');
        expect(item.deadline).toBe('16:00');
        expect(item.durationMinutes).toBe(120);
      }
    });

    it('is atomic: does not add any tasks when some are missing timing', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      const result = await tools.add_todos({
        tasks: [
          { text: 'Task A', start_time: '09:00', duration_minutes: 60 },
          { text: 'Task B' },
        ],
      });

      expect(result.toLowerCase()).toContain('missing timing');
      expect(result).toContain('Task B');
      expect(backend.addTodo).not.toHaveBeenCalled();
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

  describe('update_todos', () => {
    it('updates multiple todos in one call', async () => {
      const a = makeTodo({ id: 'a', text: 'Math homework' });
      const b = makeTodo({ id: 'b', text: 'Physics homework' });
      const backend = createMockBackend([a, b]);
      const tools = createTodoClientTools(backend);

      const result = await tools.update_todos({
        updates: [
          { todo_text: 'Math homework', new_text: 'Math homework (Canvas)', duration_minutes: 120 },
          { todo_text: 'Physics homework', duration_minutes: 90 },
        ],
      });

      expect(result).toContain('Updated 2 tasks');
      expect(backend.updateTodo).toHaveBeenCalledTimes(2);
      expect(backend.updateTodo).toHaveBeenCalledWith('a', expect.objectContaining({
        text: 'Math homework (Canvas)',
        durationMinutes: 120,
      }));
      expect(backend.updateTodo).toHaveBeenCalledWith('b', expect.objectContaining({
        durationMinutes: 90,
      }));
    });

    it('is atomic: does not update any tasks when some are missing', async () => {
      const a = makeTodo({ id: 'a', text: 'Math homework' });
      const backend = createMockBackend([a]);
      const tools = createTodoClientTools(backend);

      const result = await tools.update_todos({
        updates: [
          { todo_text: 'Math homework', duration_minutes: 120 },
          { todo_text: 'Nonexistent task', duration_minutes: 60 },
        ],
      });

      expect(result).toContain('Could not find');
      expect(backend.updateTodo).not.toHaveBeenCalled();
    });
  });

  describe('sequence_todos', () => {
    it('schedules tasks sequentially with fixed blocks', async () => {
      const a = makeTodo({ id: 'a', text: 'Math homework', order: 0 });
      const b = makeTodo({ id: 'b', text: 'Physics homework', order: 1 });
      const c = makeTodo({ id: 'c', text: 'Linguistics homework', order: 2 });
      const backend = createMockBackend([a, b, c]);
      const tools = createTodoClientTools(backend);

      const result = await tools.sequence_todos({
        todo_texts: ['Math homework', 'Physics homework', 'Linguistics homework'],
        duration_minutes: 120,
        start_time: '14:00',
        reorder_list: false,
      });

      expect(result).toContain('Sequenced 3 tasks');
      expect(backend.updateTodo).toHaveBeenCalledWith('a', expect.objectContaining({
        startTime: '14:00',
        deadline: '16:00',
        durationMinutes: 120,
      }));
      expect(backend.updateTodo).toHaveBeenCalledWith('b', expect.objectContaining({
        startTime: '16:00',
        deadline: '18:00',
        durationMinutes: 120,
      }));
      expect(backend.updateTodo).toHaveBeenCalledWith('c', expect.objectContaining({
        startTime: '18:00',
        deadline: '20:00',
        durationMinutes: 120,
      }));
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

      expect(result).toContain('Completed task');
      expect(result).toContain('Write essay');
      expect(backend.completeTodo).toHaveBeenCalledWith('abc');
    });
  });

  describe('offset fallback and duration inference', () => {
    it('uses deadline_offset_minutes when no deadline string', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      await tools.add_todo({ text: 'Offset task', deadline_offset_minutes: 120, duration_minutes: 30 });

      const addedItem = (backend.addTodo as ReturnType<typeof vi.fn>).mock.calls[0][0] as TodoItem;
      expect(addedItem.deadline).toMatch(/^\d{2}:\d{2}$/);
      expect(addedItem.startTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('prefers deadline string over offset when both provided', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      await tools.add_todo({ text: 'Both task', start_time: '16:00', deadline: '17:00', deadline_offset_minutes: 120 });

      const addedItem = (backend.addTodo as ReturnType<typeof vi.fn>).mock.calls[0][0] as TodoItem;
      expect(addedItem.deadline).toBe('17:00');
    });

    it('parses messy LLM deadline strings', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      await tools.add_todo({ text: 'Messy task', deadline: 'by 10pm tonight', duration_minutes: 60 });

      const addedItem = (backend.addTodo as ReturnType<typeof vi.fn>).mock.calls[0][0] as TodoItem;
      expect(addedItem.deadline).toBe('22:00');
      expect(addedItem.startTime).toBe('21:00');
    });

    it('infers duration from start + deadline', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      await tools.add_todo({ text: 'Infer duration', start_time: '14:00', deadline: '16:00' });

      const addedItem = (backend.addTodo as ReturnType<typeof vi.fn>).mock.calls[0][0] as TodoItem;
      expect(addedItem.durationMinutes).toBe(120);
    });

    it('infers deadline from start + duration', async () => {
      const backend = createMockBackend();
      const tools = createTodoClientTools(backend);

      await tools.add_todo({ text: 'Infer deadline', start_time: '14:00', duration_minutes: 120 });

      const addedItem = (backend.addTodo as ReturnType<typeof vi.fn>).mock.calls[0][0] as TodoItem;
      expect(addedItem.deadline).toBe('16:00');
    });
  });
});
