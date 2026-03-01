import { describe, it, expect } from 'vitest';
import { classifyApp } from '../window-classifier';
import { DEFAULT_CATEGORY_RULES } from '../types';

describe('classifyApp', () => {
  const rules = DEFAULT_CATEGORY_RULES;

  it('classifies known productive apps', () => {
    expect(classifyApp('Code', rules)).toBe('productive');
    expect(classifyApp('Terminal', rules)).toBe('productive');
    expect(classifyApp('iTerm2', rules)).toBe('productive');
    expect(classifyApp('Xcode', rules)).toBe('productive');
    expect(classifyApp('Notion', rules)).toBe('productive');
    expect(classifyApp('Finder', rules)).toBe('productive');
  });

  it('classifies known entertainment apps', () => {
    expect(classifyApp('Twitter', rules)).toBe('entertainment');
    expect(classifyApp('Reddit', rules)).toBe('entertainment');
    expect(classifyApp('YouTube', rules)).toBe('entertainment');
    expect(classifyApp('TikTok', rules)).toBe('entertainment');
    // Instagram is treated as "social" (still unproductive in the UI).
    expect(classifyApp('Instagram', rules)).toBe('social');
  });

  it('classifies known social apps', () => {
    expect(classifyApp('Slack', rules)).toBe('productive');
    expect(classifyApp('Discord', rules)).toBe('social');
    expect(classifyApp('Messages', rules)).toBe('social');
  });

  it('returns neutral for unknown apps', () => {
    // Unknown apps default to productive; neutral is reserved for explicitly-marked 50/50 apps.
    expect(classifyApp('Calculator', rules)).toBe('productive');
    expect(classifyApp('Preview', rules)).toBe('productive');
  });

  it('is case-insensitive', () => {
    expect(classifyApp('code', rules)).toBe('productive');
    expect(classifyApp('REDDIT', rules)).toBe('entertainment');
    expect(classifyApp('sLaCk', rules)).toBe('productive');
  });

  it('uses first-match-wins ordering', () => {
    const customRules = [
      { id: '1', matchType: 'app' as const, pattern: 'Code', category: 'entertainment' as const },
      { id: '2', matchType: 'app' as const, pattern: 'Code', category: 'productive' as const },
    ];
    expect(classifyApp('Code', customRules)).toBe('entertainment');
  });

  it('skips title-type rules', () => {
    const titleRules = [
      { id: '1', matchType: 'title' as const, pattern: 'Code', category: 'productive' as const },
    ];
    expect(classifyApp('Code', titleRules)).toBe('productive');
  });

  it('matches substring patterns', () => {
    expect(classifyApp('Visual Studio Code', rules)).toBe('productive');
    expect(classifyApp('Google Chrome', rules, 'Home | Reddit | Google Chrome')).toBe('entertainment');
  });
});
