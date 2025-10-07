import { useRef, useState } from 'react';
import { Group, Path, Rect } from 'react-konva';
import { SelectionHoverRectangle } from './selection-hover-rectangle';
import Konva from 'konva';
import rough from 'roughjs';
import { useEditor } from '../../../context/editor-context';
import type { CanvasElement } from '../../../context/editor-context';

interface RoughShapeProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart?: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  isMovingGroup?: boolean;
  isWithinSelection?: boolean;
}

export default function RoughShape({ element, isSelected, onSelect, onDragStart, onDragEnd, isMovingGroup, isWithinSelection }: RoughShapeProps) {
  const { state, dispatch } = useEditor();
  const groupRef = useRef<Konva.Group>(null);
  const [isHovered, setIsHovered] = useState(false);

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
        roughElement = rc.line(0, 0, element.width, element.height, {
          roughness,
          strokeWidth,
          stroke,
          seed
        });
      } else if (element.type === 'heart') {
        const w = element.width;
        const h = element.height;
        const heartPath = `M ${w/2} ${h*0.8} C ${w/2} ${h*0.8} ${w*0.1} ${h*0.4} ${w*0.1} ${h*0.25} C ${w*0.1} ${h*0.1} ${w*0.25} ${h*0.05} ${w/2} ${h*0.25} C ${w*0.75} ${h*0.05} ${w*0.9} ${h*0.1} ${w*0.9} ${h*0.25} C ${w*0.9} ${h*0.4} ${w/2} ${h*0.8} ${w/2} ${h*0.8} Z`;
        roughElement = rc.path(heartPath, {
          roughness,
          strokeWidth,
          stroke,
          fill: fill !== 'transparent' ? fill : undefined,
          fillStyle: 'solid',
          seed
        });
      } else if (element.type === 'star') {
        const cx = element.width / 2;
        const cy = element.height / 2;
        const r = Math.min(element.width, element.height) / 2 * 0.8;
        const points = [];
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5;
          const radius = i % 2 === 0 ? r : r * 0.4;
          points.push([cx + radius * Math.cos(angle - Math.PI/2), cy + radius * Math.sin(angle - Math.PI/2)]);
        }
        const starPath = `M ${points[0][0]} ${points[0][1]} ` + points.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') + ' Z';
        roughElement = rc.path(starPath, {
          roughness,
          strokeWidth,
          stroke,
          fill: fill !== 'transparent' ? fill : undefined,
          fillStyle: 'solid',
          seed
        });
      } else if (element.type === 'speech-bubble') {
        const w = element.width;
        const h = element.height;
        const bubblePath = `M ${w*0.1} ${h*0.2} Q ${w*0.1} ${h*0.1} ${w*0.2} ${h*0.1} L ${w*0.8} ${h*0.1} Q ${w*0.9} ${h*0.1} ${w*0.9} ${h*0.2} L ${w*0.9} ${h*0.6} Q ${w*0.9} ${h*0.7} ${w*0.8} ${h*0.7} L ${w*0.3} ${h*0.7} L ${w*0.2} ${h*0.9} L ${w*0.25} ${h*0.7} L ${w*0.2} ${h*0.7} Q ${w*0.1} ${h*0.7} ${w*0.1} ${h*0.6} Z`;
        roughElement = rc.path(bubblePath, {
          roughness,
          strokeWidth,
          stroke,
          fill: fill !== 'transparent' ? fill : undefined,
          fillStyle: 'solid',
          seed
        });
      } else if (element.type === 'dog') {
        const w = element.width;
        const h = element.height;
        const dogPath = `M ${w*0.2} ${h*0.3} C ${w*0.1} ${h*0.2} ${w*0.1} ${h*0.1} ${w*0.2} ${h*0.1} L ${w*0.25} ${h*0.05} C ${w*0.3} ${h*0.02} ${w*0.35} ${h*0.05} ${w*0.4} ${h*0.1} L ${w*0.6} ${h*0.1} C ${w*0.65} ${h*0.05} ${w*0.7} ${h*0.02} ${w*0.75} ${h*0.05} L ${w*0.8} ${h*0.1} C ${w*0.9} ${h*0.1} ${w*0.9} ${h*0.2} ${w*0.8} ${h*0.3} C ${w*0.85} ${h*0.4} ${w*0.85} ${h*0.5} ${w*0.8} ${h*0.6} C ${w*0.75} ${h*0.8} ${w*0.6} ${h*0.9} ${w*0.5} ${h*0.9} C ${w*0.4} ${h*0.9} ${w*0.25} ${h*0.8} ${w*0.2} ${h*0.6} C ${w*0.15} ${h*0.5} ${w*0.15} ${h*0.4} ${w*0.2} ${h*0.3} Z M ${w*0.35} ${h*0.4} C ${w*0.32} ${h*0.37} ${w*0.32} ${h*0.43} ${w*0.35} ${h*0.4} M ${w*0.65} ${h*0.4} C ${w*0.68} ${h*0.37} ${w*0.68} ${h*0.43} ${w*0.65} ${h*0.4} M ${w*0.45} ${h*0.55} L ${w*0.5} ${h*0.6} L ${w*0.55} ${h*0.55}`;

        roughElement = rc.path(dogPath, {
          roughness,
          strokeWidth,
          stroke,
          fill: fill !== 'transparent' ? fill : undefined,
          fillStyle: 'solid',
          seed
        });
      } else if (element.type === 'cat') {
        const w = element.width;
        const h = element.height;
        const catPath = `M ${w*0.2} ${h*0.1} L ${w*0.35} ${h*0.3} C ${w*0.4} ${h*0.25} ${w*0.6} ${h*0.25} ${w*0.65} ${h*0.3} L ${w*0.8} ${h*0.1} C ${w*0.85} ${h*0.15} ${w*0.85} ${h*0.25} ${w*0.8} ${h*0.35} C ${w*0.85} ${h*0.5} ${w*0.85} ${h*0.65} ${w*0.8} ${h*0.8} C ${w*0.7} ${h*0.9} ${w*0.3} ${h*0.9} ${w*0.2} ${h*0.8} C ${w*0.15} ${h*0.65} ${w*0.15} ${h*0.5} ${w*0.2} ${h*0.35} C ${w*0.15} ${h*0.25} ${w*0.15} ${h*0.15} ${w*0.2} ${h*0.1} Z M ${w*0.35} ${h*0.45} C ${w*0.32} ${h*0.42} ${w*0.32} ${h*0.48} ${w*0.35} ${h*0.45} M ${w*0.65} ${h*0.45} C ${w*0.68} ${h*0.42} ${w*0.68} ${h*0.48} ${w*0.65} ${h*0.45}`;

        roughElement = rc.path(catPath, {
          roughness,
          strokeWidth,
          stroke,
          fill: fill !== 'transparent' ? fill : undefined,
          fillStyle: 'solid',
          seed
        });
      } else if (element.type === 'smiley') {
        const w = element.width;
        const h = element.height;
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) / 2 * 0.9;
        // Circle face + filled circle eyes + smile
        const eyeRadius = r * 0.08;
        const leftEyeX = cx - r * 0.3;
        const rightEyeX = cx + r * 0.3;
        const eyeY = cy - r * 0.2;
        const smileyPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} M ${leftEyeX - eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${leftEyeX + eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${leftEyeX - eyeRadius} ${eyeY} Z M ${rightEyeX - eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${rightEyeX + eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${rightEyeX - eyeRadius} ${eyeY} Z M ${cx - r*0.4} ${cy + r*0.2} Q ${cx} ${cy + r*0.5} ${cx + r*0.4} ${cy + r*0.2}`;

        roughElement = rc.path(smileyPath, {
          roughness,
          strokeWidth,
          stroke,
          fill: fill !== 'transparent' ? fill : undefined,
          fillStyle: 'solid',
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
      return `M 0 0 L ${element.width} ${element.height}`;
    } else if (element.type === 'heart') {
      const w = element.width;
      const h = element.height;
      return `M ${w/2} ${h*0.8} C ${w/2} ${h*0.8} ${w*0.1} ${h*0.4} ${w*0.1} ${h*0.25} C ${w*0.1} ${h*0.1} ${w*0.25} ${h*0.05} ${w/2} ${h*0.25} C ${w*0.75} ${h*0.05} ${w*0.9} ${h*0.1} ${w*0.9} ${h*0.25} C ${w*0.9} ${h*0.4} ${w/2} ${h*0.8} ${w/2} ${h*0.8} Z`;
    } else if (element.type === 'star') {
      const cx = element.width / 2;
      const cy = element.height / 2;
      const r = Math.min(element.width, element.height) / 2 * 0.8;
      const points = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5;
        const radius = i % 2 === 0 ? r : r * 0.4;
        points.push([cx + radius * Math.cos(angle - Math.PI/2), cy + radius * Math.sin(angle - Math.PI/2)]);
      }
      return `M ${points[0][0]} ${points[0][1]} ` + points.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') + ' Z';
    } else if (element.type === 'speech-bubble') {
      const w = element.width;
      const h = element.height;
      return `M ${w*0.1} ${h*0.2} Q ${w*0.1} ${h*0.1} ${w*0.2} ${h*0.1} L ${w*0.8} ${h*0.1} Q ${w*0.9} ${h*0.1} ${w*0.9} ${h*0.2} L ${w*0.9} ${h*0.6} Q ${w*0.9} ${h*0.7} ${w*0.8} ${h*0.7} L ${w*0.3} ${h*0.7} L ${w*0.2} ${h*0.9} L ${w*0.25} ${h*0.7} L ${w*0.2} ${h*0.7} Q ${w*0.1} ${h*0.7} ${w*0.1} ${h*0.6} Z`;
    } else if (element.type === 'dog') {
      const w = element.width;
      const h = element.height;
      return `M ${w*0.3} ${h*0.2} Q ${w*0.2} ${h*0.1} ${w*0.1} ${h*0.2} Q ${w*0.1} ${h*0.3} ${w*0.2} ${h*0.35} Q ${w*0.25} ${h*0.4} ${w*0.3} ${h*0.4} Q ${w*0.4} ${h*0.35} ${w*0.5} ${h*0.4} Q ${w*0.6} ${h*0.35} ${w*0.7} ${h*0.4} Q ${w*0.75} ${h*0.4} ${w*0.8} ${h*0.35} Q ${w*0.9} ${h*0.3} ${w*0.9} ${h*0.2} Q ${w*0.8} ${h*0.1} ${w*0.7} ${h*0.2} Q ${w*0.6} ${h*0.3} ${w*0.5} ${h*0.35} Q ${w*0.4} ${h*0.3} ${w*0.3} ${h*0.2} M ${w*0.2} ${h*0.5} Q ${w*0.1} ${h*0.4} ${w*0.1} ${h*0.6} Q ${w*0.15} ${h*0.8} ${w*0.3} ${h*0.9} Q ${w*0.7} ${h*0.9} ${w*0.85} ${h*0.8} Q ${w*0.9} ${h*0.6} ${w*0.9} ${h*0.4} Q ${w*0.8} ${h*0.5} ${w*0.8} ${h*0.5} Q ${w*0.2} ${h*0.5} ${w*0.2} ${h*0.5} Z`;
    } else if (element.type === 'cat') {
      const w = element.width;
      const h = element.height;
      return `M ${w*0.2} ${h*0.1} L ${w*0.3} ${h*0.3} Q ${w*0.5} ${h*0.2} ${w*0.7} ${h*0.3} L ${w*0.8} ${h*0.1} Q ${w*0.85} ${h*0.2} ${w*0.8} ${h*0.35} Q ${w*0.9} ${h*0.5} ${w*0.85} ${h*0.7} Q ${w*0.8} ${h*0.9} ${w*0.6} ${h*0.9} Q ${w*0.4} ${h*0.9} ${w*0.2} ${h*0.9} Q ${w*0.1} ${h*0.7} ${w*0.15} ${h*0.5} Q ${w*0.2} ${h*0.35} ${w*0.15} ${h*0.2} Q ${w*0.2} ${h*0.1} ${w*0.2} ${h*0.1} Z`;
    } else if (element.type === 'smiley') {
      const w = element.width;
      const h = element.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 * 0.9;
      const eyeRadius = r * 0.08;
      const leftEyeX = cx - r * 0.3;
      const rightEyeX = cx + r * 0.3;
      const eyeY = cy - r * 0.2;
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} M ${leftEyeX - eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${leftEyeX + eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${leftEyeX - eyeRadius} ${eyeY} Z M ${rightEyeX - eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${rightEyeX + eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${rightEyeX - eyeRadius} ${eyeY} Z M ${cx - r*0.4} ${cy + r*0.2} Q ${cx} ${cy + r*0.5} ${cx + r*0.4} ${cy + r*0.2}`;
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
        onDragEnd(e);
      }}
      onMouseEnter={state.activeTool === 'select' ? () => setIsHovered(true) : undefined}
      onMouseLeave={state.activeTool === 'select' ? () => setIsHovered(false) : undefined}
    >
      {/* Invisible hit area for easier selection */}
      <Rect
        width={element.width}
        height={element.height}
        fill="transparent"
        listening={true}
        strokeWidth={10}
        stroke="transparent"
      />
      
      {/* Dashed border on hover or within selection */}
      {(isHovered || isWithinSelection) && state.activeTool === 'select' && (
        <SelectionHoverRectangle
          width={element.width}
          height={element.height}
        />
      )}
      
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