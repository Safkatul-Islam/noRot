import { describe, it, expect } from 'vitest';
import { FocusScoreEngine } from '@norot/shared';

describe('FocusScoreEngine', () => {
  it('decays while distracting', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 100 });
    for (let i = 0; i < 20; i++) {
      engine.tick({ activeCategory: 'social', appSwitchesLast5Min: 0, elapsedMs: 1000 });
    }
    expect(engine.getFocusScore()).toBeLessThan(100);
  });

  it('can pause decay while distracting via decayScale=0', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 100 });

    for (let i = 0; i < 10; i++) {
      engine.tick({
        activeCategory: 'social',
        appSwitchesLast5Min: 0,
        elapsedMs: 1000,
        decayScale: 0,
      });
    }

    expect(engine.getFocusScore()).toBe(100);
  });

  it('can slow decay while distracting via decayScale=0.5', () => {
    const engineFast = new FocusScoreEngine({ initialFocusScore: 100 });
    const engineSlow = new FocusScoreEngine({ initialFocusScore: 100 });

    for (let i = 0; i < 20; i++) {
      engineFast.tick({ activeCategory: 'social', appSwitchesLast5Min: 0, elapsedMs: 1000 });
      engineSlow.tick({
        activeCategory: 'social',
        appSwitchesLast5Min: 0,
        elapsedMs: 1000,
        decayScale: 0.5,
      });
    }

    expect(engineSlow.getFocusScore()).toBeGreaterThan(engineFast.getFocusScore());
  });

  it('decays faster at very high switch rate', () => {
    const engineLow = new FocusScoreEngine({ initialFocusScore: 100 });
    const engineHigh = new FocusScoreEngine({ initialFocusScore: 100 });

    for (let i = 0; i < 30; i++) {
      engineLow.tick({ activeCategory: 'entertainment', appSwitchesLast5Min: 0, elapsedMs: 1000 });
      engineHigh.tick({
        activeCategory: 'entertainment',
        appSwitchesLast5Min: 100,
        elapsedMs: 1000,
      });
    }

    expect(engineHigh.getFocusScore()).toBeLessThan(engineLow.getFocusScore());
  });

  it('recovers while productive', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 40 });
    for (let i = 0; i < 30; i++) {
      engine.tick({ activeCategory: 'productive', appSwitchesLast5Min: 0, elapsedMs: 1000 });
    }
    expect(engine.getFocusScore()).toBeGreaterThan(40);
  });

  it('clamps at 0 and 100', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 2 });

    for (let i = 0; i < 20; i++) {
      engine.tick({ activeCategory: 'entertainment', appSwitchesLast5Min: 100, elapsedMs: 1000 });
    }
    expect(engine.getFocusScore()).toBe(0);

    for (let i = 0; i < 200; i++) {
      engine.tick({ activeCategory: 'productive', appSwitchesLast5Min: 0, elapsedMs: 10_000 });
    }
    expect(engine.getFocusScore()).toBe(100);
  });
});
