import type { CanvasElement } from '../context/editor-context';

/**
 * Centralized utility for getting background color with consistent fallback logic
 */
export function getBackgroundColor(element: CanvasElement): string {
  return element.background?.backgroundColor || element.backgroundColor || 'transparent';
}

/**
 * Centralized utility for getting background opacity with consistent fallback logic
 */
export function getBackgroundOpacity(element: CanvasElement): number {
  return element.background?.backgroundOpacity ?? element.backgroundOpacity ?? 1;
}

/**
 * Centralized utility for getting background enabled state with consistent fallback logic
 */
export function getBackgroundEnabled(element: CanvasElement): boolean {
  if (element.background?.enabled !== undefined) {
    return element.background.enabled;
  }
  const color = getBackgroundColor(element);
  return color !== 'transparent' && color !== undefined;
}

/**
 * Get all background configuration in one place
 */
export function getBackgroundConfig(element: CanvasElement) {
  return {
    color: getBackgroundColor(element),
    opacity: getBackgroundOpacity(element),
    enabled: getBackgroundEnabled(element)
  };
}