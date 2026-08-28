/**
 * Canonical Yijing line model. Lines are stored bottom-to-top as
 * 6 (老阴, moving yin) | 7 (少阳) | 8 (少阴) | 9 (老阳, moving yang).
 * Only 6 and 9 move.
 */

export type YaoValue = 6 | 7 | 8 | 9;

export const YAO_VALUES: readonly YaoValue[] = [6, 7, 8, 9];

export const YAO_LABEL: Record<YaoValue, string> = {
  6: '老阴', 7: '少阳', 8: '少阴', 9: '老阳',
};

export function isYaoValue(value: unknown): value is YaoValue {
  return value === 6 || value === 7 || value === 8 || value === 9;
}

export const isYang = (value: YaoValue): boolean => value === 7 || value === 9;
export const isMoving = (value: YaoValue): boolean => value === 6 || value === 9;

/** 动爻变：老阳 9 → 少阴 8，老阴 6 → 少阳 7，静爻不变 */
export const changedValue = (value: YaoValue): YaoValue =>
  value === 9 ? 8 : value === 6 ? 7 : value;
