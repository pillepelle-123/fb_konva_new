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

  // Track best snap for each edge type (closest one)
  let bestXSnap: { x: number; diff: number; guideline: SnapGuideline } | null = null;
  let bestYSnap: { y: number; diff: number; guideline: SnapGuideline } | null = null;

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

      // Edge snapping - find the best snap for X axis
      const leftToLeft = Math.abs(nodeX - element.x);
      if (leftToLeft < GUIDELINE_OFFSET) {
        const newX = x + (element.x - nodeX);
        const diff = Math.abs(newX - x);
        if (!bestXSnap || diff < bestXSnap.diff) {
          bestXSnap = {
            x: newX,
            diff,
            guideline: {
              type: 'vertical',
              position: pageOffsetX + element.x,
              canvasWidth,
              canvasHeight,
              pageOffsetX,
              pageOffsetY
            }
          };
        }
      }
      
      const leftToRight = Math.abs(nodeX - (element.x + elementWidth));
      if (leftToRight < GUIDELINE_OFFSET) {
        const newX = x + (element.x + elementWidth - nodeX);
        const diff = Math.abs(newX - x);
        if (!bestXSnap || diff < bestXSnap.diff) {
          bestXSnap = {
            x: newX,
            diff,
            guideline: {
              type: 'vertical',
              position: pageOffsetX + element.x + elementWidth,
              canvasWidth,
              canvasHeight,
              pageOffsetX,
              pageOffsetY
            }
          };
        }
      }
      
      const rightToLeft = Math.abs((nodeX + nodeWidth) - element.x);
      if (rightToLeft < GUIDELINE_OFFSET) {
        const newX = x + (element.x - nodeWidth - nodeX);
        const diff = Math.abs(newX - x);
        if (!bestXSnap || diff < bestXSnap.diff) {
          bestXSnap = {
            x: newX,
            diff,
            guideline: {
              type: 'vertical',
              position: pageOffsetX + element.x,
              canvasWidth,
              canvasHeight,
              pageOffsetX,
              pageOffsetY
            }
          };
        }
      }
      
      const rightToRight = Math.abs((nodeX + nodeWidth) - (element.x + elementWidth));
      if (rightToRight < GUIDELINE_OFFSET) {
        const newX = x + (element.x + elementWidth - nodeWidth - nodeX);
        const diff = Math.abs(newX - x);
        if (!bestXSnap || diff < bestXSnap.diff) {
          bestXSnap = {
            x: newX,
            diff,
            guideline: {
              type: 'vertical',
              position: pageOffsetX + element.x + elementWidth,
              canvasWidth,
              canvasHeight,
              pageOffsetX,
              pageOffsetY
            }
          };
        }
      }

      // Y-axis snapping - find the best snap
      const topToTop = Math.abs(nodeY - element.y);
      if (topToTop < GUIDELINE_OFFSET) {
        const newY = y + (element.y - nodeY);
        const diff = Math.abs(newY - y);
        if (!bestYSnap || diff < bestYSnap.diff) {
          bestYSnap = {
            y: newY,
            diff,
            guideline: {
              type: 'horizontal',
              position: pageOffsetY + element.y,
              canvasWidth,
              canvasHeight,
              pageOffsetX,
              pageOffsetY
            }
          };
        }
      }
      
      const topToBottom = Math.abs(nodeY - (element.y + elementHeight));
      if (topToBottom < GUIDELINE_OFFSET) {
        const newY = y + (element.y + elementHeight - nodeY);
        const diff = Math.abs(newY - y);
        if (!bestYSnap || diff < bestYSnap.diff) {
          bestYSnap = {
            y: newY,
            diff,
            guideline: {
              type: 'horizontal',
              position: pageOffsetY + element.y + elementHeight,
              canvasWidth,
              canvasHeight,
              pageOffsetX,
              pageOffsetY
            }
          };
        }
      }
      
      const bottomToTop = Math.abs((nodeY + nodeHeight) - element.y);
      if (bottomToTop < GUIDELINE_OFFSET) {
        const newY = y + (element.y - nodeHeight - nodeY);
        const diff = Math.abs(newY - y);
        if (!bestYSnap || diff < bestYSnap.diff) {
          bestYSnap = {
            y: newY,
            diff,
            guideline: {
              type: 'horizontal',
              position: pageOffsetY + element.y,
              canvasWidth,
              canvasHeight,
              pageOffsetX,
              pageOffsetY
            }
          };
        }
      }
      
      const bottomToBottom = Math.abs((nodeY + nodeHeight) - (element.y + elementHeight));
      if (bottomToBottom < GUIDELINE_OFFSET) {
        const newY = y + (element.y + elementHeight - nodeHeight - nodeY);
        const diff = Math.abs(newY - y);
        if (!bestYSnap || diff < bestYSnap.diff) {
          bestYSnap = {
            y: newY,
            diff,
            guideline: {
              type: 'horizontal',
              position: pageOffsetY + element.y + elementHeight,
              canvasWidth,
              canvasHeight,
              pageOffsetX,
              pageOffsetY
            }
          };
        }
      }

      // Center snapping - check if it's better than edge snaps
      const centerX = nodeX + nodeWidth / 2;
      const elementCenterX = element.x + elementWidth / 2;
      const centerToCenter = Math.abs(centerX - elementCenterX);
      if (centerToCenter < GUIDELINE_OFFSET) {
        const newX = x + (elementCenterX - nodeWidth / 2 - nodeX);
        const diff = Math.abs(newX - x);
        if (!bestXSnap || diff < bestXSnap.diff) {
          bestXSnap = {
            x: newX,
            diff,
            guideline: {
              type: 'vertical',
              position: pageOffsetX + elementCenterX,
              canvasWidth,
              canvasHeight,
              pageOffsetX,
              pageOffsetY
            }
          };
        }
      }
      
      const centerY = nodeY + nodeHeight / 2;
      const elementCenterY = element.y + elementHeight / 2;
      const centerToCenterY = Math.abs(centerY - elementCenterY);
      if (centerToCenterY < GUIDELINE_OFFSET) {
        const newY = y + (elementCenterY - nodeHeight / 2 - nodeY);
        const diff = Math.abs(newY - y);
        if (!bestYSnap || diff < bestYSnap.diff) {
          bestYSnap = {
            y: newY,
            diff,
            guideline: {
              type: 'horizontal',
              position: pageOffsetY + elementCenterY,
              canvasWidth,
              canvasHeight,
              pageOffsetX,
              pageOffsetY
            }
          };
        }
      }
    } catch (e) {
      // Skip this element if there's an error
      return;
    }
  });

  // Canvas edge snapping - check if it's better than element snaps
  const leftEdge = Math.abs(nodeX);
  if (leftEdge < GUIDELINE_OFFSET) {
    const newX = x + (0 - nodeX);
    const diff = Math.abs(newX - x);
    if (!bestXSnap || diff < bestXSnap.diff) {
      bestXSnap = {
        x: newX,
        diff,
        guideline: {
          type: 'vertical',
          position: pageOffsetX,
          canvasWidth,
          canvasHeight,
          pageOffsetX,
          pageOffsetY
        }
      };
    }
  }
  
  const rightEdge = Math.abs(nodeX + nodeWidth - canvasWidth);
  if (rightEdge < GUIDELINE_OFFSET) {
    const newX = x + (canvasWidth - nodeWidth - nodeX);
    const diff = Math.abs(newX - x);
    if (!bestXSnap || diff < bestXSnap.diff) {
      bestXSnap = {
        x: newX,
        diff,
        guideline: {
          type: 'vertical',
          position: pageOffsetX + canvasWidth,
          canvasWidth,
          canvasHeight,
          pageOffsetX,
          pageOffsetY
        }
      };
    }
  }
  
  const topEdge = Math.abs(nodeY);
  if (topEdge < GUIDELINE_OFFSET) {
    const newY = y + (0 - nodeY);
    const diff = Math.abs(newY - y);
    if (!bestYSnap || diff < bestYSnap.diff) {
      bestYSnap = {
        y: newY,
        diff,
        guideline: {
          type: 'horizontal',
          position: pageOffsetY,
          canvasWidth,
          canvasHeight,
          pageOffsetX,
          pageOffsetY
        }
      };
    }
  }
  
  const bottomEdge = Math.abs(nodeY + nodeHeight - canvasHeight);
  if (bottomEdge < GUIDELINE_OFFSET) {
    const newY = y + (canvasHeight - nodeHeight - nodeY);
    const diff = Math.abs(newY - y);
    if (!bestYSnap || diff < bestYSnap.diff) {
      bestYSnap = {
        y: newY,
        diff,
        guideline: {
          type: 'horizontal',
          position: pageOffsetY + canvasHeight,
          canvasWidth,
          canvasHeight,
          pageOffsetX,
          pageOffsetY
        }
      };
    }
  }

  // Apply the best snaps
  if (bestXSnap) {
    snappedX = bestXSnap.x;
    guidelines.push(bestXSnap.guideline);
  }
  if (bestYSnap) {
    snappedY = bestYSnap.y;
    guidelines.push(bestYSnap.guideline);
  }

  return { x: snappedX, y: snappedY, guidelines };
};

