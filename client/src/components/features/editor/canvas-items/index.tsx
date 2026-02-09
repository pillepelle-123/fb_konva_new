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
import QrCodeCanvasItem from './qr-code.tsx';

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
    // Force re-render when shape settings change by using a key
    const shapeEl = element as any;
    const shapeKey = `${element.id}-${element.theme}-${element.strokeWidth}-${element.stroke}-${shapeEl.strokeOpacity}-${shapeEl.backgroundEnabled}-${element.fill}-${shapeEl.backgroundOpacity}-${element.cornerRadius}`;
    return <ThemedShape key={shapeKey} {...props} />;
  }

  if (element.type === 'text') {
    // Check for QnA textType
    if (element.textType === 'qna') {
      // Force re-render when QnA settings change by using a key
      const qnaEl = element as any;
      const qnaKey = `${element.id}-${qnaEl.questionSettings?.fontColor}-${qnaEl.questionSettings?.fontOpacity}-${qnaEl.answerSettings?.fontColor}-${qnaEl.answerSettings?.fontOpacity}-${qnaEl.backgroundEnabled}-${element.backgroundColor}-${element.backgroundOpacity}`;
      return <TextboxQna key={qnaKey} {...props} />;
    }
    // Check for Free Text textType
    if (element.textType === 'free_text') {
      const freeTextEl = element as any;
      const freeTextKey = `${element.id}-${freeTextEl.textSettings?.fontColor}-${freeTextEl.textSettings?.fontOpacity}-${freeTextEl.textSettings?.backgroundEnabled}-${freeTextEl.textSettings?.backgroundColor}-${freeTextEl.textSettings?.backgroundOpacity}`;
      return <TextboxFreeText key={freeTextKey} {...props} />;
    }
    // Fallback for other text types - use QnA as default
    const qnaEl = element as any;
    const qnaKey = `${element.id}-${qnaEl.questionSettings?.fontColor}-${qnaEl.questionSettings?.fontOpacity}-${qnaEl.answerSettings?.fontColor}-${qnaEl.answerSettings?.fontOpacity}-${qnaEl.backgroundEnabled}-${element.backgroundColor}-${element.backgroundOpacity}`;
    return <TextboxQna key={qnaKey} {...props} />;
  }

  if (element.type === 'placeholder' || element.type === 'image') {
    // Force re-render when image settings change by using a key
    const imageKey = `${element.id}-${element.imageOpacity}-${element.cornerRadius}-${element.frameEnabled}-${element.strokeWidth}-${element.borderOpacity}-${element.frameTheme}-${element.borderColor}`;
    return <Image key={imageKey} {...props} />;
  }

  if (element.type === 'sticker') {
    // Force re-render when sticker settings change by using a key
    const stickerKey = `${element.id}-${element.imageOpacity}-${(element as any).stickerColor}`;
    return <Sticker key={stickerKey} {...props} />;
  }

  if (element.type === 'qr_code') {
    const qrKey = `${element.id}-${(element as any).qrValue}-${(element as any).qrForegroundColor}-${(element as any).qrBackgroundColor}-${(element as any).qrErrorCorrection}-${(element as any).qrMargin}`;
    return <QrCodeCanvasItem key={qrKey} {...props} />;
  }

  // Fallback for other element types
  return null;
}

// PERFORMANCE OPTIMIZATION: Memoize CanvasItemComponent to prevent unnecessary re-renders
// Only re-render when element reference changes or other critical props change
// NOTE: Element is mutated in place by reducer, so we only check reference equality
const arePropsEqual = (
  prevProps: CanvasItemComponentProps,
  nextProps: CanvasItemComponentProps
): boolean => {
  // Always re-render when element reference changes (handles all element property updates)
  if (prevProps.element !== nextProps.element) return false;
  
  // Selection status
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.isWithinSelection !== nextProps.isWithinSelection) return false;
  
  // Zoom
  if (prevProps.zoom !== nextProps.zoom) return false;
  
  // Hover status - only re-render if this element is affected
  if (prevProps.hoveredElementId !== nextProps.hoveredElementId) {
    if (prevProps.hoveredElementId === prevProps.element.id || 
        nextProps.hoveredElementId === nextProps.element.id) {
      return false;
    }
  }
  
  // Interactive status
  if (prevProps.interactive !== nextProps.interactive) return false;
  if (prevProps.isInsideGroup !== nextProps.isInsideGroup) return false;
  if (prevProps.isMovingGroup !== nextProps.isMovingGroup) return false;
  
  // Page side
  if (prevProps.pageSide !== nextProps.pageSide) return false;
  
  // State values
  if (prevProps.activeTool !== nextProps.activeTool) return false;
  if (prevProps.lockElements !== nextProps.lockElements) return false;
  if (prevProps.dispatch !== nextProps.dispatch) return false;
  
  // Skip re-render
  return true;
};

export default CanvasItemComponent;