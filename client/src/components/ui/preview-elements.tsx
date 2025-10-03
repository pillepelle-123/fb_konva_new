import { Line, Rect, Circle } from 'react-konva';

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
        // opacity={0.7}
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
      // opacity={0.7}
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
      strokeWidth={2}
      fill="rgba(37, 99, 235, 0.1)"
      listening={false}
      opacity={0.7}
      dash={[18, 18]}
    />
  );
}

interface PreviewBrushProps {
  points: number[];
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