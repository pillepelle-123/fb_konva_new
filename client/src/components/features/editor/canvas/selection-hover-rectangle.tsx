import { Rect } from 'react-konva';

interface SelectionHoverRectangleProps {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export function SelectionHoverRectangle({ 
  x = 0, 
  y = 0, 
  width, 
  height, 
}: SelectionHoverRectangleProps) {
  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="transparent"
      stroke="#d0d7e0ff"
      strokeWidth={2}
      dash={[6, 6]}
      cornerRadius={8}
      strokeScaleEnabled={false}
      listening={false}
      name="no-print"
    />
  );
}