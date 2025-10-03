import { Rect } from 'react-konva';

interface SelectionRectangleProps {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export function SelectionRectangle({ x, y, width, height, visible }: SelectionRectangleProps) {
  if (!visible) return null;

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(37, 99, 235, 0.1)"
      stroke="#2563eb"
      strokeWidth={1}
      dash={[5, 5]}
      listening={false}
    />
  );
}