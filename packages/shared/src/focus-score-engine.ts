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

export interface FocusScoreTickInput {
  activeCategory: UsageCategories['activeCategory'];
  appSwitchesLast5Min: UsageSignals['appSwitchesLast5Min'];
  elapsedMs: number;
  /**
   * Multiplier for distracting decay rate.
   * - 1.0 = normal behavior (3–6 pts/sec decay)
   * - 0.0 = no decay while distracting
   * - 0.5 = half-rate decay (≈1.5–3 pts/sec)
   */
  decayScale?: number;
}

export interface FocusScoreTickResult {
  focusScore: number; // rounded, 0-100
  decayPerSec: number; // applied decay rate (scaled)
  recoveryPerSec: number;
}

/**
 * Stateful focus meter:
 * - While distracting: decreases by 3–6 points/sec (dynamic, deterministic).
 * - While not distracting: recovers toward 100 at a fixed rate.
 */
export class FocusScoreEngine {
  private focusScoreRaw: number;
  private readonly recoveryPerSec: number;

  constructor(opts?: { initialFocusScore?: number; recoveryPerSec?: number }) {
    this.focusScoreRaw = clamp(opts?.initialFocusScore ?? 100, 0, 100);
    this.recoveryPerSec = opts?.recoveryPerSec ?? 2;
  }

  reset(nextFocusScore: number = 100): void {
    this.focusScoreRaw = clamp(nextFocusScore, 0, 100);
  }

  getFocusScore(): number {
    return Math.round(this.focusScoreRaw);
  }

  tick(input: FocusScoreTickInput): FocusScoreTickResult {
    const elapsedMsSafe = Number.isFinite(input.elapsedMs) ? Math.max(0, input.elapsedMs) : 0;
    const dt = elapsedMsSafe / 1000;

    const switchesPerMin = (input.appSwitchesLast5Min ?? 0) / 5;
    const normSwitchRate = normalizeSwitchRate(switchesPerMin);
    const baseDecayPerSec = clamp(3 + 3 * normSwitchRate, 3, 6);
    const decayScaleRaw = typeof input.decayScale === 'number' && Number.isFinite(input.decayScale) ? input.decayScale : 1;
    const decayScale = clamp(decayScaleRaw, 0, 10);
    const decayPerSec = baseDecayPerSec * decayScale;

    const isDistractingNow =
      input.activeCategory === 'social' || input.activeCategory === 'entertainment';

    if (isDistractingNow) {
      this.focusScoreRaw -= decayPerSec * dt;
    } else {
      this.focusScoreRaw += this.recoveryPerSec * dt;
    }

    this.focusScoreRaw = clamp(this.focusScoreRaw, 0, 100);

    return {
      focusScore: Math.round(this.focusScoreRaw),
      decayPerSec,
      recoveryPerSec: this.recoveryPerSec,
    };
  }
}
