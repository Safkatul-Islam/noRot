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

  it('tough love is loud + harsh (pg-13)', () => {
    // Severity 4 maps to "interrupt" mode, which should be loud + harsh for tough_love.
    const text = buildStableRecommendationText(4, 'tough_love');
    expect(text).toMatch(/[A-Z]{3,}/);
    expect(text).toMatch(/GET IT TOGETHER|HARD STOP|NO EXCUSES|LISTEN THE HELL UP|SNAP OUT|ENOUGH|GET STARTED/i);
    expect(text.toLowerCase()).not.toMatch(/\b(fuck|shit|bitch|dumbass)\b/);
  });
});
