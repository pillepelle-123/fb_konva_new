import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { Shape, Rect, Group, Text as KonvaText } from 'react-konva';
import BaseCanvasItem, { type CanvasItemProps } from './base-canvas-item';
import { useEditor } from '../../../../context/editor-context';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { renderThemedBorder, createRectPath, createLinePath } from '../../../../utils/themed-border';
import type { CanvasElement } from '../../../../context/editor-context';
import type Konva from 'konva';
import type { RichTextStyle, TextRun, TextSegment } from '../../../../../../shared/types/text-layout';
import type { LinePosition, LayoutResult } from '../../../../../../shared/types/layout';
import { buildFont } from '../../../../../../shared/utils/text-layout';
import { createRichTextLayoutFromSegments } from '../../../../../../shared/utils/rich-text-layout';
import { createRichTextInlineEditor } from './rich-text-inline-editor';
import type { Theme } from '../../../../utils/themes-client';

const RULED_LINE_BASELINE_OFFSET = 12;

// Global canvas context for text measurement (shared across all instances)
// PERFORMANCE OPTIMIZATION: Reuse single canvas context instead of creating one per instance
let globalCanvasContext: CanvasRenderingContext2D | null = null;
const getGlobalCanvasContext = () => {
  if (!globalCanvasContext && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    globalCanvasContext = canvas.getContext('2d');
  }
  return globalCanvasContext;
};

const areRunsEqual = (prevRuns: TextRun[], nextRuns: TextRun[]): boolean => {
  if (prevRuns.length !== nextRuns.length) return false;
  for (let i = 0; i < prevRuns.length; i++) {
    const prev = prevRuns[i];
    const next = nextRuns[i];
    if (prev.text !== next.text || prev.x !== next.x || prev.y !== next.y) return false;
    if (
      prev.style.fontSize !== next.style.fontSize ||
      prev.style.fontFamily !== next.style.fontFamily ||
      prev.style.fontColor !== next.style.fontColor ||
      prev.style.fontBold !== next.style.fontBold ||
      prev.style.fontItalic !== next.style.fontItalic ||
      prev.style.fontOpacity !== next.style.fontOpacity
    )
      return false;
  }
  return true;
};

const RichTextShapeComponent = React.forwardRef<
  Konva.Shape,
  { runs: TextRun[]; width: number; height: number }
>(({ runs, width, height }, ref) => (
  <Shape
    ref={ref}
    listening={false}
    width={width}
    height={height}
    sceneFunc={(ctx, shape) => {
      ctx.save();
      ctx.textBaseline = 'alphabetic';
      runs.forEach((run: TextRun) => {
        ctx.font = buildFont(run.style);
        ctx.fillStyle = run.style.fontColor || '#000000';
        ctx.globalAlpha = run.style.fontOpacity ?? 1;
        ctx.fillText(run.text, run.x, run.y);
      });
      ctx.restore();
      ctx.fillStrokeShape(shape);
    }}
  />
));
RichTextShapeComponent.displayName = 'RichTextShapeComponent';

const RichTextShape = React.memo(RichTextShapeComponent, (prevProps, nextProps) => {
  if (prevProps.width !== nextProps.width || prevProps.height !== nextProps.height) return false;
  if (!areRunsEqual(prevProps.runs, nextProps.runs)) return false;
  return true;
}) as typeof RichTextShapeComponent;
RichTextShape.displayName = 'RichTextShape';

function getSegmentsFromElement(element: CanvasElement, defaultStyle: RichTextStyle): TextSegment[] {
  const segments = element.richTextSegments;
  if (segments && segments.length > 0) return segments;
  const text = element.formattedText || element.text || '';
  if (!text) return [];
  return [{ text, style: defaultStyle }];
}

