import { v4 as uuidv4 } from 'uuid';
import type { PageTemplate, ColorPalette, TemplateCategory, TemplateMargins } from '../types/template-types';
import type { CanvasElement } from '../context/editor-context';
import { pageTemplates } from '../data/templates/page-templates';
import { commonToActual, actualToCommon } from './font-size-converter';

// Pixel-Dimensionen für verschiedene Seitengrößen (in Pixel bei 300 DPI)
const PAGE_DIMENSIONS = {
  A4: { width: 2480, height: 3508 },
  A5: { width: 1748, height: 2480 },
  A6: { width: 1240, height: 1748 },
  A3: { width: 3508, height: 4961 },
  Letter: { width: 2550, height: 3300 },
  Square: { width: 2480, height: 2480 }
};

// Konvertierung mm zu Pixel (bei 300 DPI: 1mm = 11.81px)
const MM_TO_PX = 11.811;

/**
 * @deprecated Diese Funktion wird nicht mehr verwendet. 
 * Verwende stattdessen `convertTemplateToElements` aus `template-to-elements.ts`.
 * 
 * Die Wrapper-Funktion `applyTemplateToPage` in `editor-context.tsx` verwendet bereits
 * `convertTemplateToElements` über die `APPLY_TEMPLATE_TO_PAGE` Action.
 * 
 * @see convertTemplateToElements in template-to-elements.ts
 */
