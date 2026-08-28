import { describe, expect, it } from 'vitest';
import {
  YARROW_TOTAL,
  castCoins,
  castManual,
  castNumbers,
  castTime,
  castYarrow,
  divineYarrowLine,
  throwCoins,
} from './cast';
import { createSeededSource, type RandomSource } from '../random';
import { isYaoValue } from './lines';

/** Scripted random source cycling through the given uint32 values. */
function scripted(values: number[]): RandomSource {
  let index = 0;
  return {
    uint32() {
      const value = values[index % values.length];
      index += 1;
      return value >>> 0;
    },
  };
}

describe('coin casting', () => {
  it('sums three coins as 字三背二', () => {
    expect(throwCoins(scripted([1, 1, 1])).value).toBe(9); // 三字
    expect(throwCoins(scripted([0, 0, 0])).value).toBe(6); // 三背
    expect(throwCoins(scripted([1, 1, 0])).value).toBe(8); // 两字一背
    expect(throwCoins(scripted([1, 0, 0])).value).toBe(7); // 一字两背
  });

  it('casts six lines bottom-to-top', () => {
    const { values, throws } = castCoins(createSeededSource(42));
    expect(throws).toHaveLength(6);
    expect(values).toHaveLength(6);
    for (const value of values) expect(isYaoValue(value)).toBe(true);
  });

  it('is reproducible for the same seed', () => {
    expect(castCoins(createSeededSource(7)).values)
      .toEqual(castCoins(createSeededSource(7)).values);
  });
});

describe('yarrow casting', () => {
  it('conserves 49 stalks through every change', () => {
    const source = createSeededSource(2026);
    for (let i = 0; i < 200; i += 1) {
      const line = divineYarrowLine(source);
      let previous = YARROW_TOTAL;
      for (const change of line.changes) {
        expect(change.left + change.right).toBe(previous);
        expect(change.left).toBeGreaterThanOrEqual(1);
        expect(change.right - 1).toBeGreaterThanOrEqual(1);
        expect(previous - change.removed).toBe(change.remaining);
        previous = change.remaining;
      }
      expect(isYaoValue(line.value)).toBe(true);
    }
  });

  it('removes 5 or 9 on the first change and 4 or 8 afterwards', () => {
    const source = createSeededSource(99);
    for (let i = 0; i < 200; i += 1) {
      const [first, second, third] = divineYarrowLine(source).changes;
      expect([5, 9]).toContain(first.removed);
      expect([4, 8]).toContain(second.removed);
      expect([4, 8]).toContain(third.removed);
    }
  });

  it('casts six valid lines', () => {
    const { values, lines } = castYarrow(createSeededSource(1));
    expect(lines).toHaveLength(6);
    expect(values.every(isYaoValue)).toBe(true);
  });
});

describe('number casting (梅花简式)', () => {
  it('maps 3, 5, 8 to 火风鼎 with the second line moving', () => {
    const cast = castNumbers(3, 5, 8);
    expect(cast.upperName).toBe('离');  // 3 → 离
    expect(cast.lowerName).toBe('巽');  // 5 → 巽
    expect(cast.moving).toBe(2);        // 8 mod 6 = 2
    // 下巽 [8,9,7]（二爻动），上离 [7,8,7]
    expect(cast.values).toEqual([8, 9, 7, 7, 8, 7]);
    expect(cast.formula).toContain('mod 8');
    expect(cast.formula).toContain('mod 6');
  });

  it('normalizes exact multiples to 8 and 6', () => {
    const cast = castNumbers(8, 16, 6);
    expect(cast.upperName).toBe('坤');
    expect(cast.lowerName).toBe('坤');
    expect(cast.moving).toBe(6);
    expect(cast.values).toEqual([8, 8, 8, 8, 8, 6]);
  });
});

describe('time casting (梅花简式)', () => {
  it('maps 2024-02-04 12:00 to 水泽节 with the second line moving', () => {
    // 上卦 (2024+2+4)=2030 mod 8 → 6 坎；下卦 2042 mod 8 → 2 兑；动爻 2042 mod 6 → 2
    const cast = castTime(2024, 2, 4, 12);
    expect(cast.upperName).toBe('坎');
    expect(cast.lowerName).toBe('兑');
    expect(cast.moving).toBe(2);
    expect(cast.values).toEqual([7, 9, 8, 8, 7, 8]);
    expect(cast.formula).toContain('2024+2+4');
  });
});

describe('manual casting', () => {
  it('accepts six valid values, including numeric strings', () => {
    expect(castManual([7, '8', 9, 7, 6, 8])).toEqual([7, 8, 9, 7, 6, 8]);
  });

  it('rejects wrong length and out-of-model values with line numbers', () => {
    expect(() => castManual([7, 8, 9])).toThrow('需要六爻');
    expect(() => castManual([7, 8, 5, 7, 6, 8])).toThrow('第 3 爻');
    expect(() => castManual([7, 8, 'x', 7, 6, 8])).toThrow('第 3 爻');
  });
});
