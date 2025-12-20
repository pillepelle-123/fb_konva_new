import { Rect } from 'react-konva';
import { SAFETY_MARGIN_PX } from '../../../../constants/book-formats';

interface SafetyMarginRectangleProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function SafetyMarginRectangle({
  x,
  y,
  width,
  height
}: SafetyMarginRectangleProps) {

  return (
    <Rect
      x={x + SAFETY_MARGIN_PX}
      y={y + SAFETY_MARGIN_PX}
      width={width - 2 * SAFETY_MARGIN_PX}
      height={height - 2 * SAFETY_MARGIN_PX}
      fill="transparent"
      stroke="#000000"
      strokeWidth={6}
      dash={[6, 6]}
      cornerRadius={8}
      strokeScaleEnabled={false}
      listening={false}
      name="no-print"
      className="no-print"
    />
  );
}