export function applyTemplateToPage(
  template: PageTemplate, 
  pageIndex: number, 
  canvasSize: { width: number; height: number },
  pageSize?: string,
  orientation?: string
): CanvasElement[] {
  const elements: CanvasElement[] = [];
  
  // Scale template to canvas size (mit neuen Parametern für Margins und Font-Scaling)
  const scaledTemplate = scaleTemplateToCanvas(template, canvasSize, pageSize, orientation);
  
  // Create textbox elements
  scaledTemplate.textboxes.forEach(textbox => {
    // Determine if this is a qna element
    const isQna = textbox.layoutVariant === 'inline' || textbox.type === 'qna' || textbox.type === 'qna_inline' || textbox.type === 'qna2';
    
    const element: CanvasElement = {
      id: uuidv4(),
      type: 'text',
      textType: textbox.type,
      x: textbox.position.x,
      y: textbox.position.y,
      width: textbox.size.width,
      height: textbox.size.height,
      text: ''
      // fontColor and backgroundColor are not layout properties - they come from themes and color palettes
    };
    
    // Übernehme questionSettings und answerSettings wenn vorhanden
    // Font-Sizes in Templates sind in "common" Format und müssen zu "actual" konvertiert werden
    if (textbox.questionSettings) {
      const convertedQuestionSettings = { ...textbox.questionSettings };
      // Konvertiere fontSize von common zu actual
      if (typeof convertedQuestionSettings.fontSize === 'number') {
        convertedQuestionSettings.fontSize = commonToActual(convertedQuestionSettings.fontSize);
      }
      // Konvertiere fontSize in font-Objekt
      if (convertedQuestionSettings.font && typeof convertedQuestionSettings.font === 'object') {
        const font = convertedQuestionSettings.font as Record<string, unknown>;
        if (typeof font.fontSize === 'number') {
          convertedQuestionSettings.font = {
            ...font,
            fontSize: commonToActual(font.fontSize)
          };
        }
      }
      element.questionSettings = convertedQuestionSettings as any;
    }
    if (textbox.answerSettings) {
      const convertedAnswerSettings = { ...textbox.answerSettings };
      // Konvertiere fontSize von common zu actual
      if (typeof convertedAnswerSettings.fontSize === 'number') {
        convertedAnswerSettings.fontSize = commonToActual(convertedAnswerSettings.fontSize);
      }
      // Konvertiere fontSize in font-Objekt
      if (convertedAnswerSettings.font && typeof convertedAnswerSettings.font === 'object') {
        const font = convertedAnswerSettings.font as Record<string, unknown>;
        if (typeof font.fontSize === 'number') {
          convertedAnswerSettings.font = {
            ...font,
            fontSize: commonToActual(font.fontSize)
          };
        }
      }
      element.answerSettings = convertedAnswerSettings as any;
    }
    
    // Apply only primary layout properties from style.format
    // All other styling properties (fontFamily, fontColor, border, background, cornerRadius) come from themes/palettes
    if (textbox.style && textbox.style.format) {
      if (textbox.style.format.textAlign) {
        // For qna, align is on top-level, not in format.textAlign
        if (isQna) {
          element.align = textbox.style.format.textAlign;
        } else {
          element.format = element.format || {};
          element.format.textAlign = textbox.style.format.textAlign;
        }
      }
      if (textbox.style.format.padding !== undefined) {
        element.padding = textbox.style.format.padding;
      }
      if (textbox.style.format.paragraphSpacing) {
        element.paragraphSpacing = textbox.style.format.paragraphSpacing;
      }
    }
    
    // Note: fontSize is handled separately in questionSettings/answerSettings for qna
    // or directly on element for free_text, not from style.font.fontSize
    
    if (textbox.type === 'question' || textbox.type === 'qna' || textbox.type === 'qna_inline' || textbox.type === 'qna2') {
      element.questionId = uuidv4();
    }
    
    if (textbox.layoutVariant) {
      element.layoutVariant = textbox.layoutVariant as any;
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
    
    // Übernehme style-Eigenschaften für Shapes
    if (elem.style) {
      element.strokeWidth = elem.style.strokeWidth;
      element.stroke = elem.style.stroke;
      element.fill = elem.style.fill;
      element.opacity = elem.style.opacity;
      if (elem.style.cornerRadius !== undefined) {
        element.cornerRadius = elem.style.cornerRadius;
      }
    }
    
    if (elem.shapeType) {
      element.type = elem.shapeType as any;
    }
    
    elements.push(element);
  });
  
  return elements;
}

// DEPRECATED: Layout templates no longer have colorPalette or background properties
// Colors and backgrounds are managed by themes.json and color-palettes.json
export function mergeTemplateWithPalette(template: PageTemplate, palette: ColorPalette): PageTemplate {
  // Simply return the template as-is, since layout templates don't contain color/background info
  return template;
}

export function validateTemplateConstraints(
  template: PageTemplate,
  pageSize?: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Verwende getConstraintsForPageSize für dynamische Constraints
  const constraints = getConstraintsForPageSize(template, pageSize || 'A4');
  
  const questionCount = template.textboxes.filter(t => 
    t.type === 'question' || t.type === 'qna' || t.type === 'qna_inline' || t.type === 'qna2'
  ).length;
  
  if (questionCount < constraints.minQuestions) {
    errors.push(`Question count (${questionCount}) is below minimum (${constraints.minQuestions})`);
  }
  if (questionCount > constraints.maxQuestions) {
    errors.push(`Question count (${questionCount}) exceeds maximum (${constraints.maxQuestions})`);
  }
  
  const imageCount = template.elements.filter(e => e.type === 'image').length;
  if (imageCount > constraints.imageSlots) {
    errors.push(`Too many images (${imageCount}), maximum is ${constraints.imageSlots}`);
  }
  
  const stickerCount = template.elements.filter(e => e.type === 'sticker').length;
  if (stickerCount > constraints.stickerSlots) {
    errors.push(`Too many stickers (${stickerCount}), maximum is ${constraints.stickerSlots}`);
  }
  
  // Validiere Margins (falls vorhanden)
  if (template.margins) {
    const margins = template.margins;
    const unit = margins.unit || 'px';
    
    // Validiere, dass Margins nicht zu groß sind (max 50% der Dimension)
    const maxMarginPercent = 50;
    if (unit === 'percent') {
      if (margins.top > maxMarginPercent || margins.right > maxMarginPercent ||
          margins.bottom > maxMarginPercent || margins.left > maxMarginPercent) {
        errors.push(`Margins are too large (max ${maxMarginPercent}%)`);
      }
    } else {
      // Für mm/px: Validiere gegen Basis-Größe
      const baseSize = template.baseSize || { width: 2480, height: 3508 };
      const topPx = convertMarginToPixels(margins.top, unit, baseSize.height);
      const rightPx = convertMarginToPixels(margins.right, unit, baseSize.width);
      const bottomPx = convertMarginToPixels(margins.bottom, unit, baseSize.height);
      const leftPx = convertMarginToPixels(margins.left, unit, baseSize.width);
      
      if (topPx + bottomPx >= baseSize.height || leftPx + rightPx >= baseSize.width) {
        errors.push(`Margins are too large, leaving no space for content`);
      }
    }
  }
  
  // Validiere Font-Sizes (falls fontScaling vorhanden)
  if (template.fontScaling) {
    const baseFontSize = template.fontScaling.baseFontSize || 12;
    const minFontSize = 8;
    const maxFontSize = 200;
    
    if (baseFontSize < minFontSize || baseFontSize > maxFontSize) {
      errors.push(`Base font size (${baseFontSize}) is out of valid range (${minFontSize}-${maxFontSize})`);
    }
  }
  
  // Validiere, dass Elemente innerhalb der verfügbaren Fläche bleiben
  const baseSize = template.baseSize || { width: 2480, height: 3508 };
  const { contentArea } = applyMargins(template, baseSize);
  
  [...template.textboxes, ...template.elements].forEach((elem, index) => {
    const elemRight = elem.position.x + elem.size.width;
    const elemBottom = elem.position.y + elem.size.height;
    
    if (elem.position.x < contentArea.x || elem.position.y < contentArea.y ||
        elemRight > contentArea.x + contentArea.width || 
        elemBottom > contentArea.y + contentArea.height) {
      errors.push(`Element at index ${index} extends beyond content area (considering margins)`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function generateTemplatePreview(template: PageTemplate): string {
  // Generate SVG preview data
  // Note: Layout templates no longer have colorPalette, so we use default colors for preview
  const width = 200;
  const height = 280;
  const scaleX = width / 2480;
  const scaleY = height / 3508;
  
  // Default colors for preview (since layout templates don't contain color info)
  const defaultColors = {
    background: '#ffffff',
    primary: '#1976D2',
    secondary: '#42A5F5',
    accent: '#81C784'
  };
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  
  // Background
  svg += `<rect width="${width}" height="${height}" fill="${defaultColors.background}"/>`;
  
  // Textboxes
  template.textboxes.forEach(textbox => {
    const x = textbox.position.x * scaleX;
    const y = textbox.position.y * scaleY;
    const w = textbox.size.width * scaleX;
    const h = textbox.size.height * scaleY;
    
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" 
            fill="${defaultColors.primary}" opacity="0.3" rx="2"/>`;
  });
  
  // Elements
  template.elements.forEach(elem => {
    const x = elem.position.x * scaleX;
    const y = elem.position.y * scaleY;
    const w = elem.size.width * scaleX;
    const h = elem.size.height * scaleY;
    
    const color = elem.type === 'image' ? defaultColors.secondary : defaultColors.accent;
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" 
            fill="${color}" opacity="0.5" rx="1"/>`;
  });
  
  svg += '</svg>';
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function getTemplatesByCategory(category: TemplateCategory): PageTemplate[] {
  return pageTemplates.filter(template => template.category === category);
}

/**
 * Berechnet Pixel-Dimensionen für gegebene Seitengröße und Orientierung
 */
export function calculatePageDimensions(
  pageSize: string, 
  orientation: string
): { width: number; height: number } {
  const dimensions = PAGE_DIMENSIONS[pageSize as keyof typeof PAGE_DIMENSIONS] || PAGE_DIMENSIONS.A4;
  const width = orientation === 'landscape' ? dimensions.height : dimensions.width;
  const height = orientation === 'landscape' ? dimensions.width : dimensions.height;
  return { width, height };
}

/**
 * Skaliert Font-Size proportional zur Seitengröße (flächen-basiert)
 */
export function scaleFontSize(
  fontSize: number,
  baseSize: { width: number; height: number },
  targetSize: { width: number; height: number }
): number {
  const baseArea = baseSize.width * baseSize.height;
  const targetArea = targetSize.width * targetSize.height;
  const scaleFactor = Math.sqrt(targetArea / baseArea);
  return Math.round(fontSize * scaleFactor);
}

/**
 * Konvertiert Margins von verschiedenen Einheiten zu Pixel
 */
export function convertMarginToPixels(
  margin: number,
  unit: 'percent' | 'mm' | 'px',
  pageDimension: number
): number {
  switch (unit) {
    case 'percent':
      return (pageDimension * margin) / 100;
    case 'mm':
      return margin * MM_TO_PX;
    case 'px':
    default:
      return margin;
  }
}

/**
 * Wendet Margins auf ein Template an und gibt die verfügbare Content-Fläche zurück
 */
export function applyMargins(
  template: PageTemplate,
  targetSize: { width: number; height: number }
): { 
  contentArea: { x: number; y: number; width: number; height: number };
  margins: { top: number; right: number; bottom: number; left: number };
} {
  // Wenn keine Margins definiert sind, verwende Standard-Margins (5mm)
  const defaultMargin = 5 * MM_TO_PX;
  
  if (!template.margins) {
    return {
      contentArea: {
        x: defaultMargin,
        y: defaultMargin,
        width: targetSize.width - (defaultMargin * 2),
        height: targetSize.height - (defaultMargin * 2)
      },
      margins: {
        top: defaultMargin,
        right: defaultMargin,
        bottom: defaultMargin,
        left: defaultMargin
      }
    };
  }

  const margins = template.margins;
  const unit = margins.unit || 'px';
  
  const top = convertMarginToPixels(margins.top, unit, targetSize.height);
  const right = convertMarginToPixels(margins.right, unit, targetSize.width);
  const bottom = convertMarginToPixels(margins.bottom, unit, targetSize.height);
  const left = convertMarginToPixels(margins.left, unit, targetSize.width);

  return {
    contentArea: {
      x: left,
      y: top,
      width: targetSize.width - left - right,
      height: targetSize.height - top - bottom
    },
    margins: { top, right, bottom, left }
  };
}

/**
 * Berechnet Constraints für eine spezifische Seitengröße
 */
export function getConstraintsForPageSize(
  template: PageTemplate,
  pageSize: string
): {
  minQuestions: number;
  maxQuestions: number;
  imageSlots: number;
  stickerSlots: number;
} {
  // Wenn dynamicConstraints vorhanden sind, verwende diese
  if (template.dynamicConstraints) {
    const dc = template.dynamicConstraints;
    return {
      minQuestions: typeof dc.minQuestions === 'function' 
        ? dc.minQuestions(pageSize) 
        : (dc.minQuestions ?? template.constraints.minQuestions),
      maxQuestions: typeof dc.maxQuestions === 'function' 
        ? dc.maxQuestions(pageSize) 
        : (dc.maxQuestions ?? template.constraints.maxQuestions),
      imageSlots: typeof dc.imageSlots === 'function' 
        ? dc.imageSlots(pageSize) 
        : (dc.imageSlots ?? template.constraints.imageSlots),
      stickerSlots: typeof dc.stickerSlots === 'function' 
        ? dc.stickerSlots(pageSize) 
        : (dc.stickerSlots ?? template.constraints.stickerSlots)
    };
  }

  // Fallback: Verwende Standard-Constraints
  return template.constraints;
}

/**
 * Skaliert ein Template auf die Ziel-Canvas-Größe
 * Unterstützt sowohl Legacy-Templates (absolute Werte) als auch neue Templates (relative Werte)
 */
export function scaleTemplateToCanvas(
  template: PageTemplate, 
  targetSize: { width: number; height: number },
  pageSize?: string,
  orientation?: string
): PageTemplate {
  // Bestimme Basis-Größe für Skalierung
  const baseSize = template.baseSize || { width: 2480, height: 3508 };
  
  // Berechne Skalierungsfaktoren
  const scaleX = targetSize.width / baseSize.width;
  const scaleY = targetSize.height / baseSize.height;
  
  // Wende Margins an (falls vorhanden)
  const { contentArea, margins } = applyMargins(template, targetSize);
  
  // Berechne Offset für Margins (nur wenn Margins explizit definiert sind)
  // Für Legacy-Templates ohne Margins: Positionen sind bereits relativ zur Seite
  const hasExplicitMargins = template.margins !== undefined;
  const marginOffsetX = hasExplicitMargins ? margins.left : 0;
  const marginOffsetY = hasExplicitMargins ? margins.top : 0;
  
  // Skaliere Font-Sizes (flächen-basiert)
  const fontScaleFactor = Math.sqrt((targetSize.width * targetSize.height) / (baseSize.width * baseSize.height));
  
  // Skaliere Textboxes
  const scaledTextboxes = template.textboxes.map(textbox => {
    // Skaliere Position und Größe
    const scaledX = textbox.position.x * scaleX + marginOffsetX;
    const scaledY = textbox.position.y * scaleY + marginOffsetY;
    const scaledWidth = textbox.size.width * scaleX;
    const scaledHeight = textbox.size.height * scaleY;
    
    // Skaliere Font-Sizes in questionSettings und answerSettings
    const scaledQuestionSettings = textbox.questionSettings ? 
      scaleFontSizesInSettings(textbox.questionSettings, fontScaleFactor) : 
      textbox.questionSettings;
    
    const scaledAnswerSettings = textbox.answerSettings ? 
      scaleFontSizesInSettings(textbox.answerSettings, fontScaleFactor) : 
      textbox.answerSettings;
    
    // Skaliere Font-Size in style.font
    // Font-Sizes in Templates sind in "common" Format, müssen konvertiert werden
    const scaledStyle = textbox.style ? {
      ...textbox.style,
      font: textbox.style.font ? {
        ...textbox.style.font,
        fontSize: textbox.style.font.fontSize ? 
          (() => {
            // Konvertiere common -> actual, skaliere, dann zurück zu common
            const actualSize = commonToActual(textbox.style.font.fontSize);
            const scaledActualSize = actualSize * fontScaleFactor;
            return actualToCommon(scaledActualSize);
          })() : 
          textbox.style.font.fontSize
      } : textbox.style.font
    } : textbox.style;
    
    return {
      ...textbox,
      position: {
        x: scaledX,
        y: scaledY
      },
      size: {
        width: scaledWidth,
        height: scaledHeight
      },
      questionSettings: scaledQuestionSettings,
      answerSettings: scaledAnswerSettings,
      style: scaledStyle
    };
  });
  
  // Skaliere Elements
  // WICHTIG: Bilder werden NICHT skaliert (nur Position), andere Elemente schon
  const scaledElements = template.elements.map(elem => {
    if (elem.type === 'image') {
      // Bilder: Nur Position skalieren, Größe beibehalten
      return {
        ...elem,
        position: {
          x: elem.position.x * scaleX + marginOffsetX,
          y: elem.position.y * scaleY + marginOffsetY
        },
        size: {
          width: elem.size.width,  // Keine Skalierung
          height: elem.size.height  // Keine Skalierung
        }
      };
    } else {
      // Andere Elemente (Shapes, Stickers): Beides skalieren
      return {
        ...elem,
        position: {
          x: elem.position.x * scaleX + marginOffsetX,
          y: elem.position.y * scaleY + marginOffsetY
        },
        size: {
          width: elem.size.width * scaleX,
          height: elem.size.height * scaleY
        }
      };
    }
  });
  
  return {
    ...template,
    textboxes: scaledTextboxes,
    elements: scaledElements
  };
}

/**
 * Hilfsfunktion: Skaliert Font-Sizes in Settings-Objekten
 * Font-Sizes in Templates sind in "common" Format gespeichert
 * Konvertierung: common -> actual -> skalieren -> common
 */
function scaleFontSizesInSettings(settings: Record<string, unknown>, scaleFactor: number): Record<string, unknown> {
  const scaled = { ...settings };
  
  // Skaliere direkte fontSize Property
  // Annahme: fontSize im Template ist in "common" Format
  if (typeof scaled.fontSize === 'number') {
    // Konvertiere common -> actual, skaliere, dann zurück zu common
    const actualSize = commonToActual(scaled.fontSize);
    const scaledActualSize = actualSize * scaleFactor;
    scaled.fontSize = actualToCommon(scaledActualSize);
  }
  
  // Skaliere fontSize in font-Objekt
  if (scaled.font && typeof scaled.font === 'object' && scaled.font !== null) {
    const font = scaled.font as Record<string, unknown>;
    if (typeof font.fontSize === 'number') {
      // Konvertiere common -> actual, skaliere, dann zurück zu common
      const actualSize = commonToActual(font.fontSize);
      const scaledActualSize = actualSize * scaleFactor;
      scaled.font = {
        ...font,
        fontSize: actualToCommon(scaledActualSize)
      };
    }
  }
  
  return scaled;
}