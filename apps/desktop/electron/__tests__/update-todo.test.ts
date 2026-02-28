import { describe, it, expect } from 'vitest';
import { buildUpdateTodoSql } from '../todo-update';

describe('buildUpdateTodoSql', () => {
  it('returns null for empty fields', () => {
    expect(buildUpdateTodoSql({})).toBeNull();
  });

  it('builds text update (trimmed)', () => {
    const built = buildUpdateTodoSql({ text: '  New task  ' });
    expect(built).toEqual({
      setSql: 'text = ?',
      values: ['New task'],
    });
  });

  it('builds multiple updates with correct conversions', () => {
    const built = buildUpdateTodoSql({
      text: 'Write tests',
      done: true,
      order: 3.9,
      app: 'VS Code',
      deadline: '17:00',
    });

    expect(built).toEqual({
      setSql: 'text = ?, done = ?, "order" = ?, app = ?, deadline = ?',
      values: ['Write tests', 1, 3, 'VS Code', '17:00'],
    });
  });

  it('serializes allowedApps arrays', () => {
    const built = buildUpdateTodoSql({ allowedApps: ['Chrome', 'VS Code'] });
    expect(built).toEqual({
      setSql: 'allowed_apps = ?',
      values: [JSON.stringify(['Chrome', 'VS Code'])],
    });
  });

  it('clears optional fields when provided as empty/undefined', () => {
    const built = buildUpdateTodoSql({
      app: undefined,
      url: '   ',
      allowedApps: undefined,
      deadline: undefined,
    });

    expect(built).toEqual({
      setSql: 'app = ?, url = ?, allowed_apps = ?, deadline = ?',
      values: [null, null, null, null],
    });
  });
});
