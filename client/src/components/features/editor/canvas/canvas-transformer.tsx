import { forwardRef } from 'react';
import { Transformer } from 'react-konva';
import Konva from 'konva';

interface CanvasTransformerProps {
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  keepRatio?: boolean;
  enabledAnchors?: string[];
}

const CanvasTransformer = forwardRef<Konva.Transformer, CanvasTransformerProps>(({
  onDragEnd,
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
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
});

CanvasTransformer.displayName = 'CanvasTransformer';

export { CanvasTransformer };