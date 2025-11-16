import React, { useMemo } from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import type { PageTemplate } from '../../../../types/template-types';
import { getToolDefaults } from '../../../../utils/tool-defaults';

type MiniTemplateRenderProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  template: PageTemplate;
  themeId?: string;
  paletteId?: string;
};

type TemplateItem =
  | {
      id: string;
      type: 'qna_inline' | 'text' | 'qna' | 'answer' | 'other';
      x: number;
      y: number;
      w: number;
      h: number;
      layoutVariant?: 'inline' | 'block';
      questionPosition?: 'left' | 'right' | 'top' | 'bottom';
      questionWidth?: number; // percent 0..100
      padding?: number;
      align?: 'left' | 'center' | 'right';
    }
  | {
      id: string;
      type: 'image';
      x: number;
      y: number;
      w: number;
      h: number;
    };

const FALLBACK_COLORS = {
  fill: 'rgba(148,163,184,0.15)',
  stroke: '#94a3b8',
  text: '#374151',
  imageBg: '#e5e7eb',
  imageStroke: '#9ca3af',
};

function normalizeTemplate(template: PageTemplate): TemplateItem[] {
  const tboxes =
    template.textboxes?.map((tb, i) => {
      const type = (tb.type as TemplateItem['type']) ?? 'other';
      return {
        id: `tb-${i}`,
        type: ['qna_inline', 'qna', 'answer', 'text'].includes(type) ? (type as TemplateItem['type']) : ('other' as const),
        x: tb.position.x ?? 0,
        y: tb.position.y ?? 0,
        w: tb.size.width ?? 0,
        h: tb.size.height ?? 0,
        layoutVariant: tb.layoutVariant ?? 'inline',
        questionPosition: tb.questionPosition ?? 'left',
        questionWidth: tb.questionWidth ?? 40,
        padding: tb.padding ?? tb.format?.padding ?? 8,
        align: tb.format?.textAlign ?? 'left',
      };
    }) ?? [];
  const elems =
    template.elements?.map((el, i) => ({
      id: `el-${i}`,
      type: el.type === 'image' ? ('image' as const) : ('other' as const),
      x: el.position.x ?? 0,
      y: el.position.y ?? 0,
      w: el.size.width ?? 0,
      h: el.size.height ?? 0,
    })) ?? [];
  return [...tboxes, ...elems];
}

