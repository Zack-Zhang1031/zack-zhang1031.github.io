/**
 * 置闰法取局：符头可超神（先于节气到来）；超神逾九天且节气为
 * 芒种/大雪时置闰（该节气三元周期重复一遍，扩为 30 天）。
 */

import { YANG_DUN_JU, YIN_DUN_JU, YUAN_NAMES, isYangDunTerm } from './chai-bu';
import type { JuSelection } from './types';

const JIE_QI_ORDER = [
  '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明',
  '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋',
  '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪',
] as const;

function prevTermOf(term: string): string {
  const idx = JIE_QI_ORDER.indexOf(term as (typeof JIE_QI_ORDER)[number]);
  if (idx < 0) throw new RangeError(`未知节气：${term}`);
  return JIE_QI_ORDER[(idx + 23) % 24]!;
}

/** 上元符头：甲子、己卯、甲午、己酉 */
function isUpperYuanFuTou(gzIndex: number): boolean {
  const stem = gzIndex % 10;
  const branch = gzIndex % 12;
  return (stem === 0 || stem === 5) && (branch === 0 || branch === 3 || branch === 6 || branch === 9);
}

/** 自给定干支序号回溯最近上元符头的天数 */
export function upperYuanFuTouOffset(gzIndex: number): number {
  for (let offset = 0; offset <= 60; offset += 1) {
    if (isUpperYuanFuTou(((gzIndex - offset) % 60 + 60) % 60)) return offset;
  }
  return 0;
}

/**
 * 置闰取局。
 * @param solarTerm 当前节气名
 * @param dayGzIndex 日干支六十甲子序号（0—59）
 * @param daysSinceJieQi 距当前节气交节日的整天数（>= 0）
 * @param nextSolarTerm 下一节气名（用于三元越界时归属下一节气）
 */
export function zhiRunJu(
  solarTerm: string,
  dayGzIndex: number,
  daysSinceJieQi: number,
  nextSolarTerm: string,
): JuSelection {
  // 符头超神天数：自节气交节日回溯最近的上元符头
  const jieDayGz = ((dayGzIndex - daysSinceJieQi) % 60 + 60) % 60;
  const chaoShenDays = upperYuanFuTouOffset(jieDayGz);
  const daysSinceFuTou = daysSinceJieQi + chaoShenDays;

  const prevTerm = prevTermOf(solarTerm);
  const isCurrentZhiRun = (solarTerm === '芒种' || solarTerm === '大雪') && chaoShenDays > 9;
  const isPrevZhiRun = (prevTerm === '芒种' || prevTerm === '大雪') && chaoShenDays > 9;
  const isZhiRun = isCurrentZhiRun || isPrevZhiRun;
  const cycleDays = isZhiRun ? 30 : 15;

  const derivation: string[] = [
    `节气「${solarTerm}」交节日距上元符头 ${chaoShenDays} 天（超神）`,
  ];
  if (isZhiRun) derivation.push(`超神逾九天，于「${isCurrentZhiRun ? solarTerm : prevTerm}」置闰，三元周期扩为 30 天`);

  let effectiveTerm = solarTerm;
  let effectiveDays = daysSinceFuTou;
  if (isPrevZhiRun && !isCurrentZhiRun) {
    effectiveTerm = prevTerm;
    derivation.push(`符头属前一节气「${prevTerm}」的闰周期`);
  } else if (daysSinceFuTou >= cycleDays) {
    effectiveTerm = nextSolarTerm;
    effectiveDays = daysSinceFuTou - cycleDays;
    derivation.push(`已越过本节气三元，归属下一节气「${nextSolarTerm}」`);
  }

  const table = isYangDunTerm(effectiveTerm) ? YANG_DUN_JU[effectiveTerm] : YIN_DUN_JU[effectiveTerm];
  if (!table) throw new RangeError(`未知节气：${effectiveTerm}`);

  const yuanIdx = effectiveDays % 15 < 5 ? 0 : effectiveDays % 15 < 10 ? 1 : 2;
  const yuan = YUAN_NAMES[yuanIdx]!;
  const juNumber = table[yuanIdx]!;
  const dun = isYangDunTerm(effectiveTerm) ? 'yang' : 'yin';
  derivation.push(`「${effectiveTerm}」${yuan}元 → ${dun === 'yang' ? '阳' : '阴'}遁 ${juNumber} 局`);

  return {
    school: 'zhi-run',
    dun,
    juNumber,
    yuan,
    derivation,
    chaoShenDays,
    isZhiRun,
  };
}
