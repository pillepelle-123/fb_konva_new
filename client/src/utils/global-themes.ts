import type { CanvasElement } from '../context/editor-context';
import { colorPalettes } from '../data/templates/color-palettes';
import type { ColorPalette } from '../types/template-types';
import { commonToActual } from './font-size-converter';
import { themeJsonToActualStrokeWidth } from './stroke-width-converter';
import { commonToActualRadius } from './corner-radius-converter';
import themesData from '../data/themes.json';

// Get palette from color-palettes.ts (single source of truth)
function getPalette(paletteId: string): ColorPalette | undefined {
  return colorPalettes.find(p => p.id === paletteId);
}

export interface GlobalTheme {
  id: string;
  name: string;
  description: string;
  pageSettings: {
    backgroundColor: string;
    backgroundOpacity: number;
    backgroundPattern?: {
      enabled: boolean;
      style: 'dots' | 'grid' | 'lines' | 'crosses';
      size: number;
      strokeWidth: number;
      patternBackgroundColor: string;
      patternBackgroundOpacity: number;
    };
    backgroundImage?: {
      enabled: boolean;
      size: 'cover' | 'contain' | 'stretch';
      repeat?: boolean;
    };
    cornerRadius: number;
  };
  elementDefaults: {
    text: Partial<CanvasElement>;
    question: Partial<CanvasElement>;
    answer: Partial<CanvasElement>;
    image: Partial<CanvasElement>;
    shape: Partial<CanvasElement>;
    brush: Partial<CanvasElement>;
  };
}

interface ThemeConfig {
  name: string;
  description: string;
  palette: string;
  pageSettings: any;
  elementDefaults: any;
}

const processedThemeCache = new Map<string, GlobalTheme>();

