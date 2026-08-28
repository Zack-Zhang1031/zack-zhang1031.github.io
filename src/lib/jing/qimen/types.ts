/**
 * Qimen domain types. Each school keeps its own ju-selection module;
 * chart rendering lives in base-chart.ts. Comparison is read-only.
 */

export type DunType = 'yang' | 'yin';
export type Yuan = '上' | '中' | '下';
export type SchoolId = 'chai-bu' | 'zhi-run' | 'mao-shan';

export const SCHOOL_LABEL: Record<SchoolId, string> = {
  'chai-bu': '拆补法',
  'zhi-run': '置闰法',
  'mao-shan': '茅山法',
};

export const QIMEN_RULE_VERSION = 'qimen-1.0.0';

export interface JuSelection {
  school: SchoolId;
  dun: DunType;
  juNumber: number;
  yuan: Yuan;
  /** 人读的取局过程记录 */
  derivation: string[];
  /** 置闰法附加信息 */
  chaoShenDays?: number;
  isZhiRun?: boolean;
}

export interface QimenPalaceCell {
  /** 1—9 洛书宫数 */
  palace: number;
  name: string;
  element: string;
  earthStem: string;
  heavenStem: string;
  star: string;
  door: string;
  god: string;
}

export interface QimenChart {
  school: SchoolId;
  version: string;
  dun: DunType;
  juNumber: number;
  yuan: Yuan;
  zhiFuStar: string;
  zhiShiDoor: string;
  zhiFuPalace: number;
  zhiShiPalace: number;
  kongWang: string[];
  palaces: QimenPalaceCell[];
  derivation: string[];
}

/** 输入归一化后的离散量（qimen/input.ts 产出） */
export interface QimenInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 当前节气（已过最近交节） */
  solarTerm: string;
  solarTermTime: string;
  nextSolarTerm: string;
  /** 距当前节气交节的小时数（可为小数） */
  elapsedHours: number;
  /** 距当前节气交节日的整天数 */
  daysSinceJieQi: number;
  /** 日干支（0 点换日，23 点处理交给各派） */
  dayGanZhi: string;
  /** 时干支 */
  hourGanZhi: string;
  /** 日干支在六十甲子中的序号 0—59 */
  dayGzIndex: number;
}
