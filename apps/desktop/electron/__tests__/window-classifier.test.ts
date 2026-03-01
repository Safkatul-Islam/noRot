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
      expect(extractDomain(undefined, 'Home|Reddit|Brave')).toBe('reddit.com');
    });

    it('handles notification counts in titles', () => {
      expect(extractDomain(undefined, '(2) Instagram - Google Chrome')).toBe('instagram.com');
      expect(extractDomain(undefined, '(12) Gmail - Google Chrome')).toBe('mail.google.com');
    });

    it('extracts domains embedded in longer segments', () => {
      expect(extractDomain(undefined, 'reddit.com: the front page of the internet - Google Chrome')).toBe('reddit.com');
      expect(extractDomain(undefined, 'OpenAI (chatgpt.com) - Google Chrome')).toBe('chatgpt.com');
    });
  });

  describe('classifyApp', () => {
    const rules = DEFAULT_CATEGORY_RULES;

    it('classifies browser activity on Windows via title/domain rules', () => {
      // YouTube is treated as 50/50; content classification happens via vision.
      expect(classifyApp('msedge.exe', rules, 'Some video — YouTube — Microsoft Edge')).toBe('neutral');
      expect(classifyApp('brave.exe', rules, 'My doc - Google Docs - Brave')).toBe('productive');
    });

    it('prefers domain rules over browser app rules', () => {
      const customRules = [
        { id: 'app-chrome-prod', matchType: 'app' as const, pattern: 'Google Chrome', category: 'productive' as const },
        { id: 'domain-reddit', matchType: 'title' as const, pattern: 'reddit.com', category: 'entertainment' as const },
      ];
      expect(classifyApp('Google Chrome', customRules, 'Home | Reddit | Google Chrome')).toBe('entertainment');
    });
  });
});
