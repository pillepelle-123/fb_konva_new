import React, { useRef, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Group, Rect } from 'react-konva';
import { SelectionHoverRectangle } from '../canvas/selection-hover-rectangle';
import Konva from 'konva';
import { useEditor } from '../../../../context/editor-context';
import type { CanvasElement } from '../../../../context/editor-context';
import { BOOK_PAGE_DIMENSIONS, DEFAULT_BOOK_ORIENTATION, DEFAULT_BOOK_PAGE_SIZE } from '../../../../constants/book-formats';

export interface CanvasItemProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (e?: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragStart?: () => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  isMovingGroup?: boolean;
  isWithinSelection?: boolean;
  isDragging?: boolean;
  zoom?: number;
  isInsideGroup?: boolean;
  hoveredElementId?: string | null;
  interactive?: boolean; // If false, disables all interactions (for PDF export)
  // Seite innerhalb eines Doppelseiten-Spreads: 'left' oder 'right'
  pageSide?: 'left' | 'right';
}

interface BaseCanvasItemProps extends CanvasItemProps {
  children: ReactNode;
  hitArea?: { x: number; y: number; width: number; height: number };
  onDoubleClick?: (e?: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  hoveredElementId?: string | null;
  interactive?: boolean; // If false, disables all interactions (for PDF export)
}

export default function BaseCanvasItem({ 
  element, 
  isSelected, 
  onSelect, 
  onDragStart, 
  onDragEnd, 
  isMovingGroup, 
  isWithinSelection,
  isInsideGroup = false,
  children,
  hitArea,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  hoveredElementId,
  interactive = true, // Default to interactive mode
}: BaseCanvasItemProps) {
  const { state, dispatch } = useEditor();
  const groupRef = useRef<Konva.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [partnerHovered, setPartnerHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate canvas dimensions for the active book/page
  const orientation = state.currentBook?.orientation || DEFAULT_BOOK_ORIENTATION;
  const pageSize = state.currentBook?.pageSize || DEFAULT_BOOK_PAGE_SIZE;
  const dimensions = BOOK_PAGE_DIMENSIONS[pageSize as keyof typeof BOOK_PAGE_DIMENSIONS];
  const canvasWidth = orientation === 'landscape' ? dimensions.height : dimensions.width;
  const canvasHeight = orientation === 'landscape' ? dimensions.width : dimensions.height;

  // Prevent scaling for question-answer pairs but allow qna textboxes to be resized
  useEffect(() => {
    if (groupRef.current && element && (element.textType === 'question' || element.textType === 'answer')) {
      // Always ensure scale is 1 for question/answer elements
      groupRef.current.scaleX(1);
      groupRef.current.scaleY(1);
    }
  }, [element, element?.textType, element?.type, element?.width, element?.height, element?.scaleX, element?.scaleY]);

  useEffect(() => {
    if (!element) return;
    
    const handlePartnerHover = (event: CustomEvent) => {
      const { elementId, hover } = event.detail;
      
      // Check if this element is the partner of the hovered element
      let isPartner = false;
      if (element.textType === 'question') {
        // Find if any answer element has this as questionElementId
        const currentPage = state.currentBook?.pages[state.activePageIndex];
        isPartner = currentPage?.elements.some(el => el.id === elementId && el.questionElementId === element.id) || false;
      } else if (element.textType === 'answer' && element.questionElementId) {
        // Check if the hovered element is our linked question
        isPartner = elementId === element.questionElementId;
      }
      
      if (isPartner) {
        setPartnerHovered(hover);
      }
    };
    
    window.addEventListener('hoverPartner', handlePartnerHover as EventListener);
    return () => window.removeEventListener('hoverPartner', handlePartnerHover as EventListener);
  }, [element, element?.id, element?.textType, element?.questionElementId, state.currentBook, state.activePageIndex]);
  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!interactive) return; // Skip interactions in non-interactive mode
    if (isInsideGroup) return; // Don't handle clicks for grouped elements
    if (state.activeTool === 'select') {
      if (e.evt.button === 0) {
        e.cancelBubble = true;
        // For question-answer pairs, always call onSelect to handle sequential selection
        // For other elements with Ctrl+click, always call onSelect to handle multi-selection/deselection
        // For other elements without Ctrl, call onSelect if not already selected OR if lockElements is enabled
        // This ensures selection is properly updated even when lockElements is active
        if (element && ((element.textType === 'question' || element.textType === 'answer') || !isSelected || e.evt.ctrlKey || e.evt.metaKey || state.editorSettings?.editor?.lockElements)) {
          onSelect(e);
        }
      } else if (e.evt.button === 2) {
        e.cancelBubble = true;
        // Right-click: select element if not already selected
        if (!isSelected) {
          onSelect(e);
        }
      }
    }
  };

