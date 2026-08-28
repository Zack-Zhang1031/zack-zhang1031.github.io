import { describe, expect, it } from 'vitest';
import { HEXAGRAM_BY_PATTERN, HEXAGRAMS } from './hexagrams';

describe('64 hexagram table', () => {
  it('contains all 64 binary patterns exactly once', () => {
    expect(HEXAGRAMS).toHaveLength(64);
    expect(HEXAGRAM_BY_PATTERN.size).toBe(64);
    for (const hexagram of HEXAGRAMS) {
      expect(hexagram.pattern).toMatch(/^[01]{6}$/);
    }
  });

  it('uses unique King Wen sequence numbers 1—64', () => {
    const seqs = HEXAGRAMS.map((h) => h.seq).sort((a, b) => a - b);
    expect(seqs).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
  });

  it('anchors the traditional cornerstones', () => {
    expect(HEXAGRAM_BY_PATTERN.get('111111')).toMatchObject({ seq: 1, name: '乾为天' });
    expect(HEXAGRAM_BY_PATTERN.get('000000')).toMatchObject({ seq: 2, name: '坤为地' });
    expect(HEXAGRAM_BY_PATTERN.get('101010')).toMatchObject({ seq: 63, name: '水火既济' });
    expect(HEXAGRAM_BY_PATTERN.get('010101')).toMatchObject({ seq: 64, name: '火水未济' });
  });

  it('builds every pattern from the eight-trigram table', () => {
    // 泰：下乾上坤 → 111000；否：下坤上乾 → 000111
    expect(HEXAGRAM_BY_PATTERN.get('111000')).toMatchObject({ seq: 11, name: '地天泰' });
    expect(HEXAGRAM_BY_PATTERN.get('000111')).toMatchObject({ seq: 12, name: '天地否' });
  });
});
