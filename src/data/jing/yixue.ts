/**
 * Yixue reference data: five-element cycles and the eight trigrams.
 * Static study material, no computation. Line arrays are bottom-to-top,
 * 1 = 阳爻, 0 = 阴爻.
 */

export const WUXING_ORDER = ['木', '火', '土', '金', '水'] as const;
export type WuXingName = (typeof WUXING_ORDER)[number];

export interface WuXingInfo {
  name: WuXingName;
  /** 此行所生 */
  sheng: WuXingName;
  /** 此行所克 */
  ke: WuXingName;
  direction: string;
  season: string;
  note: string;
}

export const WUXING: Record<WuXingName, WuXingInfo> = {
  木: {
    name: '木', sheng: '火', ke: '土',
    direction: '东', season: '春',
    note: '生发条达，如草木之舒展。',
  },
  火: {
    name: '火', sheng: '土', ke: '金',
    direction: '南', season: '夏',
    note: '炎上明亮，如薪火之升腾。',
  },
  土: {
    name: '土', sheng: '金', ke: '水',
    direction: '中', season: '四季之末',
    note: '承载化育，为万物所归。',
  },
  金: {
    name: '金', sheng: '水', ke: '木',
    direction: '西', season: '秋',
    note: '收敛肃整，如金石之坚利。',
  },
  水: {
    name: '水', sheng: '木', ke: '火',
    direction: '北', season: '冬',
    note: '润下流动，如江河之行地。',
  },
};

export type TrigramLine = 0 | 1;

export interface Trigram {
  name: string;
  symbol: string;
  /** 自下而上三爻 */
  lines: [TrigramLine, TrigramLine, TrigramLine];
  nature: string;
  image: string;
}

/** 乾兑离震巽坎艮坤，依传统卦画自下而上 */
export const BAGUA: readonly Trigram[] = [
  { name: '乾', symbol: '☰', lines: [1, 1, 1], nature: '健', image: '天' },
  { name: '兑', symbol: '☱', lines: [1, 1, 0], nature: '悦', image: '泽' },
  { name: '离', symbol: '☲', lines: [1, 0, 1], nature: '丽', image: '火' },
  { name: '震', symbol: '☳', lines: [1, 0, 0], nature: '动', image: '雷' },
  { name: '巽', symbol: '☴', lines: [0, 1, 1], nature: '入', image: '风' },
  { name: '坎', symbol: '☵', lines: [0, 1, 0], nature: '陷', image: '水' },
  { name: '艮', symbol: '☶', lines: [0, 0, 1], nature: '止', image: '山' },
  { name: '坤', symbol: '☷', lines: [0, 0, 0], nature: '顺', image: '地' },
] as const;
