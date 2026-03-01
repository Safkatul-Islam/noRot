import type { UsageCategories, UsageSignals } from './types.js';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeSwitchRate(switchesPerMin: number): number {
  // 0-4 = low (0-0.4), 5-10 = medium (0.4-0.8), 11+ = high (0.8-1.0)
  if (switchesPerMin <= 4) return switchesPerMin / 10;
  if (switchesPerMin <= 10) return 0.4 + (switchesPerMin - 4) * (0.4 / 6);
  return 0.8 + Math.min(switchesPerMin - 10, 5) * (0.2 / 5);
}

// --- Layer 1: Momentum Buffer (30-second rolling window) ---

interface MomentumEntry {
  timestampMs: number;
  durationMs: number;
  type: 'focused' | 'distracted' | 'neutral';
}

class MomentumBuffer {
  private readonly windowMs = 30_000;
  private entries: MomentumEntry[] = [];

  push(entry: MomentumEntry): void {
    this.entries.push(entry);
    this.prune(entry.timestampMs);
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    this.entries = this.entries.filter(e => e.timestampMs + e.durationMs > cutoff);
  }

  /** Fraction of the last 30 seconds spent distracted (0-1). */
  getDistractedRatio(now: number): number {
    this.prune(now);
    return this.getRatio(now, 'distracted');
  }

  /** Fraction of the last 30 seconds spent focused (0-1). */
  getFocusedRatio(now: number): number {
    this.prune(now);
    return this.getRatio(now, 'focused');
  }

  private getRatio(now: number, type: 'focused' | 'distracted'): number {
    const cutoff = now - this.windowMs;
    let totalMs = 0;
    let typeMs = 0;

    for (const e of this.entries) {
      const start = Math.max(e.timestampMs, cutoff);
      const end = Math.min(e.timestampMs + e.durationMs, now);
      const dur = Math.max(0, end - start);
      totalMs += dur;
      if (e.type === type) typeMs += dur;
    }

    if (totalMs <= 0) return 0;
    return typeMs / totalMs;
  }

  reset(): void {
    this.entries = [];
  }
}

// --- Layer 2: Session History (60-minute time-weighted window) ---

interface MinuteBucket {
  focusedMs: number;
  distractedMs: number;
  neutralMs: number;
}

class TimeWeightedHistory {
  private readonly maxBuckets = 60;
  private readonly decayPerMinute = 0.95;
  private buckets: MinuteBucket[] = [];
  private currentBucketAge = 0; // ms accumulated in current bucket

  addTime(type: 'focused' | 'distracted' | 'neutral', ms: number): void {
    if (ms <= 0) return;

    let remaining = ms;
    while (remaining > 0) {
      if (this.buckets.length === 0) {
        this.buckets.push({ focusedMs: 0, distractedMs: 0, neutralMs: 0 });
        this.currentBucketAge = 0;
      }

      const bucket = this.buckets[this.buckets.length - 1];
      const spaceInBucket = 60_000 - this.currentBucketAge;
      const toAdd = Math.min(remaining, spaceInBucket);

      if (type === 'focused') bucket.focusedMs += toAdd;
      else if (type === 'distracted') bucket.distractedMs += toAdd;
      else bucket.neutralMs += toAdd;

      this.currentBucketAge += toAdd;
      remaining -= toAdd;

      if (this.currentBucketAge >= 60_000) {
        // Start a new bucket
        if (this.buckets.length >= this.maxBuckets) {
          this.buckets.shift();
        }
        if (remaining > 0) {
          this.buckets.push({ focusedMs: 0, distractedMs: 0, neutralMs: 0 });
          this.currentBucketAge = 0;
        }
      }
    }
  }

  /**
   * Compute time-weighted focus ratio across all buckets.
   * Most recent bucket has weight 1.0, each older bucket decays by 0.95.
   */
  getSessionFocusRatio(): number {
    if (this.buckets.length === 0) return 0.5; // neutral default

    let weightedFocused = 0;
    let weightedTotal = 0;
    const len = this.buckets.length;

    for (let i = 0; i < len; i++) {
      const age = len - 1 - i; // 0 = most recent
      const weight = Math.pow(this.decayPerMinute, age);
      const b = this.buckets[i];
      const total = b.focusedMs + b.distractedMs + b.neutralMs;
      weightedFocused += b.focusedMs * weight;
      weightedTotal += total * weight;
    }

    if (weightedTotal <= 0) return 0.5;
    return weightedFocused / weightedTotal;
  }

