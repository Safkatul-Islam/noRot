import { Type } from '@google/genai';
import type { TodoItem } from '@norot/shared';
import { getClient } from './gemini-client';
import { isBrowser } from './window-classifier';

export interface ContextResult {
  isRelevant: boolean;
  matchedTodoText: string | null;
  reason: string;
}

// --- LRU Cache ---

interface CacheEntry {
  result: ContextResult;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 100;
const contextCache = new Map<string, CacheEntry>();

function getCached(key: string): ContextResult | null {
  const entry = contextCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    contextCache.delete(key);
    return null;
  }
  // Move to end for LRU ordering
  contextCache.delete(key);
  contextCache.set(key, entry);
  return entry.result;
}

function setCached(key: string, result: ContextResult): void {
  // Evict oldest if at capacity
  if (contextCache.size >= CACHE_MAX_SIZE) {
    const oldest = contextCache.keys().next().value;
    if (oldest !== undefined) contextCache.delete(oldest);
  }
  contextCache.set(key, { result, timestamp: Date.now() });
}

export function clearContextCache(): void {
  contextCache.clear();
}

// --- Main export ---

export async function checkContextRelevance(
  apiKey: string,
  appName: string,
  windowTitle: string | undefined,
  domain: string | undefined,
  activeTodos: TodoItem[],
): Promise<ContextResult | null> {
  // 1. Filter to active todos that have allowedApps
  const todosWithApps = activeTodos.filter(
    (t) => !t.done && t.allowedApps && t.allowedApps.length > 0
  );
  if (todosWithApps.length === 0) return null;

  // 2. Check if any todo's allowedApps match current app or domain.
  // For browsers (Chrome/Safari/etc), only match by domain.
  // Otherwise any todo that allows "Chrome" would match *every* website and
  // cause false "relevant" results (e.g. Instagram being treated as work).
  const lowerApp = appName.toLowerCase();
  const lowerDomain = (domain ?? '').toLowerCase();

  const browser = isBrowser(appName);
  if (browser && !lowerDomain) return null;

  const GENERIC_BROWSER_ALLOWED = new Set([
    'chrome',
    'google chrome',
    'safari',
    'firefox',
    'arc',
    'edge',
    'microsoft edge',
    'brave',
    'brave browser',
    'opera',
    'vivaldi',
    'chromium',
    'browser',
  ]);

  const matched = todosWithApps.find((t) =>
    t.allowedApps!.some((allowed) => {
      const lowerAllowed = allowed.toLowerCase().trim();
      if (!lowerAllowed) return false;

      if (browser) {
        if (GENERIC_BROWSER_ALLOWED.has(lowerAllowed)) return false;
        return lowerDomain.includes(lowerAllowed);
      }

      return lowerApp.includes(lowerAllowed) || (lowerDomain && lowerDomain.includes(lowerAllowed));
    })
  );

  if (!matched) return null;

  // 3. Check cache
  const cacheKey = `${appName}|${domain ?? ''}|${windowTitle ?? ''}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // 4. Call Gemini for context check
  try {
    const client = getClient(apiKey);

    const todoList = todosWithApps
      .slice(0, 5) // Cap for token limits
      .map((t, i) => `${i + 1}. "${t.text}" (allowed apps: ${t.allowedApps!.join(', ')})`)
      .join('\n');

    const systemInstruction =
      `The user has these tasks:\n${todoList}\n\n` +
      `They are currently using "${appName}" viewing "${windowTitle ?? ''}" on "${domain ?? 'unknown'}". ` +
      'Is this activity relevant to completing any of their tasks? ' +
      'Be strict: only say yes when it is clearly tied to a specific task. If unsure, say no.';

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Determine if this activity is relevant to the user\'s tasks.',
      config: {
        systemInstruction,
        temperature: 0.2,
        maxOutputTokens: 200,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isRelevant: {
              type: Type.BOOLEAN,
              description: 'Whether the current activity is relevant to any task',
            },
            matchedTodoText: {
              type: Type.STRING,
              description: 'The text of the matched todo, or empty string if none',
            },
            reason: {
              type: Type.STRING,
              description: 'Brief explanation of why this is or is not relevant',
            },
          },
          required: ['isRelevant', 'matchedTodoText', 'reason'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}') as {
      isRelevant?: boolean;
      matchedTodoText?: string;
      reason?: string;
    };

    const result: ContextResult = {
      isRelevant: parsed.isRelevant ?? false,
      matchedTodoText: parsed.matchedTodoText || null,
      reason: parsed.reason ?? '',
    };

    // 5. Cache the result
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    console.error('[context-checker] Gemini context check failed:', err);
    return null;
  }
}
