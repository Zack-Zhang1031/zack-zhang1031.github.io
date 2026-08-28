/**
 * 拆补法取局：以精确交节为界换节气局数；从日干支往前找符头
 * （甲/己日），符头地支定三元（子午卯酉上元、寅申巳亥中元、
 * 辰戌丑未下元），查节气局数表。23:00 后按次日干支。
 */

import { BRANCHES, STEMS } from './base-chart';
import type { JuSelection, Yuan } from './types';

/** 阳遁节气局数表 [上元, 中元, 下元] */
export const YANG_DUN_JU: Record<string, readonly [number, number, number]> = {
  冬至: [1, 7, 4], 惊蛰: [1, 7, 4],
  小寒: [2, 8, 5],
  大寒: [3, 9, 6], 春分: [3, 9, 6],
  立春: [8, 5, 2],
  雨水: [9, 6, 3],
  清明: [4, 1, 7], 立夏: [4, 1, 7],
  谷雨: [5, 2, 8], 小满: [5, 2, 8],
  芒种: [6, 3, 9],
};

/** 阴遁节气局数表 */
export const YIN_DUN_JU: Record<string, readonly [number, number, number]> = {
  夏至: [9, 3, 6], 白露: [9, 3, 6],
  小暑: [8, 2, 5],
  大暑: [7, 1, 4], 秋分: [7, 1, 4],
  立秋: [2, 5, 8],
  处暑: [1, 4, 7],
  寒露: [6, 9, 3], 立冬: [6, 9, 3],
  霜降: [5, 8, 2], 小雪: [5, 8, 2],
  大雪: [4, 7, 1],
};

export const isYangDunTerm = (term: string): boolean =>
  Object.prototype.hasOwnProperty.call(YANG_DUN_JU, term);

export const YUAN_NAMES: readonly Yuan[] = ['上', '中', '下'];

/** 符头地支 → 三元序号：子午卯酉上元、寅申巳亥中元、辰戌丑未下元 */
export function yuanOfFuTouBranch(branch: string): number {
  if (['子', '午', '卯', '酉'].includes(branch)) return 0;
  if (['寅', '申', '巳', '亥'].includes(branch)) return 1;
  return 2;
}

/**
 * 拆补取局。
 * @param solarTerm 当前所在节气名（精确交节后的节气）
 * @param dayGanZhi 日干支（0 点换日口径）
 * @param hour 小时 0—23；23:00 起按次日干支
 */
export function chaiBuJu(solarTerm: string, dayGanZhi: string, hour: number): JuSelection {
  const table = isYangDunTerm(solarTerm) ? YANG_DUN_JU[solarTerm] : YIN_DUN_JU[solarTerm];
  if (!table) throw new RangeError(`未知节气：${solarTerm}`);

  let stemIdx = STEMS.indexOf(dayGanZhi[0] as (typeof STEMS)[number]);
  let branchIdx = BRANCHES.indexOf(dayGanZhi[1] as (typeof BRANCHES)[number]);
  if (stemIdx < 0 || branchIdx < 0) throw new RangeError(`无法识别的日干支：${dayGanZhi}`);

  const derivation: string[] = [`节气「${solarTerm}」${isYangDunTerm(solarTerm) ? '阳' : '阴'}遁`];
  if (hour >= 23) {
    stemIdx = (stemIdx + 1) % 10;
    branchIdx = (branchIdx + 1) % 12;
    derivation.push('23:00 后按次日干支取符头');
  }

  // 符头 = 距当天最近的甲/己日
  const offset = stemIdx % 5;
  const fuTouBranch = BRANCHES[((branchIdx - offset) % 12 + 12) % 12]!;
  const yuanIdx = yuanOfFuTouBranch(fuTouBranch);
  const yuan = YUAN_NAMES[yuanIdx]!;
  derivation.push(`符头地支「${fuTouBranch}」→ ${yuan}元`);

  const juNumber = table[yuanIdx]!;
  derivation.push(`「${solarTerm}」${yuan}元 → ${isYangDunTerm(solarTerm) ? '阳' : '阴'}遁 ${juNumber} 局`);

  return {
    school: 'chai-bu',
    dun: isYangDunTerm(solarTerm) ? 'yang' : 'yin',
    juNumber,
    yuan,
    derivation,
  };
}