function createTheme(id: string, config: ThemeConfig): GlobalTheme {
  const palette = getPalette(config.palette);
  
  const buildElement = (elementType: string, defaults: any) => {
    // Convert strokeWidth if it exists directly in defaults (for shapes/brushes)
    const convertedDefaults = { ...defaults };
    if (convertedDefaults.strokeWidth !== undefined && typeof convertedDefaults.strokeWidth === 'number') {
      const strokeTheme = convertedDefaults.inheritTheme || id;
      convertedDefaults.strokeWidth = themeJsonToActualStrokeWidth(convertedDefaults.strokeWidth, strokeTheme);
    }
    
    const base = {
      theme: id,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      ...convertedDefaults
    };

    // Map nested font properties to flat canvas element properties
    // NOTE: Colors are NOT read from themes.json - they come from color-palettes.ts via palette
    if (base.font) {
      // Convert font size from common scale to actual size
      if (base.font.fontSize !== undefined) {
        base.fontSize = commonToActual(base.font.fontSize);
      }
      if (base.font.fontFamily) base.fontFamily = base.font.fontFamily;
      if (base.font.fontBold !== undefined) {
        base.fontWeight = base.font.fontBold ? 'bold' : 'normal';
        base.fontBold = base.font.fontBold;
      }
      if (base.font.fontItalic !== undefined) {
        base.fontStyle = base.font.fontItalic ? 'italic' : 'normal';
        base.fontItalic = base.font.fontItalic;
      }
      if (base.font.fontOpacity !== undefined) {
        base.strokeOpacity = base.font.fontOpacity;
        base.fontOpacity = base.font.fontOpacity;
      }
      // fontColor is set from palette below, not from themes.json
    }

    // Map nested border properties to flat canvas element properties
    // NOTE: Colors are NOT read from themes.json - they come from color-palettes.ts via palette
    if (base.border) {
      // Convert border width from common scale to actual size
      if (base.border.borderWidth !== undefined) {
        const borderTheme = base.border.borderTheme || id;
        base.borderWidth = themeJsonToActualStrokeWidth(base.border.borderWidth, borderTheme);
      }
      // borderColor is set from palette below, not from themes.json
      if (base.border.borderOpacity !== undefined) base.borderOpacity = base.border.borderOpacity;
    }

    // Map nested background properties to flat canvas element properties
    // NOTE: Colors are NOT read from themes.json - they come from color-palettes.ts via palette
    if (base.background) {
      // backgroundColor is set from palette below, not from themes.json
      if (base.background.backgroundOpacity !== undefined) base.backgroundOpacity = base.background.backgroundOpacity;
    }

    // Map nested format properties to flat canvas element properties
    if (base.format) {
      if (base.format.textAlign) base.align = base.format.textAlign;
      if (base.format.paragraphSpacing) base.paragraphSpacing = base.format.paragraphSpacing;
      if (base.format.padding !== undefined) base.padding = base.format.padding;
    }

    // Map nested ruledLines properties to flat canvas element properties
    // NOTE: Colors are NOT read from themes.json - they come from color-palettes.ts via palette
    if (base.ruledLines) {
      // Convert line width from common scale to actual size
      if (base.ruledLines.lineWidth !== undefined) {
        const ruledLinesTheme = base.ruledLines.ruledLinesTheme || id;
        base.ruledLinesWidth = themeJsonToActualStrokeWidth(base.ruledLines.lineWidth, ruledLinesTheme);
      }
      // lineColor is set from palette below, not from themes.json
      if (base.ruledLines.lineOpacity !== undefined) base.ruledLinesOpacity = base.ruledLines.lineOpacity;
      if (base.ruledLines.ruledLinesTheme) base.ruledLinesTheme = base.ruledLines.ruledLinesTheme;
    }
    
    // Convert corner radius from common scale to actual size
    if (base.cornerRadius !== undefined) {
      base.cornerRadius = commonToActualRadius(base.cornerRadius);
    }

    // Apply palette colors automatically (overriding hardcoded colors)
    if (palette) {
      // Always use palette colors for stroke/fill (shapes, brushes, lines)
      base.stroke = palette.colors.primary;
      base.fill = elementType === 'shape' ? (base.fill && base.fill !== 'transparent' ? base.fill : palette.colors.surface || palette.colors.accent) : (base.fill || palette.colors.primary);
      
      // Apply palette colors to font
      if (base.font) {
        base.font.fontColor = palette.colors.text || palette.colors.primary;
        base.fontColor = palette.colors.text || palette.colors.primary;
        base.stroke = palette.colors.text || palette.colors.primary; // For text stroke
      } else {
        // Set fontColor even if font object doesn't exist
        base.fontColor = palette.colors.text || palette.colors.primary;
      }
      
      // Apply palette colors to border
      if (base.border) {
        base.border.borderColor = palette.colors.secondary;
        base.borderColor = palette.colors.secondary;
        base.border.borderTheme = base.border.borderTheme || id;
      } else {
        base.borderColor = palette.colors.secondary;
      }
      
      // Apply palette colors to background
      if (base.background) {
        base.background.backgroundColor = palette.colors.surface || palette.colors.background;
        base.backgroundColor = palette.colors.surface || palette.colors.background;
      }
      
      // Apply palette colors to ruled lines
      if (base.ruledLines) {
        base.ruledLines.lineColor = palette.colors.accent || palette.colors.primary;
        base.ruledLinesColor = palette.colors.accent || palette.colors.primary;
        base.ruledLines.ruledLinesTheme = base.ruledLines.ruledLinesTheme || id;
      }
    }

    // Add inherit theme for shapes and stroke themes - preserve existing inheritTheme
    if (['shape', 'brush', 'line'].includes(elementType)) {
      // Don't override if inheritTheme is already set in the theme definition
      if (!base.inheritTheme) {
        base.inheritTheme = id;
      }
    }
    
    // Handle theme inheritance for borders and ruled lines
    if (base.border) {
      base.border.borderTheme = base.border.borderTheme || id;
    }
    
    if (base.ruledLines) {
      base.ruledLines.ruledLinesTheme = base.ruledLines.ruledLinesTheme || id;
    }

    return base;
  };

  return {
    id,
    name: config.name,
    description: config.description,
    pageSettings: {
      ...config.pageSettings,
      backgroundImage: {
        enabled: false,
        size: 'cover',
        repeat: false,
        ...config.pageSettings.backgroundImage
      }
    },
    elementDefaults: {
      text: buildElement('text', config.elementDefaults.text || {}),
      question: buildElement('question', config.elementDefaults.question || {}),
      answer: buildElement('answer', config.elementDefaults.answer || {}),
      image: buildElement('image', config.elementDefaults.image || {}),
      shape: buildElement('shape', config.elementDefaults.shape || {}),
      brush: buildElement('brush', config.elementDefaults.brush || {})
    }
  };
}

