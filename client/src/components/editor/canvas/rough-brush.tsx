import { useRef, useState } from 'react';
import { Group, Path, Rect } from 'react-konva';
import { SelectionHoverRectangle } from './selection-hover-rectangle';
import Konva from 'konva';
import rough from 'roughjs';
import { useEditor } from '../../../context/editor-context';
import type { CanvasElement } from '../../../context/editor-context';

interface RoughBrushProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart?: () => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  isMovingGroup?: boolean;
  isWithinSelection?: boolean;
}

export default function RoughBrush({ element, isSelected, onSelect, onDragStart, onDragEnd, isMovingGroup, isWithinSelection }: RoughBrushProps) {
  const { state, dispatch } = useEditor();
  const groupRef = useRef<Konva.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

  const getBounds = (points: number[]) => {
    let minX = points[0], maxX = points[0];
    let minY = points[1], maxY = points[1];
    
    for (let i = 2; i < points.length; i += 2) {
      minX = Math.min(minX, points[i]);
      maxX = Math.max(maxX, points[i]);
      minY = Math.min(minY, points[i + 1]);
      maxY = Math.max(maxY, points[i + 1]);
    }
    
    return {
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY
    };
  };

  const generateRoughPath = () => {
    if (!element.points || element.points.length < 4) return '';

    const roughness = element.roughness || 1;
    const strokeWidth = element.strokeWidth || 2;
    const stroke = element.stroke || '#1f2937';
    
    // Use element ID as seed for consistent rendering
    const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;

    try {
      // Create SVG element for rough.js
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const rc = rough.svg(svg);

      // Convert points to path string
      const pathPoints = [];
      for (let i = 0; i < element.points.length; i += 2) {
        pathPoints.push([element.points[i], element.points[i + 1]]);
      }

      if (pathPoints.length > 1) {
        // Create SVG path string
        let pathString = `M ${pathPoints[0][0]} ${pathPoints[0][1]}`;
        for (let i = 1; i < pathPoints.length; i++) {
          pathString += ` L ${pathPoints[i][0]} ${pathPoints[i][1]}`;
        }

        const roughElement = rc.path(pathString, {
          roughness,
          strokeWidth,
          stroke,
          seed
        });

        // Extract path data from SVG
        const paths = roughElement.querySelectorAll('path');
        let combinedPath = '';
        paths.forEach(path => {
          const d = path.getAttribute('d');
          if (d) combinedPath += d + ' ';
        });
        return combinedPath.trim();
      }
    } catch (error) {
      console.error('Error generating rough brush path:', error);
    }

    // Fallback to simple path
    if (element.points && element.points.length >= 4) {
      let pathString = `M ${element.points[0]} ${element.points[1]}`;
      for (let i = 2; i < element.points.length; i += 2) {
        pathString += ` L ${element.points[i]} ${element.points[i + 1]}`;
      }
      return pathString;
    }

    return '';
  };

  const pathData = generateRoughPath();
  const strokeWidth = element.strokeWidth || 2;
  const stroke = element.stroke || '#1f2937';

  if (!pathData || !element.points) return null;

  const bounds = getBounds(element.points);

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={(element.x || 0)}
      y={(element.y || 0)}
      scaleX={element.scaleX || 1}
      scaleY={element.scaleY || 1}
      rotation={element.rotation || 0}
      draggable={state.activeTool === 'select' && !isMovingGroup}
      onMouseDown={(e) => {
        if (state.activeTool === 'select' && e.evt.button === 0) {
          e.cancelBubble = true;
          if (!isSelected) {
            onSelect();
          }
        }
      }}
      onClick={(e) => {
        if (state.activeTool === 'select') {
          if (e.evt.button === 0) {
            // Only handle left-click for selection
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
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragStart={onDragStart}
      onDragEnd={(e) => {
        dispatch({
          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
          payload: {
            id: element.id,
            updates: { x: e.target.x(), y: e.target.y() }
          }
        });
        onDragEnd?.(e);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Invisible hit area for easier selection */}
      <Rect
        x={bounds.minX - 10}
        y={bounds.minY - 10}
        width={bounds.width + 20}
        height={bounds.height + 20}
        fill="transparent"
        listening={true}
      />
      
      {/* Dashed border on hover or within selection */}
      {(isHovered || isWithinSelection) && (
        <SelectionHoverRectangle
          x={bounds.minX - 10}
          y={bounds.minY - 10}
          width={bounds.width + 20}
          height={bounds.height + 20}
        />
      )}
      
      {/* Visible rough path */}
      <Path
        data={pathData}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeScaleEnabled={false}
        fill={undefined}
        listening={false}
      />
    </Group>
  );
}