function TextboxQna2(props: CanvasItemProps & { isDragging?: boolean }) {
  const { element, isDragging } = props;
  const { state, dispatch } = useEditor();
  const elementWidth = element.width ?? 0;
  const elementHeight = element.height ?? 0;
  const textShapeRef = useRef<Konva.Shape>(null);
  const textRef = useRef<Konva.Rect>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);

  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const elementTheme = element.theme;
  const pageTheme = elementTheme || currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = elementTheme || state.currentBook?.themeId || state.currentBook?.bookTheme;

  const qna2Defaults = useMemo(() => {
    const activeTheme = pageTheme || bookTheme || 'default';
    return getGlobalThemeDefaults(activeTheme, 'qna2', undefined);
  }, [pageTheme, bookTheme]);

  const defaultStyle = useMemo((): RichTextStyle => {
    const tSettings = element.textSettings || {};
    return {
      fontSize: tSettings.fontSize ?? qna2Defaults.textSettings?.fontSize ?? qna2Defaults.fontSize ?? 50,
      fontFamily:
        tSettings.fontFamily ||
        qna2Defaults.textSettings?.fontFamily ||
        qna2Defaults.fontFamily ||
        'Arial, sans-serif',
      fontBold: tSettings.fontBold ?? qna2Defaults.textSettings?.fontBold ?? false,
      fontItalic: tSettings.fontItalic ?? qna2Defaults.textSettings?.fontItalic ?? false,
      fontColor:
        tSettings.fontColor ||
        qna2Defaults.textSettings?.fontColor ||
        qna2Defaults.fontColor ||
        '#1f2937',
      fontOpacity: tSettings.fontOpacity ?? qna2Defaults.textSettings?.fontOpacity ?? 1,
      paragraphSpacing:
        tSettings.paragraphSpacing ||
        qna2Defaults.textSettings?.paragraphSpacing ||
        element.paragraphSpacing ||
        'medium',
      align:
        tSettings.align ||
        element.format?.textAlign ||
        qna2Defaults.textSettings?.align ||
        qna2Defaults.align ||
        'left'
    };
  }, [
    element.textSettings,
    element.paragraphSpacing,
    element.format?.textAlign,
    qna2Defaults
  ]);

  const padding = element.textSettings?.padding ?? element.padding ?? qna2Defaults.padding ?? 8;
  const richTextSegments = useMemo(
    () => getSegmentsFromElement(element, defaultStyle),
    [element, defaultStyle]
  );

  const layout = useMemo(() => {
    // PERFORMANCE OPTIMIZATION: Use shared global canvas context instead of creating new one per instance
    const ctx = getGlobalCanvasContext();
    return createRichTextLayoutFromSegments({
      segments: richTextSegments,
      width: elementWidth,
      height: elementHeight,
      padding,
      ctx
    });
  }, [richTextSegments, elementWidth, elementHeight, padding]);

  const ruledLines = element.textSettings?.ruledLines ?? qna2Defaults.textSettings?.ruledLines ?? false;
  const ruledLinesWidth =
    element.textSettings?.ruledLinesWidth ?? qna2Defaults.textSettings?.ruledLinesWidth ?? 0.8;
  const ruledLinesTheme =
    element.textSettings?.ruledLinesTheme || qna2Defaults.textSettings?.ruledLinesTheme || 'rough';
  const ruledLinesColor =
    element.textSettings?.ruledLinesColor ||
    qna2Defaults.textSettings?.ruledLinesColor ||
    '#1f2937';
  const ruledLinesOpacity =
    element.textSettings?.ruledLinesOpacity ?? qna2Defaults.textSettings?.ruledLinesOpacity ?? 1;

  const ruledLinesElements = useMemo(() => {
    if (!ruledLines || !layout.linePositions?.length) return [];
    const elements: React.ReactElement[] = [];
    const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
    const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly'];
    const themeString = String(ruledLinesTheme || 'default').toLowerCase().trim();
    const theme = (supportedThemes.includes(themeString as Theme)
      ? themeString
      : 'default') as Theme;

    layout.linePositions.forEach((linePos: LinePosition) => {
      if (linePos.y >= 0 && linePos.y <= elementHeight) {
        const lineElement = renderThemedBorder({
          width: ruledLinesWidth,
          color: ruledLinesColor,
          opacity: ruledLinesOpacity,
          path: createLinePath(padding, linePos.y, elementWidth - padding, linePos.y),
          theme,
          themeSettings: { seed: seed + linePos.y, roughness: theme === 'rough' ? 2 : 1 },
          strokeScaleEnabled: true,
          listening: false,
          key: `ruled-line-${linePos.y}`
        });
        if (lineElement) elements.push(lineElement);
      }
    });
    return elements;
  }, [
    ruledLines,
    layout.linePositions,
    padding,
    elementWidth,
    elementHeight,
    ruledLinesWidth,
    ruledLinesTheme,
    ruledLinesColor,
    ruledLinesOpacity,
    element.id
  ]);

  const showBackground =
    element.textSettings?.backgroundEnabled && element.textSettings?.backgroundColor;
  const showBorder =
    element.textSettings?.borderEnabled &&
    element.textSettings?.borderColor &&
    element.textSettings?.borderWidth !== undefined;

  useEffect(() => {
    const handleTransformStart = (e: CustomEvent) => {
      if (e.detail?.elementId !== element.id) return;
      setIsTransforming(true);
    };

    const handleTransformEnd = (e: CustomEvent) => {
      if (e.detail?.elementId !== element.id) return;
      const rectNode = textRef.current;
      const groupNode = rectNode?.getParent();
      if (!groupNode || groupNode.getClassName() !== 'Group') return;

      const scaleX = groupNode.scaleX();
      const scaleY = groupNode.scaleY();

      // Reset scale back to 1 (Konva best practice)
      groupNode.scaleX(1);
      groupNode.scaleY(1);

      // Calculate final dimensions
      const finalWidth = Math.max(50, groupNode.width() * scaleX);
      const finalHeight = Math.max(30, groupNode.height() * scaleY);

      // Konva Transformer updates the node's position during transform to keep the opposite
      // corner fixed. Use the actual position from the node (center, due to offset) and
      // convert to top-left. This works for all resize handles and any rotation.
      const offsetX = finalWidth / 2;
      const offsetY = finalHeight / 2;
      const correctedX = groupNode.x() - offsetX;
      const correctedY = groupNode.y() - offsetY;

      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: {
          id: element.id,
          updates: {
            width: finalWidth,
            height: finalHeight,
            x: correctedX,
            y: correctedY
          }
        }
      });

      setIsTransforming(false);
    };

    window.addEventListener('transformStart', handleTransformStart as EventListener);
    window.addEventListener('transformEnd', handleTransformEnd as EventListener);
    return () => {
      window.removeEventListener('transformStart', handleTransformStart as EventListener);
      window.removeEventListener('transformEnd', handleTransformEnd as EventListener);
    };
  }, [element.id, dispatch]);

  const enableInlineTextEditing = useCallback(() => {
    createRichTextInlineEditor({
      element,
      richTextSegments,
      defaultStyle,
      textRef,
      setIsEditing,
      dispatch,
      boxWidth: elementWidth,
      boxHeight: elementHeight,
      padding
    });
  }, [element, richTextSegments, defaultStyle, elementWidth, elementHeight, padding, dispatch]);

  const handleDoubleClick = (e?: Konva.KonvaEventObject<MouseEvent>) => {
    if (props.interactive === false || state.activeTool !== 'select' || (e?.evt && e.evt.button !== 0))
      return;
    enableInlineTextEditing();
  };

  const hitArea = useMemo(
    () => ({ x: 0, y: 0, width: elementWidth, height: elementHeight }),
    [elementWidth, elementHeight]
  );

  const showSkeleton = isTransforming || isDragging;
  const hasContent = richTextSegments.some((s) => s.text.trim().length > 0);

  return (
    <BaseCanvasItem {...props} onDoubleClick={handleDoubleClick} hitArea={hitArea}>
      {showSkeleton ? (
        <Group cache listening={false}>
          {Array.from({ length: 3 }, (_, i) => (
            <Rect
              key={`skeleton-${i}`}
              x={0}
              y={i * 24}
              width={elementWidth}
              height={20}
              fill="#e5e7eb"
              opacity={0.6}
              cornerRadius={32}
              listening={false}
            />
          ))}
        </Group>
      ) : (
        <>
          {showBackground && (
            <Rect
              width={elementWidth}
              height={elementHeight}
              fill={
                element.textSettings?.backgroundColor ||
                qna2Defaults.textSettings?.backgroundColor ||
                '#ffffff'
              }
              opacity={
                element.textSettings?.backgroundOpacity ??
                qna2Defaults.textSettings?.backgroundOpacity ??
                1
              }
              cornerRadius={
                element.textSettings?.cornerRadius ??
                element.cornerRadius ??
                qna2Defaults.cornerRadius ??
                0
              }
              listening={false}
            />
          )}
          {ruledLines && ruledLinesElements.length > 0 && (
            <Group listening={false}>{ruledLinesElements}</Group>
          )}
          {showBorder &&
            (() => {
              const borderColor =
                element.textSettings?.borderColor ||
                qna2Defaults.textSettings?.borderColor ||
                '#000000';
              const borderWidth =
                element.textSettings?.borderWidth ??
                qna2Defaults.textSettings?.borderWidth ??
                1;
              const borderOpacity =
                element.textSettings?.borderOpacity ??
                qna2Defaults.textSettings?.borderOpacity ??
                1;
              const cornerRadius =
                element.textSettings?.cornerRadius ??
                element.cornerRadius ??
                qna2Defaults.cornerRadius ??
                0;
              const theme = (element.textSettings?.borderTheme ||
                qna2Defaults.textSettings?.borderTheme ||
                'default') as Theme;
              const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
              const borderElement = renderThemedBorder({
                width: borderWidth,
                color: borderColor,
                opacity: borderOpacity,
                cornerRadius,
                path: createRectPath(0, 0, elementWidth, elementHeight),
                theme,
                themeSettings: { roughness: theme === 'rough' ? 8 : undefined, seed },
                strokeScaleEnabled: true,
                listening: false
              });
              return (
                borderElement || (
                  <Rect
                    width={elementWidth}
                    height={elementHeight}
                    stroke={borderColor}
                    strokeWidth={borderWidth}
                    opacity={borderOpacity}
                    cornerRadius={cornerRadius}
                    listening={false}
                  />
                )
              );
            })()}
          {!isEditing && (
            <RichTextShape
              ref={textShapeRef}
              runs={layout.runs}
              width={elementWidth}
              height={layout.contentHeight}
            />
          )}
          {!hasContent && !isEditing && (
            <KonvaText
              x={padding}
              y={padding}
              width={elementWidth - padding * 2}
              height={elementHeight - padding * 2}
              text="Double-click to add text..."
              fontSize={Math.max(defaultStyle.fontSize * 0.8, 16)}
              fontFamily={defaultStyle.fontFamily}
              fill="#9ca3af"
              opacity={0.4}
              align="left"
              verticalAlign="top"
              listening={false}
            />
          )}
        </>
      )}
      <Rect
        ref={textRef}
        x={0}
        y={0}
        width={elementWidth}
        height={elementHeight}
        fill="transparent"
        listening={true}
      />
    </BaseCanvasItem>
  );
}

