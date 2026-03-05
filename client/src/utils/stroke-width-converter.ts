// Stroke width conversion between common scale (1-100) and actual style values
// Client-side re-export of shared utility for compatibility

import {
  commonToActualStrokeWidth as sharedCommonToActualStrokeWidth,
  actualToCommonStrokeWidth as sharedActualToCommonStrokeWidth,
  getMaxCommonWidth as sharedGetMaxCommonWidth,
  getMinActualStrokeWidth as sharedGetMinActualStrokeWidth,
  styleJsonToActualStrokeWidth as sharedStyleJsonToActualStrokeWidth,
  actualToStyleJsonStrokeWidth as sharedActualToStyleJsonStrokeWidth,
  STYLE_STROKE_RANGES as sharedStyleStrokeRanges
} from '../../../shared/utils/stroke-width-converter';

export interface StyleStrokeRange {
  min: number;
  max: number;
}

export const STYLE_STROKE_RANGES: Record<string, StyleStrokeRange> = sharedStyleStrokeRanges;

export function commonToActualStrokeWidth(commonWidth: number, style: string): number {
  // Use shared implementation for consistency between client and server
  return sharedCommonToActualStrokeWidth(commonWidth, style);
}

// Convert from actual style stroke width to common scale (0-100)
// 0 = no border, 1 = min value of style, 100 = max value of style
export function actualToCommonStrokeWidth(actualWidth: number, style: string): number {
  // Use shared implementation for consistency between client and server
  return sharedActualToCommonStrokeWidth(actualWidth, style);
}

// Get max common width for sliders
export function getMaxCommonWidth(): number {
  return sharedGetMaxCommonWidth();
}

// Get minimum actual stroke width for a style
export function getMinActualStrokeWidth(style: string): number {
  return sharedGetMinActualStrokeWidth(style);
}

// Convert themes.json stroke width (common scale) to actual style stroke width
// This ensures themes.json values are treated as common scale values
export function styleJsonToActualStrokeWidth(styleJsonWidth: number, style: string): number {
  return sharedStyleJsonToActualStrokeWidth(styleJsonWidth, style);
}

// Convert actual style stroke width back to themes.json format (common scale)
export function actualToStyleJsonStrokeWidth(actualWidth: number, style: string): number {
  return sharedActualToStyleJsonStrokeWidth(actualWidth, style);
}