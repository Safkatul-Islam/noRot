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

export function formatDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';

  const whole = Math.trunc(minutes);
  if (whole < 60) return `${whole} min`;

  const h = Math.trunc(whole / 60);
  const m = whole % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
