// Corner radius conversion between common radius and actual radius
// Conversion: [common radius] = Math.trunc([actual radius] / 3)

export function actualToCommonRadius(actualRadius: number): number {
  return Math.trunc(actualRadius / 3);
}

export function commonToActualRadius(commonRadius: number): number {
  return commonRadius * 3;
}

export const COMMON_CORNER_RADIUS_RANGE = {
  min: 0,
  max: 100,
  default: 0
};