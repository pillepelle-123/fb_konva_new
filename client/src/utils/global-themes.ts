import type { CanvasElement } from '../context/editor-context';
import { colorPalettes } from '../data/templates/color-palettes';
import type { ColorPalette } from '../types/template-types';
import { commonToActual } from './font-size-converter';
import { themeJsonToActualStrokeWidth } from './stroke-width-converter';
import { commonToActualRadius } from './corner-radius-converter';
import themesData from '../data/templates/themes.json';

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
    
    // Map borderOpacity and backgroundOpacity for shapes to strokeOpacity and fillOpacity
    if (elementType === 'shape') {
      if (base.borderOpacity !== undefined) {
        base.strokeOpacity = base.borderOpacity;
      }
      if (base.backgroundOpacity !== undefined) {
        base.fillOpacity = base.backgroundOpacity;
      }
      // Fallback: if old opacity property exists, use it for both (for backward compatibility)
      if (base.opacity !== undefined && base.borderOpacity === undefined && base.backgroundOpacity === undefined) {
        base.strokeOpacity = base.opacity;
        base.fillOpacity = base.opacity;
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
    // CRITICAL: Also add theme property so elements know which theme to use
    return {
      ...qnaDefaults,
      theme: themeId, // Add theme property so elements know which theme to use
      fontColor: palette ? (palette.colors.text || palette.colors.primary) : undefined,
      borderColor: palette ? palette.colors.secondary : undefined,
      backgroundColor: palette ? (palette.colors.surface || palette.colors.background) : undefined,
      ruledLinesColor: palette ? (palette.colors.accent || palette.colors.primary) : undefined
    };
  }
  
  // For free_text elements, build textSettings structure
  if (elementType === 'free_text') {
    const category = getThemeCategory(elementType);
    const baseDefaults = theme.elementDefaults[category] || {};
    
    // Convert fontSize from common scale to actual size if it exists
    let fontSize = 50;
    if (baseDefaults.font?.fontSize !== undefined) {
      fontSize = commonToActual(baseDefaults.font.fontSize);
    }
    
    // Convert cornerRadius from common scale to actual size if it exists
    let cornerRadius = 0;
    if (baseDefaults.cornerRadius !== undefined) {
      cornerRadius = commonToActualRadius(baseDefaults.cornerRadius);
    }
    
    // Build textSettings from base defaults
    const textSettings: any = {
      fontSize: fontSize,
      fontFamily: baseDefaults.font?.fontFamily || 'Arial, sans-serif',
      fontBold: baseDefaults.font?.fontBold ?? false,
      fontItalic: baseDefaults.font?.fontItalic ?? false,
      fontOpacity: baseDefaults.font?.fontOpacity ?? 1,
      align: baseDefaults.format?.textAlign || 'left',
      paragraphSpacing: baseDefaults.format?.paragraphSpacing || 'medium',
      padding: baseDefaults.format?.padding || 4,
      cornerRadius: cornerRadius,
      border: baseDefaults.border ? {
        enabled: baseDefaults.border.enabled ?? false,
        borderWidth: baseDefaults.border.borderWidth || 0,
        borderColor: baseDefaults.border.borderColor,
        borderOpacity: baseDefaults.border.borderOpacity ?? 1,
        borderTheme: baseDefaults.border.borderTheme || 'default'
      } : { enabled: false, borderWidth: 0, borderColor: '#000000', borderOpacity: 1, borderTheme: 'default' },
      background: baseDefaults.background ? {
        enabled: baseDefaults.background.enabled ?? false,
        backgroundColor: baseDefaults.background.backgroundColor,
        backgroundOpacity: baseDefaults.background.backgroundOpacity ?? 1
      } : { enabled: false, backgroundColor: 'transparent', backgroundOpacity: 1 },
      ruledLines: baseDefaults.ruledLines ? {
        enabled: baseDefaults.ruledLines.enabled ?? false,
        lineWidth: baseDefaults.ruledLines.lineWidth || 0.8,
        lineOpacity: baseDefaults.ruledLines.lineOpacity ?? 0.5,
        ruledLinesTheme: baseDefaults.ruledLines.ruledLinesTheme || 'default',
        lineColor: baseDefaults.ruledLines.lineColor
      } : { enabled: false, lineWidth: 0.8, lineOpacity: 0.5, ruledLinesTheme: 'default', lineColor: '#1f2937' }
    };
    
    // Initialize font object if it doesn't exist
    if (!textSettings.font) {
      textSettings.font = {};
    }
    
    // Apply palette colors if available
    if (palette) {
      textSettings.fontColor = palette.colors.text || palette.colors.primary;
      textSettings.font.fontColor = palette.colors.text || palette.colors.primary;
      textSettings.borderColor = palette.colors.primary;
      textSettings.border.borderColor = palette.colors.primary;
      textSettings.backgroundColor = palette.colors.accent;
      textSettings.background.backgroundColor = palette.colors.accent;
      textSettings.ruledLinesColor = palette.colors.primary;
      textSettings.ruledLines.lineColor = palette.colors.primary;
    }
    
    return {
      ...baseDefaults,
      textSettings,
      // Top-level properties for backward compatibility
      fontColor: palette ? (palette.colors.text || palette.colors.primary) : undefined,
      borderColor: palette ? palette.colors.primary : undefined,
      backgroundColor: palette ? palette.colors.accent : undefined
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
        if (settings.background && settings.background.enabled !== false) {
          settings.background = { ...settings.background, backgroundColor: palette.colors.surface || palette.colors.background };
        }
        if (settings.border && settings.border.enabled !== false) {
          settings.border = { ...settings.border, borderColor: palette.colors.secondary };
        }
        if (settings.ruledLines) {
          settings.ruledLines = { ...settings.ruledLines, lineColor: palette.colors.accent || palette.colors.primary };
        }
      }
      
      // Ensure border and background objects exist if they're enabled
      // Only apply palette colors if border/background is not explicitly disabled
      if (settings.border && settings.border.enabled !== false) {
        settings.border = {
          ...settings.border,
          borderColor: settings.border.borderColor || palette.colors.secondary
        };
      }
      if (settings.background && settings.background.enabled !== false) {
        settings.background = {
          ...settings.background,
          backgroundColor: settings.background.backgroundColor || (isAnswer ? palette.colors.background : palette.colors.surface || palette.colors.background)
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
      questionSettings,
      answerSettings
    };
  }
  
  const questionSettings = applyTopLevelProperties(buildSettings(textDefaults, {}, false));
  const answerSettings = applyTopLevelProperties(buildSettings(textDefaults, {}, true));
  
  return {
    ...topLevelProperties,
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

// Re-export getToolDefaults functionality from tool-defaults.ts
// This will be removed once tool-defaults.ts is fully migrated
export { getToolDefaults, TOOL_DEFAULTS } from './tool-defaults';
export type { ToolType } from './tool-defaults';