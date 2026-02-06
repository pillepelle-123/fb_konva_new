import React, { useRef, useEffect, useState } from 'react';
import { Group, Image as KonvaImage, Stage, Layer } from 'react-konva';
import Konva from 'konva';

interface PartnerPageSnapshotProps {
  snapshotUrl: string | null;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  onClick?: () => void;
}

export const PartnerPageSnapshot: React.FC<PartnerPageSnapshotProps> = ({
  snapshotUrl,
  offsetX,
  offsetY,
  width,
  height,
  onClick
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!snapshotUrl) return;

    const img = new window.Image();
    img.onload = () => setImage(img);
    img.src = snapshotUrl;

    return () => {
      img.onload = null;
      setImage(null);
    };
  }, [snapshotUrl]);

  if (!snapshotUrl || !image) {
    return null;
  }

  return (
    <Group
      x={offsetX}
      y={offsetY}
      listening={true}
      onClick={onClick}
      onTap={onClick}
    >
      <KonvaImage
        image={image}
        width={width}
        height={height}
        listening={false}
      />
    </Group>
  );
};

interface PartnerPageStageProps {
  stageRef: React.RefObject<Konva.Stage>;
  children: React.ReactNode;
  width: number;
  height: number;
}

// Hidden stage for rendering partner page to generate snapshot
export const PartnerPageStage: React.FC<PartnerPageStageProps> = ({
  stageRef,
  children,
  width,
  height
}) => {
  return (
    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        listening={false}
      >
        <Layer>
          {children}
        </Layer>
      </Stage>
    </div>
  );
};
