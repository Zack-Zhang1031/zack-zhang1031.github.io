import { describe, expect, it } from 'vitest';
import {
  CALENDAR_RULE_VERSION,
  boundaryWarnings,
  computePillars,
  hourPillarFrom,
  normalizeInput,
} from './engine';
import { equationOfTimeMinutes, longitudeShiftMinutes, toTrueSolar } from './true-solar-time';
import { CalendarRangeError, type CalendarInput } from './types';

const at = (
  year: number, month: number, day: number, hour: number, minute: number,
  extra: Partial<CalendarInput> = {},
): CalendarInput => ({
  year, month, day, hour, minute,
  timeMode: 'legal',
  lateZi: 'next-day',
  ...extra,
});

/** Golden fixtures verified against lunar-typescript 1.8.6 exact APIs (2026-08-27). */
describe('calendar engine golden fixtures', () => {
  it('freezes 1986-05-29 00:00 legal time as 丙寅/癸巳/癸酉/壬子', () => {
    const result = computePillars(normalizeInput(at(1986, 5, 29, 0, 0)), 'next-day');
    expect(result.pillars).toEqual({ year: '丙寅', month: '癸巳', day: '癸酉', hour: '壬子' });
  });

  it('turns the year pillar at the exact Lichun moment (2024-02-04 16:27:07)', () => {
    const before = computePillars(normalizeInput(at(2024, 2, 4, 12, 0)), 'next-day');
    expect(before.pillars.year).toBe('癸卯');
    expect(before.pillars.month).toBe('乙丑');

    const after = computePillars(normalizeInput(at(2024, 2, 4, 18, 0)), 'next-day');
    expect(after.pillars.year).toBe('甲辰');
    expect(after.pillars.month).toBe('丙寅');
  });

  it('turns the month pillar at the exact Jie moment (惊蛰 2024-03-05 10:22:45)', () => {
    const before = computePillars(normalizeInput(at(2024, 3, 5, 10, 0)), 'next-day');
    expect(before.pillars.month).toBe('丙寅');

    const after = computePillars(normalizeInput(at(2024, 3, 5, 11, 0)), 'next-day');
    expect(after.pillars.month).toBe('丁卯');
  });

  it('supports both late-Zi day-turnover modes at 23:30', () => {
    const nextDay = computePillars(normalizeInput(at(1986, 5, 29, 23, 30)), 'next-day');
    expect(nextDay.pillars.day).toBe('甲戌');
    expect(nextDay.pillars.hour).toBe('甲子');

    const sameDay = computePillars(normalizeInput(at(1986, 5, 29, 23, 30)), 'same-day');
    expect(sameDay.pillars.day).toBe('癸酉');
    expect(sameDay.pillars.hour).toBe('壬子');
  });

  it('derives the Zi hour stem from the day stem', () => {
    expect(hourPillarFrom('甲子', 23)).toBe('甲子');
    expect(hourPillarFrom('癸酉', 23)).toBe('壬子');
    expect(hourPillarFrom('癸酉', 0)).toBe('壬子');
    expect(hourPillarFrom('甲戌', 1)).toBe('乙丑');
  });

  it('exposes a frozen rule version for fixture auditing', () => {
    expect(CALENDAR_RULE_VERSION).toContain('lunar-typescript 1.8.6');
  });
});

describe('true solar time', () => {
  it('applies 4 minutes per degree from 120°E', () => {
    expect(longitudeShiftMinutes(87.62)).toBeCloseTo(-129.52, 2); // 乌鲁木齐
    expect(longitudeShiftMinutes(116.41)).toBeCloseTo(-14.36, 2); // 北京
    expect(longitudeShiftMinutes(120)).toBe(0);
  });

  it('keeps the equation of time within the expected seasonal range', () => {
    expect(equationOfTimeMinutes(2024, 1, 1)).toBeCloseTo(-3.6, 1);
    expect(equationOfTimeMinutes(1986, 5, 29)).toBeCloseTo(2.7, 1);
  });

  it('shifts Urumqi civil noon back to about 09:47 true solar time', () => {
    const result = toTrueSolar({ year: 2024, month: 1, day: 1, hour: 12, minute: 0 }, 87.62);
    expect(result.longitudeShift).toBeCloseTo(-129.52, 2);
    // 总修正 ≈ -133.13 分钟（-129.52 经度 + -3.61 均时差）→ 09:46:52
    expect(result.effective).toEqual({ year: 2024, month: 1, day: 1, hour: 9, minute: 46 });
  });

  it('shifts Beijing civil noon back to about 11:42 true solar time', () => {
    const result = toTrueSolar({ year: 2024, month: 1, day: 1, hour: 12, minute: 0 }, 116.41);
    expect(result.effective).toEqual({ year: 2024, month: 1, day: 1, hour: 11, minute: 42 });
  });

  it('records derivation steps and longitude for true-solar input', () => {
    const normalized = normalizeInput(at(1986, 5, 29, 12, 0, {
      timeMode: 'true-solar',
      longitude: 87.62,
    }));
    expect(normalized.timeMode).toBe('true-solar');
    expect(normalized.longitudeUsed).toBe(87.62);
    expect(normalized.derivation.map((step) => step.label)).toEqual([
      '输入时刻（法定时）', '经度修正', '均时差修正', '生效时刻（真太阳时）',
    ]);
  });

  it('rejects true-solar input without a usable longitude', () => {
    expect(() => normalizeInput(at(2000, 1, 1, 12, 0, { timeMode: 'true-solar' })))
      .toThrow(CalendarRangeError);
    expect(() => normalizeInput(at(2000, 1, 1, 12, 0, { timeMode: 'true-solar', longitude: 150 })))
      .toThrow(CalendarRangeError);
  });
});

describe('range and boundary handling', () => {
  it('rejects unsupported years 1899 and 2101', () => {
    expect(() => normalizeInput(at(1899, 12, 31, 23, 0))).toThrow(CalendarRangeError);
    expect(() => normalizeInput(at(2101, 1, 1, 0, 0))).toThrow(CalendarRangeError);
  });

  it('rejects impossible civil dates', () => {
    expect(() => normalizeInput(at(2024, 2, 30, 12, 0))).toThrow(CalendarRangeError);
    expect(() => normalizeInput(at(2024, 13, 1, 12, 0))).toThrow(CalendarRangeError);
    expect(() => normalizeInput(at(2024, 1, 1, 24, 0))).toThrow(CalendarRangeError);
  });

  it('warns within ±15 minutes of Lichun', () => {
    const warnings = boundaryWarnings(normalizeInput(at(2024, 2, 4, 16, 20)));
    expect(warnings.some((w) => w.code === 'near-lichun')).toBe(true);
  });

  it('warns within ±15 minutes of an ordinary Jie', () => {
    const warnings = boundaryWarnings(normalizeInput(at(2024, 3, 5, 10, 15)));
    expect(warnings.some((w) => w.code === 'near-jie')).toBe(true);
  });

  it('warns for the late-Zi hour only at 23:xx', () => {
    expect(boundaryWarnings(normalizeInput(at(1986, 5, 29, 23, 30)))
      .some((w) => w.code === 'late-zi')).toBe(true);
    expect(boundaryWarnings(normalizeInput(at(1986, 5, 29, 0, 30)))
      .some((w) => w.code === 'late-zi')).toBe(false);
  });

  it('stays quiet for an ordinary midday', () => {
    expect(boundaryWarnings(normalizeInput(at(2024, 6, 15, 12, 0)))).toEqual([]);
  });
});
