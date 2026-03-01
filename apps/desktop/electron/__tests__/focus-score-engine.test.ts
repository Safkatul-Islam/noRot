import { describe, it, expect } from 'vitest';
import { FocusScoreEngine } from '@norot/shared';

describe('FocusScoreEngine', () => {
  it('decreases by 3 points/sec while distracting at low switch rate', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 100, recoveryPerSec: 2 });

    for (let i = 0; i < 10; i++) {
      engine.tick({
        activeCategory: 'social',
        appSwitchesLast5Min: 0,
        elapsedMs: 1000,
      });
    }

    expect(engine.getFocusScore()).toBe(70);
  });

  it('can pause decay while distracting via decayScale=0', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 100, recoveryPerSec: 2 });

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
    const engine = new FocusScoreEngine({ initialFocusScore: 100, recoveryPerSec: 2 });

    for (let i = 0; i < 10; i++) {
      engine.tick({
        activeCategory: 'social',
        appSwitchesLast5Min: 0,
        elapsedMs: 1000,
        decayScale: 0.5,
      });
    }

    // base decay at low switch rate is 3/sec -> half-rate is 1.5/sec
    expect(engine.getFocusScore()).toBe(85);
  });

  it('caps decay at 6 points/sec at very high switch rate', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 100, recoveryPerSec: 2 });

    for (let i = 0; i < 10; i++) {
      engine.tick({
        activeCategory: 'entertainment',
        appSwitchesLast5Min: 100, // 20/min -> normalized=1.0 -> decay=6/sec
        elapsedMs: 1000,
      });
    }

    expect(engine.getFocusScore()).toBe(40);
  });

  it('recovers by 2 points/sec while not distracting', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 40, recoveryPerSec: 2 });

    for (let i = 0; i < 10; i++) {
      engine.tick({
        activeCategory: 'productive',
        appSwitchesLast5Min: 0,
        elapsedMs: 1000,
      });
    }

    expect(engine.getFocusScore()).toBe(60);
  });

  it('clamps at 0 and 100', () => {
    const engine = new FocusScoreEngine({ initialFocusScore: 2, recoveryPerSec: 2 });
    engine.tick({
      activeCategory: 'entertainment',
      appSwitchesLast5Min: 100, // decay=6/sec
      elapsedMs: 1000,
    });
    expect(engine.getFocusScore()).toBe(0);

    for (let i = 0; i < 100; i++) {
      engine.tick({
        activeCategory: 'neutral',
        appSwitchesLast5Min: 0,
        elapsedMs: 1000,
      });
    }
    expect(engine.getFocusScore()).toBe(100);
  });
});
