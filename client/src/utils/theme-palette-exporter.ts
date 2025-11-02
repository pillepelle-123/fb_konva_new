import type { CanvasElement } from '../context/editor-context';
import { actualToCommon } from './font-size-converter';
import { actualToCommonStrokeWidth, actualToThemeJsonStrokeWidth } from './stroke-width-converter';
import { actualToCommonRadius } from './corner-radius-converter';

/**
 * Analyzes all elements on the current page and extracts colors to create a color palette.
 * Intelligently maps colors to palette roles (background, primary, secondary, accent, text, surface).
 */
export function extractColorPalette(elements: CanvasElement[], pageBackground: any): {
  background: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  surface: string;
} {
  const colors = new Set<string>();
  
  // Collect all colors from elements and page background
  elements.forEach(element => {
    // Text colors
    if (element.fontColor) colors.add(element.fontColor);
    if (element.questionSettings?.fontColor) colors.add(element.questionSettings.fontColor);
    if (element.answerSettings?.fontColor) colors.add(element.answerSettings.fontColor);
    if (element.textSettings?.fontColor) colors.add(element.textSettings.fontColor);
    
    // Border colors
    if (element.borderColor) colors.add(element.borderColor);
    if (element.questionSettings?.borderColor) colors.add(element.questionSettings.borderColor);
    if (element.answerSettings?.borderColor) colors.add(element.answerSettings.borderColor);
    if (element.questionSettings?.border?.borderColor) colors.add(element.questionSettings.border.borderColor);
    if (element.answerSettings?.border?.borderColor) colors.add(element.answerSettings.border.borderColor);
    
    // Background colors
    if (element.backgroundColor && element.backgroundColor !== 'transparent') colors.add(element.backgroundColor);
    if (element.questionSettings?.backgroundColor) colors.add(element.questionSettings.backgroundColor);
    if (element.answerSettings?.backgroundColor) colors.add(element.answerSettings.backgroundColor);
    if (element.questionSettings?.background?.backgroundColor) colors.add(element.questionSettings.background.backgroundColor);
    if (element.answerSettings?.background?.backgroundColor) colors.add(element.answerSettings.background.backgroundColor);
    
    // Shape colors (stroke, fill)
    if (element.stroke && element.stroke !== 'transparent') colors.add(element.stroke);
    if (element.fill && element.fill !== 'transparent') colors.add(element.fill);
    
    // Ruled lines colors
    if (element.ruledLinesColor) colors.add(element.ruledLinesColor);
    if (element.answerSettings?.ruledLinesColor) colors.add(element.answerSettings.ruledLinesColor);
    if (element.answerSettings?.ruledLines?.lineColor) colors.add(element.answerSettings.ruledLines.lineColor);
  });
  
  // Page background color
  if (pageBackground?.value && pageBackground.value !== 'transparent') {
    colors.add(pageBackground.value);
  }
  if (pageBackground?.patternForegroundColor) colors.add(pageBackground.patternForegroundColor);
  if (pageBackground?.patternBackgroundColor) colors.add(pageBackground.patternBackgroundColor);
  
  const colorArray = Array.from(colors);
  
  // Intelligently map colors to palette roles
  // Background: usually lightest or most common background color
  // Text: usually darkest, most common text color
  // Primary: most common stroke/border color
  // Secondary: second most common stroke/border color or border
  // Accent: background colors or highlights
  // Surface: lighter background/background pattern colors
  
  // Find background (lightest color or most common background)
  let background = '#ffffff';
  const backgroundColors = colorArray.filter(c => {
    const rgb = hexToRgb(c);
    if (!rgb) return false;
    const brightness = (rgb.r + rgb.g + rgb.b) / 3;
    return brightness > 200; // Light colors
  });
  if (backgroundColors.length > 0) {
    // Pick the lightest
    background = backgroundColors.sort((a, b) => {
      const aRgb = hexToRgb(a)!;
      const bRgb = hexToRgb(b)!;
      const aBright = (aRgb.r + aRgb.g + aRgb.b) / 3;
      const bBright = (bRgb.r + bRgb.g + bRgb.b) / 3;
      return bBright - aBright;
    })[0];
  }
  
  // Find text (darkest color, most common)
  let text = '#1f2937';
  const textColors = colorArray.filter(c => {
    const rgb = hexToRgb(c);
    if (!rgb) return false;
    const brightness = (rgb.r + rgb.g + rgb.b) / 3;
    return brightness < 150; // Dark colors
  });
  if (textColors.length > 0) {
    // Pick the darkest or most common
    text = textColors.sort((a, b) => {
      const aRgb = hexToRgb(a)!;
      const bRgb = hexToRgb(b)!;
      const aBright = (aRgb.r + aRgb.g + aRgb.b) / 3;
      const bBright = (bRgb.r + bRgb.g + bRgb.b) / 3;
      return aBright - bBright;
    })[0];
  }
  
  // Find primary (most common stroke/border color, not background or text)
  let primary = '#1f2937';
  const strokeColors = colorArray.filter(c => c !== background && c !== text);
  if (strokeColors.length > 0) {
    primary = strokeColors[0];
  }
  
  // Find secondary (second most common or border color)
  let secondary = '#757575';
  if (strokeColors.length > 1) {
    secondary = strokeColors[1];
  } else if (text !== '#1f2937') {
    // Use a lighter version of text
    const rgb = hexToRgb(text);
    if (rgb) {
      secondary = rgbToHex(
        Math.min(255, rgb.r + 50),
        Math.min(255, rgb.g + 50),
        Math.min(255, rgb.b + 50)
      );
    }
  }
  
  // Find accent (highlight colors, usually brighter)
  let accent = '#BDBDBD';
  const accentColors = colorArray.filter(c => {
    const rgb = hexToRgb(c);
    if (!rgb) return false;
    const brightness = (rgb.r + rgb.g + rgb.b) / 3;
    return brightness > 150 && brightness < 220 && c !== background;
  });
  if (accentColors.length > 0) {
    accent = accentColors[0];
  } else if (strokeColors.length > 2) {
    accent = strokeColors[2];
  }
  
  // Find surface (lighter backgrounds, pattern backgrounds)
  let surface = background;
  const surfaceColors = colorArray.filter(c => {
    const rgb = hexToRgb(c);
    if (!rgb) return false;
    const brightness = (rgb.r + rgb.g + rgb.b) / 3;
    return brightness > 200 && brightness < 250 && c !== background;
  });
  if (surfaceColors.length > 0) {
    surface = surfaceColors[0];
  } else {
    // Generate a slightly darker version of background
    const bgRgb = hexToRgb(background);
    if (bgRgb) {
      surface = rgbToHex(
        Math.max(0, bgRgb.r - 20),
        Math.max(0, bgRgb.g - 20),
        Math.max(0, bgRgb.b - 20)
      );
    }
  }
  
  return {
    background,
    primary,
    secondary,
    accent,
    text,
    surface
  };
}

