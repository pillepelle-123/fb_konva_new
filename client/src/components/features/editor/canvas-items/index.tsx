import React, { useEffect, useRef } from 'react';
import { Group } from 'react-konva';
import type { CanvasElement } from '../../../../context/editor-context.tsx';
import { useEditor } from '../../../../context/editor-context.tsx';
import type { CanvasItemProps } from './base-canvas-item.tsx';
import ThemedShape from './themed-shape.tsx';

import TextboxQna from './textbox-qna.tsx';
import TextboxFreeText from './textbox-free-text.tsx';
import Image from './image.tsx';
import Sticker from './sticker.tsx';

interface CanvasItemComponentProps extends CanvasItemProps {
  element: CanvasElement;
}

function CanvasItemComponent(props: CanvasItemComponentProps) {
  const { element, onDragStart, onSelect, hoveredElementId, interactive = true, activeTool, lockElements, dispatch: dispatchProp } = props;
  // PERFORMANCE OPTIMIZATION: dispatch is passed as prop to avoid useEditor() hook
  // This prevents re-renders when Context state changes but props stay the same
  // useEditor() is only used as fallback if dispatch is not provided (should not happen in normal flow)
  const editorContext = dispatchProp ? null : useEditor();
  const dispatch = dispatchProp || editorContext?.dispatch;
  
  // DEBUG: Track re-renders
  const renderCountRef = useRef(0);
  const prevPropsRef = useRef<CanvasItemComponentProps | null>(null);
  renderCountRef.current += 1;
  
  useEffect(() => {
    if (prevPropsRef.current) {
      const prev = prevPropsRef.current;
      const changed: string[] = [];
      
      if (prev.element.id !== props.element.id) changed.push(`element.id: ${prev.element.id} -> ${props.element.id}`);
      if (prev.element.x !== props.element.x) changed.push(`element.x: ${prev.element.x} -> ${props.element.x}`);
      if (prev.element.y !== props.element.y) changed.push(`element.y: ${prev.element.y} -> ${props.element.y}`);
      if (prev.element.width !== props.element.width) changed.push(`element.width: ${prev.element.width} -> ${props.element.width}`);
      if (prev.element.height !== props.element.height) changed.push(`element.height: ${prev.element.height} -> ${props.element.height}`);
      if (prev.element.rotation !== props.element.rotation) changed.push(`element.rotation: ${prev.element.rotation} -> ${props.element.rotation}`);
      if (prev.isSelected !== props.isSelected) changed.push(`isSelected: ${prev.isSelected} -> ${props.isSelected}`);
      if (prev.isWithinSelection !== props.isWithinSelection) changed.push(`isWithinSelection: ${prev.isWithinSelection} -> ${props.isWithinSelection}`);
      if (prev.zoom !== props.zoom) changed.push(`zoom: ${prev.zoom} -> ${props.zoom}`);
      if (prev.hoveredElementId !== props.hoveredElementId) changed.push(`hoveredElementId: ${prev.hoveredElementId} -> ${props.hoveredElementId}`);
      if (prev.activeTool !== props.activeTool) changed.push(`activeTool: ${prev.activeTool} -> ${props.activeTool}`);
      if (prev.lockElements !== props.lockElements) changed.push(`lockElements: ${prev.lockElements} -> ${props.lockElements}`);
      if (prev.interactive !== props.interactive) changed.push(`interactive: ${prev.interactive} -> ${props.interactive}`);
      if (prev.isInsideGroup !== props.isInsideGroup) changed.push(`isInsideGroup: ${prev.isInsideGroup} -> ${props.isInsideGroup}`);
      if (prev.isMovingGroup !== props.isMovingGroup) changed.push(`isMovingGroup: ${prev.isMovingGroup} -> ${props.isMovingGroup}`);
      if (prev.pageSide !== props.pageSide) changed.push(`pageSide: ${prev.pageSide} -> ${props.pageSide}`);
      
      // Check if dispatch changed (should be stable, but log if it changes)
      if (prev.dispatch !== props.dispatch) changed.push(`dispatch changed`);
      
      // Check if callbacks changed (they shouldn't trigger re-renders due to memo)
      if (prev.onSelect !== props.onSelect) changed.push(`onSelect callback changed`);
      if (prev.onDragStart !== props.onDragStart) changed.push(`onDragStart callback changed`);
      if (prev.onDragEnd !== props.onDragEnd) changed.push(`onDragEnd callback changed`);
      
      if (changed.length > 0) {
        // console.log(`[CanvasItemComponent] Re-render #${renderCountRef.current} for element "${element.id}" (${element.type}):`, changed);
      } else {
        // This can happen if useEditor() is still being called (fallback case)
        // or if React batches multiple state updates and renders before props are updated
        // console.warn(`[CanvasItemComponent] Re-render #${renderCountRef.current} for element "${element.id}" (${element.type}) but NO PROPS CHANGED! This should not happen with React.memo!`);
        // console.debug(`[CanvasItemComponent] Debug info:`, {
        //   hasDispatchProp: !!props.dispatch,
        //   hasEditorContext: !!editorContext,
        //   elementId: element.id,
        //   elementType: element.type
        // });
      }
    }
    prevPropsRef.current = { ...props };
  });

  if ((element.type === 'group' || element.type === 'brush-multicolor') && element.groupedElements) {
    return (
      <Group 
        x={element.x} 
        y={element.y} 
        id={element.id}
        listening={interactive}
        draggable={interactive && activeTool === 'select' && !lockElements}
        onMouseDown={interactive ? (e) => {
          if (activeTool === 'select') {
            e.cancelBubble = true;
          }
        } : undefined}
        onClick={interactive ? (e) => {
          if (activeTool === 'select') {
            e.cancelBubble = true;
            onSelect?.(e);
          }
        } : undefined}
        onTap={interactive ? (e) => {
          if (activeTool === 'select') {
            e.cancelBubble = true;
            onSelect?.();
          }
        } : undefined}
        onDragStart={interactive ? (e) => {
          // Block dragging if elements are locked
          if (lockElements) {
            e.target.stopDrag();
            return;
          }
          dispatch?.({ type: 'SAVE_TO_HISTORY', payload: 'Move Group' });
          onDragStart?.();
        } : undefined}
        onDragEnd={interactive ? (e) => {
          // Block position update if elements are locked
          if (lockElements) {
            // Reset position to original
            e.target.x(element.x);
            e.target.y(element.y);
            return;
          }
          
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: { x: e.target.x(), y: e.target.y() }
            }
          });
        } : undefined}
      >
        {element.groupedElements.map(groupedEl => (
          <CanvasItemComponent key={groupedEl.id} {...props} element={groupedEl} isSelected={false} isInsideGroup={true} hoveredElementId={hoveredElementId} interactive={interactive} dispatch={dispatch} isZoomingRef={props.isZoomingRef} />
        ))}
      </Group>
    );
  }

  if (element.type === 'brush') {
    return <ThemedShape {...props} />;
  }

  if (['rect', 'circle', 'line', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(element.type)) {
    return <ThemedShape {...props} />;
  }

  if (element.type === 'text') {
    // Check for QnA textType
    if (element.textType === 'qna') {
      return <TextboxQna {...props} />;
    }
    // Check for Free Text textType
    if (element.textType === 'free_text') {
      return <TextboxFreeText {...props} />;
    }
    // Fallback for other text types - use QnA as default
    return <TextboxQna {...props} />;
  }

  if (element.type === 'placeholder' || element.type === 'image') {
    return <Image {...props} />;
  }

  if (element.type === 'sticker') {
    return <Sticker {...props} />;
  }

  // Fallback for other element types
  return null;
}

