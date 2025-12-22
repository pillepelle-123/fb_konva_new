import type { CSSProperties } from 'react';
import { getConsistentColor } from '../../../../utils/consistent-color';

// Badge style constants
export const ACTIVE_BADGE_COLOR = '#304050';
export const ACTIVE_BADGE_TEXT = '#f8fafc';
export const INACTIVE_BADGE_COLOR = '#FFFFFF';
export const INACTIVE_BADGE_TEXT = '#1f2937';
export const INACTIVE_BADGE_TEXT_WITH_PROFILE = '#FFFFFF';
export const INACTIVE_BADGE_BORDER = '#cbd5f5';

// Badge style functions
export const createBadgeStyleWithoutProfile = (isActive: boolean, disabled?: boolean): CSSProperties => ({
  backgroundColor: isActive ? ACTIVE_BADGE_COLOR : INACTIVE_BADGE_COLOR,
  color: isActive ? ACTIVE_BADGE_TEXT : INACTIVE_BADGE_TEXT,
  border: `1px solid ${isActive ? ACTIVE_BADGE_COLOR : INACTIVE_BADGE_BORDER}`,
  borderRadius: 9999,
  padding: '6px 12px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'nowrap',
  whiteSpace: 'nowrap',
  fontSize: '12px',
  fontWeight: 600,
  boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
  cursor: !isActive && !disabled ? 'pointer' : 'default',
  opacity: disabled ? 0.75 : 1
});

export const createBadgeStyleWithProfile = (isActive: boolean, disabled?: boolean, assignedUser?: { name: string } | null): CSSProperties => {
  const backgroundColor = assignedUser
    ? `#${getConsistentColor(assignedUser.name)}`
    : (isActive ? ACTIVE_BADGE_COLOR : INACTIVE_BADGE_COLOR);
  const textColor = assignedUser && isActive
    ? '#ffffff'
    : (isActive ? ACTIVE_BADGE_TEXT : INACTIVE_BADGE_TEXT_WITH_PROFILE);
  const borderColor = assignedUser
    ? backgroundColor
    : (isActive ? ACTIVE_BADGE_COLOR : INACTIVE_BADGE_BORDER);

  // Set opacity: 0.6 for inactive badges with profile picture, otherwise use disabled opacity or 1
  const opacity = disabled ? 0.75 : (!isActive ? 0.6 : 1);

  return {
    backgroundColor,
    color: textColor,
    border: `2px solid ${borderColor}`,
    borderRadius: 9999,
    padding: '0px 0px 0px 8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'nowrap',
    whiteSpace: 'nowrap',
    fontSize: '12px',
    fontWeight: 600,
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
    cursor: !isActive && !disabled ? 'pointer' : 'default',
    opacity
  };
};

export const createMetaTextStyle = (isActive: boolean): CSSProperties => ({
  fontSize: '11px',
  fontWeight: 500,
  opacity: isActive ? 0.9 : 0.75
});

// Pattern creation utility
export const createPatternTile = (pattern: any, color: string, size: number, strokeWidth: number = 1): HTMLCanvasElement => {
  const tileSize = 20 * size;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  if (pattern.id === 'dots') {
    ctx.beginPath();
    ctx.arc(tileSize/2, tileSize/2, tileSize * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (pattern.id === 'grid') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tileSize, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, tileSize);
    ctx.stroke();
  } else if (pattern.id === 'diagonal') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, tileSize);
    ctx.lineTo(tileSize, 0);
    ctx.stroke();
  } else if (pattern.id === 'cross') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, tileSize);
    ctx.lineTo(tileSize, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(tileSize, tileSize);
    ctx.stroke();
  } else if (pattern.id === 'waves') {
    ctx.lineWidth = strokeWidth * 2;
    ctx.beginPath();
    ctx.moveTo(0, tileSize/2);
    ctx.quadraticCurveTo(tileSize/4, 0, tileSize/2, tileSize/2);
    ctx.quadraticCurveTo(3*tileSize/4, tileSize, tileSize, tileSize/2);
    ctx.stroke();
  } else if (pattern.id === 'hexagon') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    const centerX = tileSize/2;
    const centerY = tileSize/2;
    const radius = tileSize * 0.3;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  return canvas;
};

// Path smoothing utility
export const smoothPath = (points: number[]) => {
  if (points.length < 6) return points;

  let smoothed = [...points];

  // Apply multiple smoothing passes for more natural brush curves
  for (let pass = 0; pass < 5; pass++) {
    const newSmoothed: number[] = [];
    newSmoothed.push(smoothed[0], smoothed[1]); // Keep first point

    for (let i = 2; i < smoothed.length - 2; i += 2) {
      const x0 = smoothed[i - 2];
      const y0 = smoothed[i - 1];
      const x1 = smoothed[i];
      const y1 = smoothed[i + 1];
      const x2 = smoothed[i + 2];
      const y2 = smoothed[i + 3];

      // Enhanced smoothing with weighted averaging for natural brush feel
      const smoothX = (x0 + 6 * x1 + x2) / 8;
      const smoothY = (y0 + 6 * y1 + y2) / 8;

      newSmoothed.push(smoothX, smoothY);
    }

    newSmoothed.push(smoothed[smoothed.length - 2], smoothed[smoothed.length - 1]); // Keep last point
    smoothed = newSmoothed;
  }

  return smoothed;
};

