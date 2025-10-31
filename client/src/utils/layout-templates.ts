import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement } from '../context/editor-context';
import type { LayoutTemplate, LayoutElement } from '../types/layout-types';

export function applyLayoutTemplate(
  existingElements: CanvasElement[],
  layoutTemplate: LayoutTemplate
): CanvasElement[] {
  const newElements: CanvasElement[] = [];
  
  // Get existing textbox-qna-inline elements
  const existingQnAElements = existingElements.filter(
    el => el.type === 'text' && el.textType === 'qna_inline'
  );
  
  // Get layout textbox positions
  const layoutQnAElements = layoutTemplate.elements.filter(
    el => el.type === 'textbox-qna-inline'
  );
  
  // Map existing QnA elements to new layout positions
  layoutQnAElements.forEach((layoutEl, index) => {
    const existingEl = existingQnAElements[index];
    
    if (existingEl) {
      // Preserve existing element with new position/size
      newElements.push({
        ...existingEl,
        x: layoutEl.x,
        y: layoutEl.y,
        width: layoutEl.width,
        height: layoutEl.height
      });
    } else {
      // Create new textbox-qna-inline element
      newElements.push({
        id: uuidv4(),
        type: 'text',
        textType: 'qna_inline',
        x: layoutEl.x,
        y: layoutEl.y,
        width: layoutEl.width,
        height: layoutEl.height,
        text: '',
        formattedText: '',
        fontSize: 50,
        fontFamily: 'Arial, sans-serif',
        stroke: '#1f2937',
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      });
    }
  });
  
  // Add other layout elements (shapes, images, stickers)
  const otherLayoutElements = layoutTemplate.elements.filter(
    el => el.type !== 'textbox-qna-inline'
  );
  
  otherLayoutElements.forEach(layoutEl => {
    const baseElement: CanvasElement = {
      id: uuidv4(),
      type: layoutEl.type === 'shape' ? (layoutEl.shapeType || 'rect') as any : 
            layoutEl.type === 'image' ? 'placeholder' :
            layoutEl.type as any,
      x: layoutEl.x,
      y: layoutEl.y,
      width: layoutEl.width,
      height: layoutEl.height,
      scaleX: 1,
      scaleY: 1,
      rotation: 0
    };
    
    if (layoutEl.type === 'shape') {
      baseElement.stroke = '#1f2937';
      baseElement.fill = 'transparent';
      baseElement.strokeWidth = 2;
    } else if (layoutEl.type === 'image') {
      baseElement.fill = '#e5e7eb';
      baseElement.stroke = '#9ca3af';
    } else if (layoutEl.type === 'sticker') {
      baseElement.fill = '#fbbf24';
      baseElement.stroke = '#f59e0b';
    }
    
    newElements.push(baseElement);
  });
  
  // Preserve non-QnA existing elements that don't conflict with layout
  const preservedElements = existingElements.filter(
    el => !(el.type === 'text' && el.textType === 'qna_inline')
  );
  
  return [...newElements, ...preservedElements];
}