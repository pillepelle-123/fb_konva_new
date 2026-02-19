import { Group, Rect } from 'react-konva';

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
    <Group listening={false} name="no-print">
      {/* Hintergrund: 20% transparent */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={finalStroke}
        opacity={0.4}
        cornerRadius={8}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Border: vollständig sichtbar */}
      {/* <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        stroke={finalStroke}
        strokeWidth={10}
        dash={[10, 10]}
        cornerRadius={8}
        strokeScaleEnabled={false}
        listening={false}
      /> */}
    </Group>
  );
}