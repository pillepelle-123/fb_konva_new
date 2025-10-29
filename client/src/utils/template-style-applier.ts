import type { TextboxStyle, ShapeStyle } from '../types/template-types';

/**
 * Applies template styling to textbox elements
 */
export function applyTextboxStyle(element: any, style?: TextboxStyle): any {
  if (!style) return element;

  const styledElement = { ...element };

  // Apply font styling
  if (style.font) {
    if (style.font.fontSize) styledElement.fontSize = style.font.fontSize;
    if (style.font.fontFamily) styledElement.fontFamily = style.font.fontFamily;
    if (style.font.fontBold !== undefined) styledElement.fontWeight = style.font.fontBold ? 'bold' : 'normal';
    if (style.font.fontItalic !== undefined) styledElement.fontStyle = style.font.fontItalic ? 'italic' : 'normal';
    if (style.font.fontColor) styledElement.fontColor = style.font.fontColor;
    if (style.font.fontOpacity !== undefined) styledElement.fontOpacity = style.font.fontOpacity;
  }

  // Apply border styling
  if (style.border) {
    if (style.border.enabled !== undefined) styledElement.borderEnabled = style.border.enabled;
    if (style.border.borderWidth) styledElement.borderWidth = style.border.borderWidth;
    if (style.border.borderColor) styledElement.borderColor = style.border.borderColor;
    if (style.border.borderOpacity !== undefined) styledElement.borderOpacity = style.border.borderOpacity;
    if (style.border.borderTheme) styledElement.borderTheme = style.border.borderTheme;
  }

  // Apply format styling
  if (style.format) {
    if (style.format.textAlign) styledElement.align = style.format.textAlign;
    if (style.format.paragraphSpacing) styledElement.paragraphSpacing = style.format.paragraphSpacing;
    if (style.format.padding) styledElement.padding = style.format.padding;
  }

  // Apply background styling
  if (style.background) {
    if (style.background.enabled !== undefined) styledElement.backgroundEnabled = style.background.enabled;
    if (style.background.backgroundColor) styledElement.backgroundColor = style.background.backgroundColor;
    if (style.background.backgroundOpacity !== undefined) styledElement.backgroundOpacity = style.background.backgroundOpacity;
  }

  // Apply ruled lines styling
  if (style.ruledLines) {
    if (style.ruledLines.enabled !== undefined) styledElement.ruledLines = style.ruledLines.enabled;
    if (style.ruledLines.lineWidth) styledElement.ruledLinesWidth = style.ruledLines.lineWidth;
    if (style.ruledLines.lineColor) styledElement.ruledLinesColor = style.ruledLines.lineColor;
    if (style.ruledLines.lineOpacity !== undefined) styledElement.ruledLinesOpacity = style.ruledLines.lineOpacity;
    if (style.ruledLines.ruledLinesTheme) styledElement.ruledLinesTheme = style.ruledLines.ruledLinesTheme;
  }

  // Apply corner radius
  if (style.cornerRadius !== undefined) styledElement.cornerRadius = style.cornerRadius;

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