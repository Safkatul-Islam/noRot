import { describe, it, expect } from 'vitest';
import { FocusScoreEngine } from '@norot/shared';

describe('FocusScoreEngine', () => {
  it('starts at 100 (Locked In)', () => {
    const engine = new FocusScoreEngine();
    expect(engine.getFocusScore()).toBe(100);
  });

  it('drops one level every 5 seconds of distraction', () => {
    const engine = new FocusScoreEngine();

    // 5 seconds of social → level 1 (score 75)
    for (let i = 0; i < 5; i++) {
      engine.tick({ activeCategory: 'social', appSwitchesLast5Min: 0, elapsedMs: 1000 });
    }
    expect(engine.getFocusScore()).toBe(75);

    // 5 more seconds → level 2 (score 50)
    for (let i = 0; i < 5; i++) {
      engine.tick({ activeCategory: 'social', appSwitchesLast5Min: 0, elapsedMs: 1000 });
    }
    expect(engine.getFocusScore()).toBe(50);
  });

  it('clamps at 0 after extended distraction', () => {
    const engine = new FocusScoreEngine();

    for (let i = 0; i < 30; i++) {
      engine.tick({ activeCategory: 'entertainment', appSwitchesLast5Min: 0, elapsedMs: 1000 });
    }
    expect(engine.getFocusScore()).toBe(0);
  });

  it('recovers one level every 5 seconds of productive use (Locked In requires 10s)', () => {
    const engine = new FocusScoreEngine();

    // Tank the score to level 4 (score 0)
    for (let i = 0; i < 20; i++) {
      engine.tick({ activeCategory: 'social', appSwitchesLast5Min: 0, elapsedMs: 1000 });
    }
    expect(engine.getFocusScore()).toBe(0);

    // 5 seconds → level 3 (score 25)
    for (let i = 0; i < 5; i++) {
      engine.tick({ activeCategory: 'productive', appSwitchesLast5Min: 0, elapsedMs: 1000 });
    }
    expect(engine.getFocusScore()).toBe(25);

    // 5 more seconds → level 2 (score 50)
    for (let i = 0; i < 5; i++) {
      engine.tick({ activeCategory: 'productive', appSwitchesLast5Min: 0, elapsedMs: 1000 });
    }
    expect(engine.getFocusScore()).toBe(50);

    // 5 more seconds → level 1 (score 75)
    for (let i = 0; i < 5; i++) {
      engine.tick({ activeCategory: 'productive', appSwitchesLast5Min: 0, elapsedMs: 1000 });
    }
    expect(engine.getFocusScore()).toBe(75);

    // Next 5 seconds: still level 1 — need a full 10s of productive work to get back to Locked In
    for (let i = 0; i < 5; i++) {
      engine.tick({ activeCategory: 'productive', appSwitchesLast5Min: 0, elapsedMs: 1000 });
    }
    expect(engine.getFocusScore()).toBe(75);

    // 5 more seconds (10s total at level 1) → level 0 (score 100, Locked In)
    for (let i = 0; i < 5; i++) {
      engine.tick({ activeCategory: 'productive', appSwitchesLast5Min: 0, elapsedMs: 1000 });
    }
    expect(engine.getFocusScore()).toBe(100);
  });

  it('accepts decayScale but ignores it (interface compatibility)', () => {
    const engine = new FocusScoreEngine();

    // decayScale = 0 should NOT prevent decay in the simple engine
    for (let i = 0; i < 5; i++) {
      engine.tick({
        activeCategory: 'social',
        appSwitchesLast5Min: 0,
        elapsedMs: 1000,
        decayScale: 0,
      });
    }

    expect(engine.getFocusScore()).toBe(75);
  });

  it('neutral apps freeze the score', () => {
    const engine = new FocusScoreEngine();

    // Drop to level 2
    for (let i = 0; i < 10; i++) {
      engine.tick({ activeCategory: 'social', appSwitchesLast5Min: 0, elapsedMs: 1000 });
    }
    expect(engine.getFocusScore()).toBe(50);

    // 30 seconds of neutral — no change
    for (let i = 0; i < 30; i++) {
      engine.tick({ activeCategory: 'neutral', appSwitchesLast5Min: 0, elapsedMs: 1000 });
    }
    expect(engine.getFocusScore()).toBe(50);
  });
});
