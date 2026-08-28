/**
 * The 64 hexagrams in King Wen sequence. Only structural facts are
 * stored here — sequence, name, and constituent trigrams — no judgment
 * text. Patterns are derived from the trigram table in yixue.ts
 * (bottom-to-top lines, 1 = yang).
 */

import { BAGUA } from './yixue';

export interface Hexagram {
  /** 卦序（1—64） */
  seq: number;
  name: string;
  /** 下卦（内卦） */
  lower: string;
  /** 上卦（外卦） */
  upper: string;
  /** 自下而上六爻，'1' 阳 '0' 阴 */
  pattern: string;
}

const TRIGRAM_LINES = new Map(BAGUA.map((g) => [g.name, g.lines] as const));

function patternOf(lower: string, upper: string): string {
  const l = TRIGRAM_LINES.get(lower);
  const u = TRIGRAM_LINES.get(upper);
  if (!l || !u) throw new Error(`unknown trigram: ${lower}/${upper}`);
  return [...l, ...u].join('');
}

const RAW: ReadonlyArray<readonly [number, string, string, string]> = [
  [1, '乾为天', '乾', '乾'], [2, '坤为地', '坤', '坤'],
  [3, '水雷屯', '震', '坎'], [4, '山水蒙', '坎', '艮'],
  [5, '水天需', '乾', '坎'], [6, '天水讼', '坎', '乾'],
  [7, '地水师', '坎', '坤'], [8, '水地比', '坤', '坎'],
  [9, '风天小畜', '乾', '巽'], [10, '天泽履', '兑', '乾'],
  [11, '地天泰', '乾', '坤'], [12, '天地否', '坤', '乾'],
  [13, '天火同人', '离', '乾'], [14, '火天大有', '乾', '离'],
  [15, '地山谦', '艮', '坤'], [16, '雷地豫', '坤', '震'],
  [17, '泽雷随', '震', '兑'], [18, '山风蛊', '巽', '艮'],
  [19, '地泽临', '兑', '坤'], [20, '风地观', '坤', '巽'],
  [21, '火雷噬嗑', '震', '离'], [22, '山火贲', '离', '艮'],
  [23, '山地剥', '坤', '艮'], [24, '地雷复', '震', '坤'],
  [25, '天雷无妄', '震', '乾'], [26, '山天大畜', '乾', '艮'],
  [27, '山雷颐', '震', '艮'], [28, '泽风大过', '巽', '兑'],
  [29, '坎为水', '坎', '坎'], [30, '离为火', '离', '离'],
  [31, '泽山咸', '艮', '兑'], [32, '雷风恒', '巽', '震'],
  [33, '天山遁', '艮', '乾'], [34, '雷天大壮', '乾', '震'],
  [35, '火地晋', '坤', '离'], [36, '地火明夷', '离', '坤'],
  [37, '风火家人', '离', '巽'], [38, '火泽睽', '兑', '离'],
  [39, '水山蹇', '艮', '坎'], [40, '雷水解', '坎', '震'],
  [41, '山泽损', '兑', '艮'], [42, '风雷益', '震', '巽'],
  [43, '泽天夬', '乾', '兑'], [44, '天风姤', '巽', '乾'],
  [45, '泽地萃', '坤', '兑'], [46, '地风升', '巽', '坤'],
  [47, '泽水困', '坎', '兑'], [48, '水风井', '巽', '坎'],
  [49, '泽火革', '离', '兑'], [50, '火风鼎', '巽', '离'],
  [51, '震为雷', '震', '震'], [52, '艮为山', '艮', '艮'],
  [53, '风山渐', '艮', '巽'], [54, '雷泽归妹', '兑', '震'],
  [55, '雷火丰', '离', '震'], [56, '火山旅', '艮', '离'],
  [57, '巽为风', '巽', '巽'], [58, '兑为泽', '兑', '兑'],
  [59, '风水涣', '坎', '巽'], [60, '水泽节', '兑', '坎'],
  [61, '风泽中孚', '兑', '巽'], [62, '雷山小过', '艮', '震'],
  [63, '水火既济', '离', '坎'], [64, '火水未济', '坎', '离'],
];

export const HEXAGRAMS: readonly Hexagram[] = RAW.map(([seq, name, lower, upper]) => ({
  seq, name, lower, upper, pattern: patternOf(lower, upper),
}));

export const HEXAGRAM_BY_PATTERN: ReadonlyMap<string, Hexagram> = new Map(
  HEXAGRAMS.map((hexagram) => [hexagram.pattern, hexagram]),
);
