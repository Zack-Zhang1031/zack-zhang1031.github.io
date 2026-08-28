import { describe, expect, it } from 'vitest';
import { chaiBuJu } from './chai-bu';
import { zhiRunJu } from './zhi-run';
import { maoShanJu } from './mao-shan';
import { normalizeQimenInput } from './input';
import { QIMEN_FIXTURES } from './fixtures';

describe('three-school ju selection golden fixtures', () => {
  for (const fixture of QIMEN_FIXTURES) {
    const { input } = fixture;

    it(`拆补法 ${fixture.stamp}`, () => {
      const expected = fixture.schools['chai-bu'];
      const actual = chaiBuJu(input.solarTerm, input.dayGanZhi, input.hour);
      expect(actual.dun).toBe(expected.dun);
      expect(actual.juNumber).toBe(expected.juNumber);
      expect(actual.yuan).toBe(expected.yuan);
    });

    it(`置闰法 ${fixture.stamp}`, () => {
      const expected = fixture.schools['zhi-run'];
      const actual = zhiRunJu(input.solarTerm, input.dayGzIndex, input.daysSinceJieQi, input.nextSolarTerm);
      expect(actual.dun).toBe(expected.dun);
      expect(actual.juNumber).toBe(expected.juNumber);
      expect(actual.yuan).toBe(expected.yuan);
      expect(actual.chaoShenDays).toBe(expected.chaoShenDays);
      expect(actual.isZhiRun).toBe(expected.isZhiRun);
    });

    it(`茅山法 ${fixture.stamp}`, () => {
      const expected = fixture.schools['mao-shan'];
      const actual = maoShanJu(input.solarTerm, input.elapsedHours);
      expect(actual.dun).toBe(expected.dun);
      expect(actual.juNumber).toBe(expected.juNumber);
      expect(actual.yuan).toBe(expected.yuan);
    });
  }

  it('covers the required spread: dun directions, yuan levels, and zhi-run triggering', () => {
    const all = QIMEN_FIXTURES.flatMap((f) => Object.values(f.schools));
    expect(all.some((s) => s.dun === 'yang')).toBe(true);
    expect(all.some((s) => s.dun === 'yin')).toBe(true);
    for (const yuan of ['上', '中', '下']) {
      expect(all.some((s) => s.yuan === yuan)).toBe(true);
    }
    expect(QIMEN_FIXTURES.some((f) => f.schools['zhi-run'].isZhiRun)).toBe(true);
    expect(QIMEN_FIXTURES.length).toBeGreaterThanOrEqual(12);
  });

  it('rejects unknown solar terms and invalid hours', () => {
    expect(() => chaiBuJu('不存在', '甲子', 12)).toThrow(RangeError);
    expect(() => maoShanJu('冬至', -1)).toThrow(RangeError);
  });
});

describe('input normalization', () => {
  const at = (stamp: string) => {
    const [d, t] = stamp.split(' ');
    const [year, month, day] = d.split('-').map(Number);
    const [hour, minute] = t.split(':').map(Number);
    return normalizeQimenInput({ year, month, day, hour, minute });
  };

  it('switches solar term at the exact Lichun moment', () => {
    expect(at('2024-02-04 12:00').solarTerm).toBe('大寒');
    expect(at('2024-02-04 18:00').solarTerm).toBe('立春');
    expect(at('2024-02-04 18:00').solarTermTime).toBe('2024-02-04 16:27:07');
  });

  it('switches at the exact Jingzhe moment', () => {
    expect(at('2024-03-05 10:00').solarTerm).toBe('雨水');
    expect(at('2024-03-05 11:00').solarTerm).toBe('惊蛰');
  });

  it('computes elapsed hours and whole days from the exact transition', () => {
    const norm = at('2024-06-21 10:00'); // 夏至 04:51:00
    expect(norm.solarTerm).toBe('夏至');
    expect(norm.elapsedHours).toBeCloseTo(5.15, 1);
    expect(norm.daysSinceJieQi).toBe(0);
    expect(norm.nextSolarTerm).toBe('小暑');
  });

  it('keeps 0-turnover day ganzhi and leaves 23:00 to the schools', () => {
    expect(at('1986-05-29 23:30').dayGanZhi).toBe('癸酉');
    expect(at('1986-05-29 23:30').hourGanZhi).toBe('甲子');
    expect(at('1986-05-29 00:00').dayGzIndex).toBe(9); // 癸酉
  });

  it('rejects years outside 1900—2100', () => {
    expect(() => at('1899-12-31 12:00')).toThrow(/1900/);
  });
});
