import type { TodoItem } from '@norot/shared';

// Error pattern doc: docs/error-patterns/offline-todos-from-voice.md

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// High-confidence physical-world tasks noRot can't track on-computer.
// Keep this list conservative to avoid filtering legit computer work.
const HARD_OFFLINE_PATTERNS: RegExp[] = [
  // Going to physical places
  /\b(go|head|drive|walk|run|bike|ride|travel|leave)\s+(to|for)\s+(the\s+)?(beach|gym|park|doctor|dentist|hospital|clinic|pharmacy|post\s+office|airport)\b/,

  // Chores / body needs
  /\b(take|have|get)\s+(a\s+)?(shower|bath)\b/,
  /\b(do|fold|put\s+away)\s+(the\s+)?laundry\b/,
  /\b(wash|do)\s+(the\s+)?dishes\b/,
  /\b(take\s+out|throw\s+out)\s+(the\s+)?trash\b/,

  // Exercise
  /\b(go)\s+for\s+(a\s+)?(run|walk|jog)\b/,
  /\b(walk)\s+(the\s+)?dog\b/,

  // Cooking
  /\b(cook|make)\s+(dinner|lunch|breakfast)\b/,
];

// Ambiguous offline tasks that can be a computer task if explicitly online.
const SOFT_OFFLINE_PATTERNS: RegExp[] = [
  /\b(buy|get|pick\s+up)\s+groceries\b/,
  /\bgrocery\s+shopping\b/,
];

function hasDigitalCue(todo: Pick<TodoItem, 'text' | 'url' | 'allowedApps'>): boolean {
  if (typeof todo.url === 'string' && todo.url.trim()) return true;

  if (Array.isArray(todo.allowedApps) && todo.allowedApps.some((a) => {
    const s = String(a).toLowerCase();
    return s.includes('http') || s.includes('.') || s.includes('/');
  })) return true;

  const t = normalizeText(todo.text);
  return /\b(online|order|delivery|deliver|instacart|doordash|ubereats|grubhub|amazon|in\s+chrome|in\s+safari|in\s+edge|on\s+the\s+website|open\s+the\s+site|search|google)\b/.test(t);
}

export function isTodoLikelyOffline(todo: Pick<TodoItem, 'text' | 'url' | 'allowedApps'>): boolean {
  const t = normalizeText(todo.text);
  if (!t) return true;

  if (HARD_OFFLINE_PATTERNS.some((re) => re.test(t))) return true;

  const softMatch = SOFT_OFFLINE_PATTERNS.some((re) => re.test(t));
  if (softMatch) return !hasDigitalCue(todo);

  return false;
}

export function filterComputerScopedTodos(todos: TodoItem[]): TodoItem[] {
  return todos.filter((t) => !isTodoLikelyOffline(t));
}