function processTheme(theme: GlobalTheme): GlobalTheme {
  // Note: Conversions are now done in buildElement, so we only need to convert pageSettings here
  return {
    ...theme,
    pageSettings: {
      ...theme.pageSettings,
      backgroundPattern: theme.pageSettings.backgroundPattern ? {
        ...theme.pageSettings.backgroundPattern,
        strokeWidth: themeJsonToActualStrokeWidth(theme.pageSettings.backgroundPattern.strokeWidth, theme.id)
      } : undefined
    }
    // elementDefaults are already converted in buildElement, no need to convert again
  };
}

export function getGlobalTheme(id: string): GlobalTheme | undefined {
  if (processedThemeCache.has(id)) {
    return processedThemeCache.get(id);
  }
  
  const themeConfig = (themesData as Record<string, ThemeConfig>)[id];
  if (!themeConfig) return undefined;
  
  const rawTheme = createTheme(id, themeConfig);
  const processedTheme = processTheme(rawTheme);
  processedThemeCache.set(id, processedTheme);
  return processedTheme;
}

export const GLOBAL_THEMES: GlobalTheme[] = Object.keys(themesData).map(id => getGlobalTheme(id)!).filter(Boolean);

function getThemeCategory(elementType: string): keyof GlobalTheme['elementDefaults'] {
  switch (elementType) {
    case 'question':
      return 'question';
    case 'answer':
      return 'answer';
    case 'qna':
    case 'qna2':
    case 'qna_inline':
    case 'free_text':
      return 'text'; // QnA uses text defaults as base
    case 'text':
      return 'text';
    case 'image':
    case 'placeholder':
      return 'image';
    case 'brush':
      return 'brush';
    case 'line':
    case 'rect':
    case 'circle':
    case 'heart':
    case 'star':
    case 'speech-bubble':
    case 'dog':
    case 'cat':
    case 'smiley':
    default:
      return 'shape';
  }
}

export function getGlobalThemeDefaults(themeId: string, elementType: string): Partial<CanvasElement> {
  const theme = getGlobalTheme(themeId);
  if (!theme) return {};
  
  // Get theme palette first (needed for all element types)
  const themeConfig = (themesData as Record<string, any>)[themeId];
  const palette = themeConfig?.palette ? getPalette(themeConfig.palette) : undefined;
  
  // For QnA inline elements, use specialized function that already applies palette colors
  if (elementType === 'qna_inline') {
    const qnaDefaults = getQnAInlineThemeDefaults(themeId);
    // Add top-level palette colors for consistency
    return {
      ...qnaDefaults,
      fontColor: palette ? (palette.colors.text || palette.colors.primary) : undefined,
      borderColor: palette ? palette.colors.secondary : undefined,
      backgroundColor: palette ? (palette.colors.surface || palette.colors.background) : undefined,
      ruledLinesColor: palette ? (palette.colors.accent || palette.colors.primary) : undefined
    };
  }
  
  const category = getThemeCategory(elementType);
  const baseDefaults = theme.elementDefaults[category] || {};
  
  // Apply palette colors automatically if palette exists
  if (palette) {
    const paletteDefaults: any = {};
    
    // Apply palette colors based on element type
    if (['text', 'question', 'answer'].includes(elementType)) {
      paletteDefaults.fontColor = palette.colors.text || palette.colors.primary;
      paletteDefaults.stroke = palette.colors.text || palette.colors.primary;
      paletteDefaults.borderColor = palette.colors.secondary;
      paletteDefaults.backgroundColor = palette.colors.surface || palette.colors.background;
      paletteDefaults.ruledLinesColor = palette.colors.accent || palette.colors.primary;
      
      // Also apply to nested font object if it exists
      if (baseDefaults.font) {
        paletteDefaults.font = { ...baseDefaults.font, fontColor: palette.colors.text || palette.colors.primary };
      }
      if (baseDefaults.border) {
        paletteDefaults.border = { ...baseDefaults.border, borderColor: palette.colors.secondary };
      }
      if (baseDefaults.background) {
        paletteDefaults.background = { ...baseDefaults.background, backgroundColor: palette.colors.surface || palette.colors.background };
      }
      if (baseDefaults.ruledLines) {
        paletteDefaults.ruledLines = { ...baseDefaults.ruledLines, lineColor: palette.colors.accent || palette.colors.primary };
      }
    } else if (['brush', 'line'].includes(elementType)) {
      paletteDefaults.stroke = palette.colors.primary;
    } else if (['rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley', 'shape'].includes(elementType)) {
      paletteDefaults.stroke = palette.colors.primary;
      paletteDefaults.fill = palette.colors.surface || palette.colors.accent;
    }
    
    // Merge palette colors into base defaults
    return { ...baseDefaults, ...paletteDefaults };
  }
  
  return baseDefaults;
}

