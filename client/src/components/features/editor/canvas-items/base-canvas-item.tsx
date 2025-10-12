import React, { useRef, useState, ReactNode, useEffect } from 'react';
import { Group, Rect } from 'react-konva';
import { SelectionHoverRectangle } from '../canvas/selection-hover-rectangle';
import Konva from 'konva';
import { useEditor } from '../../../../context/editor-context';
import type { CanvasElement } from '../../../../context/editor-context';

export interface CanvasItemProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart?: () => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  isMovingGroup?: boolean;
  isWithinSelection?: boolean;
  isDragging?: boolean;
  zoom?: number;
}

interface BaseCanvasItemProps extends CanvasItemProps {
  children: ReactNode;
  hitArea?: { x: number; y: number; width: number; height: number };
  onDoubleClick?: () => void;
}

export default function BaseCanvasItem({ 
  element, 
  isSelected, 
  onSelect, 
  onDragStart, 
  onDragEnd, 
  isMovingGroup, 
  isWithinSelection,
  children,
  hitArea,
  onDoubleClick
}: BaseCanvasItemProps) {
  const { state, dispatch } = useEditor();
  const groupRef = useRef<Konva.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [partnerHovered, setPartnerHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Prevent scaling for question-answer pairs
  useEffect(() => {
    if (groupRef.current && (element.textType === 'question' || element.textType === 'answer')) {
      // Always ensure scale is 1 for question/answer elements
      groupRef.current.scaleX(1);
      groupRef.current.scaleY(1);
    }
  }, [element.textType, element.width, element.height, element.scaleX, element.scaleY]);

  useEffect(() => {
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
  }, [element.id, element.textType, element.questionElementId, state.currentBook, state.activePageIndex]);
  const [lastClickTime, setLastClickTime] = useState(0);

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (state.activeTool === 'select') {
      if (e.evt.button === 0) {
        // Check for double-click
        const currentTime = Date.now();
        const timeDiff = currentTime - lastClickTime;
        if (timeDiff < 500 && timeDiff > 50 && onDoubleClick) {
          e.cancelBubble = true;
          onDoubleClick();
          return;
        }
        setLastClickTime(currentTime);
        
        e.cancelBubble = true;
        // For question-answer pairs, always call onSelect to handle sequential selection
        // For other elements, only call if not already selected
        if (element.textType === 'question' || element.textType === 'answer' || !isSelected) {
          onSelect();
        }
      } else if (e.evt.button === 2) {
        e.cancelBubble = true;
        // Right-click: select element if not already selected
        if (!isSelected) {
          onSelect();
        }
      }
    }
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (state.activeTool === 'select' && e.evt.button === 0) {
      e.cancelBubble = true;
      // For regular elements, select on mouseDown if not already selected
      // Skip for question-answer pairs as they use onClick for sequential selection
      if (!isSelected && !(element.textType === 'question' || element.textType === 'answer')) {
        onSelect();
      }
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    dispatch({
      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
      payload: {
        id: element.id,
        updates: { x: e.target.x(), y: e.target.y() }
      }
    });
    onDragEnd?.(e);
  };

  const defaultHitArea = hitArea || { x: 0, y: 0, width: element.width || 100, height: element.height || 100 };

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      scaleX={(element.textType === 'question' || element.textType === 'answer') ? 1 : (element.scaleX || 1)}
      scaleY={(element.textType === 'question' || element.textType === 'answer') ? 1 : (element.scaleY || 1)}
      rotation={element.rotation || 0}
      draggable={state.activeTool === 'select' && !isMovingGroup}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onTap={(e) => {
        e.cancelBubble = true;
        // For question-answer pairs, always call onSelect for sequential selection
        // For other elements, only call if not already selected
        if (element.textType === 'question' || element.textType === 'answer' || !isSelected) {
          onSelect();
        }
      }}
      onDragStart={(e) => {
        setIsDragging(true);
        onDragStart?.();
      }}
      onDragEnd={(e) => {
        setIsDragging(false);
        handleDragEnd(e);
      }}
      onMouseEnter={state.activeTool === 'select' ? () => {
        setIsHovered(true);
        // Trigger hover on partner element for question-answer pairs
        if (element.textType === 'question' || element.textType === 'answer') {
          window.dispatchEvent(new CustomEvent('hoverPartner', { detail: { elementId: element.id, hover: true } }));
        }
      } : undefined}
      onMouseLeave={state.activeTool === 'select' ? () => {
        setIsHovered(false);
        // Remove hover from partner element for question-answer pairs
        if (element.textType === 'question' || element.textType === 'answer') {
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
      />
      
      {/* Dashed border on hover or within selection */}
      {(isHovered || partnerHovered || isWithinSelection) && state.activeTool === 'select' && (
        <SelectionHoverRectangle
          x={defaultHitArea.x}
          y={defaultHitArea.y}
          width={defaultHitArea.width}
          height={defaultHitArea.height}
        />
      )}
      
      {/* Pass isDragging to children if they are React elements */}
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && typeof child.type !== 'string' && child.type !== React.Fragment) {
          return React.cloneElement(child, { isDragging });
        }
        return child;
      })}
    </Group>
  );
}