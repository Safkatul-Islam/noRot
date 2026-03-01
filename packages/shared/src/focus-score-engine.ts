import type { UsageCategories } from './types.js';

// --- Level-based Focus Score Engine ---
// 5 discrete levels: 0 = "Locked In" (best), 4 = "Cooked" (worst)
// Distraction: drops one level every 5 seconds
// Recovery: recovers one level every 5 seconds of productive use
// - returning to level 0 ("Locked In") requires 10 seconds of productive use
// Neutral: pauses recovery timer without resetting it

const LEVEL_TO_SCORE = [100, 75, 50, 25, 0] as const;
const STEP_INTERVAL_MS = 5_000; // 5 seconds per distraction level
const RECOVERY_STEP_INTERVAL_MS = 5_000; // 5 seconds per recovery level
const LOCKED_IN_RECOVERY_STEP_INTERVAL_MS = 10_000; // 10 seconds to return to level 0
const MAX_LEVEL = 4;

function computeRecoveredLevel(opts: { levelAtFocusStart: number; focusedTimeMs: number }): number {
  const startLevel = Math.max(0, Math.min(opts.levelAtFocusStart, MAX_LEVEL));
  const t = Math.max(0, opts.focusedTimeMs);
  if (startLevel <= 0) return 0;

  // Special-case the final step back to "Locked In" so it doesn't bounce to 100 too quickly.
  if (startLevel === 1) {
    return t >= LOCKED_IN_RECOVERY_STEP_INTERVAL_MS ? 0 : 1;
  }

  // For levels 2-4: recover down to level 1 at the normal cadence, then require the locked-in window.
  const timeToReachLevel1 = (startLevel - 1) * RECOVERY_STEP_INTERVAL_MS;
  if (t < timeToReachLevel1) {
    const stepsRecovered = Math.floor(t / RECOVERY_STEP_INTERVAL_MS);
    return Math.max(1, startLevel - stepsRecovered);
  }

  const remainingMs = t - timeToReachLevel1;
  return remainingMs >= LOCKED_IN_RECOVERY_STEP_INTERVAL_MS ? 0 : 1;
}

export interface FocusScoreTickInput {
  activeCategory: UsageCategories['activeCategory'];
  appSwitchesLast5Min?: number;
  elapsedMs: number;
  /** Kept for interface compatibility with orchestrator. Ignored by the simple engine. */
  decayScale?: number;
}

export interface FocusScoreTickResult {
  focusScore: number; // 0-100 (mapped from level)
  decayPerSec: number;
  recoveryPerSec: number;
}

export class FocusScoreEngine {
  private currentLevel: number; // 0-4
  private timeInCurrentStateMs: number; // ms in current activity type
  private currentStateType: 'focused' | 'distracted' | 'neutral';
  private focusedTimeMs: number; // accumulated productive time for gradual recovery
  private levelAtFocusStart: number; // snapshot of level when recovery started
  private levelAtDistractionStart: number; // snapshot of level when distraction started

  constructor(_opts?: { initialFocusScore?: number }) {
    this.currentLevel = 0;
    this.timeInCurrentStateMs = 0;
    this.currentStateType = 'focused';
    this.focusedTimeMs = 0;
    this.levelAtFocusStart = 0;
    this.levelAtDistractionStart = 0;
  }

  reset(_nextFocusScore: number = 100): void {
    this.currentLevel = 0;
    this.timeInCurrentStateMs = 0;
    this.currentStateType = 'focused';
    this.focusedTimeMs = 0;
    this.levelAtFocusStart = 0;
    this.levelAtDistractionStart = 0;
  }

  getFocusScore(): number {
    return LEVEL_TO_SCORE[this.currentLevel];
  }

  tick(input: FocusScoreTickInput): FocusScoreTickResult {
    const elapsedMs = Number.isFinite(input.elapsedMs) ? Math.max(0, input.elapsedMs) : 0;
    if (elapsedMs <= 0) {
      return { focusScore: LEVEL_TO_SCORE[this.currentLevel], decayPerSec: 0, recoveryPerSec: 0 };
    }

    const isDistracted =
      input.activeCategory === 'social' || input.activeCategory === 'entertainment';
    const isFocused = input.activeCategory === 'productive';
    const tickType: 'focused' | 'distracted' | 'neutral' =
      isDistracted ? 'distracted' : isFocused ? 'focused' : 'neutral';

    // Handle state transitions
    if (tickType !== this.currentStateType) {
      if (tickType === 'distracted') {
        // Switching to distracted: wipe all recovery progress, snapshot current level
        this.focusedTimeMs = 0;
        this.levelAtDistractionStart = this.currentLevel;
        this.timeInCurrentStateMs = 0;
      } else if (tickType === 'focused') {
        // Switching to focused: snapshot current level, keep any banked focusedTimeMs
        // (preserves remainder if we came back from neutral)
        if (this.currentStateType === 'distracted') {
          // Coming from distracted: reset recovery completely
          this.focusedTimeMs = 0;
        }
        this.levelAtFocusStart = this.currentLevel;
        this.timeInCurrentStateMs = 0;
      } else {
        // Switching to neutral: pause recovery — don't reset focusedTimeMs
        this.timeInCurrentStateMs = 0;
      }
      this.currentStateType = tickType;
    }

    this.timeInCurrentStateMs += elapsedMs;

    const prevLevel = this.currentLevel;

    if (tickType === 'distracted') {
      // Drop one level for every 5 seconds of distraction, starting from where we were
      const steps = Math.floor(this.timeInCurrentStateMs / STEP_INTERVAL_MS);
      this.currentLevel = Math.min(this.levelAtDistractionStart + steps, MAX_LEVEL);
    } else if (tickType === 'focused') {
      // Accumulate productive time and recover one level every 5 seconds.
      // Returning to level 0 (Locked In) requires 10 seconds.
      this.focusedTimeMs += elapsedMs;
      this.currentLevel = computeRecoveredLevel({
        levelAtFocusStart: this.levelAtFocusStart,
        focusedTimeMs: this.focusedTimeMs,
      });
    }
    // neutral: no change to currentLevel or focusedTimeMs

    const score = LEVEL_TO_SCORE[this.currentLevel];
    const prevScore = LEVEL_TO_SCORE[prevLevel];
    const dt = elapsedMs / 1000;

    return {
      focusScore: score,
      decayPerSec: score < prevScore ? (prevScore - score) / dt : 0,
      recoveryPerSec: score > prevScore ? (score - prevScore) / dt : 0,
    };
  }
}
