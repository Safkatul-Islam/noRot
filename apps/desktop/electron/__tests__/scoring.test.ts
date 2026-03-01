import { describe, it, expect } from 'vitest';
import { calculateScore, applySnoozeEscalation, generateReasons, UsageSnapshot } from '@norot/shared';

function makeSnapshot(overrides: {
  sessionMinutes?: number;
  distractingMinutes?: number;
  productiveMinutes?: number;
  appSwitchesLast5Min?: number;
  idleSecondsLast5Min?: number;
  snoozesLast60Min?: number;
  timeOfDayLocal?: string;
  recentDistractRatio?: number;
  focusScore?: number;
  focusIntent?: UsageSnapshot['focusIntent'];
  categories?: Partial<UsageSnapshot['categories']>;
} = {}): UsageSnapshot {
  return {
    timestamp: new Date().toISOString(),
    focusIntent: overrides.focusIntent ?? null,
    signals: {
      sessionMinutes: overrides.sessionMinutes ?? 10,
      distractingMinutes: overrides.distractingMinutes ?? 0,
      productiveMinutes: overrides.productiveMinutes ?? 10,
      appSwitchesLast5Min: overrides.appSwitchesLast5Min ?? 0,
      idleSecondsLast5Min: overrides.idleSecondsLast5Min ?? 0,
      snoozesLast60Min: overrides.snoozesLast60Min ?? 0,
      timeOfDayLocal: overrides.timeOfDayLocal ?? '14:00',
      recentDistractRatio: overrides.recentDistractRatio,
      focusScore: overrides.focusScore,
    },
    categories: {
      activeApp: overrides.categories?.activeApp ?? 'VSCode',
      activeCategory: overrides.categories?.activeCategory ?? 'productive',
      ...overrides.categories,
    },
  };
}

