import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement, Page, Book } from '../context/editor-context';
import type { PageTemplate } from '../types/template-types';
import { convertTemplateToElements } from './template-to-elements';
import { getActiveTemplateIds } from './template-inheritance';
import { applyThemeToElementConsistent } from './global-themes';

interface ContentMapping {
  existingElement: CanvasElement;
  templateSlot: CanvasElement;
  confidence: number;
}

export function applyLayoutTemplateWithPreservation(
  existingElements: CanvasElement[],
  template: PageTemplate,
  canvasSize?: { width: number; height: number },
  _pageSize?: string,
  _orientation?: string,
  page?: Page,
  book?: Book | null
): CanvasElement[] {
  // Convert template to elements (skaliert automatisch, wenn canvasSize vorhanden ist)
  // Übergib pageSize und orientation NICHT als canvasSize, da convertTemplateToElements
  // nur canvasSize benötigt und die Skalierung intern durchführt
  const templateElements = convertTemplateToElements(template, canvasSize);
  
  // Separate elements into categories for layout mapping
  // Only QNA textboxes (qna + qna2) and images/image-placeholders participate in layout mapping
  const isQnaOrQna2 = (el: CanvasElement) => el.textType === 'qna' || el.textType === 'qna2';
  const existingMappableElements = existingElements.filter(el =>
    isQnaOrQna2(el) || el.type === 'image' || el.type === 'placeholder'
  );

  // Template slots for QNA and images
  const templateMappableSlots = templateElements.filter(el =>
    isQnaOrQna2(el) || el.type === 'image' || el.type === 'placeholder'
  );

  // Elements that should remain in their current positions (unchanged)
  const existingUnmappableElements = existingElements.filter(el =>
    !(isQnaOrQna2(el) || el.type === 'image' || el.type === 'placeholder')
  );

  // Smart mapping for QNA textboxes and images/image-placeholders
  const mappings = createSmartMappings(existingMappableElements, templateMappableSlots);
  const resultElements: CanvasElement[] = [];
  
  // Apply mappings
  mappings.forEach(mapping => {
    // Only change position, size and rotation, preserve all other properties from existing element
    const preservedElement = {
      ...mapping.existingElement,  // Basis: Bestehendes Element (behält alle Styling-Eigenschaften)
      // Position, Größe UND Rotation vom Template übernehmen
      x: mapping.templateSlot.x,
      y: mapping.templateSlot.y,
      width: mapping.templateSlot.width,
      height: mapping.templateSlot.height,
      rotation: mapping.templateSlot.rotation || 0,
      // ID bleibt erhalten (bereits durch ...existingElement)
      id: mapping.existingElement.id
    };
    resultElements.push(preservedElement);
  });
  
  // Handle unmapped existing mappable elements (more content than template slots)
  // Keep surplus QNA textboxes and images at their original positions
  const mappedExistingIds = new Set(mappings.map(m => m.existingElement.id));
  const unmappedMappableElements = existingMappableElements.filter(el => !mappedExistingIds.has(el.id));

  // Keep unmapped mappable elements at their original positions
  unmappedMappableElements.forEach(element => {
    resultElements.push({
      ...element
      // x, y, width, height remain unchanged
    });
  });

  // Keep all unmappable elements (like regular textboxes) at their original positions
  existingUnmappableElements.forEach(element => {
    resultElements.push({
      ...element
      // x, y, width, height remain unchanged
    });
  });

  // Handle unmapped template slots (create new empty elements)
  const mappedTemplateIds = new Set(mappings.map(m => m.templateSlot.id));
  const unmappedTemplateSlots = templateMappableSlots.filter(el => !mappedTemplateIds.has(el.id));

  unmappedTemplateSlots.forEach(slot => {
    // Get current theme and palette IDs for new elements (page → book fallback)
    const activeTemplateIds = getActiveTemplateIds(page, book || null);
    const themeId = activeTemplateIds.themeId;
    const paletteId = activeTemplateIds.colorPaletteId ?? undefined;

    // Apply theme and palette via centralized function (themes.json + color-palettes.json)
    const themedSlot = applyThemeToElementConsistent(slot, themeId, paletteId);

    // Create new element with fresh ID and cleared content
    const newElement = {
      ...themedSlot,
      id: uuidv4(),
      text: '',
      formattedText: '',
      richTextSegments: undefined,
      rotation: slot.rotation || 0
    };

    resultElements.push(newElement);
  });

  return resultElements;
}

