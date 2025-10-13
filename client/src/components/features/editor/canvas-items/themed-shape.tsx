import { Path, Rect, Group, Circle, Text } from 'react-konva';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';
import { getThemeRenderer } from '../../../../utils/themes';

export default function ThemedShape(props: CanvasItemProps) {
  const { element, isDragging, zoom = 1 } = props;

  const theme = element.theme || 'rough';
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
          fill={element.fill !== 'transparent' ? element.fill : 'rgba(0, 0, 255, 0.3)'}
          stroke={element.stroke || '#1f2937'}
          strokeWidth={(element.strokeWidth || 2) * zoom * 2}
          cornerRadius={element.type === 'rect' && element.cornerRadius ? element.cornerRadius : 0}
          opacity={0.8}
          listening={false}
        />
      </BaseCanvasItem>
    );
  }

  const pathData = renderer.generatePath(element, zoom);
  const strokeProps = renderer.getStrokeProps(element, zoom);

  // Apply opacity values from element settings
  if (element.strokeOpacity !== undefined) {
    strokeProps.opacity = (strokeProps.opacity || 1) * element.strokeOpacity;
  }
  if (element.fillOpacity !== undefined && strokeProps.fill) {
    strokeProps.fillOpacity = element.fillOpacity;
  }

  if (!pathData) return null;

  // Special handling for candy theme - circles along path
  if (theme === 'candy') {
    const circles = [];
    const baseCircleSize = (element.strokeWidth || 2) * 0.8;
    const spacing = baseCircleSize * 1.5;
    const hasRandomness = element.candyRandomness || false;
    
    if (element.type === 'brush' && element.points) {
      const points = element.points;
      let totalLength = 0;
      const segments = [];
      
      for (let i = 0; i < points.length - 2; i += 2) {
        const dx = points[i + 2] - points[i];
        const dy = points[i + 3] - points[i + 1];
        const length = Math.sqrt(dx * dx + dy * dy);
        segments.push({ start: i, length, totalLength });
        totalLength += length;
      }
      
      const numCircles = Math.floor(totalLength / spacing) + 1;
      
      for (let i = 0; i < numCircles; i++) {
        const targetDistance = (i / (numCircles - 1)) * totalLength;
        let currentDistance = 0;
        let segmentIndex = 0;
        
        while (segmentIndex < segments.length && currentDistance + segments[segmentIndex].length < targetDistance) {
          currentDistance += segments[segmentIndex].length;
          segmentIndex++;
        }
        
        if (segmentIndex < segments.length) {
          const segment = segments[segmentIndex];
          const t = (targetDistance - currentDistance) / segment.length;
          const startIdx = segment.start;
          
          const x = points[startIdx] + t * (points[startIdx + 2] - points[startIdx]);
          const y = points[startIdx + 1] + t * (points[startIdx + 3] - points[startIdx + 1]);
          
          const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 4), 10) || 1;
          const random = () => {
            const x = Math.sin(seed + i) * 10000;
            return x - Math.floor(x);
          };
          const getVariationAmount = () => {
            if (!hasRandomness) return 0;
            const intensity = element.candyIntensity || 'weak';
            switch (intensity) {
              case 'middle': return 1.0;
              case 'strong': return 1.5;
              default: return 0.4; // weak
            }
          };
          const sizeVariation = hasRandomness ? 1 + (random() - 0.5) * getVariationAmount() : 1;
          const circleSize = baseCircleSize * sizeVariation;
          
          circles.push(
            <Circle
              key={i}
              x={x}
              y={y}
              radius={circleSize / 2}
              fill={strokeProps.stroke}
              opacity={strokeProps.opacity}
              listening={false}
            />
          );
        }
      }
    } else if (element.type === 'line') {
      const length = Math.sqrt(element.width * element.width + element.height * element.height);
      const numCircles = Math.floor(length / spacing) + 1;
      
      for (let i = 0; i < numCircles; i++) {
        const t = i / (numCircles - 1);
        const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 4), 10) || 1;
        const random = () => {
          const x = Math.sin(seed + i) * 10000;
          return x - Math.floor(x);
        };
        const getVariationAmount = () => {
          if (!hasRandomness) return 0;
          const intensity = element.candyIntensity || 'weak';
          switch (intensity) {
            case 'middle': return 0.7;
            case 'strong': return 1.0;
            default: return 0.4; // weak
          }
        };
        const sizeVariation = hasRandomness ? 1 + (random() - 0.5) * getVariationAmount() : 1;
        const circleSize = baseCircleSize * sizeVariation;
        
        circles.push(
          <Circle
            key={i}
            x={element.width * t}
            y={element.height * t}
            radius={circleSize / 2}
            fill={strokeProps.stroke}
            opacity={strokeProps.opacity}
            listening={false}
          />
        );
      }
    } else if (element.type === 'rect') {
      // Add background rectangle for fill color
      if (element.fill && element.fill !== 'transparent') {
        circles.push(
          <Rect
            key="background"
            x={0}
            y={0}
            width={element.width}
            height={element.height}
            fill={element.fill}
            opacity={element.fillOpacity || 1}
            cornerRadius={element.cornerRadius || 0}
            listening={false}
          />
        );
      }
      
      const topCircles = Math.max(1, Math.floor(element.width / spacing));
      const rightCircles = Math.max(1, Math.floor(element.height / spacing));
      const bottomCircles = Math.max(1, Math.floor(element.width / spacing));
      const leftCircles = Math.max(1, Math.floor(element.height / spacing));
      
      const sides = [
        { count: topCircles, getPos: (i: number) => ({ x: (i + 0.5) * element.width / topCircles, y: 0 }) },
        { count: rightCircles, getPos: (i: number) => ({ x: element.width, y: (i + 0.5) * element.height / rightCircles }) },
        { count: bottomCircles, getPos: (i: number) => ({ x: element.width - (i + 0.5) * element.width / bottomCircles, y: element.height }) },
        { count: leftCircles, getPos: (i: number) => ({ x: 0, y: element.height - (i + 0.5) * element.height / leftCircles }) }
      ];
      
      let circleIndex = 0;
      sides.forEach(side => {
        for (let i = 0; i < side.count; i++) {
          const { x, y } = side.getPos(i);
        
          const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 4), 10) || 1;
          const random = () => {
            const x = Math.sin(seed + circleIndex) * 10000;
            return x - Math.floor(x);
          };
          const getVariationAmount = () => {
            if (!hasRandomness) return 0;
            const intensity = element.candyIntensity || 'weak';
            switch (intensity) {
              case 'middle': return 1.0;
              case 'strong': return 1.4;
              default: return 0.7; // weak
            }
          };
          const sizeVariation = hasRandomness ? 1 + (random() - 0.5) * getVariationAmount() : 1;
          const circleSize = baseCircleSize * sizeVariation;
          
          circles.push(
            <Circle
              key={circleIndex}
              x={x}
              y={y}
              radius={circleSize / 2}
              fill={strokeProps.stroke}
              opacity={strokeProps.opacity}
              listening={false}
            />
          );
          circleIndex++;
        }
      });
    } else if (element.type === 'circle') {
      const cx = element.width / 2;
      const cy = element.height / 2;
      const radius = Math.min(element.width, element.height) / 2;
      
      // Add background circle for fill color
      if (element.fill && element.fill !== 'transparent') {
        circles.push(
          <Circle
            key="background"
            x={cx}
            y={cy}
            radius={radius}
            fill={element.fill}
            opacity={element.fillOpacity || 1}
            listening={false}
          />
        );
      }
      
      const circumference = 2 * Math.PI * radius;
      const numCircles = Math.floor(circumference / spacing);
      
      for (let i = 0; i < numCircles; i++) {
        const angle = (i / numCircles) * Math.PI * 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        
        const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 4), 10) || 1;
        const random = () => {
          const x = Math.sin(seed + i) * 10000;
          return x - Math.floor(x);
        };
        const getVariationAmount = () => {
          if (!hasRandomness) return 0;
          const intensity = element.candyIntensity || 'weak';
          switch (intensity) {
            case 'middle': return 0.7;
            case 'strong': return 1.0;
            default: return 0.4; // weak
          }
        };
        const sizeVariation = hasRandomness ? 1 + (random() - 0.5) * getVariationAmount() : 1;
        const circleSize = baseCircleSize * sizeVariation;
        
        circles.push(
          <Circle
            key={i}
            x={x}
            y={y}
            radius={circleSize / 2}
            fill={strokeProps.stroke}
            opacity={strokeProps.opacity}
            listening={false}
          />
        );
      }
    }
    
    return (
      <BaseCanvasItem {...props} hitArea={hitArea}>
        <Group>{circles}</Group>
      </BaseCanvasItem>
    );
  }



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
        fillOpacity={strokeProps.fillOpacity}
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