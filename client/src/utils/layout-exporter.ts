import type { CanvasElement } from '../context/editor-context';
import type { LayoutMeta, PageTemplate } from '../types/template-types';
import { displayJSONInNewWindow } from './json-display';
import { actualToCommon } from './font-size-converter';
import { actualToCommonRadius } from './corner-radius-converter';
import { actualToThemeJsonStrokeWidth } from './stroke-width-converter';

// Konvertierung mm zu Pixel (bei 300 DPI: 1mm = 11.81px)
const MM_TO_PX = 11.811;

/**
 * Berechnet Margins aus minimalen Abständen der Elemente zu den Rändern
 */
function calculateMarginsFromElements(
  elements: CanvasElement[],
  canvasWidth: number,
  canvasHeight: number
): { top: number; right: number; bottom: number; left: number; unit: 'mm' } | undefined {
  if (elements.length === 0) {
    return undefined;
  }

  // Finde minimale Abstände zu den Rändern
  let minLeft = Infinity;
  let minTop = Infinity;
  let minRight = Infinity;
  let minBottom = Infinity;

  elements.forEach(element => {
    minLeft = Math.min(minLeft, element.x || 0);
    minTop = Math.min(minTop, element.y || 0);
    minRight = Math.min(minRight, canvasWidth - ((element.x || 0) + (element.width || 0)));
    minBottom = Math.min(minBottom, canvasHeight - ((element.y || 0) + (element.height || 0)));
  });

  // Konvertiere zu mm (runden auf ganze mm)
  return {
    top: Math.round(minTop / MM_TO_PX),
    right: Math.round(minRight / MM_TO_PX),
    bottom: Math.round(minBottom / MM_TO_PX),
    left: Math.round(minLeft / MM_TO_PX),
    unit: 'mm'
  };
}

/**
 * Berechnet durchschnittliche Font-Size für baseFontSize
 */
function calculateBaseFontSize(elements: CanvasElement[]): number | undefined {
  const fontSizes: number[] = [];

  elements.forEach(element => {
    if (element.fontSize) {
      fontSizes.push(element.fontSize);
    }
    if (element.questionSettings?.fontSize) {
      fontSizes.push(element.questionSettings.fontSize as number);
    }
    if (element.answerSettings?.fontSize) {
      fontSizes.push(element.answerSettings.fontSize as number);
    }
    if (element.questionSettings?.font?.fontSize) {
      fontSizes.push(element.questionSettings.font.fontSize as number);
    }
    if (element.answerSettings?.font?.fontSize) {
      fontSizes.push(element.answerSettings.font.fontSize as number);
    }
  });

  if (fontSizes.length === 0) {
    return undefined;
  }

  // Berechne Durchschnitt
  const avgFontSize = fontSizes.reduce((sum, size) => sum + size, 0) / fontSizes.length;
  return Math.round(avgFontSize);
}

/**
 * Extracts layout information (position and size) from qna textboxes and images
 * and converts them to PageTemplate format for layout.json
 */
