import { v4 as uuidv4 } from 'uuid';
import type { PageTemplate, ColorPalette, TextboxStyle, ShapeStyle } from '../types/template-types';
import type { CanvasElement } from '../context/editor-context';
import { applyTextboxStyle, applyShapeStyle } from './template-style-applier';
import { getGlobalThemeDefaults } from './global-themes';
import { scaleTemplateToCanvas } from './template-utils';

interface TemplateTextbox {
  type: 'question' | 'answer' | 'text' | 'qna';
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
  // Determine textType: qna or free_text are supported
  // - qna: for Q&A layouts (layoutVariant === 'inline' or type === 'qna')
  // - free_text: for all other text boxes
  const isQna = textbox.layoutVariant === 'inline' || textbox.type === 'qna';
  const textType: CanvasElement['textType'] = isQna ? 'qna' : 'free_text';
  
  // Use appropriate defaults with type guards
  // getGlobalThemeDefaults() now includes base defaults, so we can use it with 'default' theme
  const qnaDefaults = getGlobalThemeDefaults('default', 'qna', undefined);
  const freeTextDefaults = getGlobalThemeDefaults('default', 'free_text', undefined);
  const defaults = isQna ? qnaDefaults : freeTextDefaults;
  
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
    backgroundColor: (defaults as any).backgroundColor || 'transparent',
    align: (defaults.format?.textAlign as 'left' | 'center' | 'right') || defaults.align || 'left',
    padding: defaults.padding || 4,
    // Add type-specific settings - for qna, font properties are only in questionSettings/answerSettings
    ...(isQna ? {
      // qna specific settings
      layoutVariant: 'inline',
      // Übernehme questionSettings und answerSettings aus Template (falls vorhanden), sonst Defaults
      questionSettings: textbox.questionSettings ||
        (qnaDefaults.questionSettings ? { ...qnaDefaults.questionSettings } : undefined),
      answerSettings: textbox.answerSettings ||
        (qnaDefaults.answerSettings ? { ...qnaDefaults.answerSettings } : undefined)
    } : {
      // free_text specific settings
      fontColor: (defaults as any).fontColor || '#000000',
      fontSize: defaults.fontSize || 50,
      fontFamily: defaults.fontFamily || 'Arial, sans-serif',
      textSettings: freeTextDefaults.textSettings ? { ...freeTextDefaults.textSettings } : undefined
    })
  };

  // Apply template styling if available (only primary layout properties)
  const styledElement = applyTextboxStyle(baseElement, textbox.style);
  
  // Apply layout variant if specified
  if (textbox.layoutVariant) {
    styledElement.layoutVariant = textbox.layoutVariant;
  }
  
  // Apply questionPosition and questionWidth for qna (layout properties)
  if (isQna) {
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
  
  // fontSize is NO LONGER a layout property - it comes from themes only
  // layout.json only contains position, size, align, paragraphSpacing, and other layout properties
  
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