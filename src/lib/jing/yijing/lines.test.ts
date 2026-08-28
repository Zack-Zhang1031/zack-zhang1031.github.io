import { describe, expect, it } from 'vitest';
import { changedValue, isMoving, isYang, isYaoValue, YAO_LABEL } from './lines';

describe('canonical line model', () => {
  it('classifies the four values', () => {
    expect(isYang(7)).toBe(true);
    expect(isYang(9)).toBe(true);
    expect(isYang(6)).toBe(false);
    expect(isYang(8)).toBe(false);
    expect(isMoving(6)).toBe(true);
    expect(isMoving(9)).toBe(true);
    expect(isMoving(7)).toBe(false);
    expect(isMoving(8)).toBe(false);
  });

  it('only 6 and 9 change', () => {
    expect(changedValue(6)).toBe(7);
    expect(changedValue(9)).toBe(8);
    expect(changedValue(7)).toBe(7);
    expect(changedValue(8)).toBe(8);
  });

  it('labels every value in Chinese', () => {
    expect(YAO_LABEL[6]).toBe('老阴');
    expect(YAO_LABEL[9]).toBe('老阳');
    expect(isYaoValue('7')).toBe(false);
    expect(isYaoValue(5)).toBe(false);
  });
});