describe('calculateScore', () => {
  it('prefers client focusScore when present', () => {
    const snapshot = makeSnapshot({
      recentDistractRatio: 1.0,
      distractingMinutes: 10,
      sessionMinutes: 10,
      categories: { activeApp: 'Chrome', activeCategory: 'entertainment' },
      focusScore: 80,
    });

    const { score } = calculateScore(snapshot, 5);
    expect(score).toBe(25);
  });

  it('fully productive session scores 0', () => {
    const snapshot = makeSnapshot({
      sessionMinutes: 10,
      distractingMinutes: 0,
      productiveMinutes: 10,
      appSwitchesLast5Min: 0,
      snoozesLast60Min: 0,
      idleSecondsLast5Min: 0,
      timeOfDayLocal: '14:00',
      focusIntent: null,
      categories: { activeApp: 'VSCode', activeCategory: 'productive' },
    });

    const { score } = calculateScore(snapshot);
    expect(score).toBe(0);
  });

  it('50% distraction scores above threshold', () => {
    const snapshot = makeSnapshot({
      recentDistractRatio: 0.5,
      appSwitchesLast5Min: 2,
      sessionMinutes: 10,
      distractingMinutes: 5,
      productiveMinutes: 5,
      idleSecondsLast5Min: 0,
      snoozesLast60Min: 0,
      timeOfDayLocal: '14:00',
      focusIntent: null,
      categories: { activeApp: 'Chrome', activeCategory: 'entertainment' },
    });

    const { score } = calculateScore(snapshot);
    expect(score).toBeGreaterThanOrEqual(25);
  });

  it('recentDistractRatio overrides session lifetime', () => {
    const base = {
      sessionMinutes: 100,
      distractingMinutes: 1,
      productiveMinutes: 99,
      appSwitchesLast5Min: 0,
      idleSecondsLast5Min: 0,
      snoozesLast60Min: 0,
      timeOfDayLocal: '14:00',
      focusIntent: null as null,
      categories: { activeApp: 'Chrome', activeCategory: 'productive' as const },
    };

    // Without recentDistractRatio, falls back to distractingMinutes/sessionMinutes = 1/100
    const withoutRecent = makeSnapshot(base);
    // With recentDistractRatio=0.8, overrides the low session ratio
    const withRecent = makeSnapshot({ ...base, recentDistractRatio: 0.8 });

    const { score: sessionScore } = calculateScore(withoutRecent);
    const { score: recentScore } = calculateScore(withRecent);

    // The recent ratio (0.8) should produce a much higher score than the
    // lifetime session ratio (1/100 = 0.01)
    expect(recentScore).toBeGreaterThan(sessionScore + 20);
    expect(recentScore).toBeGreaterThanOrEqual(36);
  });

  it('distracting category causes immediate score increase', () => {
    const snapshot = makeSnapshot({
      // Simulate "just got distracted": recent ratio still ~0 (long productive session),
      // but the *current* app is distracting.
      recentDistractRatio: 0.0,
      sessionMinutes: 60,
      distractingMinutes: 1,
      productiveMinutes: 59,
      appSwitchesLast5Min: 0,
      snoozesLast60Min: 0,
      categories: { activeApp: 'Chrome', activeCategory: 'social' },
    });

    const { score } = calculateScore(snapshot);
    expect(score).toBeGreaterThanOrEqual(45);
  });

  it('raw switch count produces meaningful score', () => {
    const snapshot = makeSnapshot({
      recentDistractRatio: 0,
      appSwitchesLast5Min: 8,
      sessionMinutes: 10,
      distractingMinutes: 0,
      productiveMinutes: 10,
      idleSecondsLast5Min: 0,
      snoozesLast60Min: 0,
      timeOfDayLocal: '14:00',
      focusIntent: null,
      categories: { activeApp: 'Chrome', activeCategory: 'entertainment' },
    });

    const { score } = calculateScore(snapshot);
    expect(score).toBeGreaterThan(0);
  });

  it('appSwitchesLast5Min is treated as a 5-minute count (not per-minute)', () => {
    const snapshot = makeSnapshot({
      recentDistractRatio: 0,
      appSwitchesLast5Min: 10, // 2 switches/min
      sessionMinutes: 10,
      distractingMinutes: 0,
      productiveMinutes: 10,
      idleSecondsLast5Min: 0,
      snoozesLast60Min: 0,
      timeOfDayLocal: '14:00',
      focusIntent: null,
      categories: { activeApp: 'VSCode', activeCategory: 'productive' },
    });

    const { score } = calculateScore(snapshot);
    expect(score).toBe(0);
  });

  it('late-night multiplier increases score', () => {
    const base = {
      recentDistractRatio: 0.6,
      appSwitchesLast5Min: 5,
      sessionMinutes: 10,
      distractingMinutes: 6,
      productiveMinutes: 4,
      idleSecondsLast5Min: 0,
      snoozesLast60Min: 1,
      focusIntent: null as null,
      categories: { activeApp: 'Chrome', activeCategory: 'entertainment' as const },
    };

    const daytime = makeSnapshot({ ...base, timeOfDayLocal: '14:00' });
    const lateNight = makeSnapshot({ ...base, timeOfDayLocal: '23:30' });

    const { score: dayScore } = calculateScore(daytime);
    const { score: nightScore } = calculateScore(lateNight);

    expect(nightScore).toBeGreaterThan(dayScore);
  });

  it('score caps at 100', () => {
    const snapshot = makeSnapshot({
      recentDistractRatio: 1.0,
      appSwitchesLast5Min: 20,
      sessionMinutes: 10,
      distractingMinutes: 10,
      productiveMinutes: 0,
      snoozesLast60Min: 3,
      idleSecondsLast5Min: 0,
      timeOfDayLocal: '01:00',
      focusIntent: null,
      categories: { activeApp: 'Chrome', activeCategory: 'entertainment' },
    });

    const { score } = calculateScore(snapshot, 15);
    expect(score).toBe(100);
  });
});

describe('applySnoozeEscalation', () => {
  it('does not escalate with 0 or 1 snoozes', () => {
    expect(applySnoozeEscalation(1, 0)).toBe(1);
    expect(applySnoozeEscalation(1, 1)).toBe(1);
  });

  it('bumps severity by 1 for every 2 snoozes', () => {
    expect(applySnoozeEscalation(1, 2)).toBe(2);
    expect(applySnoozeEscalation(1, 4)).toBe(3);
    expect(applySnoozeEscalation(0, 6)).toBe(3);
  });

  it('caps at severity 4', () => {
    expect(applySnoozeEscalation(3, 10)).toBe(4);
    expect(applySnoozeEscalation(4, 2)).toBe(4);
  });
});

