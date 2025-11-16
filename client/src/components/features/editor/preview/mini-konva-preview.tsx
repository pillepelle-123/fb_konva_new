import React, { useMemo } from 'react';
import { Stage, Layer, Group, Rect } from 'react-konva';
import MiniKonvaBackground from './mini-konva-background.tsx';
import MiniTemplateRender from './mini-template-render';
import { mirrorTemplate } from '../../../../utils/layout-mirroring';
import type { PageTemplate } from '../../../../types/template-types';

type MiniKonvaPreviewProps = {
  pageSize: 'A4' | 'A5';
  orientation: 'portrait' | 'landscape';
  themeId: string;
  paletteId: string;
  baseTemplate: PageTemplate | null;
  pickLeftRight: boolean;
  leftTemplate?: PageTemplate | null;
  rightTemplate?: PageTemplate | null;
  mirrorRight: boolean;
  scale?: number;
  className?: string;
};

const PAGE_DIMENSIONS = {
  A4: { width: 2480, height: 3508 },
  A5: { width: 1748, height: 2480 },
};

export default function MiniKonvaPreview({
  pageSize,
  orientation,
  themeId,
  paletteId,
  baseTemplate,
  pickLeftRight,
  leftTemplate,
  rightTemplate,
  mirrorRight,
  scale = 0.06,
  className,
}: MiniKonvaPreviewProps) {
  const dim = PAGE_DIMENSIONS[pageSize];
  const pageW = orientation === 'landscape' ? dim.height : dim.width;
  const pageH = orientation === 'landscape' ? dim.width : dim.height;
  const gap = pageW * 0.05;

  const stageWidth = (pageW * 2 + gap) * scale;
  const stageHeight = pageH * scale;

  const leftResolved = leftTemplate ?? baseTemplate ?? null;
  const rightResolved = useMemo(() => {
    if (pickLeftRight) return rightTemplate ?? baseTemplate ?? null;
    if (mirrorRight && baseTemplate) return mirrorTemplate(baseTemplate);
    return baseTemplate ?? null;
  }, [pickLeftRight, rightTemplate, mirrorRight, baseTemplate]);

  const leftX = 0;
  const rightX = (pageW + gap) * scale;
  const pageScale = scale;

  return (
    <div className={`rounded-2xl bg-white shadow-sm border p-4 ${className ?? ''}`}>
      <div className="text-sm font-semibold mb-3">Live preview (Konva)</div>
      <Stage width={stageWidth} height={stageHeight}>
        <Layer>
          {/* LEFT PAGE */}
          <Group x={leftX} y={0} scale={{ x: pageScale, y: pageScale }}>
            {/* boundary */}
            <Rect x={0} y={0} width={pageW} height={pageH} fill="white" stroke="#e5e7eb" strokeWidth={8} listening={false} />
            {/* background */}
            <MiniKonvaBackground
              x={0}
              y={0}
              width={pageW}
              height={pageH}
              themeId={themeId}
              paletteId={paletteId}
            />
            {/* template */}
            {leftResolved ? (
              <MiniTemplateRender x={0} y={0} width={pageW} height={pageH} template={leftResolved} themeId={themeId} paletteId={paletteId} />
            ) : null}
          </Group>

          {/* RIGHT PAGE */}
          <Group x={rightX} y={0} scale={{ x: pageScale, y: pageScale }}>
            <Rect x={0} y={0} width={pageW} height={pageH} fill="white" stroke="#e5e7eb" strokeWidth={8} listening={false} />
            <MiniKonvaBackground
              x={0}
              y={0}
              width={pageW}
              height={pageH}
              themeId={themeId}
              paletteId={paletteId}
              mirror={mirrorRight && !pickLeftRight}
            />
            {rightResolved ? (
              <MiniTemplateRender x={0} y={0} width={pageW} height={pageH} template={rightResolved} themeId={themeId} paletteId={paletteId} />
            ) : null}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
}