export const snapDimensions = (
  node: Konva.Node,
  x: number,
  y: number,
  width: number,
  height: number,
  currentPage: Page,
  canvasWidth: number,
  canvasHeight: number,
  pageOffsetX: number,
  pageOffsetY: number,
  stageRef: React.RefObject<Konva.Stage>,
  options?: {
    allowTopSnap?: boolean;
    allowBottomSnap?: boolean;
    allowLeftSnap?: boolean;
    allowRightSnap?: boolean;
    originalY?: number;
    originalHeight?: number;
  }
): { x: number; y: number; width: number; height: number; guidelines: SnapGuideline[] } => {
  // Safety checks
  if (!currentPage || !node || !stageRef.current || typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
    return { x, y, width, height, guidelines: [] };
  }

  // Determine which edges can snap based on options
  const allowTopSnap = options?.allowTopSnap !== false; // Default to true if not specified
  const allowBottomSnap = options?.allowBottomSnap !== false; // Default to true if not specified
  const allowLeftSnap = options?.allowLeftSnap !== false; // Default to true if not specified
  const allowRightSnap = options?.allowRightSnap !== false; // Default to true if not specified
  
  // If resizing top edge, preserve bottom edge position
  const preserveBottomEdge = options?.allowTopSnap === true && options?.originalY !== undefined && options?.originalHeight !== undefined;
  const originalBottomY = preserveBottomEdge ? (options.originalY + options.originalHeight) : undefined;

  let snappedX = x;
  let snappedY = y;
  let snappedWidth = width;
  let snappedHeight = height;
  const guidelines: SnapGuideline[] = [];
  
  // Track best snap for each edge type (closest one)
  let bestRightEdgeSnap: { width: number; diff: number; guideline: SnapGuideline } | null = null;
  let bestLeftEdgeSnap: { x: number; width: number; diff: number; guideline: SnapGuideline } | null = null;
  let bestBottomEdgeSnap: { height: number; diff: number; guideline: SnapGuideline } | null = null;
  let bestTopEdgeSnap: { y: number; height: number; diff: number; guideline: SnapGuideline } | null = null;
  let bestWidthSnap: { width: number; diff: number; guideline: SnapGuideline } | null = null;
  let bestHeightSnap: { height: number; diff: number; guideline: SnapGuideline } | null = null;
  
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
      }
    } else {
      // Single node
      if (node.id()) selectedIds.add(node.id());
    }
  } catch (e) {
    // Fallback if node methods fail
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
      const elementWidth = element.width || 0;
      const elementHeight = element.height || 0;

      // Width snapping - snap to other element widths
      const widthDiff = Math.abs(width - elementWidth);
      if (widthDiff < GUIDELINE_OFFSET) {
        const diff = widthDiff;
        if (!bestWidthSnap || diff < bestWidthSnap.diff) {
          bestWidthSnap = {
            width: elementWidth,
            diff,
            guideline: {
              type: 'vertical',
              position: pageOffsetX + element.x + elementWidth,
              canvasWidth,
              canvasHeight,
              pageOffsetX,
              pageOffsetY
            }
          };
        }
      }
      
      // Height snapping - snap to other element heights
      const heightDiff = Math.abs(height - elementHeight);
      if (heightDiff < GUIDELINE_OFFSET) {
        const diff = heightDiff;
        if (!bestHeightSnap || diff < bestHeightSnap.diff) {
          bestHeightSnap = {
            height: elementHeight,
            diff,
            guideline: {
              type: 'horizontal',
              position: pageOffsetY + element.y + elementHeight,
              canvasWidth,
              canvasHeight,
              pageOffsetX,
              pageOffsetY
            }
          };
        }
      }

      // Edge snapping during resize - snap edges to other element edges
      const elementRightEdge = element.x + elementWidth;
      const elementLeftEdge = element.x;
      
      // Right edge snapping - find the best snap (only if right edge is being resized)
      if (allowRightSnap) {
        const rightEdge = x + width;
        const rightToLeft = Math.abs(rightEdge - elementLeftEdge);
        const rightToRight = Math.abs(rightEdge - elementRightEdge);
        
        if (rightToLeft < GUIDELINE_OFFSET || rightToRight < GUIDELINE_OFFSET) {
          let newWidth: number;
          let snapPosition: number;
          let diff: number;
          
          if (rightToLeft < rightToRight) {
            newWidth = elementLeftEdge - x;
            snapPosition = elementLeftEdge;
            diff = rightToLeft;
          } else {
            newWidth = elementRightEdge - x;
            snapPosition = elementRightEdge;
            diff = rightToRight;
          }
          
          // Track best right edge snap
          if (!bestRightEdgeSnap || diff < bestRightEdgeSnap.diff) {
            bestRightEdgeSnap = {
              width: newWidth,
              diff,
              guideline: {
                type: 'vertical',
                position: pageOffsetX + snapPosition,
                canvasWidth,
                canvasHeight,
                pageOffsetX,
                pageOffsetY
              }
            };
          }
        }
      }
      
      // Left edge snapping - find the best snap (only if left edge is being resized)
      if (allowLeftSnap) {
        const leftToLeft = Math.abs(x - elementLeftEdge);
        const leftToRight = Math.abs(x - elementRightEdge);
        
        if (leftToLeft < GUIDELINE_OFFSET || leftToRight < GUIDELINE_OFFSET) {
          let newX: number;
          let newWidth: number;
          let snapPosition: number;
          let diff: number;
          
          if (leftToLeft < leftToRight) {
            newX = elementLeftEdge;
            newWidth = width + (x - elementLeftEdge);
            snapPosition = elementLeftEdge;
            diff = leftToLeft;
          } else {
            newX = elementRightEdge;
            newWidth = width + (x - elementRightEdge);
            snapPosition = elementRightEdge;
            diff = leftToRight;
          }
          
          // Track best left edge snap
          if (!bestLeftEdgeSnap || diff < bestLeftEdgeSnap.diff) {
            bestLeftEdgeSnap = {
              x: newX,
              width: newWidth,
              diff,
              guideline: {
                type: 'vertical',
                position: pageOffsetX + snapPosition,
                canvasWidth,
                canvasHeight,
                pageOffsetX,
                pageOffsetY
              }
            };
          }
        }
      }
      
      // Bottom edge snapping - find the best snap (only if bottom edge is being resized)
      if (allowBottomSnap) {
        const bottomEdge = y + height;
        const elementBottomEdge = element.y + elementHeight;
        const elementTopEdge = element.y;
        
        const bottomToTop = Math.abs(bottomEdge - elementTopEdge);
        const bottomToBottom = Math.abs(bottomEdge - elementBottomEdge);
        
        if (bottomToTop < GUIDELINE_OFFSET || bottomToBottom < GUIDELINE_OFFSET) {
          let newHeight: number;
          let snapPosition: number;
          let diff: number;
          
          if (bottomToTop < bottomToBottom) {
            newHeight = elementTopEdge - y;
            snapPosition = elementTopEdge;
            diff = bottomToTop;
          } else {
            newHeight = elementBottomEdge - y;
            snapPosition = elementBottomEdge;
            diff = bottomToBottom;
          }
          
          // Track best bottom edge snap
          if (!bestBottomEdgeSnap || diff < bestBottomEdgeSnap.diff) {
            bestBottomEdgeSnap = {
              height: newHeight,
              diff,
              guideline: {
                type: 'horizontal',
                position: pageOffsetY + snapPosition,
                canvasWidth,
                canvasHeight,
                pageOffsetX,
                pageOffsetY
              }
            };
          }
        }
      }
      
      // Top edge snapping - find the best snap (only if top edge is being resized)
      if (allowTopSnap) {
        const elementBottomEdge = element.y + elementHeight;
        const elementTopEdge = element.y;
        const topToTop = Math.abs(y - elementTopEdge);
        const topToBottom = Math.abs(y - elementBottomEdge);
        
        if (topToTop < GUIDELINE_OFFSET || topToBottom < GUIDELINE_OFFSET) {
          let newY: number;
          let newHeight: number;
          let snapPosition: number;
          let diff: number;
          
          if (topToTop < topToBottom) {
            newY = elementTopEdge;
            // If preserving bottom edge, calculate height to keep bottom edge fixed
            if (preserveBottomEdge && originalBottomY !== undefined) {
              newHeight = originalBottomY - elementTopEdge;
            } else {
              newHeight = height + (y - elementTopEdge);
            }
            snapPosition = elementTopEdge;
            diff = topToTop;
          } else {
            newY = elementBottomEdge;
            // If preserving bottom edge, calculate height to keep bottom edge fixed
            if (preserveBottomEdge && originalBottomY !== undefined) {
              newHeight = originalBottomY - elementBottomEdge;
            } else {
              newHeight = height + (y - elementBottomEdge);
            }
            snapPosition = elementBottomEdge;
            diff = topToBottom;
          }
          
          // Track best top edge snap
          if (!bestTopEdgeSnap || diff < bestTopEdgeSnap.diff) {
            bestTopEdgeSnap = {
              y: newY,
              height: newHeight,
              diff,
              guideline: {
                type: 'horizontal',
                position: pageOffsetY + snapPosition,
                canvasWidth,
                canvasHeight,
                pageOffsetX,
                pageOffsetY
              }
            };
          }
        }
      }
    } catch (e) {
      // Skip this element if there's an error
      return;
    }
  });

  // Apply the best snaps
  // Left and right edge snaps can work together - left adjusts x and width, right adjusts width only
  if (bestLeftEdgeSnap) {
    snappedX = bestLeftEdgeSnap.x;
    snappedWidth = bestLeftEdgeSnap.width;
    guidelines.push(bestLeftEdgeSnap.guideline);
  }
  
  // Right edge snap adjusts width (and can override left edge width if both are present)
  if (bestRightEdgeSnap) {
    snappedWidth = bestRightEdgeSnap.width;
    guidelines.push(bestRightEdgeSnap.guideline);
  } else if (bestWidthSnap && !bestLeftEdgeSnap) {
    // Only apply width snap if no edge snaps are active
    snappedWidth = bestWidthSnap.width;
    guidelines.push(bestWidthSnap.guideline);
  }
  
  // Top and bottom edge snaps - only apply the one that's being resized
  // If top edge is being resized, preserve bottom edge position
  if (bestTopEdgeSnap && allowTopSnap) {
    snappedY = bestTopEdgeSnap.y;
    snappedHeight = bestTopEdgeSnap.height;
    guidelines.push(bestTopEdgeSnap.guideline);
    
    // If preserving bottom edge, recalculate height to keep bottom edge fixed
    if (preserveBottomEdge && originalBottomY !== undefined) {
      snappedHeight = originalBottomY - snappedY;
    }
  } else if (bestBottomEdgeSnap && allowBottomSnap) {
    // Only apply bottom edge snap if top edge is not being resized
    snappedHeight = bestBottomEdgeSnap.height;
    guidelines.push(bestBottomEdgeSnap.guideline);
  } else if (bestHeightSnap && !bestTopEdgeSnap && !bestBottomEdgeSnap) {
    // Only apply height snap if no edge snaps are active
    snappedHeight = bestHeightSnap.height;
    guidelines.push(bestHeightSnap.guideline);
  }

  return { x: snappedX, y: snappedY, width: snappedWidth, height: snappedHeight, guidelines };
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