export function getQnAThemeDefaults(themeId: string, section: 'question' | 'answer'): any {
  const themeConfig = (themesData as Record<string, any>)[themeId];
  if (!themeConfig?.elementDefaults?.qna) return {};
  
  const qnaDefaults = themeConfig.elementDefaults.qna;
  return section === 'question' ? qnaDefaults.questionSettings : qnaDefaults.answerSettings;
}

// Get theme defaults specifically for QnA inline elements
export function getQnAInlineThemeDefaults(themeId: string): any {
  const theme = getGlobalTheme(themeId);
  if (!theme) return {};
  
  const textDefaults = theme.elementDefaults.text;
  
  // Get theme palette and apply colors automatically
  const themeConfig = (themesData as Record<string, any>)[themeId];
  const palette = themeConfig?.palette ? getPalette(themeConfig.palette) : undefined;
  
  // Extract questionSettings and answerSettings from the theme if available
  const qnaConfig = themeConfig?.elementDefaults?.qna;
  
  // Build questionSettings and answerSettings with palette colors
  const buildSettings = (base: any, qnaSpecific: any = {}, isAnswer: boolean = false) => {
    // Convert fontSize if it comes from base (already processed) or qnaSpecific (needs conversion)
    let convertedFontSize = base.fontSize || 50;
    if (qnaSpecific.fontSize !== undefined) {
      // qnaSpecific.fontSize is from themes.json, so it needs conversion
      convertedFontSize = commonToActual(qnaSpecific.fontSize);
    }
    
    const settings = {
      ...base,
      ...qnaSpecific,
      fontSize: convertedFontSize
    };
    
    // Apply palette colors if available
    if (palette) {
      if (isAnswer) {
        // Answer uses accent or text color
        settings.fontColor = palette.colors.accent || palette.colors.text || palette.colors.primary;
        settings.backgroundColor = palette.colors.background;
        settings.borderColor = palette.colors.secondary;
        settings.ruledLinesColor = palette.colors.primary;
        if (settings.font) {
          settings.font = { ...settings.font, fontColor: palette.colors.accent || palette.colors.text || palette.colors.primary };
        }
        if (settings.ruledLines) {
          settings.ruledLines = { ...settings.ruledLines, lineColor: palette.colors.primary };
        }
      } else {
        // Question uses text or primary color
        settings.fontColor = palette.colors.text || palette.colors.primary;
        settings.backgroundColor = palette.colors.surface || palette.colors.background;
        settings.borderColor = palette.colors.secondary;
        settings.ruledLinesColor = palette.colors.accent || palette.colors.primary;
        if (settings.font) {
          settings.font = { ...settings.font, fontColor: palette.colors.text || palette.colors.primary };
        }
        if (settings.background) {
          settings.background = { ...settings.background, backgroundColor: palette.colors.surface || palette.colors.background };
        }
        if (settings.border) {
          settings.border = { ...settings.border, borderColor: palette.colors.secondary };
        }
        if (settings.ruledLines) {
          settings.ruledLines = { ...settings.ruledLines, lineColor: palette.colors.accent || palette.colors.primary };
        }
      }
      
      // Ensure border and background objects exist if they're enabled
      if (settings.border) {
        settings.border = {
          ...settings.border,
          borderColor: settings.border.borderColor || palette.colors.secondary
        };
      }
      if (settings.background) {
        settings.background = {
          ...settings.background,
          backgroundColor: settings.background.backgroundColor || (isAnswer ? palette.colors.background : palette.colors.surface || palette.colors.background)
        };
      }
    }
    
    return settings;
  };
  
  if (qnaConfig?.questionSettings && qnaConfig?.answerSettings) {
    return {
      questionSettings: buildSettings(textDefaults, qnaConfig.questionSettings, false),
      answerSettings: buildSettings(textDefaults, qnaConfig.answerSettings, true)
    };
  }
  
  return {
    questionSettings: buildSettings(textDefaults, {}, false),
    answerSettings: buildSettings(textDefaults, {}, true)
  };
}