// Selection utility functions
export const isPointWithinSelectedElements = (
  x: number,
  y: number,
  currentPage: any,
  selectedElementIds: string[],
  transformerRef: React.RefObject<any>,
  stagePos: { x: number; y: number },
  zoom: number,
  activePageOffsetX: number,
  pageOffsetY: number
) => {
  if (!currentPage || selectedElementIds.length === 0) return false;

  // For multi-selection, check if point is within transformer bounds
  if (selectedElementIds.length > 1 && transformerRef.current) {
    const transformer = transformerRef.current;
    const box = transformer.getClientRect();
    // Convert transformer bounds to page coordinates
    const pageX = (box.x - stagePos.x) / zoom - activePageOffsetX;
    const pageY = (box.y - stagePos.y) / zoom - pageOffsetY;
    const pageWidth = box.width / zoom;
    const pageHeight = box.height / zoom;
    return (
      x >= pageX &&
      x <= pageX + pageWidth &&
      y >= pageY &&
      y <= pageY + pageHeight
    );
  }

  // For single selection, use transformer bounds if available
  if (transformerRef.current && transformerRef.current.nodes().length > 0) {
    const transformer = transformerRef.current;
    const box = transformer.getClientRect();
    const pageX = (box.x - stagePos.x) / zoom - activePageOffsetX;
    const pageY = (box.y - stagePos.y) / zoom - pageOffsetY;
    const pageWidth = box.width / zoom;
    const pageHeight = box.height / zoom;
    return (
      x >= pageX &&
      x <= pageX + pageWidth &&
      y >= pageY &&
      y <= pageY + pageHeight
    );
  }

  return false;
};

export const getElementsInSelection = (
  currentPage: any,
  selectionRect: { x: number; y: number; width: number; height: number },
  activePageOffsetX: number,
  pageOffsetY: number
) => {
  if (!currentPage || selectionRect.width < 5 || selectionRect.height < 5) {
    return [];
  }

  const selectedIds: string[] = [];

  // Adjust selection rectangle for page offset
  const adjustedSelectionRect = {
    x: selectionRect.x - activePageOffsetX,
    y: selectionRect.y - pageOffsetY,
    width: selectionRect.width,
    height: selectionRect.height
  };

  currentPage.elements.forEach((element: any) => {
    // Check if element intersects with selection rectangle
    const elementBounds = {
      x: element.x,
      y: element.y,
      width: element.width || 100,
      height: element.height || 100
    };

    // Calculate bounds for ALL toolbar element types
    if ((element.type === 'brush-multicolor' || element.type === 'group') && element.groupedElements) {
      // For groups and brush-multicolor, calculate bounds from grouped elements
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      element.groupedElements.forEach((groupedEl: any) => {
        if (groupedEl.type === 'brush' && groupedEl.points) {
          for (let i = 0; i < groupedEl.points.length; i += 2) {
            minX = Math.min(minX, groupedEl.x + groupedEl.points[i]);
            maxX = Math.max(maxX, groupedEl.x + groupedEl.points[i]);
            minY = Math.min(minY, groupedEl.y + groupedEl.points[i + 1]);
            maxY = Math.max(maxY, groupedEl.y + groupedEl.points[i + 1]);
          }
        } else {
          minX = Math.min(minX, groupedEl.x);
          maxX = Math.max(maxX, groupedEl.x + (groupedEl.width || 100));
          minY = Math.min(minY, groupedEl.y);
          maxY = Math.max(maxY, groupedEl.y + (groupedEl.height || 100));
        }
      });

      elementBounds.x = element.x + minX;
      elementBounds.y = element.y + minY;
      elementBounds.width = maxX - minX;
      elementBounds.height = maxY - minY;
    } else if (element.type === 'brush' && element.points) {
      // Brush strokes - calculate from points
      let minX = element.points[0], maxX = element.points[0];
      let minY = element.points[1], maxY = element.points[1];

      for (let i = 2; i < element.points.length; i += 2) {
        minX = Math.min(minX, element.points[i]);
        maxX = Math.max(maxX, element.points[i]);
        minY = Math.min(minY, element.points[i + 1]);
        maxY = Math.max(maxY, element.points[i + 1]);
      }

      elementBounds.x = element.x + minX - 10;
      elementBounds.y = element.y + minY - 10;
      elementBounds.width = maxX - minX + 20;
      elementBounds.height = maxY - minY + 20;
    } else if (element.type === 'text') {
      // Text, Question, Answer textboxes
      elementBounds.width = element.width || 150;
      elementBounds.height = element.height || 50;
    } else if (element.type === 'placeholder' || element.type === 'image') {
      // Image placeholders and uploaded images
      elementBounds.width = element.width || 150;
      elementBounds.height = element.height || 100;
    } else if (element.type === 'line') {
      // Line shapes
      elementBounds.width = element.width || 100;
      elementBounds.height = element.height || 10;
    } else if (element.type === 'circle') {
      // Circle shapes
      elementBounds.width = element.width || 80;
      elementBounds.height = element.height || 80;
    } else if (element.type === 'rect') {
      // Rectangle shapes
      elementBounds.width = element.width || 100;
      elementBounds.height = element.height || 50;
    } else {
      // Fallback for any other element types
      elementBounds.width = element.width || 100;
      elementBounds.height = element.height || 100;
    }

    const intersects = (
      adjustedSelectionRect.x < elementBounds.x + elementBounds.width &&
      adjustedSelectionRect.x + adjustedSelectionRect.width > elementBounds.x &&
      adjustedSelectionRect.y < elementBounds.y + elementBounds.height &&
      adjustedSelectionRect.y + adjustedSelectionRect.height > elementBounds.y
    );

    if (intersects) {
      selectedIds.push(element.id);
    }
  });


  return selectedIds;
};
