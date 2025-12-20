import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement } from '../context/editor-context';
import type { PageTemplate } from '../types/template-types';
import { convertTemplateToElements } from './template-to-elements';
import { getToolDefaults } from './tool-defaults';
import { scaleTemplateToCanvas } from './template-utils';

interface ContentMapping {
  existingElement: CanvasElement;
  templateSlot: CanvasElement;
  confidence: number;
}

export function applyLayoutTemplateWithPreservation(
  existingElements: CanvasElement[],
  template: PageTemplate,
  canvasSize?: { width: number; height: number },
  pageSize?: string,
  orientation?: string
): CanvasElement[] {
  // Convert template to elements (skaliert automatisch, wenn canvasSize vorhanden ist)
  // Übergib pageSize und orientation NICHT als canvasSize, da convertTemplateToElements
  // nur canvasSize benötigt und die Skalierung intern durchführt
  const templateElements = convertTemplateToElements(template, canvasSize);
  
  // Separate textbox and non-textbox elements
  const existingTextboxes = existingElements.filter(el => 
    el.type === 'text' || el.textType
  );
  const existingNonTextboxes = existingElements.filter(el => 
    el.type !== 'text' && !el.textType
  );
  
  const templateTextboxes = templateElements.filter(el => 
    el.type === 'text' || el.textType
  );
  const templateNonTextboxes = templateElements.filter(el => 
    el.type !== 'text' && !el.textType
  );
  
  // Smart mapping for textboxes
  const mappings = createSmartMappings(existingTextboxes, templateTextboxes);
  const resultElements: CanvasElement[] = [];
  
  // Apply mappings
  mappings.forEach(mapping => {
    const preservedElement = {
      ...mapping.templateSlot,
      id: mapping.existingElement.id, // Preserve ID
      text: mapping.existingElement.text,
      formattedText: mapping.existingElement.formattedText,
      questionId: mapping.existingElement.questionId,
      answerId: mapping.existingElement.answerId,
      questionElementId: mapping.existingElement.questionElementId,
      textType: mapping.existingElement.textType || mapping.templateSlot.textType,
      // Preserve other content-related properties
      questionSettings: mapping.existingElement.questionSettings,
      answerSettings: mapping.existingElement.answerSettings,
      qnaIndividualSettings: mapping.existingElement.qnaIndividualSettings
    };
    resultElements.push(preservedElement);
  });
  
  // Handle unmapped existing textboxes (more content than template slots)
  // Only keep surplus elements that have content (not placeholders)
  const mappedExistingIds = new Set(mappings.map(m => m.existingElement.id));
  const unmappedExisting = existingTextboxes.filter(el => !mappedExistingIds.has(el.id));
  
  if (unmappedExisting.length > 0) {
    // Filter to only keep elements with content
    const elementsWithContent = unmappedExisting.filter(element => {
      // For qna textboxes: has content if questionId is set OR text/formattedText has content
      if (element.textType === 'qna') {
        const hasQuestionId = !!element.questionId;
        const hasText = !!(element.text && element.text.trim() && element.text !== 'Double-click to add text...');
        const hasFormattedText = !!(element.formattedText && element.formattedText.trim() && !element.formattedText.includes('Double-click to add text'));
        return hasQuestionId || hasText || hasFormattedText;
      }
      // For other text types: has content if text/formattedText is not empty
      if (element.type === 'text') {
        const hasText = !!(element.text && element.text.trim());
        const hasFormattedText = !!(element.formattedText && element.formattedText.trim());
        return hasText || hasFormattedText;
      }
      // Default: keep if unsure (safety measure)
      return true;
    });
    
    // Keep surplus textboxes with content at their original positions
    elementsWithContent.forEach((element) => {
      resultElements.push({
        ...element
        // x, y, width, height remain unchanged
      });
    });
  }
  
  // Handle unmapped template slots (create new empty elements)
  const mappedTemplateIds = new Set(mappings.map(m => m.templateSlot.id));
  const unmappedTemplateSlots = templateTextboxes.filter(el => !mappedTemplateIds.has(el.id));
  
  unmappedTemplateSlots.forEach(slot => {
    resultElements.push({
      ...slot,
      id: uuidv4(), // New ID for new elements
      text: '',
      formattedText: ''
    });
  });
  
  // Add non-textbox elements from template (images, shapes, etc.)
  templateNonTextboxes.forEach(element => {
    resultElements.push({
      ...element,
      id: uuidv4()
    });
  });
  
  // Preserve existing non-textbox elements
  // For images/placeholders: only keep if they have content (not placeholders)
  // For images with content: always keep them (even if they conflict with template) to preserve user content
  existingNonTextboxes.forEach(element => {
    // For image/placeholder elements: only keep if they have content
    if (element.type === 'image' || element.type === 'placeholder') {
      // Has content if type is 'image' (uploaded) OR src exists
      const hasContent = element.type === 'image' || !!element.src;
      if (hasContent) {
        // Always keep images with content, even if they conflict with template positions
        // This ensures user content is never lost
        resultElements.push(element);
      }
      // If it's a placeholder without content, don't add it (will be removed)
    } else {
      // For other non-textbox elements (shapes, etc.): check for conflicts
      // Only keep if they don't conflict with template positions
      const hasConflict = templateNonTextboxes.some(templateEl => 
        isElementOverlapping(element, templateEl)
      );
      
      if (!hasConflict) {
        resultElements.push(element);
      }
    }
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
  
  // Priority: qna elements should be mapped first to ensure they get layout positions
  const qnaElements = existingElements.filter(el => el.textType === 'qna');
  const otherTextElements = existingElements.filter(el => el.textType !== 'qna');
  
  // First pass: exact type matches, prioritizing qna
  [...qnaElements, ...otherTextElements].forEach(existing => {
    if (usedExisting.has(existing.id)) return;
    
    const matchingSlot = templateSlots.find(slot => 
      !usedTemplate.has(slot.id) && 
      existing.textType === slot.textType
    );
    
    if (matchingSlot) {
      mappings.push({
        existingElement: existing,
        templateSlot: matchingSlot,
        confidence: 1.0
      });
      usedExisting.add(existing.id);
      usedTemplate.add(matchingSlot.id);
    }
  });
  
  // Second pass: compatible type matches, prioritizing qna to qna slots
  qnaElements.forEach(existing => {
    if (usedExisting.has(existing.id)) return;
    
    // Try to find qna slots first
    const qnaSlot = templateSlots.find(slot => 
      !usedTemplate.has(slot.id) && 
      (slot.textType === 'qna')
    );
    
    if (qnaSlot) {
      mappings.push({
        existingElement: existing,
        templateSlot: qnaSlot,
        confidence: 0.9
      });
      usedExisting.add(existing.id);
      usedTemplate.add(qnaSlot.id);
      return;
    }
    
    // Fallback to other compatible slots
    const compatibleSlot = templateSlots.find(slot => 
      !usedTemplate.has(slot.id) && 
      isTypeCompatible(existing.textType, slot.textType)
    );
    
    if (compatibleSlot) {
      mappings.push({
        existingElement: existing,
        templateSlot: compatibleSlot,
        confidence: 0.7
      });
      usedExisting.add(existing.id);
      usedTemplate.add(compatibleSlot.id);
    }
  });
  
  // Third pass: compatible type matches for other text elements
  otherTextElements.forEach(existing => {
    if (usedExisting.has(existing.id)) return;
    
    const compatibleSlot = templateSlots.find(slot => 
      !usedTemplate.has(slot.id) && 
      isTypeCompatible(existing.textType, slot.textType)
    );
    
    if (compatibleSlot) {
      mappings.push({
        existingElement: existing,
        templateSlot: compatibleSlot,
        confidence: 0.7
      });
      usedExisting.add(existing.id);
      usedTemplate.add(compatibleSlot.id);
    }
  });
  
  // Fourth pass: any remaining matches
  existingElements.forEach(existing => {
    if (usedExisting.has(existing.id)) return;
    
    const availableSlot = templateSlots.find(slot => 
      !usedTemplate.has(slot.id)
    );
    
    if (availableSlot) {
      mappings.push({
        existingElement: existing,
        templateSlot: availableSlot,
        confidence: 0.5
      });
      usedExisting.add(existing.id);
      usedTemplate.add(availableSlot.id);
    }
  });
  
  return mappings;
}

function isTypeCompatible(
  existingType: string | undefined,
  templateType: string | undefined
): boolean {
  // Define compatibility rules
  const compatibilityMap: Record<string, string[]> = {
    'question': ['text', 'qna'],
    'answer': ['text', 'qna'],
    'text': ['question', 'answer', 'qna'],
    'qna': ['question', 'answer', 'text']
  };

  if (!existingType || !templateType) return true;

  return compatibilityMap[existingType]?.includes(templateType) || false;
}

function isElementOverlapping(el1: CanvasElement, el2: CanvasElement): boolean {
  const margin = 20; // Minimum spacing
  
  return !(
    el1.x + el1.width + margin < el2.x ||
    el2.x + el2.width + margin < el1.x ||
    el1.y + el1.height + margin < el2.y ||
    el2.y + el2.height + margin < el1.y
  );
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