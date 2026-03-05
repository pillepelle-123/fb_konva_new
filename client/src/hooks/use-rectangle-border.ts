/**
 * Hook for rendering rectangle borders
 * Consolidates border logic for textbox borders, image frames, and rect strokes
 */

import { useMemo } from 'react';
import { renderStyledBorder, createRectPath, type StyledBorderConfig } from '../utils/styled-border';
import type { Style } from '../utils/styles-client';

export interface UseRectangleBorderOptions {
  element: {
    id: string;
    borderWidth?: number;
    borderColor?: string;
    borderOpacity?: number;
    borderStyle?: Style;
    theme?: Style;
    style?: Style;
    cornerRadius?: number;
    roughness?: number;
    seed?: number;
    candyRandomness?: boolean;
    candyIntensity?: 'weak' | 'middle' | 'strong';
    candySpacingMultiplier?: number;
    candyHoled?: boolean;
  };
  width: number;
  height: number;
  isVisible?: boolean;
  elementType?: 'textbox' | 'image' | 'shape';
}

/**
 * Renders a styled rectangle border
 * Returns memoized Konva element or null
 * 
 * Handles style resolution with fallback chain:
 * borderStyle || theme || style || 'default'
 */
export function useRectangleBorder(options: UseRectangleBorderOptions) {
  const {
    element,
    width,
    height,
    isVisible = true,
    elementType = 'shape'
  } = options;

  return useMemo(() => {
    if (!isVisible) return null;

    const borderWidth = element.borderWidth;
    const borderColor = element.borderColor;
    const borderOpacity = element.borderOpacity;

    // Check if border should be shown
    if (borderWidth === undefined || borderWidth <= 0) return null;
    if (!borderColor) return null;

    // Resolve style with fallback chain
    const borderStyle = (element.borderStyle || element.theme || element.style || 'default') as Style;

    // Corner radius with default
    const cornerRadius = element.cornerRadius || 0;

    // Build style settings
    const styleSettings: StyledBorderConfig['styleSettings'] = {};

    if (borderStyle === 'rough') {
      styleSettings.roughness = element.roughness || 8;
      // Textboxes and images use consistent seed
      styleSettings.seed = elementType === 'textbox' || elementType === 'image' ? 1 : (element.seed || 1);
    }

    if (borderStyle === 'candy') {
      if (element.candyRandomness !== undefined) styleSettings.candyRandomness = element.candyRandomness;
      if (element.candyIntensity !== undefined) styleSettings.candyIntensity = element.candyIntensity;
      if (element.candySpacingMultiplier !== undefined) styleSettings.candySpacingMultiplier = element.candySpacingMultiplier;
      if (element.candyHoled !== undefined) styleSettings.candyHoled = element.candyHoled;
    }

    const borderElement = renderStyledBorder({
      width: borderWidth,
      color: borderColor,
      opacity: borderOpacity,
      cornerRadius: cornerRadius,
      path: createRectPath(0, 0, width, height),
      style: borderStyle,
      styleSettings: styleSettings,
      strokeScaleEnabled: true,
      listening: false,
      key: `border-${element.id}`
    });

    return borderElement;
  }, [
    element.id,
    element.borderWidth,
    element.borderColor,
    element.borderOpacity,
    element.borderStyle,
    element.theme,
    element.style,
    element.cornerRadius,
    element.roughness,
    element.seed,
    element.candyRandomness,
    element.candyIntensity,
    element.candySpacingMultiplier,
    element.candyHoled,
    width,
    height,
    isVisible,
    elementType
  ]);
}
