import React, { useMemo, useRef, useEffect, forwardRef, useState, useCallback } from 'react';
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

const RichTextShapeComponent = forwardRef<Konva.Shape, { runs: TextRun[]; width: number; height: number }>(
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

export default function TextboxFreeText(props: CanvasItemProps) {
  const { element } = props;
  const { state, dispatch } = useEditor();
  const elementWidth = element.width ?? 0;
  const elementHeight = element.height ?? 0;
  const textShapeRef = useRef<Konva.Shape>(null);
  const textRef = useRef<Konva.Rect>(null);
  const isTransformingRef = useRef(false);
  const transformStartDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const [transformDimensions, setTransformDimensions] = useState<{ width: number; height: number } | null>(null);
  const transformDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => { transformDimensionsRef.current = transformDimensions; }, [transformDimensions]);

  const boxWidth = transformDimensions ? transformDimensions.width : elementWidth;
  const boxHeight = transformDimensions ? transformDimensions.height : elementHeight;
  const textShapeBoxRef = useRef<{ width: number; height: number }>({ width: boxWidth, height: boxHeight });

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
    return createFreeTextLayout({ text: textContent, textStyle, width: boxWidth, height: boxHeight, padding, ctx });
  }, [textContent, textStyle, boxWidth, boxHeight, padding]);

  const visibleRuns = useMemo(() => isEditorOpen ? [] : layout.runs, [layout.runs, isEditorOpen]);

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
      if (linePos.y >= 0 && linePos.y <= boxHeight) {
        const lineElement = renderThemedBorder({
          width: ruledLinesWidth,
          color: ruledLinesColor,
          opacity: ruledLinesOpacity,
          path: createLinePath(padding, linePos.y, boxWidth - padding, linePos.y),
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
  }, [ruledLines, layout.linePositions, padding, boxWidth, boxHeight, ruledLinesWidth, ruledLinesTheme, ruledLinesColor, ruledLinesOpacity, element.id]);

  const showBackground = element.textSettings?.backgroundEnabled && element.textSettings?.backgroundColor;
  const showBorder = element.textSettings?.borderEnabled && element.textSettings?.borderColor && element.textSettings?.borderWidth !== undefined;

  useEffect(() => { textShapeBoxRef.current = { width: boxWidth, height: boxHeight }; }, [boxWidth, boxHeight]);

  const lastDispatchedDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const lastElementIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (lastElementIdRef.current !== null && lastElementIdRef.current !== element.id) {
      setTransformDimensions(null);
      lastDispatchedDimensionsRef.current = null;
      transformStartDimensionsRef.current = null;
    }
    lastElementIdRef.current = element.id;
  }, [element.id]);
  
  useEffect(() => {
    if (isTransformingRef.current || !elementWidth || !elementHeight || elementWidth <= 0 || elementHeight <= 0) return;
    if (transformDimensions) {
      const widthMatch = Math.abs(elementWidth - transformDimensions.width) < 0.1;
      const heightMatch = Math.abs(elementHeight - transformDimensions.height) < 0.1;
      if (widthMatch && heightMatch) {
        const timeoutId = setTimeout(() => {
          if (!isTransformingRef.current) {
            setTransformDimensions(null);
            lastDispatchedDimensionsRef.current = null;
          }
        }, 50);
        return () => clearTimeout(timeoutId);
      } else {
        let shouldReset = true;
        if (lastDispatchedDimensionsRef.current) {
          const dispatchedWidthMatch = Math.abs(elementWidth - lastDispatchedDimensionsRef.current.width) < 0.1;
          const dispatchedHeightMatch = Math.abs(elementHeight - lastDispatchedDimensionsRef.current.height) < 0.1;
          const transformWidthMatch = Math.abs(transformDimensions.width - lastDispatchedDimensionsRef.current.width) < 0.1;
          const transformHeightMatch = Math.abs(transformDimensions.height - lastDispatchedDimensionsRef.current.height) < 0.1;
          if (dispatchedWidthMatch && dispatchedHeightMatch && transformWidthMatch && transformHeightMatch) {
            shouldReset = false;
          }
        }
        if (shouldReset) {
          setTransformDimensions(null);
          lastDispatchedDimensionsRef.current = null;
        }
      }
    }
  }, [elementWidth, elementHeight, transformDimensions, element.id]);

  useEffect(() => {
    const handleTransformStart = (e: CustomEvent) => {
      if (e.detail?.elementId !== element.id) return;
      isTransformingRef.current = true;
      const currentTransformDims = transformDimensionsRef.current;
      const currentWidth = currentTransformDims?.width ?? elementWidth;
      const currentHeight = currentTransformDims?.height ?? elementHeight;
      transformStartDimensionsRef.current = { width: currentWidth, height: currentHeight };
      setTransformDimensions({ width: currentWidth, height: currentHeight });
    };

    const handleTransform = (e: CustomEvent) => {
      if (e.detail?.elementId !== element.id || !isTransformingRef.current) return;
      const rectNode = textRef.current;
      if (!rectNode) return;
      const groupNode = rectNode.getParent();
      if (!groupNode || groupNode.getClassName() !== 'Group') return;
      const scaleX = groupNode.scaleX();
      const scaleY = groupNode.scaleY();
      if (scaleX !== 1 || scaleY !== 1) {
        const startDims = transformStartDimensionsRef.current || { width: elementWidth, height: elementHeight };
        const newWidth = Math.max(5, startDims.width * scaleX);
        const newHeight = Math.max(5, startDims.height * scaleY);
        groupNode.scaleX(1);
        groupNode.scaleY(1);
        textShapeBoxRef.current = { width: newWidth, height: newHeight };
        setTransformDimensions({ width: newWidth, height: newHeight });
        transformStartDimensionsRef.current = { width: newWidth, height: newHeight };
      }
    };

    const handleTransformEnd = (e: CustomEvent) => {
      if (e.detail?.elementId !== element.id) return;
      const finalDims = transformStartDimensionsRef.current;
      if (finalDims && (finalDims.width !== elementWidth || finalDims.height !== elementHeight)) {
        lastDispatchedDimensionsRef.current = { width: finalDims.width, height: finalDims.height };
        dispatch({
          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
          payload: { id: element.id, updates: { width: finalDims.width, height: finalDims.height } }
        });
      } else {
        setTransformDimensions(null);
      }
      isTransformingRef.current = false;
      transformStartDimensionsRef.current = null;
    };

    window.addEventListener('transformStart', handleTransformStart as EventListener);
    window.addEventListener('transform', handleTransform as EventListener);
    window.addEventListener('transformEnd', handleTransformEnd as EventListener);
    return () => {
      window.removeEventListener('transformStart', handleTransformStart as EventListener);
      window.removeEventListener('transform', handleTransform as EventListener);
      window.removeEventListener('transformEnd', handleTransformEnd as EventListener);
    };
  }, [element.id, elementWidth, elementHeight, dispatch]);

  useEffect(() => {
    const shape = textShapeRef.current;
    if (!shape) return;
    type ShapeWithOriginal = Konva.Shape & { __freeTextOriginalGetClientRect?: Konva.Shape['getClientRect'] };
    const shapeWithOriginal = shape as ShapeWithOriginal;
    if (!shapeWithOriginal.__freeTextOriginalGetClientRect) {
      shapeWithOriginal.__freeTextOriginalGetClientRect = shape.getClientRect.bind(shape);
    }
    const limitToTextbox = ((config?: Parameters<Konva.Shape['getClientRect']>[0]) => {
      if (config?.skipTransform && shapeWithOriginal.__freeTextOriginalGetClientRect) {
        return shapeWithOriginal.__freeTextOriginalGetClientRect(config);
      }
      const { width, height } = textShapeBoxRef.current;
      const transform = shape.getAbsoluteTransform().copy();
      const topLeft = transform.point({ x: 0, y: 0 });
      const bottomRight = transform.point({ x: Math.max(width, 0), y: Math.max(height, 0) });
      let rect = {
        x: Math.min(topLeft.x, bottomRight.x),
        y: Math.min(topLeft.y, bottomRight.y),
        width: Math.abs(bottomRight.x - topLeft.x),
        height: Math.abs(bottomRight.y - topLeft.y)
      };
      if (config?.relativeTo) {
        const relativeTransform = config.relativeTo.getAbsoluteTransform().copy().invert();
        const relativeTopLeft = relativeTransform.point({ x: rect.x, y: rect.y });
        const relativeBottomRight = relativeTransform.point({ x: rect.x + rect.width, y: rect.y + rect.height });
        rect = {
          x: Math.min(relativeTopLeft.x, relativeBottomRight.x),
          y: Math.min(relativeTopLeft.y, relativeBottomRight.y),
          width: Math.abs(relativeBottomRight.x - relativeTopLeft.x),
          height: Math.abs(relativeBottomRight.y - relativeTopLeft.y)
        };
      }
      return rect;
    }) as typeof shape.getClientRect;
    shape.getClientRect = limitToTextbox;
    return () => {
      if (shapeWithOriginal.__freeTextOriginalGetClientRect) {
        shape.getClientRect = shapeWithOriginal.__freeTextOriginalGetClientRect;
        delete shapeWithOriginal.__freeTextOriginalGetClientRect;
      }
    };
  }, []);

  const enableInlineTextEditing = useCallback(() => {
    createInlineTextEditorForFreeText({
      element,
      text: textContent,
      textStyle,
      layout,
      padding,
      boxWidth,
      boxHeight,
      textRef,
      setIsEditorOpen,
      dispatch,
      getLineHeight,
      measureText
    });
  }, [element, textContent, textStyle, layout, padding, boxWidth, boxHeight, dispatch]);

  const handleDoubleClick = (e?: Konva.KonvaEventObject<MouseEvent>) => {
    if (props.interactive === false || state.activeTool !== 'select' || (e?.evt && e.evt.button !== 0)) return;
    enableInlineTextEditing();
  };

  const hitArea = useMemo(() => ({ x: 0, y: 0, width: boxWidth, height: boxHeight }), [boxWidth, boxHeight]);

  return (
    <BaseCanvasItem {...props} onDoubleClick={handleDoubleClick} hitArea={hitArea}>
      {showBackground && (
        <Rect
          width={boxWidth}
          height={boxHeight}
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
        const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
        const borderElement = renderThemedBorder({
          width: borderWidth,
          color: borderColor,
          opacity: borderOpacity,
          cornerRadius,
          path: createRectPath(0, 0, boxWidth, boxHeight),
          theme,
          themeSettings: { roughness: theme === 'rough' ? 8 : undefined, seed },
          strokeScaleEnabled: true,
          listening: false
        });
        return borderElement || (
          <Rect
            width={boxWidth}
            height={boxHeight}
            stroke={borderColor}
            strokeWidth={borderWidth}
            opacity={borderOpacity}
            cornerRadius={cornerRadius}
            listening={false}
          />
        );
      })()}
      <RichTextShape ref={textShapeRef} runs={visibleRuns} width={boxWidth} height={layout.contentHeight} />
      {!textContent && !isEditorOpen && (
        <KonvaText
          x={padding}
          y={padding}
          width={boxWidth - padding * 2}
          height={boxHeight - padding * 2}
          text="Double-click to add text..."
          fontSize={Math.max(textStyle.fontSize * 0.8, 16)}
          fontFamily={textStyle.fontFamily}
          fill="#9ca3af"
          opacity={0.4}
          align="left"
          verticalAlign="top"
          listening={false}
        />
      )}
      <Rect ref={textRef} x={0} y={0} width={boxWidth} height={boxHeight} fill="transparent" listening={true} />
    </BaseCanvasItem>
  );
}
