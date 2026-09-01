export type LotMotionCollectionId = 'guanyin' | 'luzu' | 'guandi';
export type LotMotionPhase = 'shaking' | 'emerging' | 'landing' | 'unfurling';

export interface LotMotionCue {
  at: number;
  frame: number;
}

export interface LotMotionProfile {
  duration: number;
  emergingAt: number;
  fallAt: number;
  unfoldingAt: number;
  landAt: number;
  cues: readonly LotMotionCue[];
  keyframes: readonly Keyframe[];
}

const frameOnlyKeyframes: readonly Keyframe[] = [
  { offset: 0, transform: 'translate3d(0, 0, 0) rotate(0deg) scale(1)' },
  { offset: 1, transform: 'translate3d(0, 0, 0) rotate(0deg) scale(1)' },
];

export const LOT_MOTION_PROFILES: Record<LotMotionCollectionId, LotMotionProfile> = {
  guanyin: {
    duration: 4200,
    emergingAt: 1850,
    fallAt: 2850,
    unfoldingAt: 3900,
    landAt: 3330,
    cues: [
      { at: 0, frame: 0 }, { at: 340, frame: 1 }, { at: 600, frame: 2 },
      { at: 850, frame: 3 }, { at: 1100, frame: 4 }, { at: 1350, frame: 5 },
      { at: 1600, frame: 6 }, { at: 1850, frame: 7 }, { at: 2100, frame: 8 },
      { at: 2350, frame: 9 }, { at: 2600, frame: 10 }, { at: 2850, frame: 11 },
      { at: 3100, frame: 12 }, { at: 3330, frame: 13 }, { at: 3520, frame: 14 },
      { at: 3700, frame: 15 },
    ],
    keyframes: frameOnlyKeyframes,
  },
  luzu: {
    duration: 4060,
    emergingAt: 1760,
    fallAt: 2720,
    unfoldingAt: 3760,
    landAt: 3190,
    cues: [
      { at: 0, frame: 0 }, { at: 320, frame: 1 }, { at: 560, frame: 2 },
      { at: 800, frame: 3 }, { at: 1040, frame: 4 }, { at: 1280, frame: 5 },
      { at: 1520, frame: 6 }, { at: 1760, frame: 7 }, { at: 2000, frame: 8 },
      { at: 2240, frame: 9 }, { at: 2480, frame: 10 }, { at: 2720, frame: 11 },
      { at: 2960, frame: 12 }, { at: 3190, frame: 13 }, { at: 3380, frame: 14 },
      { at: 3560, frame: 15 },
    ],
    keyframes: frameOnlyKeyframes,
  },
  guandi: {
    duration: 4480,
    emergingAt: 2050,
    fallAt: 3170,
    unfoldingAt: 4200,
    landAt: 3670,
    cues: [
      { at: 0, frame: 0 }, { at: 360, frame: 1 }, { at: 650, frame: 2 },
      { at: 930, frame: 3 }, { at: 1210, frame: 4 }, { at: 1490, frame: 5 },
      { at: 1770, frame: 6 }, { at: 2050, frame: 7 }, { at: 2330, frame: 8 },
      { at: 2610, frame: 9 }, { at: 2890, frame: 10 }, { at: 3170, frame: 11 },
      { at: 3450, frame: 12 }, { at: 3670, frame: 13 }, { at: 3860, frame: 14 },
      { at: 4040, frame: 15 },
    ],
    keyframes: frameOnlyKeyframes,
  },
};

export interface LotFrameBlend {
  frame: number;
  nextFrame: number;
  mix: number;
}

const smoothstep = (value: number) => value * value * (3 - 2 * value);

export function frameBlendAt(profile: LotMotionProfile, elapsedMs: number): LotFrameBlend {
  const elapsed = Math.max(0, Math.min(profile.duration, elapsedMs));
  let cueIndex = profile.cues.length - 1;
  for (let index = 0; index < profile.cues.length - 1; index += 1) {
    if (elapsed < profile.cues[index + 1].at) {
      cueIndex = index;
      break;
    }
  }
  const cue = profile.cues[cueIndex];
  const next = profile.cues[Math.min(cueIndex + 1, profile.cues.length - 1)];
  if (cue === next) return { frame: cue.frame, nextFrame: cue.frame, mix: 0 };

  const segmentProgress = (elapsed - cue.at) / (next.at - cue.at);
  // Hold the readable pose, then use a short blend as motion blur before the
  // next key pose. A full-duration dissolve makes the carved tube look doubled.
  const blendProgress = Math.max(0, Math.min(1, (segmentProgress - 0.72) / 0.28));
  return { frame: cue.frame, nextFrame: next.frame, mix: smoothstep(blendProgress) };
}

export function phaseAt(profile: LotMotionProfile, elapsedMs: number): LotMotionPhase {
  if (elapsedMs >= profile.unfoldingAt) return 'unfurling';
  if (elapsedMs >= profile.fallAt) return 'landing';
  if (elapsedMs >= profile.emergingAt) return 'emerging';
  return 'shaking';
}
