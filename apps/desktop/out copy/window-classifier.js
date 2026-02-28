import { KNOWN_BROWSERS } from './types';
// Well-known site names that appear in browser window titles
const TITLE_DOMAIN_MAP = {
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
};
export function isBrowser(appName) {
    const lower = appName.toLowerCase();
    return KNOWN_BROWSERS.some((b) => lower.includes(b.toLowerCase()));
}
export function extractDomain(url, title) {
    // Primary: parse actual URL if available (macOS provides this for Chrome/Safari/Edge)
    if (url) {
        try {
            const hostname = new URL(url).hostname.replace(/^www\./, '');
            if (hostname)
                return hostname;
        }
        catch {
            // Not a valid URL, fall through to title parsing
        }
    }
    // Fallback: parse domain from window title
    if (title) {
        // Keep this robust across OS/browser title formats; see docs/error-patterns/window-activity-classification.md
        // Titles are usually "Page Title - Site Name - Browser" but separators vary across browsers/OSes.
        const segments = title
            .split(/\s[-–—|•]\s/g)
            .map((s) => s.trim())
            .filter(Boolean);
        // Check segments from the end (domain is usually near the end)
        for (let i = segments.length - 1; i >= 0; i--) {
            const seg = segments[i].toLowerCase();
            // Check for well-known site names (e.g., "YouTube" in title)
            for (const [name, domain] of Object.entries(TITLE_DOMAIN_MAP)) {
                if (seg === name || seg.startsWith(name + ' '))
                    return domain;
            }
            // Check for domain-like patterns (contains dot, no spaces)
            if (seg.includes('.') && !seg.includes(' ')) {
                return seg.replace(/^www\./, '');
            }
        }
    }
    return undefined;
}
export function classifyApp(appName, rules, windowTitle, windowUrl) {
    const lower = appName.toLowerCase();
    // First pass: check app-name rules
    for (const rule of rules) {
        if (rule.matchType !== 'app')
            continue;
        if (lower.includes(rule.pattern.toLowerCase())) {
            return rule.category;
        }
    }
    // Second pass: if it's a browser, extract domain and check title rules
    if (isBrowser(appName) && (windowTitle || windowUrl)) {
        const domain = extractDomain(windowUrl, windowTitle);
        if (domain) {
            for (const rule of rules) {
                if (rule.matchType !== 'title')
                    continue;
                if (domain.includes(rule.pattern.toLowerCase())) {
                    return rule.category;
                }
            }
        }
    }
    return 'neutral';
}