export function applyThemeToElement(element: CanvasElement, themeId: string): CanvasElement {
  const themeDefaults = getGlobalThemeDefaults(themeId, element.type);
  
  // Apply all theme defaults including colors
  const allDefaults = { ...themeDefaults };
  
  // Handle nested objects properly
  if (themeDefaults.font) {
    allDefaults.font = { ...element.font, ...themeDefaults.font };
  }
  
  if (themeDefaults.border) {
    allDefaults.border = { ...element.border, ...themeDefaults.border };
  }
  
  if (themeDefaults.background) {
    allDefaults.background = { ...element.background, ...themeDefaults.background };
  }
  
  if (themeDefaults.ruledLines) {
    allDefaults.ruledLines = { ...element.ruledLines, ...themeDefaults.ruledLines };
  }
  
  return {
    ...element,
    ...allDefaults,
    theme: themeId
  };
}

export function applyThemeToAllElements(theme: any, elements: any[]): any[] {
  return elements.map(element => {
    const elementType = element.textType || element.type;
    const themeDefaults = getGlobalThemeDefaults(theme.id || theme, elementType);
    
    // Apply only non-color properties
    const nonColorUpdates = {};
    
    Object.keys(themeDefaults).forEach(key => {
      if (!['stroke', 'fill', 'fontColor', 'borderColor', 'backgroundColor', 'ruledLinesColor'].includes(key)) {
        if (key === 'font' || key === 'border' || key === 'background' || key === 'ruledLines') {
          // Handle nested objects - preserve colors
          const nested = themeDefaults[key];
          const filteredNested = Object.fromEntries(
            Object.entries(nested).filter(([nestedKey]) => 
              !['fontColor', 'borderColor', 'backgroundColor', 'lineColor'].includes(nestedKey)
            )
          );
          nonColorUpdates[key] = { ...element[key], ...filteredNested };
        } else {
          nonColorUpdates[key] = themeDefaults[key];
        }
      }
    });
    
    return { ...element, ...nonColorUpdates };
  });
}

// Get page background colors from palette (not from themes.json)
export function getThemePageBackgroundColors(themeId: string): { backgroundColor: string; patternBackgroundColor: string } {
  const themeConfig = (themesData as Record<string, any>)[themeId];
  const palette = themeConfig?.palette ? getPalette(themeConfig.palette) : undefined;
  
  if (palette) {
    return {
      backgroundColor: palette.colors.background,
      patternBackgroundColor: palette.colors.surface || palette.colors.background
    };
  }
  
  // Fallback to default if no palette
  return {
    backgroundColor: '#ffffff',
    patternBackgroundColor: '#f0f0f0'
  };
}

export function applyThemeToPage(pageSettings: any, themeId: string): any {
  const theme = getGlobalTheme(themeId);
  if (!theme) return pageSettings;
  
  // Get colors from palette, not from themes.json
  const pageColors = getThemePageBackgroundColors(themeId);
  
  // Apply only non-color page settings (remove backgroundColor, keep structure)
  const { backgroundColor: _, ...nonColorPageSettings } = theme.pageSettings;
  const backgroundPattern = theme.pageSettings.backgroundPattern ? {
    ...theme.pageSettings.backgroundPattern,
    // Remove patternBackgroundColor and use palette color instead
    patternBackgroundColor: pageColors.patternBackgroundColor
  } : undefined;
  
  return {
    ...pageSettings,
    ...nonColorPageSettings,
    // Use palette colors for page background
    backgroundColor: pageColors.backgroundColor,
    backgroundPattern: backgroundPattern ? {
      ...pageSettings.backgroundPattern,
      ...backgroundPattern
    } : pageSettings.backgroundPattern
  };
}

export function getAllGlobalThemes(): GlobalTheme[] {
  return GLOBAL_THEMES;
}

export function logThemeStructure(themeData: any): void {
  // Ensure backgroundOpacity is included in pageSettings
  const processedData = {
    ...themeData,
    pageSettings: {
      ...themeData.pageSettings,
      backgroundOpacity: themeData.pageSettings?.backgroundOpacity || 1
    }
  };
  
  const jsonString = JSON.stringify(processedData, null, 2);
  const lines = jsonString.split('\n');
  const indentedLines = lines.map(line => '  ' + line);
  const output = '"custom": \n' + indentedLines.join('\n');
  console.log(output);
}

// Re-export getToolDefaults functionality from tool-defaults.ts
// This will be removed once tool-defaults.ts is fully migrated
export { getToolDefaults, TOOL_DEFAULTS } from './tool-defaults';
export type { ToolType } from './tool-defaults';