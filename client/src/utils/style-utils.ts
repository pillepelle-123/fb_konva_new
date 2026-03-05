import type { CanvasElement } from '../context/editor-context';

export function getElementStyle(element: CanvasElement): string {
  return (element as any).inheritStyle ?? 'rough';
}

export function getBorderStyle(element: CanvasElement): string {
  return element.border?.borderStyle ?? element.border?.style ?? element.border?.inheritStyle ?? 'default';
}

export function getRuledLinesStyle(element: CanvasElement): string {
  return element.ruledLines?.ruledLinesStyle ?? element.ruledLines?.style ?? element.ruledLines?.inheritStyle ?? (element as any).ruledLinesStyle ?? 'rough';
}

export function getStyleConfig(element: CanvasElement) {
  return {
    elementStyle: getElementStyle(element),
    borderStyle: getBorderStyle(element),
    ruledLinesStyle: getRuledLinesStyle(element)
  };
}
