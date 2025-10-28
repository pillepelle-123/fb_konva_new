import { v4 as uuidv4 } from 'uuid';
import type { PageTemplate, ColorPalette, TemplateCategory } from '../types/template-types';
import type { CanvasElement } from '../context/editor-context';
import { pageTemplates } from '../data/templates/page-templates';

export function applyTemplateToPage(
  template: PageTemplate, 
  pageIndex: number, 
  canvasSize: { width: number; height: number }
): CanvasElement[] {
  const elements: CanvasElement[] = [];
  
  // Scale template to canvas size
  const scaledTemplate = scaleTemplateToCanvas(template, canvasSize);
  
  // Create textbox elements
  scaledTemplate.textboxes.forEach(textbox => {
    const element: CanvasElement = {
      id: uuidv4(),
      type: 'text',
      textType: textbox.type,
      x: textbox.position.x,
      y: textbox.position.y,
      width: textbox.size.width,
      height: textbox.size.height,
      text: '',
      fontColor: template.colorPalette.text,
      backgroundColor: template.colorPalette.background
    };
    
    if (textbox.type === 'question') {
      element.questionId = uuidv4();
    }
    
    elements.push(element);
  });
  
  // Create other elements (images, stickers)
  scaledTemplate.elements.forEach(elem => {
    const element: CanvasElement = {
      id: uuidv4(),
      type: elem.type === 'image' ? 'placeholder' : elem.type === 'sticker' ? 'rect' : elem.type,
      x: elem.position.x,
      y: elem.position.y,
      width: elem.size.width,
      height: elem.size.height
    };
    elements.push(element);
  });
  
  return elements;
}

export function mergeTemplateWithPalette(template: PageTemplate, palette: ColorPalette): PageTemplate {
  return {
    ...template,
    colorPalette: {
      primary: palette.colors.primary,
      secondary: palette.colors.secondary,
      accent: palette.colors.accent,
      background: palette.colors.background,
      text: palette.colors.text
    },
    background: {
      ...template.background,
      value: template.background.type === 'color' ? palette.colors.background : template.background.value
    }
  };
}

export function validateTemplateConstraints(template: PageTemplate): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const questionCount = template.textboxes.filter(t => t.type === 'question').length;
  if (questionCount < 1 || questionCount > 15) {
    errors.push(`Question count (${questionCount}) must be between 1-15`);
  }
  
  const imageCount = template.elements.filter(e => e.type === 'image').length;
  if (imageCount > 3) {
    errors.push(`Too many images (${imageCount}), maximum is 3`);
  }
  
  const stickerCount = template.elements.filter(e => e.type === 'sticker').length;
  if (stickerCount > 10) {
    errors.push(`Too many stickers (${stickerCount}), maximum is 10`);
  }
  
  // Check if elements fit within canvas bounds
  const CANVAS_WIDTH = 2480;
  const CANVAS_HEIGHT = 3508;
  
  [...template.textboxes, ...template.elements].forEach(elem => {
    if (elem.position.x + elem.size.width > CANVAS_WIDTH || 
        elem.position.y + elem.size.height > CANVAS_HEIGHT) {
      errors.push(`Element extends beyond canvas bounds`);
    }
  });
  
  return { valid: errors.length === 0, errors };
}

export function generateTemplatePreview(template: PageTemplate): string {
  // Generate SVG preview data
  const width = 200;
  const height = 280;
  const scaleX = width / 2480;
  const scaleY = height / 3508;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Background
  svg += `<rect width="${width}" height="${height}" fill="${template.colorPalette.background}"/>`;
  
  // Textboxes
  template.textboxes.forEach(textbox => {
    const x = textbox.position.x * scaleX;
    const y = textbox.position.y * scaleY;
    const w = textbox.size.width * scaleX;
    const h = textbox.size.height * scaleY;
    
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" 
            fill="${template.colorPalette.primary}" opacity="0.3" rx="2"/>`;
  });
  
  // Elements
  template.elements.forEach(elem => {
    const x = elem.position.x * scaleX;
    const y = elem.position.y * scaleY;
    const w = elem.size.width * scaleX;
    const h = elem.size.height * scaleY;
    
    const color = elem.type === 'image' ? template.colorPalette.secondary : template.colorPalette.accent;
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" 
            fill="${color}" opacity="0.5" rx="1"/>`;
  });
  
  svg += '</svg>';
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function getTemplatesByCategory(category: TemplateCategory): PageTemplate[] {
  return pageTemplates.filter(template => template.category === category);
}

export function scaleTemplateToCanvas(
  template: PageTemplate, 
  targetSize: { width: number; height: number }
): PageTemplate {
  const ORIGINAL_WIDTH = 2480;
  const ORIGINAL_HEIGHT = 3508;
  
  const scaleX = targetSize.width / ORIGINAL_WIDTH;
  const scaleY = targetSize.height / ORIGINAL_HEIGHT;
  
  return {
    ...template,
    textboxes: template.textboxes.map(textbox => ({
      ...textbox,
      position: {
        x: textbox.position.x * scaleX,
        y: textbox.position.y * scaleY
      },
      size: {
        width: textbox.size.width * scaleX,
        height: textbox.size.height * scaleY
      }
    })),
    elements: template.elements.map(elem => ({
      ...elem,
      position: {
        x: elem.position.x * scaleX,
        y: elem.position.y * scaleY
      },
      size: {
        width: elem.size.width * scaleX,
        height: elem.size.height * scaleY
      }
    }))
  };
}