import { Path } from 'react-konva';
import rough from 'roughjs';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';

export default function RoughBrush(props: CanvasItemProps) {
  const { element } = props;

  const getBounds = (points: number[]) => {
    let minX = points[0], maxX = points[0];
    let minY = points[1], maxY = points[1];
    
    for (let i = 2; i < points.length; i += 2) {
      minX = Math.min(minX, points[i]);
      maxX = Math.max(maxX, points[i]);
      minY = Math.min(minY, points[i + 1]);
      maxY = Math.max(maxY, points[i + 1]);
    }
    
    return { minX, minY, width: maxX - minX, height: maxY - minY };
  };

  const generateRoughPath = () => {
    if (!element.points || element.points.length < 4) return '';

    const roughness = element.roughness || 1;
    const strokeWidth = element.strokeWidth || 2;
    const stroke = element.stroke || '#1f2937';
    const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;

    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const rc = rough.svg(svg);

      const pathPoints = [];
      for (let i = 0; i < element.points.length; i += 2) {
        pathPoints.push([element.points[i], element.points[i + 1]]);
      }

      if (pathPoints.length > 1) {
        let pathString = `M ${pathPoints[0][0]} ${pathPoints[0][1]}`;
        for (let i = 1; i < pathPoints.length; i++) {
          pathString += ` L ${pathPoints[i][0]} ${pathPoints[i][1]}`;
        }

        const roughElement = rc.path(pathString, {
          roughness,
          strokeWidth,
          stroke,
          seed
        });

        const paths = roughElement.querySelectorAll('path');
        let combinedPath = '';
        paths.forEach(path => {
          const d = path.getAttribute('d');
          if (d) combinedPath += d + ' ';
        });
        return combinedPath.trim();
      }
    } catch (error) {
      console.error('Error generating rough brush path:', error);
    }

    // Fallback to simple path
    if (element.points && element.points.length >= 4) {
      let pathString = `M ${element.points[0]} ${element.points[1]}`;
      for (let i = 2; i < element.points.length; i += 2) {
        pathString += ` L ${element.points[i]} ${element.points[i + 1]}`;
      }
      return pathString;
    }

    return '';
  };

  const pathData = generateRoughPath();
  const strokeWidth = element.strokeWidth || 2;
  const stroke = element.stroke || '#1f2937';

  if (!pathData || !element.points) return null;

  const bounds = getBounds(element.points);
  const hitArea = {
    x: bounds.minX - 10,
    y: bounds.minY - 10,
    width: bounds.width + 20,
    height: bounds.height + 20
  };

  return (
    <BaseCanvasItem {...props} hitArea={hitArea}>
      <Path
        data={pathData}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeScaleEnabled={false}
        fill={undefined}
        listening={false}
      />
    </BaseCanvasItem>
  );
}