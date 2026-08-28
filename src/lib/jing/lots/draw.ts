/**
 * Fair lot drawing and divination-cup throws.
 *
 * All randomness flows through an injected `RandomSource` (see random.ts);
 * index mapping uses unbiased `boundedInt`, so every lot 1..100 has equal
 * probability. Nothing is persisted here — callers keep results in memory.
 */

import { boundedInt, type RandomSource } from '../random';
import type { CupResult, DrawResult, LotCollection } from './types';

/** Draw one lot uniformly from a collection. */
export function drawLot(collection: LotCollection, source: RandomSource): DrawResult {
  if (collection.lots.length === 0) {
    throw new RangeError(`drawLot: collection ${collection.id} is empty`);
  }
  const index = boundedInt(source, collection.lots.length);
  const lot = collection.lots[index];
  return { collectionId: collection.id, number: lot.number, lot };
}

/**
 * Throw divination cups once: two convex/flat sides.
 * Both convex (一平一凸 convention) → 圣筊 sheng; both flat → 笑筊 xiao;
 * both curved → 阴筊 yin.
 */
export function throwCupsOnce(source: RandomSource): CupResult {
  const a = boundedInt(source, 2);
  const b = boundedInt(source, 2);
  if (a !== b) return 'sheng';
  return a === 0 ? 'yin' : 'xiao';
}

/** Traditional three-throw reading. */
export function throwCups(source: RandomSource): CupResult[] {
  return [throwCupsOnce(source), throwCupsOnce(source), throwCupsOnce(source)];
}
