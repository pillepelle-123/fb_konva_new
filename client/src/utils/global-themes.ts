import type { CanvasElement } from '../context/editor-context.tsx';
import { colorPalettes } from '../data/templates/color-palettes.ts';
import type { ColorPalette } from '../types/template-types.ts';
import { commonToActual } from './font-size-converter.ts';
import { themeJsonToActualStrokeWidth } from './stroke-width-converter.ts';
import { commonToActualRadius } from './corner-radius-converter.ts';
import themesData from '../data/templates/themes';
import { getElementPaletteColors } from './global-palettes';

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
      templateId?: string;
      size: 'cover' | 'contain' | 'stretch';
      repeat?: boolean;
      opacity?: number;
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      width?: number; // width in % of page width (0-200, default 100)
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
      if (base.border.width === undefined && base.border.borderWidth !== undefined) {
        base.border.width = base.border.borderWidth;
      }
      if (base.border.opacity === undefined && base.border.borderOpacity !== undefined) {
        base.border.opacity = base.border.borderOpacity;
      }
      if (base.border.theme === undefined && base.border.borderTheme !== undefined) {
        base.border.theme = base.border.borderTheme;
      }

      if (base.border.width !== undefined) {
        const borderTheme = base.border.theme || id;
        const convertedBorderWidth = themeJsonToActualStrokeWidth(base.border.width, borderTheme);
        base.border.width = convertedBorderWidth;
        base.borderWidth = convertedBorderWidth;
        base.border.borderWidth = convertedBorderWidth;
      }
      if (base.border.opacity !== undefined) {
        base.borderOpacity = base.border.opacity;
        base.border.borderOpacity = base.border.opacity;
      }
      if (base.border.enabled !== undefined) {
        base.borderEnabled = base.border.enabled;
      }
      if (base.border.theme !== undefined) {
        base.borderTheme = base.border.theme;
        base.border.borderTheme = base.border.theme;
      }
    }

    // Map nested background properties to flat canvas element properties
    // NOTE: Colors are NOT read from themes.json - they come from color-palettes.ts via palette
    if (base.background) {
      if (base.background.opacity === undefined && base.background.backgroundOpacity !== undefined) {
        base.background.opacity = base.background.backgroundOpacity;
      }
      if (base.background.enabled !== undefined) {
        base.backgroundEnabled = base.background.enabled;
      }
      if (base.background.opacity !== undefined) {
        base.backgroundOpacity = base.background.opacity;
        base.background.backgroundOpacity = base.background.opacity;
      }
    }

    // Map nested format properties to flat canvas element properties
    if (base.format) {
      if (base.format.paragraphSpacing) base.paragraphSpacing = base.format.paragraphSpacing;
      if (base.format.padding !== undefined) base.padding = base.format.padding;
    }

    // Map nested ruledLines properties to flat canvas element properties
    // NOTE: Colors are NOT read from themes.json - they come from color-palettes.ts via palette
    if (base.ruledLines) {
      if (base.ruledLines.width === undefined && base.ruledLines.lineWidth !== undefined) {
        base.ruledLines.width = base.ruledLines.lineWidth;
      }
      if (base.ruledLines.opacity === undefined && base.ruledLines.lineOpacity !== undefined) {
        base.ruledLines.opacity = base.ruledLines.lineOpacity;
      }
      if (base.ruledLines.theme === undefined && base.ruledLines.ruledLinesTheme !== undefined) {
        base.ruledLines.theme = base.ruledLines.ruledLinesTheme;
      }

      if (base.ruledLines.width !== undefined) {
        const ruledLinesTheme = base.ruledLines.theme || id;
        const convertedWidth = themeJsonToActualStrokeWidth(base.ruledLines.width, ruledLinesTheme);
        base.ruledLines.width = convertedWidth;
        base.ruledLinesWidth = convertedWidth;
        base.ruledLines.lineWidth = convertedWidth;
      }
      if (base.ruledLines.opacity !== undefined) {
        base.ruledLinesOpacity = base.ruledLines.opacity;
        base.ruledLines.lineOpacity = base.ruledLines.opacity;
      }
      if (base.ruledLines.theme !== undefined) {
        base.ruledLinesTheme = base.ruledLines.theme;
        base.ruledLines.ruledLinesTheme = base.ruledLines.theme;
      }
      if (base.ruledLines.enabled !== undefined) {
        base.ruledLinesEnabled = base.ruledLines.enabled;
      }
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
    
    // Note: backgroundOpacity and borderOpacity are now used directly, no mapping needed
    if (elementType === 'shape') {
      // Fallback: if old opacity property exists, use it for both (for backward compatibility)
      if (base.opacity !== undefined && base.borderOpacity === undefined && base.backgroundOpacity === undefined) {
        base.borderOpacity = base.opacity;
        base.backgroundOpacity = base.opacity;
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

/**
 * Get the default palette ID for a theme
 * @param themeId - The theme ID
 * @returns The palette ID or undefined if theme not found
 */
export function getThemePaletteId(themeId: string): string | undefined {
  const themeConfig = (themesData as Record<string, ThemeConfig>)[themeId];
  return themeConfig?.palette;
}

export const GLOBAL_THEMES: GlobalTheme[] = Object.keys(themesData).map(id => getGlobalTheme(id)!).filter(Boolean);

function getThemeCategory(elementType: string): keyof GlobalTheme['elementDefaults'] {
  switch (elementType) {
    case 'question':
      return 'question';
    case 'answer':
      return 'answer';
    case 'qna':
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

/**
 * Get base default values for an element type (fallback when theme is not available)
 * These are moved from TOOL_DEFAULTS in tool-defaults.ts to provide complete fallback values
 */
function getBaseDefaultsForType(elementType: string): any {
  // Base defaults for all tool types - provides complete fallback values
  const baseDefaults: Record<string, Partial<CanvasElement>> = {
    line: {
      theme: 'default',
      strokeWidth: 2,
      stroke: '#1f2937'
    },
    brush: {
      theme: 'default',
      strokeWidth: 3,
      stroke: '#1f2937'
    },
    rect: {
      theme: 'default',
      strokeWidth: 2,
      stroke: '#1f2937',
      fill: 'transparent',
      cornerRadius: 0
    },
    circle: {
      theme: 'default',
      strokeWidth: 2,
      stroke: '#1f2937',
      fill: 'transparent'
    },
    heart: {
      theme: 'default',
      strokeWidth: 2,
      stroke: '#1f2937',
      fill: 'transparent'
    },
    star: {
      theme: 'default',
      strokeWidth: 2,
      stroke: '#1f2937',
      fill: 'transparent'
    },
    'speech-bubble': {
      theme: 'default',
      strokeWidth: 2,
      stroke: '#1f2937',
      fill: 'transparent'
    },
    dog: {
      theme: 'default',
      strokeWidth: 2,
      stroke: '#1f2937',
      fill: 'transparent'
    },
    cat: {
      theme: 'default',
      strokeWidth: 2,
      stroke: '#1f2937',
      fill: 'transparent'
    },
    smiley: {
      theme: 'default',
      strokeWidth: 2,
      stroke: '#1f2937',
      fill: 'transparent'
    },
    triangle: {
      theme: 'default',
      strokeWidth: 2,
      stroke: '#1f2937',
      fill: 'transparent'
    },
    polygon: {
      theme: 'default',
      strokeWidth: 2,
      stroke: '#1f2937',
      fill: 'transparent',
      polygonSides: 5
    },
    text: {
      fontSize: 58,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      fontStyle: 'normal',
      fontColor: '#000000',
      align: 'left',
      paragraphSpacing: 'medium',
      ruledLines: false,
      ruledLinesTheme: 'rough',
      ruledLinesColor: '#1f2937',
      ruledLinesWidth: 1,
      cornerRadius: 0,
      borderWidth: 0,
      borderColor: '#000000',
      backgroundColor: 'transparent',
      padding: 4
    },
    question: {
      fontSize: 58,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      fontStyle: 'normal',
      fontColor: '#000000',
      align: 'left',
      cornerRadius: 0,
      borderWidth: 0,
      borderColor: '#000000',
      backgroundColor: 'transparent',
      padding: 4
    },
    answer: {
      fontSize: 58,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      fontStyle: 'normal',
      fontColor: '#000000',
      align: 'left',
      paragraphSpacing: 'medium',
      ruledLines: false,
      ruledLinesTheme: 'rough',
      ruledLinesColor: '#1f2937',
      ruledLinesWidth: 1,
      cornerRadius: 0,
      borderWidth: 0,
      borderColor: '#000000',
      backgroundColor: 'transparent',
      padding: 4
    },
    qna: {
      fontSize: 50,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      fontStyle: 'normal',
      fontColor: '#000000',
      align: 'left',
      paragraphSpacing: 'medium',
      ruledLines: false,
      ruledLinesTheme: 'rough',
      ruledLinesColor: '#1f2937',
      ruledLinesWidth: 1,
      cornerRadius: 0,
      borderWidth: 0,
      borderColor: '#000000',
      backgroundColor: 'transparent',
      padding: 4,
      questionSettings: {
        fontSize: 58
      },
      answerSettings: {
        fontSize: 50
      }
    },
    free_text: {
      fontSize: 50,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      fontStyle: 'normal',
      fontColor: '#1f2937',
      fontBold: false,
      fontItalic: false,
      fontOpacity: 1,
      align: 'left',
      paragraphSpacing: 'medium',
      ruledLines: false,
      ruledLinesTheme: 'rough',
      ruledLinesColor: '#1f2937',
      ruledLinesWidth: 1,
      cornerRadius: 0,
      borderWidth: 0,
      borderColor: '#000000',
      backgroundColor: 'transparent',
      padding: 4,
      textSettings: {
        fontSize: 50,
        fontColor: '#1f2937',
        fontFamily: 'Arial, sans-serif',
        fontBold: false,
        fontItalic: false,
        fontOpacity: 1,
        align: 'left',
        paragraphSpacing: 'medium',
        ruledLines: false,
        ruledLinesTheme: 'rough',
        ruledLinesColor: '#1f2937',
        ruledLinesWidth: 1,
        background: { enabled: false, color: 'transparent', opacity: 1 },
        border: { enabled: false, color: '#000000', width: 1, opacity: 1, theme: 'default' },
        cornerRadius: 0,
        padding: 4
      }
    }
  };

  // Return defaults for the specific type, or shape defaults as fallback
  return baseDefaults[elementType] || baseDefaults.rect || {};
}

export function getGlobalThemeDefaults(themeId: string, elementType: string, paletteId?: string): Partial<CanvasElement> {
  // Get base defaults as fallback (moved from TOOL_DEFAULTS)
  const baseDefaults = getBaseDefaultsForType(elementType);

  const theme = getGlobalTheme(themeId);
  if (!theme) return baseDefaults; // Return base defaults, not empty object

  // Use ONLY the provided paletteId, NOT the theme's default palette
  const palette = paletteId ? getPalette(paletteId) : undefined;
  
  // For QnA elements, convert fontSize in questionSettings and answerSettings from common to actual
  if (elementType === 'qna') {
    const category = getThemeCategory(elementType);
    const themeDefaults = theme.elementDefaults[category] || {};
    
    // Convert fontSize in questionSettings and answerSettings if they exist
    const convertedDefaults: any = { ...baseDefaults, ...themeDefaults };
    
    // Merge questionSettings and answerSettings from base and theme
    if (baseDefaults.questionSettings || themeDefaults.questionSettings) {
      convertedDefaults.questionSettings = {
        ...baseDefaults.questionSettings,
        ...themeDefaults.questionSettings
      };
      if (convertedDefaults.questionSettings.fontSize !== undefined && themeDefaults.questionSettings?.fontSize !== undefined) {
        convertedDefaults.questionSettings.fontSize = commonToActual(convertedDefaults.questionSettings.fontSize);
      }
    }
    
    if (baseDefaults.answerSettings || themeDefaults.answerSettings) {
      convertedDefaults.answerSettings = {
        ...baseDefaults.answerSettings,
        ...themeDefaults.answerSettings
      };
      if (convertedDefaults.answerSettings.fontSize !== undefined && themeDefaults.answerSettings?.fontSize !== undefined) {
        convertedDefaults.answerSettings.fontSize = commonToActual(convertedDefaults.answerSettings.fontSize);
      }
    }
    
    // Apply palette colors automatically if palette exists
    if (palette) {
      // Use centralized palette color function for consistency
      const paletteColors = getElementPaletteColors(palette, 'qna');

      const paletteDefaults: any = {
        fontColor: paletteColors.qnaQuestionText,
        stroke: paletteColors.qnaQuestionText,
        borderColor: paletteColors.qnaQuestionBorder,
        backgroundColor: paletteColors.qnaBackground,
        ruledLinesColor: paletteColors.qnaAnswerRuledLines
      };

      // Apply palette colors to questionSettings and answerSettings
      if (convertedDefaults.questionSettings) {
        convertedDefaults.questionSettings = {
          ...convertedDefaults.questionSettings,
          fontColor: paletteColors.qnaQuestionText
        };
      }
      if (convertedDefaults.answerSettings) {
        convertedDefaults.answerSettings = {
          ...convertedDefaults.answerSettings,
          fontColor: paletteColors.qnaAnswerText
        };
      }
      
      // For qna elements, clean up shared properties from questionSettings/answerSettings
      // Move them to top-level and keep only font properties in questionSettings/answerSettings
      const questionSettings = convertedDefaults.questionSettings || {};
      const answerSettings = convertedDefaults.answerSettings || {};

      // List of shared properties to move to top-level
      const sharedProperties = [
        'borderWidth', 'borderColor', 'borderTheme', 'borderOpacity', 'borderEnabled',
        'backgroundColor', 'backgroundOpacity', 'backgroundEnabled',
        'cornerRadius', 'padding', 'paragraphSpacing', 'align',
        'layoutVariant', 'questionPosition', 'questionWidth',
        'ruledLinesColor', 'ruledLinesTheme', 'ruledLinesWidth', 'ruledLinesOpacity', 'ruledLines'
      ];

      // Move shared properties from questionSettings/answerSettings to top-level
      // Priority: existing top-level > questionSettings > answerSettings
      sharedProperties.forEach(prop => {
        if (convertedDefaults[prop] === undefined || convertedDefaults[prop] === null) {
          // Try to get from questionSettings first, then answerSettings
          let value = questionSettings[prop];
          if (value === undefined || value === null) {
            value = answerSettings[prop];
          }

          // Special handling for nested properties
          if (value === undefined || value === null) {
            if (prop === 'borderColor') {
              value = questionSettings.border?.borderColor || answerSettings.border?.borderColor;
            } else if (prop === 'borderEnabled') {
              value = questionSettings.border?.enabled ?? answerSettings.border?.enabled ?? questionSettings.borderEnabled ?? answerSettings.borderEnabled;
            } else if (prop === 'backgroundColor') {
              value = questionSettings.background?.backgroundColor || answerSettings.background?.backgroundColor;
            } else if (prop === 'backgroundEnabled') {
              value = questionSettings.background?.enabled ?? answerSettings.background?.enabled ?? questionSettings.backgroundEnabled ?? answerSettings.backgroundEnabled;
            }
          }

          if (value !== undefined && value !== null) {
            convertedDefaults[prop] = value;
          }
        }
      });

      // Clean questionSettings: keep only font properties and border.enabled/background.enabled
      const cleanedQuestionSettings: any = {};
      if (questionSettings.fontSize !== undefined) cleanedQuestionSettings.fontSize = questionSettings.fontSize;
      if (questionSettings.fontFamily !== undefined) cleanedQuestionSettings.fontFamily = questionSettings.fontFamily;
      if (questionSettings.fontBold !== undefined) cleanedQuestionSettings.fontBold = questionSettings.fontBold;
      if (questionSettings.fontItalic !== undefined) cleanedQuestionSettings.fontItalic = questionSettings.fontItalic;
      if (questionSettings.fontColor !== undefined) cleanedQuestionSettings.fontColor = questionSettings.fontColor;
      if (questionSettings.fontOpacity !== undefined) cleanedQuestionSettings.fontOpacity = questionSettings.fontOpacity;
      // Font properties are now only directly in questionSettings, no nested font object

      // Keep border.enabled and background.enabled for rendering check
      const borderEnabled = (convertedDefaults as any).borderEnabled ?? (questionSettings as any).border?.enabled ?? (questionSettings as any).borderEnabled ?? false;
      const backgroundEnabled = (convertedDefaults as any).backgroundEnabled ?? (questionSettings as any).background?.enabled ?? (questionSettings as any).backgroundEnabled ?? false;

      cleanedQuestionSettings.border = {
        ...(questionSettings.border || {}),
        enabled: borderEnabled
      };
      cleanedQuestionSettings.background = {
        ...(questionSettings.background || {}),
        enabled: backgroundEnabled
      };

      // Clean answerSettings: keep only font properties, border.enabled/background.enabled, and ruledLines (enabled flag)
      const cleanedAnswerSettings: any = {};
      if (answerSettings.fontSize !== undefined) cleanedAnswerSettings.fontSize = answerSettings.fontSize;
      if (answerSettings.fontFamily !== undefined) cleanedAnswerSettings.fontFamily = answerSettings.fontFamily;
      if (answerSettings.fontBold !== undefined) cleanedAnswerSettings.fontBold = answerSettings.fontBold;
      if (answerSettings.fontItalic !== undefined) cleanedAnswerSettings.fontItalic = answerSettings.fontItalic;
      if (answerSettings.fontColor !== undefined) cleanedAnswerSettings.fontColor = answerSettings.fontColor;
      if (answerSettings.fontOpacity !== undefined) cleanedAnswerSettings.fontOpacity = answerSettings.fontOpacity;
      // Font properties are now only directly in answerSettings, no nested font object

      // Keep border.enabled and background.enabled for rendering check
      cleanedAnswerSettings.border = {
        ...(answerSettings.border || {}),
        enabled: borderEnabled
      };
      cleanedAnswerSettings.background = {
        ...(answerSettings.background || {}),
        enabled: backgroundEnabled
      };

      // Update convertedDefaults with cleaned questionSettings and answerSettings
      (convertedDefaults as any).questionSettings = Object.keys(cleanedQuestionSettings).length > 0 ? cleanedQuestionSettings : undefined;
      (convertedDefaults as any).answerSettings = Object.keys(cleanedAnswerSettings).length > 0 ? cleanedAnswerSettings : undefined;

      return { ...convertedDefaults, ...paletteDefaults };
    }

    // For qna elements without palette, still apply shared properties cleanup
    if (elementType === 'qna') {
      const questionSettings = convertedDefaults.questionSettings || {};
      const answerSettings = convertedDefaults.answerSettings || {};

      // List of shared properties to move to top-level
      const sharedProperties = [
        'borderWidth', 'borderColor', 'borderTheme', 'borderOpacity', 'borderEnabled',
        'backgroundColor', 'backgroundOpacity', 'backgroundEnabled',
        'cornerRadius', 'padding', 'paragraphSpacing', 'align',
        'layoutVariant', 'questionPosition', 'questionWidth',
        'ruledLinesColor', 'ruledLinesTheme', 'ruledLinesWidth', 'ruledLinesOpacity', 'ruledLines'
      ];

      // Move shared properties from questionSettings/answerSettings to top-level
      sharedProperties.forEach(prop => {
        if (convertedDefaults[prop] === undefined || convertedDefaults[prop] === null) {
          let value = questionSettings[prop];
          if (value === undefined || value === null) {
            value = answerSettings[prop];
          }

          if (value === undefined || value === null) {
            if (prop === 'borderColor') {
              value = questionSettings.border?.borderColor || answerSettings.border?.borderColor;
            } else if (prop === 'borderEnabled') {
              value = questionSettings.border?.enabled ?? answerSettings.border?.enabled ?? questionSettings.borderEnabled ?? answerSettings.borderEnabled;
            } else if (prop === 'backgroundColor') {
              value = questionSettings.background?.backgroundColor || answerSettings.background?.backgroundColor;
            } else if (prop === 'backgroundEnabled') {
              value = questionSettings.background?.enabled ?? answerSettings.background?.enabled ?? questionSettings.backgroundEnabled ?? answerSettings.backgroundEnabled;
            }
          }

          if (value !== undefined && value !== null) {
            convertedDefaults[prop] = value;
          }
        }
      });

      // Clean questionSettings and answerSettings as above
      const cleanedQuestionSettings: any = {};
      if (questionSettings.fontSize !== undefined) cleanedQuestionSettings.fontSize = questionSettings.fontSize;
      if (questionSettings.fontFamily !== undefined) cleanedQuestionSettings.fontFamily = questionSettings.fontFamily;
      if (questionSettings.fontBold !== undefined) cleanedQuestionSettings.fontBold = questionSettings.fontBold;
      if (questionSettings.fontItalic !== undefined) cleanedQuestionSettings.fontItalic = questionSettings.fontItalic;
      if (questionSettings.fontColor !== undefined) cleanedQuestionSettings.fontColor = questionSettings.fontColor;
      if (questionSettings.fontOpacity !== undefined) cleanedQuestionSettings.fontOpacity = questionSettings.fontOpacity;

      const borderEnabled = (convertedDefaults as any).borderEnabled ?? (questionSettings as any).border?.enabled ?? (questionSettings as any).borderEnabled ?? false;
      const backgroundEnabled = (convertedDefaults as any).backgroundEnabled ?? (questionSettings as any).background?.enabled ?? (questionSettings as any).backgroundEnabled ?? false;

      cleanedQuestionSettings.border = {
        ...(questionSettings.border || {}),
        enabled: borderEnabled
      };
      cleanedQuestionSettings.background = {
        ...(questionSettings.background || {}),
        enabled: backgroundEnabled
      };

      const cleanedAnswerSettings: any = {};
      if (answerSettings.fontSize !== undefined) cleanedAnswerSettings.fontSize = answerSettings.fontSize;
      if (answerSettings.fontFamily !== undefined) cleanedAnswerSettings.fontFamily = answerSettings.fontFamily;
      if (answerSettings.fontBold !== undefined) cleanedAnswerSettings.fontBold = answerSettings.fontBold;
      if (answerSettings.fontItalic !== undefined) cleanedAnswerSettings.fontItalic = answerSettings.fontItalic;
      if (answerSettings.fontColor !== undefined) cleanedAnswerSettings.fontColor = answerSettings.fontColor;
      if (answerSettings.fontOpacity !== undefined) cleanedAnswerSettings.fontOpacity = answerSettings.fontOpacity;

      cleanedAnswerSettings.border = {
        ...(answerSettings.border || {}),
        enabled: borderEnabled
      };
      cleanedAnswerSettings.background = {
        ...(answerSettings.background || {}),
        enabled: backgroundEnabled
      };

      (convertedDefaults as any).questionSettings = Object.keys(cleanedQuestionSettings).length > 0 ? cleanedQuestionSettings : undefined;
      (convertedDefaults as any).answerSettings = Object.keys(cleanedAnswerSettings).length > 0 ? cleanedAnswerSettings : undefined;
    }

    return convertedDefaults;
  }

  // For free_text elements, build textSettings structure
  if (elementType === 'free_text') {
    const category = getThemeCategory(elementType);
    const themeDefaults = theme.elementDefaults[category] || {};
    
    // Merge base defaults with theme defaults
    const mergedDefaults = { ...baseDefaults, ...themeDefaults };
    
    // Convert fontSize from common scale to actual size if it exists
    let fontSize = baseDefaults.fontSize || 50;
    if (themeDefaults.font?.fontSize !== undefined) {
      fontSize = commonToActual(themeDefaults.font.fontSize);
    }
    
    // Convert cornerRadius from common scale to actual size if it exists
    let cornerRadius = baseDefaults.cornerRadius || 0;
    if (themeDefaults.cornerRadius !== undefined) {
      cornerRadius = commonToActualRadius(themeDefaults.cornerRadius);
    }
    
    // Build textSettings from merged defaults
    const textSettings: any = {
      fontSize: fontSize,
      fontFamily: themeDefaults.font?.fontFamily || baseDefaults.fontFamily || 'Arial, sans-serif',
      fontBold: themeDefaults.font?.fontBold ?? baseDefaults.fontBold ?? false,
      fontItalic: themeDefaults.font?.fontItalic ?? baseDefaults.fontItalic ?? false,
      fontOpacity: themeDefaults.font?.fontOpacity ?? baseDefaults.fontOpacity ?? 1,
      align: themeDefaults.format?.textAlign || baseDefaults.align || 'left',
      paragraphSpacing: themeDefaults.format?.paragraphSpacing || baseDefaults.paragraphSpacing || 'medium',
      padding: themeDefaults.format?.padding || baseDefaults.padding || 4,
      cornerRadius: cornerRadius,
      border: themeDefaults.border ? {
        enabled: themeDefaults.border.enabled ?? false,
        borderWidth: themeDefaults.border.borderWidth || 0,
        borderColor: themeDefaults.border.borderColor,
        borderOpacity: themeDefaults.border.borderOpacity ?? 1,
        borderTheme: themeDefaults.border.borderTheme || 'default'
      } : { enabled: false, borderWidth: 0, borderColor: baseDefaults.borderColor || '#000000', borderOpacity: 1, borderTheme: 'default' },
      background: themeDefaults.background ? {
        enabled: themeDefaults.background.enabled ?? false,
        backgroundColor: themeDefaults.background.backgroundColor,
        backgroundOpacity: themeDefaults.background.backgroundOpacity ?? 1
      } : { enabled: false, backgroundColor: baseDefaults.backgroundColor || 'transparent', backgroundOpacity: 1 },
      ruledLines: themeDefaults.ruledLines ? {
        enabled: themeDefaults.ruledLines.enabled ?? false,
        lineWidth: themeDefaults.ruledLines.lineWidth || 0.8,
        lineOpacity: themeDefaults.ruledLines.lineOpacity ?? 0.5,
        ruledLinesTheme: themeDefaults.ruledLines.ruledLinesTheme || 'default',
        lineColor: themeDefaults.ruledLines.lineColor
      } : { enabled: false, lineWidth: 0.8, lineOpacity: 0.5, ruledLinesTheme: 'default', lineColor: baseDefaults.ruledLinesColor || '#1f2937' }
    };
    
    // Initialize font object if it doesn't exist
    if (!textSettings.font) {
      textSettings.font = {};
    }
    
    // Apply palette colors using flexible mappings if available
    if (palette) {
      const paletteColors = getElementPaletteColors(palette, 'free_text');

      textSettings.fontColor = paletteColors.freeTextText;
      textSettings.font.fontColor = paletteColors.freeTextText;
      textSettings.borderColor = paletteColors.freeTextBorder;
      textSettings.border.borderColor = paletteColors.freeTextBorder;
      textSettings.backgroundColor = paletteColors.freeTextBackground;
      textSettings.background.backgroundColor = paletteColors.freeTextBackground;
      textSettings.ruledLinesColor = paletteColors.freeTextRuledLines;
      textSettings.ruledLines.lineColor = paletteColors.freeTextRuledLines;
    }
    
    return {
      ...mergedDefaults,
      textSettings: textSettings,
      // Top-level properties for backward compatibility
      fontColor: palette ? paletteColors.freeTextText : baseDefaults.fontColor,
      borderColor: palette ? paletteColors.freeTextBorder : baseDefaults.borderColor,
      backgroundColor: palette ? paletteColors.freeTextBackground : baseDefaults.backgroundColor
    };
  }
  
  const category = getThemeCategory(elementType);
  const themeDefaults = theme.elementDefaults[category] || {};
  
  // Merge base defaults with theme defaults
  const mergedDefaults = { ...baseDefaults, ...themeDefaults };
  
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
      if (mergedDefaults.font) {
        paletteDefaults.font = { ...mergedDefaults.font, fontColor: palette.colors.text || palette.colors.primary };
      }
      if (mergedDefaults.border) {
        paletteDefaults.border = { ...mergedDefaults.border, borderColor: palette.colors.secondary };
      }
      if (mergedDefaults.background) {
        paletteDefaults.background = { ...mergedDefaults.background, backgroundColor: palette.colors.surface || palette.colors.background };
      }
      if (mergedDefaults.ruledLines) {
        paletteDefaults.ruledLines = { ...mergedDefaults.ruledLines, lineColor: palette.colors.accent || palette.colors.primary };
      }
    } else if (['brush', 'line'].includes(elementType)) {
      paletteDefaults.stroke = palette.colors.primary;
    } else if (['rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley', 'shape'].includes(elementType)) {
      paletteDefaults.stroke = palette.colors.primary;
      paletteDefaults.fill = palette.colors.surface || palette.colors.accent;
    }
    
    // Merge palette colors into merged defaults
    return { ...mergedDefaults, ...paletteDefaults };
  }
  
  return mergedDefaults;
}

export function getQnAThemeDefaults(themeId: string, section: 'question' | 'answer'): any {
  const themeConfig = (themesData as Record<string, any>)[themeId];
  if (!themeConfig?.elementDefaults?.text) return {};
  
  const textDefaults = themeConfig.elementDefaults.text;
  return section === 'question' ? textDefaults.questionSettings : textDefaults.answerSettings;
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
  const qnaConfig = themeConfig?.elementDefaults?.text;
  
  // Build questionSettings and answerSettings with palette colors
  const buildSettings = (base: any, qnaSpecific: any = {}, isAnswer: boolean = false) => {
    // Convert fontSize if it comes from base (already processed) or qnaSpecific (needs conversion)
    let convertedFontSize = base.fontSize || 50;
    if (qnaSpecific.fontSize !== undefined) {
      // qnaSpecific.fontSize is from themes.json, so it needs conversion
      convertedFontSize = commonToActual(qnaSpecific.fontSize);
    }
    
    // Exclude layout properties from base (textDefaults) - they come from layout.json or qnaConfig
    // Padding, align, and paragraphSpacing are layout properties and should NOT be copied from textDefaults
    const { padding, format, align, paragraphSpacing, ...baseWithoutLayoutProps } = base;
    
    const settings = {
      ...baseWithoutLayoutProps,
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
        // Border/Background are shared properties - borderEnabled/backgroundEnabled are only on top-level
        // Remove border/background objects from questionSettings/answerSettings
        if (settings.background) {
          delete settings.background;
        }
        if (settings.border) {
          delete settings.border;
        }
        if (settings.ruledLines) {
          settings.ruledLines = { ...settings.ruledLines, lineColor: palette.colors.accent || palette.colors.primary };
        }
      }
      
      // Ensure border and background objects exist if they're enabled
      // Only set enabled property, no other border/background properties
      // Border/background colors are set on top-level, not in questionSettings/answerSettings
      if (settings.border) {
        settings.border = {
          enabled: settings.border.enabled ?? false
        };
      }
      if (settings.background) {
        settings.background = {
          enabled: settings.background.enabled ?? false
        };
      }
    }
    
    return settings;
  };
  
  // Extract top-level properties from qnaConfig (like cornerRadius, padding, etc.)
  const topLevelProperties: any = {};
  let topLevelBorderTheme: string | undefined;
  let topLevelRuledLinesTheme: string | undefined;
  let topLevelBorderEnabled: boolean | undefined;
  let topLevelBackgroundEnabled: boolean | undefined;
  let topLevelBorderWidth: number | undefined;
  let topLevelBorderOpacity: number | undefined;
  let topLevelBackgroundOpacity: number | undefined;
  let topLevelPadding: number | undefined;
  let topLevelAlign: string | undefined;
  let topLevelParagraphSpacing: string | undefined;
  let topLevelQnaIndividualSettings: boolean | undefined;
  
  if (qnaConfig) {
    // Include all top-level properties except questionSettings and answerSettings
    Object.keys(qnaConfig).forEach(key => {
      if (key !== 'questionSettings' && key !== 'answerSettings') {
        if (key === 'border' && qnaConfig.border) {
          const borderConfig = qnaConfig.border;

          if (borderConfig.enabled !== undefined) {
            topLevelBorderEnabled = borderConfig.enabled;
            topLevelProperties.borderEnabled = borderConfig.enabled;
          }
          if (borderConfig.theme !== undefined) {
            topLevelBorderTheme = borderConfig.theme;
            topLevelProperties.borderTheme = borderConfig.theme;
          } else if (borderConfig.borderTheme !== undefined) {
            topLevelBorderTheme = borderConfig.borderTheme;
            topLevelProperties.borderTheme = borderConfig.borderTheme;
          }
          const borderWidthValue = borderConfig.width ?? borderConfig.borderWidth;
          if (borderWidthValue !== undefined) {
            topLevelBorderWidth = borderWidthValue;
            topLevelProperties.borderWidth = borderWidthValue;
          }
          const borderOpacityValue = borderConfig.opacity ?? borderConfig.borderOpacity;
          if (borderOpacityValue !== undefined) {
            topLevelBorderOpacity = borderOpacityValue;
            topLevelProperties.borderOpacity = borderOpacityValue;
          }

          return;
        }

        if (key === 'background' && qnaConfig.background) {
          const backgroundConfig = qnaConfig.background;

          if (backgroundConfig.enabled !== undefined) {
            topLevelBackgroundEnabled = backgroundConfig.enabled;
            topLevelProperties.backgroundEnabled = backgroundConfig.enabled;
          }
          const backgroundOpacityValue = backgroundConfig.opacity ?? backgroundConfig.backgroundOpacity;
          if (backgroundOpacityValue !== undefined) {
            topLevelBackgroundOpacity = backgroundOpacityValue;
            topLevelProperties.backgroundOpacity = backgroundOpacityValue;
          }

          return;
        }

        if (key === 'ruledLines' && qnaConfig.ruledLines) {
          const ruledLinesConfig = qnaConfig.ruledLines;

          if (ruledLinesConfig.enabled !== undefined) {
            topLevelProperties.ruledLinesEnabled = ruledLinesConfig.enabled;
          }
          const ruledLinesThemeValue = ruledLinesConfig.theme ?? ruledLinesConfig.ruledLinesTheme;
          if (ruledLinesThemeValue !== undefined) {
            topLevelRuledLinesTheme = ruledLinesThemeValue;
            topLevelProperties.ruledLinesTheme = ruledLinesThemeValue;
          }
          const ruledLinesWidthValue = ruledLinesConfig.width ?? ruledLinesConfig.lineWidth;
          if (ruledLinesWidthValue !== undefined) {
            topLevelProperties.ruledLinesWidth = ruledLinesWidthValue;
          }
          const ruledLinesOpacityValue = ruledLinesConfig.opacity ?? ruledLinesConfig.lineOpacity;
          if (ruledLinesOpacityValue !== undefined) {
            topLevelProperties.ruledLinesOpacity = ruledLinesOpacityValue;
          }

          return;
        }

        // Convert cornerRadius from common value (in themes.json) to actual value
        if (key === 'cornerRadius') {
          topLevelProperties[key] = commonToActualRadius(qnaConfig[key]);
        } else {
          topLevelProperties[key] = qnaConfig[key];
        }
        
        // Extract specific properties for later use
        if (key === 'borderTheme') {
          topLevelBorderTheme = qnaConfig[key];
        }
        if (key === 'ruledLinesTheme') {
          topLevelRuledLinesTheme = qnaConfig[key];
        }
        if (key === 'borderEnabled') {
          topLevelBorderEnabled = qnaConfig[key];
        }
        if (key === 'backgroundEnabled') {
          topLevelBackgroundEnabled = qnaConfig[key];
        }
        if (key === 'borderWidth') {
          topLevelBorderWidth = qnaConfig[key];
        }
        if (key === 'borderOpacity') {
          topLevelBorderOpacity = qnaConfig[key];
        }
        if (key === 'backgroundOpacity') {
          topLevelBackgroundOpacity = qnaConfig[key];
        }
        if (key === 'padding') {
          topLevelPadding = qnaConfig[key];
        }
        if (key === 'align') {
          topLevelAlign = qnaConfig[key];
        }
        if (key === 'paragraphSpacing') {
          topLevelParagraphSpacing = qnaConfig[key];
        }
        if (key === 'qnaIndividualSettings') {
          topLevelQnaIndividualSettings = qnaConfig[key];
          topLevelProperties.qnaIndividualSettings = qnaConfig[key];
        }
      }
    });
  }
  
  // Apply top-level properties to settings, respecting enabled flags
  const applyTopLevelProperties = (settings: any) => {
    // Handle borderEnabled first - if false, don't apply any border properties
    if (topLevelBorderEnabled !== undefined) {
      // Ensure border object exists
      if (!settings.border) {
        settings.border = {};
      }
      
      if (topLevelBorderEnabled === false) {
        // If borderEnabled is false, ensure border.enabled is false and don't apply other properties
        settings.border = {
          ...settings.border,
          enabled: false
        };
        settings.borderEnabled = false;
        // Explicitly don't apply borderTheme, borderWidth, borderOpacity when disabled
      } else {
        // If borderEnabled is true or not explicitly set, apply border properties
        settings.border = {
          ...settings.border,
          enabled: topLevelBorderEnabled,
          theme: topLevelBorderTheme !== undefined ? (settings.border.theme || topLevelBorderTheme) : settings.border.theme,
          borderTheme: topLevelBorderTheme !== undefined ? (settings.border.borderTheme || topLevelBorderTheme) : settings.border.borderTheme
        };
        settings.borderEnabled = topLevelBorderEnabled;
        // Also set on top-level of settings for backward compatibility
        if (topLevelBorderTheme !== undefined) {
          settings.border.theme = settings.border.theme || topLevelBorderTheme;
          settings.border.borderTheme = settings.border.theme;
          settings.borderTheme = settings.border.theme;
        }
        if (topLevelBorderWidth !== undefined) {
          settings.border.width = topLevelBorderWidth;
          settings.border.borderWidth = topLevelBorderWidth;
          settings.borderWidth = topLevelBorderWidth;
        }
        if (topLevelBorderOpacity !== undefined) {
          settings.border.opacity = topLevelBorderOpacity;
          settings.border.borderOpacity = topLevelBorderOpacity;
          settings.borderOpacity = topLevelBorderOpacity;
        }
      }
    } else if (topLevelBorderTheme !== undefined) {
      // If borderEnabled is not set but borderTheme is, apply it (backward compatibility)
      if (!settings.border) {
        settings.border = {};
      }
      settings.border = {
        ...settings.border,
        theme: settings.border.theme || topLevelBorderTheme,
        borderTheme: settings.border.borderTheme || topLevelBorderTheme
      };
      settings.border.theme = settings.border.theme || topLevelBorderTheme;
      settings.border.borderTheme = settings.border.theme;
      settings.borderTheme = settings.border.theme;
    }
    
    // Handle backgroundEnabled first - if false, don't apply any background properties
    if (topLevelBackgroundEnabled !== undefined) {
      // Ensure background object exists
      if (!settings.background) {
        settings.background = {};
      }
      
      if (topLevelBackgroundEnabled === false) {
        // If backgroundEnabled is false, ensure background.enabled is false and don't apply other properties
        settings.background = {
          ...settings.background,
          enabled: false
        };
        settings.backgroundEnabled = false;
        // Explicitly don't apply backgroundOpacity when disabled
      } else {
        // If backgroundEnabled is true, apply background properties
        settings.background = {
          ...settings.background,
          enabled: topLevelBackgroundEnabled,
          opacity: topLevelBackgroundOpacity !== undefined ? topLevelBackgroundOpacity : settings.background.opacity,
          backgroundOpacity: topLevelBackgroundOpacity !== undefined ? topLevelBackgroundOpacity : settings.background.backgroundOpacity
        };
        settings.backgroundEnabled = topLevelBackgroundEnabled;
        if (topLevelBackgroundOpacity !== undefined) {
          settings.background.opacity = topLevelBackgroundOpacity;
          settings.background.backgroundOpacity = topLevelBackgroundOpacity;
          settings.backgroundOpacity = topLevelBackgroundOpacity;
        }
      }
    }
    
    // Apply ruledLinesTheme to ruledLines object if it exists
    if (topLevelRuledLinesTheme) {
      // Ensure ruledLines object exists (it might come from textDefaults)
      if (!settings.ruledLines) {
        settings.ruledLines = {};
      }
      settings.ruledLines = {
        ...settings.ruledLines,
        theme: settings.ruledLines.theme || topLevelRuledLinesTheme,
        ruledLinesTheme: settings.ruledLines.ruledLinesTheme || topLevelRuledLinesTheme
      };
      // Also set on top-level of settings for backward compatibility
      settings.ruledLines.theme = settings.ruledLines.theme || topLevelRuledLinesTheme;
      settings.ruledLines.ruledLinesTheme = settings.ruledLines.theme;
      settings.ruledLinesTheme = settings.ruledLines.theme;
    }
    if (topLevelProperties.ruledLinesWidth !== undefined) {
      if (!settings.ruledLines) {
        settings.ruledLines = {};
      }
      settings.ruledLines.width = topLevelProperties.ruledLinesWidth;
      settings.ruledLines.lineWidth = topLevelProperties.ruledLinesWidth;
      settings.ruledLinesWidth = topLevelProperties.ruledLinesWidth;
    }
    if (topLevelProperties.ruledLinesOpacity !== undefined) {
      if (!settings.ruledLines) {
        settings.ruledLines = {};
      }
      settings.ruledLines.opacity = topLevelProperties.ruledLinesOpacity;
      settings.ruledLines.lineOpacity = topLevelProperties.ruledLinesOpacity;
      settings.ruledLinesOpacity = topLevelProperties.ruledLinesOpacity;
    }
    
    // Apply padding from qnaConfig if it exists and is not already set in settings
    // Padding is a layout property - it should come from layout.json primarily, but if not set there,
    // use qnaConfig.padding as fallback (not textDefaults.padding)
    if (topLevelPadding !== undefined && settings.padding === undefined) {
      settings.padding = topLevelPadding;
    }
    
    // Apply align from qnaConfig if it exists and is not already set in settings
    // Align is a layout property - it should come from layout.json primarily, but if not set there,
    // use qnaConfig.align as fallback (not textDefaults.align)
    if (topLevelAlign !== undefined && settings.format?.textAlign === undefined) {
      if (!settings.format) {
        settings.format = {};
      }
      settings.format.textAlign = topLevelAlign;
    }
    
    // Apply paragraphSpacing from qnaConfig if it exists and is not already set in settings
    // ParagraphSpacing is a layout property - it should come from layout.json primarily, but if not set there,
    // use qnaConfig.paragraphSpacing as fallback (not textDefaults.paragraphSpacing)
    if (topLevelParagraphSpacing !== undefined && settings.paragraphSpacing === undefined) {
      settings.paragraphSpacing = topLevelParagraphSpacing;
    }
    
    return settings;
  };
  
  if (qnaConfig?.questionSettings && qnaConfig?.answerSettings) {
    const questionSettings = applyTopLevelProperties(buildSettings(textDefaults, qnaConfig.questionSettings, false));
    const answerSettings = applyTopLevelProperties(buildSettings(textDefaults, qnaConfig.answerSettings, true));
    
    return {
      ...topLevelProperties,
      qnaIndividualSettings: topLevelQnaIndividualSettings ?? false,
      questionSettings,
      answerSettings
    };
  }
  
  const questionSettings = applyTopLevelProperties(buildSettings(textDefaults, {}, false));
  const answerSettings = applyTopLevelProperties(buildSettings(textDefaults, {}, true));
  
  return {
    ...topLevelProperties,
    qnaIndividualSettings: topLevelQnaIndividualSettings ?? false,
    questionSettings,
    answerSettings
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
export function getThemePageBackgroundColors(
  themeId: string,
  paletteOverride?: string | ColorPalette | null
): { backgroundColor: string; patternBackgroundColor: string } {
  let resolvedPalette: ColorPalette | undefined;

  if (paletteOverride) {
    resolvedPalette = typeof paletteOverride === 'string' ? getPalette(paletteOverride) : paletteOverride;
  }

  if (resolvedPalette) {
    return {
      backgroundColor: resolvedPalette.colors.background,
      patternBackgroundColor:
        resolvedPalette.colors.primary ||
        resolvedPalette.colors.surface ||
        resolvedPalette.colors.accent ||
        resolvedPalette.colors.background
    };
  }

  const themeConfig = (themesData as Record<string, any>)[themeId];
  const palette = themeConfig?.palette ? getPalette(themeConfig.palette) : undefined;
  
  if (palette) {
    return {
      backgroundColor: palette.colors.background,
      patternBackgroundColor:
        palette.colors.primary ||
        palette.colors.surface ||
        palette.colors.accent ||
        palette.colors.background
    };
  }
  
  // Fallback to default if no palette
  return {
    backgroundColor: '#ffffff',
    patternBackgroundColor: '#1f2937'
  };
}

export function applyThemeToPage(
  pageSettings: any,
  themeId: string,
  paletteOverride?: string | ColorPalette | null
): any {
  const theme = getGlobalTheme(themeId);
  if (!theme) return pageSettings;
  
  const inferredPaletteOverride =
    paletteOverride ??
    pageSettings?.colorPaletteId ??
    pageSettings?.bookPaletteId ??
    pageSettings?.bookColorPaletteId ??
    null;
  
  // Get colors from palette, not from themes.json
  const pageColors = getThemePageBackgroundColors(themeId, inferredPaletteOverride);
  
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
