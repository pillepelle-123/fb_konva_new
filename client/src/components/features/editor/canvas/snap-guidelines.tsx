import { Line } from 'react-konva';

interface SnapGuidelinesProps {
  guidelines: Array<{
    type: 'vertical' | 'horizontal';
    position: number;
    canvasWidth: number;
    canvasHeight: number;
    pageOffsetX: number;
    pageOffsetY: number;
  }>;
}

export function SnapGuidelines({ guidelines }: SnapGuidelinesProps) {
  return (
    <>
      {guidelines.map((guideline, index) => (
        <Line
          key={index}
          points={
            guideline.type === 'vertical'
              ? [guideline.position, guideline.pageOffsetY, guideline.position, guideline.pageOffsetY + guideline.canvasHeight]
              : [guideline.pageOffsetX, guideline.position, guideline.pageOffsetX + guideline.canvasWidth, guideline.position]
          }
          stroke="#3b82f6"
          strokeWidth={2}
          dash={[5, 5]}
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}
    </>
  );
}