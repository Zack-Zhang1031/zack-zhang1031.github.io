/**
 * 茅山法取局：废弃符头与置闰，纯以精确交节时刻起算，每 60 时辰
 * （120 小时 = 5 天）换一元；下元延续至下一节气交节为止。
 */

import { YANG_DUN_JU, YIN_DUN_JU, YUAN_NAMES, isYangDunTerm } from './chai-bu';
import type { JuSelection } from './types';

/**
 * 茅山取局。
 * @param solarTerm 当前所在节气名
 * @param elapsedHours 距该节气精确交节时刻的小时数（>= 0）
 */
export function maoShanJu(solarTerm: string, elapsedHours: number): JuSelection {
  const table = isYangDunTerm(solarTerm) ? YANG_DUN_JU[solarTerm] : YIN_DUN_JU[solarTerm];
  if (!table) throw new RangeError(`未知节气：${solarTerm}`);
  if (!Number.isFinite(elapsedHours) || elapsedHours < 0) {
    throw new RangeError(`交节已过时间无效：${elapsedHours}`);
  }

  const elapsedShichen = Math.floor(elapsedHours / 2);
  const yuanIdx = elapsedShichen < 60 ? 0 : elapsedShichen < 120 ? 1 : 2;
  const yuan = YUAN_NAMES[yuanIdx]!;
  const juNumber = table[yuanIdx]!;
  const dun = isYangDunTerm(solarTerm) ? 'yang' : 'yin';

  return {
    school: 'mao-shan',
    dun,
    juNumber,
    yuan,
    derivation: [
      `节气「${solarTerm}」${dun === 'yang' ? '阳' : '阴'}遁`,
      `交节后已过 ${elapsedShichen} 时辰（每元 60 时辰）→ ${yuan}元`,
      `「${solarTerm}」${yuan}元 → ${dun === 'yang' ? '阳' : '阴'}遁 ${juNumber} 局`,
    ],
  };
}
