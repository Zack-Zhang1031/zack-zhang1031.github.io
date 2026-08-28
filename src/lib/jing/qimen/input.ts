/**
 * Qimen input normalization: civil datetime → discrete quantities the
 * three schools consume (current solar term with exact transition time,
 * day/hour ganzhi, elapsed hours, whole days). This module is the only
 * qimen file that touches lunar-typescript; UI never does.
 */

import { Solar } from 'lunar-typescript';
import { gzIndexOf } from './base-chart';
import { CalendarRangeError, type CivilDateTime } from '../calendar/types';
import { MAX_YEAR, MIN_YEAR } from '../calendar/engine';
import type { QimenInput } from './types';

const DAY_MS = 86_400_000;

function utcMs(t: CivilDateTime): number {
  return Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute);
}

function dayStartMs(t: CivilDateTime): number {
  return Date.UTC(t.year, t.month - 1, t.day);
}

export function normalizeQimenInput(input: CivilDateTime): QimenInput {
  if (input.year < MIN_YEAR || input.year > MAX_YEAR) {
    throw new CalendarRangeError(`仅支持 ${MIN_YEAR}—${MAX_YEAR} 年之间的日期。`);
  }
  const lunar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0).getLunar();
  const prev = lunar.getPrevJieQi();
  const next = lunar.getNextJieQi();
  const prevSolar = prev.getSolar();
  const nextSolar = next.getSolar();

  const prevTime: CivilDateTime = {
    year: prevSolar.getYear(), month: prevSolar.getMonth(), day: prevSolar.getDay(),
    hour: prevSolar.getHour(), minute: prevSolar.getMinute(),
  };
  const nextTime: CivilDateTime = {
    year: nextSolar.getYear(), month: nextSolar.getMonth(), day: nextSolar.getDay(),
    hour: nextSolar.getHour(), minute: nextSolar.getMinute(),
  };

  // 日干支取 0 点换日口径；23:00 后的处理由各派自行决定
  const dayGanZhi = lunar.getDayInGanZhiExact2();
  const dayGzIndex = gzIndexOf(dayGanZhi);
  if (dayGzIndex < 0) throw new CalendarRangeError(`无法解析日干支：${dayGanZhi}`);

  const elapsedMs = utcMs(input) - utcMs(prevTime);

  return {
    ...input,
    solarTerm: prev.getName(),
    solarTermTime: prevSolar.toYmdHms(),
    nextSolarTerm: next.getName(),
    elapsedHours: elapsedMs / 3_600_000,
    daysSinceJieQi: Math.round((dayStartMs(input) - dayStartMs(prevTime)) / DAY_MS),
    dayGanZhi,
    hourGanZhi: lunar.getTimeInGanZhi(),
    dayGzIndex,
  };
}
