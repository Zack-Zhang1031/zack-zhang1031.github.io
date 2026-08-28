/**
 * Calendar domain types. UI code must not import lunar-typescript
 * directly; everything flows through these types and engine.ts.
 */

export type TimeMode = 'legal' | 'true-solar';
/** same-day: 晚子时不换日（0 点换日）；next-day: 晚子时归次日（23 点换日） */
export type LateZiMode = 'same-day' | 'next-day';

export interface CivilDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface CalendarInput extends CivilDateTime {
  timeMode: TimeMode;
  /** 东经度数，true-solar 模式必填 */
  longitude?: number;
  lateZi: LateZiMode;
}

export interface NormalizedTime {
  input: CivilDateTime;
  /** 经真太阳时校正后的民用时刻（legal 模式下与 input 相同） */
  effective: CivilDateTime;
  timeMode: TimeMode;
  longitudeUsed: number | null;
  /** 真太阳时相对法定时的总偏移（分钟），legal 模式为 0 */
  trueSolarShiftMinutes: number;
  derivation: DerivationStep[];
}

export interface DerivationStep {
  label: string;
  rule: string;
  value: string;
}

export interface BoundaryWarning {
  code: 'near-jie' | 'near-lichun' | 'late-zi';
  message: string;
}

export class CalendarRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalendarRangeError';
  }
}
