import { describe, expect, it } from 'vitest';
import { sliderToGain } from './sound-fx';

describe('Jingxin sound gain curve', () => {
  it('keeps silence and full volume exact', () => {
    expect(sliderToGain(0)).toBe(0);
    expect(sliderToGain(1)).toBe(1);
  });

  it('maps the linear slider to a monotonic perceptual curve', () => {
    const quarter = sliderToGain(0.25);
    const half = sliderToGain(0.5);
    const threeQuarter = sliderToGain(0.75);

    expect(quarter).toBeGreaterThan(0);
    expect(quarter).toBeLessThan(half);
    expect(half).toBeLessThan(threeQuarter);
    expect(threeQuarter).toBeLessThan(1);
    expect(half).toBeCloseTo(0.251, 2);
  });

  it('clamps values outside the saved setting range', () => {
    expect(sliderToGain(-1)).toBe(0);
    expect(sliderToGain(2)).toBe(1);
  });
});
