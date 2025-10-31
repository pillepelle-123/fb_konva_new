import type { CanvasElement } from '../context/editor-context';
import { getPalette } from './global-palettes';
import { commonToActual } from './font-size-converter';
import { commonToActualStrokeWidth, themeJsonToActualStrokeWidth } from './stroke-width-converter';
import { commonToActualRadius } from './corner-radius-converter';
import { getRuledLinesOpacity } from './ruled-lines-utils';
import { getBorderTheme } from './theme-utils';
import themesData from '../data/themes.json';

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
    const base = {
      theme: id,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      ...defaults
    };

    // Map nested font properties to flat canvas element properties
    if (base.font) {
      if (base.font.fontColor) {
        base.stroke = base.font.fontColor;
        base.fontColor = base.font.fontColor;
      }
      if (base.font.fontSize) base.fontSize = base.font.fontSize;
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
    }

    // Map nested border properties to flat canvas element properties
    if (base.border) {
      if (base.border.borderWidth !== undefined) base.borderWidth = base.border.borderWidth;
      if (base.border.borderColor) base.borderColor = base.border.borderColor;
      if (base.border.borderOpacity !== undefined) base.borderOpacity = base.border.borderOpacity;
    }

    // Map nested background properties to flat canvas element properties
    if (base.background) {
      if (base.background.backgroundColor) base.backgroundColor = base.background.backgroundColor;
      if (base.background.backgroundOpacity !== undefined) base.backgroundOpacity = base.background.backgroundOpacity;
    }

    // Map nested format properties to flat canvas element properties
    if (base.format) {
      if (base.format.textAlign) base.align = base.format.textAlign;
      if (base.format.paragraphSpacing) base.paragraphSpacing = base.format.paragraphSpacing;
      if (base.format.padding !== undefined) base.padding = base.format.padding;
    }

    // Map nested ruledLines properties to flat canvas element properties
    if (base.ruledLines) {
      if (base.ruledLines.lineWidth !== undefined) base.ruledLinesWidth = base.ruledLines.lineWidth;
      if (base.ruledLines.lineColor) base.ruledLinesColor = base.ruledLines.lineColor;
      if (base.ruledLines.lineOpacity !== undefined) base.ruledLinesOpacity = base.ruledLines.lineOpacity;
      if (base.ruledLines.ruledLinesTheme) base.ruledLinesTheme = base.ruledLines.ruledLinesTheme;
    }

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
  return {
    ...theme,
    pageSettings: {
      ...theme.pageSettings,
      backgroundPattern: theme.pageSettings.backgroundPattern ? {
        ...theme.pageSettings.backgroundPattern,
        strokeWidth: themeJsonToActualStrokeWidth(theme.pageSettings.backgroundPattern.strokeWidth, theme.id)
      } : undefined
    },
    elementDefaults: Object.fromEntries(
      Object.entries(theme.elementDefaults).map(([key, element]) => [
        key,
        {
          ...element,
          strokeWidth: typeof element.strokeWidth === 'number' 
            ? themeJsonToActualStrokeWidth(element.strokeWidth, element.inheritTheme || theme.id) 
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
              ? themeJsonToActualStrokeWidth(element.border.borderWidth, getBorderTheme(element) || theme.id)
              : element.border.borderWidth
          } : undefined,
          format: element.format,
          background: element.background,
          cornerRadius: typeof element.cornerRadius === 'number'
            ? commonToActualRadius(element.cornerRadius)
            : element.cornerRadius,
          ruledLines: element.ruledLines ? {
            ...element.ruledLines,
            lineWidth: themeJsonToActualStrokeWidth(element.ruledLines.lineWidth, element.ruledLines.ruledLinesTheme || theme.id)
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
  
  const category = getThemeCategory(elementType);
  const baseDefaults = theme.elementDefaults[category] || {};
  
  // For QnA inline elements, add questionSettings and answerSettings
  if (elementType === 'qna_inline') {
    const qnaDefaults = getQnAInlineThemeDefaults(themeId);
    return {
      ...baseDefaults,
      ...qnaDefaults
    };
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
  
  // Extract questionSettings and answerSettings from the theme if available
  const themeConfig = (themesData as Record<string, any>)[themeId];
  const qnaConfig = themeConfig?.elementDefaults?.qna;
  
  if (qnaConfig?.questionSettings && qnaConfig?.answerSettings) {
    return {
      questionSettings: {
        ...textDefaults,
        ...qnaConfig.questionSettings,
        fontSize: qnaConfig.questionSettings.fontSize ? commonToActual(qnaConfig.questionSettings.fontSize) : textDefaults.fontSize
      },
      answerSettings: {
        ...textDefaults,
        ...qnaConfig.answerSettings,
        fontSize: qnaConfig.answerSettings.fontSize ? commonToActual(qnaConfig.answerSettings.fontSize) : textDefaults.fontSize
      }
    };
  }
  
  return {
    questionSettings: textDefaults,
    answerSettings: textDefaults
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

export function applyThemeToPage(pageSettings: any, themeId: string): any {
  const theme = getGlobalTheme(themeId);
  if (!theme) return pageSettings;
  
  // Apply only non-color page settings
  const { backgroundColor, patternBackgroundColor, ...nonColorPageSettings } = theme.pageSettings;
  
  return {
    ...pageSettings,
    ...nonColorPageSettings,
    backgroundPattern: {
      ...pageSettings.backgroundPattern,
      ...theme.pageSettings.backgroundPattern,
      patternBackgroundColor: pageSettings.backgroundPattern?.patternBackgroundColor // Preserve existing color
    }
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