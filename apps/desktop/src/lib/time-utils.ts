export type TimeFormat = '12h' | '24h';

export function resolveTimeZone(timeZoneSetting: string | undefined): string {
  const system = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timeZoneSetting || timeZoneSetting === 'system') return system || 'UTC';
  return timeZoneSetting;
}

export function getTimeZoneLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    const tz = parts.find((p) => p.type === 'timeZoneName')?.value;
    return tz || timeZone;
  } catch {
    return timeZone;
  }
}

export function formatTimeOfDay(hhmm: string, format: TimeFormat): string {
  if (format === '24h') return hhmm;

  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;

  const hhRaw = Number(m[1]);
  const mm = m[2];
  if (!Number.isFinite(hhRaw)) return hhmm;

  const ampm = hhRaw >= 12 ? 'PM' : 'AM';
  const hh = (hhRaw % 12) || 12;
  return `${hh}:${mm} ${ampm}`;
}

function getNowMinutesInTimeZone(timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value);
    const m = Number(parts.find((p) => p.type === 'minute')?.value);
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
  } catch {
    // Fall back to local time.
  }

  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function minutesToHHMM(totalMinutes: number): string {
  const m = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Validate and normalize a time input string.
 * Returns a valid HH:MM string or null if the input is invalid.
 */
export function normalizeTimeInput(value: string, timeZone: string): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase().replace(/[.!?]+$/g, '');

  // "now" → current time in user's timezone
  if (trimmed === 'now' || trimmed === 'right now' || trimmed === 'immediately') {
    return minutesToHHMM(getNowMinutesInTimeZone(timeZone));
  }

  // Relative time: "in 30 minutes", "2 hours from now", etc.
  const rel = /^(?:in\s+)?(\d{1,4})\s*(minutes?|mins?|m|hours?|hrs?|h)(?:\s+from\s+now)?$/.exec(trimmed);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2];
    if (!Number.isFinite(n) || n < 0) return null;
    const minutes = unit.startsWith('h') ? Math.round(n * 60) : Math.round(n);
    const now = getNowMinutesInTimeZone(timeZone);
    return minutesToHHMM(now + minutes);
  }

  // 12-hour time: "5pm", "5:30 pm"
  const ampm = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/.exec(trimmed.replace(/\s+/g, ''));
  if (ampm) {
    const hhRaw = Number(ampm[1]);
    const mmRaw = typeof ampm[2] === 'string' ? Number(ampm[2]) : 0;
    const ap = ampm[3];
    if (!Number.isFinite(hhRaw) || !Number.isFinite(mmRaw)) return null;
    if (hhRaw < 1 || hhRaw > 12 || mmRaw < 0 || mmRaw > 59) return null;
    const hh = ap === 'am'
      ? (hhRaw === 12 ? 0 : hhRaw)
      : (hhRaw === 12 ? 12 : hhRaw + 12);
    return `${String(hh).padStart(2, '0')}:${String(mmRaw).padStart(2, '0')}`;
  }

  // HH:MM validation
  const m = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';

  const whole = Math.trunc(minutes);
  if (whole < 60) return `${whole} min`;

  const h = Math.trunc(whole / 60);
  const m = whole % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
