import { describe, it, expect } from 'vitest';
import {
  normalizeTimeInput,
  resolveOffsetToHHMM,
  hhmmToMinutes,
  minutesToHHMM,
  formatTimeOfDay,
  formatDurationMinutes,
} from '../time-utils';

const TZ = 'America/New_York';
const HHMM_RE = /^\d{2}:\d{2}$/;

describe('normalizeTimeInput', () => {
  describe('now / immediate keywords', () => {
    it('returns valid HH:MM for "now"', () => {
      expect(normalizeTimeInput('now', TZ)).toMatch(HHMM_RE);
    });

    it('returns valid HH:MM for "right now"', () => {
      expect(normalizeTimeInput('right now', TZ)).toMatch(HHMM_RE);
    });

    it('returns valid HH:MM for "immediately"', () => {
      expect(normalizeTimeInput('immediately', TZ)).toMatch(HHMM_RE);
    });
  });

  describe('relative time offsets', () => {
    it('returns valid HH:MM for "in 30 minutes"', () => {
      expect(normalizeTimeInput('in 30 minutes', TZ)).toMatch(HHMM_RE);
    });

    it('returns valid HH:MM for "2 hours from now"', () => {
      expect(normalizeTimeInput('2 hours from now', TZ)).toMatch(HHMM_RE);
    });

    it('returns valid HH:MM for "in 1 hour"', () => {
      expect(normalizeTimeInput('in 1 hour', TZ)).toMatch(HHMM_RE);
    });

    it('returns valid HH:MM for "45 mins"', () => {
      expect(normalizeTimeInput('45 mins', TZ)).toMatch(HHMM_RE);
    });
  });

  describe('12-hour absolute times', () => {
    it('"5pm" -> "17:00"', () => {
      expect(normalizeTimeInput('5pm', TZ)).toBe('17:00');
    });

    it('"5:30 pm" -> "17:30"', () => {
      expect(normalizeTimeInput('5:30 pm', TZ)).toBe('17:30');
    });

    it('"12am" -> "00:00"', () => {
      expect(normalizeTimeInput('12am', TZ)).toBe('00:00');
    });

    it('"12pm" -> "12:00"', () => {
      expect(normalizeTimeInput('12pm', TZ)).toBe('12:00');
    });

    it('"1am" -> "01:00"', () => {
      expect(normalizeTimeInput('1am', TZ)).toBe('01:00');
    });

    it('"11:59 pm" -> "23:59"', () => {
      expect(normalizeTimeInput('11:59 pm', TZ)).toBe('23:59');
    });
  });

  describe('24-hour absolute times', () => {
    it('"14:00" -> "14:00"', () => {
      expect(normalizeTimeInput('14:00', TZ)).toBe('14:00');
    });

    it('"00:00" -> "00:00"', () => {
      expect(normalizeTimeInput('00:00', TZ)).toBe('00:00');
    });

    it('"23:59" -> "23:59"', () => {
      expect(normalizeTimeInput('23:59', TZ)).toBe('23:59');
    });

    it('"9:05" -> "09:05"', () => {
      expect(normalizeTimeInput('9:05', TZ)).toBe('09:05');
    });
  });

  describe('LLM noise: prefix stripping', () => {
    it('"by 10pm" -> "22:00"', () => {
      expect(normalizeTimeInput('by 10pm', TZ)).toBe('22:00');
    });

    it('"before 5pm" -> "17:00"', () => {
      expect(normalizeTimeInput('before 5pm', TZ)).toBe('17:00');
    });

    it('"at 14:00" -> "14:00"', () => {
      expect(normalizeTimeInput('at 14:00', TZ)).toBe('14:00');
    });

    it('"around 3pm" -> "15:00"', () => {
      expect(normalizeTimeInput('around 3pm', TZ)).toBe('15:00');
    });

    it('"about 6:30pm" -> "18:30"', () => {
      expect(normalizeTimeInput('about 6:30pm', TZ)).toBe('18:30');
    });

    it('"approximately 9am" -> "09:00"', () => {
      expect(normalizeTimeInput('approximately 9am', TZ)).toBe('09:00');
    });
  });

  describe('LLM noise: suffix stripping', () => {
    it('"10pm tonight" -> "22:00"', () => {
      expect(normalizeTimeInput('10pm tonight', TZ)).toBe('22:00');
    });

    it('"3pm today" -> "15:00"', () => {
      expect(normalizeTimeInput('3pm today', TZ)).toBe('15:00');
    });

    it('"8am this morning" -> "08:00"', () => {
      expect(normalizeTimeInput('8am this morning', TZ)).toBe('08:00');
    });
  });

  describe('LLM noise: period normalization (a.m./p.m.)', () => {
    it('"10 p.m. tonight" -> "22:00"', () => {
      expect(normalizeTimeInput('10 p.m. tonight', TZ)).toBe('22:00');
    });

    it('"7 a.m." -> "07:00"', () => {
      expect(normalizeTimeInput('7 a.m.', TZ)).toBe('07:00');
    });
  });

  describe('keyword shortcuts', () => {
    it('"midnight" -> "00:00"', () => {
      expect(normalizeTimeInput('midnight', TZ)).toBe('00:00');
    });

    it('"noon" -> "12:00"', () => {
      expect(normalizeTimeInput('noon', TZ)).toBe('12:00');
    });

    it('"end of day" -> "23:59"', () => {
      expect(normalizeTimeInput('end of day', TZ)).toBe('23:59');
    });

    it('"end of the day" -> "23:59"', () => {
      expect(normalizeTimeInput('end of the day', TZ)).toBe('23:59');
    });

    it('"eod" -> "23:59"', () => {
      expect(normalizeTimeInput('eod', TZ)).toBe('23:59');
    });
  });

  describe('edge cases and invalid input', () => {
    it('empty string -> null', () => {
      expect(normalizeTimeInput('', TZ)).toBeNull();
    });

    it('"garbage" -> null', () => {
      expect(normalizeTimeInput('garbage', TZ)).toBeNull();
    });

    it('"25:00" -> null (invalid hour)', () => {
      expect(normalizeTimeInput('25:00', TZ)).toBeNull();
    });

    it('"12:61" -> null (invalid minute)', () => {
      expect(normalizeTimeInput('12:61', TZ)).toBeNull();
    });

    it('whitespace only -> null', () => {
      expect(normalizeTimeInput('   ', TZ)).toBeNull();
    });

    it('trailing punctuation is stripped: "5pm." -> "17:00"', () => {
      expect(normalizeTimeInput('5pm.', TZ)).toBe('17:00');
    });
  });
});

