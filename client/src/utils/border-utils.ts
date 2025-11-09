import type { CanvasElement } from '../context/editor-context';

/**
 * Centralized utility for getting border width with consistent fallback logic
 */
export function getBorderWidth(element: CanvasElement): number {
  return element.border?.width ?? element.border?.borderWidth ?? element.borderWidth ?? 1;
}

/**
 * Centralized utility for getting border color with consistent fallback logic
 */
export function getBorderColor(element: CanvasElement): string {
  return element.border?.borderColor || element.borderColor || '#000000';
}

/**
 * Centralized utility for getting border opacity with consistent fallback logic
 */
export function getBorderOpacity(element: CanvasElement): number {
  return element.border?.opacity ?? element.border?.borderOpacity ?? element.borderOpacity ?? 1;
}

/**
 * Centralized utility for getting border theme with consistent fallback logic
 */
export function getBorderTheme(element: CanvasElement): string {
  return element.border?.theme || element.border?.borderTheme || element.border?.inheritTheme || element.theme || 'default';
}

/**
 * Get all border configuration in one place
 */
export function getBorderConfig(element: CanvasElement) {
  return {
    width: getBorderWidth(element),
    color: getBorderColor(element),
    opacity: getBorderOpacity(element),
    theme: getBorderTheme(element),
    enabled: element.border?.enabled ?? (getBorderWidth(element) > 0)
  };
}