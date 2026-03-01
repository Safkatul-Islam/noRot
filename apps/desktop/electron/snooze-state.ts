type Listener = (data: { snoozedUntil: number | null }) => void;

let snoozedUntil: number | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  const payload = { snoozedUntil };
  for (const cb of listeners) {
    try { cb(payload); } catch { /* ignore */ }
  }
}

export function onSnoozeUpdated(callback: Listener): () => void {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}

export function getSnoozedUntil(): number | null {
  return snoozedUntil;
}

export function isSnoozeActive(now: number = Date.now()): boolean {
  return typeof snoozedUntil === 'number' && snoozedUntil > now;
}

export function setSnooze(durationMs: number): void {
  const ms = Math.max(0, Math.floor(durationMs));
  if (ms === 0) {
    cancelSnooze();
    return;
  }

  snoozedUntil = Date.now() + ms;

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    snoozedUntil = null;
    emit();
  }, ms);

  emit();
}

export function cancelSnooze(): void {
  snoozedUntil = null;
  if (timer) clearTimeout(timer);
  timer = null;
  emit();
}

