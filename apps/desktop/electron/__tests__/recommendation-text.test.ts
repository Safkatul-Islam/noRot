import { describe, it, expect } from 'vitest';
import { buildStableRecommendationText } from '../recommendation-text';

describe('buildStableRecommendationText', () => {
  it('returns empty string for severity 0', () => {
    expect(buildStableRecommendationText(0, 'coach')).toBe('');
  });

  it('is stable across calls', () => {
    const a = buildStableRecommendationText(2, 'coach');
    const b = buildStableRecommendationText(2, 'coach');
    expect(a).toBe(b);
  });

  it('tough love is profane and "screams"', () => {
    // Severity 4 maps to "interrupt" mode, which should be loud + profane for tough_love.
    const text = buildStableRecommendationText(4, 'tough_love');
    expect(text).toMatch(/[A-Z]{3,}/);
    expect(text).toMatch(/\bfuck\b/i);
  });
});
