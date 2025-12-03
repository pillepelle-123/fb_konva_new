// Centralized default values for all drawing tools
import { getGlobalThemeDefaults } from './global-themes.ts';
import { colorPalettes, applyPaletteToElement } from '../data/templates/color-palettes.ts';
import type { ColorPalette } from '../types/template-types.ts';

export const TOOL_DEFAULTS = {
  line: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937'
  },
  brush: {
    theme: 'default',
    strokeWidth: 3, // Common scale value
    stroke: '#1f2937'
  },
  rect: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent',
    cornerRadius: 0
  },
  circle: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  heart: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  star: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  'speech-bubble': {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  dog: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  cat: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  smiley: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  triangle: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent'
  },
  polygon: {
    theme: 'default',
    strokeWidth: 2, // Common scale value
    stroke: '#1f2937',
    fill: 'transparent',
    polygonSides: 5
  },
  text: {
    fontSize: 58, // Common size 14
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontColor: '#000000',
    align: 'left',
    paragraphSpacing: 'medium',
    ruledLines: false,
    ruledLinesTheme: 'rough',
    ruledLinesColor: '#1f2937',
    ruledLinesWidth: 1, // Common scale value
    cornerRadius: 0,
    borderWidth: 0, // Common scale value
    borderColor: '#000000',
    backgroundColor: 'transparent',
    padding: 4
  },
  question: {
    fontSize: 58, // Common size 14
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
    fontSize: 58, // Common size 14
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontColor: '#000000',
    align: 'left',
    paragraphSpacing: 'medium',
    ruledLines: false,
    ruledLinesTheme: 'rough',
    ruledLinesColor: '#1f2937',
    ruledLinesWidth: 1, // Common scale value
    cornerRadius: 0,
    borderWidth: 0, // Common scale value
    borderColor: '#000000',
    backgroundColor: 'transparent',
    padding: 4
  },
  qna: {
    fontSize: 50, // Common size 12 for answer text
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontColor: '#000000',
    align: 'left',
    paragraphSpacing: 'medium',
    ruledLines: false,
    ruledLinesTheme: 'rough',
    ruledLinesColor: '#1f2937',
    ruledLinesWidth: 1, // Common scale value
    cornerRadius: 0,
    borderWidth: 0, // Common scale value
    borderColor: '#000000',
    backgroundColor: 'transparent',
    padding: 4,
    // QnA specific defaults
    questionSettings: {
      fontSize: 58 // Common size 14 for question text
    },
    answerSettings: {
      fontSize: 50 // Common size 12 for answer text
    }
  },
  qna2: {
    fontSize: 50, // Common size 12 for answer text
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontColor: '#000000',
    align: 'left',
    paragraphSpacing: 'medium',
    ruledLines: false,
    ruledLinesTheme: 'rough',
    ruledLinesColor: '#1f2937',
    ruledLinesWidth: 1, // Common scale value
    cornerRadius: 0,
    borderWidth: 0, // Common scale value
    borderColor: '#000000',
    backgroundColor: 'transparent',
    padding: 4,
    // QnA2 specific defaults (same as QnA)
    questionSettings: {
      fontSize: 45, // Slightly smaller for inline questions
      fontColor: '#666666' // Gray color for questions
    },
    answerSettings: {
      fontSize: 50, // Normal size for answers
      fontColor: '#1f2937' // Dark color for answers
    }
  },
  qna_inline: {
    fontSize: 50, // Base font size for answer text
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontColor: '#000000',
    align: 'left',
    paragraphSpacing: 'medium',
    ruledLines: false,
    ruledLinesTheme: 'rough',
    ruledLinesColor: '#1f2937',
    ruledLinesWidth: 1, // Common scale value
    cornerRadius: 0,
    borderWidth: 0, // Common scale value
    borderColor: '#000000',
    backgroundColor: 'transparent',
    padding: 4,
    // QnA inline specific defaults - fontSize defines actual text size
    questionSettings: {
      fontSize: 45, // Font size for question text in canvas
      fontFamily: 'Arial, sans-serif',
      fontColor: '#666666', // Gray color for questions
      fontBold: false,
      fontItalic: false,
      fontOpacity: 1,
      align: 'left',
      paragraphSpacing: 'small',
      ruledLines: false,
      padding: 4
      // Border/Background are shared properties - borderEnabled/backgroundEnabled are only on top-level
    },
    answerSettings: {
      fontSize: 50, // Font size for answer text in canvas
      fontFamily: 'Arial, sans-serif',
      fontColor: '#1f2937', // Dark color for answers
      fontBold: false,
      fontItalic: false,
      fontOpacity: 1,
      align: 'left',
      paragraphSpacing: 'medium',
      ruledLines: false,
      padding: 4
      // Border/Background are shared properties - borderEnabled/backgroundEnabled are only on top-level
      // Ruled lines properties (ruledLinesColor, ruledLinesTheme, etc.) are only on top-level, not in answerSettings
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
} as const;

export type ToolType = keyof typeof TOOL_DEFAULTS;

export function getToolDefaults(
  tool: ToolType, 
  pageTheme?: string, 
  bookTheme?: string, 
  existingElement?: any, 
  toolSettings?: any,
  pageLayoutTemplateId?: string | null,
  bookLayoutTemplateId?: string | null,
  pageColorPaletteId?: string | null,
  bookColorPaletteId?: string | null
) {
  const baseDefaults = TOOL_DEFAULTS[tool] || {};
  // Page theme takes precedence over book theme
  const activeTheme = pageTheme || bookTheme || 'default';
  const themeDefaults = getGlobalThemeDefaults(activeTheme, tool);
  
  // Deep merge theme defaults with base defaults, with theme taking precedence
  let mergedDefaults = deepMerge(baseDefaults, themeDefaults);
  
  // Apply color palette (Page > Book hierarchy)
  const activePaletteId = pageColorPaletteId || bookColorPaletteId;
  if (activePaletteId) {
    const activePalette = colorPalettes.find(p => p.id === activePaletteId);
    if (activePalette) {
      // Determine element type for palette application
      const elementType = existingElement?.textType || existingElement?.type || tool;
      const paletteUpdates = applyPaletteToElement(activePalette, elementType);
      
      // Deep merge palette colors into merged defaults (palette takes precedence over theme colors)
      mergedDefaults = deepMerge(mergedDefaults, paletteUpdates);
    }
  }
  
  // Apply current tool settings (including palette colors) if available
  if (toolSettings && toolSettings[tool]) {
    const currentToolSettings = toolSettings[tool];
    // Only apply color-related settings from tool settings
    const colorSettings = {
      ...(currentToolSettings.strokeColor && { stroke: currentToolSettings.strokeColor }),
      ...(currentToolSettings.fillColor && { fill: currentToolSettings.fillColor }),
      ...(currentToolSettings.fontColor && { fontColor: currentToolSettings.fontColor }),
      ...(currentToolSettings.borderColor && { borderColor: currentToolSettings.borderColor }),
      ...(currentToolSettings.backgroundColor && { backgroundColor: currentToolSettings.backgroundColor })
    };
    
    // For qna_inline, also update nested settings
    if (tool === 'qna_inline') {
      if (currentToolSettings.fontColor) {
        colorSettings.questionSettings = {
          ...mergedDefaults.questionSettings,
          fontColor: currentToolSettings.fontColor,
          font: { ...mergedDefaults.questionSettings?.font, fontColor: currentToolSettings.fontColor }
        };
        colorSettings.answerSettings = {
          ...mergedDefaults.answerSettings,
          fontColor: currentToolSettings.fontColor,
          font: { ...mergedDefaults.answerSettings?.font, fontColor: currentToolSettings.fontColor }
        };
      }
      // borderColor and backgroundColor are shared properties - set only on top-level
      // border.enabled and background.enabled remain in questionSettings/answerSettings for rendering check
      if (currentToolSettings.borderColor) {
        // Only set border.enabled in questionSettings/answerSettings, not borderColor
        const questionBorder = mergedDefaults.questionSettings?.border || {};
        const answerBorder = mergedDefaults.answerSettings?.border || {};
        colorSettings.questionSettings = {
          ...colorSettings.questionSettings || mergedDefaults.questionSettings,
          border: {
            ...questionBorder,
            enabled: questionBorder.enabled
          }
        };
        colorSettings.answerSettings = {
          ...colorSettings.answerSettings || mergedDefaults.answerSettings,
          border: {
            ...answerBorder,
            enabled: answerBorder.enabled
          }
        };
      }
      if (currentToolSettings.backgroundColor) {
        // Only set background.enabled in questionSettings/answerSettings, not backgroundColor
        const questionBackground = mergedDefaults.questionSettings?.background || {};
        const answerBackground = mergedDefaults.answerSettings?.background || {};
        colorSettings.questionSettings = {
          ...colorSettings.questionSettings || mergedDefaults.questionSettings,
          background: {
            ...questionBackground,
            enabled: questionBackground.enabled
          }
        };
        colorSettings.answerSettings = {
          ...colorSettings.answerSettings || mergedDefaults.answerSettings,
          background: {
            ...answerBackground,
            enabled: answerBackground.enabled
          }
        };
      }
    }
    
    mergedDefaults = { ...mergedDefaults, ...colorSettings };
  }
  
  // For qna_inline, clean up shared properties from questionSettings/answerSettings
  // Move them to top-level and keep only font properties in questionSettings/answerSettings
  if (tool === 'qna_inline' && mergedDefaults) {
    const questionSettings = mergedDefaults.questionSettings || {};
    const answerSettings = mergedDefaults.answerSettings || {};
    
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
      if (mergedDefaults[prop] === undefined || mergedDefaults[prop] === null) {
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
          } else if (prop === 'ruledLinesColor') {
            value = element.ruledLinesColor;
          }
        }
        
        if (value !== undefined && value !== null) {
          mergedDefaults[prop] = value;
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
    const borderEnabled = mergedDefaults.borderEnabled ?? questionSettings.border?.enabled ?? questionSettings.borderEnabled ?? false;
    const backgroundEnabled = mergedDefaults.backgroundEnabled ?? questionSettings.background?.enabled ?? questionSettings.backgroundEnabled ?? false;
    
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
    
    // Ruled lines are now only on element level, not in answerSettings
    
    // Update mergedDefaults with cleaned questionSettings and answerSettings
    mergedDefaults.questionSettings = Object.keys(cleanedQuestionSettings).length > 0 ? cleanedQuestionSettings : undefined;
    mergedDefaults.answerSettings = Object.keys(cleanedAnswerSettings).length > 0 ? cleanedAnswerSettings : undefined;
  }
  
  // If we have an existing element, apply theme defaults but preserve essential properties
  if (existingElement) {
    const preservedProperties = {
      id: existingElement.id,
      type: existingElement.type,
      x: existingElement.x,
      y: existingElement.y,
      width: existingElement.width,
      height: existingElement.height,
      text: existingElement.text,
      formattedText: existingElement.formattedText,
      textType: existingElement.textType,
      questionId: existingElement.questionId,
      answerId: existingElement.answerId,
      questionElementId: existingElement.questionElementId,
      src: existingElement.src,
      points: existingElement.points
    };
    
    // For qna_inline, preserve layout properties from layout (element.padding, element.format?.textAlign, element.paragraphSpacing)
    // Shared properties are stored only on top-level, not in questionSettings/answerSettings
    if (tool === 'qna_inline') {
      // Handle padding - preserve on top-level only
      if (existingElement.padding !== undefined) {
        preservedProperties.padding = existingElement.padding;
      }
      
      // Handle align - preserve on top-level only (for qna_inline, not in format.textAlign)
      const existingAlign = existingElement.format?.textAlign ?? existingElement.align;
      if (existingAlign !== undefined) {
        preservedProperties.align = existingAlign;
        // Don't set format.textAlign for qna_inline - align is only on top-level
      }
      
      // Handle paragraphSpacing - preserve on top-level only
      if (existingElement.paragraphSpacing !== undefined) {
        preservedProperties.paragraphSpacing = existingElement.paragraphSpacing;
      }
    }
    
    // Apply merged defaults and then preserve essential properties
    return { ...mergedDefaults, ...preservedProperties };
  }
  
  // Return merged defaults with theme taking precedence
  return mergedDefaults;
}

// Helper function for deep merging objects
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}