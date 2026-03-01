import { describe, it, expect, beforeEach } from 'vitest';
import type { InterventionEvent } from '@norot/shared';
import { clearActiveIntervention, getActiveIntervention, setActiveIntervention } from '../intervention-state';

const makeIntervention = (id: string): InterventionEvent => ({
  id,
  timestamp: new Date().toISOString(),
  score: 42,
  severity: 2 as const,
  persona: 'coach' as const,
  text: 'Test intervention',
  userResponse: 'pending' as const,
  audioPlayed: false,
});

beforeEach(() => {
  clearActiveIntervention();
});

describe('intervention-state', () => {
  it('stores and returns the active intervention', () => {
    const event = makeIntervention('a');
    setActiveIntervention(event);
    expect(getActiveIntervention()).toEqual(event);
  });

  it('clears the active intervention by id', () => {
    setActiveIntervention(makeIntervention('a'));
    clearActiveIntervention('a');
    expect(getActiveIntervention()).toBeNull();
  });

  it('does not clear when the id does not match', () => {
    const event = makeIntervention('a');
    setActiveIntervention(event);
    clearActiveIntervention('b');
    expect(getActiveIntervention()).toEqual(event);
  });

  it('clears unconditionally when no id is provided', () => {
    setActiveIntervention(makeIntervention('a'));
    clearActiveIntervention();
    expect(getActiveIntervention()).toBeNull();
  });
});
