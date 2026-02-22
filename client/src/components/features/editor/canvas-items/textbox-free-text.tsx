import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { Shape, Rect, Text as KonvaText, Group } from 'react-konva';
import BaseCanvasItem, { type CanvasItemProps } from './base-canvas-item';
import { useEditor } from '../../../../context/editor-context';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { renderThemedBorder, createRectPath, createLinePath } from '../../../../utils/themed-border';
import type { CanvasElement } from '../../../../context/editor-context';
import type Konva from 'konva';
import type { RichTextStyle, TextRun } from '../../../../../../shared/types/text-layout';
import type { LinePosition, LayoutResult } from '../../../../../../shared/types/layout';
import { buildFont, getLineHeight, measureText, calculateTextX, wrapText } from '../../../../../../shared/utils/text-layout';
import { createInlineTextEditorForFreeText } from './inline-text-editor';
import type { Theme } from '../../../../utils/themes-client';

const RULED_LINE_BASELINE_OFFSET = 12;

function createFreeTextLayout(params: {
  text: string;
  textStyle: RichTextStyle;
  width: number;
  height: number;
  padding: number;
  ctx: CanvasRenderingContext2D | null;
}): LayoutResult {
  const { text, textStyle, width, height, padding, ctx } = params;
  const runs: TextRun[] = [];
  const linePositions: LinePosition[] = [];
  const lineHeight = getLineHeight(textStyle);
  const baselineOffset = textStyle.fontSize * 0.8;
  const availableWidth = Math.max(10, width - padding * 2);
  let cursorY = padding;
  const textLines = wrapText(text, textStyle, availableWidth, ctx);

  textLines.forEach((line: { text: string; width: number }) => {
    const baselineY = cursorY + baselineOffset;
    if (line.text) {
      const textX = calculateTextX(line.text, textStyle, padding, availableWidth, ctx);
      runs.push({ text: line.text, x: textX, y: baselineY, style: textStyle });
    }
    linePositions.push({ y: baselineY + RULED_LINE_BASELINE_OFFSET, lineHeight, style: textStyle });
    cursorY += lineHeight;
  });

  // Add additional ruled lines to fill the rest of the box
  const bottomLimit = height - padding;
  while (cursorY < bottomLimit) {
    const baselineY = cursorY + baselineOffset;
    const lineY = baselineY + RULED_LINE_BASELINE_OFFSET;
    if (lineY > bottomLimit) break;
    linePositions.push({ y: lineY, lineHeight, style: textStyle });
    cursorY += lineHeight;
  }

  return { runs, contentHeight: Math.max(cursorY, height), linePositions };
}

const areRunsEqual = (prevRuns: TextRun[], nextRuns: TextRun[]): boolean => {
  if (prevRuns.length !== nextRuns.length) return false;
  for (let i = 0; i < prevRuns.length; i++) {
    const prev = prevRuns[i];
    const next = nextRuns[i];
    if (prev.text !== next.text || prev.x !== next.x || prev.y !== next.y) return false;
    if (prev.style.fontSize !== next.style.fontSize || prev.style.fontFamily !== next.style.fontFamily ||
        prev.style.fontColor !== next.style.fontColor || prev.style.fontBold !== next.style.fontBold ||
        prev.style.fontItalic !== next.style.fontItalic || prev.style.fontOpacity !== next.style.fontOpacity) return false;
  }
  return true;
};

const RichTextShapeComponent = React.forwardRef<Konva.Shape, { runs: TextRun[]; width: number; height: number }>(
  ({ runs, width, height }, ref) => (
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
  )
);
RichTextShapeComponent.displayName = 'RichTextShapeComponent';

const RichTextShape = React.memo(RichTextShapeComponent, (prevProps, nextProps) => {
  if (prevProps.width !== nextProps.width || prevProps.height !== nextProps.height) return false;
  if (!areRunsEqual(prevProps.runs, nextProps.runs)) return false;
  return true;
}) as typeof RichTextShapeComponent;
RichTextShape.displayName = 'RichTextShape';

