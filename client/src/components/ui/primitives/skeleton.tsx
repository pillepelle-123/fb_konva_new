import { Group, Rect } from 'react-konva';

interface KonvaSkeletonProps {
  width: number;
  height: number;
}

function KonvaSkeleton({ width, height }: KonvaSkeletonProps) {
  return (
    <Group transformsEnabled="position">
      <Rect
        x={4}
        y={height / 14}
        width={width - 8}
        height={height / 4 - height / 12}
        fill="#f1f5f9"
        cornerRadius={4}
        listening={false}
      />
      <Rect
        x={4}
        y={4* height / 14}
        width={(width - 8) * 0.7}
        height={height / 4 - height / 12}
        fill="#e2e8f0"
        cornerRadius={4}
        listening={false}
      />
      <Rect
        x={4}
        y={7 * height / 14}
        width={width - 8}
        height={height / 4 - height / 12}
        fill="#f1f5f9"
        cornerRadius={4}
        listening={false}
      />
      <Rect
        x={4}
        y={10 * height / 14}
        width={(width - 8) * 0.8}
        height={height / 4 - height / 12}
        fill="#e2e8f0"
        cornerRadius={4}
        listening={false}
      />
    </Group>
  );
}

export { KonvaSkeleton }