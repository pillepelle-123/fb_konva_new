import { forwardRef, useEffect } from 'react';
import { Transformer } from 'react-konva';
import Konva from 'konva';

interface CanvasTransformerProps {
  onDragStart?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformStart?: (e: Konva.KonvaEventObject<Event>) => void;
  onTransform?: (e: Konva.KonvaEventObject<Event>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  boundBoxFunc?: (oldBox: any, newBox: any) => any;
  rotationSnaps?: number[];
  rotationSnapTolerance?: number;
  keepRatio?: boolean;
  enabledAnchors?: string[];
  resizeEnabled?: boolean;
  rotateEnabled?: boolean;
}

const CanvasTransformer = forwardRef<Konva.Transformer, CanvasTransformerProps>(({
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransformStart,
  onTransform,
  onTransformEnd,
  boundBoxFunc,
  rotationSnaps,
  rotationSnapTolerance,
  keepRatio = false,
  enabledAnchors,
  resizeEnabled = true,
  rotateEnabled = true
}, ref) => {
  // Defensive programming: Ensure transformer nodes are valid
  useEffect(() => {
    const checkTransformerNodes = () => {
      try {
        if (ref && typeof ref === 'object' && ref.current) {
          const transformer = ref.current;
          const nodes = transformer.nodes();

          // Filter out invalid nodes
          const validNodes = nodes.filter(node => {
            try {
              // Check if node is still attached to stage and has required methods
              return node && typeof node.setAttrs === 'function' && node.getStage();
            } catch (error) {
              console.warn('[CanvasTransformer] Invalid node detected:', error);
              return false;
            }
          });

          // Update transformer with only valid nodes if needed
          if (validNodes.length !== nodes.length) {
            console.warn('[CanvasTransformer] Removing invalid nodes, keeping', validNodes.length, 'of', nodes.length);
            transformer.nodes(validNodes);
          }
        }
      } catch (error) {
        console.error('[CanvasTransformer] Error checking nodes:', error);
      }
    };

    // Check nodes periodically to prevent stale references
    const interval = setInterval(checkTransformerNodes, 1000);

    return () => clearInterval(interval);
  }, [ref]);

  return (
    <Transformer
      ref={ref}
      keepRatio={keepRatio}
      enabledAnchors={resizeEnabled ? (enabledAnchors !== undefined ? enabledAnchors : (keepRatio ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'middle-left', 'middle-right', 'bottom-center'])) : []}
      boundBoxFunc={boundBoxFunc || ((oldBox, newBox) => {
        if (newBox.width < 5 || newBox.height < 5) {
          return oldBox;
        }
        return newBox;
      })}
      rotationSnaps={rotationSnaps}
      rotationSnapTolerance={rotationSnapTolerance}
      rotateEnabled={rotateEnabled}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformStart={onTransformStart}
      onTransform={onTransform}
      onTransformEnd={onTransformEnd}
    />
  );
});

CanvasTransformer.displayName = 'CanvasTransformer';

export { CanvasTransformer };