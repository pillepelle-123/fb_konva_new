import type { CanvasElement } from '../context/editor-context';

export function getElementTheme(element: CanvasElement): string {
  return element.inheritTheme || element.theme || 'default';
}

export function getBorderTheme(element: CanvasElement): string {
  return element.border?.borderTheme || element.border?.inheritTheme || element.theme || 'default';
}

export function getRuledLinesTheme(element: CanvasElement): string {
  return element.ruledLines?.ruledLinesTheme || element.ruledLines?.inheritTheme || element.ruledLinesTheme || 'rough';
}

export function getThemeConfig(element: CanvasElement) {
  return {
    elementTheme: getElementTheme(element),
    borderTheme: getBorderTheme(element),
    ruledLinesTheme: getRuledLinesTheme(element)
  };
}