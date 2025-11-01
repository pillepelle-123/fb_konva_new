// Centralized default values for all drawing tools
import { getGlobalThemeDefaults } from './global-themes';
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
      padding: 4,
      font: {
        fontColor: '#666666'
      },
      border: {
        borderColor: '#000000',
        enabled: false
      },
      background: {
        backgroundColor: 'transparent',
        enabled: false
      }
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
      padding: 4,
      font: {
        fontColor: '#1f2937'
      },
      border: {
        borderColor: '#000000',
        enabled: false
      },
      background: {
        backgroundColor: 'transparent',
        enabled: false
      },
      ruledLines: {
        lineColor: '#1f2937'
      }
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

export function getToolDefaults(tool: ToolType, pageTheme?: string, bookTheme?: string, existingElement?: any, toolSettings?: any) {
  const baseDefaults = TOOL_DEFAULTS[tool] || {};
  // Page theme takes precedence over book theme
  const activeTheme = pageTheme || bookTheme || 'default';
  const themeDefaults = getGlobalThemeDefaults(activeTheme, tool);
  
  // Deep merge theme defaults with base defaults, with theme taking precedence
  let mergedDefaults = deepMerge(baseDefaults, themeDefaults);
  
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
      if (currentToolSettings.borderColor) {
        colorSettings.questionSettings = {
          ...colorSettings.questionSettings || mergedDefaults.questionSettings,
          border: { ...mergedDefaults.questionSettings?.border, borderColor: currentToolSettings.borderColor }
        };
        colorSettings.answerSettings = {
          ...colorSettings.answerSettings || mergedDefaults.answerSettings,
          border: { ...mergedDefaults.answerSettings?.border, borderColor: currentToolSettings.borderColor }
        };
      }
      if (currentToolSettings.backgroundColor) {
        colorSettings.questionSettings = {
          ...colorSettings.questionSettings || mergedDefaults.questionSettings,
          background: { ...mergedDefaults.questionSettings?.background, backgroundColor: currentToolSettings.backgroundColor }
        };
        colorSettings.answerSettings = {
          ...colorSettings.answerSettings || mergedDefaults.answerSettings,
          background: { ...mergedDefaults.answerSettings?.background, backgroundColor: currentToolSettings.backgroundColor }
        };
      }
    }
    
    mergedDefaults = { ...mergedDefaults, ...colorSettings };
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