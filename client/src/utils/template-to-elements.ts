import { v4 as uuidv4 } from 'uuid';
import type { PageTemplate, ColorPalette, TextboxStyle, ShapeStyle } from '../types/template-types';
import type { CanvasElement } from '../context/editor-context';
import { applyTextboxStyle, applyShapeStyle } from './template-style-applier';
import { TOOL_DEFAULTS } from './tool-defaults';
import { scaleTemplateToCanvas } from './template-utils';
import { commonToActual } from './font-size-converter';

interface TemplateTextbox {
  type: 'question' | 'answer' | 'text' | 'qna_inline';
  position: { x: number; y: number };
  size: { width: number; height: number };
  style?: TextboxStyle;
  layoutVariant?: string; // 'inline' | 'block' | undefined
  questionSettings?: Record<string, unknown>;
  answerSettings?: Record<string, unknown>;
  rotation?: number;
}

interface TemplateElement {
  type: 'image' | 'shape' | 'sticker';
  position: { x: number; y: number };
  size: { width: number; height: number };
  style?: ShapeStyle;
  shapeType?: string;
  rotation?: number;
}

export function convertTemplateTextboxToElement(
  textbox: TemplateTextbox, 
  palette: ColorPalette
): CanvasElement {
  // Determine textType: only qna_inline or free_text are supported
  // - qna_inline: for Q&A layouts (layoutVariant === 'inline' or type === 'qna_inline')
  // - free_text: for all other text boxes
  const isQnaInline = textbox.layoutVariant === 'inline' || textbox.type === 'qna_inline';
  const textType: CanvasElement['textType'] = isQnaInline ? 'qna_inline' : 'free_text';
  
  // Use appropriate defaults with type guards
  const qnaInlineDefaults = TOOL_DEFAULTS.qna_inline;
  const freeTextDefaults = TOOL_DEFAULTS.free_text;
  const defaults = isQnaInline ? qnaInlineDefaults : freeTextDefaults;
  
  const baseElement: CanvasElement = {
    id: uuidv4(),
    type: 'text',
    textType: textType,
    x: textbox.position.x,
    y: textbox.position.y,
    width: textbox.size.width,
    height: textbox.size.height,
    text: '',
    // fontColor and backgroundColor are not layout properties - they come from themes and color palettes
    // Using defaults for initial creation, will be overridden by theme/palette when template is applied
    fontColor: (defaults as any).fontColor || '#000000',
    backgroundColor: (defaults as any).backgroundColor || 'transparent',
    fontSize: defaults.fontSize || 50,
    fontFamily: defaults.fontFamily || 'Arial, sans-serif',
    align: (defaults.format?.textAlign as 'left' | 'center' | 'right') || defaults.align || 'left',
    padding: defaults.padding || 4,
    // Add type-specific settings
    ...(isQnaInline ? {
      // qna_inline specific settings
      layoutVariant: 'inline',
      // Übernehme questionSettings und answerSettings aus Template (falls vorhanden), sonst Defaults
      questionSettings: textbox.questionSettings || 
        (qnaInlineDefaults.questionSettings ? { ...qnaInlineDefaults.questionSettings } : undefined),
      answerSettings: textbox.answerSettings || 
        (qnaInlineDefaults.answerSettings ? { ...qnaInlineDefaults.answerSettings } : undefined)
    } : {
      // free_text specific settings
      textSettings: freeTextDefaults.textSettings ? { ...freeTextDefaults.textSettings } : undefined
    })
  };

  // Apply template styling if available (only primary layout properties)
  const styledElement = applyTextboxStyle(baseElement, textbox.style);
  
  // Apply layout variant if specified
  if (textbox.layoutVariant) {
    styledElement.layoutVariant = textbox.layoutVariant;
  }
  
  // Apply questionPosition and questionWidth for qna_inline (layout properties)
  if (isQnaInline) {
    if ((textbox as any).questionPosition) {
      styledElement.questionPosition = (textbox as any).questionPosition;
    }
    if ((textbox as any).questionWidth !== undefined) {
      styledElement.questionWidth = (textbox as any).questionWidth;
    }
  }
  
  // Apply rotation if specified
  if (textbox.rotation !== undefined) {
    styledElement.rotation = textbox.rotation;
  }
  
  // Apply only primary layout properties from questionSettings/answerSettings
  // Only fontSize is a layout property; all other properties (fontFamily, fontColor, etc.) come from themes
  if (isQnaInline && textbox.questionSettings) {
    const questionLayoutSettings: any = {};
    // Only extract fontSize from questionSettings (layout property)
    if (typeof textbox.questionSettings.fontSize === 'number') {
      questionLayoutSettings.fontSize = commonToActual(textbox.questionSettings.fontSize);
    }
    // fontSize might also be in a nested font object
    if (textbox.questionSettings.font && typeof textbox.questionSettings.font === 'object') {
      const font = textbox.questionSettings.font as Record<string, unknown>;
      if (typeof font.fontSize === 'number') {
        questionLayoutSettings.fontSize = commonToActual(font.fontSize);
      }
    }
    
    // Merge only fontSize into questionSettings
    if (Object.keys(questionLayoutSettings).length > 0) {
      styledElement.questionSettings = {
        ...styledElement.questionSettings,
        ...questionLayoutSettings
      };
    }
  }
  if (isQnaInline && textbox.answerSettings) {
    const answerLayoutSettings: any = {};
    // Only extract fontSize from answerSettings (layout property)
    if (typeof textbox.answerSettings.fontSize === 'number') {
      answerLayoutSettings.fontSize = commonToActual(textbox.answerSettings.fontSize);
    }
    // fontSize might also be in a nested font object
    if (textbox.answerSettings.font && typeof textbox.answerSettings.font === 'object') {
      const font = textbox.answerSettings.font as Record<string, unknown>;
      if (typeof font.fontSize === 'number') {
        answerLayoutSettings.fontSize = commonToActual(font.fontSize);
      }
    }
    
    // Merge only fontSize into answerSettings
    if (Object.keys(answerLayoutSettings).length > 0) {
      styledElement.answerSettings = {
        ...styledElement.answerSettings,
        ...answerLayoutSettings
      };
    }
  }
  
  return styledElement;
}

