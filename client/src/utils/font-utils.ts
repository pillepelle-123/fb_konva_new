import type { CanvasElement } from '../context/editor-context';

/**
 * Centralized utility for getting font size with consistent fallback logic
 */
export function getFontSize(element: CanvasElement): number {
  return element.font?.fontSize ?? element.fontSize ?? 16;
}

/**
 * Centralized utility for getting font color with consistent fallback logic
 */
export function getFontColor(element: CanvasElement): string {
  return element.font?.fontColor || element.fontColor || element.fill || '#1f2937';
}

/**
 * Centralized utility for getting font family with consistent fallback logic
 */
export function getFontFamily(element: CanvasElement): string {
  return element.font?.fontFamily || element.fontFamily || 'Arial, sans-serif';
}

/**
 * Centralized utility for getting font weight with consistent fallback logic
 */
export function getFontWeight(element: CanvasElement): string {
  return element.font?.fontWeight || element.fontWeight || 'normal';
}

/**
 * Centralized utility for getting font style with consistent fallback logic
 */
export function getFontStyle(element: CanvasElement): string {
  return element.font?.fontStyle || element.fontStyle || 'normal';
}

/**
 * Get all font configuration in one place
 */
export function getFontConfig(element: CanvasElement) {
  return {
    size: getFontSize(element),
    color: getFontColor(element),
    family: getFontFamily(element),
    weight: getFontWeight(element),
    style: getFontStyle(element),
    opacity: element.font?.fontOpacity ?? element.fontColorOpacity ?? element.fillOpacity ?? 1
  };
}