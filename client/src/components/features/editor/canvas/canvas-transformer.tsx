import { forwardRef } from 'react';
import { Transformer } from 'react-konva';
import Konva from 'konva';

interface CanvasTransformerProps {
  onDragStart?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformStart?: (e: Konva.KonvaEventObject<Event>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  keepRatio?: boolean;
  enabledAnchors?: string[];
}

const CanvasTransformer = forwardRef<Konva.Transformer, CanvasTransformerProps>(({
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransformStart,
  onTransformEnd,
  keepRatio = false,
  enabledAnchors
}, ref) => {
  return (
    <Transformer
      ref={ref}
      keepRatio={keepRatio}
      enabledAnchors={enabledAnchors !== undefined ? enabledAnchors : (keepRatio ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'middle-left', 'middle-right', 'bottom-center'])}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < 5 || newBox.height < 5) {
          return oldBox;
        }
        return newBox;
      }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformStart={onTransformStart}
      onTransformEnd={onTransformEnd}
    />
  );
});

CanvasTransformer.displayName = 'CanvasTransformer';

export { CanvasTransformer };