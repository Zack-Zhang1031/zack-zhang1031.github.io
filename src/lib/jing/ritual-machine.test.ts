import { describe, expect, it } from 'vitest';
import {
  createBuddhistRitualState,
  getBuddhistReducedSteps,
  getBuddhistRitualSequence,
  createTaoistRitualState,
  getTaoistReducedSteps,
  getTaoistRitualSequence,
  transitionTaoistRitual,
  transitionBuddhistRitual,
} from './ritual-machine';

describe('buddhist ritual machine', () => {
  it('builds a complete three-bow sequence with three prostrations', () => {
    const sequence = getBuddhistRitualSequence('complete');
    expect(sequence.filter((step) => step.pose === 'prostrate')).toHaveLength(3);
    expect(sequence[0]?.pose).toBe('ready');
    expect(sequence.at(-1)?.pose).toBe('return');
    expect(sequence.reduce((total, step) => total + step.duration, 0)).toBeGreaterThanOrEqual(10_000);
    expect(sequence.reduce((total, step) => total + step.duration, 0)).toBeLessThanOrEqual(15_000);
  });

  it('does not allow selection to interrupt a running ritual', () => {
    let state = createBuddhistRitualState('complete');
    state = transitionBuddhistRitual(state, { type: 'START' });
    state = transitionBuddhistRitual(state, { type: 'SELECT', action: 'bow' });
    expect(state.action).toBe('complete');
    expect(state.status).toBe('running');
  });

  it('offers explicit static steps when motion is reduced', () => {
    expect(getBuddhistReducedSteps('complete')).toHaveLength(3);
    expect(getBuddhistReducedSteps('kneel')[0]?.pose).toBe('prostrate');
  });
});

describe('taoist ritual machine', () => {
  it('builds a complete gongshou ritual with every production pose', () => {
    const sequence = getTaoistRitualSequence('complete');
    expect(sequence.map((step) => step.pose)).toEqual(
      expect.arrayContaining(['ready', 'hands', 'bow', 'respect', 'return']),
    );
    expect(sequence.at(-1)?.pose).toBe('return');
  });

  it('locks action selection while the ritual is running', () => {
    let state = createTaoistRitualState('complete');
    state = transitionTaoistRitual(state, { type: 'START' });
    state = transitionTaoistRitual(state, { type: 'SELECT', action: 'bow' });
    expect(state.action).toBe('complete');
    expect(state.status).toBe('running');
  });

  it('offers a clear static sequence for reduced motion', () => {
    expect(getTaoistReducedSteps('complete').map((step) => step.pose)).toEqual(['hands', 'respect', 'return']);
  });
});
