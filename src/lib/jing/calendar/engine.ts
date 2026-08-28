/**
 * Calendar engine: the single wrapped owner of lunar-typescript.
 *
 * Validates the supported 1900-2100 range, applies optional true-solar
 * correction, computes four pillars with solar-term months, Lichun year
 * turnover, and both late-Zi modes, and emits derivation steps plus
 * boundary warnings. UI and other modules must not import
 * lunar-typescript directly.
 */

import { Solar } from 'lunar-typescript';
import {
  CalendarRangeError,
  type BoundaryWarning,
  type CalendarInput,
  type CivilDateTime,
  type DerivationStep,
  type LateZiMode,
  type NormalizedTime,
} from './types';
import { toTrueSolar } from './true-solar-time';

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;
export const CALENDAR_RULE_VERSION = 'calendar-1.0.0 (lunar-typescript 1.8.6)';

/** 换月的十二节 */
const JIE_NAMES = [
  '立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
  '立秋', '白露', '寒露', '立冬', '大雪', '小寒',
] as const;

const BOUNDARY_WINDOW_MINUTES = 15;

const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

function toDateTimeString(t: CivilDateTime): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.year}-${p(t.month)}-${p(t.day)} ${p(t.hour)}:${p(t.minute)}`;
}

function lunarOf(t: CivilDateTime) {
  return Solar.fromYmdHms(t.year, t.month, t.day, t.hour, t.minute, 0).getLunar();
}

function isValidCivil(t: CivilDateTime): boolean {
  if (!Number.isInteger(t.year) || !Number.isInteger(t.month) || !Number.isInteger(t.day)
    || !Number.isInteger(t.hour) || !Number.isInteger(t.minute)) return false;
  if (t.month < 1 || t.month > 12 || t.day < 1 || t.day > 31) return false;
  if (t.hour < 0 || t.hour > 23 || t.minute < 0 || t.minute > 59) return false;
  const ms = Date.UTC(t.year, t.month - 1, t.day);
  const d = new Date(ms);
  return d.getUTCFullYear() === t.year
    && d.getUTCMonth() === t.month - 1
    && d.getUTCDate() === t.day;
}

/**
 * Validate and normalize user input. Throws CalendarRangeError for
 * out-of-range or invalid dates; throws TypeError for true-solar input
 * without a usable longitude.
 */
export function normalizeInput(input: CalendarInput): NormalizedTime {
  const derivation: DerivationStep[] = [];

  if (!isValidCivil(input)) {
    throw new CalendarRangeError('输入的日期或时刻无效。');
  }
  if (input.year < MIN_YEAR || input.year > MAX_YEAR) {
    throw new CalendarRangeError(`仅支持 ${MIN_YEAR}—${MAX_YEAR} 年之间的日期。`);
  }
  derivation.push({
    label: '输入时刻（法定时）',
    rule: '民用北京时间（东八区）',
    value: toDateTimeString(input),
  });

  if (input.timeMode === 'true-solar') {
    const lon = input.longitude;
    if (typeof lon !== 'number' || !Number.isFinite(lon) || lon < 70 || lon > 140) {
      throw new CalendarRangeError('真太阳时需要一个介于 70°E—140°E 的经度。');
    }
    const shifted = toTrueSolar(input, lon);
    derivation.push({
      label: '经度修正',
      rule: `相对 120°E 每度 4 分钟（${lon.toFixed(2)}°E）`,
      value: `${shifted.longitudeShift >= 0 ? '+' : ''}${shifted.longitudeShift.toFixed(1)} 分钟`,
    });
    derivation.push({
      label: '均时差修正',
      rule: '太阳视运动均时差近似',
      value: `${shifted.equationShift >= 0 ? '+' : ''}${shifted.equationShift.toFixed(1)} 分钟`,
    });
    derivation.push({
      label: '生效时刻（真太阳时）',
      rule: '法定时 + 经度修正 + 均时差',
      value: toDateTimeString(shifted.effective),
    });
    if (shifted.effective.year < MIN_YEAR || shifted.effective.year > MAX_YEAR) {
      throw new CalendarRangeError('真太阳时校正后超出支持的年份范围。');
    }
    return {
      input,
      effective: shifted.effective,
      timeMode: 'true-solar',
      longitudeUsed: lon,
      trueSolarShiftMinutes: shifted.totalShift,
      derivation,
    };
  }

  return {
    input,
    effective: { ...input },
    timeMode: 'legal',
    longitudeUsed: null,
    trueSolarShiftMinutes: 0,
    derivation,
  };
}

/** 距任一“节”时刻在 ±15 分钟内时给出边界提醒 */
export function boundaryWarnings(normalized: NormalizedTime): BoundaryWarning[] {
  const warnings: BoundaryWarning[] = [];
  const effective = normalized.effective;
  const lunar = lunarOf(effective);
  const effectiveMs = Date.UTC(
    effective.year, effective.month - 1, effective.day, effective.hour, effective.minute,
  );

  const table = lunar.getJieQiTable();
  for (const jie of JIE_NAMES) {
    const solar = table[jie];
    if (!solar) continue;
    const jieMs = Date.UTC(
      solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour(), solar.getMinute(),
    );
    const diffMin = Math.abs(effectiveMs - jieMs) / 60_000;
    if (diffMin <= BOUNDARY_WINDOW_MINUTES) {
      warnings.push({
        code: jie === '立春' ? 'near-lichun' : 'near-jie',
        message: `输入时刻紧邻「${jie}」（${solar.toYmdHms()}），${jie === '立春' ? '年柱' : '月柱'}对规则选择敏感，请留意推演结果中的生效时刻。`,
      });
    }
  }

  if (effective.hour === 23) {
    warnings.push({
      code: 'late-zi',
      message: normalized.timeMode === 'legal'
        ? '处于晚子时（23:00—24:00），日柱换日规则可在“晚子时”选项中切换。'
        : '真太阳时校正后处于晚子时（23:00—24:00），日柱换日规则可在“晚子时”选项中切换。',
    });
  }
  return warnings;
}

export interface FourPillars {
  year: string;
  month: string;
  day: string;
  hour: string;
}

export interface PillarsResult {
  pillars: FourPillars;
  derivation: DerivationStep[];
  warnings: BoundaryWarning[];
}

/** 由日柱天干与时支手动求时柱（用于晚子时不换日模式） */
export function hourPillarFrom(dayGanZhi: string, hour: number): string {
  const dayGan = GAN.indexOf(dayGanZhi[0] as (typeof GAN)[number]);
  const zhiIndex = hour === 23 ? 0 : Math.floor((hour + 1) / 2);
  const ganIndex = ((dayGan % 5) * 2 + zhiIndex) % 10;
  return `${GAN[ganIndex]}${ZHI[zhiIndex]}`;
}

export function computePillars(normalized: NormalizedTime, lateZi: LateZiMode): PillarsResult {
  const { effective } = normalized;
  const lunar = lunarOf(effective);
  const derivation = [...normalized.derivation];

  const year = lunar.getYearInGanZhiExact();
  derivation.push({
    label: '年柱',
    rule: '以立春精确时刻换年',
    value: year,
  });

  const month = lunar.getMonthInGanZhiExact();
  derivation.push({
    label: '月柱',
    rule: '以十二节精确时刻换月',
    value: month,
  });

  const isLateZi = effective.hour === 23;
  let day: string;
  let hour: string;
  if (isLateZi && lateZi === 'same-day') {
    day = lunar.getDayInGanZhiExact2(); // 0 点换日
    hour = hourPillarFrom(day, effective.hour);
    derivation.push({
      label: '日柱',
      rule: '晚子时不换日（0 点换日）',
      value: day,
    });
    derivation.push({
      label: '时柱',
      rule: `按当日日干起时（${ZHI[0]}时）`,
      value: hour,
    });
  } else {
    day = lunar.getDayInGanZhiExact(); // 23 点换日
    hour = lunar.getTimeInGanZhi();
    derivation.push({
      label: '日柱',
      rule: isLateZi ? '晚子时归次日（23 点换日）' : '23 点换日',
      value: day,
    });
    derivation.push({
      label: '时柱',
      rule: '按日柱天干起时',
      value: hour,
    });
  }

  return {
    pillars: { year, month, day, hour },
    derivation,
    warnings: boundaryWarnings(normalized),
  };
}

/** 「今日」问候条信息：日干支、农历日期、农历日序、当日节气（若有）。 */
export interface TodayInfo {
  dayGanzhi: string;
  lunarText: string;
  lunarDay: number;
  jieqi: string | null;
}

export function todayCalendar(now = new Date()): TodayInfo {
  const lunar = Solar.fromYmdHms(
    now.getFullYear(), now.getMonth() + 1, now.getDate(), 12, 0, 0,
  ).getLunar();
  const jieqi = lunar.getJieQi();
  return {
    dayGanzhi: lunar.getDayInGanZhi(),
    lunarText: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    lunarDay: lunar.getDay(),
    jieqi: jieqi ? jieqi : null,
  };
}
