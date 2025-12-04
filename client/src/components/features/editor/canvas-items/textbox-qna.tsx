import React, { useMemo, useRef, useEffect, forwardRef, useState } from 'react';
import { Shape, Rect, Path } from 'react-konva';
import { v4 as uuidv4 } from 'uuid';
import BaseCanvasItem, { type CanvasItemProps } from './base-canvas-item';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import { getToolDefaults } from '../../../../utils/tool-defaults';
import type { CanvasElement } from '../../../../context/editor-context';
import type Konva from 'konva';
import rough from 'roughjs';

type ParagraphSpacing = 'small' | 'medium' | 'large';

interface RichTextStyle {
  fontSize: number;
  fontFamily: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontColor: string;
  fontOpacity?: number;
  paragraphSpacing?: ParagraphSpacing;
  align?: 'left' | 'center' | 'right' | 'justify';
}

interface TextRun {
  text: string;
  x: number;
  y: number;
  style: RichTextStyle;
}

interface LinePosition {
  y: number;
  lineHeight: number;
  style: RichTextStyle;
}

interface LayoutResult {
  runs: TextRun[];
  contentHeight: number;
  linePositions: LinePosition[];
  questionArea?: { x: number; y: number; width: number; height: number };
  answerArea?: { x: number; y: number; width: number; height: number };
}

type QnaSettings = {
  fontSize?: number;
  fontFamily?: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontColor?: string;
  fontOpacity?: number;
  paragraphSpacing?: ParagraphSpacing;
  align?: 'left' | 'center' | 'right' | 'justify';
};

interface QnaCanvasElement extends CanvasElement {
  questionSettings?: QnaSettings;
  answerSettings?: QnaSettings;
  qnaIndividualSettings?: boolean;
  backgroundEnabled?: boolean;
  backgroundColor?: string;
  backgroundOpacity?: number;
  borderEnabled?: boolean;
  borderColor?: string;
  borderWidth?: number;
  borderOpacity?: number;
  cornerRadius?: number;
  ruledLines?: boolean;
  ruledLinesWidth?: number;
  ruledLinesTheme?: string;
  ruledLinesColor?: string;
  ruledLinesOpacity?: number;
  ruledLinesTarget?: 'question' | 'answer';
  answerInNewRow?: boolean;
  questionAnswerGap?: number;
  blockQuestionAnswerGap?: number;
  layoutVariant?: 'inline' | 'block';
  questionPosition?: 'left' | 'right' | 'top' | 'bottom';
  questionWidth?: number;
}

type TempAnswerEntry = {
  text?: string;
};

type QuillDelta = {
  insert: (text: string) => QuillDelta;
};

type QuillDeltaConstructor = {
  new (): QuillDelta;
};

type QuillInstance = {
  root: HTMLElement;
  clipboard: {
    addMatcher: (selector: number | string, matcher: (node: Node, delta: unknown) => QuillDelta) => void;
  };
  setText: (text: string) => void;
  getText: () => string;
  disable: () => void;
  enable: () => void;
  focus: () => void;
};

type QuillConstructor = {
  new (container: HTMLElement, options: { theme: string }): QuillInstance;
  import: (moduleName: string) => QuillDeltaConstructor;
};

type QuillModalElement = HTMLDivElement & {
  __closeQuillEditorHandler?: EventListener;
  __openQuestionDialogHandler?: EventListener;
};

type ExtendedWindow = Window &
  typeof globalThis &
  Record<string, unknown> & {
    Quill?: QuillConstructor;
  };

const LINE_HEIGHT: Record<ParagraphSpacing, number> = {
  small: 1,
  medium: 1.2,
  large: 1.5
};

function buildFont(style: RichTextStyle) {
  const weight = style.fontBold ? 'bold ' : '';
  const italic = style.fontItalic ? 'italic ' : '';
  return `${weight}${italic}${style.fontSize}px ${style.fontFamily}`;
}

function getLineHeight(style: RichTextStyle) {
  const spacing = style.paragraphSpacing || 'medium';
  return style.fontSize * (LINE_HEIGHT[spacing] ?? 1.2);
}

function stripHtml(text: string) {
  if (!text) return '';
  if (typeof document === 'undefined') {
    return text.replace(/<[^>]+>/g, '');
  }
  const temp = document.createElement('div');
  temp.innerHTML = text;
  return temp.textContent || temp.innerText || '';
}

function parseQuestionPayload(payload: string | undefined | null) {
  if (!payload) return '';
  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed === 'object' && parsed.text) {
      return parsed.text as string;
    }
  } catch {
    // ignore
  }
  return payload;
}

function measureText(text: string, style: RichTextStyle, ctx: CanvasRenderingContext2D | null) {
  if (!ctx) {
    return text.length * (style.fontSize * 0.6);
  }
  ctx.save();
  ctx.font = buildFont(style);
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}

function calculateTextX(text: string, style: RichTextStyle, startX: number, availableWidth: number, ctx: CanvasRenderingContext2D | null): number {
  const align = style.align || 'left';
  const textWidth = measureText(text, style, ctx);
  
  switch (align) {
    case 'center':
      return startX + (availableWidth - textWidth) / 2;
    case 'right':
      return startX + availableWidth - textWidth;
    case 'justify':
      // For justify, we'll use left alignment for now
      // Full justify implementation would require word spacing adjustment
      return startX;
    case 'left':
    default:
      return startX;
  }
}

