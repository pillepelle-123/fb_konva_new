import type { CanvasElement } from '../context/editor-context';
import { getPalette } from './global-palettes';
import { commonToActual } from './font-size-converter';
import { commonToActualStrokeWidth } from './stroke-width-converter';
import { commonToActualRadius } from './corner-radius-converter';
import themesData from '../data/themes.json';

export interface GlobalTheme {
  id: string;
  name: string;
  description: string;
  pageSettings: {
    backgroundColor: string;
    backgroundPattern?: {
      enabled: boolean;
      style: 'dots' | 'grid' | 'lines' | 'crosses';
      size: number;
      strokeWidth: number;
      backgroundColor: string;
      backgroundOpacity: number;
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
    line: Partial<CanvasElement>;
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
    const base = {
      theme: id,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      ...defaults
    };

    // Add palette colors
    if (palette) {
      base.stroke = base.stroke || palette.colors.primary;
      base.fill = base.fill || palette.colors.primary;
      
      if (base.font) {
        base.font.fontColor = base.font.fontColor || palette.colors.primary;
        base.font.fontOpacity = base.font.fontOpacity || 1;
      }
      
      if (base.border) {
        base.border.borderColor = base.border.borderColor || palette.colors.secondary;
        base.border.borderTheme = base.border.borderTheme || id;
      }
      
      if (base.background) {
        base.background.backgroundColor = base.background.backgroundColor || palette.colors.background;
      }
      
      if (base.ruledLines) {
        base.ruledLines.ruledLinesTheme = base.ruledLines.ruledLinesTheme || 'notebook';
        base.ruledLines.lineColor = base.ruledLines.lineColor || '#e0e0e0';
      }
    }

    // Add inherit theme for shapes and stroke themes
    if (['shape', 'brush', 'line'].includes(elementType)) {
      base.inheritTheme = base.strokeTheme || id;
    }
    
    // Handle strokeTheme for borders and ruled lines
    if (base.border && base.border.strokeTheme) {
      base.border.borderTheme = base.border.strokeTheme;
    }
    
    if (base.ruledLines && base.ruledLines.strokeTheme) {
      base.ruledLines.ruledLinesTheme = base.ruledLines.strokeTheme;
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
      brush: buildElement('brush', config.elementDefaults.brush || {}),
      line: buildElement('line', config.elementDefaults.line || {})
    }
  };
}

function processTheme(theme: GlobalTheme): GlobalTheme {
  return {
    ...theme,
    pageSettings: {
      ...theme.pageSettings,
      backgroundPattern: theme.pageSettings.backgroundPattern ? {
        ...theme.pageSettings.backgroundPattern,
        strokeWidth: commonToActualStrokeWidth(theme.pageSettings.backgroundPattern.strokeWidth, theme.id)
      } : undefined
    },
    elementDefaults: Object.fromEntries(
      Object.entries(theme.elementDefaults).map(([key, element]) => [
        key,
        {
          ...element,
          strokeWidth: typeof element.strokeWidth === 'number' 
            ? commonToActualStrokeWidth(element.strokeWidth, theme.id) 
            : element.strokeWidth,
          font: element.font ? {
            ...element.font,
            fontSize: typeof element.font.fontSize === 'number'
              ? commonToActual(element.font.fontSize)
              : element.font.fontSize
          } : undefined,
          border: element.border ? {
            ...element.border,
            borderWidth: typeof element.border.borderWidth === 'number'
              ? commonToActualStrokeWidth(element.border.borderWidth, element.border.borderTheme || element.border.inheritTheme || theme.id)
              : element.border.borderWidth
          } : undefined,
          format: element.format,
          background: element.background,
          cornerRadius: typeof element.cornerRadius === 'number'
            ? commonToActualRadius(element.cornerRadius)
            : element.cornerRadius,
          ruledLines: element.ruledLines ? {
            ...element.ruledLines,
            lineWidth: commonToActualStrokeWidth(element.ruledLines.lineWidth, theme.id)
          } : undefined
        }
      ])
    ) as GlobalTheme['elementDefaults']
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
    case 'text':
      return 'text';
    case 'image':
    case 'placeholder':
      return 'image';
    case 'brush':
      return 'brush';
    case 'line':
      return 'line';
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
  
  const category = getThemeCategory(elementType);
  return theme.elementDefaults[category] || {};
}

export function applyThemeToElement(element: CanvasElement, themeId: string): CanvasElement {
  const themeDefaults = getGlobalThemeDefaults(themeId, element.type);
  return {
    ...element,
    ...themeDefaults,
    theme: themeId
  };
}

export function applyThemeToPage(pageSettings: any, themeId: string): any {
  const theme = getGlobalTheme(themeId);
  if (!theme) return pageSettings;
  
  return {
    ...pageSettings,
    ...theme.pageSettings
  };
}

export function getAllGlobalThemes(): GlobalTheme[] {
  return GLOBAL_THEMES;
}