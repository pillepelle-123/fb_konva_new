import type { CanvasElement } from '../context/editor-context';

/**
 * Centralized utility for getting ruled lines opacity with consistent fallback logic
 */
export function getRuledLinesOpacity(element: CanvasElement): number {
  return element.ruledLines?.opacity ?? element.ruledLines?.lineOpacity ?? element.ruledLinesOpacity ?? 0.7;
}

/**
 * Get all ruled lines configuration in one place
 */
export function getRuledLinesConfig(element: CanvasElement) {
  return {
    opacity: getRuledLinesOpacity(element),
    color: element.ruledLines?.lineColor || element.ruledLinesColor || '#1f2937',
    width: element.ruledLines?.width ?? element.ruledLines?.lineWidth ?? element.ruledLinesWidth ?? 0.8,
    theme: element.ruledLines?.theme || element.ruledLines?.ruledLinesTheme || element.ruledLines?.inheritTheme || element.ruledLinesTheme || 'rough',
    enabled: element.ruledLines?.enabled ?? (element.ruledLines || false)
  };
}