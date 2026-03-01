import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildInterventionText, buildZeroFocusInterventionText } from '../intervention-text';

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
    expect(text.toLowerCase()).toContain('dumb habit');
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

  it('tough love is loud + harsh (pg-13)', () => {
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
    expect(text).toMatch(/WHAT THE HELL/);
    expect(text).toMatch(/[A-Z]{3,}/);
    // Harsh but safe: avoid explicit profanity.
    expect(text.toLowerCase()).not.toMatch(/\b(fuck|shit|bitch|dumbass)\b/);
  });

  it('zero-focus message is long and action-oriented', () => {
    const text = buildZeroFocusInterventionText('coach', {
      activeApp: 'Google Chrome',
      activeCategory: 'social',
      activeDomain: 'instagram.com',
      activityLabel: undefined,
      activityKind: undefined,
      activityConfidence: undefined,
      activitySource: undefined,
    }, {
      overdueTodos: [{ text: 'Write proposal', deadline: '14:00' }],
      activeTodos: ['Write proposal', 'Send invoice'],
    });
    expect(text).toMatch(/ZERO/i);
    expect(text.toLowerCase()).toContain('instagram');
    expect(text.toLowerCase()).toContain('close');
    expect(text.toLowerCase()).toContain('open');
    expect(text.toLowerCase()).toContain('two minutes');
  });
});
