import type { UsageSnapshot, Severity } from './types';
import { SCORING_WEIGHTS, LATE_NIGHT_MULTIPLIER, SEVERITY_BANDS } from './constants';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeSwitchRate(switchesPerMin: number): number {
  // 0-4 = low (0-0.4), 5-10 = medium (0.4-0.8), 11+ = high (0.8-1.0)
  if (switchesPerMin <= 4) return switchesPerMin / 10;
  if (switchesPerMin <= 10) return 0.4 + (switchesPerMin - 4) * (0.4 / 6);
  return 0.8 + Math.min(switchesPerMin - 10, 5) * (0.2 / 5);
}

function isLateNight(timeStr: string): boolean {
  const hour = parseInt(timeStr.split(':')[0], 10);
  return hour >= 23 || hour < 5;
}

export function calculateScore(snapshot: UsageSnapshot, snoozePressure: number = 0): { score: number; severity: Severity } {
  const { signals, categories, focusIntent } = snapshot;

  const distractRatio = signals.recentDistractRatio != null
    ? signals.recentDistractRatio
    : (signals.sessionMinutes > 0
      ? signals.distractingMinutes / signals.sessionMinutes
      : 0);

  // Make the score respond quickly when the user is *currently* in a distracting category.
  // Relying only on a rolling ratio can lag by minutes (especially in long sessions).
  const isDistractingNow = categories.activeCategory === 'social' || categories.activeCategory === 'entertainment';
  // Floor to a high ratio so the UI drops fast as soon as you enter distracting apps.
  const effectiveDistractRatio = isDistractingNow ? Math.max(distractRatio, 0.9) : distractRatio;

  // `appSwitchesLast5Min` is a raw count in the last 5 minutes, but the scoring model
  // expects a per-minute rate.
  // See docs/error-patterns/focus-drops-while-productive.md
  const switchesPerMin = signals.appSwitchesLast5Min / 5;
  const normSwitchRate = normalizeSwitchRate(switchesPerMin);
  const switchPenaltyEligible = isDistractingNow || clamp(effectiveDistractRatio, 0, 1) >= 0.2;
  const normSwitchRateEffective = switchPenaltyEligible ? normSwitchRate : 0;

  const intentGap = (focusIntent !== null &&
    (categories.activeCategory === 'social' || categories.activeCategory === 'entertainment'))
    ? 1 : 0;

  const snoozePressureNorm = clamp(signals.snoozesLast60Min, 0, 3) / 3;

  const base = 100 * (
    SCORING_WEIGHTS.distractRatio * effectiveDistractRatio +
    SCORING_WEIGHTS.switchRate * normSwitchRateEffective +
    SCORING_WEIGHTS.intentGap * intentGap +
    SCORING_WEIGHTS.snoozePressure * snoozePressureNorm
  );

  const lateNightMult = isLateNight(signals.timeOfDayLocal) ? LATE_NIGHT_MULTIPLIER : 1.0;
  const score = clamp(Math.round((base + snoozePressure) * lateNightMult), 0, 100);

  const band = SEVERITY_BANDS.find(b => score >= b.scoreMin && score <= b.scoreMax);
  const severity: Severity = band ? band.severity : 0;

  return { score, severity };
}

/**
 * Escalate severity if the user has been snoozing interventions.
 * Each 2 snoozes bumps severity up by 1, capped at 4.
 *
 * Matches apps/api/app/services/escalation.py:apply_snooze_escalation.
 */
export function applySnoozeEscalation(severity: Severity, snoozesLast60Min: number): Severity {
  const bump = Math.floor(snoozesLast60Min / 2);
  return Math.min(severity + bump, 4) as Severity;
}

/**
 * Generate human-readable reasons that explain the procrastination score.
 *
 * This is the single source of truth — the Python API
 * (apps/api/app/services/scoring.py:compute_reasons) must mirror this logic.
 */
export function generateReasons(snapshot: UsageSnapshot, score: number): string[] {
  const reasons: string[] = [];
  const { signals, categories, focusIntent } = snapshot;

  // Distraction ratio (two tiers)
  if (signals.sessionMinutes > 0) {
    const ratio = signals.distractingMinutes / signals.sessionMinutes;
    if (ratio > 0.5) {
      reasons.push('Spending most of your time on distracting apps');
    } else if (ratio > 0.25) {
      reasons.push('Some time spent on distracting apps');
    }
  }

  // Switch rate (per-minute, two tiers)
  const switchesPerMin = signals.appSwitchesLast5Min / 5;
  if (switchesPerMin >= 11) {
    reasons.push('Rapidly switching between apps');
  } else if (switchesPerMin >= 5) {
    reasons.push('Switching between apps frequently');
  }

  // Intent gap: using distracting app when focus intent is set
  if (
    focusIntent !== null &&
    (categories.activeCategory === 'social' || categories.activeCategory === 'entertainment')
  ) {
    const domainInfo = categories.activeDomain ? ` on ${categories.activeDomain}` : '';
    reasons.push(
      `Using ${categories.activeApp}${domainInfo} instead of working on '${focusIntent.label}'`,
    );
  } else if (
    categories.activeCategory === 'social' || categories.activeCategory === 'entertainment'
  ) {
    // No focus intent set — still note the distracting app
    const domainInfo = categories.activeDomain ? ` on ${categories.activeDomain}` : '';
    reasons.push(`Using ${categories.activeApp}${domainInfo} (${categories.activeCategory})`);
  }

  // Snooze pressure
  if (signals.snoozesLast60Min >= 2) {
    reasons.push(`Dismissed reminders ${signals.snoozesLast60Min} times recently`);
  }

  // Late night
  if (isLateNight(signals.timeOfDayLocal)) {
    reasons.push('Working late at night (scores are stricter after 11 PM)');
  }

  // Fallbacks
  if (reasons.length === 0 && score > 0) {
    reasons.push('Mild distraction detected');
  }
  if (reasons.length === 0) {
    reasons.push("You're focused — keep it up!");
  }

  return reasons;
}
