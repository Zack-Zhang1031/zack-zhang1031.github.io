/**
 * Bazi calculation: consumes the calendar engine's pillars and derives
 * Five Elements distribution and Ten Gods. Pure module — no storage,
 * no UI, no direct lunar-typescript import.
 */

import {
  computePillars,
  normalizeInput,
  CALENDAR_RULE_VERSION,
  type FourPillars,
} from '../calendar/engine';
import type { BoundaryWarning, CalendarInput, DerivationStep } from '../calendar/types';

export const BAZI_ALGORITHM_VERSION = 'bazi-1.0.0';

export type WuXing = '木' | '火' | '土' | '金' | '水';

const STEM_ELEMENT: Record<string, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const BRANCH_ELEMENT: Record<string, WuXing> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

const STEM_YIN_YANG: Record<string, '阳' | '阴'> = {
  甲: '阳', 乙: '阴', 丙: '阳', 丁: '阴', 戊: '阳',
  己: '阴', 庚: '阳', 辛: '阴', 壬: '阳', 癸: '阴',
};

/** 十神：以日主为基准的生克关系 */
const SHI_SHEN = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'] as const;
export type ShiShen = (typeof SHI_SHEN)[number];

const HIDDEN_STEMS: Record<string, readonly string[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '戊', '庚'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};

const NA_YIN_PAIRS: ReadonlyArray<readonly [string, string, string]> = [
  ['甲子', '乙丑', '海中金'], ['丙寅', '丁卯', '炉中火'], ['戊辰', '己巳', '大林木'],
  ['庚午', '辛未', '路旁土'], ['壬申', '癸酉', '剑锋金'], ['甲戌', '乙亥', '山头火'],
  ['丙子', '丁丑', '涧下水'], ['戊寅', '己卯', '城头土'], ['庚辰', '辛巳', '白蜡金'],
  ['壬午', '癸未', '杨柳木'], ['甲申', '乙酉', '泉中水'], ['丙戌', '丁亥', '屋上土'],
  ['戊子', '己丑', '霹雳火'], ['庚寅', '辛卯', '松柏木'], ['壬辰', '癸巳', '长流水'],
  ['甲午', '乙未', '沙中金'], ['丙申', '丁酉', '山下火'], ['戊戌', '己亥', '平地木'],
  ['庚子', '辛丑', '壁上土'], ['壬寅', '癸卯', '金箔金'], ['甲辰', '乙巳', '覆灯火'],
  ['丙午', '丁未', '天河水'], ['戊申', '己酉', '大驿土'], ['庚戌', '辛亥', '钗钏金'],
  ['壬子', '癸丑', '桑柘木'], ['甲寅', '乙卯', '大溪水'], ['丙辰', '丁巳', '沙中土'],
  ['戊午', '己未', '天上火'], ['庚申', '辛酉', '石榴木'], ['壬戌', '癸亥', '大海水'],
];

const NA_YIN = new Map(NA_YIN_PAIRS.flatMap(([first, second, name]) => [[first, name], [second, name]]));

const SHENG: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

export function tenGod(dayStem: string, otherStem: string): ShiShen {
  const dayEl = STEM_ELEMENT[dayStem];
  const otherEl = STEM_ELEMENT[otherStem];
  const samePolarity = STEM_YIN_YANG[dayStem] === STEM_YIN_YANG[otherStem];

  let relation: number;
  if (otherEl === dayEl) relation = samePolarity ? 0 : 1;            // 比劫
  else if (SHENG[dayEl] === otherEl) relation = samePolarity ? 2 : 3; // 我生：食伤
  else if (KE[dayEl] === otherEl) relation = samePolarity ? 4 : 5;    // 我克：财
  else if (KE[otherEl] === dayEl) relation = samePolarity ? 6 : 7;    // 克我：官杀
  else relation = samePolarity ? 8 : 9;                               // 生我：印
  return SHI_SHEN[relation];
}

export interface BaziOutput {
  pillars: FourPillars;
  dayMaster: { stem: string; element: WuXing; yinYang: '阳' | '阴' };
  elements: Record<WuXing, number>;
  tenGods: { year: ShiShen; month: ShiShen; hour: ShiShen; day: '日主' };
  pillarDetails: Record<'year' | 'month' | 'day' | 'hour', {
    stem: string;
    branch: string;
    hiddenStems: Array<{ stem: string; tenGod: ShiShen }>;
    naYin: string;
  }>;
}

export interface CalculationEnvelope<T> {
  algorithm: string;
  version: string;
  output: T;
  derivation: DerivationStep[];
  warnings: BoundaryWarning[];
}

export function calculateBazi(input: CalendarInput): CalculationEnvelope<BaziOutput> {
  const normalized = normalizeInput(input);
  const { pillars, derivation, warnings } = computePillars(normalized, input.lateZi);

  const elements: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const pillar of Object.values(pillars)) {
    elements[STEM_ELEMENT[pillar[0]]] += 1;
    elements[BRANCH_ELEMENT[pillar[1]]] += 1;
  }

  const dayStem = pillars.day[0];
  const detailFor = (pillar: string) => ({
    stem: pillar[0],
    branch: pillar[1],
    hiddenStems: (HIDDEN_STEMS[pillar[1]] ?? []).map((stem) => ({ stem, tenGod: tenGod(dayStem, stem) })),
    naYin: NA_YIN.get(pillar) ?? '—',
  });
  const output: BaziOutput = {
    pillars,
    dayMaster: {
      stem: dayStem,
      element: STEM_ELEMENT[dayStem],
      yinYang: STEM_YIN_YANG[dayStem],
    },
    elements,
    tenGods: {
      year: tenGod(dayStem, pillars.year[0]),
      month: tenGod(dayStem, pillars.month[0]),
      day: '日主',
      hour: tenGod(dayStem, pillars.hour[0]),
    },
    pillarDetails: {
      year: detailFor(pillars.year),
      month: detailFor(pillars.month),
      day: detailFor(pillars.day),
      hour: detailFor(pillars.hour),
    },
  };

  derivation.push({
    label: '五行分布',
    rule: '四柱干支各计一（天干按本气、地支按本气）',
    value: Object.entries(elements).map(([k, v]) => `${k}${v}`).join(' '),
  });

  return {
    algorithm: 'bazi',
    version: `${BAZI_ALGORITHM_VERSION} / ${CALENDAR_RULE_VERSION}`,
    output,
    derivation,
    warnings,
  };
}
