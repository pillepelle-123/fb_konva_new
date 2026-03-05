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
    style: element.ruledLines?.ruledLinesStyle ?? element.ruledLines?.style ?? element.ruledLines?.inheritStyle ?? (element as any).ruledLinesStyle ?? 'rough',
    enabled: element.ruledLines?.enabled ?? (element.ruledLines || false)
  };
}