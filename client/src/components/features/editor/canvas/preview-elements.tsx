import { Line, Rect, Circle, Path } from 'react-konva';

interface PreviewLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function PreviewLine({ x1, y1, x2, y2 }: PreviewLineProps) {
  return (
    <Line
      points={[x1, y1, x2, y2]}
      stroke="#60B3F9"
      strokeWidth={6}
      lineCap="round"
      listening={false}
      // opacity={0.7}
      dash={[18, 18]}
    />
  );
}

interface PreviewShapeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
}

export function PreviewShape({ x, y, width, height, type }: PreviewShapeProps) {
  const generatePreviewPath = () => {
    if (type === 'triangle') {
      return `M ${width/2} 0 L ${width} ${height} L 0 ${height} Z`;
    } else if (type === 'polygon') {
      const sides = 5;
      const cx = width / 2, cy = height / 2, r = Math.min(width, height) / 2 * 0.9;
      const points = [];
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
      }
      return `M ${points[0][0]} ${points[0][1]} ` + points.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') + ' Z';
    } else if (type === 'heart') {
      return `M ${width/2} ${height*0.8} C ${width/2} ${height*0.8} ${width*0.1} ${height*0.4} ${width*0.1} ${height*0.25} C ${width*0.1} ${height*0.1} ${width*0.25} ${height*0.05} ${width/2} ${height*0.25} C ${width*0.75} ${height*0.05} ${width*0.9} ${height*0.1} ${width*0.9} ${height*0.25} C ${width*0.9} ${height*0.4} ${width/2} ${height*0.8} ${width/2} ${height*0.8} Z`;
    } else if (type === 'star') {
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) / 2 * 0.8;
      const points = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5;
        const radius = i % 2 === 0 ? r : r * 0.4;
        points.push([cx + radius * Math.cos(angle - Math.PI/2), cy + radius * Math.sin(angle - Math.PI/2)]);
      }
      return `M ${points[0][0]} ${points[0][1]} ` + points.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ') + ' Z';
    } else if (type === 'speech-bubble') {
      return `M ${width*0.1} ${height*0.2} Q ${width*0.1} ${height*0.1} ${width*0.2} ${height*0.1} L ${width*0.8} ${height*0.1} Q ${width*0.9} ${height*0.1} ${width*0.9} ${height*0.2} L ${width*0.9} ${height*0.6} Q ${width*0.9} ${height*0.7} ${width*0.8} ${height*0.7} L ${width*0.3} ${height*0.7} L ${width*0.2} ${height*0.9} L ${width*0.25} ${height*0.7} L ${width*0.2} ${height*0.7} Q ${width*0.1} ${height*0.7} ${width*0.1} ${height*0.6} Z`;
    } else if (type === 'dog') {
      return `M ${width*0.2} ${height*0.3} C ${width*0.1} ${height*0.2} ${width*0.1} ${height*0.1} ${width*0.2} ${height*0.1} L ${width*0.25} ${height*0.05} C ${width*0.3} ${height*0.02} ${width*0.35} ${height*0.05} ${width*0.4} ${height*0.1} L ${width*0.6} ${height*0.1} C ${width*0.65} ${height*0.05} ${width*0.7} ${height*0.02} ${width*0.75} ${height*0.05} L ${width*0.8} ${height*0.1} C ${width*0.9} ${height*0.1} ${width*0.9} ${height*0.2} ${width*0.8} ${height*0.3} C ${width*0.85} ${height*0.4} ${width*0.85} ${height*0.5} ${width*0.8} ${height*0.6} C ${width*0.75} ${height*0.8} ${width*0.6} ${height*0.9} ${width*0.5} ${height*0.9} C ${width*0.4} ${height*0.9} ${width*0.25} ${height*0.8} ${width*0.2} ${height*0.6} C ${width*0.15} ${height*0.5} ${width*0.15} ${height*0.4} ${width*0.2} ${height*0.3} Z M ${width*0.35} ${height*0.4} C ${width*0.32} ${height*0.37} ${width*0.32} ${height*0.43} ${width*0.35} ${height*0.4} M ${width*0.65} ${height*0.4} C ${width*0.68} ${height*0.37} ${width*0.68} ${height*0.43} ${width*0.65} ${height*0.4} M ${width*0.45} ${height*0.55} L ${width*0.5} ${height*0.6} L ${width*0.55} ${height*0.55}`;
    } else if (type === 'cat') {
      return `M ${width*0.2} ${height*0.1} L ${width*0.35} ${height*0.3} C ${width*0.4} ${height*0.25} ${width*0.6} ${height*0.25} ${width*0.65} ${height*0.3} L ${width*0.8} ${height*0.1} C ${width*0.85} ${height*0.15} ${width*0.85} ${height*0.25} ${width*0.8} ${height*0.35} C ${width*0.85} ${height*0.5} ${width*0.85} ${height*0.65} ${width*0.8} ${height*0.8} C ${width*0.7} ${height*0.9} ${width*0.3} ${height*0.9} ${width*0.2} ${height*0.8} C ${width*0.15} ${height*0.65} ${width*0.15} ${height*0.5} ${width*0.2} ${height*0.35} C ${width*0.15} ${height*0.25} ${width*0.15} ${height*0.15} ${width*0.2} ${height*0.1} Z M ${width*0.35} ${height*0.45} C ${width*0.32} ${height*0.42} ${width*0.32} ${height*0.48} ${width*0.35} ${height*0.45} M ${width*0.65} ${height*0.45} C ${width*0.68} ${height*0.42} ${width*0.68} ${height*0.48} ${width*0.65} ${height*0.45}`;
    } else if (type === 'smiley') {
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) / 2 * 0.9;
      const eyeRadius = r * 0.08;
      const leftEyeX = cx - r * 0.3;
      const rightEyeX = cx + r * 0.3;
      const eyeY = cy - r * 0.2;
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} M ${leftEyeX - eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${leftEyeX + eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${leftEyeX - eyeRadius} ${eyeY} Z M ${rightEyeX - eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${rightEyeX + eyeRadius} ${eyeY} A ${eyeRadius} ${eyeRadius} 0 1 1 ${rightEyeX - eyeRadius} ${eyeY} Z M ${cx - r*0.4} ${cy + r*0.2} Q ${cx} ${cy + r*0.5} ${cx + r*0.4} ${cy + r*0.2}`;
    }
    return null;
  };

  const pathData = generatePreviewPath();

  if (pathData) {
    return (
      <Path
        x={x}
        y={y}
        data={pathData}
        stroke="#60B3F9"
        strokeWidth={6}
        fill="transparent"
        listening={false}
        dash={[18, 18]}
      />
    );
  }

  if (type === 'rect') {
    return (
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke="#60B3F9"
        strokeWidth={6}
        fill="transparent"
        listening={false}
        dash={[18, 18]}
      />
    );
  }

  return (
    <Circle
      x={x + width / 2}
      y={y + height / 2}
      radius={Math.min(width, height) / 2}
      stroke="#60B3F9"
      strokeWidth={6}
      fill="transparent"
      listening={false}
      dash={[18, 18]}
    />
  );
}

interface PreviewTextboxProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function PreviewTextbox({ x, y, width, height }: PreviewTextboxProps) {
  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      stroke="#60B3F9"
      strokeWidth={6}
      fill="transparent"
      listening={false}
      // opacity={0.7}
      dash={[18, 18]}
    />
  );
}

interface PreviewBrushProps {
  points: number[];
}

interface MaterializedBrushProps {
  points: number[];
  stroke: string;
  strokeWidth: number;
}

export function PreviewBrush({ points }: PreviewBrushProps) {
  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      stroke="#1f2937"
      strokeWidth={2}
      lineCap="round"
      lineJoin="round"
      listening={false}
      opacity={0.7}
      dash={[18, 18]}
    />
  );
}

interface MaterializedBrushProps {
  points: number[];
  stroke: string;
  strokeWidth: number;
}

export function MaterializedBrush({ points, stroke, strokeWidth }: MaterializedBrushProps) {
  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      stroke={stroke}
      strokeWidth={strokeWidth}
      lineCap="round"
      lineJoin="round"
      listening={false}
      tension={0.5}
      globalCompositeOperation="source-over"
    />
  );
}