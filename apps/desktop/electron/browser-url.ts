import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function chromeLikeScript(app: string): string {
  return `
    tell application "${app}"
      try
        if not (exists front window) then return ""
        set theUrl to URL of active tab of front window
        return theUrl
      on error
        return ""
      end try
    end tell
  `;
}

function safariScript(): string {
  return `
    tell application "Safari"
      try
        if not (exists front document) then return ""
        set theUrl to URL of front document
        return theUrl
      on error
        return ""
      end try
    end tell
  `;
}

function resolveAppleScriptAppName(appName: string): { app: string; kind: 'chromeLike' | 'safari' } | null {
  const lower = appName.toLowerCase();
  if (lower.includes('safari')) return { app: 'Safari', kind: 'safari' };

  // Chromium-family browsers typically support "URL of active tab of front window".
  if (lower.includes('google chrome') || lower === 'chrome') return { app: 'Google Chrome', kind: 'chromeLike' };
  if (lower.includes('chrome canary')) return { app: 'Google Chrome Canary', kind: 'chromeLike' };
  if (lower.includes('chromium')) return { app: 'Chromium', kind: 'chromeLike' };
  if (lower.includes('brave')) return { app: 'Brave Browser', kind: 'chromeLike' };
  if (lower.includes('microsoft edge') || lower.includes('edge')) return { app: 'Microsoft Edge', kind: 'chromeLike' };
  if (lower.includes('opera')) return { app: 'Opera', kind: 'chromeLike' };
  if (lower.includes('vivaldi')) return { app: 'Vivaldi', kind: 'chromeLike' };
  if (lower.includes('arc')) return { app: 'Arc', kind: 'chromeLike' };

  return null;
}

/**
 * Best-effort "deep" URL capture for browsers when the window tracker doesn't provide a URL.
 * macOS only; returns undefined on failure.
 *
 * Privacy: reads only the active tab URL via AppleScript (no page content).
 */
export async function tryGetActiveBrowserUrl(appName: string): Promise<string | undefined> {
  if (process.platform !== 'darwin') return undefined;

  const resolved = resolveAppleScriptAppName(appName);
  if (!resolved) return undefined;

  const script =
    resolved.kind === 'safari'
      ? safariScript()
      : chromeLikeScript(resolved.app);

  try {
    const { stdout } = await execFileAsync(
      '/usr/bin/osascript',
      ['-e', script],
      { timeout: 800, maxBuffer: 1024 * 1024 },
    );
    const url = String(stdout ?? '').trim();
    if (!url) return undefined;
    if (url === 'missing value') return undefined;
    return url;
  } catch {
    return undefined;
  }
}

