import { describe, expect, it } from 'vitest';
import {
  changedHexagram,
  changedLines,
  deriveAll,
  hexagramFor,
  movingPositions,
  mutualHexagram,
  oppositeHexagram,
  reversedHexagram,
  yangPattern,
} from './derive';
import { HEXAGRAMS } from '../../../data/jing/hexagrams';
import type { YaoValue } from './lines';

const MANUAL: YaoValue[] = [7, 8, 9, 7, 6, 8];

describe('hexagram derivation', () => {
  it('maps all-yang and all-yin lines to 乾 and 坤', () => {
    expect(hexagramFor([7, 7, 7, 7, 7, 7]).name).toBe('乾为天');
    expect(hexagramFor([8, 8, 8, 8, 8, 8]).name).toBe('坤为地');
  });

  it('rejects anything but six lines', () => {
    expect(() => yangPattern([7, 7, 7])).toThrow(RangeError);
  });

  it('derives the manual fixture [7,8,9,7,6,8]', () => {
    // 下离上震 → 雷火丰；三爻九、五爻六动
    const views = deriveAll(MANUAL);
    expect(views.primary.name).toBe('雷火丰');
    expect(views.moving).toEqual([3, 5]);
    expect(views.changed?.name).toBe('泽雷随');   // 9→8, 6→7 → 下震上兑
    expect(views.mutual.name).toBe('泽风大过');     // 二三四=巽，三四五=兑
    expect(views.opposite.name).toBe('风水涣');     // 错卦：101100 → 010011（下坎上巽）
    expect(views.reversed.name).toBe('火山旅');     // 综卦
  });

  it('returns null changed view when no line moves', () => {
    expect(changedHexagram([7, 8, 7, 8, 7, 8])).toBeNull();
    expect(movingPositions([7, 8, 7, 8, 7, 8])).toEqual([]);
  });

  it('changedLines leaves still lines untouched', () => {
    expect(changedLines(MANUAL)).toEqual([7, 8, 8, 7, 7, 8]);
  });

  it('opposite and reversed are involutions across all 64 hexagrams', () => {
    for (const hexagram of HEXAGRAMS) {
      const lines = hexagram.pattern.split('').map((c) => (c === '1' ? 7 : 8)) as YaoValue[];
      expect(oppositeHexagram(oppositeHexagram(lines).pattern
        .split('').map((c) => (c === '1' ? 7 : 8)) as YaoValue[]).pattern).toBe(hexagram.pattern);
      expect(reversedHexagram(reversedHexagram(lines).pattern
        .split('').map((c) => (c === '1' ? 7 : 8)) as YaoValue[]).pattern).toBe(hexagram.pattern);
    }
  });

  it('opposite of 乾 is 坤; reversed 坤 is still 坤', () => {
    expect(oppositeHexagram([7, 7, 7, 7, 7, 7]).name).toBe('坤为地');
    expect(reversedHexagram([8, 8, 8, 8, 8, 8]).name).toBe('坤为地');
    expect(mutualHexagram([7, 7, 7, 7, 7, 7]).name).toBe('乾为天');
  });
});
