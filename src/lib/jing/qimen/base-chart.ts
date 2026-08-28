/**
 * Shared 转盘时家奇门 chart renderer: earth plate, heaven plate stars,
 * eight doors, eight gods, 值符/值使, 空亡. Pure module — ju selection
 * belongs to the school modules; no school may overwrite another's chart.
 */

import type { DunType, QimenPalaceCell } from './types';

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

/** 六十甲子 */
export const JIA_ZI: readonly string[] = Array.from(
  { length: 60 },
  (_, i) => `${STEMS[i % 10]}${BRANCHES[i % 12]}`,
);

export function gzIndexOf(ganZhi: string): number {
  return JIA_ZI.indexOf(ganZhi);
}

/** 三奇六仪固定序 */
const SAN_QI_LIU_YI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'] as const;

/** 六甲旬首 → 遁干 */
const XUN_SHOU_YI: Record<string, string> = {
  甲子: '戊', 甲戌: '己', 甲申: '庚', 甲午: '辛', 甲辰: '壬', 甲寅: '癸',
};

/** 洛书顺时针 / 逆时针宫序 */
const CLOCKWISE = [2, 7, 6, 1, 8, 3, 4, 9] as const;
const COUNTER_CLOCKWISE = [2, 9, 4, 3, 8, 1, 6, 7] as const;

/** 九星转盘序（自天心起） */
const STAR_RING = ['天心', '天蓬', '天任', '天冲', '天辅', '天英', '天芮', '天柱'] as const;
/** 八门转盘序 */
const DOOR_RING = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'] as const;
/** 八神序 */
const GOD_RING = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'] as const;

const STAR_HOME: Record<string, number> = {
  天蓬: 1, 天芮: 2, 天冲: 3, 天辅: 4, 天禽: 5, 天心: 6, 天柱: 7, 天任: 8, 天英: 9,
};
const DOOR_HOME: Record<string, number> = {
  休门: 1, 生门: 8, 伤门: 3, 杜门: 4, 景门: 9, 死门: 2, 惊门: 7, 开门: 6,
};
const PALACE_NAME: Record<number, string> = {
  1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离',
};
const PALACE_ELEMENT: Record<number, string> = {
  1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火',
};

/** 地盘：阳遁顺布三奇六仪自局数宫起，阴遁逆布 */
export function arrangeEarthPlate(juNumber: number, dun: DunType): Map<number, string> {
  const plate = new Map<number, string>();
  SAN_QI_LIU_YI.forEach((stem, i) => {
    const palace = dun === 'yang'
      ? ((juNumber - 1 + i) % 9) + 1
      : ((juNumber - i - 1) % 9 + 9) % 9 + 1;
    plate.set(palace, stem);
  });
  return plate;
}

/** 旬首干支（如 甲子） */
export function xunShouOf(ganZhi: string): string {
  const idx = gzIndexOf(ganZhi);
  if (idx < 0) throw new RangeError(`无法识别的干支：${ganZhi}`);
  return JIA_ZI[Math.floor(idx / 10) * 10];
}

/** 空亡二支 */
export function kongWangOf(ganZhi: string): [string, string] {
  const idx = gzIndexOf(ganZhi);
  if (idx < 0) throw new RangeError(`无法识别的干支：${ganZhi}`);
  const xunStartBranch = (idx % 12 - idx % 10 + 12) % 12;
  return [BRANCHES[(xunStartBranch + 10) % 12], BRANCHES[(xunStartBranch + 11) % 12]];
}

function stemPalace(plate: Map<number, string>, stem: string): number {
  for (const [palace, value] of plate) {
    if (value === stem) return palace;
  }
  throw new RangeError(`地盘上找不到 ${stem}`);
}

export interface BaseChart {
  zhiFuStar: string;
  zhiShiDoor: string;
  zhiFuPalace: number;
  zhiShiPalace: number;
  kongWang: [string, string];
  palaces: QimenPalaceCell[];
}

/**
 * 排盘：时干支 + 局数 + 遁向 → 九宫。
 * 约定：天禽寄天芮（中五寄坤二）；值使门从值符原始宫步进（含中五），
 * 落中五时寄坤二；八神阳顺阴逆。
 */