  reset(): void {
    this.buckets = [];
    this.currentBucketAge = 0;
  }
}

// --- Main Engine ---

export interface FocusScoreTickInput {
  activeCategory: UsageCategories['activeCategory'];
  appSwitchesLast5Min: UsageSignals['appSwitchesLast5Min'];
  elapsedMs: number;
  /**
   * Multiplier for distracting decay rate.
   * - 1.0 = normal behavior
   * - 0.0 = no decay while distracting
   * - 0.5 = half-rate decay
   */
  decayScale?: number;
}

export interface FocusScoreTickResult {
  focusScore: number; // rounded, 0-100
  decayPerSec: number; // applied decay rate (scaled)
  recoveryPerSec: number;
}

/**
 * Three-layer focus score engine:
 *
 * Layer 1 — Momentum Buffer: 30-second rolling window absorbs brief glances.
 * Layer 2 — Session History: 60 per-minute buckets with exponential decay weighting.
 * Layer 3 — Streak Tracking: rewards sustained focus, punishes sustained distraction.
 */
export class FocusScoreEngine {
  private focusScoreRaw: number;

  // Layer 1: Momentum Buffer
  private momentumBuffer: MomentumBuffer;

  // Layer 2: Session History
  private sessionHistory: TimeWeightedHistory;

  // Layer 3: Streak Tracking
  private currentStreakMs: number;
  private currentStreakType: 'focused' | 'distracted' | 'neutral';
  private previousFocusStreakMs: number; // remembered when switching to distracted

  // Monotonic clock for momentum buffer timestamps
  private elapsedTotal: number;

  constructor(opts?: { initialFocusScore?: number }) {
    this.focusScoreRaw = clamp(opts?.initialFocusScore ?? 100, 0, 100);
    this.momentumBuffer = new MomentumBuffer();
    this.sessionHistory = new TimeWeightedHistory();
    this.currentStreakMs = 0;
    this.currentStreakType = 'focused';
    this.previousFocusStreakMs = 0;
    this.elapsedTotal = 0;
  }

  reset(nextFocusScore: number = 100): void {
    this.focusScoreRaw = clamp(nextFocusScore, 0, 100);
    this.momentumBuffer.reset();
    this.sessionHistory.reset();
    this.currentStreakMs = 0;
    this.currentStreakType = 'focused';
    this.previousFocusStreakMs = 0;
    this.elapsedTotal = 0;
  }

  getFocusScore(): number {
    return Math.round(this.focusScoreRaw);
  }

