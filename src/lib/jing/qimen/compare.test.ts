import { describe, expect, it } from 'vitest';
import { renderChart } from './base-chart';
import { chartForSchool, compareSchools } from './compare';
import { QIMEN_FIXTURES } from './fixtures';

const chartCases = QIMEN_FIXTURES.filter((f) => f.schools['chai-bu'].chart);

describe('base chart golden fixtures', () => {
  for (const fixture of chartCases) {
    for (const school of ['chai-bu', 'zhi-run', 'mao-shan'] as const) {
      it(`${school} ${fixture.stamp} reproduces the full nine-palace chart`, () => {
        const expected = fixture.schools[school].chart!;
        const actual = renderChart(
          fixture.input.hourGanZhi,
          fixture.schools[school].juNumber,
          fixture.schools[school].dun,
        );
        expect(actual.zhiFuStar).toBe(expected.zhiFuStar);
        expect(actual.zhiShiDoor).toBe(expected.zhiShiDoor);
        expect(actual.zhiFuPalace).toBe(expected.zhiFuPalace);
        expect(actual.zhiShiPalace).toBe(expected.zhiShiPalace);
        expect([...actual.kongWang]).toEqual(expected.kongWang);
        expect(actual.palaces.map((p) => ({
          palace: p.palace,
          earth: p.earthStem,
          heaven: p.heavenStem,
          star: p.star,
          door: p.door,
          god: p.god,
        }))).toEqual(expected.palaces);
      });
    }
  }

  it('freezes four chart cases across both dun directions', () => {
    expect(chartCases).toHaveLength(4);
    const duns = new Set(chartCases.flatMap((f) => Object.values(f.schools).map((s) => s.dun)));
    expect(duns.has('yang')).toBe(true);
    expect(duns.has('yin')).toBe(true);
  });
});

describe('three-school comparison', () => {
  const at = (stamp: string) => {
    const [d, t] = stamp.split(' ');
    const [year, month, day] = d.split('-').map(Number);
    const [hour, minute] = t.split(':').map(Number);
    return { year, month, day, hour, minute };
  };

  it('keeps three independent results for a divergent datetime', () => {
    const comparison = compareSchools(at('2024-12-21 20:00'));
    expect(comparison.juAgree).toBe(false);
    expect(comparison.charts['chai-bu'].juNumber).toBe(4);
    expect(comparison.charts['zhi-run'].juNumber).toBe(1);
    expect(comparison.charts['mao-shan'].juNumber).toBe(1);
    expect(comparison.charts['zhi-run'].dun).toBe('yin');
    expect(comparison.charts['mao-shan'].dun).toBe('yang');
    expect(comparison.solarTerm).toBe('冬至');
  });

  it('agrees on an ordinary mid-yuan datetime', () => {
    const comparison = compareSchools(at('1986-05-29 00:00'));
    expect(comparison.juAgree).toBe(true);
    expect(comparison.charts['chai-bu'].juNumber).toBe(2);
  });

  it('mutating one school result never affects the others', () => {
    const comparison = compareSchools(at('2024-12-21 20:00'));
    const before = JSON.stringify(comparison.charts['zhi-run']);
    comparison.charts['chai-bu'].palaces[0].earthStem = '改';
    comparison.charts['chai-bu'].juNumber = 9;
    expect(JSON.stringify(comparison.charts['zhi-run'])).toBe(before);
    expect(comparison.charts['zhi-run'].palaces[0].earthStem).not.toBe('改');
  });

  it('records school and version on every chart', () => {
    const comparison = compareSchools(at('1986-05-29 00:00'));
    for (const school of ['chai-bu', 'zhi-run', 'mao-shan'] as const) {
      expect(comparison.charts[school].school).toBe(school);
      expect(comparison.charts[school].version).toContain('qimen-1.0.0');
      expect(comparison.charts[school].derivation.length).toBeGreaterThan(0);
    }
  });
});