  const handleDoubleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!interactive) return; // Skip interactions in non-interactive mode
    if (state.activeTool === 'select' && onDoubleClick) {
      e.cancelBubble = true;
      onDoubleClick(e);
    }
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!interactive) return; // Skip interactions in non-interactive mode
    if (isInsideGroup) return; // Don't handle mousedown for grouped elements
    if (state.activeTool === 'select' && e.evt.button === 0) {
      // If multiple elements are selected, don't stop event propagation
      // This allows the Stage's handleMouseDown to handle group movement
      // But only if elements are not locked
      if (state.selectedElementIds.length > 1 && !state.editorSettings?.editor?.lockElements) {
        // Don't stop event - let it bubble to Stage for group move handling
        return;
      }
      
      // Stop event propagation to prevent Stage from handling it
      // This ensures selection works even when lockElements is enabled
      e.cancelBubble = true;
      // For regular elements, select on mouseDown if not already selected
      // Skip for question-answer pairs as they use onClick for sequential selection
      // Skip if Ctrl/Cmd is pressed (multi-selection is handled in onClick)
      // When lockElements is enabled, always call onSelect to ensure selection is updated
      if (element && (!isSelected || state.editorSettings?.editor?.lockElements) && !(element.textType === 'question' || element.textType === 'answer') && !e.evt.ctrlKey && !e.evt.metaKey) {
        onSelect(e);
      }
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!interactive) return; // Skip interactions in non-interactive mode
    // Block position update if elements are locked
    if (state.editorSettings?.editor?.lockElements) {
      // Reset position to original
      e.target.x(element.x);
      e.target.y(element.y);
      return;
    }
    const rawX = e.target.x();
    const rawY = e.target.y();

    const elementWidth = element.width || 100;
    const elementHeight = element.height || 100;

    // Rechteck des Elements in Seitennkoordinaten
    const rectLeft = rawX;
    const rectRight = rawX + elementWidth;
    const rectTop = rawY;
    const rectBottom = rawY + elementHeight;

    // 1) Erlaube Positionen außerhalb der Seite, solange das Element die eigene Seite noch schneidet.
    // Page-Rect (in Seitennkoordinaten): [0, canvasWidth] x [0, canvasHeight]
    const overlapsOwnPage =
      rectLeft < canvasWidth &&
      rectRight > 0 &&
      rectTop < canvasHeight &&
      rectBottom > 0;

    if (!overlapsOwnPage) {
      // Komplett außerhalb der eigenen Seite (oben/unten/außen) -> nicht erlaubt
      e.target.x(element.x);
      e.target.y(element.y);
      if (typeof window !== 'undefined' && (e.evt as MouseEvent | DragEvent)?.clientX !== undefined) {
        const nativeEvent = e.evt as MouseEvent | DragEvent;
        window.dispatchEvent(
          new CustomEvent('canvasOutsidePageAttempt', {
            detail: {
              clientX: nativeEvent.clientX,
              clientY: nativeEvent.clientY,
            },
          }),
        );
      }
      return;
    }

    dispatch({
      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
      payload: {
        id: element.id,
        updates: { x: rawX, y: rawY }
      }
    });
    onDragEnd?.(e);
  };

  // Early return if element is undefined
  if (!element) {
    return null;
  }

  const defaultHitArea = hitArea || { x: 0, y: 0, width: element.width || 100, height: element.height || 100 };

  const groupName = element.type === 'placeholder'
    ? 'canvas-item no-print placeholder-element'
    : 'canvas-item';

  return (
    <Group
      ref={groupRef}
      id={element.id}
      name={groupName}
      x={element.x}
      y={element.y}
      scaleX={(element && (element.textType === 'question' || element.textType === 'answer')) ? 1 : (element?.scaleX || 1)}
      scaleY={(element && (element.textType === 'question' || element.textType === 'answer')) ? 1 : (element?.scaleY || 1)}
      rotation={typeof element?.rotation === 'number' ? element.rotation : 0}
      draggable={interactive && state.activeTool === 'select' && !isMovingGroup && !isInsideGroup && state.editorInteractionLevel !== 'answer_only' && state.selectedElementIds.length <= 1 && !(state.editorSettings?.editor?.lockElements)}
      onMouseDown={interactive ? handleMouseDown : undefined}
      onClick={interactive ? handleClick : undefined}
      onDblClick={interactive ? handleDoubleClick : undefined}
      onTap={interactive ? (e) => {
        e.cancelBubble = true;
        // For question-answer pairs, always call onSelect for sequential selection
        // For other elements, only call if not already selected
        if (element && ((element.textType === 'question' || element.textType === 'answer') || !isSelected)) {
          onSelect();
        }
      } : undefined}
      onDragStart={interactive ? () => {
        setIsDragging(true);
        onDragStart?.();
      } : undefined}
      onDragEnd={interactive ? (e) => {
        setIsDragging(false);
        handleDragEnd(e);
      } : undefined}
      onMouseEnter={interactive && state.activeTool === 'select' ? () => {
        setIsHovered(true);
        onMouseEnter?.();
        // Trigger hover on partner element for question-answer pairs
        if (element && (element.textType === 'question' || element.textType === 'answer')) {
          window.dispatchEvent(new CustomEvent('hoverPartner', { detail: { elementId: element.id, hover: true } }));
        }
      } : undefined}
      onMouseLeave={interactive && state.activeTool === 'select' ? () => {
        setIsHovered(false);
        onMouseLeave?.();
        // Remove hover from partner element for question-answer pairs
        if (element && (element.textType === 'question' || element.textType === 'answer')) {
          window.dispatchEvent(new CustomEvent('hoverPartner', { detail: { elementId: element.id, hover: false } }));
        }
      } : undefined}
    >
      {/* Invisible hit area for easier selection */}
      <Rect
        x={defaultHitArea.x}
        y={defaultHitArea.y}
        width={defaultHitArea.width}
        height={defaultHitArea.height}
        fill="transparent"
        listening={true}
        strokeWidth={10}
        stroke="transparent"
        perfectDrawEnabled={false}
      />
      
      {/* Dashed border on hover or within selection */}
      {interactive && (isHovered || partnerHovered || isWithinSelection || hoveredElementId === element.id) && state.activeTool === 'select' && (
        <SelectionHoverRectangle
          x={defaultHitArea.x}
          y={defaultHitArea.y}
          width={defaultHitArea.width}
          height={defaultHitArea.height}
          lighter={element?.textType === 'qna'}
        />
      )}
      
      {/* Permanent dashed border for shapes with no border and no background */}
      {interactive && state.activeTool === 'select' && 
       !isInsideGroup &&
       ['rect', 'circle', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(element.type) &&
       (!element.strokeWidth || element.strokeWidth === 0) &&
       (element.fill === 'transparent' || !element.fill) && (
        <SelectionHoverRectangle
          x={defaultHitArea.x}
          y={defaultHitArea.y}
          width={defaultHitArea.width}
          height={defaultHitArea.height}
          lighter={element?.textType === 'qna'}
        />
      )}
      
      {/* Pass isDragging to children if they are React elements */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // Handle Fragments by recursively mapping their children
          if (child.type === React.Fragment) {
            const fragmentProps = child.props as { children?: ReactNode };
            const mappedFragmentChildren = React.Children.map(fragmentProps.children, (fragmentChild) => {
              if (React.isValidElement(fragmentChild) && typeof fragmentChild.type !== 'string') {
                try {
                  return React.cloneElement(fragmentChild as React.ReactElement<Record<string, unknown>>, { isDragging });
                } catch {
                  return fragmentChild;
                }
              }
              return fragmentChild;
            });
            return React.cloneElement(child, {}, mappedFragmentChildren);
          }
          // Only clone elements that are not Konva components (which have string types)
          if (typeof child.type === 'string') {
            return child;
          }
          // For React components, try to pass isDragging if they accept it
          try {
          const typedChild = child as React.ReactElement<Record<string, unknown>>;
          return React.cloneElement(typedChild, { isDragging });
          } catch {
            // If cloning fails, return the child as-is
            return child;
          }
        }
        return child;
      })}
    </Group>
  );
}