/**
 * Extracts theme defaults from elements on the canvas.
 */
export function extractThemeDefaults(
  elements: CanvasElement[],
  pageBackground: any,
  pageTheme?: string
): {
  text: any;
  qna: any;
  shape: any;
  brush: any;
  line?: any;
} {
  const defaults: any = {
    text: {},
    qna: {},
    shape: {},
    brush: {}
  };
  
  // Find one of each element type
  const qnaElement = elements.find(el => el.textType === 'qna_inline' || el.type === 'qna_inline');
  const textElement = elements.find(el => el.textType === 'free_text' || el.type === 'free_text');
  const shapeElement = elements.find(el => 
    el.type === 'rect' || el.type === 'circle' || el.type === 'triangle' || 
    el.type === 'polygon' || el.type === 'heart' || el.type === 'star' ||
    el.type === 'speech-bubble' || el.type === 'dog' || el.type === 'cat' || el.type === 'smiley'
  );
  const brushElement = elements.find(el => el.type === 'brush' || el.type === 'brush-multicolor');
  const lineElement = elements.find(el => el.type === 'line');
  
  // Extract text defaults
  if (textElement) {
    const textDefaults: any = {};
    
    if (textElement.cornerRadius !== undefined) {
      textDefaults.cornerRadius = actualToCommonRadius(textElement.cornerRadius);
    }
    
    if (textElement.fontSize || textElement.font?.fontSize) {
      const fontSize = textElement.fontSize || textElement.font?.fontSize || 50;
      textDefaults.font = {
        fontSize: actualToCommon(fontSize),
        fontFamily: textElement.fontFamily || textElement.font?.fontFamily || 'Arial, sans-serif',
        fontBold: textElement.fontBold ?? textElement.font?.fontBold ?? false,
        fontItalic: textElement.fontItalic ?? textElement.font?.fontItalic ?? false,
        fontOpacity: textElement.fontOpacity ?? textElement.font?.fontOpacity ?? 1
      };
    }
    
    if (textElement.textSettings?.border?.enabled !== undefined || textElement.border?.enabled !== undefined) {
      const borderEnabled = textElement.textSettings?.border?.enabled ?? textElement.border?.enabled ?? false;
      const borderWidth = textElement.textSettings?.borderWidth ?? textElement.borderWidth ?? 1;
      const borderTheme = textElement.textSettings?.borderTheme ?? textElement.border?.borderTheme ?? textElement.theme ?? pageTheme ?? 'default';
      const borderOpacity = textElement.textSettings?.borderOpacity ?? textElement.borderOpacity ?? 1;
      
      textDefaults.border = {
        enabled: borderEnabled,
        borderWidth: borderWidth ? actualToThemeJsonStrokeWidth(borderWidth, borderTheme) : 0,
        borderOpacity: borderOpacity,
        borderTheme: borderTheme
      };
    }
    
    if (textElement.padding !== undefined || textElement.format?.padding !== undefined) {
      textDefaults.format = {
        textAlign: textElement.align || textElement.textSettings?.align || 'left',
        paragraphSpacing: textElement.paragraphSpacing || textElement.textSettings?.paragraphSpacing || 'medium',
        padding: textElement.padding || textElement.format?.padding || 8
      };
    }
    
    if (textElement.textSettings?.background?.enabled !== undefined || textElement.background?.enabled !== undefined) {
      const backgroundEnabled = textElement.textSettings?.background?.enabled ?? textElement.background?.enabled ?? false;
      const backgroundOpacity = textElement.textSettings?.backgroundOpacity ?? textElement.backgroundOpacity ?? 1;
      
      textDefaults.background = {
        enabled: backgroundEnabled,
        backgroundOpacity: backgroundOpacity
      };
    }
    
    if (textElement.textSettings?.ruledLines !== undefined || textElement.ruledLines !== undefined) {
      const ruledLinesEnabled = textElement.textSettings?.ruledLines ?? textElement.ruledLines ?? false;
      const ruledLinesWidth = textElement.textSettings?.ruledLinesWidth ?? textElement.ruledLinesWidth ?? 0.8;
      const ruledLinesTheme = textElement.textSettings?.ruledLinesTheme ?? textElement.ruledLinesTheme ?? 'default';
      const ruledLinesOpacity = textElement.textSettings?.ruledLinesOpacity ?? textElement.ruledLinesOpacity ?? 0.5;
      
      textDefaults.ruledLines = {
        enabled: ruledLinesEnabled,
        lineWidth: ruledLinesWidth ? actualToThemeJsonStrokeWidth(ruledLinesWidth, ruledLinesTheme) : 0.8,
        lineOpacity: ruledLinesOpacity,
        ruledLinesTheme: ruledLinesTheme
      };
    }
    
    if (Object.keys(textDefaults).length > 0) {
      defaults.text = textDefaults;
    }
  }
  
  // Extract QnA defaults
  if (qnaElement) {
    const qnaDefaults: any = {};
    
    qnaDefaults.layoutVariant = qnaElement.layoutVariant || 'inline';
    qnaDefaults.questionPosition = qnaElement.questionPosition || 'left';
    qnaDefaults.questionWidth = qnaElement.questionWidth || 40;
    
    if (qnaElement.cornerRadius !== undefined) {
      qnaDefaults.cornerRadius = actualToCommonRadius(qnaElement.cornerRadius);
    }
    
    if (qnaElement.padding !== undefined) {
      qnaDefaults.padding = qnaElement.padding;
    }
    
    qnaDefaults.paragraphSpacing = qnaElement.questionSettings?.paragraphSpacing || qnaElement.answerSettings?.paragraphSpacing || 'medium';
    qnaDefaults.align = qnaElement.questionSettings?.align || qnaElement.answerSettings?.align || 'left';
    
    // Border settings
    const borderEnabled = qnaElement.questionSettings?.border?.enabled ?? qnaElement.answerSettings?.border?.enabled ?? qnaElement.border?.enabled ?? false;
    const borderWidth = qnaElement.questionSettings?.borderWidth ?? qnaElement.answerSettings?.borderWidth ?? qnaElement.borderWidth ?? 1;
    const borderTheme = qnaElement.questionSettings?.borderTheme ?? qnaElement.answerSettings?.borderTheme ?? qnaElement.border?.borderTheme ?? qnaElement.theme ?? pageTheme ?? 'default';
    const borderOpacity = qnaElement.questionSettings?.borderOpacity ?? qnaElement.answerSettings?.borderOpacity ?? qnaElement.borderOpacity ?? 1;
    
    qnaDefaults.borderEnabled = borderEnabled;
    qnaDefaults.borderWidth = borderWidth ? actualToThemeJsonStrokeWidth(borderWidth, borderTheme) : 0;
    qnaDefaults.borderTheme = borderTheme;
    qnaDefaults.borderOpacity = borderOpacity;
    
    // Background settings
    const backgroundEnabled = qnaElement.questionSettings?.background?.enabled ?? qnaElement.answerSettings?.background?.enabled ?? qnaElement.background?.enabled ?? false;
    const backgroundOpacity = qnaElement.questionSettings?.backgroundOpacity ?? qnaElement.answerSettings?.backgroundOpacity ?? qnaElement.backgroundOpacity ?? 1;
    
    qnaDefaults.backgroundEnabled = backgroundEnabled;
    qnaDefaults.backgroundOpacity = backgroundOpacity;
    
    // Ruled lines
    const ruledLines = qnaElement.answerSettings?.ruledLines ?? false;
    const ruledLinesWidth = qnaElement.answerSettings?.ruledLinesWidth ?? 0.8;
    const ruledLinesTheme = qnaElement.answerSettings?.ruledLinesTheme ?? 'default';
    const ruledLinesOpacity = qnaElement.answerSettings?.ruledLinesOpacity ?? 0.5;
    
    qnaDefaults.ruledLines = ruledLines;
    qnaDefaults.ruledLinesWidth = ruledLinesWidth ? actualToThemeJsonStrokeWidth(ruledLinesWidth, ruledLinesTheme) : 0.8;
    qnaDefaults.ruledLinesTheme = ruledLinesTheme;
    qnaDefaults.ruledLinesOpacity = ruledLinesOpacity;
    
    // Question settings
    if (qnaElement.questionSettings) {
      const qFontSize = qnaElement.questionSettings.fontSize || qnaElement.questionSettings.font?.fontSize || 45;
      qnaDefaults.questionSettings = {
        fontSize: actualToCommon(qFontSize),
        fontFamily: qnaElement.questionSettings.fontFamily || qnaElement.fontFamily || 'Arial, sans-serif',
        fontBold: qnaElement.questionSettings.fontBold ?? false,
        fontItalic: qnaElement.questionSettings.fontItalic ?? false,
        fontOpacity: qnaElement.questionSettings.fontOpacity ?? 1
      };
    }
    
    // Answer settings
    if (qnaElement.answerSettings) {
      const aFontSize = qnaElement.answerSettings.fontSize || qnaElement.answerSettings.font?.fontSize || 50;
      qnaDefaults.answerSettings = {
        fontSize: actualToCommon(aFontSize),
        fontFamily: qnaElement.answerSettings.fontFamily || qnaElement.fontFamily || 'Arial, sans-serif',
        fontBold: qnaElement.answerSettings.fontBold ?? false,
        fontItalic: qnaElement.answerSettings.fontItalic ?? false,
        fontOpacity: qnaElement.answerSettings.fontOpacity ?? 1
      };
    }
    
    defaults.qna = qnaDefaults;
  }
  
  // Extract shape defaults
  if (shapeElement) {
    const shapeDefaults: any = {};
    
    if (shapeElement.strokeWidth !== undefined) {
      const strokeTheme = shapeElement.inheritTheme || shapeElement.theme || pageTheme || 'default';
      shapeDefaults.strokeWidth = actualToThemeJsonStrokeWidth(shapeElement.strokeWidth, strokeTheme);
    }
    
    if (shapeElement.cornerRadius !== undefined) {
      shapeDefaults.cornerRadius = actualToCommonRadius(shapeElement.cornerRadius);
    }
    
    if (shapeElement.strokeOpacity !== undefined || shapeElement.opacity !== undefined) {
      shapeDefaults.opacity = shapeElement.strokeOpacity ?? shapeElement.opacity ?? 1;
    }
    
    shapeDefaults.inheritTheme = shapeElement.inheritTheme || shapeElement.theme || 'default';
    
    // Check if shape has border/background enabled (look for stroke/fill)
    shapeDefaults.borderEnabled = !!(shapeElement.stroke && shapeElement.stroke !== 'transparent');
    shapeDefaults.backgroundEnabled = !!(shapeElement.fill && shapeElement.fill !== 'transparent');
    
    defaults.shape = shapeDefaults;
  }
  
  // Extract brush defaults
  if (brushElement) {
    const brushDefaults: any = {};
    
    if (brushElement.strokeWidth !== undefined) {
      const strokeTheme = brushElement.inheritTheme || brushElement.theme || pageTheme || 'default';
      brushDefaults.strokeWidth = actualToThemeJsonStrokeWidth(brushElement.strokeWidth, strokeTheme);
    }
    
    if (brushElement.strokeOpacity !== undefined) {
      brushDefaults.strokeOpacity = brushElement.strokeOpacity;
    }
    
    brushDefaults.inheritTheme = brushElement.inheritTheme || brushElement.theme || 'default';
    
    defaults.brush = brushDefaults;
  }
  
  // Extract line defaults
  if (lineElement) {
    const lineDefaults: any = {};
    
    if (lineElement.strokeWidth !== undefined) {
      const strokeTheme = lineElement.inheritTheme || lineElement.theme || pageTheme || 'default';
      lineDefaults.strokeWidth = actualToThemeJsonStrokeWidth(lineElement.strokeWidth, strokeTheme);
    }
    
    lineDefaults.inheritTheme = lineElement.inheritTheme || lineElement.theme || 'default';
    
    defaults.line = lineDefaults;
  }
  
  return defaults;
}

