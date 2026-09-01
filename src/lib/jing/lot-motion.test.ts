import { describe, expect, it } from 'vitest';
import { frameBlendAt, LOT_MOTION_PROFILES, phaseAt } from './lot-motion';

describe('lot motion profiles', () => {
  it('defines a complete ordered frame sequence for every collection', () => {
    for (const profile of Object.values(LOT_MOTION_PROFILES)) {
      expect(profile.cues.map((cue) => cue.frame)).toEqual(
        Array.from({ length: profile.cues.length }, (_, index) => index),
      );
      expect(profile.cues).toHaveLength(16);
      expect(profile.cues.every((cue, index) => index === 0 || cue.at > profile.cues[index - 1].at)).toBe(true);
      expect(profile.cues[1].at).toBeGreaterThanOrEqual(300);
      expect(profile.fallAt).toBeGreaterThan(profile.emergingAt);
      expect(profile.landAt).toBeGreaterThan(profile.fallAt);
      expect(profile.unfoldingAt).toBeGreaterThan(profile.landAt);
      expect(profile.duration).toBeGreaterThan(profile.cues.at(-1)!.at);
    }
  });

  it('holds a pose before blending briefly into the next pose', () => {
    for (const profile of Object.values(LOT_MOTION_PROFILES)) {
      expect(frameBlendAt(profile, 100)).toEqual({ frame: 0, nextFrame: 1, mix: 0 });
      expect(frameBlendAt(profile, profile.cues[1].at - 5).mix).toBeGreaterThan(0.9);
      expect(frameBlendAt(profile, profile.duration)).toEqual({ frame: 15, nextFrame: 15, mix: 0 });
    }
  });

  it('moves through shaking, emergence, landing, and paper-unfurl phases', () => {
    const profile = LOT_MOTION_PROFILES.guandi;
    expect(phaseAt(profile, 0)).toBe('shaking');
    expect(phaseAt(profile, profile.emergingAt)).toBe('emerging');
    expect(phaseAt(profile, profile.fallAt)).toBe('landing');
    expect(phaseAt(profile, profile.unfoldingAt)).toBe('unfurling');
  });
});
