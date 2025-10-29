import { v4 as uuidv4 } from 'uuid';
import type { PageTemplate, ColorPalette } from '../types/template-types';
import type { CanvasElement } from '../context/editor-context';
import { applyTextboxStyle, applyShapeStyle } from './template-style-applier';

interface TemplateTextbox {
  type: 'question' | 'answer' | 'text';
  position: { x: number; y: number };
  size: { width: number; height: number };
  style?: any;
}

interface TemplateElement {
  type: 'image' | 'shape' | 'sticker';
  position: { x: number; y: number };
  size: { width: number; height: number };
  style?: any;
  shapeType?: string;
}

export function convertTemplateTextboxToElement(
  textbox: TemplateTextbox, 
  palette: ColorPalette
): CanvasElement {
  const baseElement = {
    id: uuidv4(),
    type: 'text',
    textType: textbox.type === 'question' ? 'question' : textbox.type === 'answer' ? 'answer' : 'text',
    x: textbox.position.x,
    y: textbox.position.y,
    width: textbox.size.width,
    height: textbox.size.height,
    text: '',
    fontColor: palette.colors.text,
    backgroundColor: palette.colors.background,
    fontSize: 14,
    fontFamily: 'Century Gothic, sans-serif',
    align: 'left',
    padding: 12,
    cornerRadius: 8
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
    strokeWidth: 2,
    cornerRadius: 8
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
    elements.push(convertTemplateTextboxToElement(textbox, {
      id: 'template',
      name: 'Template',
      colors: template.colorPalette,
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