/**
 * Generates a theme ID from a name (lowercase, replace spaces with dashes).
 */
export function generateThemeId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Generates a palette ID from a name (lowercase, replace spaces with dashes).
 */
export function generatePaletteId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Creates JSON string for a color palette that can be pasted into color-palettes.json
 */
export function generatePaletteJSON(paletteId: string, paletteName: string, colors: {
  background: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  surface: string;
}, contrast: 'AA' | 'AAA' = 'AA'): string {
  const palette = {
    id: paletteId,
    name: paletteName,
    colors: {
      background: colors.background,
      primary: colors.primary,
      secondary: colors.secondary,
      accent: colors.accent,
      text: colors.text,
      surface: colors.surface
    },
    contrast: contrast
  };
  
  return JSON.stringify(palette, null, 2);
}

/**
 * Creates JSON string for a theme that can be pasted into themes.json
 */
export function generateThemeJSON(
  themeId: string,
  themeName: string,
  themeDescription: string,
  paletteId: string,
  pageSettings: any,
  elementDefaults: any
): string {
  const theme: any = {
    name: themeName,
    description: themeDescription,
    palette: paletteId,
    pageSettings: {
      backgroundOpacity: pageSettings.backgroundOpacity ?? 1,
      backgroundPattern: pageSettings.backgroundPattern || {
        enabled: false,
        style: 'dots',
        size: 20,
        strokeWidth: 1,
        patternBackgroundOpacity: 0.3
      }
    },
    elementDefaults: {}
  };
  
  // Add text defaults
  if (elementDefaults.text && Object.keys(elementDefaults.text).length > 0) {
    theme.elementDefaults.text = elementDefaults.text;
  }
  
  // Add qna defaults
  if (elementDefaults.qna && Object.keys(elementDefaults.qna).length > 0) {
    theme.elementDefaults.qna = elementDefaults.qna;
  }
  
  // Add shape defaults
  if (elementDefaults.shape && Object.keys(elementDefaults.shape).length > 0) {
    theme.elementDefaults.shape = elementDefaults.shape;
  }
  
  // Add brush defaults
  if (elementDefaults.brush && Object.keys(elementDefaults.brush).length > 0) {
    theme.elementDefaults.brush = elementDefaults.brush;
  }
  
  // Add line defaults
  if (elementDefaults.line && Object.keys(elementDefaults.line).length > 0) {
    theme.elementDefaults.line = elementDefaults.line;
  }
  
  return JSON.stringify({ [themeId]: theme }, null, 2);
}

