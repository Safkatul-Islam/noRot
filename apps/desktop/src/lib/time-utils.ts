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

export function minutesToHHMM(totalMinutes: number): string {
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

  // Pre-clean LLM noise: strip filler prefixes, trailing context, normalize a.m./p.m.
  const cleaned = trimmed
    .replace(/^(?:by|before|around|at|about|approximately)\s+/i, '')
    .replace(/\s+(?:tonight|today|this\s+(?:evening|morning|afternoon))$/i, '')
    .replace(/([ap])\.m\.?/gi, '$1m')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // "now" → current time in user's timezone
  if (cleaned === 'now' || cleaned === 'right now' || cleaned === 'immediately') {
    return minutesToHHMM(getNowMinutesInTimeZone(timeZone));
  }

  // Keyword shortcuts
  const KEYWORD_TIMES: Record<string, string> = {
    midnight: '00:00',
    noon: '12:00',
    'end of day': '23:59',
    'end of the day': '23:59',
    eod: '23:59',
  };
  if (KEYWORD_TIMES[cleaned]) return KEYWORD_TIMES[cleaned];

  // Relative time: "in 30 minutes", "2 hours from now", etc.
  const rel = /^(?:in\s+)?(\d{1,4})\s*(minutes?|mins?|m|hours?|hrs?|h)(?:\s+from\s+now)?$/.exec(cleaned);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2];
    if (!Number.isFinite(n) || n < 0) return null;
    const minutes = unit.startsWith('h') ? Math.round(n * 60) : Math.round(n);
    const now = getNowMinutesInTimeZone(timeZone);
    return minutesToHHMM(now + minutes);
  }

  // Bare hour: "10" (assume next occurrence of 10am/10pm)
  const bareHour = /^(\d{1,2})$/.exec(cleaned);
  if (bareHour) {
    const hhRaw = Number(bareHour[1]);
    if (!Number.isFinite(hhRaw)) return null;
    if (hhRaw < 0 || hhRaw > 23) return null;

    // Unambiguous 24h inputs
    if (hhRaw === 0 || hhRaw >= 13) {
      return `${String(hhRaw).padStart(2, '0')}:00`;
    }

    // Ambiguous 12h input (1-12): pick the next occurrence
    const now = getNowMinutesInTimeZone(timeZone);
    const amHour = hhRaw === 12 ? 0 : hhRaw;
    const pmHour = hhRaw === 12 ? 12 : hhRaw + 12;
    const candidates = [amHour * 60, pmHour * 60];

    let best = candidates[0];
    let bestDiff = 24 * 60 + 1;
    for (const c of candidates) {
      const diff = ((c - now) % (24 * 60) + (24 * 60)) % (24 * 60);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = c;
      }
    }

    return minutesToHHMM(best);
  }

  // 12-hour time: "5pm", "5:30 pm"
  const ampm = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/.exec(cleaned.replace(/\s+/g, ''));
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
  const m = /^(\d{1,2}):(\d{2})$/.exec(cleaned);
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

export function resolveOffsetToHHMM(
  offsetMinutes: unknown,
  timeZone: string,
  opts?: { allowZero?: boolean },
): string | null {
  if (typeof offsetMinutes !== 'number' || !Number.isFinite(offsetMinutes)) return null;
  const n = Math.round(offsetMinutes);
  if (opts?.allowZero ? n < 0 : n <= 0) return null;
  if (n > 24 * 60) return null;
  const now = getNowMinutesInTimeZone(timeZone);
  return minutesToHHMM(now + n);
}

export function hhmmToMinutes(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}
