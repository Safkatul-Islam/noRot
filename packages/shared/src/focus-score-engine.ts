import type { UsageCategories } from './types.js';

// --- Level-based Focus Score Engine ---
// 5 discrete levels: 0 = "Locked In" (best), 4 = "Cooked" (worst)
// Distraction: drops one level every 10 seconds
// Recovery: returns to "Locked In" after 10 seconds of productive use
// Neutral: pauses recovery timer without resetting it

const LEVEL_TO_SCORE = [100, 75, 50, 25, 0] as const;
const STEP_INTERVAL_MS = 10_000; // 10 seconds per distraction level
const LOCKED_IN_RECOVERY_MS = 10_000; // 10 seconds of productive time to return to level 0
const MAX_LEVEL = 4;

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
  private currentStateType: 'focused' | 'distracted' | 'neutral';
  private focusedTimeMs: number; // accumulated productive time for gradual recovery
  private levelAtFocusStart: number; // snapshot of level when recovery started
  private distractedTimeMs: number; // accumulated distracted time for gradual decay
  private levelAtDistractionStart: number; // snapshot of level when distraction started
  private lastNonNeutralStateType: 'focused' | 'distracted';

  constructor(_opts?: { initialFocusScore?: number }) {
    this.currentLevel = 0;
    this.currentStateType = 'focused';
    this.focusedTimeMs = 0;
    this.levelAtFocusStart = 0;
    this.distractedTimeMs = 0;
    this.levelAtDistractionStart = 0;
    this.lastNonNeutralStateType = 'focused';
  }

  reset(_nextFocusScore: number = 100): void {
    this.currentLevel = 0;
    this.currentStateType = 'focused';
    this.focusedTimeMs = 0;
    this.levelAtFocusStart = 0;
    this.distractedTimeMs = 0;
    this.levelAtDistractionStart = 0;
    this.lastNonNeutralStateType = 'focused';
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
        // Switching to distracted: wipe all recovery progress.
        // IMPORTANT: if we were previously distracted and briefly went neutral,
        // treat neutral as a pause (do not reset the distraction timer).
        this.focusedTimeMs = 0;
        const resume = this.currentStateType === 'neutral' && this.lastNonNeutralStateType === 'distracted';
        if (!resume) {
          this.distractedTimeMs = 0;
          this.levelAtDistractionStart = this.currentLevel;
        }
      } else if (tickType === 'focused') {
        // Switching to focused: snapshot current level, keep any banked focusedTimeMs
        // (preserves remainder if we came back from neutral)
        if (this.currentStateType === 'distracted') {
          // Coming from distracted: reset recovery completely
          this.focusedTimeMs = 0;
        }
        this.levelAtFocusStart = this.currentLevel;
        // Starting/returning to focus resets the distraction timer.
        this.distractedTimeMs = 0;
      } else {
        // Switching to neutral: pause timers — do not reset focusedTimeMs or distractedTimeMs.
      }
      this.currentStateType = tickType;
    }

    if (tickType !== 'neutral') {
      this.lastNonNeutralStateType = tickType;
    }

    const prevLevel = this.currentLevel;

    if (tickType === 'distracted') {
      // Drop one level for every 10 seconds of distraction, starting from where we were
      this.distractedTimeMs += elapsedMs;
      const steps = Math.floor(this.distractedTimeMs / STEP_INTERVAL_MS);
      this.currentLevel = Math.min(this.levelAtDistractionStart + steps, MAX_LEVEL);
    } else if (tickType === 'focused') {
      // Accumulate productive time; after 10 seconds, snap back to Locked In.
      this.focusedTimeMs += elapsedMs;
      if (this.focusedTimeMs >= LOCKED_IN_RECOVERY_MS) {
        this.currentLevel = 0;
      } else {
        // Keep the current level until we've earned the full recovery.
        this.currentLevel = this.levelAtFocusStart;
      }
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