// PERFORMANCE OPTIMIZATION: Memoize CanvasItemComponent to prevent unnecessary re-renders
// Only re-render when props that affect rendering actually change
// NOTE: Callback functions (onSelect, onDragStart, onDragEnd) are intentionally NOT compared
// because they are recreated on every render. The component will still work correctly
// because React preserves function references during reconciliation.
const arePropsEqual = (
  prevProps: CanvasItemComponentProps,
  nextProps: CanvasItemComponentProps
): boolean => {
  // Debug: Log IMMER wenn Vergleichsfunktion aufgerufen wird (für alle Elemente, um zu sehen ob sie aufgerufen wird)
  if (prevProps.element.type === 'text' && prevProps.element.textType === 'qna') {
    // console.log(`[CanvasItemComponent memo] Comparison function CALLED for ${prevProps.element.id}`);
  }
  
  // Debug: Log wenn Vergleichsfunktion aufgerufen wird (nur für QNA-Elemente)
  if (prevProps.element.type === 'text' && prevProps.element.textType === 'qna') {
    const prevEl = prevProps.element;
    const nextEl = nextProps.element;
    
    // Prüfe ob Element-Referenz gleich ist
    if (prevEl === nextEl) {
      // console.log(`[CanvasItemComponent memo] Element reference is SAME for ${prevEl.id} - but checking other props...`);
      // Wenn Referenz gleich ist, bedeutet das, dass sich das Element-Objekt nicht geändert hat
      // ABER: Andere Props könnten sich geändert haben (z.B. Callbacks, State-Werte)
      // Wir müssen trotzdem alle anderen Props prüfen!
    } else {
      // console.log(`[CanvasItemComponent memo] Element reference is DIFFERENT for ${prevEl.id} - comparing properties...`);
    }
  }
  
  // Element-ID muss gleich sein
  if (prevProps.element.id !== nextProps.element.id) return false;
  
  // Selection-Status
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.isWithinSelection !== nextProps.isWithinSelection) return false;
  
  // Zoom (für stroke scaling)
  if (prevProps.zoom !== nextProps.zoom) return false;
  
  // Element-Position und -Größe
  const prevEl = prevProps.element;
  const nextEl = nextProps.element;
  if (prevEl.x !== nextEl.x) return false;
  if (prevEl.y !== nextEl.y) return false;
  if (prevEl.width !== nextEl.width) return false;
  if (prevEl.height !== nextEl.height) return false;
  if (prevEl.rotation !== nextEl.rotation) return false;
  
  // QNA-spezifische Element-Eigenschaften (werden nicht als Props übergeben, müssen direkt geprüft werden)
  if (prevEl.type === 'text' && prevEl.textType === 'qna') {
    const prevQnaEl = prevEl as any;
    const nextQnaEl = nextEl as any;
    
    // Layout-Eigenschaften
    if (prevQnaEl.layoutVariant !== nextQnaEl.layoutVariant) {
      // console.log(`[CanvasItemComponent memo] layoutVariant changed for ${prevEl.id}: ${prevQnaEl.layoutVariant} -> ${nextQnaEl.layoutVariant}`);
      return false;
    }
    if (prevQnaEl.qnaIndividualSettings !== nextQnaEl.qnaIndividualSettings) {
      // console.log(`[CanvasItemComponent memo] qnaIndividualSettings changed for ${prevEl.id}`);
      return false;
    }
    if (prevQnaEl.answerInNewRow !== nextQnaEl.answerInNewRow) {
      // console.log(`[CanvasItemComponent memo] answerInNewRow changed for ${prevEl.id}: ${prevQnaEl.answerInNewRow} -> ${nextQnaEl.answerInNewRow}`);
      return false;
    }
    if (prevQnaEl.questionAnswerGap !== nextQnaEl.questionAnswerGap) {
      // console.log(`[CanvasItemComponent memo] questionAnswerGap changed for ${prevEl.id}: ${prevQnaEl.questionAnswerGap} -> ${nextQnaEl.questionAnswerGap}`);
      return false;
    }
    if (prevQnaEl.blockQuestionAnswerGap !== nextQnaEl.blockQuestionAnswerGap) {
      // console.log(`[CanvasItemComponent memo] blockQuestionAnswerGap changed for ${prevEl.id}`);
      return false;
    }
    if (prevQnaEl.questionPosition !== nextQnaEl.questionPosition) {
      // console.log(`[CanvasItemComponent memo] questionPosition changed for ${prevEl.id}`);
      return false;
    }
    if (prevQnaEl.questionWidth !== nextQnaEl.questionWidth) {
      // console.log(`[CanvasItemComponent memo] questionWidth changed for ${prevEl.id}`);
      return false;
    }
    
    // Visual Properties
    if (prevEl.backgroundColor !== nextEl.backgroundColor) {
      // console.log(`[CanvasItemComponent memo] backgroundColor changed for ${prevEl.id}`);
      return false;
    }
    if (prevEl.backgroundOpacity !== nextEl.backgroundOpacity) {
      // console.log(`[CanvasItemComponent memo] backgroundOpacity changed for ${prevEl.id}: ${prevEl.backgroundOpacity} -> ${nextEl.backgroundOpacity}`);
      return false;
    }
    if (prevQnaEl.backgroundEnabled !== nextQnaEl.backgroundEnabled) {
      // console.log(`[CanvasItemComponent memo] backgroundEnabled changed for ${prevEl.id}: ${prevQnaEl.backgroundEnabled} -> ${nextQnaEl.backgroundEnabled}`);
      return false;
    }
    if (prevEl.borderColor !== nextEl.borderColor) {
      // console.log(`[CanvasItemComponent memo] borderColor changed for ${prevEl.id}`);
      return false;
    }
    if (prevEl.borderWidth !== nextEl.borderWidth) {
      // console.log(`[CanvasItemComponent memo] borderWidth changed for ${prevEl.id}: ${prevEl.borderWidth} -> ${nextEl.borderWidth}`);
      return false;
    }
    if (prevEl.borderOpacity !== nextEl.borderOpacity) {
      // console.log(`[CanvasItemComponent memo] borderOpacity changed for ${prevEl.id}: ${prevEl.borderOpacity} -> ${nextEl.borderOpacity}`);
      return false;
    }
    if (prevQnaEl.borderEnabled !== nextQnaEl.borderEnabled) {
      // console.log(`[CanvasItemComponent memo] borderEnabled changed for ${prevEl.id}: ${prevQnaEl.borderEnabled} -> ${nextQnaEl.borderEnabled}`);
      return false;
    }
    if (prevQnaEl.borderTheme !== nextQnaEl.borderTheme) {
      // console.log(`[CanvasItemComponent memo] borderTheme changed for ${prevEl.id}: ${prevQnaEl.borderTheme} -> ${nextQnaEl.borderTheme}`);
      return false;
    }
    if (prevEl.cornerRadius !== nextEl.cornerRadius) {
      // console.log(`[CanvasItemComponent memo] cornerRadius changed for ${prevEl.id}: ${prevEl.cornerRadius} -> ${nextEl.cornerRadius}`);
      return false;
    }
    if (prevEl.padding !== nextEl.padding) {
      // console.log(`[CanvasItemComponent memo] padding changed for ${prevEl.id}: ${prevEl.padding} -> ${nextEl.padding}`);
      return false;
    }
    
    // Ruled Lines
    if (prevQnaEl.ruledLines !== nextQnaEl.ruledLines) {
      // console.log(`[CanvasItemComponent memo] ruledLines changed for ${prevEl.id}: ${prevQnaEl.ruledLines} -> ${nextQnaEl.ruledLines}`);
      return false;
    }
    if (prevQnaEl.ruledLinesWidth !== nextQnaEl.ruledLinesWidth) {
      // console.log(`[CanvasItemComponent memo] ruledLinesWidth changed for ${prevEl.id}: ${prevQnaEl.ruledLinesWidth} -> ${nextQnaEl.ruledLinesWidth}`);
      return false;
    }
    if (prevQnaEl.ruledLinesTheme !== nextQnaEl.ruledLinesTheme) {
      // console.log(`[CanvasItemComponent memo] ruledLinesTheme changed for ${prevEl.id}`);
      return false;
    }
    if (prevQnaEl.ruledLinesColor !== nextQnaEl.ruledLinesColor) {
      // console.log(`[CanvasItemComponent memo] ruledLinesColor changed for ${prevEl.id}`);
      return false;
    }
    if (prevQnaEl.ruledLinesOpacity !== nextQnaEl.ruledLinesOpacity) {
      // console.log(`[CanvasItemComponent memo] ruledLinesOpacity changed for ${prevEl.id}: ${prevQnaEl.ruledLinesOpacity} -> ${nextQnaEl.ruledLinesOpacity}`);
      return false;
    }
    if (prevQnaEl.ruledLinesTarget !== nextQnaEl.ruledLinesTarget) {
      // console.log(`[CanvasItemComponent memo] ruledLinesTarget changed for ${prevEl.id}`);
      return false;
    }
    
    // Question/Answer Settings (für Style-Berechnung)
    if (JSON.stringify(prevQnaEl.questionSettings) !== JSON.stringify(nextQnaEl.questionSettings)) {
      // console.log(`[CanvasItemComponent memo] questionSettings changed for ${prevEl.id}`);
      return false;
    }
    if (JSON.stringify(prevQnaEl.answerSettings) !== JSON.stringify(nextQnaEl.answerSettings)) {
      // console.log(`[CanvasItemComponent memo] answerSettings changed for ${prevEl.id}`);
      return false;
    }
    
    // Andere Eigenschaften die Styles beeinflussen
    if (prevEl.align !== nextEl.align) return false;
    if (prevEl.paragraphSpacing !== nextEl.paragraphSpacing) return false;
    if ((prevEl as any).format?.textAlign !== (nextEl as any).format?.textAlign) return false;
  }
  
  // Hover-Status - nur re-render wenn dieses Element betroffen ist
  if (prevProps.hoveredElementId !== nextProps.hoveredElementId) {
    if (prevProps.hoveredElementId === prevEl.id || 
        nextProps.hoveredElementId === nextEl.id) {
      return false;
    }
  }
  
  // Interactive status
  if (prevProps.interactive !== nextProps.interactive) return false;
  
  // isInsideGroup status
  if (prevProps.isInsideGroup !== nextProps.isInsideGroup) return false;
  
  // isMovingGroup status
  if (prevProps.isMovingGroup !== nextProps.isMovingGroup) return false;
  
  // pageSide
  if (prevProps.pageSide !== nextProps.pageSide) return false;
  
  // State values passed as props
  if (prevProps.activeTool !== nextProps.activeTool) return false;
  if (prevProps.lockElements !== nextProps.lockElements) return false;
  
  // dispatch should be stable, but check if it changes (shouldn't happen)
  if (prevProps.dispatch !== nextProps.dispatch) return false;
  
  // Props für TextboxQna - State-abhängige Werte
  // Nur für QNA-Elemente relevant, aber wir prüfen sie für alle Elemente
  // (für andere Elemente sind sie undefined, daher sind sie gleich)
  if (prevProps.questionText !== nextProps.questionText) return false;
  if (prevProps.answerText !== nextProps.answerText) return false;
  
  // Style-Vergleiche (JSON.stringify für Objekt-Vergleich)
  if (prevProps.questionStyle !== nextProps.questionStyle) {
    if (prevProps.questionStyle === undefined || nextProps.questionStyle === undefined) {
      return false; // Einer ist undefined, der andere nicht
    }
    // Beide sind definiert, vergleiche Werte
    if (JSON.stringify(prevProps.questionStyle) !== JSON.stringify(nextProps.questionStyle)) {
      return false; // Werte sind unterschiedlich
    }
  }
  
  if (prevProps.answerStyle !== nextProps.answerStyle) {
    if (prevProps.answerStyle === undefined || nextProps.answerStyle === undefined) {
      return false; // Einer ist undefined, der andere nicht
    }
    // Beide sind definiert, vergleiche Werte
    if (JSON.stringify(prevProps.answerStyle) !== JSON.stringify(nextProps.answerStyle)) {
      return false; // Werte sind unterschiedlich
    }
  }
  
  // assignedUser Vergleich
  if (prevProps.assignedUser?.id !== nextProps.assignedUser?.id) return false;
  
  // Callback functions are NOT compared - they are recreated on every render
  // but React handles this correctly during reconciliation
  
  // Debug: Log wenn Vergleichsfunktion true zurückgibt (nur für QNA-Elemente)
  if (prevProps.element.type === 'text' && prevProps.element.textType === 'qna') {
    // Prüfe ob sich Callbacks geändert haben (sollten ignoriert werden, aber loggen für Debugging)
    const callbacksChanged = 
      prevProps.onSelect !== nextProps.onSelect ||
      prevProps.onDragStart !== nextProps.onDragStart ||
      prevProps.onDragEnd !== nextProps.onDragEnd;
    
    if (callbacksChanged) {
      // console.log(`[CanvasItemComponent memo] Comparison returned TRUE for ${prevProps.element.id}, but callbacks changed (will be ignored by React.memo)`);
    } else {
      // console.log(`[CanvasItemComponent memo] Comparison returned TRUE for ${prevProps.element.id} - NO RE-RENDER`);
    }
  }
  
  // Props sind gleich, skip re-render
  return true;
};

export default React.memo(CanvasItemComponent, arePropsEqual);