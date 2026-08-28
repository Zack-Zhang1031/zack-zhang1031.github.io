/**
 * Casting adapters: coins, yarrow stalks, numbers, time, and manual
 * entry. All randomness flows through the injected RandomSource; no
 * module calls Math.random or crypto directly.
 */

import { BAGUA } from '../../../data/jing/yixue';
import { bool, boundedInt, type RandomSource } from '../random';
import { isYaoValue, type YaoValue } from './lines';

/* ------------------------------------------------------------------ */
/* 铜钱法：三枚铜钱一掷，字三背二，合计得 6|7|8|9                        */
/* ------------------------------------------------------------------ */

export interface CoinThrow {
  /** true = 字面（计 3），false = 背面（计 2） */
  faces: [boolean, boolean, boolean];
  value: YaoValue;
}

export function throwCoins(source: RandomSource): CoinThrow {
  const faces = [bool(source), bool(source), bool(source)] as [boolean, boolean, boolean];
  const sum = faces.reduce((total, head) => total + (head ? 3 : 2), 0);
  if (!isYaoValue(sum)) throw new RangeError(`铜钱计数异常：${sum}`);
  return { faces, value: sum };
}

export function castCoins(source: RandomSource): { values: YaoValue[]; throws: CoinThrow[] } {
  const throws = Array.from({ length: 6 }, () => throwCoins(source));
  return { values: throws.map((t) => t.value), throws };
}

/* ------------------------------------------------------------------ */
/* 蓍草法：大衍之数四十九，分二、挂一、揲四、归奇，三变得一爻              */
/* ------------------------------------------------------------------ */

export const YARROW_TOTAL = 49;

export interface YarrowChange {
  left: number;
  right: number;
  removed: number;
  remaining: number;
}

export interface YarrowLine {
  changes: [YarrowChange, YarrowChange, YarrowChange];
  value: YaoValue;
}

export function divineYarrowLine(source: RandomSource): YarrowLine {
  let remaining = YARROW_TOTAL;
  const changes: YarrowChange[] = [];
  for (let change = 0; change < 3; change += 1) {
    // 分二：左手至少一策，右手（挂一前）至少二策
    const left = 1 + boundedInt(source, remaining - 2);
    const right = remaining - left;
    // 挂一：从右手取一策；揲四：左右各以四除之取余（余零作四）
    const remLeft = left % 4 || 4;
    const remRight = (right - 1) % 4 || 4;
    const removed = 1 + remLeft + remRight;
    remaining -= removed;
    changes.push({ left, right, removed, remaining });
  }
  const value = remaining / 4;
  if (!isYaoValue(value)) throw new RangeError(`蓍草计数异常：余 ${remaining}`);
  return { changes: changes as YarrowLine['changes'], value };
}

export function castYarrow(source: RandomSource): { values: YaoValue[]; lines: YarrowLine[] } {
  const lines = Array.from({ length: 6 }, () => divineYarrowLine(source));
  return { values: lines.map((line) => line.value), lines };
}

/* ------------------------------------------------------------------ */
/* 数字法与时间法（梅花易数简式，先天卦数：乾一兑二离三震四巽五坎六艮七坤八） */
/* ------------------------------------------------------------------ */

const XIANTIAN_ORDER = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'] as const;

const TRIGRAM_BY_NAME = new Map(BAGUA.map((g) => [g.name, g] as const));

export const normalize8 = (n: number): number => {
  const r = ((Math.trunc(n) % 8) + 8) % 8;
  return r === 0 ? 8 : r;
};

export const normalize6 = (n: number): number => {
  const r = ((Math.trunc(n) % 6) + 6) % 6;
  return r === 0 ? 6 : r;
};

export interface StructuredCast {
  values: YaoValue[];
  upperName: string;
  lowerName: string;
  /** 动爻位置 1—6，自下而上 */
  moving: number;
  formula: string;
}

function buildStructured(upperNum: number, lowerNum: number, moving: number, formula: string): StructuredCast {
  const upper = TRIGRAM_BY_NAME.get(XIANTIAN_ORDER[normalize8(upperNum) - 1]);
  const lower = TRIGRAM_BY_NAME.get(XIANTIAN_ORDER[normalize8(lowerNum) - 1]);
  if (!upper || !lower) throw new RangeError('卦数归一化失败');
  const values: YaoValue[] = [...lower.lines, ...upper.lines].map((line) => (line === 1 ? 7 : 8));
  const pos = normalize6(moving);
  values[pos - 1] = values[pos - 1] === 7 ? 9 : 6;
  return { values, upperName: upper.name, lowerName: lower.name, moving: pos, formula };
}

/** 数字起卦：上卦 = 数一除八取余，下卦 = 数二除八取余，动爻 = 数三除六取余 */
export function castNumbers(first: number, second: number, third: number): StructuredCast {
  return buildStructured(
    first, second, third,
    `上卦 = ${first} mod 8 → ${normalize8(first)}；下卦 = ${second} mod 8 → ${normalize8(second)}；动爻 = ${third} mod 6 → ${normalize6(third)}`,
  );
}

/** 时间起卦：上卦 = (年+月+日) mod 8，下卦 = (年+月+日+时) mod 8，动爻 = (年+月+日+时) mod 6 */
export function castTime(year: number, month: number, day: number, hour: number): StructuredCast {
  const upperSum = year + month + day;
  const lowerSum = upperSum + hour;
  return buildStructured(
    upperSum, lowerSum, lowerSum,
    `上卦 = (${year}+${month}+${day}) mod 8 → ${normalize8(upperSum)}；下卦 = (${year}+${month}+${day}+${hour}) mod 8 → ${normalize8(lowerSum)}；动爻 = ${lowerSum} mod 6 → ${normalize6(lowerSum)}`,
  );
}

/* ------------------------------------------------------------------ */
/* 手动起卦：直接录入六爻                                                */
/* ------------------------------------------------------------------ */

export function castManual(input: readonly unknown[]): YaoValue[] {
  if (input.length !== 6) throw new RangeError(`需要六爻，收到 ${input.length} 爻`);
  return input.map((value, index) => {
    const num = typeof value === 'string' ? Number(value) : value;
    if (!isYaoValue(num)) {
      throw new RangeError(`第 ${index + 1} 爻只接受 6（老阴）、7（少阳）、8（少阴）、9（老阳）`);
    }
    return num;
  });
}
