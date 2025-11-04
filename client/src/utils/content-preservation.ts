import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement } from '../context/editor-context';
import type { PageTemplate } from '../types/template-types';
import { convertTemplateToElements } from './template-to-elements';
import { getToolDefaults } from './tool-defaults';

interface ContentMapping {
  existingElement: CanvasElement;
  templateSlot: CanvasElement;
  confidence: number;
}

export function applyLayoutTemplateWithPreservation(
  existingElements: CanvasElement[],
  template: PageTemplate
): CanvasElement[] {
  // Convert template to elements
  const templateElements = convertTemplateToElements(template);
  
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
  // Keep them at their original positions as requested by user
  const mappedExistingIds = new Set(mappings.map(m => m.existingElement.id));
  const unmappedExisting = existingTextboxes.filter(el => !mappedExistingIds.has(el.id));
  
  if (unmappedExisting.length > 0) {
    // Keep surplus textboxes at their original positions (don't move them)
    unmappedExisting.forEach((element) => {
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
  
  // Preserve existing non-textbox elements that don't conflict with template
  existingNonTextboxes.forEach(element => {
    // Check for spatial conflicts with template non-textboxes
    const hasConflict = templateNonTextboxes.some(templateEl => 
      isElementOverlapping(element, templateEl)
    );
    
    if (!hasConflict) {
      resultElements.push(element);
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
  
  // Priority: qna_inline elements should be mapped first to ensure they get layout positions
  const qnaInlineElements = existingElements.filter(el => el.textType === 'qna_inline');
  const otherTextElements = existingElements.filter(el => el.textType !== 'qna_inline');
  
  // First pass: exact type matches, prioritizing qna_inline
  [...qnaInlineElements, ...otherTextElements].forEach(existing => {
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
  
  // Second pass: compatible type matches, prioritizing qna_inline to qna_inline slots
  qnaInlineElements.forEach(existing => {
    if (usedExisting.has(existing.id)) return;
    
    // Try to find qna_inline slots first
    const qnaSlot = templateSlots.find(slot => 
      !usedTemplate.has(slot.id) && 
      slot.textType === 'qna_inline'
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
    'question': ['text', 'qna_inline'],
    'answer': ['text', 'qna_inline'],
    'text': ['question', 'answer', 'qna_inline'],
    'qna_inline': ['question', 'answer', 'text'],
    'qna': ['qna_inline', 'text']
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