import { v4 as uuidv4 } from 'uuid';
import type { PageTemplate, ColorPalette, TextboxStyle, ShapeStyle } from '../types/template-types';
import type { CanvasElement } from '../context/editor-context';
import { applyTextboxStyle, applyShapeStyle } from './template-style-applier';
import { TOOL_DEFAULTS } from './tool-defaults';

interface TemplateTextbox {
  type: 'question' | 'answer' | 'text' | 'qna_inline';
  position: { x: number; y: number };
  size: { width: number; height: number };
  style?: TextboxStyle;
  layoutVariant?: string; // 'inline' | 'block' | undefined
}

interface TemplateElement {
  type: 'image' | 'shape' | 'sticker';
  position: { x: number; y: number };
  size: { width: number; height: number };
  style?: ShapeStyle;
  shapeType?: string;
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
    fontColor: palette.colors.text || defaults.fontColor,
    backgroundColor: palette.colors.background || defaults.backgroundColor || 'transparent',
    fontSize: defaults.fontSize || 50,
    fontFamily: defaults.fontFamily || 'Arial, sans-serif',
    align: (defaults.align as 'left' | 'center' | 'right') || 'left',
    padding: defaults.padding || 4,
    // Add type-specific settings
    ...(isQnaInline ? {
      // qna_inline specific settings
      layoutVariant: 'inline',
      questionSettings: qnaInlineDefaults.questionSettings ? { ...qnaInlineDefaults.questionSettings } : undefined,
      answerSettings: qnaInlineDefaults.answerSettings ? { ...qnaInlineDefaults.answerSettings } : undefined
    } : {
      // free_text specific settings
      textSettings: freeTextDefaults.textSettings ? { ...freeTextDefaults.textSettings } : undefined
    })
  };

  // Apply template styling if available
  return applyTextboxStyle(baseElement, textbox.style);
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
    strokeWidth: 2
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

export function convertTemplateToElements(template: PageTemplate): CanvasElement[] {
  const elements: CanvasElement[] = [];
  
  // Convert textboxes (highest z-index)
  template.textboxes.forEach(textbox => {
    // Pass layoutVariant to the conversion function
    const textboxWithVariant: TemplateTextbox = {
      type: textbox.type,
      position: textbox.position,
      size: textbox.size,
      style: textbox.style,
      layoutVariant: textbox.layoutVariant
    };
    
    elements.push(convertTemplateTextboxToElement(textboxWithVariant, {
      id: 'template',
      name: 'Template',
      colors: {
        ...template.colorPalette,
        surface: template.colorPalette.background || '#ffffff'
      },
      contrast: 'AA'
    }));
  });
  
  // Convert image slots (medium z-index)
  template.elements
    .filter(elem => elem.type === 'image')
    .forEach(imageSlot => {
      elements.push(convertTemplateImageSlotToElement(imageSlot));
    });
  
  // Convert shapes (low z-index)
  template.elements
    .filter(elem => elem.type === 'shape')
    .forEach(shape => {
      elements.push(convertTemplateShapeToElement(shape));
    });
  
  // Convert stickers (low z-index)
  template.elements
    .filter(elem => elem.type === 'sticker')
    .forEach(sticker => {
      elements.push(convertTemplateStickerToElement(sticker));
    });
  
  return elements;
}