export function extractLayoutTemplate(
  elements: CanvasElement[],
  pageBackground: any,
  pageTheme?: string,
  colorPaletteId?: string,
  canvasSize?: { width: number; height: number }
): Partial<PageTemplate> {
  const textboxes: any[] = [];
  const layoutElements: any[] = [];

  // Filter and process qna elements
  const qnaElements = elements.filter(
    el => el.textType === 'qna' || el.textType === 'qna2' || el.type === 'qna'
  );

  // Filter and process image elements
  const imageElements = elements.filter(el => el.type === 'image');

  // Process qna textboxes
  qnaElements.forEach(element => {
    const textbox: any = {
      type: 'qna',
      position: {
        x: element.x || 0,
        y: element.y || 0
      },
      size: {
        width: element.width || 0,
        height: element.height || 0
      }
    };

    // Add style information - only primary layout properties
    const style: any = {};

    // Format settings (primary layout properties)
    style.format = {
      textAlign: element.format?.textAlign || element.align || element.questionSettings?.align || element.answerSettings?.align || 'left',
      paragraphSpacing: element.paragraphSpacing || element.questionSettings?.paragraphSpacing || element.answerSettings?.paragraphSpacing || 'medium',
      padding: element.padding || element.format?.padding || 8
    };

    // Only add style if format has content
    if (Object.keys(style.format).length > 0) {
      textbox.style = style;
    }

    // Question and answer settings - only fontSize (layout property)
    // All other properties (fontFamily, fontColor, etc.) come from themes, not layouts
    if (element.questionSettings) {
      const questionFontSize = element.questionSettings.fontSize || element.questionSettings.font?.fontSize;
      if (questionFontSize) {
        textbox.questionSettings = {
          fontSize: actualToCommon(questionFontSize)
        };
      }
    }

    if (element.answerSettings) {
      const answerFontSize = element.answerSettings.fontSize || element.answerSettings.font?.fontSize;
      if (answerFontSize) {
        textbox.answerSettings = {
          fontSize: actualToCommon(answerFontSize)
        };
      }
    }

    // Layout variant (layout property)
    if (element.layoutVariant) {
      textbox.layoutVariant = element.layoutVariant;
    }

    // questionPosition and questionWidth (layout properties)
    if (element.questionPosition) {
      textbox.questionPosition = element.questionPosition;
    }
    if (element.questionWidth !== undefined) {
      textbox.questionWidth = element.questionWidth;
    }

    textboxes.push(textbox);
  });

  // Process image elements
  imageElements.forEach(element => {
    const layoutElement: any = {
      type: 'image',
      position: {
        x: element.x || 0,
        y: element.y || 0
      },
      size: {
        width: element.width || 0,
        height: element.height || 0
      }
    };

    // Add style if available (for images, mainly corner radius and opacity)
    const style: any = {};
    
    if (element.cornerRadius !== undefined) {
      style.cornerRadius = actualToCommonRadius(element.cornerRadius);
    }

    if (element.opacity !== undefined) {
      style.opacity = element.opacity;
    }

    if (Object.keys(style).length > 0) {
      layoutElement.style = style;
    }

    layoutElements.push(layoutElement);
  });

  // Build the template structure
  const template: Partial<PageTemplate> = {
    textboxes: textboxes,
    elements: layoutElements,
    constraints: {
      minQuestions: Math.max(0, qnaElements.length - 2),
      maxQuestions: qnaElements.length + 5,
      imageSlots: imageElements.length,
      stickerSlots: 0
    }
  };

  // Füge baseSize hinzu (falls canvasSize vorhanden)
  if (canvasSize) {
    template.baseSize = {
      width: canvasSize.width,
      height: canvasSize.height
    };

    // Berechne Margins aus Element-Positionen
    const margins = calculateMarginsFromElements(elements, canvasSize.width, canvasSize.height);
    if (margins) {
      template.margins = margins;
    }

    // Berechne baseFontSize für fontScaling
    const baseFontSize = calculateBaseFontSize(elements);
    if (baseFontSize) {
      template.fontScaling = {
        baseFontSize: actualToCommon(baseFontSize)
      };
    }
  }

  return template;
}

/**
 * Generates a complete PageTemplate JSON entry from current page elements
 */
export function generateLayoutJSON(
  templateId: string,
  templateName: string,
  templateCategory: 'structured' | 'freeform' | 'mixed' = 'freeform',
  elements: CanvasElement[],
  pageBackground: any,
  pageTheme?: string,
  colorPaletteId?: string,
  thumbnail?: string,
  canvasSize?: { width: number; height: number }
): string {
  const layoutTemplate = extractLayoutTemplate(elements, pageBackground, pageTheme, colorPaletteId, canvasSize);

  // Extract columns from templateId (e.g., "qna-1col-..." or "qna-2col-...")
  const extractColumns = (id: string): number => {
    const match = id.match(/qna-(\d)col/);
    return match ? parseInt(match[1], 10) : 1; // Default to 1 if not found
  };

  // Build complete template (without theme, colorPalette, or background - these are not layout properties)
  const qnaInlineCount = layoutTemplate.textboxes?.length ?? 0;
  const imageCount =
    layoutTemplate.elements?.filter((element) => element.type === 'image')
      .length ?? 0;
  const columns = extractColumns(templateId);

  const meta: LayoutMeta = {
    qnaInlineCount,
    imageCount,
    columns
  };

  const template: PageTemplate = {
    id: templateId,
    name: templateName,
    category: templateCategory,
    thumbnail: thumbnail || '/templates/default.png',
    columns,
    meta,
    textboxes: layoutTemplate.textboxes || [],
    elements: layoutTemplate.elements || [],
    constraints: layoutTemplate.constraints || {
      minQuestions: 0,
      maxQuestions: 10,
      imageSlots: 0,
      stickerSlots: 0
    }
  };

  // Return as JSON array entry (since layout.json is an array)
  return JSON.stringify([template], null, 2);
}

/**
 * Main export function that extracts layout and displays JSON in new window
 */
export function exportLayout(
  templateId: string,
  templateName: string,
  templateCategory: 'structured' | 'freeform' | 'mixed' = 'freeform',
  elements: CanvasElement[],
  pageBackground: any,
  pageTheme?: string,
  colorPaletteId?: string,
  thumbnail?: string,
  canvasSize?: { width: number; height: number }
): void {
  const layoutJSON = generateLayoutJSON(
    templateId,
    templateName,
    templateCategory,
    elements,
    pageBackground,
    pageTheme,
    colorPaletteId,
    thumbnail,
    canvasSize
  );

  displayJSONInNewWindow('Layout Export', layoutJSON);
}

