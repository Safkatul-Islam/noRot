import { describe, it, expect } from 'vitest';
import type { TodoItem } from '@norot/shared';
import { findTodoByText } from '@/lib/voice-client-tools';

describe('findTodoByText', () => {
  const todos: TodoItem[] = [
    { id: '1', text: 'Write unit tests for auth module', done: false, order: 0 },
    { id: '2', text: 'Review pull request on GitHub', done: false, order: 1 },
    { id: '3', text: 'Open github.com and triage issues', done: false, order: 2 },
  ];

  it('matches exact text (case-insensitive)', () => {
    const found = findTodoByText(todos, 'review pull request on github');
    expect(found?.id).toBe('2');
  });

  it('matches starts-with', () => {
    const found = findTodoByText(todos, 'write unit');
    expect(found?.id).toBe('1');
  });

  it('matches contains', () => {
    const found = findTodoByText(todos, 'triage');
    expect(found?.id).toBe('3');
  });

  it('matches reverse-contains', () => {
    const found = findTodoByText(todos, 'please write unit tests for auth module today');
    expect(found?.id).toBe('1');
  });

  it('returns undefined when no match', () => {
    const found = findTodoByText(todos, 'cook dinner');
    expect(found).toBeUndefined();
  });
});
