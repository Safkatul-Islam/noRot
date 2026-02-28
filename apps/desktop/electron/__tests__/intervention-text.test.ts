import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildInterventionText } from '../intervention-text';

describe('buildInterventionText', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes detected activity when available', () => {
    const text = buildInterventionText(2, 'tough_love', {
      activeApp: 'Google Chrome',
      activeCategory: 'entertainment',
      activeDomain: 'instagram.com',
      activityLabel: undefined,
      activityKind: undefined,
      activityConfidence: undefined,
      activitySource: undefined,
    });
    expect(text.toLowerCase()).toContain('instagram');
    expect(text.toLowerCase()).toContain('pulling you away');
    expect(text.toLowerCase()).toContain('stupid ass');
  });

  it('escalates with severity', () => {
    const text = buildInterventionText(4, 'coach', {
      activeApp: 'Google Chrome',
      activeCategory: 'entertainment',
      activeDomain: 'youtube.com',
      activityLabel: 'watching YouTube',
      activityKind: 'video',
      activityConfidence: 1,
      activitySource: 'rules',
    });
    // Crisis-level messages should be more stabilizing / reset-oriented than lower severities.
    expect(text.toLowerCase()).toContain('reset');
    expect(text.toLowerCase()).toContain('breathe');
  });

  it('tough love can be explicit + loud', () => {
    const text = buildInterventionText(1, 'tough_love', {
      activeApp: 'Google Chrome',
      activeCategory: 'entertainment',
      activeDomain: 'reddit.com',
      activityLabel: undefined,
      activityKind: undefined,
      activityConfidence: undefined,
      activitySource: undefined,
    });
    expect(text).toContain('BRUH');
    expect(text).toMatch(/WHAT THE FUCK/);
    expect(text).toMatch(/[A-Z]{3,}/);
    expect(text.toLowerCase()).toMatch(/\b(fuck|bitch|bastard|idiot|dumbass|stupid ass)\b/);
  });
});
