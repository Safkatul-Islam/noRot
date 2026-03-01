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

    const DOMAIN_REGEX = /\b(?:[a-z0-9-]+\.)+[a-z]{2,24}\b/i;

    // Check segments from the end (domain is usually near the end)
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = stripNotifCount(segments[i]).toLowerCase();

      // Check for well-known site names (e.g., "YouTube" in title)
      for (const [name, domain] of Object.entries(TITLE_DOMAIN_MAP)) {
        if (seg === name || seg.startsWith(name + ' ')) return domain;
      }

      // Check for domain-like patterns
      // 1) Plain domain token (contains dot, no spaces)
      if (seg.includes('.') && !seg.includes(' ')) {
        return seg.replace(/^www\./, '');
      }

      // 2) Domain embedded in a longer segment (e.g. "reddit.com: ...")
      const embedded = DOMAIN_REGEX.exec(seg);
      if (embedded?.[0]) {
        return embedded[0].replace(/^www\./, '');
      }
    }
  }

  return undefined;
}

export function classifyApp(
  appName: string,
  rules: CategoryRule[],
  windowTitle?: string,
  windowUrl?: string,
  domainOverride?: string,
): 'productive' | 'neutral' | 'social' | 'entertainment' {
  const lower = appName.toLowerCase();
  const browser = isBrowser(appName);

  // For browsers: domain/title rules are more specific than app rules, so check them first.
  if (browser && (domainOverride || windowTitle || windowUrl)) {
    const domain = domainOverride ?? extractDomain(windowUrl, windowTitle);
    if (domain) {
      const domainLower = domain.toLowerCase();

      // Prefer exact title-rule matches, then substring matches.
      for (const rule of rules) {
        if (rule.matchType !== 'title') continue;
        const pat = rule.pattern.trim().toLowerCase();
        if (pat && domainLower === pat) return rule.category;
      }
      for (const rule of rules) {
        if (rule.matchType !== 'title') continue;
        const pat = rule.pattern.trim().toLowerCase();
        if (pat && domainLower.includes(pat)) return rule.category;
      }
    }
  }

  // App-name rules (exact match preferred, then substring)
  for (const rule of rules) {
    if (rule.matchType !== 'app') continue;
    const pat = rule.pattern.trim().toLowerCase();
    if (pat && lower === pat) return rule.category;
  }
  for (const rule of rules) {
    if (rule.matchType !== 'app') continue;
    const pat = rule.pattern.trim().toLowerCase();
    if (pat && lower.includes(pat)) return rule.category;
  }

  // Defaults
  if (browser) return 'neutral';

  // Default: treat unknown apps as productive. (Neutral is reserved for explicitly-marked 50/50 apps like browsers.)
  return 'productive';
}
