import { describe, it, expect } from 'vitest';
import { stripEmotionTags, type ScoreResponse } from '@norot/shared';
import { getScript } from '@/services/voice/script-builder';

describe('script-builder', () => {
  it('strips leading audio tags', () => {
    expect(stripEmotionTags('[concerned] What is making it hard to start?')).toBe('What is making it hard to start?');
    expect(stripEmotionTags('[thoughtful]Hey.')).toBe('Hey.');
  });

  it('getScript returns TTS-friendly text', () => {
    const response: ScoreResponse = {
      procrastinationScore: 80,
      severity: 3,
      reasons: [],
      recommendation: {
        mode: 'interrupt',
        persona: 'coach',
        text: '[concerned] What is the smallest piece you could tackle right now?',
        tts: { model: 'eleven_v3', stability: 35, speed: 1.08 },
        cooldownSeconds: 180,
      },
    };

    expect(getScript(response)).toBe('What is the smallest piece you could tackle right now?');
  });
});