// PERFORMANCE OPTIMIZATION: Custom comparison function for React.memo
// Prevents unnecessary re-renders when unrelated canvas state changes (zoom, pan, selection, etc.)
const areTextboxQna2PropsEqual = (
  prevProps: CanvasItemProps & { isDragging?: boolean },
  nextProps: CanvasItemProps & { isDragging?: boolean }
): boolean => {
  const prevEl = prevProps.element;
  const nextEl = nextProps.element;

  // Element-ID muss gleich sein
  if (prevEl.id !== nextEl.id) return false;

  // Basis-Vergleich (wie CanvasItemComponent)
  if (prevEl.x !== nextEl.x) return false;
  if (prevEl.y !== nextEl.y) return false;
  if (prevEl.width !== nextEl.width) return false;
  if (prevEl.height !== nextEl.height) return false;
  if (prevEl.rotation !== nextEl.rotation) return false;
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.zoom !== nextProps.zoom) return false;
  if (prevProps.isDragging !== nextProps.isDragging) return false;

  // QNA2-spezifische Text-Eigenschaften
  if (prevEl.text !== nextEl.text) return false;
  if (prevEl.formattedText !== nextEl.formattedText) return false;
  
  // Rich Text Segments Vergleich
  const prevSegments = prevEl.richTextSegments;
  const nextSegments = nextEl.richTextSegments;
  if (prevSegments?.length !== nextSegments?.length) return false;
  if (prevSegments && nextSegments) {
    if (JSON.stringify(prevSegments) !== JSON.stringify(nextSegments)) return false;
  } else if (prevSegments !== nextSegments) {
    return false;
  }

  // Text Settings Vergleich
  const prevTextSettings = prevEl.textSettings;
  const nextTextSettings = nextEl.textSettings;
  if (JSON.stringify(prevTextSettings) !== JSON.stringify(nextTextSettings)) return false;

  // Visual Properties
  if (prevEl.backgroundColor !== nextEl.backgroundColor) return false;
  if (prevEl.backgroundOpacity !== nextEl.backgroundOpacity) return false;
  if (prevEl.borderColor !== nextEl.borderColor) return false;
  if (prevEl.borderWidth !== nextEl.borderWidth) return false;
  if (prevEl.borderOpacity !== nextEl.borderOpacity) return false;
  if ((prevEl as any).cornerRadius !== (nextEl as any).cornerRadius) return false;
  if ((prevEl as any).padding !== (nextEl as any).padding) return false;
  if ((prevEl as any).paragraphSpacing !== (nextEl as any).paragraphSpacing) return false;
  if ((prevEl as any).theme !== (nextEl as any).theme) return false;

  // Format-Eigenschaften
  const prevFormat = prevEl.format;
  const nextFormat = nextEl.format;
  if (JSON.stringify(prevFormat) !== JSON.stringify(nextFormat)) return false;

  // NOTE: State-abhängige Werte (wie currentPage, bookTheme) werden über useEditor() geholt
  // Diese werden dann über useMemo erkannt und verursachen Re-Renders, was korrekt ist
  // Die Memoization hier verhindert Re-Renders wenn ANDERE State-Werte sich ändern (wie zoom, pan, selection)

  return true;
};

// PERFORMANCE OPTIMIZATION: Wrap component with React.memo to prevent unnecessary re-renders
export default React.memo(TextboxQna2, areTextboxQna2PropsEqual);
