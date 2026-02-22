import type { CanvasElement } from '../context/editor-context';
import { actualToCommon } from './font-size-converter';
import { actualToCommonStrokeWidth, actualToThemeJsonStrokeWidth } from './stroke-width-converter';
import { actualToCommonRadius } from './corner-radius-converter';
import { displayJSONInNewWindow } from './json-display';

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
    
    // Ruled lines colors (now only on element level)
    if (element.ruledLinesColor) colors.add(element.ruledLinesColor);
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
  shape: any;
  brush: any;
  image?: any;
  sticker?: any;
  line?: any;
} {
  const defaults: any = {
    text: {},
    shape: {},
    brush: {},
    image: {},
    sticker: {}
  };
  
  // Find one of each element type (qna and qna2 share the same theme structure)
  const qnaElement = elements.find(el => el.textType === 'qna' || el.textType === 'qna2' || el.type === 'qna');
  const textElement = elements.find(el => el.textType === 'free_text' || el.type === 'free_text');
  const imageElement = elements.find(el => el.type === 'image' || el.type === 'placeholder');
  const stickerElement = elements.find(el => el.type === 'sticker');
  const shapeElement = elements.find(el => 
    el.type === 'rect' || el.type === 'circle' || el.type === 'triangle' || 
    el.type === 'polygon' || el.type === 'heart' || el.type === 'star' ||
    el.type === 'speech-bubble' || el.type === 'dog' || el.type === 'cat' || el.type === 'smiley'
  );
  const brushElement = elements.find(el => el.type === 'brush' || el.type === 'brush-multicolor');
  const lineElement = elements.find(el => el.type === 'line');
  
  // Extract text defaults
  const rawTextDefaults: any = {};
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
        width: borderWidth ? actualToThemeJsonStrokeWidth(borderWidth, borderTheme) : 0,
        opacity: borderOpacity,
        theme: borderTheme
      };
    }
    
    if (textElement.padding !== undefined || textElement.format?.padding !== undefined) {
      textDefaults.format = {
        textAlign: textElement.textSettings?.align || textElement.format?.textAlign || textElement.align || 'left',
        paragraphSpacing: textElement.paragraphSpacing || textElement.textSettings?.paragraphSpacing || 'medium',
        padding: textElement.padding || textElement.format?.padding || 8
      };
    }
    
    if (textElement.textSettings?.background?.enabled !== undefined || textElement.background?.enabled !== undefined) {
      const backgroundEnabled = textElement.textSettings?.background?.enabled ?? textElement.background?.enabled ?? false;
      const backgroundOpacity = textElement.textSettings?.backgroundOpacity ?? textElement.backgroundOpacity ?? textElement.background?.opacity ?? 1;
      
      textDefaults.background = {
        enabled: backgroundEnabled,
        opacity: backgroundOpacity
      };
    }
    
    if (textElement.textSettings?.ruledLines !== undefined || textElement.ruledLines !== undefined) {
      const ruledLinesEnabled = textElement.textSettings?.ruledLines ?? textElement.ruledLines ?? false;
      const ruledLinesWidth = textElement.textSettings?.ruledLinesWidth ?? textElement.ruledLinesWidth ?? textElement.ruledLines?.width ?? 0.8;
      const ruledLinesTheme = textElement.textSettings?.ruledLinesTheme ?? textElement.ruledLinesTheme ?? textElement.ruledLines?.theme ?? 'default';
      const ruledLinesOpacity = textElement.textSettings?.ruledLinesOpacity ?? textElement.ruledLinesOpacity ?? textElement.ruledLines?.opacity ?? 0.5;
      
      textDefaults.ruledLines = {
        enabled: ruledLinesEnabled,
        width: ruledLinesWidth ? actualToThemeJsonStrokeWidth(ruledLinesWidth, ruledLinesTheme) : 0.8,
        opacity: ruledLinesOpacity,
        theme: ruledLinesTheme
      };
    }
    
    if (Object.keys(textDefaults).length > 0) {
      Object.assign(rawTextDefaults, textDefaults);
    }
  }
  
  // Extract QnA defaults
  const rawQnaDefaults: any = {};
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
    qnaDefaults.align = qnaElement.questionSettings?.align || qnaElement.answerSettings?.align || qnaElement.format?.textAlign || qnaElement.align || 'left';
    
    // Border settings
    const borderEnabled = qnaElement.questionSettings?.border?.enabled ?? qnaElement.answerSettings?.border?.enabled ?? qnaElement.border?.enabled ?? false;
    const borderWidth = qnaElement.questionSettings?.borderWidth ?? qnaElement.answerSettings?.borderWidth ?? qnaElement.borderWidth ?? 1;
    const borderTheme = qnaElement.questionSettings?.borderTheme ?? qnaElement.answerSettings?.borderTheme ?? qnaElement.border?.borderTheme ?? qnaElement.theme ?? pageTheme ?? 'default';
    const borderOpacity = qnaElement.questionSettings?.borderOpacity ?? qnaElement.answerSettings?.borderOpacity ?? qnaElement.borderOpacity ?? 1;
    
    qnaDefaults.border = {
      enabled: borderEnabled,
      width: borderWidth ? actualToThemeJsonStrokeWidth(borderWidth, borderTheme) : 0,
      opacity: borderOpacity,
      theme: borderTheme
    };
    
    // Background settings
    const backgroundEnabled = qnaElement.questionSettings?.background?.enabled ?? qnaElement.answerSettings?.background?.enabled ?? qnaElement.background?.enabled ?? false;
    const backgroundOpacity = qnaElement.questionSettings?.backgroundOpacity ?? qnaElement.answerSettings?.backgroundOpacity ?? qnaElement.backgroundOpacity ?? 1;
    
    qnaDefaults.background = {
      enabled: backgroundEnabled,
      opacity: backgroundOpacity
    };
    
    // Ruled lines (element level: ruledLines.enabled or ruledLinesEnabled)
    const ruledLines = qnaElement.ruledLines?.enabled ?? qnaElement.ruledLinesEnabled ?? false;
    const ruledLinesWidth = qnaElement.ruledLinesWidth ?? qnaElement.ruledLines?.width ?? 0.8;
    const ruledLinesTheme = qnaElement.ruledLinesTheme ?? qnaElement.ruledLines?.theme ?? 'default';
    const ruledLinesOpacity = qnaElement.ruledLinesOpacity ?? qnaElement.ruledLines?.opacity ?? 0.5;
    
    qnaDefaults.ruledLines = {
      enabled: ruledLines,
      width: ruledLinesWidth ? actualToThemeJsonStrokeWidth(ruledLinesWidth, ruledLinesTheme) : 0.8,
      theme: ruledLinesTheme,
      opacity: ruledLinesOpacity
    };
    
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
    
    Object.assign(rawQnaDefaults, qnaDefaults);
  }

  const mergedTextDefaults: any = {};
  const mergeIfMissing = (target: any, source: any) => {
    if (!source) return;
    for (const key of Object.keys(source)) {
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!(key in target) || typeof target[key] !== 'object' || Array.isArray(target[key])) {
          target[key] = Array.isArray(value) ? [...value] : {};
        }
        mergeIfMissing(target[key], value);
      } else {
        if (!(key in target)) {
          target[key] = value;
        }
      }
    }
  };

  if (Object.keys(rawQnaDefaults).length > 0) {
    Object.assign(mergedTextDefaults, rawQnaDefaults);
  }
  mergeIfMissing(mergedTextDefaults, rawTextDefaults);

  if (Object.keys(mergedTextDefaults).length > 0) {
    defaults.text = mergedTextDefaults;
  } else if (Object.keys(rawTextDefaults).length > 0) {
    defaults.text = rawTextDefaults;
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
    
    if (shapeElement.borderOpacity !== undefined || shapeElement.opacity !== undefined) {
      shapeDefaults.borderOpacity = shapeElement.borderOpacity ?? shapeElement.opacity ?? 1;
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

  // Extract image defaults (image + placeholder)
  if (imageElement) {
    const imageDefaults: any = {};
    if (imageElement.imageOpacity !== undefined) {
      imageDefaults.imageOpacity = imageElement.imageOpacity;
    }
    if (imageElement.cornerRadius !== undefined) {
      imageDefaults.cornerRadius = actualToCommonRadius(imageElement.cornerRadius);
    }
    const frameEnabled = imageElement.frameEnabled !== undefined
      ? imageElement.frameEnabled
      : ((imageElement.strokeWidth || 0) > 0);
    imageDefaults.frameEnabled = frameEnabled;
    const frameTheme = imageElement.frameTheme || imageElement.theme || pageTheme || 'default';
    imageDefaults.frameTheme = frameTheme;
    if (imageElement.strokeWidth !== undefined) {
      imageDefaults.strokeWidth = actualToThemeJsonStrokeWidth(imageElement.strokeWidth, frameTheme);
    }
    if (imageElement.borderOpacity !== undefined) {
      imageDefaults.borderOpacity = imageElement.borderOpacity;
    }
    if (Object.keys(imageDefaults).length > 0) {
      defaults.image = imageDefaults;
    }
  }

  // Extract sticker defaults
  if (stickerElement) {
    const stickerDefaults: any = {};
    if (stickerElement.stickerColor) {
      stickerDefaults.stickerColor = stickerElement.stickerColor;
    }
    if (stickerElement.imageOpacity !== undefined) {
      stickerDefaults.imageOpacity = stickerElement.imageOpacity;
    }
    const ts = stickerElement.stickerTextSettings;
    if (ts && (ts.fontSize !== undefined || ts.fontFamily !== undefined || ts.fontBold !== undefined || ts.fontItalic !== undefined || ts.fontOpacity !== undefined)) {
      stickerDefaults.stickerTextSettings = {
        fontSize: ts.fontSize !== undefined ? actualToCommon(ts.fontSize) : 12,
        fontFamily: ts.fontFamily || 'Century Gothic, sans-serif',
        fontBold: ts.fontBold ?? false,
        fontItalic: ts.fontItalic ?? false,
        fontOpacity: ts.fontOpacity ?? 1
      };
    }
    if (Object.keys(stickerDefaults).length > 0) {
      defaults.sticker = stickerDefaults;
    }
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
 * Builds pageSettings object from Page.background for theme config.
 */
export function buildPageSettingsFromBackground(background: { type?: string; value?: string; opacity?: number; patternSize?: number; patternStrokeWidth?: number; patternBackgroundOpacity?: number; backgroundImageTemplateId?: string; imageSize?: string; imageRepeat?: boolean; imagePosition?: string; imageContainWidthPercent?: number } | undefined): Record<string, unknown> {
  return {
    backgroundOpacity: background?.opacity ?? 1,
    backgroundPattern: background?.type === 'pattern'
      ? {
          enabled: true,
          style: background.value || 'dots',
          size: background.patternSize || 20,
          strokeWidth: background.patternStrokeWidth || 1,
          patternBackgroundOpacity: background.patternBackgroundOpacity ?? 0.3
        }
      : { enabled: false, style: 'dots', size: 20, strokeWidth: 1, patternBackgroundOpacity: 0.3 },
    backgroundImage: background?.backgroundImageTemplateId
      ? {
          enabled: true,
          templateId: background.backgroundImageTemplateId,
          size: background.imageSize || 'cover',
          repeat: background.imageRepeat ?? false,
          opacity: background.opacity ?? 1,
          position: background.imagePosition || 'top-left',
          width: background.imageContainWidthPercent ?? 100
        }
      : { enabled: false }
  };
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
export function generatePaletteJSON(
  paletteId: string,
  paletteName: string,
  colors: {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    surface: string;
  },
  contrast: 'AA' | 'AAA' = 'AA',
  parts?: Record<string, string>
): string {
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
    contrast,
    ...(parts && Object.keys(parts).length > 0 ? { parts } : {})
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
  const defaultBackgroundPattern = {
    enabled: false,
    style: 'dots',
    size: 20,
    strokeWidth: 1,
    patternBackgroundOpacity: 0.3
  };

  const defaultBackgroundImage = {
    enabled: false
  };

  const theme: any = {
    name: themeName,
    description: themeDescription,
    palette: paletteId,
    pageSettings: {
      backgroundOpacity: pageSettings.backgroundOpacity ?? 1,
      backgroundPattern: pageSettings.backgroundPattern
        ? { ...pageSettings.backgroundPattern }
        : { ...defaultBackgroundPattern },
      backgroundImage: pageSettings.backgroundImage
        ? { ...pageSettings.backgroundImage }
        : { ...defaultBackgroundImage }
    },
    elementDefaults: {}
  };
  
  // Add text defaults
  if (elementDefaults.text && Object.keys(elementDefaults.text).length > 0) {
    theme.elementDefaults.text = elementDefaults.text;
  }
  
  // Add shape defaults
  if (elementDefaults.shape && Object.keys(elementDefaults.shape).length > 0) {
    theme.elementDefaults.shape = elementDefaults.shape;
  }
  
  // Add brush defaults
  if (elementDefaults.brush && Object.keys(elementDefaults.brush).length > 0) {
    theme.elementDefaults.brush = elementDefaults.brush;
  }

  // Add image defaults
  if (elementDefaults.image && Object.keys(elementDefaults.image).length > 0) {
    theme.elementDefaults.image = elementDefaults.image;
  }

  // Add sticker defaults
  if (elementDefaults.sticker && Object.keys(elementDefaults.sticker).length > 0) {
    theme.elementDefaults.sticker = elementDefaults.sticker;
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
 * Displays JSON in a new browser window and also prints to console.
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
    },
    backgroundImage: pageBackground?.backgroundImageTemplateId ? {
      enabled: true,
      templateId: pageBackground.backgroundImageTemplateId,
      size: pageBackground.imageSize || 'cover',
      repeat: pageBackground.imageRepeat ?? false,
      opacity: pageBackground.opacity ?? 1,
      position: pageBackground.imagePosition || 'top-left',
      width: pageBackground.imageContainWidthPercent ?? 100
    } : {
      enabled: false
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
  
  // Combine all JSON into a formatted output
  const combinedOutput = `========================================
THEME JSON (für themes.json):
========================================
${themeJSON}

========================================
PALETTE JSON (für color-palettes.json):
========================================
${paletteJSON}

========================================
THEME-PALETTE MAPPING (für theme-palette-mapping.ts):
========================================
${mappingEntry}

========================================
ANLEITUNG:
========================================
1. Kopieren Sie das THEME JSON und fügen Sie es in client/src/data/templates/themes.json ein
2. Kopieren Sie das PALETTE JSON und fügen Sie es in das "palettes" Array in client/src/data/templates/color-palettes.json ein
3. Kopieren Sie die MAPPING ENTRY und fügen Sie sie in THEME_PALETTE_MAP in client/src/data/theme-palette-mapping.ts ein
========================================`;

  // Display in new window
  displayJSONInNewWindow('Theme & Palette Export', combinedOutput);
  
  // Also print to console for backward compatibility
  console.log(combinedOutput);
}

