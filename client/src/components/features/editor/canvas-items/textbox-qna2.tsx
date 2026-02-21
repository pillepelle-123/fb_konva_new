import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { Shape, Rect, Group, Text as KonvaText } from 'react-konva';
import BaseCanvasItem, { type CanvasItemProps } from './base-canvas-item';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { calculateQuestionStyle, calculateAnswerStyle, getDisplaySegments } from './textbox-qna-utils';
import { renderThemedBorder, createRectPath, createLinePath } from '../../../../utils/themed-border';
import type Konva from 'konva';
import type { TextRun } from '../../../../../../shared/types/text-layout';
import type { LinePosition } from '../../../../../../shared/types/layout';
import { buildFont, getLineHeight } from '../../../../../../shared/utils/text-layout';
import { calculateContrastColor } from '../../../../utils/contrast-color';
import { createRichTextLayoutFromSegments } from '../../../../../../shared/utils/rich-text-layout';
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

function TextboxQna2(props: CanvasItemProps & { isDragging?: boolean }) {
  const { element, isDragging, answerText: propsAnswerText, assignedUser: propsAssignedUser, questionStyle: propsQuestionStyle, answerStyle: propsAnswerStyle } = props;
  const { state, dispatch, getQuestionText } = useEditor();
  const { user } = useAuth();
  const elementWidth = element.width ?? 0;
  const elementHeight = element.height ?? 0;
  const textShapeRef = useRef<Konva.Shape>(null);
  const textRef = useRef<Konva.Rect>(null);
  const [isEditing] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);

  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const elementTheme = element.theme;
  const pageTheme = elementTheme || currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = elementTheme || state.currentBook?.themeId || state.currentBook?.bookTheme;

  const pageColorPaletteId = currentPage?.colorPaletteId;
  const bookColorPaletteId = state.currentBook?.colorPaletteId;
  const qna2Defaults = useMemo(() => {
    const activeTheme = pageTheme || bookTheme || 'default';
    const effectivePaletteId = pageColorPaletteId || bookColorPaletteId;
    return getGlobalThemeDefaults(activeTheme, 'qna2', effectivePaletteId);
  }, [pageTheme, bookTheme, pageColorPaletteId, bookColorPaletteId]);

  const questionStyle = useMemo(
    () => propsQuestionStyle ?? calculateQuestionStyle(element, currentPage, state.currentBook ?? undefined),
    [propsQuestionStyle, element, currentPage, state.currentBook]
  );
  const answerStyle = useMemo(
    () => propsAnswerStyle ?? calculateAnswerStyle(element, currentPage, state.currentBook ?? undefined),
    [propsAnswerStyle, element, currentPage, state.currentBook]
  );

  const padding = element.textSettings?.padding ?? element.padding ?? qna2Defaults.padding ?? 8;
  const questionText = element.questionId ? getQuestionText(element.questionId) : '';
  const elementPageNumber = useMemo(() => {
    if (!state.currentBook?.pages) return null;
    for (const page of state.currentBook.pages) {
      if (page.elements?.some((el) => el.id === element.id)) {
        return page.pageNumber ?? null;
      }
    }
    return null;
  }, [state.currentBook?.pages, element.id]);
  const assignedUser = propsAssignedUser ?? (elementPageNumber !== null
    ? (state.pageAssignments[elementPageNumber] ?? (
        state.userRole === 'author' && state.assignedPages?.includes(elementPageNumber) && user
          ? { id: user.id }
          : null
      ))
    : null);
  const answerText = propsAnswerText ?? (element.questionId && assignedUser
    ? (state.tempAnswers[element.questionId]?.[assignedUser.id] as { text?: string } | undefined)?.text ?? ''
    : undefined);
  const richTextSegments = useMemo(
    () => getDisplaySegments(element, questionStyle, answerStyle, questionText, answerText),
    [element, questionStyle, answerStyle, questionText, answerText]
  );
  const answerInNewRow = (element as any).answerInNewRow ?? false;
  const questionAnswerGap = (element as any).questionAnswerGap ?? 0;
  const questionAnswerGapVertical = (element as any).questionAnswerGapVertical ?? questionAnswerGap;
  const questionAnswerGapHorizontal = (element as any).questionAnswerGapHorizontal ?? questionAnswerGap;

  const layout = useMemo(() => {
    const ctx = getGlobalCanvasContext();
    return createRichTextLayoutFromSegments({
      segments: richTextSegments,
      width: elementWidth,
      height: elementHeight,
      padding,
      ctx,
      questionAnswerGapVertical: answerInNewRow ? questionAnswerGapVertical : 0,
      questionAnswerGapHorizontal: !answerInNewRow ? questionAnswerGapHorizontal : 0
    });
  }, [richTextSegments, elementWidth, elementHeight, padding, answerInNewRow, questionAnswerGapVertical, questionAnswerGapHorizontal]);

  const ruledLinesConfig = element.ruledLines ?? element.textSettings?.ruledLines ?? qna2Defaults.textSettings?.ruledLines ?? false;
  const ruledLines = typeof ruledLinesConfig === 'object' && ruledLinesConfig !== null
    ? (ruledLinesConfig as { enabled?: boolean }).enabled ?? false
    : !!ruledLinesConfig;
  const ruledLinesWidth =
    element.ruledLinesWidth ?? element.textSettings?.ruledLinesWidth ?? qna2Defaults.textSettings?.ruledLinesWidth ?? 0.8;
  const ruledLinesTheme =
    element.ruledLinesTheme || element.textSettings?.ruledLinesTheme || qna2Defaults.textSettings?.ruledLinesTheme || 'rough';
  const ruledLinesColor =
    element.ruledLinesColor ||
    element.textSettings?.ruledLinesColor ||
    qna2Defaults.textSettings?.ruledLinesColor ||
    '#1f2937';
  const ruledLinesOpacity =
    element.ruledLinesOpacity ?? element.textSettings?.ruledLinesOpacity ?? qna2Defaults.textSettings?.ruledLinesOpacity ?? 1;

  const ruledLinesElements = useMemo(() => {
    if (!ruledLines) return [];
    const answerLineHeight = getLineHeight(answerStyle);
    const bottomLimit = elementHeight - padding;
    const topLimit = padding;

    // Erweiterte Linien-Positionen: Text-Zeilen + Fortsetzung nur nach unten mit gleichem Abstand wie Antwort-Zeilen
    let extendedPositions: LinePosition[] = [];
    if (layout.linePositions?.length) {
      const lastY = layout.linePositions[layout.linePositions.length - 1].y;
      const lastStyle = layout.linePositions[layout.linePositions.length - 1].style;
      extendedPositions = [...layout.linePositions];
      // Nur nach unten fortführen bis zur Box-Unterkante (nicht nach oben, um Linien über dem Fragen-Text zu vermeiden)
      let y = lastY + answerLineHeight;
      while (y <= bottomLimit) {
        extendedPositions.push({ y, lineHeight: answerLineHeight, style: lastStyle });
        y += answerLineHeight;
      }
    } else {
      // Leere Textbox: Linien von oben nach unten mit Antwort-Zeilenabstand
      const baselineOffset = answerStyle.fontSize * 0.8;
      const firstLineY = padding + baselineOffset + RULED_LINE_BASELINE_OFFSET;
      let y = firstLineY;
      while (y <= bottomLimit) {
        extendedPositions.push({ y, lineHeight: answerLineHeight, style: answerStyle });
        y += answerLineHeight;
      }
    }

    if (extendedPositions.length === 0) return [];
    const elements: React.ReactElement[] = [];
    const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
    const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly'];
    const themeString = String(ruledLinesTheme || 'default').toLowerCase().trim();
    const theme = (supportedThemes.includes(themeString as Theme)
      ? themeString
      : 'default') as Theme;

    extendedPositions.forEach((linePos: LinePosition) => {
      if (linePos.y >= topLimit && linePos.y <= bottomLimit) {
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
    answerStyle,
    ruledLinesWidth,
    ruledLinesTheme,
    ruledLinesColor,
    ruledLinesOpacity,
    element.id
  ]);

  const showBackground = Boolean(
    element.backgroundEnabled ?? element.textSettings?.backgroundEnabled
  ) && (element.backgroundColor ?? element.textSettings?.backgroundColor);
  const showBorder = Boolean(
    element.borderEnabled ?? element.textSettings?.borderEnabled
  ) && (element.borderColor ?? element.textSettings?.borderColor) && (element.borderWidth ?? element.textSettings?.borderWidth) !== undefined;

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

      // WICHTIG: Scale VOR dem Canvas-Reset lesen – das Canvas setzt scale danach auf 1
      const scaleX = groupNode.scaleX();
      const scaleY = groupNode.scaleY();

      // Reset scale back to 1 (Konva best practice)
      groupNode.scaleX(1);
      groupNode.scaleY(1);

      // Finale Maße aus Group-Dimensionen × Scale (muss mit gezogenen Maßen übereinstimmen)
      const finalWidth = Math.max(50, groupNode.width() * scaleX);
      const finalHeight = Math.max(30, groupNode.height() * scaleY);

      // Konva Transformer aktualisiert die Position während des Transforms.
      // Group nutzt offset für Zentrum – Position in top-left umrechnen.
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

  // Berechtigungen: Owner/Publisher → Question-Tab; pageAssignment → Answer-Tab
  const isOwnerUser = Boolean(state.currentBook?.owner_id && user?.id === state.currentBook.owner_id);
  const isPublisherUser = isOwnerUser || state.userRole === 'publisher';
  const canShowQuestionTab = isPublisherUser;
  const canShowAnswerTab = Boolean(assignedUser && user?.id === assignedUser.id);
  const canOpenQna2Editor = canShowQuestionTab || canShowAnswerTab;

  const handleDoubleClick = (e?: Konva.KonvaEventObject<MouseEvent>) => {
    if (props.interactive === false || state.activeTool !== 'select' || (e?.evt && e.evt.button !== 0))
      return;
    if (!e || !canOpenQna2Editor) return;
    window.dispatchEvent(
      new CustomEvent('openQuestionDialog', { detail: { elementId: element.id } })
    );
  };

  const hitArea = useMemo(
    () => ({ x: 0, y: 0, width: elementWidth, height: elementHeight }),
    [elementWidth, elementHeight]
  );

  const showSkeleton = isTransforming || isDragging;
  const hasContent = layout.runs.length > 0;
  const placeholderColor = useMemo(
    () => calculateContrastColor(currentPage ?? undefined),
    [currentPage]
  );
  const tooltipText = canOpenQna2Editor
    ? 'Double-click to edit question and answer'
    : 'Double-click to edit';

  const handleTooltip = useCallback(
    (evt: Konva.KonvaEventObject<MouseEvent>) => {
      if (props.interactive === false) return;
      const { clientX, clientY } = evt.evt;
      window.dispatchEvent(
        new CustomEvent('imageQualityTooltip', {
          detail: {
            text: tooltipText,
            screenX: clientX,
            screenY: clientY
          }
        })
      );
    },
    [tooltipText, props.interactive]
  );

  const handleTooltipHide = useCallback(() => {
    window.dispatchEvent(new CustomEvent('imageQualityTooltipHide'));
  }, []);

  const handleMouseEnter = useCallback(
    (evt: Konva.KonvaEventObject<MouseEvent>) => {
      handleTooltip(evt);
      if (canOpenQna2Editor) {
        const stage = evt.target.getStage();
        if (stage?.container()) {
          stage.container().style.cursor = 'pointer';
        }
      }
    },
    [handleTooltip, canOpenQna2Editor]
  );

  const handleMouseLeave = useCallback(
    (evt: Konva.KonvaEventObject<MouseEvent>) => {
      handleTooltipHide();
      const stage = evt.target.getStage();
      if (stage?.container()) {
        stage.container().style.cursor = '';
      }
    },
    [handleTooltipHide]
  );

  // Skeleton-Zeilen: einheitlicher Abstand, ein Rectangle pro Slot, größere Lücken dazwischen
  const skeletonLinePositions = useMemo(() => {
    const answerLineHeight = getLineHeight(answerStyle);
    const bottomLimit = elementHeight - padding;
    const topLimit = padding;
    const LINE_GAP = 14; // Lücke zwischen den Rechtecken (größer für bessere Lesbarkeit)
    const LINE_HEIGHT = answerLineHeight; // Einheitlicher Abstand für alle Rechtecke
    const rectHeight = Math.max(4, LINE_HEIGHT - LINE_GAP);
    const positions: { rectY: number; rectHeight: number }[] = [];
    let y = topLimit;
    while (y + LINE_HEIGHT <= bottomLimit) {
      const rectY = y + (LINE_HEIGHT - rectHeight) / 2;
      positions.push({ rectY, rectHeight });
      y += LINE_HEIGHT;
    }
    return positions;
  }, [elementHeight, padding, answerStyle]);

  return (
    <BaseCanvasItem {...props} onDoubleClick={handleDoubleClick} hitArea={hitArea}>
      {showSkeleton ? (
        <Group listening={false}>
          {skeletonLinePositions.map((pos, i) => (
            <Rect
              key={`skeleton-${i}`}
              x={padding}
              y={pos.rectY}
              width={elementWidth - padding * 2}
              height={pos.rectHeight}
              fill="#e5e7eb"
              opacity={0.6}
              cornerRadius={12}
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
                element.backgroundColor ??
                (element.textSettings?.backgroundColor ||
                  qna2Defaults.textSettings?.backgroundColor ||
                  '#ffffff')
              }
              opacity={
                element.backgroundOpacity ??
                element.textSettings?.backgroundOpacity ??
                qna2Defaults.textSettings?.backgroundOpacity ??
                1
              }
              cornerRadius={
                element.cornerRadius ??
                element.textSettings?.cornerRadius ??
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
                  element.borderColor ??
                  (element.textSettings?.borderColor ||
                    qna2Defaults.textSettings?.borderColor ||
                    '#000000');
              const borderWidth =
                element.borderWidth ??
                element.textSettings?.borderWidth ??
                qna2Defaults.textSettings?.borderWidth ??
                1;
              const borderOpacity =
                element.borderOpacity ??
                element.textSettings?.borderOpacity ??
                qna2Defaults.textSettings?.borderOpacity ??
                1;
              const cornerRadius =
                element.cornerRadius ??
                element.textSettings?.cornerRadius ??
                qna2Defaults.cornerRadius ??
                0;
              const theme = (element.borderTheme ??
                (element.textSettings?.borderTheme ||
                  qna2Defaults.textSettings?.borderTheme ||
                  'default')) as Theme;
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
            hasContent ? (
              <RichTextShape
                ref={textShapeRef}
                runs={layout.runs}
                width={elementWidth}
                height={layout.contentHeight}
              />
            ) : (
              <KonvaText
                x={padding}
                y={padding}
                width={elementWidth - padding * 2}
                text="Double click to add question"
                fontSize={answerStyle.fontSize}
                fontFamily={answerStyle.fontFamily ?? 'Arial, sans-serif'}
                fill={placeholderColor}
                listening={false}
              />
            )
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
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleTooltip}
        onMouseLeave={handleMouseLeave}
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

  // Element-Referenz geändert → immer neu rendern (z.B. nach UPDATE_ELEMENT_PRESERVE_SELECTION)
  if (prevEl !== nextEl) return false;

  // Props vom Canvas (questionStyle, answerStyle etc.) – Änderungen sofort sichtbar machen
  if (prevProps.questionText !== nextProps.questionText) return false;
  if (prevProps.answerText !== nextProps.answerText) return false;
  const prevQS = prevProps.questionStyle;
  const nextQS = nextProps.questionStyle;
  if (JSON.stringify(prevQS) !== JSON.stringify(nextQS)) return false;
  const prevAS = prevProps.answerStyle;
  const nextAS = nextProps.answerStyle;
  if (JSON.stringify(prevAS) !== JSON.stringify(nextAS)) return false;

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
  if (prevEl.questionId !== nextEl.questionId) return false;
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

  // Question/Answer Settings – von qna-settings-form geändert
  if (JSON.stringify((prevEl as any).questionSettings) !== JSON.stringify((nextEl as any).questionSettings)) return false;
  if (JSON.stringify((prevEl as any).answerSettings) !== JSON.stringify((nextEl as any).answerSettings)) return false;

  // Text Settings Vergleich
  const prevTextSettings = prevEl.textSettings;
  const nextTextSettings = nextEl.textSettings;
  if (JSON.stringify(prevTextSettings) !== JSON.stringify(nextTextSettings)) return false;

  // Visual Properties (von Settings-Form)
  if ((prevEl as any).backgroundEnabled !== (nextEl as any).backgroundEnabled) return false;
  if ((prevEl as any).borderEnabled !== (nextEl as any).borderEnabled) return false;
  if ((prevEl as any).ruledLines !== (nextEl as any).ruledLines) return false;
  if ((prevEl as any).ruledLinesWidth !== (nextEl as any).ruledLinesWidth) return false;
  if ((prevEl as any).ruledLinesTheme !== (nextEl as any).ruledLinesTheme) return false;
  if ((prevEl as any).ruledLinesColor !== (nextEl as any).ruledLinesColor) return false;
  if ((prevEl as any).ruledLinesOpacity !== (nextEl as any).ruledLinesOpacity) return false;
  if (prevEl.backgroundColor !== nextEl.backgroundColor) return false;
  if (prevEl.backgroundOpacity !== nextEl.backgroundOpacity) return false;
  if (prevEl.borderColor !== nextEl.borderColor) return false;
  if (prevEl.borderWidth !== nextEl.borderWidth) return false;
  if (prevEl.borderOpacity !== nextEl.borderOpacity) return false;
  if ((prevEl as any).cornerRadius !== (nextEl as any).cornerRadius) return false;
  if ((prevEl as any).padding !== (nextEl as any).padding) return false;
  if ((prevEl as any).paragraphSpacing !== (nextEl as any).paragraphSpacing) return false;
  if ((prevEl as any).answerInNewRow !== (nextEl as any).answerInNewRow) return false;
  if ((prevEl as any).questionAnswerGap !== (nextEl as any).questionAnswerGap) return false;
  if ((prevEl as any).questionAnswerGapVertical !== (nextEl as any).questionAnswerGapVertical) return false;
  if ((prevEl as any).questionAnswerGapHorizontal !== (nextEl as any).questionAnswerGapHorizontal) return false;
  if (prevEl.align !== nextEl.align) return false;
  if ((prevEl as any).theme !== (nextEl as any).theme) return false;
  if ((prevEl as any).qnaIndividualSettings !== (nextEl as any).qnaIndividualSettings) return false;

  // Format-Eigenschaften
  const prevFormat = prevEl.format;
  const nextFormat = nextEl.format;
  if (JSON.stringify(prevFormat) !== JSON.stringify(nextFormat)) return false;

  return true;
};

// PERFORMANCE OPTIMIZATION: Wrap component with React.memo to prevent unnecessary re-renders
export default React.memo(TextboxQna2, areTextboxQna2PropsEqual);
