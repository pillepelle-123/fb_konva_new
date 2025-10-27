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
  
  // Get node dimensions - handle both single nodes and groups
  let nodeWidth = 0;
  let nodeHeight = 0;
  let nodeX = x;
  let nodeY = y;
  
  // Track selected element IDs to exclude from snapping
  const selectedIds = new Set<string>();
  
  try {
    // Check if this is a Transformer (multi-selection)
    if (node.getClassName() === 'Transformer') {
      const transformer = node as Konva.Transformer;
      const nodes = transformer.nodes();
      if (nodes.length > 0) {
        // Collect all selected element IDs
        nodes.forEach(n => {
          if (n.id()) selectedIds.add(n.id());
        });
        
        // Use the provided x, y as the bounding box position
        nodeWidth = transformer.width();
        nodeHeight = transformer.height();
        nodeX = x;
        nodeY = y;
      }
    } else {
      // Single node
      if (node.id()) selectedIds.add(node.id());
      nodeWidth = (node.width() || 0) * (node.scaleX() || 1);
      nodeHeight = (node.height() || 0) * (node.scaleY() || 1);
    }
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
    
    // Skip if this element is part of the selection
    if (selectedIds.has(element.id)) return;
    
    // Skip brush elements from snapping
    if (element.type === 'brush') return;
    
    const stage = stageRef.current;
    if (!stage) return;
    
    try {
      const otherNode = stage.findOne(`#${element.id}`);
      if (!otherNode) return;

      const elementWidth = element.width || 0;
      const elementHeight = element.height || 0;

      // Edge snapping
    const leftToLeft = Math.abs(nodeX - element.x);
    if (leftToLeft < GUIDELINE_OFFSET) {
      snappedX = x + (element.x - nodeX);
      guidelines.push({
        type: 'vertical',
        position: pageOffsetX + element.x,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const leftToRight = Math.abs(nodeX - (element.x + elementWidth));
    if (leftToRight < GUIDELINE_OFFSET) {
      snappedX = x + (element.x + elementWidth - nodeX);
      guidelines.push({
        type: 'vertical',
        position: pageOffsetX + element.x + elementWidth,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const rightToLeft = Math.abs((nodeX + nodeWidth) - element.x);
    if (rightToLeft < GUIDELINE_OFFSET) {
      snappedX = x + (element.x - nodeWidth - nodeX);
      guidelines.push({
        type: 'vertical',
        position: pageOffsetX + element.x,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const rightToRight = Math.abs((nodeX + nodeWidth) - (element.x + elementWidth));
    if (rightToRight < GUIDELINE_OFFSET) {
      snappedX = x + (element.x + elementWidth - nodeWidth - nodeX);
      guidelines.push({
        type: 'vertical',
        position: pageOffsetX + element.x + elementWidth,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const topToTop = Math.abs(nodeY - element.y);
    if (topToTop < GUIDELINE_OFFSET) {
      snappedY = y + (element.y - nodeY);
      guidelines.push({
        type: 'horizontal',
        position: pageOffsetY + element.y,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const topToBottom = Math.abs(nodeY - (element.y + elementHeight));
    if (topToBottom < GUIDELINE_OFFSET) {
      snappedY = y + (element.y + elementHeight - nodeY);
      guidelines.push({
        type: 'horizontal',
        position: pageOffsetY + element.y + elementHeight,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const bottomToTop = Math.abs((nodeY + nodeHeight) - element.y);
    if (bottomToTop < GUIDELINE_OFFSET) {
      snappedY = y + (element.y - nodeHeight - nodeY);
      guidelines.push({
        type: 'horizontal',
        position: pageOffsetY + element.y,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const bottomToBottom = Math.abs((nodeY + nodeHeight) - (element.y + elementHeight));
    if (bottomToBottom < GUIDELINE_OFFSET) {
      snappedY = y + (element.y + elementHeight - nodeHeight - nodeY);
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
    const centerX = nodeX + nodeWidth / 2;
    const elementCenterX = element.x + elementWidth / 2;
    const centerToCenter = Math.abs(centerX - elementCenterX);
    if (centerToCenter < GUIDELINE_OFFSET) {
      snappedX = x + (elementCenterX - nodeWidth / 2 - nodeX);
      guidelines.push({
        type: 'vertical',
        position: pageOffsetX + elementCenterX,
        canvasWidth,
        canvasHeight,
        pageOffsetX,
        pageOffsetY
      });
    }
    
    const centerY = nodeY + nodeHeight / 2;
    const elementCenterY = element.y + elementHeight / 2;
    const centerToCenterY = Math.abs(centerY - elementCenterY);
    if (centerToCenterY < GUIDELINE_OFFSET) {
      snappedY = y + (elementCenterY - nodeHeight / 2 - nodeY);
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
  const leftEdge = Math.abs(nodeX);
  if (leftEdge < GUIDELINE_OFFSET) {
    snappedX = x + (0 - nodeX);
    guidelines.push({
      type: 'vertical',
      position: pageOffsetX,
      canvasWidth,
      canvasHeight,
      pageOffsetX,
      pageOffsetY
    });
  }
  
  const rightEdge = Math.abs(nodeX + nodeWidth - canvasWidth);
  if (rightEdge < GUIDELINE_OFFSET) {
    snappedX = x + (canvasWidth - nodeWidth - nodeX);
    guidelines.push({
      type: 'vertical',
      position: pageOffsetX + canvasWidth,
      canvasWidth,
      canvasHeight,
      pageOffsetX,
      pageOffsetY
    });
  }
  
  const topEdge = Math.abs(nodeY);
  if (topEdge < GUIDELINE_OFFSET) {
    snappedY = y + (0 - nodeY);
    guidelines.push({
      type: 'horizontal',
      position: pageOffsetY,
      canvasWidth,
      canvasHeight,
      pageOffsetX,
      pageOffsetY
    });
  }
  
  const bottomEdge = Math.abs(nodeY + nodeHeight - canvasHeight);
  if (bottomEdge < GUIDELINE_OFFSET) {
    snappedY = y + (canvasHeight - nodeHeight - nodeY);
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