export function renderChart(hourGanZhi: string, juNumber: number, dun: DunType): BaseChart {
  const earth = arrangeEarthPlate(juNumber, dun);
  const xunShou = xunShouOf(hourGanZhi);
  const yiStem = XUN_SHOU_YI[xunShou]!;

  // 值符星 = 遁干在地盘落宫的本位星；值使门同理（中五寄坤二 → 死门）
  const yiPalace = stemPalace(earth, yiStem);
  const zhiFuStar = Object.keys(STAR_HOME).find((s) => STAR_HOME[s] === yiPalace)!;
  const doorHomePalace = yiPalace === 5 ? 2 : yiPalace;
  const zhiShiDoor = Object.keys(DOOR_HOME).find((d) => DOOR_HOME[d] === doorHomePalace)!;

  // 值符随时干：时干（甲则取遁干）在地盘的落宫，中五寄坤二
  const hourStem = hourGanZhi[0];
  const actualStem = hourStem === '甲' ? yiStem : hourStem;
  const rawLuo = stemPalace(earth, actualStem);
  const zhiFuPalace = rawLuo === 5 ? 2 : rawLuo;

  // 值使门飞宫：自值符原始宫（含中五）按时支距旬首支的步数，阳顺阴逆
  const xunBranchIdx = BRANCHES.indexOf(xunShou[1] as (typeof BRANCHES)[number]);
  const hourBranchIdx = BRANCHES.indexOf(hourGanZhi[1] as (typeof BRANCHES)[number]);
  const steps = (hourBranchIdx - xunBranchIdx + 12) % 12;
  let zhiShiPalace = yiPalace;
  for (let i = 0; i < steps; i += 1) {
    zhiShiPalace += dun === 'yang' ? 1 : -1;
    if (zhiShiPalace > 9) zhiShiPalace = 1;
    if (zhiShiPalace < 1) zhiShiPalace = 9;
  }
  if (zhiShiPalace === 5) zhiShiPalace = 2;

  // 天盘：值符星加时干落宫，其余星顺转盘序飞布，携本位地盘干
  const heaven = new Map<number, { star: string; stem: string }>();
  const ringStar = zhiFuStar === '天禽' ? '天芮' : zhiFuStar;
  const starIdx = STAR_RING.indexOf(ringStar as (typeof STAR_RING)[number]);
  const startIdx = CLOCKWISE.indexOf(zhiFuPalace as 2);
  for (let i = 0; i < 8; i += 1) {
    const palace = CLOCKWISE[(startIdx + i) % 8];
    const star = STAR_RING[(starIdx + i) % 8];
    heaven.set(palace, { star, stem: earth.get(STAR_HOME[star]!)! });
  }
  heaven.set(5, { star: '天禽', stem: earth.get(5)! });

  // 八门：值使门落宫起，顺转盘序飞布
  const doors = new Map<number, string>();
  const doorIdx = DOOR_RING.indexOf(zhiShiDoor as (typeof DOOR_RING)[number]);
  const doorStart = CLOCKWISE.indexOf(zhiShiPalace as 2);
  for (let i = 0; i < 8; i += 1) {
    doors.set(CLOCKWISE[(doorStart + i) % 8], DOOR_RING[(doorIdx + i) % 8]);
  }

  // 八神：自值符落宫起，阳遁顺宫、阴遁逆宫
  const gods = new Map<number, string>();
  const godSeq = dun === 'yang' ? CLOCKWISE : COUNTER_CLOCKWISE;
  const godStart = godSeq.indexOf(zhiFuPalace as 2);
  GOD_RING.forEach((god, i) => {
    gods.set(godSeq[(godStart + i) % 8], god);
  });

  const palaces: QimenPalaceCell[] = Array.from({ length: 9 }, (_, i) => {
    const palace = i + 1;
    const isCenter = palace === 5;
    return {
      palace,
      name: PALACE_NAME[palace]!,
      element: PALACE_ELEMENT[palace]!,
      earthStem: earth.get(palace)!,
      heavenStem: isCenter ? '' : heaven.get(palace)!.stem,
      star: heaven.get(palace)!.star,
      door: isCenter ? '' : doors.get(palace)!,
      god: isCenter ? '' : gods.get(palace)!,
    };
  });

  return {
    zhiFuStar,
    zhiShiDoor,
    zhiFuPalace,
    zhiShiPalace,
    kongWang: kongWangOf(hourGanZhi),
    palaces,
  };
}