function createSmartMappings(
  existingElements: CanvasElement[],
  templateSlots: CanvasElement[]
): ContentMapping[] {
  const mappings: ContentMapping[] = [];
  const usedExisting = new Set<string>();
  const usedTemplate = new Set<string>();

  // Helper function to sort elements by y-position (top to bottom)
  const sortByYPosition = (elements: CanvasElement[]): CanvasElement[] => {
    return [...elements].sort((a, b) => {
      // Primary: y-position (top to bottom)
      if (a.y !== b.y) return a.y - b.y;
      // Secondary: x-position (left to right) for same y
      return a.x - b.x;
    });
  };

  // 1. Map QNA textboxes (qna + qna2) to QNA slots (sorted by y-position)
  const qnaElements = existingElements.filter(el => el.textType === 'qna' || el.textType === 'qna2');
  const qnaSlots = templateSlots.filter(slot => slot.textType === 'qna' || slot.textType === 'qna2');

  const sortedQnaElements = sortByYPosition(qnaElements);
  const sortedQnaSlots = sortByYPosition(qnaSlots);

  // Map QNA elements to QNA slots in order
  sortedQnaElements.forEach((existing, index) => {
    if (index < sortedQnaSlots.length) {
      const slot = sortedQnaSlots[index];
      mappings.push({
        existingElement: existing,
        templateSlot: slot,
        confidence: 1.0
      });
      usedExisting.add(existing.id);
      usedTemplate.add(slot.id);
    }
  });

  // 2. Map images/image-placeholders to image slots (sorted by y-position)
  const imageElements = existingElements.filter(el =>
    el.type === 'image' || el.type === 'placeholder'
  );
  const imageSlots = templateSlots.filter(slot =>
    slot.type === 'image' || slot.type === 'placeholder'
  );

  const sortedImageElements = sortByYPosition(imageElements);
  const sortedImageSlots = sortByYPosition(imageSlots);

  // Map image elements to image slots in order
  sortedImageElements.forEach((existing, index) => {
    if (index < sortedImageSlots.length) {
      const slot = sortedImageSlots[index];
      mappings.push({
        existingElement: existing,
        templateSlot: slot,
        confidence: 1.0
      });
      usedExisting.add(existing.id);
      usedTemplate.add(slot.id);
    }
  });

  return mappings;
}


export function validateTemplateCompatibility(
  template: PageTemplate,
  existingElements: CanvasElement[]
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Check if template has enough slots for existing content
  const existingTextboxes = existingElements.filter(el => el.type === 'text' || el.textType);
  const templateTextboxes = convertTemplateToElements(template).filter(el => el.type === 'text' || el.textType);
  
  if (existingTextboxes.length > templateTextboxes.length) {
    warnings.push(`Template has ${templateTextboxes.length} text slots but page has ${existingTextboxes.length} text elements. Extra elements will be repositioned.`);
  }
  
  // Check for content that might be lost
  const existingImages = existingElements.filter(el => el.type === 'image' || el.type === 'placeholder');
  const templateImages = convertTemplateToElements(template).filter(el => el.type === 'image' || el.type === 'placeholder');
  
  if (existingImages.length > templateImages.length) {
    warnings.push(`Some images may be repositioned or removed to fit the new layout.`);
  }
  
  return {
    valid: true, // Always allow but warn
    warnings
  };
}