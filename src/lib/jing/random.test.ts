import { describe, expect, it } from 'vitest';
import {
  boundedInt,
  createSeededSource,
  cryptoRandomSource,
} from './random';

describe('cryptoRandomSource', () => {
  it('returns unsigned 32-bit integers', () => {
    for (let i = 0; i < 100; i++) {
      const v = cryptoRandomSource.uint32();
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('createSeededSource', () => {
  it('is deterministic for the same seed', () => {
    const a = createSeededSource(42);
    const b = createSeededSource(42);
    for (let i = 0; i < 10; i++) {
      expect(a.uint32()).toBe(b.uint32());
    }
  });
});

describe('boundedInt', () => {
  it('rejects invalid bounds', () => {
    const src = createSeededSource(1);
    expect(() => boundedInt(src, 0)).toThrow(RangeError);
    expect(() => boundedInt(src, -3)).toThrow(RangeError);
    expect(() => boundedInt(src, 1.5)).toThrow(RangeError);
    expect(() => boundedInt(src, 0x100000000)).toThrow(RangeError);
  });

  it('returns 0 for bound 1 and stays in range for large bounds', () => {
    const src = createSeededSource(7);
    expect(boundedInt(src, 1)).toBe(0);
    for (let i = 0; i < 200; i++) {
      const v = boundedInt(src, 0xffffffff);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(0xffffffff);
    }
  });

  it('rejects values at or above the rejection limit instead of biasing', () => {
    // bound 3: limit = floor(2^32 / 3) * 3 = 4294967295, so only
    // 4294967295 itself is rejected. Feed it once, then a normal value.
    const values = [0xffffffff, 5];
    const src = { uint32: () => values.shift() ?? 5 };
    expect(boundedInt(src, 3)).toBe(5 % 3);
    expect(values).toHaveLength(0);
  });

  it('is roughly uniform over many draws', () => {
    const src = createSeededSource(20260827);
    const bound = 6;
    const counts = new Array(bound).fill(0);
    const draws = 60_000;
    for (let i = 0; i < draws; i++) counts[boundedInt(src, bound)]++;
    const expected = draws / bound;
    for (const c of counts) {
      // generous 5-sigma-ish band for a seeded deterministic stream
      expect(Math.abs(c - expected)).toBeLessThan(expected * 0.05);
    }
  });
});
