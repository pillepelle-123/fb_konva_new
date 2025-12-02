import type { TextboxStyle, ShapeStyle } from '../types/template-types';
import { commonToActual } from './font-size-converter';

/**
 * Applies template styling to textbox elements
 * Only applies primary layout properties: fontSize, textAlign, padding, paragraphSpacing
 * Font-Sizes in Templates sind in "common" Format und müssen zu "actual" konvertiert werden
 */
export function applyTextboxStyle(element: any, style?: TextboxStyle): any {
  if (!style) return element;

  const styledElement = { ...element };

  // Apply only primary layout properties from format section
  if (style.format) {
    // For qna_inline, align is on top-level, not in format.textAlign
    if (style.format.textAlign) {
      if (styledElement.textType === 'qna_inline') {
        styledElement.align = style.format.textAlign;
      } else {
        styledElement.format = styledElement.format || {};
        styledElement.format.textAlign = style.format.textAlign;
      }
    }
    if (style.format.paragraphSpacing) styledElement.paragraphSpacing = style.format.paragraphSpacing;
    if (style.format.padding) styledElement.padding = style.format.padding;
  }

  // Note: fontSize is handled separately in questionSettings/answerSettings for qna_inline
  // or directly on element for free_text, not from style.font.fontSize

  // All other styling properties (fontFamily, fontBold, fontItalic, fontOpacity, 
  // border, background, ruledLines, cornerRadius) are handled by themes, not layouts

  return styledElement;
}

/**
 * Applies template styling to shape elements
 */
export function applyShapeStyle(element: any, style?: ShapeStyle): any {
  if (!style) return element;

  const styledElement = { ...element };

  if (style.strokeWidth) styledElement.strokeWidth = style.strokeWidth;
  if (style.cornerRadius !== undefined) styledElement.cornerRadius = style.cornerRadius;
  if (style.stroke) styledElement.stroke = style.stroke;
  if (style.fill) styledElement.fill = style.fill;
  if (style.opacity !== undefined) styledElement.opacity = style.opacity;
  if (style.inheritTheme) styledElement.inheritTheme = style.inheritTheme;
  if (style.borderEnabled !== undefined) styledElement.borderEnabled = style.borderEnabled;
  if (style.backgroundEnabled !== undefined) styledElement.backgroundEnabled = style.backgroundEnabled;

  return styledElement;
}

/**
 * Applies template theme to brush settings
 */
export function applyBrushTheme(brushSettings: any, theme: string): any {
  const themedSettings = { ...brushSettings };
  
  switch (theme) {
    case 'sketchy':
      themedSettings.inheritTheme = 'rough';
      themedSettings.strokeWidth = Math.max(themedSettings.strokeWidth || 2, 3);
      break;
    case 'colorful':
      themedSettings.inheritTheme = 'glow';
      themedSettings.strokeWidth = Math.max(themedSettings.strokeWidth || 2, 4);
      break;
    case 'vintage':
      themedSettings.inheritTheme = 'wobbly';
      break;
    case 'dark':
      themedSettings.inheritTheme = 'zigzag';
      break;
    default:
      themedSettings.inheritTheme = 'default';
  }
  
  return themedSettings;
}