/**
 * Creates mapping entry for theme-palette-mapping.ts
 */
export function generateThemePaletteMapping(themeId: string, paletteId: string): string {
  return `  '${themeId}': '${paletteId}',`;
}

// Helper functions
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Main export function that analyzes elements and generates JSON for theme and palette.
 * Prints the JSON to the browser console.
 */
export function exportThemeAndPalette(
  themeName: string,
  paletteName: string,
  elements: CanvasElement[],
  pageBackground: any,
  pageTheme?: string
) {
  // Generate IDs
  const themeId = generateThemeId(themeName);
  const paletteId = generatePaletteId(paletteName);
  
  // Extract color palette
  const colors = extractColorPalette(elements, pageBackground);
  
  // Extract theme defaults
  const elementDefaults = extractThemeDefaults(elements, pageBackground, pageTheme);
  
  // Generate page settings from current page background
  const pageSettings: any = {
    backgroundOpacity: pageBackground?.opacity ?? 1,
    backgroundPattern: pageBackground?.type === 'pattern' ? {
      enabled: true,
      style: pageBackground.value || 'dots',
      size: pageBackground.patternSize || 20,
      strokeWidth: pageBackground.patternStrokeWidth || 1,
      patternBackgroundOpacity: pageBackground.patternBackgroundOpacity ?? 0.3
    } : {
      enabled: false,
      style: 'dots',
      size: 20,
      strokeWidth: 1,
      patternBackgroundOpacity: 0.3
    }
  };
  
  // Generate theme JSON
  const themeJSON = generateThemeJSON(
    themeId,
    themeName,
    `Custom theme exported from canvas`,
    paletteId,
    pageSettings,
    elementDefaults
  );
  
  // Generate palette JSON
  const paletteJSON = generatePaletteJSON(
    paletteId,
    paletteName,
    colors,
    'AA' // Default contrast, can be improved with color analysis
  );
  
  // Generate mapping entry
  const mappingEntry = generateThemePaletteMapping(themeId, paletteId);
  
  // Print to console
  console.log('========================================');
  console.log('THEME JSON (für themes.json):');
  console.log('========================================');
  console.log(themeJSON);
  console.log('\n');
  console.log('========================================');
  console.log('PALETTE JSON (für color-palettes.json):');
  console.log('========================================');
  console.log(paletteJSON);
  console.log('\n');
  console.log('========================================');
  console.log('THEME-PALETTE MAPPING (für theme-palette-mapping.ts):');
  console.log('========================================');
  console.log(mappingEntry);
  console.log('\n');
  console.log('========================================');
  console.log('ANLEITUNG:');
  console.log('========================================');
  console.log(`1. Kopieren Sie das THEME JSON und fügen Sie es in client/src/data/templates/themes.json ein`);
  console.log(`2. Kopieren Sie das PALETTE JSON und fügen Sie es in das "palettes" Array in client/src/data/templates/color-palettes.json ein`);
  console.log(`3. Kopieren Sie die MAPPING ENTRY und fügen Sie sie in THEME_PALETTE_MAP in client/src/data/theme-palette-mapping.ts ein`);
  console.log('========================================');
}