export function convertTemplateImageSlotToElement(imageSlot: TemplateElement): CanvasElement {
  return {
    id: uuidv4(),
    type: 'placeholder',
    x: imageSlot.position.x,
    y: imageSlot.position.y,
    width: imageSlot.size.width,
    height: imageSlot.size.height,
    fill: '#e5e7eb',
    stroke: '#9ca3af',
    strokeWidth: 2,
    rotation: imageSlot.rotation !== undefined ? imageSlot.rotation : 0
  };
}

export function convertTemplateShapeToElement(shape: TemplateElement): CanvasElement {
  const baseElement = {
    id: uuidv4(),
    type: shape.shapeType || 'circle',
    x: shape.position.x,
    y: shape.position.y,
    width: shape.size.width,
    height: shape.size.height,
    fill: '#fbbf24',
    stroke: '#f59e0b',
    strokeWidth: 2
  };

  // Apply template styling if available
  return applyShapeStyle(baseElement, shape.style);
}

export function convertTemplateStickerToElement(sticker: TemplateElement): CanvasElement {
  return {
    id: uuidv4(),
    type: 'circle',
    x: sticker.position.x,
    y: sticker.position.y,
    width: sticker.size.width,
    height: sticker.size.height,
    fill: '#fbbf24',
    stroke: '#f59e0b',
    strokeWidth: 2
  };
}

export function applyPaletteToElement(element: CanvasElement, palette: ColorPalette): CanvasElement {
  const updated = { ...element };
  
  if (element.type === 'text') {
    updated.fontColor = palette.colors.text;
    if (updated.backgroundColor && updated.backgroundColor !== 'transparent') {
      updated.backgroundColor = palette.colors.background;
    }
  }
  
  return updated;
}

export function convertTemplateToElements(template: PageTemplate, canvasSize?: { width: number; height: number }): CanvasElement[] {
  // Wenn canvasSize vorhanden ist, skaliere das Template
  // Für Legacy-Templates ohne baseSize: baseSize ist undefined, also immer skalieren wenn canvasSize vorhanden
  // Für neue Templates mit baseSize: skalieren wenn baseSize != canvasSize
  // Die Prüfung auf baseSize == canvasSize ist nicht nötig, da scaleTemplateToCanvas
  // die Skalierung nur durchführt wenn nötig (scaleFactor != 1.0)
  const templateToUse = canvasSize 
    ? scaleTemplateToCanvas(template, canvasSize)
    : template;
  
  const elements: CanvasElement[] = [];
  
  // Convert textboxes (highest z-index)
  templateToUse.textboxes.forEach(textbox => {
    // Pass layoutVariant, questionSettings, answerSettings, questionPosition, questionWidth, rotation to the conversion function
    const textboxWithVariant: TemplateTextbox & { questionPosition?: string; questionWidth?: number } = {
      type: textbox.type,
      position: textbox.position,
      size: textbox.size,
      style: textbox.style,
      layoutVariant: textbox.layoutVariant,
      questionSettings: textbox.questionSettings,
      answerSettings: textbox.answerSettings,
      questionPosition: (textbox as any).questionPosition,
      questionWidth: (textbox as any).questionWidth,
      rotation: (textbox as any).rotation
    };
    
    // Layout templates no longer have colorPalette - use default palette for initial element creation
    // Colors will be applied later from themes and color palettes
    const defaultPalette: ColorPalette = {
      id: 'default',
      name: 'Default',
      colors: {
        background: '#FFFFFF',
        primary: '#424242',
        secondary: '#757575',
        accent: '#BDBDBD',
        text: '#212121',
        surface: '#F5F5F5'
      },
      contrast: 'AAA'
    };
    
    elements.push(convertTemplateTextboxToElement(textboxWithVariant, defaultPalette));
  });
  
  // Convert image slots (medium z-index)
  templateToUse.elements
    .filter(elem => elem.type === 'image')
    .forEach(imageSlot => {
      elements.push(convertTemplateImageSlotToElement(imageSlot));
    });
  
  // Convert shapes (low z-index)
  templateToUse.elements
    .filter(elem => elem.type === 'shape')
    .forEach(shape => {
      elements.push(convertTemplateShapeToElement(shape));
    });
  
  // Convert stickers (low z-index)
  templateToUse.elements
    .filter(elem => elem.type === 'sticker')
    .forEach(sticker => {
      elements.push(convertTemplateStickerToElement(sticker));
    });
  
  return elements;
}