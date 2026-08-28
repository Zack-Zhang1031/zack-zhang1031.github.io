/**
 * Randomness primitives for Jingxin casting, lots, and cups.
 *
 * UI consumes the `RandomSource` interface; production code uses
 * `cryptoRandomSource` (crypto.getRandomValues) while tests inject
 * deterministic sources. No other module may call Math.random or
 * crypto.getRandomValues directly for casting behaviour.
 */

export interface RandomSource {
  /** Uniform 32-bit unsigned integer. */
  uint32(): number;
}

export const cryptoRandomSource: RandomSource = {
  uint32() {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0];
  },
};

/** Deterministic mulberry32 source for tests and reproducible fixtures. */
export function createSeededSource(seed: number): RandomSource {
  let a = seed >>> 0;
  return {
    uint32() {
      a = (a + 0x6d2b79f5) | 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return (t ^ (t >>> 14)) >>> 0;
    },
  };
}

/**
 * Unbiased integer in [0, bound) using rejection sampling, so small
 * bounds never favour low residues.
 */
export function boundedInt(source: RandomSource, bound: number): number {
  if (!Number.isInteger(bound) || bound <= 0 || bound > 0xffffffff) {
    throw new RangeError(`boundedInt: bound must be an integer in 1..2^32-1, got ${bound}`);
  }
  if (bound === 1) return 0;
  const limit = Math.floor(0x100000000 / bound) * bound;
  let x = source.uint32();
  while (x >= limit) {
    x = source.uint32();
  }
  return x % bound;
}

/** Unbiased boolean coin flip. */
export function bool(source: RandomSource): boolean {
  return boundedInt(source, 2) === 1;
}
