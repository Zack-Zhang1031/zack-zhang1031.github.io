import { describe, expect, it } from 'vitest';
import { BAGUA, WUXING, WUXING_ORDER, type TrigramLine } from './yixue';

describe('wuxing reference data', () => {
  it('lists exactly five elements in the generating order', () => {
    expect(WUXING_ORDER).toEqual(['木', '火', '土', '金', '水']);
    expect(Object.keys(WUXING).sort()).toEqual([...WUXING_ORDER].sort());
  });

  it('keeps generating and controlling cycles mutually consistent', () => {
    for (const [index, name] of WUXING_ORDER.entries()) {
      const info = WUXING[name];
      expect(info.sheng).toBe(WUXING_ORDER[(index + 1) % 5]);
      expect(info.ke).toBe(WUXING_ORDER[(index + 2) % 5]);
    }
  });

  it('gives every element a direction and season note', () => {
    for (const name of WUXING_ORDER) {
      expect(WUXING[name].direction.trim()).not.toBe('');
      expect(WUXING[name].season.trim()).not.toBe('');
    }
  });
});

describe('bagua reference data', () => {
  it('lists exactly eight unique trigrams', () => {
    expect(BAGUA).toHaveLength(8);
    expect(new Set(BAGUA.map((g) => g.name)).size).toBe(8);
    expect(new Set(BAGUA.map((g) => g.symbol)).size).toBe(8);
  });

  it('encodes every trigram as three unique bottom-to-top lines', () => {
    const seen = new Set<string>();
    for (const gua of BAGUA) {
      expect(gua.lines).toHaveLength(3);
      for (const line of gua.lines) {
        expect([0, 1]).toContain(line satisfies TrigramLine);
      }
      const key = gua.lines.join('');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(8);
  });

  it('matches the traditional bottom-to-top line patterns', () => {
    const byName = Object.fromEntries(BAGUA.map((g) => [g.name, g.lines.join('')]));
    expect(byName).toEqual({
      乾: '111', 兑: '110', 离: '101', 震: '100',
      巽: '011', 坎: '010', 艮: '001', 坤: '000',
    });
  });

  it('pairs every trigram with nature and imagery notes', () => {
    for (const gua of BAGUA) {
      expect(gua.nature.trim()).not.toBe('');
      expect(gua.image.trim()).not.toBe('');
    }
  });
});
