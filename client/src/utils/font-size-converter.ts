// Font size conversion between actual size and common size
// Mapping: 50 actual -> 12 common, 100 actual -> 24 common

export function actualToCommon(actualSize: number): number {
  // Linear conversion: actual = common * 50/12
  return Math.round(actualSize * 12 / 50);
}

export function commonToActual(commonSize: number): number {
  // Linear conversion: actual = common * 50/12
  return Math.round(commonSize * 50 / 12);
}

export const COMMON_FONT_SIZE_RANGE = {
  min: 8,
  max: 72,
  default: 14
};