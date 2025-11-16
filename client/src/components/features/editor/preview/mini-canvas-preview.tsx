import React, { useMemo } from 'react';
import { LayoutTemplatePreview } from '../templates/layout-selector';
import MiniBackground from './mini-background';
import { mirrorTemplate } from '../../../../utils/layout-mirroring';
import type { PageTemplate } from '../../../../types/template-types';

type MiniCanvasPreviewProps = {
  pageSize: 'A4' | 'A5';
  orientation: 'portrait' | 'landscape';
  themeId: string;
  paletteId: string;
  baseTemplate: PageTemplate | null;
  pickLeftRight: boolean;
  leftTemplate?: PageTemplate | null;
  rightTemplate?: PageTemplate | null;
  mirrorRight: boolean;
  className?: string;
};

const PAGE_ASPECT: Record<'A4' | 'A5', { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
};

export default function MiniCanvasPreview({
  pageSize,
  orientation,
  themeId,
  paletteId,
  baseTemplate,
  pickLeftRight,
  leftTemplate,
  rightTemplate,
  mirrorRight,
  className,
}: MiniCanvasPreviewProps) {
  const base = PAGE_ASPECT[pageSize];
  const ratio =
    orientation === 'portrait' ? base.h / base.w : base.w / base.h;
  const pageWidth = 120;
  const pageHeight = Math.round(pageWidth * ratio);

  const resolvedLeft = leftTemplate ?? baseTemplate ?? null;
  const resolvedRight = useMemo(() => {
    if (pickLeftRight) return rightTemplate ?? baseTemplate ?? null;
    if (mirrorRight && baseTemplate) return mirrorTemplate(baseTemplate);
    return baseTemplate ?? null;
  }, [pickLeftRight, rightTemplate, mirrorRight, baseTemplate]);

  return (
    <div className={`rounded-2xl bg-white shadow-sm border p-4 ${className ?? ''}`}>
      <div className="text-sm font-semibold mb-3">Live preview</div>
      <div className="flex gap-2 items-start">
        <PageCard title="Left page" width={pageWidth} height={pageHeight}>
          <MiniBackground
            width={pageWidth}
            height={pageHeight}
            themeId={themeId}
            paletteId={paletteId}
          />
          <div className="absolute inset-1 rounded bg-white/98 overflow-hidden p-1">
            {resolvedLeft ? (
              <LayoutTemplatePreview template={resolvedLeft} showLegend={false} showItemLabels={false} />
            ) : (
              <EmptyCardPlaceholder />
            )}
          </div>
        </PageCard>

        <PageCard title="Right page" width={pageWidth} height={pageHeight}>
          <MiniBackground
            width={pageWidth}
            height={pageHeight}
            themeId={themeId}
            paletteId={paletteId}
            mirror={mirrorRight && !pickLeftRight}
          />
          <div className="absolute inset-1 rounded bg-white/98 overflow-hidden p-1">
            {resolvedRight ? (
              <LayoutTemplatePreview template={resolvedRight} showLegend={false} showItemLabels={false} />
            ) : (
              <EmptyCardPlaceholder />
            )}
          </div>
        </PageCard>
      </div>
    </div>
  );
}

function PageCard({
  title,
  width,
  height,
  children,
}: {
  title: string;
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="text-[10px] text-muted-foreground mb-1">{title}</div>
      <div
        className="relative border rounded-lg overflow-hidden"
        style={{ width, height }}
      >
        {children}
      </div>
    </div>
  );
}

function EmptyCardPlaceholder() {
  return (
    <div className="w-full h-full rounded border border-dashed border-gray-200 bg-slate-50 flex items-center justify-center text-[10px] text-muted-foreground">
      Not selected
    </div>
  );
}


