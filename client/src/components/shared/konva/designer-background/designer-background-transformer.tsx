import { Transformer } from 'react-konva';

interface DesignerBackgroundTransformerProps {
  transformerRef: React.RefObject<any>;
  keepRatio: boolean;
  displayScale?: number;
  minWidth: number;
  minHeight: number;
}

export function DesignerBackgroundTransformer({
  transformerRef,
  keepRatio,
  displayScale = 1,
  minWidth,
  minHeight,
}: DesignerBackgroundTransformerProps) {
  const inverseScale = displayScale > 0 ? 1 / displayScale : 1;

  return (
    <Transformer
      ref={transformerRef}
      keepRatio={keepRatio}
      rotateEnabled={true}
      borderStroke="#0066ff"
      borderStrokeWidth={1.5 * inverseScale}
      anchorStroke="#0066ff"
      anchorFill="#ffffff"
      anchorSize={8 * inverseScale}
      anchorStrokeWidth={1.5 * inverseScale}
      boundBoxFunc={(oldBox, newBox) => {
        if (newBox.width < minWidth || newBox.height < minHeight) {
          return oldBox;
        }
        return newBox;
      }}
    />
  );
}