describe('resolveOffsetToHHMM', () => {
  it('60 minutes returns valid HH:MM', () => {
    const result = resolveOffsetToHHMM(60, TZ);
    expect(result).toMatch(HHMM_RE);
  });

  it('0 with allowZero: true returns valid HH:MM', () => {
    const result = resolveOffsetToHHMM(0, TZ, { allowZero: true });
    expect(result).toMatch(HHMM_RE);
  });

  it('0 without allowZero returns null', () => {
    expect(resolveOffsetToHHMM(0, TZ)).toBeNull();
  });

  it('negative offset returns null', () => {
    expect(resolveOffsetToHHMM(-10, TZ)).toBeNull();
  });

  it('non-number returns null', () => {
    expect(resolveOffsetToHHMM('sixty' as unknown, TZ)).toBeNull();
  });

  it('offset > 24h returns null', () => {
    expect(resolveOffsetToHHMM(1500, TZ)).toBeNull();
  });

  it('exactly 24*60 (1440) returns valid HH:MM', () => {
    const result = resolveOffsetToHHMM(1440, TZ);
    expect(result).toMatch(HHMM_RE);
  });
});

describe('hhmmToMinutes', () => {
  it('"14:30" -> 870', () => {
    expect(hhmmToMinutes('14:30')).toBe(870);
  });

  it('"00:00" -> 0', () => {
    expect(hhmmToMinutes('00:00')).toBe(0);
  });

  it('"23:59" -> 1439', () => {
    expect(hhmmToMinutes('23:59')).toBe(1439);
  });

  it('"12:00" -> 720', () => {
    expect(hhmmToMinutes('12:00')).toBe(720);
  });

  it('"25:00" -> null (invalid hour)', () => {
    expect(hhmmToMinutes('25:00')).toBeNull();
  });

  it('"abc" -> null', () => {
    expect(hhmmToMinutes('abc')).toBeNull();
  });

  it('"9:05" -> null (requires 2-digit HH)', () => {
    expect(hhmmToMinutes('9:05')).toBeNull();
  });
});

describe('minutesToHHMM', () => {
  it('0 -> "00:00"', () => {
    expect(minutesToHHMM(0)).toBe('00:00');
  });

  it('870 -> "14:30"', () => {
    expect(minutesToHHMM(870)).toBe('14:30');
  });

  it('1439 -> "23:59"', () => {
    expect(minutesToHHMM(1439)).toBe('23:59');
  });

  it('wraps past midnight: 1500 -> "01:00"', () => {
    expect(minutesToHHMM(1500)).toBe('01:00');
  });

  it('handles negative: -60 -> "23:00"', () => {
    expect(minutesToHHMM(-60)).toBe('23:00');
  });
});

describe('formatTimeOfDay', () => {
  it('24h format returns as-is', () => {
    expect(formatTimeOfDay('14:30', '24h')).toBe('14:30');
  });

  it('12h: "14:30" -> "2:30 PM"', () => {
    expect(formatTimeOfDay('14:30', '12h')).toBe('2:30 PM');
  });

  it('12h: "00:00" -> "12:00 AM"', () => {
    expect(formatTimeOfDay('00:00', '12h')).toBe('12:00 AM');
  });

  it('12h: "12:00" -> "12:00 PM"', () => {
    expect(formatTimeOfDay('12:00', '12h')).toBe('12:00 PM');
  });

  it('12h: "09:05" -> "9:05 AM"', () => {
    expect(formatTimeOfDay('09:05', '12h')).toBe('9:05 AM');
  });
});

describe('formatDurationMinutes', () => {
  it('30 -> "30 min"', () => {
    expect(formatDurationMinutes(30)).toBe('30 min');
  });

  it('60 -> "1h"', () => {
    expect(formatDurationMinutes(60)).toBe('1h');
  });

  it('90 -> "1h 30m"', () => {
    expect(formatDurationMinutes(90)).toBe('1h 30m');
  });

  it('0 -> ""', () => {
    expect(formatDurationMinutes(0)).toBe('');
  });

  it('-5 -> ""', () => {
    expect(formatDurationMinutes(-5)).toBe('');
  });

  it('NaN -> ""', () => {
    expect(formatDurationMinutes(NaN)).toBe('');
  });
});
