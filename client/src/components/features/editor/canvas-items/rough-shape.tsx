import { Path } from 'react-konva';
import rough from 'roughjs';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';

export default function RoughShape(props: CanvasItemProps) {
  const { element } = props;

  const generateRoughPath = () => {
    const roughness = element.roughness || 1;
    const strokeWidth = element.strokeWidth || 2;
    const stroke = element.stroke || '#1f2937';
    const fill = element.fill || 'transparent';
    const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rc = rough.svg(svg);
    
    let roughElement;
    
    try {
      if (element.type === 'rect') {
        roughElement = rc.rectangle(0, 0, element.width, element.height, {
          roughness, strokeWidth, stroke, fill: fill !== 'transparent' ? fill : undefined, fillStyle: 'solid', seed
        });
      } else if (element.type === 'circle') {
        const radius = Math.min(element.width, element.height) / 2;
        roughElement = rc.circle(element.width / 2, element.height / 2, radius * 2, {
          roughness, strokeWidth, stroke, fill: fill !== 'transparent' ? fill : undefined, fillStyle: 'solid', seed
        });
      } else if (element.type === 'line') {
        roughElement = rc.line(0, 0, element.width, element.height, { roughness, strokeWidth, stroke, seed });
      } else if (element.type === 'heart') {
        const w = element.width, h = element.height;
        const heartPath = `M ${w/2} ${h*0.8} C ${w/2} ${h*0.8} ${w*0.1} ${h*0.4} ${w*0.1} ${h*0.25} C ${w*0.1} ${h*0.1} ${w*0.25} ${h*0.05} ${w/2} ${h*0.25} C ${w*0.75} ${h*0.05} ${w*0.9} ${h*0.1} ${w*0.9} ${h*0.25} C ${w*0.9} ${h*0.4} ${w/2} ${h*0.8} ${w/2} ${h*0.8} Z`;
        roughElement = rc.path(heartPath, { roughness, strokeWidth, stroke, fill: fill !== 'transparent' ? fill : undefined, fillStyle: 'solid', seed });
      } else if (element.type === 'star') {
        const cx = element.width / 2, cy = element.height / 2, r = Math.min(element.width, element.height) / 2 * 0.8;
        const points = [];
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5;
          const radius = i % 2 === 0 ? r : r * 0.4;
          points.push([cx + radius * Math.cos(angle - Math.PI/2), cy + radius * Math.sin(angle - Math.PI/2)]);
        }
        const starPath = `M ${points[0][0]} ${points[0][1]} ` + points.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') + ' Z';
        roughElement = rc.path(starPath, { roughness, strokeWidth, stroke, fill: fill !== 'transparent' ? fill : undefined, fillStyle: 'solid', seed });
      } else if (element.type === 'speech-bubble') {
        const w = element.width, h = element.height;
        const bubblePath = `M ${w*0.1} ${h*0.2} Q ${w*0.1} ${h*0.1} ${w*0.2} ${h*0.1} L ${w*0.8} ${h*0.1} Q ${w*0.9} ${h*0.1} ${w*0.9} ${h*0.2} L ${w*0.9} ${h*0.6} Q ${w*0.9} ${h*0.7} ${w*0.8} ${h*0.7} L ${w*0.3} ${h*0.7} L ${w*0.2} ${h*0.9} L ${w*0.25} ${h*0.7} L ${w*0.2} ${h*0.7} Q ${w*0.1} ${h*0.7} ${w*0.1} ${h*0.6} Z`;
        roughElement = rc.path(bubblePath, { roughness, strokeWidth, stroke, fill: fill !== 'transparent' ? fill : undefined, fillStyle: 'solid', seed });
      } else if (element.type === 'dog') {
        const w = element.width, h = element.height;
        const dogPath = `M ${w*0.2} ${h*0.3} C ${w*0.1} ${h*0.2} ${w*0.1} ${h*0.1} ${w*0.2} ${h*0.1} L ${w*0.25} ${h*0.05} C ${w*0.3} ${h*0.02} ${w*0.35} ${h*0.05} ${w*0.4} ${h*0.1} L ${w*0.6} ${h*0.1} C ${w*0.65} ${h*0.05} ${w*0.7} ${h*0.02} ${w*0.75} ${h*0.05} L ${w*0.8} ${h*0.1} C ${w*0.9} ${h*0.1} ${w*0.9} ${h*0.2} ${w*0.8} ${h*0.3} C ${w*0.85} ${h*0.4} ${w*0.85} ${h*0.5} ${w*0.8} ${h*0.6} C ${w*0.75} ${h*0.8} ${w*0.6} ${h*0.9} ${w*0.5} ${h*0.9} C ${w*0.4} ${h*0.9} ${w*0.25} ${h*0.8} ${w*0.2} ${h*0.6} C ${w*0.15} ${h*0.5} ${w*0.15} ${h*0.4} ${w*0.2} ${h*0.3} Z M ${w*0.35} ${h*0.4} C ${w*0.32} ${h*0.37} ${w*0.32} ${h*0.43} ${w*0.35} ${h*0.4} M ${w*0.65} ${h*0.4} C ${w*0.68} ${h*0.37} ${w*0.68} ${h*0.43} ${w*0.65} ${h*0.4} M ${w*0.45} ${h*0.55} L ${w*0.5} ${h*0.6} L ${w*0.55} ${h*0.55}`;
        roughElement = rc.path(dogPath, { roughness, strokeWidth, stroke, fill: fill !== 'transparent' ? fill : undefined, fillStyle: 'solid', seed });
      } else if (element.type === 'cat') {
        const w = element.width, h = element.height;
        const catPath = `M ${w*0.2} ${h*0.1} L ${w*0.35} ${h*0.3} C ${w*0.4} ${h*0.25} ${w*0.6} ${h*0.25} ${w*0.65} ${h*0.3} L ${w*0.8} ${h*0.1} C ${w*0.85} ${h*0.15} ${w*0.85} ${h*0.25} ${w*0.8} ${h*0.35} C ${w*0.85} ${h*0.5} ${w*0.85} ${h*0.65} ${w*0.8} ${h*0.8} C ${w*0.7} ${h*0.9} ${w*0.3} ${h*0.9} ${w*0.2} ${h*0.8} C ${w*0.15} ${h*0.65} ${w*0.15} ${h*0.5} ${w*0.2} ${h*0.35} C ${w*0.15} ${h*0.25} ${w*0.15} ${h*0.15} ${w*0.2} ${h*0.1} Z M ${w*0.35} ${h*0.45} C ${w*0.32} ${h*0.42} ${w*0.32} ${h*0.48} ${w*0.35} ${h*0.45} M ${w*0.65} ${h*0.45} C ${w*0.68} ${h*0.42} ${w*0.68} ${h*0.48} ${w*0.65} ${h*0.45}`;
        roughElement = rc.path(catPath, { roughness, strokeWidth, stroke, fill: fill !== 'transparent' ? fill : undefined, fillStyle: 'solid', seed });
      } else if (element.type === 'smiley') {
        const w = element.width, h = element.height, cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 * 0.9;
        const eyeRadius = r * 0.08, leftEyeX = cx - r * 0.3, rightEyeX = cx + r * 0.3, eyeY = cy - r * 0.2;
        const smileyPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} M ${leftEyeX - eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${leftEyeX + eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${leftEyeX - eyeRadius} ${eyeY} Z M ${rightEyeX - eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${rightEyeX + eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${rightEyeX - eyeRadius} ${eyeY} Z M ${cx - r*0.4} ${cy + r*0.2} Q ${cx} ${cy + r*0.5} ${cx + r*0.4} ${cy + r*0.2}`;
        roughElement = rc.path(smileyPath, { roughness, strokeWidth, stroke, fill: fill !== 'transparent' ? fill : undefined, fillStyle: 'solid', seed });
      }
      
      if (roughElement) {
        const paths = roughElement.querySelectorAll('path');
        let combinedPath = '';
        paths.forEach(path => {
          const d = path.getAttribute('d');
          if (d) combinedPath += d + ' ';
        });
        return combinedPath.trim();
      }
    } catch (error) {
      // Fallback paths
    }
    
    // Fallback to simple paths
    if (element.type === 'rect') {
      return `M 0 0 L ${element.width} 0 L ${element.width} ${element.height} L 0 ${element.height} Z`;
    } else if (element.type === 'circle') {
      const r = Math.min(element.width, element.height) / 2;
      const cx = element.width / 2, cy = element.height / 2;
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
    } else if (element.type === 'line') {
      return `M 0 0 L ${element.width} ${element.height}`;
    }
    
    return '';
  };

  const pathData = generateRoughPath();
  const strokeWidth = element.strokeWidth || 2;
  const stroke = element.stroke || '#1f2937';
  const fill = element.fill !== 'transparent' ? element.fill : undefined;

  return (
    <BaseCanvasItem {...props}>
      <Path
        data={pathData}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeScaleEnabled={false}
        fill={fill}
        listening={false}
      />
    </BaseCanvasItem>
  );
}