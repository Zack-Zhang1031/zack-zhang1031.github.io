import { describe, expect, it } from 'vitest';
import { GUANYIN_COLLECTION } from './guanyin';
import { LUZU_COLLECTION } from './luzu';
import { GUANDI_COLLECTION } from './guandi';
import { validateCollection } from '../../../lib/jing/lots/validate';
import { drawLot, throwCups, throwCupsOnce } from '../../../lib/jing/lots/draw';
import { createSeededSource, type RandomSource } from '../../../lib/jing/random';

const COLLECTIONS = [GUANYIN_COLLECTION, LUZU_COLLECTION, GUANDI_COLLECTION];

describe('three 100-lot collections', () => {
  it('keeps three independent collections with correct traditions', () => {
    expect(GUANYIN_COLLECTION.tradition).toBe('buddhist');
    expect(LUZU_COLLECTION.tradition).toBe('taoist');
    expect(GUANDI_COLLECTION.tradition).toBe('taoist');
    const ids = new Set(COLLECTIONS.map((c) => c.id));
    expect(ids.size).toBe(3);
  });

  for (const collection of COLLECTIONS) {
    it(`${collection.id} validates: 100 complete, sourced, safe entries`, () => {
      expect(validateCollection(collection)).toEqual([]);
    });
  }

  it('does not share lot objects across collections', () => {
    const all = COLLECTIONS.flatMap((c) => c.lots);
    expect(new Set(all).size).toBe(all.length);
  });

  it('keeps classical verses distinct across collections for shared numbers', () => {
    for (let n = 1; n <= 100; n += 1) {
      const verses = COLLECTIONS.map((c) => c.lots[n - 1].verse.join(''));
      expect(new Set(verses).size).toBe(3);
    }
  });
});

describe('drawLot', () => {
  it('maps injected randomness to a fair index', () => {
    const scripted: RandomSource = { uint32: () => 0 };
    const first = drawLot(GUANYIN_COLLECTION, scripted);
    expect(first.number).toBe(GUANYIN_COLLECTION.lots[0].number);

    const last: RandomSource = { uint32: () => 99 };
    const drawn = drawLot(GUANYIN_COLLECTION, last);
    expect(drawn.number).toBe(GUANYIN_COLLECTION.lots[99].number);
    expect(drawn.collectionId).toBe('guanyin');
  });

  it('covers every lot over many seeded draws', () => {
    const source = createSeededSource(20260828);
    const seen = new Set<number>();
    for (let i = 0; i < 20000; i += 1) {
      seen.add(drawLot(GUANDI_COLLECTION, source).number);
    }
    expect(seen.size).toBe(100);
  });

  it('rejects empty collections', () => {
    const empty = { ...LUZU_COLLECTION, lots: [] };
    expect(() => drawLot(empty, createSeededSource(1))).toThrow(RangeError);
  });
});

describe('divination cups', () => {
  it('maps the four side combinations to three results', () => {
    const seq = [0, 0, 1, 1, 0, 1, 1, 0];
    let i = 0;
    const source: RandomSource = { uint32: () => seq[i++ % seq.length] };
    expect(throwCupsOnce(source)).toBe('yin');
    expect(throwCupsOnce(source)).toBe('xiao');
    expect(throwCupsOnce(source)).toBe('sheng');
    expect(throwCupsOnce(source)).toBe('sheng');
  });

  it('throws three times for a full reading', () => {
    expect(throwCups(createSeededSource(7))).toHaveLength(3);
  });
});
