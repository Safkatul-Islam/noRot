import { describe, it, expect } from 'vitest';
import { filterComputerScopedTodos } from '../todo-scope';
describe('todo-scope', () => {
    it('filters out obvious physical-world tasks', () => {
        const todos = [
            {
                id: '1',
                text: 'Go to the beach',
                done: false,
                order: 0,
                app: 'Chrome',
                allowedApps: ['Chrome'],
            },
            {
                id: '2',
                text: 'Take a shower',
                done: false,
                order: 1,
            },
            {
                id: '3',
                text: 'Write unit tests for auth module',
                done: false,
                order: 2,
                app: 'VS Code',
                allowedApps: ['VS Code', 'Terminal'],
            },
            {
                id: '4',
                text: 'Check weather for the beach in Chrome',
                done: false,
                order: 3,
                app: 'Chrome',
                url: 'weather.com',
                allowedApps: ['Chrome', 'weather.com'],
            },
        ];
        const filtered = filterComputerScopedTodos(todos);
        expect(filtered.map((t) => t.text)).toEqual([
            'Write unit tests for auth module',
            'Check weather for the beach in Chrome',
        ]);
    });
    it('keeps digital "go to" tasks', () => {
        const todos = [
            {
                id: '1',
                text: 'Go to github.com and review the PR',
                done: false,
                order: 0,
                app: 'Chrome',
                url: 'github.com',
                allowedApps: ['Chrome', 'github.com'],
            },
        ];
        const filtered = filterComputerScopedTodos(todos);
        expect(filtered).toHaveLength(1);
    });
});
