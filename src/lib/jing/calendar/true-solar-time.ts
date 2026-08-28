/**
 * True solar time correction: longitude offset from the 120°E legal
 * meridian plus a standard equation-of-time approximation.
 *
 * Components are exposed separately so the UI derivation can show
 * exactly which rule moved the effective time.
 */

import type { CivilDateTime } from './types';

/** 均时差（分钟），Spencer 近似的常用形式，误差约 ±0.5 分钟 */
export function equationOfTimeMinutes(year: number, month: number, day: number): number {
  const dayOfYear = Math.floor(
    (Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86_400_000,
  );
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/** 经度修正（分钟）：相对东八区中央经线 120°E，每度 4 分钟 */
export function longitudeShiftMinutes(longitude: number): number {
  return (longitude - 120) * 4;
}

export interface TrueSolarResult {
  effective: CivilDateTime;
  longitudeShift: number;
  equationShift: number;
  totalShift: number;
}

export function toTrueSolar(input: CivilDateTime, longitude: number): TrueSolarResult {
  const lonShift = longitudeShiftMinutes(longitude);
  const eot = equationOfTimeMinutes(input.year, input.month, input.day);
  const total = lonShift + eot;

  // 用 UTC 时间戳做进位，避免本地时区与夏令时干扰
  const ms = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute)
    + Math.round(total * 60_000);
  const shifted = new Date(ms);
  return {
    effective: {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
    },
    longitudeShift: lonShift,
    equationShift: eot,
    totalShift: total,
  };
}
