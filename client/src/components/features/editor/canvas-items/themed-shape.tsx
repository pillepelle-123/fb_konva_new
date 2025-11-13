import { Path, Rect, Group, Circle, Text, Line } from 'react-konva';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';
import { getThemeRenderer } from '../../../../utils/themes';

export default function ThemedShape(props: CanvasItemProps) {
  const { element, isDragging, zoom = 1 } = props;

  // Handle brush-multicolor type
  if (element.type === 'brush-multicolor' && element.brushStrokes) {
    const allBounds = element.brushStrokes.map(stroke => getBounds(stroke.points));
    const minX = Math.min(...allBounds.map(b => b.minX));
    const minY = Math.min(...allBounds.map(b => b.minY));
    const maxX = Math.max(...allBounds.map(b => b.minX + b.width));
    const maxY = Math.max(...allBounds.map(b => b.minY + b.height));
    
    const hitArea = {
      x: minX - 10,
      y: minY - 10,
      width: maxX - minX + 20,
      height: maxY - minY + 20
    };
    
    return (
      <BaseCanvasItem {...props} hitArea={hitArea}>
        <Group listening={false}>
          {element.brushStrokes.map((strokeData, index) => (
            <Line
              key={index}
              points={strokeData.points}
              stroke={strokeData.strokeColor}
              strokeWidth={strokeData.strokeWidth}
              lineCap="round"
              lineJoin="round"
              listening={false}
              tension={0.5}
              globalCompositeOperation="source-over"
              perfectDrawEnabled={false}
            />
          ))}
        </Group>
      </BaseCanvasItem>
    );
  }

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

  // Helper function to convert hex color to rgba with opacity
  const hexToRgba = (hex: string, opacity: number): string => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // Apply stroke opacity by converting stroke color to rgba
  // This allows stroke and fill to have independent opacities
  let finalStrokeColor = strokeProps.stroke;
  if (finalStrokeOpacity !== 1 && strokeProps.stroke && typeof strokeProps.stroke === 'string') {
    // Check if already rgba/rgb
    if (strokeProps.stroke.startsWith('rgba') || strokeProps.stroke.startsWith('rgb')) {
      // Extract RGB values and apply opacity
      const rgbMatch = strokeProps.stroke.match(/(\d+),\s*(\d+),\s*(\d+)/);
      if (rgbMatch) {
        finalStrokeColor = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${finalStrokeOpacity})`;
      } else {
        finalStrokeColor = strokeProps.stroke;
      }
    } else if (strokeProps.stroke.startsWith('#')) {
      // Convert hex to rgba
      finalStrokeColor = hexToRgba(strokeProps.stroke, finalStrokeOpacity);
    } else {
      finalStrokeColor = strokeProps.stroke;
    }
  }

  // Apply fill opacity by converting fill color to rgba
  // This allows fill to have independent opacity from stroke
  let finalFillColor = strokeProps.fill;
  // Convert fill color to rgba if fillOpacity is explicitly set (even if it's 1)
  // OR if opacity is set and different from 1
  const shouldApplyFillOpacity = element.fillOpacity !== undefined || (element.opacity !== undefined && element.opacity !== 1);
  
  if (shouldApplyFillOpacity && strokeProps.fill && typeof strokeProps.fill === 'string' && strokeProps.fill !== 'transparent') {
    // Check if already rgba/rgb
    if (strokeProps.fill.startsWith('rgba')) {
      // Extract RGB values from rgba and replace alpha with finalFillOpacity
      const rgbaMatch = strokeProps.fill.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
      if (rgbaMatch) {
        finalFillColor = `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${finalFillOpacity})`;
      } else {
        finalFillColor = strokeProps.fill;
      }
    } else if (strokeProps.fill.startsWith('rgb')) {
      // Extract RGB values from rgb and add alpha with finalFillOpacity
      const rgbMatch = strokeProps.fill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        finalFillColor = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${finalFillOpacity})`;
      } else {
        finalFillColor = strokeProps.fill;
      }
    } else if (strokeProps.fill.startsWith('#')) {
      // Convert hex to rgba
      finalFillColor = hexToRgba(strokeProps.fill, finalFillOpacity);
    } else {
      finalFillColor = strokeProps.fill;
    }
  }

  if (!pathData) return null;





  // Special handling for multi-strokes theme - SVG organic pattern
  if (theme === 'multi-strokes') {
    const organicPath = pathData;
    
    return (
      <BaseCanvasItem {...props} hitArea={hitArea}>
        <Group listening={false}>
          <Path
            data={pathData}
            fill={strokeProps.fill}
            stroke="transparent"
            listening={false}
            perfectDrawEnabled={false}
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
            perfectDrawEnabled={false}
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
        stroke={finalStrokeColor}
        fill={finalFillColor}
        opacity={1}
        strokeScaleEnabled={false}
        listening={false}
        perfectDrawEnabled={false}
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