import { describe, expect, it } from 'vitest';
import { calculateBazi } from './calculate';
import { interpretBazi } from './interpret';

const envelope = calculateBazi({
  year: 1986, month: 5, day: 29, hour: 0, minute: 0,
  timeMode: 'legal',
  lateZi: 'next-day',
});

describe('interpretBazi', () => {
  it('produces non-empty bounded sections from the envelope', () => {
    const reading = interpretBazi(envelope);
    expect(reading.dayMaster).toContain('癸');
    expect(reading.elementBalance.length).toBeGreaterThan(0);
    expect(reading.tenGods).toHaveLength(3); // 年/月/时，日主不释
    expect(reading.reminders.length).toBeGreaterThan(0);
  });

  it('mentions the visible element skew without prescribing action', () => {
    const reading = interpretBazi(envelope);
    const text = reading.elementBalance.join('\n');
    expect(text).toContain('水');
    expect(text).toContain('土');
  });

  it('never mutates the calculation envelope', () => {
    const before = JSON.stringify(envelope);
    interpretBazi(envelope);
    expect(JSON.stringify(envelope)).toBe(before);
    expect(envelope.output.pillars).toEqual({
      year: '丙寅', month: '癸巳', day: '癸酉', hour: '壬子',
    });
  });

  it('avoids deterministic or high-risk fortune claims', () => {
    const reading = interpretBazi(envelope);
    const text = [
      reading.dayMaster,
      ...reading.elementBalance,
      ...reading.tenGods,
      ...reading.reminders,
    ].join('\n');
    expect(text).not.toMatch(/必定|必然|注定|宿命|铁口|一定会|必然|包你|血光|灾祸|改命|转运|灵验|保佑/);
  });

  it('carries boundary warnings into the reminders', () => {
    const lateZi = calculateBazi({
      year: 1986, month: 5, day: 29, hour: 23, minute: 30,
      timeMode: 'legal',
      lateZi: 'same-day',
    });
    const reading = interpretBazi(lateZi);
    expect(reading.reminders.some((line) => line.includes('晚子时'))).toBe(true);
  });

  it('is deterministic for the same envelope', () => {
    expect(interpretBazi(envelope)).toEqual(interpretBazi(envelope));
  });
});
