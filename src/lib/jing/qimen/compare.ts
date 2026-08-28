/**
 * Read-only three-school comparison: each school derives its own ju and
 * chart; the adapter aligns cells for display and never averages or
 * overwrites any school's result.
 */

import { renderChart } from './base-chart';
import { chaiBuJu } from './chai-bu';
import { maoShanJu } from './mao-shan';
import { zhiRunJu } from './zhi-run';
import type { CivilDateTime } from '../calendar/types';
import { normalizeQimenInput } from './input';
import { QIMEN_RULE_VERSION, type JuSelection, type QimenChart, type SchoolId } from './types';

export function chartForSchool(selection: JuSelection, hourGanZhi: string): QimenChart {
  const base = renderChart(hourGanZhi, selection.juNumber, selection.dun);
  return {
    school: selection.school,
    version: QIMEN_RULE_VERSION,
    dun: selection.dun,
    juNumber: selection.juNumber,
    yuan: selection.yuan,
    zhiFuStar: base.zhiFuStar,
    zhiShiDoor: base.zhiShiDoor,
    zhiFuPalace: base.zhiFuPalace,
    zhiShiPalace: base.zhiShiPalace,
    kongWang: [...base.kongWang],
    palaces: base.palaces.map((cell) => ({ ...cell })),
    derivation: [...selection.derivation],
  };
}

export interface QimenComparison {
  inputSummary: string;
  solarTerm: string;
  solarTermTime: string;
  charts: Record<SchoolId, QimenChart>;
  /** 三派局数是否一致 */
  juAgree: boolean;
}

export function compareSchools(input: CivilDateTime): QimenComparison {
  const normalized = normalizeQimenInput(input);

  const selections: JuSelection[] = [
    chaiBuJu(normalized.solarTerm, normalized.dayGanZhi, normalized.hour),
    zhiRunJu(
      normalized.solarTerm,
      normalized.dayGzIndex,
      normalized.daysSinceJieQi,
      normalized.nextSolarTerm,
    ),
    maoShanJu(normalized.solarTerm, normalized.elapsedHours),
  ];

  const charts = Object.fromEntries(
    selections.map((selection) => [selection.school, chartForSchool(selection, normalized.hourGanZhi)]),
  ) as Record<SchoolId, QimenChart>;

  const p = (n: number) => String(n).padStart(2, '0');
  return {
    inputSummary: `${input.year}-${p(input.month)}-${p(input.day)} ${p(input.hour)}:${p(input.minute)}（法定时）`,
    solarTerm: normalized.solarTerm,
    solarTermTime: normalized.solarTermTime,
    charts,
    juAgree: new Set(selections.map((s) => `${s.dun}${s.juNumber}`)).size === 1,
  };
}