export default function MiniTemplateRender({
  x,
  y,
  width,
  height,
  template,
  themeId,
  paletteId,
}: MiniTemplateRenderProps) {
  const items = useMemo(() => normalizeTemplate(template), [template]);
  const PAGE_WIDTH = 2480;
  const PAGE_HEIGHT = 3508;
  return (
    <Group x={x} y={y}>
      {items.map((it) => {
        const sx = (it.x / PAGE_WIDTH) * width;
        const sy = (it.y / PAGE_HEIGHT) * height;
        const sw = (it.w / PAGE_WIDTH) * width;
        const sh = (it.h / PAGE_HEIGHT) * height;

        // IMAGE PLACEHOLDER
        if (it.type === 'image') {
          const pad = Math.max(6, Math.min(sw, sh) * 0.06);
          const iconSize = Math.min(sw, sh) * 0.28;
          const iconX = sx + pad + 6;
          const iconY = sy + pad + 6;
          const iconRect = { x: iconX, y: iconY, w: iconSize, h: iconSize };
          return (
            <Group key={it.id}>
              <Rect
                x={sx}
                y={sy}
                width={sw}
                height={sh}
                fill={FALLBACK_COLORS.imageBg}
                stroke={FALLBACK_COLORS.imageStroke}
                strokeWidth={2}
                cornerRadius={8}
                listening={false}
              />
              {/* simple "image" icon */}
              <Rect
                x={iconRect.x}
                y={iconRect.y}
                width={iconRect.w}
                height={iconRect.h}
                stroke={FALLBACK_COLORS.imageStroke}
                cornerRadius={6}
                listening={false}
              />
              {/* mountain */}
              <Line
                points={[
                  iconRect.x + iconRect.w * 0.15, iconRect.y + iconRect.h * 0.75,
                  iconRect.x + iconRect.w * 0.45, iconRect.y + iconRect.h * 0.5,
                  iconRect.x + iconRect.w * 0.6, iconRect.y + iconRect.h * 0.68,
                  iconRect.x + iconRect.w * 0.85, iconRect.y + iconRect.h * 0.4,
                ]}
                stroke={FALLBACK_COLORS.imageStroke}
                closed={false}
                listening={false}
              />
              {/* sun */}
              <Rect
                x={iconRect.x + iconRect.w * 0.68}
                y={iconRect.y + iconRect.h * 0.18}
                width={iconRect.w * 0.12}
                height={iconRect.w * 0.12}
                fill={FALLBACK_COLORS.imageStroke}
                cornerRadius={iconRect.w}
                listening={false}
              />
            </Group>
          );
        }

        // TEXTBOXES / QNA
        const elementMock: any = {
          type: 'qna_inline',
          width: sw,
          height: sh,
          padding: it.padding ?? 8,
          align: it.align ?? 'left',
          format: { textAlign: it.align ?? 'left', padding: it.padding ?? 8 },
          paragraphSpacing: 'medium',
          layoutVariant: it.layoutVariant ?? 'inline',
          questionPosition: it.questionPosition ?? 'left',
          questionWidth: it.questionWidth ?? 40,
          cornerRadius: 10,
        };
        const defaults = getToolDefaults(
          'qna_inline',
          themeId,
          themeId,
          elementMock,
          undefined,
          undefined,
          undefined,
          paletteId,
          paletteId
        );
        const questionStyle = defaults.questionSettings || {};
        const answerStyle = defaults.answerSettings || {};

        // Colors
        const bgEnabled = (questionStyle.background?.enabled || answerStyle.background?.enabled) ?? false;
        const bgColor =
          questionStyle.background?.backgroundColor ||
          answerStyle.background?.backgroundColor ||
          FALLBACK_COLORS.fill;
        const bgOpacity = (questionStyle.backgroundOpacity ?? answerStyle.backgroundOpacity ?? 1) as number;

        const borderEnabled = (questionStyle.border?.enabled || answerStyle.border?.enabled) ?? false;
        const borderColor =
          questionStyle.border?.borderColor ||
          answerStyle.border?.borderColor ||
          FALLBACK_COLORS.stroke;
        const borderWidth = (questionStyle.borderWidth || answerStyle.borderWidth || 1.5) as number;
        const borderOpacity = (questionStyle.borderOpacity ?? answerStyle.borderOpacity ?? 1) as number;
        const cornerRadius = (elementMock.cornerRadius ?? 10) as number;

        const qFontSize = questionStyle.fontSize ?? 45;
        const aFontSize = answerStyle.fontSize ?? 50;
        const align = (answerStyle.align || elementMock.align || 'left') as 'left' | 'center' | 'right';
        const padding = (questionStyle.padding ?? answerStyle.padding ?? 8) as number;

        // Layout calculation
        const layout = (elementMock.layoutVariant ?? 'inline') as 'inline' | 'block';
        const qPos = (elementMock.questionPosition ?? 'left') as 'left' | 'right' | 'top' | 'bottom';
        const qWidthPct = Math.max(5, Math.min(95, elementMock.questionWidth ?? 40));

        // Areas
        let questionArea = { x: sx + padding, y: sy + padding, w: sw - padding * 2, h: sh - padding * 2 };
        let answerArea = { x: sx + padding, y: sy + padding, w: sw - padding * 2, h: sh - padding * 2 };

        if (layout === 'block') {
          if (qPos === 'left' || qPos === 'right') {
            const qWidth = (sw * qWidthPct) / 100;
            const aWidth = sw - qWidth - padding * 3;
            if (qPos === 'left') {
              questionArea = { x: sx + padding, y: sy + padding, w: qWidth, h: sh - padding * 2 };
              answerArea = { x: sx + qWidth + padding * 2, y: sy + padding, w: aWidth, h: sh - padding * 2 };
            } else {
              answerArea = { x: sx + padding, y: sy + padding, w: aWidth, h: sh - padding * 2 };
              questionArea = { x: sx + aWidth + padding * 2, y: sy + padding, w: qWidth, h: sh - padding * 2 };
            }
          } else {
            const qHeight = qFontSize + padding * 2;
            const aHeight = sh - qHeight - padding * 3;
            if (qPos === 'top') {
              questionArea = { x: sx + padding, y: sy + padding, w: sw - padding * 2, h: qHeight };
              answerArea = { x: sx + padding, y: sy + qHeight + padding * 2, w: sw - padding * 2, h: aHeight };
            } else {
              answerArea = { x: sx + padding, y: sy + padding, w: sw - padding * 2, h: aHeight };
              questionArea = { x: sx + padding, y: sy + aHeight + padding * 2, w: sw - padding * 2, h: qHeight };
            }
          }
        }

        const linesColor =
          (answerStyle.ruledLines && (answerStyle.ruledLines as any).lineColor) ||
          (answerStyle as any).ruledLinesColor ||
          FALLBACK_COLORS.stroke;
        const showLines = !!answerStyle.ruledLines || !!(answerStyle as any).ruledLinesColor;

        // Draw order: background, ruled lines, border, sample text
        const elements: React.ReactNode[] = [];

        if (bgEnabled) {
          elements.push(
            <Rect
              key={`${it.id}-bg`}
              x={sx}
              y={sy}
              width={sw}
              height={sh}
              fill={bgColor}
              opacity={bgOpacity}
              cornerRadius={cornerRadius}
              listening={false}
            />
          );
        }

        if (showLines) {
          const lineGap = aFontSize * 1.2;
          let startY =
            layout === 'block'
              ? answerArea.y + aFontSize * 0.9
              : sy + padding + Math.max(qFontSize, aFontSize) * 1.2;
          const endY = layout === 'block' ? answerArea.y + answerArea.h - padding : sy + sh - padding;
          const startX = layout === 'block' ? answerArea.x : sx + padding;
          const endX = layout === 'block' ? answerArea.x + answerArea.w : sx + sw - padding;

          for (let yLine = startY; yLine < endY; yLine += lineGap) {
            elements.push(
              <Line
                key={`${it.id}-rl-${yLine}`}
                points={[startX, yLine, endX, yLine]}
                stroke={linesColor}
                strokeWidth={1}
                listening={false}
                opacity={0.9}
              />
            );
          }
        }

        if (borderEnabled) {
          elements.push(
            <Rect
              key={`${it.id}-border`}
              x={sx}
              y={sy}
              width={sw}
              height={sh}
              stroke={borderColor}
              strokeWidth={borderWidth}
              opacity={borderOpacity}
              cornerRadius={cornerRadius}
              fill="transparent"
              listening={false}
            />
          );
        }

        // Sample text
        const sampleQuestion = '[Double-click to add a question…]';
        const sampleAnswer = 'Lorem ipsum dolor sit amet…';

        if (layout === 'block') {
          elements.push(
            <Text
              key={`${it.id}-q`}
              x={questionArea.x}
              y={questionArea.y}
              width={questionArea.w}
              height={questionArea.h}
              text={sampleQuestion}
              fontSize={qFontSize}
              fill={(questionStyle.fontColor || FALLBACK_COLORS.text) as string}
              align={(questionStyle.align || 'left') as any}
              listening={false}
            />
          );
          elements.push(
            <Text
              key={`${it.id}-a`}
              x={answerArea.x}
              y={answerArea.y + 2}
              width={answerArea.w}
              height={answerArea.h}
              text={sampleAnswer}
              fontSize={aFontSize}
              fill={(answerStyle.fontColor || FALLBACK_COLORS.text) as string}
              align={align as any}
              listening={false}
            />
          );
        } else {
          // inline
          const gap = Math.max(10, qFontSize * 0.5);
          const qWidth = Math.min(sw * 0.55, qFontSize * 13);
          elements.push(
            <Text
              key={`${it.id}-q-inline`}
              x={sx + padding}
              y={sy + padding}
              width={qWidth}
              text={sampleQuestion}
              fontSize={qFontSize}
              fill={(questionStyle.fontColor || FALLBACK_COLORS.text) as string}
              align={(questionStyle.align || 'left') as any}
              listening={false}
            />
          );
          elements.push(
            <Text
              key={`${it.id}-a-inline`}
              x={sx + padding + qWidth + gap}
              y={sy + padding}
              width={sw - (padding * 2 + qWidth + gap)}
              text={sampleAnswer}
              fontSize={aFontSize}
              fill={(answerStyle.fontColor || FALLBACK_COLORS.text) as string}
              align={align as any}
              listening={false}
            />
          );
        }

        return <Group key={it.id}>{elements}</Group>;
      })}
    </Group>
  );
}


