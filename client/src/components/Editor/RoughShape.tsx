import { useRef } from 'react';
import { Group, Path, Rect } from 'react-konva';
import Konva from 'konva';
import rough from 'roughjs';
import { useEditor } from '../../context/EditorContext';
import type { CanvasElement } from '../../context/EditorContext';

interface RoughShapeProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart?: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  isMovingGroup?: boolean;
}

export default function RoughShape({ element, isSelected, onSelect, onDragStart, onDragEnd, isMovingGroup }: RoughShapeProps) {
  const { state } = useEditor();
  const groupRef = useRef<Konva.Group>(null);

  const generateRoughPath = () => {
    const roughness = element.roughness || 1;
    const strokeWidth = element.strokeWidth || 2;
    const stroke = element.stroke || '#1f2937';
    const fill = element.fill || 'transparent';
    
    // Use element ID as seed for consistent rendering
    const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
    
    // Create SVG element for rough.js
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rc = rough.svg(svg);
    
    let roughElement;
    
    try {
      if (element.type === 'rect') {
        roughElement = rc.rectangle(0, 0, element.width, element.height, {
          roughness,
          strokeWidth,
          stroke,
          fill: fill !== 'transparent' ? fill : undefined,
          fillStyle: 'solid',
          seed
        });
      } else if (element.type === 'circle') {
        const radius = Math.min(element.width, element.height) / 2;
        roughElement = rc.circle(element.width / 2, element.height / 2, radius * 2, {
          roughness,
          strokeWidth,
          stroke,
          fill: fill !== 'transparent' ? fill : undefined,
          fillStyle: 'solid',
          seed
        });
      } else if (element.type === 'line') {
        roughElement = rc.line(0, element.height / 2, element.width, element.height / 2, {
          roughness,
          strokeWidth,
          stroke,
          seed
        });
      }
      
      if (roughElement) {
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
      // Fallback to simple paths
    }
    
    // Fallback to simple paths
    if (element.type === 'rect') {
      return `M 0 0 L ${element.width} 0 L ${element.width} ${element.height} L 0 ${element.height} Z`;
    } else if (element.type === 'circle') {
      const r = Math.min(element.width, element.height) / 2;
      const cx = element.width / 2;
      const cy = element.height / 2;
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
    } else if (element.type === 'line') {
      return `M 0 ${element.height / 2} L ${element.width} ${element.height / 2}`;
    }
    
    return '';
  };

  const pathData = generateRoughPath();
  const strokeWidth = element.strokeWidth || 2;
  const stroke = element.stroke || '#1f2937';
  const fill = element.fill !== 'transparent' ? element.fill : undefined;

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      scaleX={element.scaleX || 1}
      scaleY={element.scaleY || 1}
      rotation={element.rotation || 0}
      draggable={state.activeTool === 'select' && isSelected && !isMovingGroup}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragStart={() => {
        onDragStart?.();
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const modifiedEvent = {
          ...e,
          target: {
            ...e.target,
            x: () => e.target.x(),
            y: () => e.target.y()
          }
        };
        onDragEnd(modifiedEvent as any);
      }}
    >
      {/* Invisible hit area for easier selection */}
      <Rect
        width={element.width}
        height={element.height}
        fill="transparent"
        listening={true}
      />
      
      {/* Visible rough path */}
      <Path
        data={pathData}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeScaleEnabled={false}
        fill={fill}
        listening={false}
      />
    </Group>
  );
}