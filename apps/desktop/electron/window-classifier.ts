import type { CategoryRule } from './types';
import { KNOWN_BROWSERS } from './types';

// Well-known site names that appear in browser window titles
const TITLE_DOMAIN_MAP: Record<string, string> = {
  discord: 'discord.com',
  chatgpt: 'chatgpt.com',
  youtube: 'youtube.com',
  reddit: 'reddit.com',
  twitter: 'twitter.com',
  facebook: 'facebook.com',
  instagram: 'instagram.com',
  tiktok: 'tiktok.com',
  netflix: 'netflix.com',
  linkedin: 'linkedin.com',
  github: 'github.com',
  'stack overflow': 'stackoverflow.com',
  twitch: 'twitch.tv',
  stackoverflow: 'stackoverflow.com',
  'google docs': 'docs.google.com',
  'google sheets': 'docs.google.com',
  'google slides': 'docs.google.com',
  'google drive': 'drive.google.com',
  gmail: 'mail.google.com',
  'google calendar': 'calendar.google.com',
};

export function isBrowser(appName: string): boolean {
  const lower = appName.toLowerCase();
  return KNOWN_BROWSERS.some((b) => lower.includes(b.toLowerCase()));
}

export function extractDomain(url?: string, title?: string): string | undefined {
  // Primary: parse actual URL if available (macOS provides this for Chrome/Safari/Edge)
  if (url) {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, '');
      if (hostname) return hostname;
    } catch {
      // Not a valid URL, fall through to title parsing
    }
  }

  // Fallback: parse domain from window title
  if (title) {
    const stripNotifCount = (s: string) => s.replace(/^\(\d+\)\s*/, '').trim();

    // Keep this robust across OS/browser title formats; see docs/error-patterns/window-activity-classification.md
    // Titles are usually "Page Title - Site Name - Browser" but separators vary across browsers/OSes.
    const segments = title
      // Split on:
      // - spaced dashes: " - ", " – ", " — "
      // - pipes/bullets with or without spaces: "|" and "•"
      .split(/\s[-–—]\s|\s*\|\s*|\s*•\s*/g)
      .map((s) => s.trim())
      .filter(Boolean);

    // Check segments from the end (domain is usually near the end)
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = stripNotifCount(segments[i]).toLowerCase();

      // Check for well-known site names (e.g., "YouTube" in title)
      for (const [name, domain] of Object.entries(TITLE_DOMAIN_MAP)) {
        if (seg === name || seg.startsWith(name + ' ')) return domain;
      }

      // Check for domain-like patterns (contains dot, no spaces)
      if (seg.includes('.') && !seg.includes(' ')) {
        return seg.replace(/^www\./, '');
      }
    }
  }

  return undefined;
}

export function classifyApp(
  appName: string,
  rules: CategoryRule[],
  windowTitle?: string,
  windowUrl?: string
): 'productive' | 'neutral' | 'social' | 'entertainment' {
  const lower = appName.toLowerCase();
  const browser = isBrowser(appName);
  let browserNeutralMatched = false;

  // First pass: check app-name rules
  for (const rule of rules) {
    if (rule.matchType !== 'app') continue;
    if (lower.includes(rule.pattern.toLowerCase())) {
      // For browsers, a neutral app-level rule shouldn't block domain/title rules.
      // This keeps "Google Chrome" neutral while still classifying "Chrome (youtube.com)" as entertainment, etc.
      if (browser && rule.category === 'neutral') {
        browserNeutralMatched = true;
        continue;
      }
      return rule.category;
    }
  }

  // Second pass: if it's a browser, extract domain and check title rules
  if (browser && (windowTitle || windowUrl)) {
    const domain = extractDomain(windowUrl, windowTitle);
    if (domain) {
      for (const rule of rules) {
        if (rule.matchType !== 'title') continue;
        if (domain.includes(rule.pattern.toLowerCase())) {
          return rule.category;
        }
      }
    }
  }

  if (browser && browserNeutralMatched) return 'neutral';

  // Default: treat unknown apps as productive. (Neutral is reserved for explicitly-marked 50/50 apps like browsers.)
  return 'productive';
}
