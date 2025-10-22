import Konva from 'konva';
import type { CanvasElement, Page } from '../context/editor-context';

const GUIDELINE_OFFSET = 25;

export interface SnapGuideline {
  type: 'vertical' | 'horizontal';
  position: number;
  canvasWidth: number;
  canvasHeight: number;
  pageOffsetX: number;
  pageOffsetY: number;
}

export const snapToGrid = (value: number, gridSize: number = 10): number => {
  return Math.round(value / gridSize) * gridSize;
};

export const snapToElements = (
  node: Konva.Node,
  x: number,
  y: number,
  currentPage: Page,
  canvasWidth: number,
  canvasHeight: number,
  pageOffsetX: number,
  pageOffsetY: number,
  stageRef: React.RefObject<Konva.Stage>
): { x: number; y: number; guidelines: SnapGuideline[] } => {
  // Safety checks
  if (!currentPage || !node || !stageRef.current || typeof x !== 'number' || typeof y !== 'number') {
    return { x, y, guidelines: [] };
  }

  let snappedX = x;
  let snappedY = y;
  const guidelines: SnapGuideline[] = [];
  
  // Get node dimensions with safety checks
  let nodeWidth = 0;
  let nodeHeight = 0;
  
  try {
    nodeWidth = (node.width() || 0) * (node.scaleX() || 1);
    nodeHeight = (node.height() || 0) * (node.scaleY() || 1);
  } catch (e) {
    // Fallback if node methods fail
  }
  
  if (nodeWidth === 0 || nodeHeight === 0) {
    const elementId = node.id();
    const element = currentPage.elements?.find(el => el.id === elementId);
    if (element) {
      nodeWidth = element.width || 100;
      nodeHeight = element.height || 50;
    }
  }

  currentPage.elements?.forEach(element => {
    if (!element) return;
    
    const stage = stageRef.current;
    if (!stage) return;
    
    try {
      const otherNode = stage.findOne(`#${element.id}`);
      if (otherNode === node || !otherNode) return;

      const elementWidth = element.width || 0;
      const elementHeight = element.height || 0;

    // Edge snapping
    const leftToLeft = Math.abs(x - element.x);
    if (leftToLeft < GUIDELINE_OFFSET) {
      snappedX = element.x;
      guidelines.push({
        type: 'vertical',
        position: pageOffsetX + element.x,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const leftToRight = Math.abs(x - (element.x + elementWidth));
    if (leftToRight < GUIDELINE_OFFSET) {
      snappedX = element.x + elementWidth;
      guidelines.push({
        type: 'vertical',
        position: pageOffsetX + element.x + elementWidth,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const rightToLeft = Math.abs((x + nodeWidth) - element.x);
    if (rightToLeft < GUIDELINE_OFFSET) {
      snappedX = element.x - nodeWidth;
      guidelines.push({
        type: 'vertical',
        position: pageOffsetX + element.x,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const rightToRight = Math.abs((x + nodeWidth) - (element.x + elementWidth));
    if (rightToRight < GUIDELINE_OFFSET) {
      snappedX = element.x + elementWidth - nodeWidth;
      guidelines.push({
        type: 'vertical',
        position: pageOffsetX + element.x + elementWidth,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const topToTop = Math.abs(y - element.y);
    if (topToTop < GUIDELINE_OFFSET) {
      snappedY = element.y;
      guidelines.push({
        type: 'horizontal',
        position: pageOffsetY + element.y,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const topToBottom = Math.abs(y - (element.y + elementHeight));
    if (topToBottom < GUIDELINE_OFFSET) {
      snappedY = element.y + elementHeight;
      guidelines.push({
        type: 'horizontal',
        position: pageOffsetY + element.y + elementHeight,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const bottomToTop = Math.abs((y + nodeHeight) - element.y);
    if (bottomToTop < GUIDELINE_OFFSET) {
      snappedY = element.y - nodeHeight;
      guidelines.push({
        type: 'horizontal',
        position: pageOffsetY + element.y,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const bottomToBottom = Math.abs((y + nodeHeight) - (element.y + elementHeight));
    if (bottomToBottom < GUIDELINE_OFFSET) {
      snappedY = element.y + elementHeight - nodeHeight;
      guidelines.push({
        type: 'horizontal',
        position: pageOffsetY + element.y + elementHeight,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }

    // Center snapping
    const centerX = x + nodeWidth / 2;
    const elementCenterX = element.x + elementWidth / 2;
    const centerToCenter = Math.abs(centerX - elementCenterX);
    if (centerToCenter < GUIDELINE_OFFSET) {
      snappedX = elementCenterX - nodeWidth / 2;
      guidelines.push({
        type: 'vertical',
        position: pageOffsetX + elementCenterX,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const centerY = y + nodeHeight / 2;
    const elementCenterY = element.y + elementHeight / 2;
    const centerToCenterY = Math.abs(centerY - elementCenterY);
    if (centerToCenterY < GUIDELINE_OFFSET) {
      snappedY = elementCenterY - nodeHeight / 2;
      guidelines.push({
        type: 'horizontal',
        position: pageOffsetY + elementCenterY,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    } catch (e) {
      // Skip this element if there's an error
      return;
    }
  });

  // Canvas edge snapping
  const leftEdge = Math.abs(x);
  if (leftEdge < GUIDELINE_OFFSET) {
    snappedX = 0;
    guidelines.push({
      type: 'vertical',
      position: pageOffsetX,
      canvasWidth,
      canvasHeight,
      pageOffsetX,
      pageOffsetY
    });
  }
  
  const rightEdge = Math.abs(x + nodeWidth - canvasWidth);
  if (rightEdge < GUIDELINE_OFFSET) {
    snappedX = canvasWidth - nodeWidth;
    guidelines.push({
      type: 'vertical',
      position: pageOffsetX + canvasWidth,
      canvasWidth,
      canvasHeight,
      pageOffsetX,
      pageOffsetY
    });
  }
  
  const topEdge = Math.abs(y);
  if (topEdge < GUIDELINE_OFFSET) {
    snappedY = 0;
    guidelines.push({
      type: 'horizontal',
      position: pageOffsetY,
      canvasWidth,
      canvasHeight,
      pageOffsetX,
      pageOffsetY
    });
  }
  
  const bottomEdge = Math.abs(y + nodeHeight - canvasHeight);
  if (bottomEdge < GUIDELINE_OFFSET) {
    snappedY = canvasHeight - nodeHeight;
    guidelines.push({
      type: 'horizontal',
      position: pageOffsetY + canvasHeight,
      canvasWidth,
      canvasHeight,
      pageOffsetX,
      pageOffsetY
    });
  }

  return { x: snappedX, y: snappedY, guidelines };
};

export const snapPosition = (
  node: Konva.Node,
  x: number,
  y: number,
  enableGridSnap: boolean = false,
  magneticSnapping: boolean,
  currentPage: Page,
  canvasWidth: number,
  canvasHeight: number,
  pageOffsetX: number,
  pageOffsetY: number,
  stageRef: React.RefObject<Konva.Stage>
): { x: number; y: number; guidelines: SnapGuideline[] } => {
  if (!magneticSnapping || !node || !currentPage) {
    return { x, y, guidelines: [] };
  }
  
  const elementSnapped = snapToElements(node, x, y, currentPage, canvasWidth, canvasHeight, pageOffsetX, pageOffsetY, stageRef);
  
  if (enableGridSnap && elementSnapped.x === x && elementSnapped.y === y) {
    const gridSnapped = {
      x: snapToGrid(x, 10),
      y: snapToGrid(y, 10)
    };
    return { ...gridSnapped, guidelines: [] };
  }
  
  return elementSnapped;
};