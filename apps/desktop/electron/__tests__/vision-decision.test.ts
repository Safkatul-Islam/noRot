import { describe, it, expect } from 'vitest';
import { analyzeVisionOutputs, voteVisionDecisions } from '../activity/vision-decision';

describe('vision-decision', () => {
  it('classifies productive when productive labels dominate', () => {
    const d = analyzeVisionOutputs([
      { label: 'writing a document', score: 0.32 },
      { label: 'reading technical documentation', score: 0.28 },
      { label: 'watching cartoons or anime', score: 0.04 },
    ]);
    expect(d.decidedCategory).toBe('productive');
    expect(d.confidence).toBeGreaterThan(0.1);
  });

  it('classifies entertainment when entertainment dominates', () => {
    const d = analyzeVisionOutputs([
      { label: 'watching a movie or TV show', score: 0.30 },
      { label: 'watching an online video for entertainment', score: 0.22 },
      { label: 'writing code in an IDE', score: 0.05 },
    ]);
    expect(d.decidedCategory).toBe('entertainment');
  });

  it('classifies social when social dominates', () => {
    const d = analyzeVisionOutputs([
      { label: 'scrolling a social media feed', score: 0.28 },
      { label: 'chatting casually in a messaging app', score: 0.22 },
      { label: 'reading technical documentation', score: 0.05 },
    ]);
    expect(d.decidedCategory).toBe('social');
  });

  it('defaults to productive when ambiguous', () => {
    const d = analyzeVisionOutputs([
      { label: 'writing a document', score: 0.12 },
      { label: 'watching an online video for entertainment', score: 0.12 },
    ]);
    expect(d.decidedCategory).toBe('productive');
    expect(d.confidence).toBeLessThan(0.1);
  });

  it('votes majority across attempts', () => {
    const a1 = analyzeVisionOutputs([
      { label: 'watching a movie or TV show', score: 0.30 },
      { label: 'watching cartoons or anime', score: 0.15 },
    ]);
    const a2 = analyzeVisionOutputs([
      { label: 'watching an online video for entertainment', score: 0.28 },
      { label: 'shopping online', score: 0.10 },
    ]);
    const a3 = analyzeVisionOutputs([
      { label: 'writing a document', score: 0.24 },
      { label: 'reading technical documentation', score: 0.16 },
    ]);

    const voted = voteVisionDecisions([a1, a2, a3]);
    expect(voted.decidedCategory).toBe('entertainment');
  });
});
