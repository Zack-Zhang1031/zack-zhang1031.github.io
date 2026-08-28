/**
 * Hexagram derivations from six bottom-to-top lines: primary, changed,
 * mutual (互卦), opposite (错卦), and reversed (综卦) views. Pure
 * functions over the canonical line model.
 */

import { HEXAGRAM_BY_PATTERN, type Hexagram } from '../../../data/jing/hexagrams';
import { changedValue, isMoving, isYang, type YaoValue } from './lines';

export function yangPattern(values: readonly YaoValue[]): string {
  if (values.length !== 6) throw new RangeError(`需要六爻，收到 ${values.length} 爻`);
  return values.map((value) => (isYang(value) ? '1' : '0')).join('');
}

export function hexagramFor(values: readonly YaoValue[]): Hexagram {
  const pattern = yangPattern(values);
  const hexagram = HEXAGRAM_BY_PATTERN.get(pattern);
  if (!hexagram) throw new RangeError(`无法识别的卦形：${pattern}`);
  return hexagram;
}

export const primaryHexagram = hexagramFor;

/** 变卦；无动爻时返回 null */
export function changedHexagram(values: readonly YaoValue[]): Hexagram | null {
  if (!values.some(isMoving)) return null;
  return hexagramFor(values.map(changedValue));
}

export function changedLines(values: readonly YaoValue[]): YaoValue[] {
  return values.map(changedValue);
}

/** 互卦：二三四爻为下卦，三四五爻为上卦 */
export function mutualHexagram(values: readonly YaoValue[]): Hexagram {
  if (values.length !== 6) throw new RangeError('需要六爻');
  return hexagramFor([values[1], values[2], values[3], values[2], values[3], values[4]]);
}

/** 错卦：六爻阴阳尽反 */
export function oppositeHexagram(values: readonly YaoValue[]): Hexagram {
  return hexagramFor(values.map((value) => (isYang(value) ? 8 : 7)));
}

/** 综卦：六爻次序颠倒 */
export function reversedHexagram(values: readonly YaoValue[]): Hexagram {
  return hexagramFor([...values].reverse());
}

/** 动爻位置（1—6，自下而上），无动爻返回空数组 */
export function movingPositions(values: readonly YaoValue[]): number[] {
  return values.flatMap((value, index) => (isMoving(value) ? [index + 1] : []));
}

export interface DerivedViews {
  primary: Hexagram;
  changed: Hexagram | null;
  mutual: Hexagram;
  opposite: Hexagram;
  reversed: Hexagram;
  moving: number[];
}

export function deriveAll(values: readonly YaoValue[]): DerivedViews {
  return {
    primary: primaryHexagram(values),
    changed: changedHexagram(values),
    mutual: mutualHexagram(values),
    opposite: oppositeHexagram(values),
    reversed: reversedHexagram(values),
    moving: movingPositions(values),
  };
}
