import { describe, it, expect } from 'vitest';
import { classifyApp, extractDomain, isBrowser } from '../window-classifier';
import { DEFAULT_CATEGORY_RULES } from '../types';

describe('window-classifier', () => {
  describe('isBrowser', () => {
    it('detects common Windows browser process names', () => {
      expect(isBrowser('msedge.exe')).toBe(true);
      expect(isBrowser('brave.exe')).toBe(true);
    });
  });

  describe('extractDomain', () => {
    it('infers domains from common site-name title segments', () => {
      expect(extractDomain(undefined, 'My doc - Google Docs - Google Chrome')).toBe('docs.google.com');
      expect(extractDomain(undefined, 'Question - Stack Overflow - Google Chrome')).toBe('stackoverflow.com');
    });

    it('supports non-hyphen separators used by some browsers', () => {
      expect(extractDomain(undefined, 'Some video — YouTube — Microsoft Edge')).toBe('youtube.com');
      expect(extractDomain(undefined, 'Home | Reddit | Brave')).toBe('reddit.com');
    });
  });

  describe('classifyApp', () => {
    const rules = DEFAULT_CATEGORY_RULES;

    it('classifies browser activity on Windows via title/domain rules', () => {
      expect(classifyApp('msedge.exe', rules, 'Some video — YouTube — Microsoft Edge')).toBe('entertainment');
      expect(classifyApp('brave.exe', rules, 'My doc - Google Docs - Brave')).toBe('productive');
    });
  });
});

