import type { CanvasElement } from '../context/editor-context';
import { getPalette } from './global-palettes';
import { commonToActual } from './font-size-converter';
import { commonToActualStrokeWidth } from './stroke-width-converter';

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
    line: Partial<CanvasElement>;
  };
}

const RAW_THEMES: GlobalTheme[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean and simple',
    pageSettings: {
      backgroundColor: '#ffffff',
      backgroundPattern: {
        enabled: false,
        style: 'dots',
        size: 20,
        strokeWidth: 1,
        patternBackgroundColor: '#f0f0f0',
        patternBackgroundOpacity: 0.3
      },
      backgroundImage: {
        enabled: false,
        size: 'cover',
        repeat: false
      },
      cornerRadius: 0
    },
    elementDefaults: {
      text: {
        theme: 'default',
        stroke: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        fill: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        strokeWidth: 1,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'notebook',
          lineWidth: 1,
          lineColor: '#e0e0e0',
          lineOpacity: 0.5
        },
        font: {
          fontSize: 16,
          fontFamily: 'Century Gothic, sans-serif',
          fontColor: '#16697a',
          fontOpacity: 1,
          fontBold: false,
          fontItalic: false
        },
        border: {
          borderWidth: 0,
          borderColor: getPalette('neutral-harmony')?.colors.secondary || '#489fb5',
          borderOpacity: 1
        },
        format: {
          align: 'left',
          lineHeight: 1.2,
          paragraphSpacing: 'medium',
          padding: 8
        },
        background: {
          backgroundColor: getPalette('neutral-harmony')?.colors.background || '#ede7e3',
          backgroundOpacity: 0.3
        }
      },
      question: {
        theme: 'default',
        stroke: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        fill: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        strokeWidth: 2,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'notebook',
          lineWidth: 1,
          lineColor: '#e0e0e0',
          lineOpacity: 0.5
        },
        font: {
          fontSize: 18,
          fontFamily: 'Arial, sans-serif',
          fontColor: '#16697a',
          fontOpacity: 1,
          fontBold: false,
          fontItalic: false
        },
        border: {
          borderWidth: 1,
          borderColor: getPalette('neutral-harmony')?.colors.secondary || '#489fb5',
          borderOpacity: 1
        },
        format: {
          align: 'left',
          lineHeight: 1.3,
          paragraphSpacing: 'medium',
          padding: 12
        },
        background: {
          backgroundColor: getPalette('neutral-harmony')?.colors.surface || '#ffa62b',
          backgroundOpacity: 0.4
        }
      },
      answer: {
        theme: 'default',
        stroke: getPalette('neutral-harmony')?.colors.accent || '#82c0cc',
        fill: getPalette('neutral-harmony')?.colors.accent || '#82c0cc',
        strokeWidth: 1,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        ruledLines: {
          enabled: false,
          theme: 'notebook',
          lineWidth: 1,
          lineColor: '#e0e0e0',
          lineOpacity: 0.5
        },
        font: {
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          fontColor: '#82c0cc',
          fontOpacity: 1,
          fontBold: false,
          fontItalic: false
        },
        border: {
          borderWidth: 1,
          borderColor: getPalette('neutral-harmony')?.colors.secondary || '#489fb5',
          borderOpacity: 1
        },
        format: {
          align: 'left',
          lineHeight: 1.2,
          paragraphSpacing: 'medium',
          padding: 10
        },
        background: {
          backgroundColor: getPalette('neutral-harmony')?.colors.background || '#ede7e3',
          backgroundOpacity: 0.3
        }
      },
      image: {
        theme: 'default',
        stroke: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        strokeWidth: 1,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        border: {
          borderWidth: 0,
          borderColor: 'transparent',
          borderOpacity: 1
        },
        background: {
          backgroundColor: 'transparent',
          backgroundOpacity: 1
        }
      },
      shape: {
        theme: 'default',
        stroke: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        fill: getPalette('neutral-harmony')?.colors.surface || '#ffa62b',
        strokeWidth: 2,
        cornerRadius: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        border: {
          borderWidth: 0,
          borderColor: 'transparent',
          borderOpacity: 1
        },
        background: {
          backgroundColor: 'transparent',
          backgroundOpacity: 0.6
        }
      },
      brush: {
        theme: 'default',
        stroke: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        strokeWidth: 2,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      },
      line: {
        theme: 'default',
        stroke: getPalette('neutral-harmony')?.colors.primary || '#16697a',
        strokeWidth: 2,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      }
    }
  }
];

const processedThemeCache = new Map<string, GlobalTheme>();

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
              ? commonToActualStrokeWidth(element.border.borderWidth, theme.id)
              : element.border.borderWidth
          } : undefined,
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
  
  const rawTheme = RAW_THEMES.find(theme => theme.id === id);
  if (!rawTheme) return undefined;
  
  const processedTheme = processTheme(rawTheme);
  processedThemeCache.set(id, processedTheme);
  return processedTheme;
}

export const GLOBAL_THEMES: GlobalTheme[] = RAW_THEMES;

export function getGlobalThemeDefaults(themeId: string, elementType: string): Partial<CanvasElement> {
  const theme = getGlobalTheme(themeId);
  if (!theme) return {};
  
  const category = getThemeCategory(elementType);
  return theme.elementDefaults[category] || {};
}

export function getAllGlobalThemes(): GlobalTheme[] {
  return RAW_THEMES.map(theme => getGlobalTheme(theme.id)!).filter(Boolean);
}

function getThemeCategory(elementType: string): keyof GlobalTheme['elementDefaults'] {
  switch (elementType) {
    case 'text':
      return 'text';
    case 'question':
      return 'question';
    case 'answer':
      return 'answer';
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