import { forwardRef } from 'react';
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