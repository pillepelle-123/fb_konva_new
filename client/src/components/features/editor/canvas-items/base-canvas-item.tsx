import React, { useRef, useState, useEffect, useMemo } from 'react';
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

interface CanvasItemProps {
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
  isZoomingRef,
}: BaseCanvasItemProps) {
  const { state, dispatch } = useEditor();
  const groupRef = useRef<Konva.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [partnerHovered, setPartnerHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const transformStartDataRef = useRef<{ x: number; y: number; width: number; height: number; scaleX: number; scaleY: number } | null>(null);
  const lastTransformDataRef = useRef<{ scaleX: number; scaleY: number; x: number; y: number } | null>(null);

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
      // Reset position to original (accounting for offset)
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
    
    // Convert from adjusted position (with offset) back to original position (without offset)
    const offsetX = elementWidth / 2;
    const offsetY = elementHeight / 2;
    const actualX = rawX - offsetX;
    const actualY = rawY - offsetY;

    // Rechteck des Elements in Seitennkoordinaten (using actual position, not adjusted)
    const rectLeft = actualX;
    const rectRight = actualX + elementWidth;
    const rectTop = actualY;
    const rectBottom = actualY + elementHeight;

    // 1) Erlaube Positionen außerhalb der Seite, solange das Element die eigene Seite noch schneidet.
    // Page-Rect (in Seitennkoordinaten): [0, canvasWidth] x [0, canvasHeight]
    const overlapsOwnPage =
      rectLeft < canvasWidth &&
      rectRight > 0 &&
      rectTop < canvasHeight &&
      rectBottom > 0;

    if (!overlapsOwnPage) {
      // Komplett außerhalb der eigenen Seite (oben/unten/außen) -> nicht erlaubt
      // Reset to original position (accounting for offset)
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

    dispatch({
      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
      payload: {
        id: element.id,
        updates: { x: actualX, y: actualY }
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
      draggable={interactive && state.activeTool === 'select' && !isMovingGroup && !isInsideGroup && state.editorInteractionLevel !== 'answer_only' && state.selectedElementIds.length <= 1 && !(state.editorSettings?.editor?.lockElements)}
      listening={interactive && !(isZoomingRef?.current)}
      onTransformStart={interactive ? (e) => {
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
        console.log('[Transform Start]', {
          elementId: element.id.substring(0, 8),
          pos: { x: node.x().toFixed(1), y: node.y().toFixed(1) },
          size: { w: node.width().toFixed(1), h: node.height().toFixed(1) },
          scale: { x: node.scaleX().toFixed(2), y: node.scaleY().toFixed(2) }
        });
      } : undefined}
      onTransform={interactive ? (e) => {
        const node = e.target;
        lastTransformDataRef.current = {
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          x: node.x(),
          y: node.y()
        };
      } : undefined}
      onTransformEnd={interactive ? (e) => {
        const node = e.target;
        const startData = transformStartDataRef.current;
        const lastData = lastTransformDataRef.current;
        
        if (startData && lastData) {
          const deltaX = lastData.x - startData.x;
          const deltaY = lastData.y - startData.y;
          const deltaScaleX = lastData.scaleX - startData.scaleX;
          const deltaScaleY = lastData.scaleY - startData.scaleY;
          
          let handle = 'unknown';
          const threshold = 0.5;
          const scaleThreshold = 0.01;
          
          // Check if size changed via scale
          const sizeChanged = Math.abs(deltaScaleX) > scaleThreshold || Math.abs(deltaScaleY) > scaleThreshold;
          
          if (sizeChanged) {
            // Corner handles: both position and both scales change
            if (Math.abs(deltaX) > threshold && Math.abs(deltaY) > threshold) {
              if (deltaScaleX < 0 && deltaScaleY < 0) handle = 'top-left';
              else if (deltaScaleX > 0 && deltaScaleY < 0) handle = 'top-right';
              else if (deltaScaleX < 0 && deltaScaleY > 0) handle = 'bottom-left';
              else handle = 'bottom-right';
            }
            // Horizontal side handles: X position changes, scaleX changes
            else if (Math.abs(deltaX) > threshold && Math.abs(deltaY) <= threshold) {
              // Left handle: position moves right when shrinking (deltaX > 0, deltaScaleX < 0)
              // Right handle: position stays same when growing (deltaX ≈ 0, deltaScaleX > 0)
              handle = deltaScaleX < 0 ? 'middle-left' : 'middle-right';
            }
            // Vertical side handles: Y position changes, scaleY changes
            else if (Math.abs(deltaY) > threshold && Math.abs(deltaX) <= threshold) {
              // Top handle: position moves down when shrinking (deltaY > 0, deltaScaleY < 0)
              // Bottom handle: position stays same when growing (deltaY ≈ 0, deltaScaleY > 0)
              handle = deltaScaleY < 0 ? 'top-middle' : 'bottom-middle';
            }
            // Size changed but position didn't - right or bottom handle
            else if (Math.abs(deltaX) <= threshold && Math.abs(deltaY) <= threshold) {
              if (Math.abs(deltaScaleX) > Math.abs(deltaScaleY)) handle = 'middle-right';
              else handle = 'bottom-middle';
            }
          }
          
          console.log('[Transform End - BaseCanvasItem]', {
            elementId: element.id.substring(0, 8),
            handle,
            delta: { 
              x: deltaX.toFixed(1), 
              y: deltaY.toFixed(1),
              scaleX: deltaScaleX.toFixed(3),
              scaleY: deltaScaleY.toFixed(3)
            },
            final: { 
              x: lastData.x.toFixed(1), 
              y: lastData.y.toFixed(1), 
              scaleX: lastData.scaleX.toFixed(2), 
              scaleY: lastData.scaleY.toFixed(2) 
            }
          });
        }
        setIsTransforming(false);
        transformStartDataRef.current = null;
        lastTransformDataRef.current = null;
      } : undefined}
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