describe('generateReasons', () => {
  it('returns focused message for score 0 with no issues', () => {
    const snapshot = makeSnapshot();
    const reasons = generateReasons(snapshot, 0);
    expect(reasons).toEqual(["You're focused — keep it up!"]);
  });

  it('detects high distraction ratio (>50%)', () => {
    const snapshot = makeSnapshot({
      sessionMinutes: 20,
      distractingMinutes: 15,
      productiveMinutes: 5,
    });
    const reasons = generateReasons(snapshot, 50);
    expect(reasons.some(r => r.includes('most of your time'))).toBe(true);
  });

  it('detects moderate distraction ratio (25%-50%)', () => {
    const snapshot = makeSnapshot({
      sessionMinutes: 20,
      distractingMinutes: 7,
      productiveMinutes: 13,
    });
    const reasons = generateReasons(snapshot, 30);
    expect(reasons.some(r => r.includes('Some time spent'))).toBe(true);
  });

  it('detects rapid app switching (>=11/min)', () => {
    const snapshot = makeSnapshot({
      appSwitchesLast5Min: 60, // 12/min
      categories: { activeApp: 'Chrome', activeCategory: 'entertainment' },
    });
    const reasons = generateReasons(snapshot, 50);
    expect(reasons.some(r => r.includes('Rapidly switching'))).toBe(true);
  });

  it('detects frequent app switching (5-10/min)', () => {
    const snapshot = makeSnapshot({
      appSwitchesLast5Min: 30, // 6/min
      categories: { activeApp: 'Chrome', activeCategory: 'entertainment' },
    });
    const reasons = generateReasons(snapshot, 40);
    expect(reasons.some(r => r.includes('frequently'))).toBe(true);
  });

  it('shows intent gap with focus intent and distracting app', () => {
    const snapshot = makeSnapshot({
      focusIntent: { label: 'Write essay', minutesRemaining: 30 },
      categories: { activeApp: 'Twitter', activeCategory: 'social' },
    });
    const reasons = generateReasons(snapshot, 60);
    expect(reasons.some(r => r.includes("instead of working on 'Write essay'"))).toBe(true);
  });

  it('shows app + domain when no focus intent but in distracting category', () => {
    const snapshot = makeSnapshot({
      categories: {
        activeApp: 'Chrome',
        activeCategory: 'entertainment',
        activeDomain: 'youtube.com',
      } as UsageSnapshot['categories'],
    });
    const reasons = generateReasons(snapshot, 50);
    expect(reasons.some(r => r.includes('Chrome on youtube.com (entertainment)'))).toBe(true);
  });

  it('detects snooze pressure (>= 2 snoozes)', () => {
    const snapshot = makeSnapshot({ snoozesLast60Min: 3 });
    const reasons = generateReasons(snapshot, 40);
    expect(reasons.some(r => r.includes('Dismissed reminders 3 times'))).toBe(true);
  });

  it('detects late night usage', () => {
    const snapshot = makeSnapshot({ timeOfDayLocal: '02:00' });
    const reasons = generateReasons(snapshot, 30);
    expect(reasons.some(r => r.includes('late at night'))).toBe(true);
  });

  it('returns mild distraction for positive score with no specific reasons', () => {
    // Productive app, low switches, no snoozes, daytime — but score > 0 from snooze pressure
    const snapshot = makeSnapshot({
      sessionMinutes: 10,
      distractingMinutes: 1, // ratio 0.1 — below 0.25 threshold
      productiveMinutes: 9,
      appSwitchesLast5Min: 2, // 0.4/min — below 5 threshold
      snoozesLast60Min: 0,
      timeOfDayLocal: '14:00',
    });
    const reasons = generateReasons(snapshot, 5);
    expect(reasons).toEqual(['Mild distraction detected']);
  });
});