export default function TextboxFreeText(props: CanvasItemProps & { isDragging?: boolean }) {
  const { element, isDragging } = props;
  const { state, dispatch } = useEditor();
  const elementWidth = element.width ?? 0;
  const elementHeight = element.height ?? 0;
  const textShapeRef = useRef<Konva.Shape>(null);
  const textRef = useRef<Konva.Rect>(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const storedResizeDirectionRef = useRef<{ fromTop: boolean; fromLeft: boolean } | null>(null);
  const transformStartSizeRef = useRef<{ width: number; height: number } | null>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [isTooltipMounted, setIsTooltipMounted] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [isHoveringText, setIsHoveringText] = useState(false);

  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const elementTheme = element.theme;
  const pageTheme = elementTheme || currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = elementTheme || state.currentBook?.themeId || state.currentBook?.bookTheme;
  
  const freeTextDefaults = useMemo(() => {
    const activeTheme = pageTheme || bookTheme || 'default';
    return getGlobalThemeDefaults(activeTheme, 'free_text', undefined);
  }, [pageTheme, bookTheme]);

  const textStyle = useMemo(() => {
    const tSettings = element.textSettings || {};
    const style: RichTextStyle = {
      fontSize: tSettings.fontSize ?? freeTextDefaults.textSettings?.fontSize ?? freeTextDefaults.fontSize ?? 50,
      fontFamily: tSettings.fontFamily || freeTextDefaults.textSettings?.fontFamily || freeTextDefaults.fontFamily || 'Arial, sans-serif',
      fontBold: tSettings.fontBold ?? freeTextDefaults.textSettings?.fontBold ?? false,
      fontItalic: tSettings.fontItalic ?? freeTextDefaults.textSettings?.fontItalic ?? false,
      fontColor: tSettings.fontColor || freeTextDefaults.textSettings?.fontColor || freeTextDefaults.fontColor || '#1f2937',
      fontOpacity: tSettings.fontOpacity ?? freeTextDefaults.textSettings?.fontOpacity ?? 1,
      paragraphSpacing: tSettings.paragraphSpacing || freeTextDefaults.textSettings?.paragraphSpacing || element.paragraphSpacing || 'medium',
      align: tSettings.align || element.format?.textAlign || freeTextDefaults.textSettings?.align || freeTextDefaults.align || 'left'
    };
    return style;
  }, [element.textSettings, element.paragraphSpacing, element.format?.textAlign, freeTextDefaults]);

  const padding = element.textSettings?.padding ?? element.padding ?? freeTextDefaults.padding ?? 8;
  const textContent = useMemo(() => element.formattedText || element.text || '', [element.formattedText, element.text]);

  const layout = useMemo(() => {
    const ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    return createFreeTextLayout({ text: textContent, textStyle, width: elementWidth, height: elementHeight, padding, ctx });
  }, [textContent, textStyle, elementWidth, elementHeight, padding]);

  const ruledLines = element.textSettings?.ruledLines ?? freeTextDefaults.textSettings?.ruledLines ?? false;
  const ruledLinesWidth = element.textSettings?.ruledLinesWidth ?? freeTextDefaults.textSettings?.ruledLinesWidth ?? 0.8;
  const ruledLinesTheme = element.textSettings?.ruledLinesTheme || freeTextDefaults.textSettings?.ruledLinesTheme || 'rough';
  const ruledLinesColor = element.textSettings?.ruledLinesColor || freeTextDefaults.textSettings?.ruledLinesColor || '#1f2937';
  const ruledLinesOpacity = element.textSettings?.ruledLinesOpacity ?? freeTextDefaults.textSettings?.ruledLinesOpacity ?? 1;

  const ruledLinesElements = useMemo(() => {
    if (!ruledLines || !layout.linePositions?.length) return [];
    const elements: React.ReactElement[] = [];
    const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
    const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly'];
    const themeString = String(ruledLinesTheme || 'default').toLowerCase().trim();
    const theme = (supportedThemes.includes(themeString as Theme) ? themeString : 'default') as Theme;

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
  }, [ruledLines, layout.linePositions, padding, elementWidth, elementHeight, ruledLinesWidth, ruledLinesTheme, ruledLinesColor, ruledLinesOpacity, element.id]);

  const showBackground = element.textSettings?.backgroundEnabled && element.textSettings?.backgroundColor;
  const showBorder = element.textSettings?.borderEnabled && element.textSettings?.borderColor && element.textSettings?.borderWidth !== undefined;

  // Listen for transform events to show skeleton during resize
  React.useEffect(() => {
    const handleTransformStart = (e: CustomEvent) => {
      if (e.detail?.elementId !== element.id) return;

      setIsTransforming(true);

      const rectNode = textRef.current;
      if (!rectNode) return;

      const groupNode = rectNode.getParent();
      if (!groupNode || groupNode.getClassName() !== 'Group') return;

      const stage = groupNode.getStage();
      const transformer = stage?.findOne('Transformer') as Konva.Transformer | null;

      if (transformer) {
        const activeAnchor = transformer.getActiveAnchor();
        if (activeAnchor) {
          const fromTop = activeAnchor.includes('top');
          const fromLeft = activeAnchor.includes('left');
          storedResizeDirectionRef.current = { fromTop, fromLeft };
        }
      }

      const baseWidth = elementWidth || groupNode.width() || groupNode.getClientRect({ skipTransform: true }).width;
      const baseHeight = elementHeight || groupNode.height() || groupNode.getClientRect({ skipTransform: true }).height;
      transformStartSizeRef.current = { width: baseWidth, height: baseHeight };
    };

    const handleTransformEnd = (e: CustomEvent) => {
      if (e.detail?.elementId !== element.id) return;

      const rectNode = textRef.current;
      const groupNode = rectNode?.getParent();
      if (!groupNode || groupNode.getClassName() !== 'Group') return;

      const scaleX = groupNode.scaleX();
      const scaleY = groupNode.scaleY();

      const startSize = transformStartSizeRef.current;
      const baseWidth = startSize?.width || groupNode.width() || elementWidth;
      const baseHeight = startSize?.height || groupNode.height() || elementHeight;
      const currentWidth = groupNode.width();
      const currentHeight = groupNode.height();

      groupNode.scaleX(1);
      groupNode.scaleY(1);

      const scaledWidth = baseWidth * scaleX;
      const scaledHeight = baseHeight * scaleY;
      const finalWidth = Math.max(50, scaleX === 1 && currentWidth !== baseWidth ? currentWidth : scaledWidth);
      const finalHeight = Math.max(30, scaleY === 1 && currentHeight !== baseHeight ? currentHeight : scaledHeight);

      const widthChange = finalWidth - (startSize?.width ?? elementWidth);
      const heightChange = finalHeight - (startSize?.height ?? elementHeight);

      const resizeDirection = storedResizeDirectionRef.current;
      const positionUpdates: { x?: number; y?: number } = {};

      if (resizeDirection?.fromLeft && widthChange !== 0) {
        positionUpdates.x = element.x - widthChange / 2;
      }

      if (resizeDirection?.fromTop && heightChange !== 0) {
        positionUpdates.y = element.y - heightChange / 2;
      }

      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: {
          id: element.id,
          updates: {
            width: finalWidth,
            height: finalHeight,
            ...positionUpdates
          }
        }
      });

      setIsTransforming(false);
      storedResizeDirectionRef.current = null;
      transformStartSizeRef.current = null;
    };

    window.addEventListener('transformStart', handleTransformStart as EventListener);
    window.addEventListener('transformEnd', handleTransformEnd as EventListener);
    return () => {
      window.removeEventListener('transformStart', handleTransformStart as EventListener);
      window.removeEventListener('transformEnd', handleTransformEnd as EventListener);
    };
  }, [element.id, elementWidth, elementHeight, element.x, element.y, dispatch]);

  const enableInlineTextEditing = useCallback(() => {
    createInlineTextEditorForFreeText({
      element,
      text: textContent,
      textStyle,
      layout,
      padding,
      boxWidth: elementWidth,
      boxHeight: elementHeight,
      textRef,
      setIsEditorOpen: () => {},
      dispatch,
      getLineHeight,
      measureText
    });
  }, [element, textContent, textStyle, layout, padding, elementWidth, elementHeight, dispatch]);

  const handleDoubleClick = (e?: Konva.KonvaEventObject<MouseEvent>) => {
    if (props.interactive === false || state.activeTool !== 'select' || (e?.evt && e.evt.button !== 0)) return;
    enableInlineTextEditing();
  };

  const handleMouseEnter = useCallback(() => {
    const stage = textRef.current?.getStage();
    if (!stage) return;
    stage.container().style.cursor = 'pointer';
  }, []);

  const handleMouseLeave = useCallback(() => {
    const stage = textRef.current?.getStage();
    if (!stage) return;
    stage.container().style.cursor = '';
    setIsHoveringText(false);
    setTooltipPosition(null);
  }, []);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (props.interactive === false || state.activeTool !== 'select') {
      setIsHoveringText(false);
      setTooltipPosition(null);
      return;
    }

    const stage = e.target.getStage();
    if (!stage) return;

    const groupNode = textRef.current?.getParent();
    if (!groupNode) return;

    const groupTransform = groupNode.getAbsoluteTransform();
    const stageBox = stage.container().getBoundingClientRect();

    const topRightLocalPos = {
      x: elementWidth,
      y: 0
    };
    const topRightStagePos = groupTransform.point(topRightLocalPos);

    setIsHoveringText(true);
    setTooltipPosition({
      x: stageBox.left + topRightStagePos.x,
      y: stageBox.top + topRightStagePos.y
    });
  }, [props.interactive, state.activeTool, elementWidth]);

  useEffect(() => {
    if (!isHoveringText || !tooltipPosition || state.activeTool !== 'select') {
      setIsTooltipVisible(false);
      const hideTimeout = setTimeout(() => {
        setIsTooltipMounted(false);
        const existingTooltip = document.getElementById(`free-text-tooltip-${element.id}`);
        if (existingTooltip) {
          existingTooltip.remove();
        }
      }, 200);
      return () => clearTimeout(hideTimeout);
    }

    setIsTooltipMounted(true);
    const showTimeout = setTimeout(() => setIsTooltipVisible(true), 10);
    return () => clearTimeout(showTimeout);
  }, [isHoveringText, tooltipPosition, state.activeTool, element.id]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isTooltipMounted || !tooltipPosition) return;

    const existingTooltip = document.getElementById(`free-text-tooltip-${element.id}`);
    if (existingTooltip) {
      existingTooltip.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.id = `free-text-tooltip-${element.id}`;
    tooltip.className = `fixed pointer-events-none transition-all duration-200 ease-out ${
      isTooltipVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
    }`;
    tooltip.style.left = `${tooltipPosition.x}px`;
    tooltip.style.top = `${tooltipPosition.y - 30}px`;
    tooltip.style.transform = 'translateX(-100%)';
    tooltip.style.zIndex = '100000';

    const tooltipContent = document.createElement('div');
    tooltipContent.style.backgroundColor = '#ffffff';
    tooltipContent.style.color = '#000000';
    tooltipContent.style.padding = '4px 8px';
    tooltipContent.style.borderRadius = '4px';
    tooltipContent.style.whiteSpace = 'nowrap';
    tooltipContent.style.fontSize = '12px';
    tooltipContent.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
    tooltipContent.textContent = 'Double-click to edit text';
    tooltip.appendChild(tooltipContent);

    document.body.appendChild(tooltip);

    return () => {
      const tooltipToRemove = document.getElementById(`free-text-tooltip-${element.id}`);
      if (tooltipToRemove) {
        tooltipToRemove.remove();
      }
    };
  }, [isTooltipMounted, isTooltipVisible, tooltipPosition, element.id]);

  const hitArea = useMemo(() => ({ x: 0, y: 0, width: elementWidth, height: elementHeight }), [elementWidth, elementHeight]);

  // Show skeleton during transform or drag
  const showSkeleton = isTransforming || isDragging;

  return (
    <BaseCanvasItem
      {...props}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      hitArea={hitArea}
    >
      {showSkeleton ? (
        <Group cache listening={false}>
          {(() => {
            const fontSize = textStyle?.fontSize || 16;
            const lineHeight = getLineHeight(textStyle) || fontSize * 1.3;
            const layoutLineCount = layout.linePositions?.length ?? 0;
            const heightLineCount = Math.round(elementHeight / lineHeight);
            const numLines = Math.max(1, layoutLineCount || heightLineCount);
            return Array.from({ length: numLines }, (_, lineIndex) => (
              <Rect
                key={`skeleton-line-${lineIndex}`}
                x={0}
                y={lineIndex * lineHeight}
                width={elementWidth}
                height={Math.min(lineHeight * 0.8, elementHeight - lineIndex * lineHeight)}
                fill="#e5e7eb"
                opacity={0.6}
                cornerRadius={32}
                listening={false}
              />
            ));
          })()}
        </Group>
      ) : (
        <>
          {showBackground && (
            <Rect
              width={elementWidth}
              height={elementHeight}
              fill={element.textSettings?.backgroundColor || freeTextDefaults.textSettings?.backgroundColor || '#ffffff'}
              opacity={element.textSettings?.backgroundOpacity ?? freeTextDefaults.textSettings?.backgroundOpacity ?? 1}
              cornerRadius={element.textSettings?.cornerRadius ?? element.cornerRadius ?? freeTextDefaults.cornerRadius ?? 0}
              listening={false}
            />
          )}
          {ruledLines && ruledLinesElements.length > 0 && <Group listening={false}>{ruledLinesElements}</Group>}
          {showBorder && (() => {
        const borderColor = element.textSettings?.borderColor || freeTextDefaults.textSettings?.borderColor || '#000000';
        const borderWidth = element.textSettings?.borderWidth ?? freeTextDefaults.textSettings?.borderWidth ?? 1;
        const borderOpacity = element.textSettings?.borderOpacity ?? freeTextDefaults.textSettings?.borderOpacity ?? 1;
        const cornerRadius = element.textSettings?.cornerRadius ?? element.cornerRadius ?? freeTextDefaults.cornerRadius ?? 0;
        const theme = (element.textSettings?.borderTheme || freeTextDefaults.textSettings?.borderTheme || 'default') as Theme;
        const seed = theme === 'rough' ? 1 : (parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1);
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
        return borderElement || (
          <Rect
            width={elementWidth}
            height={elementHeight}
            stroke={borderColor}
            strokeWidth={borderWidth}
            opacity={borderOpacity}
            cornerRadius={cornerRadius}
            listening={false}
          />
        );
          })()}
          <RichTextShape ref={textShapeRef} runs={layout.runs} width={elementWidth} height={layout.contentHeight} />
          {!textContent && (
            <KonvaText
              x={padding}
              y={padding}
              width={elementWidth - padding * 2}
              height={elementHeight - padding * 2}
              text="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore."
              fontSize={Math.max(textStyle.fontSize * 0.8, 16)}
              fontFamily={textStyle.fontFamily}
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
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </BaseCanvasItem>
  );
}
