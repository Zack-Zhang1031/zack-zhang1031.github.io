import { describe, expect, it } from 'vitest';
import { calculateBazi, tenGod } from './calculate';

describe('tenGod relations', () => {
  it('walks the full ten-god cycle for a 甲 day master', () => {
    expect(tenGod('甲', '甲')).toBe('比肩');
    expect(tenGod('甲', '乙')).toBe('劫财');
    expect(tenGod('甲', '丙')).toBe('食神');
    expect(tenGod('甲', '丁')).toBe('伤官');
    expect(tenGod('甲', '戊')).toBe('偏财');
    expect(tenGod('甲', '己')).toBe('正财');
    expect(tenGod('甲', '庚')).toBe('七杀');
    expect(tenGod('甲', '辛')).toBe('正官');
    expect(tenGod('甲', '壬')).toBe('偏印');
    expect(tenGod('甲', '癸')).toBe('正印');
  });

  it('handles a yin day master with mirrored polarity', () => {
    expect(tenGod('癸', '癸')).toBe('比肩');
    expect(tenGod('癸', '壬')).toBe('劫财');
    expect(tenGod('癸', '丙')).toBe('正财');
    expect(tenGod('癸', '丁')).toBe('偏财');
  });
});

describe('calculateBazi golden chart', () => {
  const envelope = calculateBazi({
    year: 1986, month: 5, day: 29, hour: 0, minute: 0,
    timeMode: 'legal',
    lateZi: 'next-day',
  });

  it('freezes the 1986-05-29 00:00 legal chart', () => {
    expect(envelope.output.pillars).toEqual({
      year: '丙寅', month: '癸巳', day: '癸酉', hour: '壬子',
    });
  });

  it('derives day master, five elements, and ten gods from the pillars', () => {
    expect(envelope.output.dayMaster).toEqual({ stem: '癸', element: '水', yinYang: '阴' });
    expect(envelope.output.elements).toEqual({ 木: 1, 火: 2, 土: 0, 金: 1, 水: 4 });
    expect(envelope.output.tenGods).toEqual({
      year: '正财', month: '比肩', day: '日主', hour: '劫财',
    });
    expect(envelope.output.pillarDetails.year).toMatchObject({
      stem: '丙', branch: '寅', naYin: '炉中火',
    });
    expect(envelope.output.pillarDetails.year.hiddenStems.map((item) => item.stem)).toEqual(['甲', '丙', '戊']);
  });

  it('returns an auditable envelope with derivation and version', () => {
    expect(envelope.algorithm).toBe('bazi');
    expect(envelope.version).toContain('bazi-1.0.0');
    expect(envelope.version).toContain('lunar-typescript 1.8.6');
    expect(envelope.derivation.length).toBeGreaterThanOrEqual(5);
    expect(envelope.warnings).toEqual([]);
  });

  it('flips day and hour pillars in same-day late-Zi mode without touching year/month', () => {
    const sameDay = calculateBazi({
      year: 1986, month: 5, day: 29, hour: 23, minute: 30,
      timeMode: 'legal',
      lateZi: 'same-day',
    });
    expect(sameDay.output.pillars.year).toBe('丙寅');
    expect(sameDay.output.pillars.month).toBe('癸巳');
    expect(sameDay.output.pillars.day).toBe('癸酉');
    expect(sameDay.output.pillars.hour).toBe('壬子');
    expect(sameDay.warnings.some((w) => w.code === 'late-zi')).toBe(true);
  });
});
