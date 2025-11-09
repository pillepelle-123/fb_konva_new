import type { CanvasElement } from '../context/editor-context';

export function getTextAlign(element: CanvasElement): string {
  return element.format?.textAlign || element.align || 'left';
}

export function getParagraphSpacing(element: CanvasElement): string {
  return element.format?.paragraphSpacing || element.paragraphSpacing || 'medium';
}

export function getPadding(element: CanvasElement): number {
  return element.format?.padding || element.padding || 4;
}

export function getLineHeight(element: CanvasElement): number {
  return element.format?.lineHeight || element.lineHeight || 1.2;
}

export function getFormatConfig(element: CanvasElement) {
  return {
    align: getTextAlign(element),
    paragraphSpacing: getParagraphSpacing(element),
    padding: getPadding(element),
    lineHeight: element.format?.lineHeight || element.lineHeight
  };
}