function wrapText(text: string, style: RichTextStyle, maxWidth: number, ctx: CanvasRenderingContext2D | null) {
  const lines: { text: string; width: number }[] = [];
  if (!text) return lines;
  const paragraphs = text.split('\n');
  paragraphs.forEach((paragraph, paragraphIdx) => {
    const words = paragraph.split(' ').filter(Boolean);
    if (words.length === 0) {
      lines.push({ text: '', width: 0 });
    } else {
      let currentLine = words[0];
      for (let i = 1; i < words.length; i += 1) {
        const word = words[i];
        const testLine = `${currentLine} ${word}`;
        const testWidth = measureText(testLine, style, ctx);
        if (testWidth > maxWidth && currentLine) {
          lines.push({ text: currentLine, width: measureText(currentLine, style, ctx) });
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      lines.push({ text: currentLine, width: measureText(currentLine, style, ctx) });
    }
    if (paragraphIdx < paragraphs.length - 1) {
      lines.push({ text: '', width: 0 });
    }
  });
  return lines;
}

function createBlockLayout(params: {
  questionText: string;
  answerText: string;
  questionStyle: RichTextStyle;
  answerStyle: RichTextStyle;
  width: number;
  height: number;
  padding: number;
  ctx: CanvasRenderingContext2D | null;
  questionPosition?: 'left' | 'right' | 'top' | 'bottom';
  questionWidth?: number;
  ruledLinesTarget?: 'question' | 'answer';
  blockQuestionAnswerGap?: number;
}): LayoutResult {
  const { questionText, answerText, questionStyle, answerStyle, width, height, padding, ctx, questionPosition = 'left', questionWidth = 40, ruledLinesTarget = 'answer', blockQuestionAnswerGap = 10 } = params;
  const runs: TextRun[] = [];
  const linePositions: LinePosition[] = [];
  
  // Calculate line heights
  const questionLineHeight = getLineHeight(questionStyle);
  const answerLineHeight = getLineHeight(answerStyle);
  
  // Baseline offsets
  const questionBaselineOffset = questionStyle.fontSize * 0.8;
  const answerBaselineOffset = answerStyle.fontSize * 0.8;
  
  // Calculate question and answer areas based on position
  let questionArea = { x: padding, y: padding, width: width - padding * 2, height: height - padding * 2 };
  let answerArea = { x: padding, y: padding, width: width - padding * 2, height: height - padding * 2 };
  
  // Calculate question dimensions
  let calculatedQuestionHeight = 0;
  
  if (questionText && ctx) {
    const questionLines = wrapText(questionText, questionStyle, width - padding * 2, ctx);
    calculatedQuestionHeight = questionLines.length * questionLineHeight + padding * 2;
  }
  
  // Calculate areas based on position
  if (questionPosition === 'left' || questionPosition === 'right') {
    const finalQuestionWidth = (width * questionWidth) / 100;
    const gap = blockQuestionAnswerGap;
    const answerWidth = width - finalQuestionWidth - padding * 2 - gap;
    
    if (questionPosition === 'left') {
      questionArea = { x: padding, y: padding, width: finalQuestionWidth, height: height - padding * 2 };
      answerArea = { x: finalQuestionWidth + padding + gap, y: padding, width: answerWidth, height: height - padding * 2 };
    } else {
      answerArea = { x: padding, y: padding, width: answerWidth, height: height - padding * 2 };
      questionArea = { x: answerWidth + padding + gap, y: padding, width: finalQuestionWidth, height: height - padding * 2 };
    }
  } else {
    const finalQuestionHeight = Math.max(calculatedQuestionHeight, questionStyle.fontSize + padding * 2);
    const gap = blockQuestionAnswerGap;
    const answerHeight = height - finalQuestionHeight - padding * 2 - gap;
    
    if (questionPosition === 'top') {
      questionArea = { x: padding, y: padding, width: width - padding * 2, height: finalQuestionHeight };
      answerArea = { x: padding, y: finalQuestionHeight + padding + gap, width: width - padding * 2, height: answerHeight };
    } else {
      answerArea = { x: padding, y: padding, width: width - padding * 2, height: answerHeight };
      questionArea = { x: padding, y: answerHeight + padding + gap, width: width - padding * 2, height: finalQuestionHeight };
    }
  }
  
  // Render question text in question area
  if (questionText) {
    const questionLines = wrapText(questionText, questionStyle, questionArea.width, ctx);
    let cursorY = questionArea.y;
    
    questionLines.forEach((line) => {
      if (line.text) {
        const baselineY = cursorY + questionBaselineOffset;
        const textX = calculateTextX(line.text, questionStyle, questionArea.x, questionArea.width, ctx);
        runs.push({
          text: line.text,
          x: textX,
          y: baselineY,
          style: questionStyle
        });
        // Only add line position if ruledLinesTarget is 'question'
        if (ruledLinesTarget === 'question') {
          linePositions.push({
            y: baselineY + questionStyle.fontSize * 0.15,
            lineHeight: questionLineHeight,
            style: questionStyle
          });
        }
        cursorY += questionLineHeight;
      } else {
        // Only add line position if ruledLinesTarget is 'question'
        if (ruledLinesTarget === 'question') {
          const baselineY = cursorY + questionBaselineOffset;
          linePositions.push({
            y: baselineY + questionStyle.fontSize * 0.15,
            lineHeight: questionLineHeight,
            style: questionStyle
          });
        }
        cursorY += questionLineHeight;
      }
    });
  }
  
  // Render answer text in answer area
  if (answerText) {
    const answerLines = wrapText(answerText, answerStyle, answerArea.width, ctx);
    let cursorY = answerArea.y;
    
    answerLines.forEach((line) => {
      if (line.text) {
        const baselineY = cursorY + answerBaselineOffset;
        const textX = calculateTextX(line.text, answerStyle, answerArea.x, answerArea.width, ctx);
        runs.push({
          text: line.text,
          x: textX,
          y: baselineY,
          style: answerStyle
        });
        // Only add line position if ruledLinesTarget is 'answer'
        if (ruledLinesTarget === 'answer') {
          linePositions.push({
            y: baselineY + answerStyle.fontSize * 0.15,
            lineHeight: answerLineHeight,
            style: answerStyle
          });
        }
        cursorY += answerLineHeight;
      } else {
        // Only add line position if ruledLinesTarget is 'answer'
        if (ruledLinesTarget === 'answer') {
          const baselineY = cursorY + answerBaselineOffset;
          linePositions.push({
            y: baselineY + answerStyle.fontSize * 0.15,
            lineHeight: answerLineHeight,
            style: answerStyle
          });
        }
        cursorY += answerLineHeight;
      }
    });
  }
  
  const contentHeight = height;
  
  return {
    runs,
    contentHeight,
    linePositions,
    questionArea,
    answerArea
  };
}

function createLayout(params: {
  questionText: string;
  answerText: string;
  questionStyle: RichTextStyle;
  answerStyle: RichTextStyle;
  width: number;
  height: number;
  padding: number;
  ctx: CanvasRenderingContext2D | null;
  answerInNewRow?: boolean;
  questionAnswerGap?: number;
  layoutVariant?: 'inline' | 'block';
  questionPosition?: 'left' | 'right' | 'top' | 'bottom';
  questionWidth?: number;
  ruledLinesTarget?: 'question' | 'answer';
  blockQuestionAnswerGap?: number;
}): LayoutResult {
  const { questionText, answerText, questionStyle, answerStyle, width, height, padding, ctx, answerInNewRow = false, questionAnswerGap = 0, layoutVariant = 'inline', questionPosition = 'left', questionWidth = 40 } = params;
  
  // Block layout uses different logic
  if (layoutVariant === 'block') {
    return createBlockLayout({
      questionText,
      answerText,
      questionStyle,
      answerStyle,
      width,
      height,
      padding,
      ctx,
      questionPosition,
      questionWidth,
      ruledLinesTarget: params.ruledLinesTarget,
      blockQuestionAnswerGap: params.blockQuestionAnswerGap
    });
  }
  
  // Inline layout (existing logic)
  const availableWidth = Math.max(10, width - padding * 2);
  const runs: TextRun[] = [];
  const linePositions: LinePosition[] = [];
  
  // Calculate line heights for both styles
  const questionLineHeight = getLineHeight(questionStyle);
  const answerLineHeight = getLineHeight(answerStyle);
  
  // Baseline offset: text baseline is typically at fontSize * 0.8 from top
  // When using textBaseline = 'top', we need to adjust Y position
  const questionBaselineOffset = questionStyle.fontSize * 0.8;
  const answerBaselineOffset = answerStyle.fontSize * 0.8;
  
  // For combined lines, use the larger baseline offset to align both texts
  const combinedBaselineOffset = Math.max(questionBaselineOffset, answerBaselineOffset);
  
  let cursorY = padding;
  const questionLines = wrapText(questionText, questionStyle, availableWidth, ctx);
  const lastQuestionLineWidth = questionLines.length ? questionLines[questionLines.length - 1].width : 0;
  
  // Store Y positions for each question line
  const questionLinePositions: number[] = [];
  
      // First pass: render question lines and track their baseline positions
  questionLines.forEach((line) => {
    if (line.text) {
      // Calculate baseline Y position: cursorY (top of line) + baseline offset
      const baselineY = cursorY + questionBaselineOffset;
      questionLinePositions.push(baselineY);
      const textX = calculateTextX(line.text, questionStyle, padding, availableWidth, ctx);
      runs.push({
        text: line.text,
        x: textX,
        y: baselineY, // Store baseline position directly
        style: questionStyle
      });
      // Track line position for ruled lines (position line slightly below text baseline)
      linePositions.push({
        y: baselineY + questionStyle.fontSize * 0.15,
        lineHeight: questionLineHeight,
        style: questionStyle
      });
      cursorY += questionLineHeight;
    } else {
      // Empty line - still track position
      const baselineY = cursorY + questionBaselineOffset;
      questionLinePositions.push(baselineY);
      // Track empty line position for ruled lines
      linePositions.push({
        y: baselineY + questionStyle.fontSize * 0.15,
        lineHeight: questionLineHeight,
        style: questionStyle
      });
      cursorY += questionLineHeight;
    }
  });

  // Calculate gap: base gap + user-defined gap
  // If answerInNewRow is true, questionAnswerGap applies vertically (not horizontally)
  const baseInlineGap = Math.min(32, answerStyle.fontSize * 0.5);
  const inlineGap = answerInNewRow ? baseInlineGap : baseInlineGap + questionAnswerGap;
  let contentHeight = cursorY;

  let startAtSameLine = false;
  let remainingAnswerText = answerText;
  const lastQuestionLineY = questionLinePositions.length > 0 ? questionLinePositions[questionLinePositions.length - 1] : padding;

  // Check if answer can start on the same line as the last question line
  // Skip this check if answerInNewRow is true
  if (!answerInNewRow && questionLines.length > 0 && answerText && answerText.trim()) {
    const inlineAvailable = availableWidth - lastQuestionLineWidth - inlineGap;
    
    // Split answer into words to check if at least the first word fits
    const answerWords = answerText.split(' ').filter(Boolean);
    if (answerWords.length > 0) {
      const firstWordWidth = measureText(answerWords[0], answerStyle, ctx);
      
      if (inlineAvailable > firstWordWidth) {
        startAtSameLine = true;
        
        // Build text that fits on the same line
        let inlineText = '';
        let wordsUsed = 0;
        
        for (const word of answerWords) {
          const testText = inlineText ? `${inlineText} ${word}` : word;
          const testWidth = measureText(testText, answerStyle, ctx);
          
          if (testWidth <= inlineAvailable) {
            inlineText = testText;
            wordsUsed++;
          } else {
            break;
          }
        }
        
        // Add inline text if we have at least one word
        if (inlineText && wordsUsed > 0) {
          // Calculate Y position for combined line: align both texts to the same baseline
          // Use the larger baseline offset to ensure both texts align properly
          // lastQuestionLineY is already a baseline position (from questionBaselineOffset)
          // We need to adjust it to the combined baseline (larger of the two)
          const combinedBaselineY = lastQuestionLineY + (combinedBaselineOffset - questionBaselineOffset);
          
          // Update the last question line Y position to use combined baseline
          const lastQuestionRunIndex = runs.length - 1;
          if (lastQuestionRunIndex >= 0 && runs[lastQuestionRunIndex].style === questionStyle) {
            runs[lastQuestionRunIndex].y = combinedBaselineY;
          }
          
          // For inline text on the same line, use left alignment (after question text)
          // Text alignment only applies to full lines, not inline text
          const inlineTextX = padding + lastQuestionLineWidth + inlineGap;
          
          // Add answer text aligned to the same baseline
          // Both texts use the same baseline Y position
          runs.push({
            text: inlineText,
            x: inlineTextX,
            y: combinedBaselineY, // Same baseline as question
            style: answerStyle
          });
          
          // Update cursorY to account for combined line height (use larger line height)
          const combinedLineHeight = Math.max(questionLineHeight, answerLineHeight);
          cursorY = padding + ((questionLines.length - 1) * questionLineHeight) + combinedLineHeight;
          
          // Update the last line position for ruled lines (use combined line height)
          if (linePositions.length > 0) {
            linePositions[linePositions.length - 1] = {
              y: combinedBaselineY + Math.max(questionStyle.fontSize, answerStyle.fontSize) * 0.15,
              lineHeight: combinedLineHeight,
              style: answerStyle // Use answer style for combined line
            };
          }
          
          // Get remaining text (words not used + rest of answer)
          const remainingWords = answerWords.slice(wordsUsed);
          remainingAnswerText = remainingWords.join(' ');
        } else {
          // No words fit, don't start on same line
          startAtSameLine = false;
        }
      }
    }
  }

  // Wrap remaining answer text for new lines
  const remainingAnswerLines = startAtSameLine && remainingAnswerText 
    ? wrapText(remainingAnswerText, answerStyle, availableWidth, ctx)
    : wrapText(answerText, answerStyle, availableWidth, ctx);

  // Start answer on new line if not on same line as question
  // If answerInNewRow is true, questionAnswerGap applies vertically
  // Otherwise, use standard spacing (questionAnswerGap only applies horizontally via inlineGap)
  const verticalGap = answerInNewRow ? questionAnswerGap : 0;
  const baseVerticalSpacing = questionLines.length ? answerLineHeight * 0.2 : 0;
  let answerCursorY = startAtSameLine ? cursorY : cursorY + baseVerticalSpacing + verticalGap;

  remainingAnswerLines.forEach((line) => {
    if (line.text) {
      // Calculate baseline Y position for answer-only lines
      const answerBaselineY = answerCursorY + answerBaselineOffset;
      const textX = calculateTextX(line.text, answerStyle, padding, availableWidth, ctx);
      runs.push({
        text: line.text,
        x: textX,
        y: answerBaselineY, // Store baseline position directly
        style: answerStyle
      });
      // Track line position for ruled lines (position line slightly below text baseline)
      linePositions.push({
        y: answerBaselineY + answerStyle.fontSize * 0.15,
        lineHeight: answerLineHeight,
        style: answerStyle
      });
    } else {
      // Track empty line position for ruled lines
      const answerBaselineY = answerCursorY + answerBaselineOffset;
      linePositions.push({
        y: answerBaselineY + answerStyle.fontSize * 0.15,
        lineHeight: answerLineHeight,
        style: answerStyle
      });
    }
    answerCursorY += answerLineHeight;
  });

  contentHeight = Math.max(contentHeight, answerCursorY, height);

  return {
    runs,
    contentHeight,
    linePositions
  };
}

const RichTextShape = forwardRef<Konva.Shape, {
  runs: TextRun[];
  width: number;
  height: number;
}>(({ runs, width, height }, ref) => (
  <Shape
    ref={ref}
    listening={false}
    width={width}
    height={height}
    sceneFunc={(ctx, shape) => {
      ctx.save();
      // Use 'alphabetic' baseline for proper text alignment
      // Y positions in runs are already baseline positions
      ctx.textBaseline = 'alphabetic';
      runs.forEach((run) => {
        ctx.font = buildFont(run.style);
        ctx.fillStyle = run.style.fontColor;
        ctx.globalAlpha = run.style.fontOpacity ?? 1;
        // Y position is already the baseline position
        ctx.fillText(run.text, run.x, run.y);
      });
      ctx.restore();
      ctx.fillStrokeShape(shape);
    }}
  />
));
RichTextShape.displayName = 'RichTextShape';

export default function TextboxQna(props: CanvasItemProps) {
  const { element } = props;
  const qnaElement = element as QnaCanvasElement;
  const { state, dispatch } = useEditor();
  const { user } = useAuth();
  // Get element dimensions - use actual values, don't default to 0
  // This ensures we use the correct dimensions when loading
  const elementWidth = element.width ?? 0;
  const elementHeight = element.height ?? 0;
  
  // Refs must be declared before they are used
  const textShapeRef = useRef<Konva.Shape>(null);
  const textRef = useRef<Konva.Rect>(null);
  const isTransformingRef = useRef(false);
  const transformStartDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  
  // Local state for dimensions during transform (to update visually without dispatch)
  // ONLY used during active transform, NOT during initial load
  const [transformDimensions, setTransformDimensions] = useState<{ width: number; height: number } | null>(null);
  const transformDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  
  // Sync ref with state
  useEffect(() => {
    transformDimensionsRef.current = transformDimensions;
  }, [transformDimensions]);
  
  // Use transform dimensions during active transform OR if transformDimensions are set (waiting for element update)
  // Otherwise use element dimensions
  // This ensures we keep the visual state until element dimensions are actually updated
  const boxWidth = transformDimensions ? transformDimensions.width : elementWidth;
  const boxHeight = transformDimensions ? transformDimensions.height : elementHeight;
  
  const textShapeBoxRef = useRef<{ width: number; height: number }>({
    width: boxWidth,
    height: boxHeight
  });
  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
  const pageLayoutTemplateId = currentPage?.layoutTemplateId;
  const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
  const pageColorPaletteId = currentPage?.colorPaletteId;
  const bookColorPaletteId = state.currentBook?.colorPaletteId;

  const qnaDefaults = useMemo(() => {
    return getToolDefaults(
      'qna',
      pageTheme,
      bookTheme,
      element,
      state.toolSettings,
      pageLayoutTemplateId,
      bookLayoutTemplateId,
      pageColorPaletteId,
      bookColorPaletteId
    );
  }, [
    bookLayoutTemplateId,
    bookTheme,
    bookColorPaletteId,
    element,
    pageLayoutTemplateId,
    pageTheme,
    pageColorPaletteId,
    state.toolSettings
  ]);

  const questionStyle = useMemo(() => {
    const layoutVariant = qnaElement.layoutVariant || 'inline';
    const individualSettings = qnaElement.qnaIndividualSettings ?? false;
    
    // Determine align: if inline OR (block without individual settings), use shared align
    // Otherwise use individual question align
    let align: 'left' | 'center' | 'right' | 'justify' = 'left';
    if (layoutVariant === 'inline' || (layoutVariant === 'block' && !individualSettings)) {
      // Shared align: check element.align, element.format?.textAlign, questionSettings.align, answerSettings.align
      align = (element.align || (element as any).format?.textAlign || qnaElement.questionSettings?.align || qnaElement.answerSettings?.align || 'left') as 'left' | 'center' | 'right' | 'justify';
    } else {
      // Individual align: use questionSettings.align
      align = (qnaElement.questionSettings?.align || element.align || (element as any).format?.textAlign || 'left') as 'left' | 'center' | 'right' | 'justify';
    }
    
    const style = {
      fontSize: qnaElement.questionSettings?.fontSize ?? qnaDefaults.questionSettings?.fontSize ?? qnaDefaults.fontSize ?? 58,
      fontFamily: qnaElement.questionSettings?.fontFamily || qnaDefaults.questionSettings?.fontFamily || qnaDefaults.fontFamily || 'Arial, sans-serif',
      fontBold: qnaElement.questionSettings?.fontBold ?? qnaDefaults.questionSettings?.fontBold ?? false,
      fontItalic: qnaElement.questionSettings?.fontItalic ?? qnaDefaults.questionSettings?.fontItalic ?? false,
      fontColor: qnaElement.questionSettings?.fontColor || qnaDefaults.questionSettings?.fontColor || '#666666',
      fontOpacity: qnaElement.questionSettings?.fontOpacity ?? qnaDefaults.questionSettings?.fontOpacity ?? 1,
      paragraphSpacing: qnaElement.questionSettings?.paragraphSpacing || qnaDefaults.questionSettings?.paragraphSpacing || element.paragraphSpacing || 'small',
      align
    } as RichTextStyle;
    return style;
  }, [
    element.paragraphSpacing,
    element.align,
    (element as any).format?.textAlign,
    qnaDefaults, 
    qnaElement.questionSettings?.fontSize,
    qnaElement.questionSettings?.fontFamily,
    qnaElement.questionSettings?.fontBold,
    qnaElement.questionSettings?.fontItalic,
    qnaElement.questionSettings?.fontColor,
    qnaElement.questionSettings?.fontOpacity,
    qnaElement.questionSettings?.paragraphSpacing,
    qnaElement.questionSettings?.align,
    qnaElement.answerSettings?.align,
    qnaElement.layoutVariant,
    qnaElement.qnaIndividualSettings
  ]);

  const answerStyle = useMemo(() => {
    const layoutVariant = qnaElement.layoutVariant || 'inline';
    const individualSettings = qnaElement.qnaIndividualSettings ?? false;
    
    // Determine align: if inline OR (block without individual settings), use shared align
    // Otherwise use individual answer align
    let align: 'left' | 'center' | 'right' | 'justify' = 'left';
    if (layoutVariant === 'inline' || (layoutVariant === 'block' && !individualSettings)) {
      // Shared align: check element.align, element.format?.textAlign, questionSettings.align, answerSettings.align
      align = (element.align || (element as any).format?.textAlign || qnaElement.questionSettings?.align || qnaElement.answerSettings?.align || 'left') as 'left' | 'center' | 'right' | 'justify';
    } else {
      // Individual align: use answerSettings.align
      align = (qnaElement.answerSettings?.align || element.align || (element as any).format?.textAlign || 'left') as 'left' | 'center' | 'right' | 'justify';
    }
    
    const style = {
      fontSize: qnaElement.answerSettings?.fontSize ?? qnaDefaults.answerSettings?.fontSize ?? qnaDefaults.fontSize ?? 50,
      fontFamily: qnaElement.answerSettings?.fontFamily || qnaDefaults.answerSettings?.fontFamily || qnaDefaults.fontFamily || 'Arial, sans-serif',
      fontBold: qnaElement.answerSettings?.fontBold ?? qnaDefaults.answerSettings?.fontBold ?? false,
      fontItalic: qnaElement.answerSettings?.fontItalic ?? qnaDefaults.answerSettings?.fontItalic ?? false,
      fontColor: qnaElement.answerSettings?.fontColor || qnaDefaults.answerSettings?.fontColor || '#1f2937',
      fontOpacity: qnaElement.answerSettings?.fontOpacity ?? qnaDefaults.answerSettings?.fontOpacity ?? 1,
      paragraphSpacing: qnaElement.answerSettings?.paragraphSpacing || qnaDefaults.answerSettings?.paragraphSpacing || element.paragraphSpacing || 'medium',
      align
    } as RichTextStyle;
    return style;
  }, [
    element.paragraphSpacing,
    element.align,
    (element as any).format?.textAlign,
    qnaDefaults, 
    qnaElement.answerSettings?.fontSize,
    qnaElement.answerSettings?.fontFamily,
    qnaElement.answerSettings?.fontBold,
    qnaElement.answerSettings?.fontItalic,
    qnaElement.answerSettings?.fontColor,
    qnaElement.answerSettings?.fontOpacity,
    qnaElement.answerSettings?.paragraphSpacing,
    qnaElement.answerSettings?.align,
    qnaElement.questionSettings?.align,
    qnaElement.layoutVariant,
    qnaElement.qnaIndividualSettings
  ]);

  const individualSettings = qnaElement.qnaIndividualSettings ?? false;
  const effectiveQuestionStyle = useMemo(
    () => (individualSettings ? questionStyle : { ...questionStyle, ...answerStyle }),
    [individualSettings, questionStyle, answerStyle]
  );

  const padding = element.padding ?? qnaDefaults.padding ?? 8;

  const questionText = useMemo(() => {
    if (!element.questionId) {
      return 'Double-click to add a question...';
    }
    const questionData = state.tempQuestions[element.questionId];
    if (!questionData) {
      return 'Question loading...';
    }
    return parseQuestionPayload(questionData);
  }, [element.questionId, state.tempQuestions]);

  const assignedUser = useMemo(() => state.pageAssignments[state.activePageIndex + 1], [state.activePageIndex, state.pageAssignments]);

  const answerText = useMemo(() => {
    if (element.formattedText) {
      return stripHtml(element.formattedText);
    }
    if (element.text) {
      return element.text;
    }
    if (!element.questionId) {
      return '';
    }
    if (assignedUser) {
      const answerEntry = state.tempAnswers[element.questionId]?.[assignedUser.id] as TempAnswerEntry | undefined;
      return answerEntry?.text || '';
    }
    if (user?.id) {
      const answerEntry = state.tempAnswers[element.questionId]?.[user.id] as TempAnswerEntry | undefined;
      return answerEntry?.text || '';
    }
    return '';
  }, [assignedUser, element.formattedText, element.questionId, element.text, state.tempAnswers, user?.id]);

  const sanitizedAnswer = answerText ? stripHtml(answerText) : '';
  const answerContent = sanitizedAnswer || 'Add an answer...';

  const preparedQuestionText = questionText ? stripHtml(questionText) : questionText;

  const getQuestionText = () => preparedQuestionText || '';

  // Extract layout settings from element
  const answerInNewRow = qnaElement.answerInNewRow ?? false;
  const questionAnswerGap = qnaElement.questionAnswerGap ?? 0;
  const layoutVariant = qnaElement.layoutVariant || 'inline';
  const questionPosition = qnaElement.questionPosition || 'left';
  const questionWidth = qnaElement.questionWidth ?? 40;
  const ruledLinesTarget = qnaElement.ruledLinesTarget || 'answer';
  const blockQuestionAnswerGap = qnaElement.blockQuestionAnswerGap ?? 10;

  const layout = useMemo(() => {
    const canvasContext = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    return createLayout({
      questionText: preparedQuestionText,
      answerText: answerContent,
      questionStyle: effectiveQuestionStyle,
      answerStyle,
      width: boxWidth,
      height: boxHeight,
      padding,
      ctx: canvasContext,
      answerInNewRow,
      questionAnswerGap,
      layoutVariant,
      questionPosition,
      questionWidth,
      ruledLinesTarget,
      blockQuestionAnswerGap
    });
  }, [answerContent, answerStyle, effectiveQuestionStyle, boxHeight, boxWidth, padding, preparedQuestionText, answerInNewRow, questionAnswerGap, layoutVariant, questionPosition, questionWidth, ruledLinesTarget, blockQuestionAnswerGap]);

  // Generate ruled lines if enabled
  const ruledLines = qnaElement.ruledLines ?? false;
  const ruledLinesWidth = qnaElement.ruledLinesWidth ?? 0.8;
  const ruledLinesTheme = qnaElement.ruledLinesTheme || 'rough';
  const ruledLinesColor = qnaElement.ruledLinesColor || '#1f2937';
  const ruledLinesOpacity = qnaElement.ruledLinesOpacity ?? 1;

  const ruledLinesElements = useMemo(() => {
    if (!ruledLines || !layout.linePositions || layout.linePositions.length === 0) {
      return [];
    }

    const elements: React.ReactElement[] = [];

    const generateRuledLineElement = (y: number, startX: number, endX: number): React.ReactElement => {
      if (ruledLinesTheme === 'rough') {
        try {
          const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          const rc = rough.svg(svg);
          
          const roughLine = rc.line(startX, y, endX, y, {
            roughness: 2,
            strokeWidth: ruledLinesWidth,
            stroke: ruledLinesColor,
            seed: seed + y
          });
          
          const paths = roughLine.querySelectorAll('path');
          let combinedPath = '';
          paths.forEach(path => {
            const d = path.getAttribute('d');
            if (d) combinedPath += d + ' ';
          });
          
          if (combinedPath) {
            return (
              <Path
                key={`ruled-line-${y}`}
                data={combinedPath.trim()}
                stroke={ruledLinesColor}
                strokeWidth={ruledLinesWidth}
                opacity={ruledLinesOpacity}
                strokeScaleEnabled={true}
                listening={false}
              />
            );
          }
        } catch {
          // Fallback to simple line if rough.js fails
          return (
            <Path
              key={`ruled-line-${y}`}
              data={`M ${startX} ${y} L ${endX} ${y}`}
              stroke={ruledLinesColor}
              strokeWidth={ruledLinesWidth}
              opacity={ruledLinesOpacity}
              strokeScaleEnabled={true}
              listening={false}
            />
          );
        }
      }
      
      // Default: simple line
      return (
        <Path
          key={`ruled-line-${y}`}
          data={`M ${startX} ${y} L ${endX} ${y}`}
          stroke={ruledLinesColor}
          strokeWidth={ruledLinesWidth}
          opacity={ruledLinesOpacity}
          strokeScaleEnabled={true}
          listening={false}
        />
      );
    };

    layout.linePositions.forEach((linePos) => {
      // For block layout, only render lines within the target area
      if (layoutVariant === 'block' && layout.questionArea && layout.answerArea) {
        const targetArea = ruledLinesTarget === 'question' ? layout.questionArea : layout.answerArea;
        
        // Check if line is within the target area (vertically)
        if (linePos.y >= targetArea.y && linePos.y <= targetArea.y + targetArea.height) {
          const lineStartX = targetArea.x;
          const lineEndX = targetArea.x + targetArea.width;
          const lineElement = generateRuledLineElement(linePos.y, lineStartX, lineEndX);
          elements.push(lineElement);
        }
      } else {
        // For inline layout, use full width with padding
        const startX = padding;
        const endX = boxWidth - padding;
        
        // Only generate lines that are within the box dimensions (0 <= y <= boxHeight)
        // This ensures ruled lines only appear inside the visible border area
        if (linePos.y >= 0 && linePos.y <= boxHeight) {
          const lineElement = generateRuledLineElement(linePos.y, startX, endX);
          elements.push(lineElement);
        }
      }
    });

    return elements;
  }, [ruledLines, layout.linePositions, layout.questionArea, layout.answerArea, padding, boxWidth, boxHeight, ruledLinesWidth, ruledLinesTheme, ruledLinesColor, ruledLinesOpacity, element.id, layoutVariant, ruledLinesTarget]);

  const showBackground = qnaElement.backgroundEnabled && qnaElement.backgroundColor;
  const showBorder = qnaElement.borderEnabled && qnaElement.borderColor && qnaElement.borderWidth !== undefined;

  useEffect(() => {
    textShapeBoxRef.current = { width: boxWidth, height: boxHeight };
  }, [boxWidth, boxHeight]);
  
  // Track the last dispatched dimensions to detect when props are updated
  const lastDispatchedDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  
  // Reset transform dimensions when element dimensions change to match transform dimensions
  // This ensures we keep the visual state until the element is actually updated
  // ONLY reset after transform is complete AND element dimensions have been updated
  useEffect(() => {
    // Don't reset during active transform
    if (isTransformingRef.current) return;
    
    // Don't reset if element dimensions are invalid (0 or undefined)
    if (!elementWidth || !elementHeight || elementWidth <= 0 || elementHeight <= 0) return;
    
    if (transformDimensions) {
      // Only reset if element dimensions match transform dimensions (update was successful)
      // Use a small tolerance to account for floating point precision
      const widthMatch = Math.abs(elementWidth - transformDimensions.width) < 0.1;
      const heightMatch = Math.abs(elementHeight - transformDimensions.height) < 0.1;
      
      if (widthMatch && heightMatch) {
        // Reset transformDimensions after successful update
        // Use a small delay to ensure the element update has been processed
        const timeoutId = setTimeout(() => {
          if (!isTransformingRef.current) {
            setTransformDimensions(null);
            lastDispatchedDimensionsRef.current = null;
          }
        }, 50);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [elementWidth, elementHeight, transformDimensions, element.id, element.textType]);

  // Handle transform events to resize text properly (as per Konva documentation)
  // Reset scale to 1 and update width/height instead
  // We update dimensions only at transformEnd to avoid interrupting the transform process
  useEffect(() => {
    const handleTransformStart = (e: CustomEvent) => {
      if (e.detail?.elementId !== element.id) return;
      
      isTransformingRef.current = true;
      
      // Use current transformDimensions if available, otherwise use element dimensions
      // This ensures we start from the correct visual state (prevents jumping)
      const currentTransformDims = transformDimensionsRef.current;
      const currentWidth = currentTransformDims?.width ?? elementWidth;
      const currentHeight = currentTransformDims?.height ?? elementHeight;
      
      // Store initial dimensions at transform start
      transformStartDimensionsRef.current = {
        width: currentWidth,
        height: currentHeight
      };
      
      // Initialize transformDimensions immediately to prevent visual jump
      // This ensures boxWidth/boxHeight use the correct values from the start
      setTransformDimensions({
        width: currentWidth,
        height: currentHeight
      });
    };
    
    const handleTransform = (e: CustomEvent) => {
      if (e.detail?.elementId !== element.id) return;
      if (!isTransformingRef.current) return;
      
      // Get the Group node from the textRef (which is a child of the Group)
      const rectNode = textRef.current;
      if (!rectNode) return;
      
      const groupNode = rectNode.getParent();
      if (!groupNode || groupNode.getClassName() !== 'Group') return;
      
      const scaleX = groupNode.scaleX();
      const scaleY = groupNode.scaleY();
      
      // Only reset scale if it's not already 1 (to avoid unnecessary operations)
      if (scaleX !== 1 || scaleY !== 1) {
        // Get initial dimensions from when transform started
        const startDims = transformStartDimensionsRef.current || { width: elementWidth, height: elementHeight };
        
        // Calculate new dimensions based on initial dimensions and current scale
        const newWidth = Math.max(5, startDims.width * scaleX);
        const newHeight = Math.max(5, startDims.height * scaleY);
        
        // Reset scale to 1 immediately (this is the key part from Konva docs)
        // This allows the transform to continue smoothly
        groupNode.scaleX(1);
        groupNode.scaleY(1);
        
        // Update textShapeBoxRef for getClientRect calculations immediately
        // This ensures the selection rectangle stays correct during transform
        textShapeBoxRef.current = { width: newWidth, height: newHeight };
        
        // Update local state to visually update the component during transform
        // This updates the boxWidth/boxHeight used for rendering without dispatch
        setTransformDimensions({ width: newWidth, height: newHeight });
        
        // Store the new dimensions for update at transformEnd
        transformStartDimensionsRef.current = {
          width: newWidth,
          height: newHeight
        };
      }
    };
    
    const handleTransformEnd = (e: CustomEvent) => {
      if (e.detail?.elementId !== element.id) return;
      
      // Apply the final dimensions update
      const finalDims = transformStartDimensionsRef.current;
      if (finalDims && (finalDims.width !== elementWidth || finalDims.height !== elementHeight)) {
        // Store the dispatched dimensions so we can track when props are updated
        lastDispatchedDimensionsRef.current = {
          width: finalDims.width,
          height: finalDims.height
        };
        
        dispatch({
          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
          payload: {
            id: element.id,
            updates: {
              width: finalDims.width,
              height: finalDims.height
            }
          }
        });
        
        // Keep transformDimensions until element dimensions are updated
        // The useEffect will reset it when element dimensions match
      } else {
        // If dimensions didn't change, reset immediately
        setTransformDimensions(null);
      }
      
      // Reset flags (but keep transformDimensions until element updates)
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

    type ShapeWithOriginal = Konva.Shape & {
      __qnaOriginalGetClientRect?: Konva.Shape['getClientRect'];
    };

    const shapeWithOriginal = shape as ShapeWithOriginal;

    if (!shapeWithOriginal.__qnaOriginalGetClientRect) {
      shapeWithOriginal.__qnaOriginalGetClientRect = shape.getClientRect.bind(shape);
    }

    const limitToTextbox = ((config?: Parameters<Konva.Shape['getClientRect']>[0]) => {
      // Always use box dimensions for getClientRect to ensure consistent resize behavior
      // The transformer needs consistent dimensions to calculate resize correctly
      // If we return the full text bounding box during resize, it causes incorrect calculations
      
      // Skip transform calculation if requested (for performance)
      if (config?.skipTransform && shapeWithOriginal.__qnaOriginalGetClientRect) {
        return shapeWithOriginal.__qnaOriginalGetClientRect(config);
      }

      const { width, height } = textShapeBoxRef.current;
      const safeWidth = Math.max(width, 0);
      const safeHeight = Math.max(height, 0);

      const transform = shape.getAbsoluteTransform().copy();
      const topLeft = transform.point({ x: 0, y: 0 });
      const bottomRight = transform.point({ x: safeWidth, y: safeHeight });

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
      if (shapeWithOriginal.__qnaOriginalGetClientRect) {
        shape.getClientRect = shapeWithOriginal.__qnaOriginalGetClientRect;
        delete shapeWithOriginal.__qnaOriginalGetClientRect;
      }
    };
  }, []);

  useEffect(() => {
    const globalWindow = window as ExtendedWindow;
    globalWindow[`openQuestionSelector_${element.id}`] = () => {
      globalWindow.dispatchEvent(new CustomEvent('openQuestionDialog', {
        detail: { elementId: element.id }
      }));
    };
    return () => {
      delete globalWindow[`openQuestionSelector_${element.id}`];
    };
  }, [element.id]);

  const handleDoubleClick = (e?: Konva.KonvaEventObject<MouseEvent>) => {
    if (props.interactive === false) return;
    if (state.activeTool !== 'select') return;
    if (e?.evt && e.evt.button !== 0) return;
    enableQuillEditing();
  };

  const enableQuillEditing = () => {
    const stage = textRef.current?.getStage();
    if (!stage) return;
    const stageInstance: Konva.Stage = stage;

    const globalWindow = window as ExtendedWindow;

    if (!globalWindow.Quill) {
      const quillCSS = document.createElement('link');
      quillCSS.rel = 'stylesheet';
      quillCSS.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
      document.head.appendChild(quillCSS);

      const quillJS = document.createElement('script');
      quillJS.src = 'https://cdn.quilljs.com/1.3.6/quill.min.js';
      document.head.appendChild(quillJS);

      quillJS.onload = () => initQuillForQnA();
      return;
    } else {
      initQuillForQnA();
    }

    function initQuillForQnA() {
      const modal = document.createElement('div') as QuillModalElement;
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255, 255, 255, 0.5);backdrop-filter:blur(2px);display:flex;justify-content:center;align-items:center;z-index:10000';

      const container = document.createElement('div');
      container.style.cssText = 'background:white;border-radius:8px;padding:20px;width:80vw;max-width:800px;min-width:400px;box-shadow:0 3px 6px rgba(0,0,0,0.1)';

      const header = document.createElement('div');
      header.style.cssText = 'margin-bottom:16px;padding-bottom:12px';
      header.innerHTML = '<h2 style="margin:0;font-size:1.25rem;font-weight:600">Question Answer</h2>';

      const toolbar = document.createElement('div');
      toolbar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:8px;background:#f8fafc;border-radius:4px';

      const questionTextEl = document.createElement('div');
      const hasExistingQuestion = element.questionId;
      questionTextEl.textContent = hasExistingQuestion ? getQuestionText() : 'No question selected';
      questionTextEl.style.cssText = 'font-size:0.875rem;color:#374151;font-weight:500;flex:1';

      const toolbarButtonContainer = document.createElement('div');
      toolbarButtonContainer.style.cssText = 'display:flex;gap:8px;align-items:center';

      const insertQuestionBtn = document.createElement('button');
      insertQuestionBtn.textContent = hasExistingQuestion ? 'Change Question' : 'Insert Question';
      insertQuestionBtn.style.cssText = 'padding:6px 12px;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:white;font-size:0.875rem';
      insertQuestionBtn.onmouseover = () => insertQuestionBtn.style.background = '#f1f5f9';
      insertQuestionBtn.onmouseout = () => insertQuestionBtn.style.background = 'white';
      insertQuestionBtn.onclick = () => {
        globalWindow.dispatchEvent(new CustomEvent('closeQuillEditor'));
        setTimeout(() => {
          const directFn = globalWindow[`openQuestionSelector_${element.id}`];
          if (typeof directFn === 'function') {
            (directFn as () => void)();
          } else {
            globalWindow.dispatchEvent(new CustomEvent('openQuestionDialog', {
              detail: { elementId: element.id }
            }));
          }
        }, 100);
      };

      const resetQuestionBtn = document.createElement('button');
      resetQuestionBtn.textContent = 'Reset Question';
      resetQuestionBtn.style.cssText = 'padding:6px 12px;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:white;font-size:0.875rem;color:#dc2626';
      resetQuestionBtn.style.display = hasExistingQuestion ? 'block' : 'none';
      resetQuestionBtn.onmouseover = () => resetQuestionBtn.style.background = '#fef2f2';
      resetQuestionBtn.onmouseout = () => resetQuestionBtn.style.background = 'white';

      toolbarButtonContainer.appendChild(insertQuestionBtn);
      if (hasExistingQuestion) {
        toolbarButtonContainer.appendChild(resetQuestionBtn);
      }

      toolbar.appendChild(questionTextEl);
      toolbar.appendChild(toolbarButtonContainer);

      const editorContainer = document.createElement('div');
      editorContainer.style.cssText = 'min-height:90px;margin-bottom:0px;border:1px solid #e2e8f0;border-radius:4px';

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding:4px 16px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:white;font-size:0.875rem';
      cancelBtn.onmouseover = () => cancelBtn.style.background = '#f1f5f9';
      cancelBtn.onmouseout = () => cancelBtn.style.background = 'white';

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.style.cssText = 'padding:8px 16px;border:none;border-radius:6px;background:#304050;color:white;cursor:pointer;font-size:0.875rem';
      saveBtn.onmouseover = () => saveBtn.style.background = '#303a50e6';
      saveBtn.onmouseout = () => saveBtn.style.background = '#304050';

      let closeModal = () => {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
        stageInstance.draw();
      };

      const handleCloseQuillEditor = () => {
        closeModal();
      };
      window.addEventListener('closeQuillEditor', handleCloseQuillEditor);
      modal.__closeQuillEditorHandler = handleCloseQuillEditor;

      const originalCloseModal = closeModal;
      closeModal = () => {
        window.removeEventListener('closeQuillEditor', handleCloseQuillEditor);
        originalCloseModal();
      };

      cancelBtn.onclick = closeModal;

      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(saveBtn);

      container.appendChild(header);
      container.appendChild(toolbar);
      container.appendChild(editorContainer);
      container.appendChild(buttonContainer);
      modal.appendChild(container);
      document.body.appendChild(modal);

      setTimeout(() => {
        const quillConstructor = globalWindow.Quill;
        if (!quillConstructor) {
          return;
        }
        const quill = new quillConstructor(editorContainer, {
          theme: 'snow'
        });

        const styleEl = document.createElement('style');
        styleEl.textContent = `
          .ql-toolbar { display: none !important; }
          .ql-container {
            border: 2px solid #3b82f6 !important;
            border-radius: 4px;
            height: 144px !important;
          }
          .ql-container.ql-disabled {
            border: 1px solid #e5e7eb !important;
          }
          .ql-editor {
            height: 144px !important;
            overflow-y: auto !important;
            line-height: 24px !important;
          }
        `;
        document.head.appendChild(styleEl);

        const assignedUser = state.pageAssignments[state.activePageIndex + 1];
        let contentToLoad = '';

        if (element.questionId && assignedUser) {
          const answerEntry = state.tempAnswers[element.questionId]?.[assignedUser.id] as TempAnswerEntry | undefined;
          contentToLoad = answerEntry?.text || element.formattedText || element.text || '';
        } else {
          contentToLoad = element.formattedText || element.text || '';
        }

        if (contentToLoad) {
          if (contentToLoad.includes('<')) {
            quill.root.innerHTML = contentToLoad;
          } else {
            quill.setText(contentToLoad);
          }
        }

        let currentQuestionId = element.questionId;

        resetQuestionBtn.onclick = () => {
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: {
                questionId: undefined,
                text: '',
                formattedText: ''
              }
            }
          });

          insertQuestionBtn.textContent = 'Insert Question';
          questionTextEl.textContent = 'No question selected';
          resetQuestionBtn.style.display = 'none';

          quill.setText('');
          quill.disable();
          quill.root.setAttribute('data-placeholder', 'Add a question');
          quill.root.style.backgroundColor = '#f9fafb';
          quill.root.style.color = '#9ca3af';

          currentQuestionId = undefined;
        };

        saveBtn.onclick = () => {
          const htmlContent = quill.root.innerHTML;
          const plainText = quill.getText().trim();

          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: {
                text: plainText,
                formattedText: htmlContent
              }
            }
          });

          if (currentQuestionId && user?.id) {
            dispatch({
              type: 'UPDATE_TEMP_ANSWER',
              payload: {
                questionId: currentQuestionId,
                text: plainText,
                userId: user.id,
                answerId: element.answerId || uuidv4()
              }
            });
          }

          closeModal();
        };

        const uniqueEventName = `questionSelected-${element.id}`;
        const handleQuestionSelected = (event: CustomEvent) => {
          const { questionId, questionText: selectedQuestionText } = event.detail;

          currentQuestionId = questionId;
          insertQuestionBtn.textContent = 'Change Question';
          questionTextEl.textContent = selectedQuestionText || 'No question selected';

          if (resetQuestionBtn.style.display === 'none' || !toolbarButtonContainer.contains(resetQuestionBtn)) {
            resetQuestionBtn.style.display = 'block';
            if (!toolbarButtonContainer.contains(resetQuestionBtn)) {
              toolbarButtonContainer.appendChild(resetQuestionBtn);
            }
          }

          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: { questionId }
            }
          });

          if (questionId && !state.tempQuestions[questionId]) {
            dispatch({
              type: 'UPDATE_TEMP_QUESTION',
              payload: {
                questionId,
                text: selectedQuestionText
              }
            });
          }

          if (assignedUser) {
            const existingAnswerEntry = state.tempAnswers[questionId]?.[assignedUser.id] as TempAnswerEntry | undefined;
            const existingAnswer = existingAnswerEntry?.text || '';
            quill.setText(existingAnswer);

            dispatch({
              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
              payload: {
                id: element.id,
                updates: {
                  text: existingAnswer,
                  formattedText: existingAnswer
                }
              }
            });
          } else {
            quill.setText('');

            dispatch({
              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
              payload: {
                id: element.id,
                updates: {
                  text: '',
                  formattedText: ''
                }
              }
            });
          }

          const canEdit = assignedUser && assignedUser.id === user?.id;

          if (!assignedUser) {
            quill.disable();
            quill.root.setAttribute('data-placeholder', 'No user assigned to this page');
            quill.root.style.backgroundColor = '#f9fafb';
            quill.root.style.color = '#9ca3af';
          } else if (!canEdit) {
            quill.disable();
            quill.root.setAttribute('data-placeholder', `${assignedUser?.name || 'User'} can answer here`);
            quill.root.style.backgroundColor = '#f9fafb';
            quill.root.style.color = '#9ca3af';
          } else {
            quill.enable();
            quill.root.removeAttribute('data-placeholder');
            quill.root.style.backgroundColor = '';
            quill.root.style.color = '';
            quill.focus();
          }
        };

        window.addEventListener(uniqueEventName, handleQuestionSelected as EventListener);

        const previousCloseModal = closeModal;
        closeModal = () => {
          window.removeEventListener(uniqueEventName, handleQuestionSelected as EventListener);
          const closeQuillEditorHandler = modal.__closeQuillEditorHandler;
          if (closeQuillEditorHandler) {
            window.removeEventListener('closeQuillEditor', closeQuillEditorHandler);
          }
          const openQuestionDialogHandler = modal.__openQuestionDialogHandler;
          if (openQuestionDialogHandler) {
            window.removeEventListener('openQuestionDialog', openQuestionDialogHandler);
          }
          previousCloseModal();
        };

        cancelBtn.onclick = closeModal;

        quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node: Node) => {
          const elementNode = node as HTMLElement;
          const plaintext = elementNode.innerText || elementNode.textContent || '';
          const DeltaConstructor = quillConstructor.import('delta');
          const deltaInstance = new DeltaConstructor();
          return deltaInstance.insert(plaintext);
        });

        const canEdit = assignedUser && assignedUser.id === user?.id;

        if (!assignedUser) {
          quill.disable();
          quill.root.setAttribute('data-placeholder', 'No user assigned to this page');
          quill.root.style.backgroundColor = '#f9fafb';
          quill.root.style.color = '#9ca3af';
        } else if (!canEdit) {
          quill.disable();
          quill.root.setAttribute('data-placeholder', `${assignedUser?.name || 'User'} can answer here`);
          quill.root.style.backgroundColor = '#f9fafb';
          quill.root.style.color = '#9ca3af';
        } else if (!hasExistingQuestion) {
          quill.disable();
          quill.root.setAttribute('data-placeholder', 'Add a question');
          quill.root.style.backgroundColor = '#f9fafb';
          quill.root.style.color = '#9ca3af';
        } else {
          quill.focus();
        }

        modal.addEventListener('keydown', (evt: KeyboardEvent) => {
          evt.stopPropagation();
          if (evt.key === 'Escape') closeModal();
        }, true);
        modal.addEventListener('keyup', (evt: KeyboardEvent) => {
          evt.stopPropagation();
        }, true);
      }, 100);
    }
  };

  // Create a hit area that matches only the box dimensions (not the extended text)
  const hitArea = useMemo(() => ({
    x: 0,
    y: 0,
    width: boxWidth,
    height: boxHeight
  }), [boxWidth, boxHeight]);

  return (
    <BaseCanvasItem
      {...props}
      onDoubleClick={handleDoubleClick}
      hitArea={hitArea}
    >
      {showBackground && (
        <Rect
          width={boxWidth}
          height={boxHeight}
          fill={qnaElement.backgroundColor}
          opacity={qnaElement.backgroundOpacity ?? 1}
          cornerRadius={qnaElement.cornerRadius ?? qnaDefaults.cornerRadius ?? 0}
          listening={false}
        />
      )}

      {showBorder && (
        <Rect
          width={boxWidth}
          height={boxHeight}
          stroke={qnaElement.borderColor}
          strokeWidth={qnaElement.borderWidth}
          opacity={qnaElement.borderOpacity ?? 1}
          cornerRadius={qnaElement.cornerRadius ?? qnaDefaults.cornerRadius ?? 0}
          listening={false}
        />
      )}

      {/* Text that can extend beyond the box */}
      <RichTextShape ref={textShapeRef} runs={layout.runs} width={boxWidth} height={layout.contentHeight} />
      
      {/* Ruled lines underneath each text row */}
      {ruledLines && ruledLinesElements}
      
      {/* Invisible hit area for double-click detection - limited to box dimensions */}
      <Rect
        ref={textRef}
        x={0}
        y={0}
        width={boxWidth}
        height={boxHeight}
        fill="transparent"
        listening={false}
      />
    </BaseCanvasItem>
  );
}

