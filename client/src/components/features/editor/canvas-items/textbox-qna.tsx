import React, { useMemo, useRef, useEffect, forwardRef } from 'react';
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
}

type QnaSettings = {
  fontSize?: number;
  fontFamily?: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontColor?: string;
  fontOpacity?: number;
  paragraphSpacing?: ParagraphSpacing;
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

function createLayout(params: {
  questionText: string;
  answerText: string;
  questionStyle: RichTextStyle;
  answerStyle: RichTextStyle;
  width: number;
  height: number;
  padding: number;
  ctx: CanvasRenderingContext2D | null;
}): LayoutResult {
  const { questionText, answerText, questionStyle, answerStyle, width, height, padding, ctx } = params;
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
      runs.push({
        text: line.text,
        x: padding,
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

  const inlineGap = Math.min(32, answerStyle.fontSize * 0.5);
  let contentHeight = cursorY;

  let startAtSameLine = false;
  let remainingAnswerText = answerText;
  const lastQuestionLineY = questionLinePositions.length > 0 ? questionLinePositions[questionLinePositions.length - 1] : padding;

  // Check if answer can start on the same line as the last question line
  if (questionLines.length > 0 && answerText && answerText.trim()) {
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
          
          // Add answer text aligned to the same baseline
          // Both texts use the same baseline Y position
          runs.push({
            text: inlineText,
            x: padding + lastQuestionLineWidth + inlineGap,
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
  let answerCursorY = startAtSameLine ? cursorY : cursorY + (questionLines.length ? answerLineHeight * 0.2 : 0);

  remainingAnswerLines.forEach((line) => {
    if (line.text) {
      // Calculate baseline Y position for answer-only lines
      const answerBaselineY = answerCursorY + answerBaselineOffset;
      runs.push({
        text: line.text,
        x: padding,
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
  const boxWidth = element.width ?? 0;
  const boxHeight = element.height ?? 0;
  const textShapeRef = useRef<Konva.Shape>(null);
  const textShapeBoxRef = useRef<{ width: number; height: number }>({
    width: boxWidth,
    height: boxHeight
  });
  const textRef = useRef<Konva.Rect>(null);
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
    const style = {
      fontSize: qnaElement.questionSettings?.fontSize ?? qnaDefaults.questionSettings?.fontSize ?? qnaDefaults.fontSize ?? 42,
      fontFamily: qnaElement.questionSettings?.fontFamily || qnaDefaults.questionSettings?.fontFamily || qnaDefaults.fontFamily || 'Arial, sans-serif',
      fontBold: qnaElement.questionSettings?.fontBold ?? qnaDefaults.questionSettings?.fontBold ?? false,
      fontItalic: qnaElement.questionSettings?.fontItalic ?? qnaDefaults.questionSettings?.fontItalic ?? false,
      fontColor: qnaElement.questionSettings?.fontColor || qnaDefaults.questionSettings?.fontColor || '#666666',
      fontOpacity: qnaElement.questionSettings?.fontOpacity ?? qnaDefaults.questionSettings?.fontOpacity ?? 1,
      paragraphSpacing: qnaElement.questionSettings?.paragraphSpacing || qnaDefaults.questionSettings?.paragraphSpacing || element.paragraphSpacing || 'small'
    } as RichTextStyle;
    return style;
  }, [
    element.paragraphSpacing, 
    qnaDefaults, 
    qnaElement.questionSettings?.fontSize,
    qnaElement.questionSettings?.fontFamily,
    qnaElement.questionSettings?.fontBold,
    qnaElement.questionSettings?.fontItalic,
    qnaElement.questionSettings?.fontColor,
    qnaElement.questionSettings?.fontOpacity,
    qnaElement.questionSettings?.paragraphSpacing
  ]);

  const answerStyle = useMemo(() => {
    const style = {
      fontSize: qnaElement.answerSettings?.fontSize ?? qnaDefaults.answerSettings?.fontSize ?? qnaDefaults.fontSize ?? 48,
      fontFamily: qnaElement.answerSettings?.fontFamily || qnaDefaults.answerSettings?.fontFamily || qnaDefaults.fontFamily || 'Arial, sans-serif',
      fontBold: qnaElement.answerSettings?.fontBold ?? qnaDefaults.answerSettings?.fontBold ?? false,
      fontItalic: qnaElement.answerSettings?.fontItalic ?? qnaDefaults.answerSettings?.fontItalic ?? false,
      fontColor: qnaElement.answerSettings?.fontColor || qnaDefaults.answerSettings?.fontColor || '#1f2937',
      fontOpacity: qnaElement.answerSettings?.fontOpacity ?? qnaDefaults.answerSettings?.fontOpacity ?? 1,
      paragraphSpacing: qnaElement.answerSettings?.paragraphSpacing || qnaDefaults.answerSettings?.paragraphSpacing || element.paragraphSpacing || 'medium'
    } as RichTextStyle;
    return style;
  }, [
    element.paragraphSpacing, 
    qnaDefaults, 
    qnaElement.answerSettings?.fontSize,
    qnaElement.answerSettings?.fontFamily,
    qnaElement.answerSettings?.fontBold,
    qnaElement.answerSettings?.fontItalic,
    qnaElement.answerSettings?.fontColor,
    qnaElement.answerSettings?.fontOpacity,
    qnaElement.answerSettings?.paragraphSpacing
  ]);

  const individualSettings = qnaElement.qnaIndividualSettings ?? false;
  const effectiveQuestionStyle = useMemo(
    () => (individualSettings ? questionStyle : { ...questionStyle, ...answerStyle }),
    [individualSettings, questionStyle, answerStyle]
  );

  const padding = element.padding ?? qnaDefaults.padding ?? 8;

  const questionText = useMemo(() => {
    if (!element.questionId) {
      return 'Doppelklick, um eine Frage zu wählen...';
    }
    const questionData = state.tempQuestions[element.questionId];
    if (!questionData) {
      return 'Frage wird geladen...';
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
  const answerContent = sanitizedAnswer || 'Antwort hinzufügen...';

  const preparedQuestionText = questionText ? stripHtml(questionText) : questionText;

  const getQuestionText = () => preparedQuestionText || '';

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
      ctx: canvasContext
    });
  }, [answerContent, answerStyle, effectiveQuestionStyle, boxHeight, boxWidth, padding, preparedQuestionText]);

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

    const startX = padding;
    const endX = boxWidth - padding;
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
      // Only generate lines that are within the box dimensions (0 <= y <= boxHeight)
      // This ensures ruled lines only appear inside the visible border area
      if (linePos.y >= 0 && linePos.y <= boxHeight) {
        const lineElement = generateRuledLineElement(linePos.y, startX, endX);
        elements.push(lineElement);
      }
    });

    return elements;
  }, [ruledLines, layout.linePositions, padding, boxWidth, boxHeight, ruledLinesWidth, ruledLinesTheme, ruledLinesColor, ruledLinesOpacity, element.id]);

  const showBackground = qnaElement.backgroundEnabled && qnaElement.backgroundColor;
  const showBorder = qnaElement.borderEnabled && qnaElement.borderColor && qnaElement.borderWidth !== undefined;

  useEffect(() => {
    textShapeBoxRef.current = { width: boxWidth, height: boxHeight };
  }, [boxWidth, boxHeight]);

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
      header.innerHTML = '<h2 style="margin:0;font-size:1.25rem;font-weight:600">Frage Antwort</h2>';

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

