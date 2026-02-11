import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Group, Rect } from 'react-konva';
import { SelectionHoverRectangle } from '../canvas/selection-hover-rectangle';
import Konva from 'konva';
import { useEditor } from '../../../../context/editor-context';
import type { CanvasElement } from '../../../../context/editor-context';
import { BOOK_PAGE_DIMENSIONS, DEFAULT_BOOK_ORIENTATION, DEFAULT_BOOK_PAGE_SIZE } from '../../../../constants/book-formats';
import { calculateContrastColor } from '../../../../utils/contrast-color';
import { colorPalettes } from '../../../../data/templates/color-palettes';
import { getThemePaletteId } from '../../../../utils/global-themes';
import type { ColorPalette } from '../../../../types/template-types';
import type { RichTextStyle } from '../../../../../../shared/types/text-layout';
import { useCanvasCommand } from '../../../../hooks/useCanvasCommand';

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
  // PERFORMANCE OPTIMIZATION: Pass state values as props to avoid useEditor() hook
  // This allows React.memo to work correctly
  activeTool?: string;
  lockElements?: boolean;
  // For TextboxQna: pass activeTool to avoid useEditor() re-renders
  // For CanvasItemComponent: pass dispatch to avoid useEditor() re-renders
  dispatch?: React.Dispatch<any>;
  // Props für TextboxQna - State-abhängige Werte
  questionText?: string;
  answerText?: string;
  questionStyle?: RichTextStyle;
  answerStyle?: RichTextStyle;
  assignedUser?: { id: string } | null;
  isZoomingRef?: React.MutableRefObject<boolean>; // Ref to track zooming state
}

