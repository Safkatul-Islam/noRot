import { describe, it, expect } from 'vitest';
import { hasInterventionGapElapsed, shouldTreatInterventionAsDismissed } from '../intervention-guard';

describe('intervention-guard', () => {
  it('does not dismiss when there is no active intervention', () => {
    expect(shouldTreatInterventionAsDismissed({
      activeInterventionId: null,
      overlayVisible: false,
      startedAt: 1000,
      now: 20_000,
    })).toBe(false);
  });

  it('does not dismiss when overlay is visible', () => {
    expect(shouldTreatInterventionAsDismissed({
      activeInterventionId: 'a',
      overlayVisible: true,
      startedAt: 1000,
      now: 20_000,
    })).toBe(false);
  });

  it('dismisses when overlay is gone past grace window', () => {
    expect(shouldTreatInterventionAsDismissed({
      activeInterventionId: 'a',
      overlayVisible: false,
      startedAt: 1000,
      now: 20_000,
      graceMs: 5_000,
    })).toBe(true);
  });

  it('enforces a minimum gap between interventions', () => {
    expect(hasInterventionGapElapsed({ lastShownAt: 0, now: 1000, minGapMs: 5000 })).toBe(true);
    expect(hasInterventionGapElapsed({ lastShownAt: 1000, now: 5500, minGapMs: 5000 })).toBe(false);
    expect(hasInterventionGapElapsed({ lastShownAt: 1000, now: 6500, minGapMs: 5000 })).toBe(true);
  });
});
