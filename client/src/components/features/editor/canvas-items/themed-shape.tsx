import { Path, Rect, Group, Circle, Text } from 'react-konva';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';
import { getThemeRenderer } from '../../../../utils/themes';

export default function ThemedShape(props: CanvasItemProps) {
  const { element, isDragging, zoom = 1 } = props;

  const theme = element.inheritTheme || element.theme || 'rough';
  const renderer = getThemeRenderer(theme);

  // Calculate hit area for brush strokes
  const hitArea = element.type === 'brush' && element.points ? (() => {
    const bounds = getBounds(element.points);
    return {
      x: bounds.minX - 10,
      y: bounds.minY - 10,
      width: bounds.width + 20,
      height: bounds.height + 20
    };
  })() : undefined;

  // Use simplified rectangle during dragging for better performance
  if (isDragging) {
    const bounds = element.type === 'brush' && element.points ? getBounds(element.points) : null;
    
    return (
      <BaseCanvasItem {...props} hitArea={hitArea}>
        <Rect
          x={bounds?.minX || 0}
          y={bounds?.minY || 0}
          width={bounds?.width || element.width}
          height={bounds?.height || element.height}
          fill={element.type === 'brush' ? 'transparent' : (element.fill !== 'transparent' ? element.fill : 'rgba(0, 0, 255, 0.3)')}
          stroke={element.stroke || '#1f2937'}
          strokeWidth={element.strokeWidth ? element.strokeWidth * zoom * 2 : 0}
          cornerRadius={element.type === 'rect' && element.cornerRadius ? element.cornerRadius : 0}
          opacity={0.8}
          listening={false}
        />
      </BaseCanvasItem>
    );
  }

  const pathData = renderer.generatePath(element, zoom);
  const strokeProps = renderer.getStrokeProps(element, zoom);

  const finalStrokeOpacity = element.strokeOpacity !== undefined ? element.strokeOpacity : (element.opacity !== undefined ? element.opacity : 1);
  const finalFillOpacity = element.fillOpacity !== undefined ? element.fillOpacity : (element.opacity !== undefined ? element.opacity : 1);

  if (!pathData) return null;





  // Special handling for multi-strokes theme - SVG organic pattern
  if (theme === 'multi-strokes') {
    const organicPath = pathData;
    
    return (
      <BaseCanvasItem {...props} hitArea={hitArea}>
        <Group>
          <Path
            data={pathData}
            fill={strokeProps.fill}
            stroke="transparent"
            listening={false}
          />
          <Path
            data={organicPath}
            stroke={strokeProps.stroke}
            strokeWidth={strokeProps.strokeWidth * 1.5}
            fill="none"
            strokeScaleEnabled={false}
            listening={false}
            lineCap="round"
            lineJoin="round"
          />
        </Group>
      </BaseCanvasItem>
    );
  }

  return (
    <BaseCanvasItem {...props} hitArea={hitArea}>
      <Path
        data={pathData}
        {...strokeProps}
        opacity={finalStrokeOpacity}
        fillOpacity={finalFillOpacity}
        strokeScaleEnabled={false}
        listening={false}
      />
    </BaseCanvasItem>
  );
}

function getBounds(points: number[]) {
  let minX = points[0], maxX = points[0];
  let minY = points[1], maxY = points[1];
  
  for (let i = 2; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }
  
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}