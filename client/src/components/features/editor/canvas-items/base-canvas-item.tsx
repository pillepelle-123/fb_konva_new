import { useRef, useState, ReactNode } from 'react';
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
        onSelect();
      } else if (e.evt.button === 2) {
        // Prevent right-click selection when multi-selection is active
        if (state.selectedElementIds.length > 1) {
          e.cancelBubble = true;
          return;
        }
        // Right-click on selected item - don't change selection
        if (isSelected) {
          return;
        }
      }
    }
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (state.activeTool === 'select' && e.evt.button === 0) {
      e.cancelBubble = true;
      if (!isSelected) {
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
      scaleX={element.scaleX || 1}
      scaleY={element.scaleY || 1}
      rotation={element.rotation || 0}
      draggable={state.activeTool === 'select' && !isMovingGroup}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragStart={onDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={state.activeTool === 'select' ? () => setIsHovered(true) : undefined}
      onMouseLeave={state.activeTool === 'select' ? () => setIsHovered(false) : undefined}
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
      {(isHovered || isWithinSelection) && state.activeTool === 'select' && (
        <SelectionHoverRectangle
          x={defaultHitArea.x}
          y={defaultHitArea.y}
          width={defaultHitArea.width}
          height={defaultHitArea.height}
        />
      )}
      
      {children}
    </Group>
  );
}