import { Group, Rect } from 'react-konva';

interface SelectionHoverRectangleProps {
  x?: number;
  y?: number;
  width: number;
  height: number;
  lighter?: boolean;
  strokeColor?: string;
}

/** Gestricheltes Rechteck bei Hover/Selection – QNA2-Buttons werden im Overlay gerendert */
export function SelectionHoverRectangle({
  x = 0,
  y = 0,
  width,
  height,
  lighter = false,
  strokeColor,
}: SelectionHoverRectangleProps) {
  const defaultStroke = lighter ? '#e5e7eb' : '#d0d7e0ff';
  const finalStroke = strokeColor || defaultStroke;

  return (
    <Group listening={false} name="no-print">
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
    </Group>
  );
}