interface BaseCanvasItemProps extends CanvasItemProps {
  children: ReactNode;
  hitArea?: { x: number; y: number; width: number; height: number };
  onDoubleClick?: (e?: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  hoveredElementId?: string | null;
  interactive?: boolean; // If false, disables all interactions (for PDF export)
  isZoomingRef?: React.MutableRefObject<boolean>; // Ref to track zooming state
}

function BaseCanvasItem({ 
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
  isZoomingRef,
}: BaseCanvasItemProps) {
  const { state, dispatch, canEditElement } = useEditor();
  const { start: startDragCommand, end: endDragCommand } = useCanvasCommand('Move Element', 'CANVAS_DRAG');
  const groupRef = useRef<Konva.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [partnerHovered, setPartnerHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const transformStartDataRef = useRef<{ x: number; y: number; width: number; height: number; scaleX: number; scaleY: number } | null>(null);
  const lastTransformDataRef = useRef<{ scaleX: number; scaleY: number; x: number; y: number } | null>(null);
  const throttleTimeoutRef = useRef<number | null>(null);

  // Calculate canvas dimensions for the active book/page
  const orientation = state.currentBook?.orientation || DEFAULT_BOOK_ORIENTATION;
  const pageSize = state.currentBook?.pageSize || DEFAULT_BOOK_PAGE_SIZE;
  const dimensions = BOOK_PAGE_DIMENSIONS[pageSize as keyof typeof BOOK_PAGE_DIMENSIONS];
  const canvasWidth = orientation === 'landscape' ? dimensions.height : dimensions.width;
  const canvasHeight = orientation === 'landscape' ? dimensions.width : dimensions.height;

  // Get current page for contrast color calculation
  const currentPage = state.currentBook?.pages[state.activePageIndex];

  // Helper function to get palette for a page (similar to canvas.tsx)
  const getPaletteForPage = (page?: typeof currentPage) => {
    // Get page color palette (or book color palette if page.colorPaletteId is null)
    const pageColorPaletteId = page?.colorPaletteId ?? null;
    const bookColorPaletteId = state.currentBook?.colorPaletteId ?? null;
    
    // If book.colorPaletteId is null, use theme's default palette
    const bookThemeId = state.currentBook?.bookTheme || state.currentBook?.themeId || 'default';
    const bookThemePaletteId = !bookColorPaletteId ? getThemePaletteId(bookThemeId) : null;
    
    // Determine effective palette: page palette > book palette > theme's default palette
    const effectivePaletteId = pageColorPaletteId ?? bookColorPaletteId ?? bookThemePaletteId;

    if (effectivePaletteId === null) {
      return { paletteId: null as string | null, palette: null as ColorPalette | null };
    }

    const palette = colorPalettes.find((item) => item.id === effectivePaletteId) ?? null;
    return { paletteId: effectivePaletteId, palette };
  };

  // Calculate contrast color for selection hover rectangle
  const contrastStrokeColor = useMemo(() => {
    return calculateContrastColor(currentPage, getPaletteForPage, 0.15);
  }, [currentPage, state.currentBook?.colorPaletteId, state.currentBook?.bookTheme]);

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
  const canEditThisElement = canEditElement(element);

  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!interactive) return;
    if (!canEditThisElement) return;
    if (isInsideGroup) return;
    if (state.activeTool === 'select') {
      if (e.evt.button === 0) {
        e.cancelBubble = true;
        if (element && ((element.textType === 'question' || element.textType === 'answer') || !isSelected || e.evt.ctrlKey || e.evt.metaKey || state.editorSettings?.editor?.lockElements)) {
          onSelect(e);
        }
      } else if (e.evt.button === 2) {
        e.cancelBubble = true;
        if (!isSelected) {
          onSelect(e);
        }
      }
    }
  }, [interactive, canEditThisElement, isInsideGroup, state.activeTool, state.editorSettings?.editor?.lockElements, element, isSelected, onSelect]);

  const handleDoubleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!interactive) return;
    if (!canEditThisElement) return;
    if (state.activeTool === 'select' && onDoubleClick) {
      e.cancelBubble = true;
      onDoubleClick(e);
    }
  }, [interactive, canEditThisElement, state.activeTool, onDoubleClick]);

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!interactive) return;
    if (!canEditThisElement) return;
    if (isInsideGroup) return;
    if (state.activeTool === 'select' && e.evt.button === 0) {
      if (state.selectedElementIds.length > 1 && !state.editorSettings?.editor?.lockElements) {
        return;
      }
      e.cancelBubble = true;
      if (element && (!isSelected || state.editorSettings?.editor?.lockElements) && !(element.textType === 'question' || element.textType === 'answer') && !e.evt.ctrlKey && !e.evt.metaKey) {
        requestAnimationFrame(() => onSelect(e));
      }
    }
  }, [interactive, canEditThisElement, isInsideGroup, state.activeTool, state.selectedElementIds.length, state.editorSettings?.editor?.lockElements, element, isSelected, onSelect]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (!interactive) return;
    if (!canEditThisElement) return;
    if (state.editorSettings?.editor?.lockElements) {
      const offsetX = (element.width || 100) / 2;
      const offsetY = (element.height || 100) / 2;
      e.target.x(element.x + offsetX);
      e.target.y(element.y + offsetY);
      return;
    }
    const rawX = e.target.x();
    const rawY = e.target.y();
    const elementWidth = element.width || 100;
    const elementHeight = element.height || 100;
    const offsetX = elementWidth / 2;
    const offsetY = elementHeight / 2;
    const actualX = rawX - offsetX;
    const actualY = rawY - offsetY;
    const rectLeft = actualX;
    const rectRight = actualX + elementWidth;
    const rectTop = actualY;
    const rectBottom = actualY + elementHeight;
    const overlapsOwnPage =
      rectLeft < canvasWidth &&
      rectRight > 0 &&
      rectTop < canvasHeight &&
      rectBottom > 0;

    if (!overlapsOwnPage) {
      e.target.x(element.x + offsetX);
      e.target.y(element.y + offsetY);
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

    requestAnimationFrame(() => {
      startDragCommand();
      
      // Queue the update
      dispatch({
        type: 'BATCH_UPDATE_ELEMENT',
        payload: {
          id: element.id,
          updates: { x: actualX, y: actualY }
        }
      });
      
      // End batch immediately to save to history
      endDragCommand();
      
      onDragEnd?.(e);
    });
  }, [interactive, canEditThisElement, state.editorSettings?.editor?.lockElements, element, canvasWidth, canvasHeight, dispatch, onDragEnd, startDragCommand, endDragCommand]);

  // Early return if element is undefined
  if (!element) {
    return null;
  }

  const defaultHitArea = hitArea || { x: 0, y: 0, width: element.width || 100, height: element.height || 100 };

  const groupName = element.type === 'placeholder'
    ? 'canvas-item no-print placeholder-element'
    : 'canvas-item';

  // Set explicit width and height on Group for proper rotation pivot point calculation
  // This ensures Konva rotates around the center instead of the top-left corner
  const groupWidth = element.width || 100;
  const groupHeight = element.height || 100;
  
  // Set offsetX and offsetY to center the rotation pivot point
  // This makes the Group rotate around its center instead of top-left corner
  const offsetX = groupWidth / 2;
  const offsetY = groupHeight / 2;
  
  // During transform, use node position directly to avoid visual jumping
  // Otherwise, calculate from element position
  const adjustedX = isTransforming && groupRef.current 
    ? groupRef.current.x() 
    : element.x + offsetX;
  const adjustedY = isTransforming && groupRef.current 
    ? groupRef.current.y() 
    : element.y + offsetY;

  return (
    <Group
      ref={groupRef}
      id={element.id}
      name={groupName}
      x={adjustedX}
      y={adjustedY}
      width={groupWidth}
      height={groupHeight}
      offsetX={offsetX}
      offsetY={offsetY}
      scaleX={(element && (element.textType === 'question' || element.textType === 'answer')) ? 1 : (element?.scaleX || 1)}
      scaleY={(element && (element.textType === 'question' || element.textType === 'answer')) ? 1 : (element?.scaleY || 1)}
      rotation={typeof element?.rotation === 'number' ? element.rotation : 0}
      draggable={interactive && canEditThisElement && state.activeTool === 'select' && !isMovingGroup && !isInsideGroup && state.selectedElementIds.length <= 1 && !(state.editorSettings?.editor?.lockElements)}
      listening={interactive && !(isZoomingRef?.current)}
      perfectDrawEnabled={false}
      shadowForStrokeEnabled={false}
      hitStrokeWidth={0}
      onTransformStart={interactive && canEditThisElement ? (e) => {
        setIsTransforming(true);
        const node = e.target;
        transformStartDataRef.current = {
          x: node.x(),
          y: node.y(),
          width: node.width(),
          height: node.height(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY()
        };
        lastTransformDataRef.current = null;
      } : undefined}
      onTransform={interactive && canEditThisElement ? (e) => {
        const node = e.target;
        lastTransformDataRef.current = {
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          x: node.x(),
          y: node.y()
        };
        
        // Throttle to reduce frequency and improve performance
        if (throttleTimeoutRef.current) return;
        throttleTimeoutRef.current = window.setTimeout(() => {
          throttleTimeoutRef.current = null;
        }, 16); // ~60fps
      } : undefined}
      onTransformEnd={interactive && canEditThisElement ? () => {
        // Delay state update to avoid transformer errors
        // Note: We don't save transform operations (resize/rotate) to history yet
        // Only drag operations are saved (see handleDragEnd)
        // Full transform support requires converting Konva's scale+position into element width/height
        setTimeout(() => {
          setIsTransforming(false);
          transformStartDataRef.current = null;
          lastTransformDataRef.current = null;
        }, 0);
      } : undefined}
      onMouseDown={interactive ? handleMouseDown : undefined}
      onClick={interactive ? handleClick : undefined}
      onDblClick={interactive ? handleDoubleClick : undefined}
      onTap={interactive && canEditThisElement ? (e) => {
        e.cancelBubble = true;
        // For question-answer pairs, always call onSelect for sequential selection
        // For other elements, only call if not already selected
        if (element && ((element.textType === 'question' || element.textType === 'answer') || !isSelected)) {
          onSelect();
        }
      } : undefined}
      onDragStart={interactive && canEditThisElement ? () => {
        setIsDragging(true);
        startDragCommand();
        onDragStart?.();
      } : undefined}
      onDragEnd={interactive && canEditThisElement ? (e) => {
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
          strokeColor={contrastStrokeColor}
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
          strokeColor={contrastStrokeColor}
        />
      )}
      
      {/* Pass isDragging to children if they are React elements */}
      {children}
    </Group>
  );
}

export default BaseCanvasItem;