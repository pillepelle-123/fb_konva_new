import { Rect } from 'react-konva';

interface SelectionHoverRectangleProps {
  x?: number;
  y?: number;
  width: number;
  height: number;
  lighter?: boolean;
  strokeColor?: string; // Optional custom stroke color (e.g., from calculateContrastColor)
}

export function SelectionHoverRectangle({ 
  x = 0, 
  y = 0, 
  width, 
  height,
  lighter = false,
  strokeColor
}: SelectionHoverRectangleProps) {
  // Use custom stroke color if provided, otherwise use default colors
  const defaultStroke = lighter ? "#e5e7eb" : "#d0d7e0ff";
  const finalStroke = strokeColor || defaultStroke;
  
  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={finalStroke}
      stroke={finalStroke}
      strokeWidth={10}
      dash={[10, 10]}
      cornerRadius={8}
      strokeScaleEnabled={false}
      listening={false}
      name="no-print"
    />
  );
}