  tick(input: FocusScoreTickInput): FocusScoreTickResult {
    const elapsedMsSafe = Number.isFinite(input.elapsedMs) ? Math.max(0, input.elapsedMs) : 0;
    const dt = elapsedMsSafe / 1000;
    if (dt <= 0) {
      return {
        focusScore: Math.round(this.focusScoreRaw),
        decayPerSec: 0,
        recoveryPerSec: 0,
      };
    }

    const now = this.elapsedTotal + elapsedMsSafe;

    // Classify current activity
    const isDistractingNow =
      input.activeCategory === 'social' || input.activeCategory === 'entertainment';
    const isFocusedNow = input.activeCategory === 'productive';
    const tickType: 'focused' | 'distracted' | 'neutral' =
      isDistractingNow ? 'distracted' : isFocusedNow ? 'focused' : 'neutral';

    // Update momentum buffer
    this.momentumBuffer.push({
      timestampMs: this.elapsedTotal,
      durationMs: elapsedMsSafe,
      type: tickType,
    });

    // Update session history
    this.sessionHistory.addTime(tickType, elapsedMsSafe);

    // Update streak tracking
    if (tickType !== this.currentStreakType) {
      if (this.currentStreakType === 'focused' && tickType === 'distracted') {
        // Remember focus streak for shield
        this.previousFocusStreakMs = this.currentStreakMs;
      } else if (tickType === 'focused') {
        this.previousFocusStreakMs = 0; // reset shield on new focus streak
      }
      this.currentStreakMs = 0;
      this.currentStreakType = tickType;
    }
    this.currentStreakMs += elapsedMsSafe;

    // --- Layer 1: Momentum gates ---
    const distractedRatio30s = this.momentumBuffer.getDistractedRatio(now);
    const focusedRatio30s = this.momentumBuffer.getFocusedRatio(now);

    // Decay momentum gate: how much of the decay should apply?
    let decayMomentumGate: number;
    if (distractedRatio30s < 0.33) {
      decayMomentumGate = 0; // glance — no decay
    } else if (distractedRatio30s < 0.66) {
      // Ramp up proportionally between 0.33 and 0.66
      decayMomentumGate = (distractedRatio30s - 0.33) / 0.33;
    } else {
      decayMomentumGate = 1; // full decay
    }

    // Recovery momentum gate: how much of the recovery should apply?
    let recoveryMomentumGate: number;
    if (focusedRatio30s < 0.33) {
      recoveryMomentumGate = 0; // too brief
    } else if (focusedRatio30s < 0.66) {
      recoveryMomentumGate = (focusedRatio30s - 0.33) / 0.33;
    } else {
      recoveryMomentumGate = 1; // full recovery
    }

    // --- Layer 2: Session modifiers ---
    const sessionFocusRatio = this.sessionHistory.getSessionFocusRatio();

    // Good session = only 40% decay speed; bad session = full decay
    const sessionDecayMod = 1.0 - (sessionFocusRatio * 0.6);

    // Bad session = only 30% recovery speed; good session = full recovery
    // Drops to 15% when session is very distracted (ratio < 0.2)
    let sessionRecoveryMod = 0.3 + (sessionFocusRatio * 0.7);
    if (sessionFocusRatio < 0.2) {
      sessionRecoveryMod = 0.15 + (sessionFocusRatio * 0.75);
    }

    // --- Layer 3: Streak modifiers ---
    const streakMinutes = this.currentStreakMs / 60_000;

    // Distraction streak accelerator: longer distraction = faster decay (1.0x to 2.0x over 5 min)
    const streakAccel = isDistractingNow
      ? 1.0 + clamp(streakMinutes / 5, 0, 1)
      : 1.0;

    // Focus streak shield: recent focus session protects against decay
    // 60+ min focus = 0.5x decay (capped). Shield drains at 2x rate while distracted.
    let focusShield = 1.0;
    if (isDistractingNow && this.previousFocusStreakMs > 0) {
      const focusStreakMinutes = this.previousFocusStreakMs / 60_000;
      focusShield = 1.0 - clamp(focusStreakMinutes / 60, 0, 0.5);
      // Drain shield at 2x rate
      this.previousFocusStreakMs = Math.max(0, this.previousFocusStreakMs - elapsedMsSafe * 2);
    }

    // --- Compute rates ---
    const switchesPerMin = (input.appSwitchesLast5Min ?? 0) / 5;
    const normSwitchRate = normalizeSwitchRate(switchesPerMin);
    const baseDecayPerSec = clamp(3 + 3 * normSwitchRate, 3, 6);
    const decayScaleRaw = typeof input.decayScale === 'number' && Number.isFinite(input.decayScale) ? input.decayScale : 1;
    const decayScale = clamp(decayScaleRaw, 0, 10);

    let effectiveDecayPerSec = 0;
    let effectiveRecoveryPerSec = 0;

    if (isDistractingNow) {
      effectiveDecayPerSec =
        baseDecayPerSec * decayMomentumGate * sessionDecayMod * focusShield * streakAccel * decayScale;
      this.focusScoreRaw -= effectiveDecayPerSec * dt;
    } else if (isFocusedNow) {
      // Base recovery: 1.5 pts/sec
      const baseRecovery = 1.5;

      // Diminishing returns: recovery slows as score approaches 100
      const scoreDiminishing = 1.0 - (this.focusScoreRaw / 100) * 0.5;

      effectiveRecoveryPerSec =
        baseRecovery * recoveryMomentumGate * sessionRecoveryMod * scoreDiminishing;
      this.focusScoreRaw += effectiveRecoveryPerSec * dt;
    } else {
      // Neutral: very slow drift toward session average
      const drift = (sessionFocusRatio - 0.5) * 0.6; // -0.3 to +0.3 pts/sec
      this.focusScoreRaw += drift * dt;
      if (drift > 0) effectiveRecoveryPerSec = drift;
      else effectiveDecayPerSec = -drift;
    }

    this.focusScoreRaw = clamp(this.focusScoreRaw, 0, 100);
    this.elapsedTotal = now;

    return {
      focusScore: Math.round(this.focusScoreRaw),
      decayPerSec: effectiveDecayPerSec,
      recoveryPerSec: effectiveRecoveryPerSec,
    };
  }
}
