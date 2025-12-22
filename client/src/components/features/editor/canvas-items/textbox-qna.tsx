import React, { useMemo, useRef, useEffect, forwardRef, useState, useCallback } from 'react';
import { Shape, Rect, Path, Text as KonvaText, Group } from 'react-konva';
import BaseCanvasItem, { type CanvasItemProps } from './base-canvas-item';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import { getToolDefaults } from '../../../../utils/tool-defaults';
import { getThemeRenderer, type Theme } from '../../../../utils/themes-client';
import { renderThemedBorder, createRectPath, createLinePath } from '../../../../utils/themed-border';
import type { CanvasElement } from '../../../../context/editor-context';
import type Konva from 'konva';
import { useCanvasOverlayElement } from '../canvas/canvas-overlay';
import { FEATURE_FLAGS } from '../../../../utils/feature-flags';
import type { RichTextStyle, TextRun, ParagraphSpacing } from '../../../../../../shared/types/text-layout';
import type { LinePosition, LayoutResult } from '../../../../../../shared/types/layout';
import { buildFont as sharedBuildFont, getLineHeight as sharedGetLineHeight, measureText as sharedMeasureText, calculateTextX as sharedCalculateTextX, wrapText as sharedWrapText } from '../../../../../../shared/utils/text-layout';
import { createLayout as sharedCreateLayout, createBlockLayout as sharedCreateBlockLayout } from '../../../../../../shared/utils/qna-layout';
import { createInlineTextEditor } from './inline-text-editor';

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
  borderTheme?: string;
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

type ExtendedWindow = Window &
  typeof globalThis &
  Record<string, unknown> & {
    Quill?: QuillConstructor;
  };

// Use shared functions with feature flag fallback
const buildFont = FEATURE_FLAGS.USE_SHARED_TEXT_LAYOUT ? sharedBuildFont : (style: RichTextStyle) => {
  const weight = style.fontBold ? 'bold ' : '';
  const italic = style.fontItalic ? 'italic ' : '';
  return `${weight}${italic}${style.fontSize}px ${style.fontFamily}`;
};

const LINE_HEIGHT: Record<'small' | 'medium' | 'large', number> = {
  small: 1,
  medium: 1.2,
  large: 1.5
};

const getLineHeight = FEATURE_FLAGS.USE_SHARED_TEXT_LAYOUT ? sharedGetLineHeight : (style: RichTextStyle) => {
  const spacing: 'small' | 'medium' | 'large' = style.paragraphSpacing || 'medium';
  return style.fontSize * (LINE_HEIGHT[spacing] ?? 1.2);
};

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

// Use shared functions with feature flag fallback
const measureText = FEATURE_FLAGS.USE_SHARED_TEXT_LAYOUT ? sharedMeasureText : (text: string, style: RichTextStyle, ctx: CanvasRenderingContext2D | null) => {
  if (!ctx) {
    return text.length * (style.fontSize * 0.6);
  }
  ctx.save();
  ctx.font = buildFont(style);
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
};

const calculateTextX = FEATURE_FLAGS.USE_SHARED_TEXT_LAYOUT ? sharedCalculateTextX : (text: string, style: RichTextStyle, startX: number, availableWidth: number, ctx: CanvasRenderingContext2D | null): number => {
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
};

const wrapText = FEATURE_FLAGS.USE_SHARED_TEXT_LAYOUT ? sharedWrapText : (text: string, style: RichTextStyle, maxWidth: number, ctx: CanvasRenderingContext2D | null) => {
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
  });
  return lines;
};

// Local implementation for fallback
function createBlockLayoutLocal(params: {
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
  blockQuestionAnswerGap?: number;
}): LayoutResult {
  const { questionText, answerText, questionStyle, answerStyle, width, height, padding, ctx, questionPosition = 'left', questionWidth = 40, blockQuestionAnswerGap = 10 } = params;
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
    
    questionLines.forEach((line: { text: string; width: number }) => {
      if (line.text) {
        const baselineY = cursorY + questionBaselineOffset;
        const textX = calculateTextX(line.text, questionStyle, questionArea.x, questionArea.width, ctx);
        runs.push({
          text: line.text,
          x: textX,
          y: baselineY,
          style: questionStyle
        });
        // Always add line position for canvas display (ruledLinesTarget is for PDF export)
        linePositions.push({
          y: baselineY + questionStyle.fontSize * 0.15,
          lineHeight: questionLineHeight,
          style: questionStyle
        });
        cursorY += questionLineHeight;
      } else {
        // Always add line position for canvas display (ruledLinesTarget is for PDF export)
        const baselineY = cursorY + questionBaselineOffset;
        linePositions.push({
          y: baselineY + questionStyle.fontSize * 0.15,
          lineHeight: questionLineHeight,
          style: questionStyle
        });
        cursorY += questionLineHeight;
      }
    });
  }
  
  // Render answer text in answer area
  if (answerText) {
    const answerLines = wrapText(answerText, answerStyle, answerArea.width, ctx);
    let cursorY = answerArea.y;
    
    answerLines.forEach((line: { text: string; width: number }) => {
      if (line.text) {
        const baselineY = cursorY + answerBaselineOffset;
        const textX = calculateTextX(line.text, answerStyle, answerArea.x, answerArea.width, ctx);
        runs.push({
          text: line.text,
          x: textX,
          y: baselineY,
          style: answerStyle
        });
        // Always add line position for canvas display (ruledLinesTarget is for PDF export)
        linePositions.push({
          y: baselineY + answerStyle.fontSize * 0.15,
          lineHeight: answerLineHeight,
          style: answerStyle
        });
        cursorY += answerLineHeight;
      } else {
        // Always add line position for canvas display (ruledLinesTarget is for PDF export)
        const baselineY = cursorY + answerBaselineOffset;
        linePositions.push({
          y: baselineY + answerStyle.fontSize * 0.15,
          lineHeight: answerLineHeight,
          style: answerStyle
        });
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

// Local implementation for fallback
function createLayoutLocal(params: {
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
  blockQuestionAnswerGap?: number;
}): LayoutResult {
  const { questionText, answerText, questionStyle, answerStyle, width, height, padding, ctx, answerInNewRow = false, questionAnswerGap = 0, layoutVariant = 'inline', questionPosition = 'left', questionWidth = 40, blockQuestionAnswerGap } = params;
  
  // Block layout uses different logic
  if (layoutVariant === 'block') {
    // Use shared or local createBlockLayout based on feature flag
    const blockLayoutFn = FEATURE_FLAGS.USE_SHARED_QNA_LAYOUT ? sharedCreateBlockLayout : createBlockLayoutLocal;
    return blockLayoutFn({
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
  
  // Calculate lastQuestionLineWidth using actualBoundingBoxRight to account for glyph overhangs and swashes
  // This is critical for fonts like "Audiowide" (overhangs) and "Bilbo Swash Caps" (swashes)
  // IMPORTANT: For positioning, we need actualBoundingBoxRight (distance from origin to right edge)
  // NOT actualBoundingBoxRight - actualBoundingBoxLeft (which is the bounding box width)
  // The right edge position is what we need to position the answer text correctly
  let lastQuestionLineWidth = 0;
  if (questionLines.length > 0 && ctx) {
    const lastQuestionLine = questionLines[questionLines.length - 1];
    if (lastQuestionLine.text) {
      ctx.save();
      ctx.font = buildFont(questionStyle);
      ctx.textBaseline = 'alphabetic'; // Match rendering baseline
      const metrics = ctx.measureText(lastQuestionLine.text);
      
      // Use actualBoundingBoxRight for positioning (distance from text origin to right edge)
      // This is the actual rendered right edge including all overhangs/swashes
      // This is what we need to calculate where the answer text should start
      if (metrics.actualBoundingBoxRight !== undefined) {
        // actualBoundingBoxRight is the distance from the text origin (left edge) to the right edge
        // This is exactly what we need for positioning the answer text
        lastQuestionLineWidth = metrics.actualBoundingBoxRight;
      } else {
        // Fallback: use standard width measurement
        lastQuestionLineWidth = metrics.width;
      }
      ctx.restore();
    }
  }
  
  // Store Y positions for each question line
  const questionLinePositions: number[] = [];
  
      // First pass: render question lines and track their baseline positions
  questionLines.forEach((line: { text: string; width: number }) => {
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

  // Count leading newlines in answer text
  const countLeadingNewlines = (text: string): number => {
    if (!text) return 0;
    let count = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        count++;
      } else {
        break;
      }
    }
    return count;
  };

  let startAtSameLine = false;
  let remainingAnswerText = answerText;
  const lastQuestionLineY = questionLinePositions.length > 0 ? questionLinePositions[questionLinePositions.length - 1] : padding;

  // Count leading newlines and adjust for answerInNewRow
  let leadingBreaks = countLeadingNewlines(answerText);
  if (answerInNewRow) {
    leadingBreaks += 1; // Shift everything down by one line
  }

  // Check if answer can start on the same line as the last question line
  // Only combine if leadingBreaks === 0 and first paragraph fits
  if (!answerInNewRow && leadingBreaks === 0 && questionLines.length > 0 && answerText && answerText.trim()) {
    const inlineAvailable = availableWidth - lastQuestionLineWidth - inlineGap;
    
    // Get the first paragraph (before first line break) to check if it fits
    const firstParagraph = answerText.split('\n')[0].trim();
    if (!firstParagraph) {
      // First paragraph is empty (starts with line break) - don't start on same line
      startAtSameLine = false;
    } else {
      // Split first paragraph into words to check if at least the first word fits
      const answerWords = firstParagraph.split(' ').filter(Boolean);
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
          
            // Calculate combined width (question + gap + answer)
          const inlineTextWidth = measureText(inlineText, answerStyle, ctx);
            const combinedWidth = lastQuestionLineWidth + inlineGap + inlineTextWidth;
            
            // Get alignment (use question style alignment, or answer style if question doesn't have one)
            const align = questionStyle.align || answerStyle.align || 'left';
            
            // Calculate X positions based on alignment
            let questionX: number;
            let inlineTextX: number;
            
            if (align === 'center') {
              // Center the combined text (question + gap + answer)
              const combinedStartX = padding + (availableWidth - combinedWidth) / 2;
              questionX = combinedStartX;
              inlineTextX = combinedStartX + lastQuestionLineWidth + inlineGap;
            } else if (align === 'right') {
              // Right-align the combined text
              const combinedStartX = padding + availableWidth - combinedWidth;
              questionX = combinedStartX;
              inlineTextX = combinedStartX + lastQuestionLineWidth + inlineGap;
            } else {
              // Left alignment (default)
              questionX = padding;
              inlineTextX = padding + lastQuestionLineWidth + inlineGap;
            }
            
            // Update the last question line Y position and X position to use combined baseline and alignment
            const lastQuestionRunIndex = runs.length - 1;
            if (lastQuestionRunIndex >= 0 && runs[lastQuestionRunIndex].style === questionStyle) {
              runs[lastQuestionRunIndex].y = combinedBaselineY;
              runs[lastQuestionRunIndex].x = questionX;
              
              // CRITICAL: Recalculate inlineTextX using the actual run's X position + measured width
              // This ensures we use the actual rendered position, not just the calculated position
              // This accounts for font-specific rendering differences and ensures accuracy
              // This matches the server-side logic in shared/utils/qna-layout.ts
              if (ctx && runs[lastQuestionRunIndex].text) {
                ctx.save();
                ctx.font = buildFont(questionStyle);
                ctx.textBaseline = 'alphabetic';
                const runMetrics = ctx.measureText(runs[lastQuestionRunIndex].text);
                
                // Use actualBoundingBoxRight for the right edge position
                const questionRightEdge = runMetrics.actualBoundingBoxRight !== undefined 
                  ? runMetrics.actualBoundingBoxRight 
                  : runMetrics.width;
                
                // Calculate inlineTextX as: question run X position + question right edge + gap
                // This uses the actual run position, not the calculated position
                inlineTextX = questionX + questionRightEdge + inlineGap;
                
                ctx.restore();
              }
            }
          
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
            const remainingFromFirstParagraph = remainingWords.join(' ');
            // If there's more content after the first paragraph (line breaks), include it
            const paragraphs = answerText.split('\n');
            if (paragraphs.length > 1) {
              // There are line breaks - include everything after the first paragraph
              const restOfAnswer = paragraphs.slice(1).join('\n');
              remainingAnswerText = remainingFromFirstParagraph 
                ? `${remainingFromFirstParagraph}\n${restOfAnswer}`
                : restOfAnswer;
            } else {
              remainingAnswerText = remainingFromFirstParagraph;
            }
        } else {
          // No words fit, don't start on same line
          startAtSameLine = false;
        }
        } else {
          // First word doesn't fit, don't start on same line
          startAtSameLine = false;
        }
      } else {
        // No words in first paragraph (shouldn't happen due to check above, but handle it)
        startAtSameLine = false;
      }
    }
  }

  // Remove leading newlines from answer text for further processing
  const answerTextWithoutLeadingBreaks = answerText.replace(/^\n+/, '');

  // Wrap remaining answer text for new lines
  const remainingAnswerLines = startAtSameLine && remainingAnswerText && remainingAnswerText.trim()
    ? wrapText(remainingAnswerText, answerStyle, availableWidth, ctx)
    : startAtSameLine
    ? [] // If startAtSameLine is true but no remaining text, don't render additional lines
    : wrapText(answerTextWithoutLeadingBreaks, answerStyle, availableWidth, ctx);

  // Start answer on new line if not on same line as question
  // If answerInNewRow is true, questionAnswerGap applies vertically
  // Otherwise, use standard spacing (questionAnswerGap only applies horizontally via inlineGap)
  const verticalGap = answerInNewRow ? questionAnswerGap : 0;
  const baseVerticalSpacing = questionLines.length ? answerLineHeight * 0.2 : 0;
  let answerCursorY = startAtSameLine ? cursorY : cursorY + baseVerticalSpacing + verticalGap;

  // Render leading empty lines based on leadingBreaks count
  // One \n means answer starts on next line (no empty line)
  // Two \n means one empty line between question and answer
  // Three \n means two empty lines, etc.
  // So we render (leadingBreaks - 1) empty lines
  const emptyLinesToRender = Math.max(0, leadingBreaks - 1);
  for (let i = 0; i < emptyLinesToRender; i++) {
    const answerBaselineY = answerCursorY + answerBaselineOffset;
    linePositions.push({
      y: answerBaselineY + answerStyle.fontSize * 0.15,
      lineHeight: answerLineHeight,
      style: answerStyle
    });
    answerCursorY += answerLineHeight;
  }

  // Handle empty runs from wrapText: these are additional empty lines within the text
  let emptyRun = 0;

  const flushEmptyRun = () => {
    if (emptyRun === 0) return;
    const blanksToRender = emptyRun; // render exactly as many empty lines as collected
    for (let i = 0; i < blanksToRender; i += 1) {
      const answerBaselineY = answerCursorY + answerBaselineOffset;
      linePositions.push({
        y: answerBaselineY + answerStyle.fontSize * 0.15,
        lineHeight: answerLineHeight,
        style: answerStyle
      });
      answerCursorY += answerLineHeight;
    }
    emptyRun = 0;
  };

  remainingAnswerLines.forEach((line: { text: string; width: number }) => {
    if (!line.text) {
      emptyRun += 1;
      return;
    }

    // flush pending empties before placing text
    flushEmptyRun();

    const answerBaselineY = answerCursorY + answerBaselineOffset;
    const textX = calculateTextX(line.text, answerStyle, padding, availableWidth, ctx);
    runs.push({
      text: line.text,
      x: textX,
      y: answerBaselineY, // Store baseline position directly
      style: answerStyle
    });
    linePositions.push({
      y: answerBaselineY + answerStyle.fontSize * 0.15,
      lineHeight: answerLineHeight,
      style: answerStyle
    });
    answerCursorY += answerLineHeight;
  });

  // flush trailing empties
  flushEmptyRun();

  contentHeight = Math.max(contentHeight, answerCursorY, height);

  return {
    runs,
    contentHeight,
    linePositions
  };
}

// Use shared functions with feature flag fallback
const createLayout = FEATURE_FLAGS.USE_SHARED_QNA_LAYOUT ? sharedCreateLayout : createLayoutLocal;

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
      runs.forEach((run: TextRun) => {
        ctx.font = buildFont(run.style);
        ctx.fillStyle = run.style.fontColor || '#000000';
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

function getClickArea(
  x: number,
  y: number,
  layout: LayoutResult,
  layoutVariant: 'inline' | 'block',
  questionStyle: RichTextStyle,
  answerStyle: RichTextStyle,
  padding: number,
  width: number,
  height: number,
  hasAnswer: boolean
): 'question' | 'answer' | null {
  if (layoutVariant === 'block') {
    // For block layout, use explicit questionArea and answerArea
    if (layout.questionArea && layout.answerArea) {
      const questionArea = layout.questionArea;
      const answerArea = layout.answerArea;
      
      // Check if click is in question area
      if (
        x >= questionArea.x &&
        x <= questionArea.x + questionArea.width &&
        y >= questionArea.y &&
        y <= questionArea.y + questionArea.height
      ) {
        return 'question';
      }
      
      // Check if click is in answer area (even if empty)
      if (
        x >= answerArea.x &&
        x <= answerArea.x + answerArea.width &&
        y >= answerArea.y &&
        y <= answerArea.y + answerArea.height
      ) {
        return 'answer';
      }
    }
    return null;
  } else {
    // For inline layout, determine based on text runs
    // This works regardless of text alignment (left, center, right) because we check Y positions
    const answerRuns = layout.runs.filter((run: TextRun) => run.style === answerStyle);
    const questionRuns = layout.runs.filter((run: TextRun) => run.style === questionStyle);
    
    if (answerRuns.length === 0 && questionRuns.length === 0) {
      return null;
    }
    
    // Helper to check if a Y position is within a run's line
    const isYInRunLine = (y: number, run: TextRun, style: RichTextStyle) => {
      const baselineOffset = style.fontSize * 0.8;
      const lineHeight = getLineHeight(style);
      const lineTop = run.y - baselineOffset;
      const lineBottom = lineTop + lineHeight;
      return y >= lineTop && y <= lineBottom;
    };
    
    // First, check if click is on a combined line (question and answer on same line)
    // For combined lines, we need to check X position to determine which part was clicked
    const answerBaselineOffset = answerStyle.fontSize * 0.8;
    const answerLineHeight = getLineHeight(answerStyle);
    
    // Check each question run to see if answer is on the same line
    for (const questionRun of questionRuns) {
      if (isYInRunLine(y, questionRun, questionStyle)) {
        // Check if there's an answer run on the same line (same Y baseline)
        const combinedAnswerRun = answerRuns.find((answerRun: TextRun) => 
          Math.abs(answerRun.y - questionRun.y) < 1 // Same baseline (within 1px tolerance)
        );
        
        if (combinedAnswerRun) {
          // This is a combined line - need to check X position
          // For combined lines, question is typically on the left, answer on the right
          // Works regardless of text alignment because we compare X positions directly
          const answerRunStartX = combinedAnswerRun.x;
          
          // If click is before answer run starts (with margin), it's question
          // Otherwise it's answer
          // This works for left, center, and right alignment
          if (x < answerRunStartX - 10) { // Small margin for easier clicking
            return 'question';
          } else {
            return 'answer';
          }
        }
      }
    }
    
    // Check if click is in answer-only lines (not combined with question)
    if (answerRuns.length > 0) {
      const minAnswerY = Math.min(...answerRuns.map((run: TextRun) => run.y - answerBaselineOffset));
      const maxAnswerY = Math.max(...answerRuns.map((run: TextRun) => run.y - answerBaselineOffset + answerLineHeight));
      
      // Check if Y is in answer area
      if (y >= minAnswerY && y <= maxAnswerY) {
        // Check if this Y position corresponds to an answer-only line (not combined)
        const answerRunOnLine = answerRuns.find((run: TextRun) => isYInRunLine(y, run, answerStyle));
        if (answerRunOnLine) {
          // Check if there's a question run on the same line
          const questionRunOnSameLine = questionRuns.find((qRun: TextRun) => 
            Math.abs(qRun.y - answerRunOnLine.y) < 1
          );
          
          // If no question run on same line, this is answer-only
          if (!questionRunOnSameLine) {
            // X check: works for all alignments (left, center, right) - full width between padding
            if (x >= padding && x <= width - padding) {
              return 'answer';
            }
          }
        }
      }
    }
    
    // If no answer exists, calculate expected answer area based on question position
    if (!hasAnswer && questionRuns.length > 0) {
      const questionBaselineOffset = questionStyle.fontSize * 0.8;
      const questionLineHeight = getLineHeight(questionStyle);
      const answerLineHeight = getLineHeight(answerStyle);
      
      // Find the last question line position
      const lastQuestionY = Math.max(...questionRuns.map((run: TextRun) => run.y - questionBaselineOffset + questionLineHeight));
      
      // Answer area starts after the question (with some spacing)
      const answerStartY = lastQuestionY + (answerLineHeight * 0.2);
      const answerEndY = height - padding; // Until bottom edge (with padding)
      
      // Check if click is in expected answer area (works for all alignments)
      if (
        x >= padding &&
        x <= width - padding &&
        y >= answerStartY &&
        y <= answerEndY
      ) {
        return 'answer';
      }
    }
    
    // Calculate question area bounds (question-only lines)
    if (questionRuns.length > 0) {
      const questionBaselineOffset = questionStyle.fontSize * 0.8;
      const questionLineHeight = getLineHeight(questionStyle);
      const minQuestionY = Math.min(...questionRuns.map((run: TextRun) => run.y - questionBaselineOffset));
      const maxQuestionY = Math.max(...questionRuns.map((run: TextRun) => run.y - questionBaselineOffset + questionLineHeight));
      
      // Check if Y is in question area
      if (y >= minQuestionY && y <= maxQuestionY) {
        // Check if this is a question-only line (not combined with answer)
        const questionRunOnLine = questionRuns.find((run: TextRun) => isYInRunLine(y, run, questionStyle));
        if (questionRunOnLine) {
          // Check if there's an answer run on the same line
          const answerRunOnSameLine = answerRuns.find((aRun: TextRun) => 
            Math.abs(aRun.y - questionRunOnLine.y) < 1
          );
          
          // If no answer run on same line, this is question-only
          if (!answerRunOnSameLine) {
            // X check: works for all alignments (left, center, right) - full width between padding
            if (x >= padding && x <= width - padding) {
              return 'question';
            }
          }
        }
      }
    }
    
    return null;
  }
}

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
  const transformOriginalDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const transformStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  const transformResizeDirectionRef = useRef<{ fromTop: boolean; fromLeft: boolean; fromBottom?: boolean; fromRight?: boolean } | null>(null);
  // Add ref to track minimum dimensions when opposite edge is reached
  const minDimensionReachedRef = useRef<{ width: boolean; height: boolean }>({ width: false, height: false });
  
  // Local state for dimensions during transform (to update visually without dispatch)
  // ONLY used during active transform, NOT during initial load
  const [transformDimensions, setTransformDimensions] = useState<{ width: number; height: number } | null>(null);
  const transformDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  
  // State to track if answer editor is open (to hide only answer text, not question)
  const [isAnswerEditorOpen, setIsAnswerEditorOpen] = useState(false);
  
  // State for hover detection and tooltip
  const [hoveredArea, setHoveredArea] = useState<'question' | 'answer' | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [isTooltipMounted, setIsTooltipMounted] = useState(false);
  
  // Get canvas overlay for tooltips
  const addElementRef = useRef<((element: HTMLElement) => () => void) | null>(null);
  try {
    const overlay = useCanvasOverlayElement();
    addElementRef.current = overlay.addElement;
  } catch {
    // CanvasOverlayProvider not available, fallback to document.body
    addElementRef.current = null;
  }
  
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
  // CRITICAL: Use element.theme if present (set during loadBook for pages that inherit book theme)
  // Otherwise fall back to page/book theme from state
  const elementTheme = element.theme;
  const pageTheme = elementTheme || currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = elementTheme || state.currentBook?.themeId || state.currentBook?.bookTheme;
  const pageLayoutTemplateId = currentPage?.layoutTemplateId;
  const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
  const pageColorPaletteId = currentPage?.colorPaletteId;
  const bookColorPaletteId = state.currentBook?.colorPaletteId;

  const qnaDefaults = useMemo(() => {
    // Use 'qna' for all QnA elements
    const toolType = 'qna';
    return getToolDefaults(
      toolType,
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
    element.textType,
    element.type,
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
    
    // Use spread operator to set defaults first, then override with element settings (same as textbox-qna-inline.tsx)
    const style = {
      ...qnaDefaults.questionSettings,
      ...qnaElement.questionSettings,
      fontSize: qnaElement.questionSettings?.fontSize ?? qnaDefaults.questionSettings?.fontSize ?? qnaDefaults.fontSize ?? 58,
      fontFamily: qnaElement.questionSettings?.fontFamily || qnaDefaults.questionSettings?.fontFamily || qnaDefaults.fontFamily || 'Arial, sans-serif',
      fontBold: qnaElement.questionSettings?.fontBold ?? qnaDefaults.questionSettings?.fontBold ?? false,
      fontItalic: qnaElement.questionSettings?.fontItalic ?? qnaDefaults.questionSettings?.fontItalic ?? false,
      fontOpacity: qnaElement.questionSettings?.fontOpacity ?? qnaDefaults.questionSettings?.fontOpacity ?? 1,
      paragraphSpacing: qnaElement.questionSettings?.paragraphSpacing || qnaDefaults.questionSettings?.paragraphSpacing || element.paragraphSpacing || 'small',
      align
    } as RichTextStyle;
    
    // Direct color override - element settings have absolute priority
    if (qnaElement.questionSettings?.fontColor) {
      style.fontColor = qnaElement.questionSettings.fontColor;
    }
    
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
    
    // Use spread operator to set defaults first, then override with element settings (same as textbox-qna-inline.tsx)
    const style = {
      ...qnaDefaults.answerSettings,
      ...qnaElement.answerSettings,
      fontSize: qnaElement.answerSettings?.fontSize ?? qnaDefaults.answerSettings?.fontSize ?? qnaDefaults.fontSize ?? 50,
      fontFamily: qnaElement.answerSettings?.fontFamily || qnaDefaults.answerSettings?.fontFamily || qnaDefaults.fontFamily || 'Arial, sans-serif',
      fontBold: qnaElement.answerSettings?.fontBold ?? qnaDefaults.answerSettings?.fontBold ?? false,
      fontItalic: qnaElement.answerSettings?.fontItalic ?? qnaDefaults.answerSettings?.fontItalic ?? false,
      fontOpacity: qnaElement.answerSettings?.fontOpacity ?? qnaDefaults.answerSettings?.fontOpacity ?? 1,
      paragraphSpacing: qnaElement.answerSettings?.paragraphSpacing || qnaDefaults.answerSettings?.paragraphSpacing || element.paragraphSpacing || 'medium',
      align
    } as RichTextStyle;
    
    // Direct color override - element settings have absolute priority
    if (qnaElement.answerSettings?.fontColor) {
      style.fontColor = qnaElement.answerSettings.fontColor;
    }
    
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

  // Update element text when assigned user changes to show their answer
  // Find the page that contains this element
  const elementPageNumber = useMemo(() => {
    if (!state.currentBook?.pages) return null;
    for (const page of state.currentBook.pages) {
      if (page.elements.some(el => el.id === element.id)) {
        return page.pageNumber ?? null;
      }
    }
    return null;
  }, [state.currentBook?.pages, element.id]);
  
  const assignedUser = useMemo(() => {
    if (!elementPageNumber) return null;
    return state.pageAssignments[elementPageNumber];
  }, [state.pageAssignments, elementPageNumber]);
  
  const answerText = useMemo(() => {
    // For QnA elements with questionId, never use element.text as answer
    // The answer should only come from state.tempAnswers
    // element.text should only be used for free text (when questionId is not set)
    if (element.questionId) {
      // Only show answer if a user is assigned to the page containing this textbox
      if (assignedUser) {
        const answerEntry = state.tempAnswers[element.questionId]?.[assignedUser.id] as TempAnswerEntry | undefined;
        return answerEntry?.text || '';
      }
      // If no user is assigned to the page, don't show any answer (even if current user has answered elsewhere)
      return '';
    }
    
    // For elements without questionId, use formattedText or text as fallback
    if (element.formattedText) {
      return stripHtml(element.formattedText);
    }
    if (element.text) {
      return element.text;
    }
    return '';
  }, [assignedUser, element.formattedText, element.questionId, element.text, state.tempAnswers]);

  const sanitizedAnswer = answerText ? stripHtml(answerText) : '';
  // Use answerText directly (no placeholder in canvas rendering, only in editor)
  const answerContent = sanitizedAnswer;

  const preparedQuestionText = questionText ? stripHtml(questionText) : questionText;

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
      blockQuestionAnswerGap
    });
  }, [answerContent, answerStyle, effectiveQuestionStyle, boxHeight, boxWidth, padding, preparedQuestionText, answerInNewRow, questionAnswerGap, layoutVariant, questionPosition, questionWidth, blockQuestionAnswerGap]);
  
  // Filter runs to show only question runs when answer editor is open
  const visibleRuns = useMemo(() => {
    if (isAnswerEditorOpen) {
      // When editor is open, show only question runs
      return layout.runs.filter((run: TextRun) => run.style === effectiveQuestionStyle);
    }
    // When editor is closed, show all runs
    return layout.runs;
  }, [layout.runs, isAnswerEditorOpen, effectiveQuestionStyle]);
  
  // Calculate question area bounds for tooltip and hover detection
  const questionAreaBounds = useMemo(() => {
    if (layoutVariant === 'block' && layout.questionArea) {
      return layout.questionArea;
    } else if (layoutVariant === 'inline') {
      const questionRuns = layout.runs.filter((run: TextRun) => run.style === effectiveQuestionStyle);
      if (questionRuns.length === 0) return null;
      
      const questionBaselineOffset = effectiveQuestionStyle.fontSize * 0.8;
      const questionLineHeight = getLineHeight(effectiveQuestionStyle);
      const minQuestionY = Math.min(...questionRuns.map((run: TextRun) => run.y - questionBaselineOffset));
      const maxQuestionY = Math.max(...questionRuns.map((run: TextRun) => run.y - questionBaselineOffset + questionLineHeight));
      
      return {
        x: padding,
        y: minQuestionY,
        width: boxWidth - padding * 2,
        height: maxQuestionY - minQuestionY
      };
    }
    return null;
  }, [layoutVariant, layout.questionArea, layout.runs, effectiveQuestionStyle, padding, boxWidth]);

  // Calculate answer area bounds for placeholder, hover detection, and tooltip
  const answerAreaBounds = useMemo(() => {
    // Disable answer area if no question is assigned
    if (!element.questionId) {
      return null;
    }
    // Don't show bounds if editor is open
    if (isAnswerEditorOpen) {
      return null;
    }
    
    if (layoutVariant === 'block' && layout.answerArea) {
      return layout.answerArea;
    } else if (layoutVariant === 'inline') {
      // Calculate bounds based on answer runs if they exist, otherwise use expected position
      const answerRuns = layout.runs.filter((run: TextRun) => run.style === answerStyle);
      const questionRuns = layout.runs.filter((run: TextRun) => run.style === effectiveQuestionStyle);
      
      if (answerRuns.length > 0) {
        // Answer exists - calculate bounds from actual answer runs
        // Need to cover all lines including gaps between them for proper hover detection
        const answerBaselineOffset = answerStyle.fontSize * 0.8;
        const answerLineHeight = getLineHeight(answerStyle);
        
        // Use linePositions to get all answer lines (only lines with text)
        // Empty lines from line breaks don't create separate linePositions, but spacing is handled by lineHeight
        const answerLinePositions = layout.linePositions.filter((lp: LinePosition) => lp.style === answerStyle);
        
        if (answerLinePositions.length > 0) {
          // Calculate top of first line and bottom of last line using linePositions
          // linePositions.y is the position of the ruled line (slightly below baseline)
          const firstLinePosition = answerLinePositions[0];
          const lastLinePosition = answerLinePositions[answerLinePositions.length - 1];
          
          // Calculate top of first line: linePosition.y - fontSize * 0.15 (offset from baseline) - baselineOffset
          const firstLineTop = firstLinePosition.y - answerStyle.fontSize * 0.15 - answerBaselineOffset;
          // Calculate bottom of last line: linePosition.y + lineHeight - fontSize * 0.15
          const lastLineBottom = lastLinePosition.y + lastLinePosition.lineHeight - answerStyle.fontSize * 0.15;
          
          // Total height covers all lines including gaps between lines
          const totalHeight = lastLineBottom - firstLineTop;
          
          return {
            x: padding,
            y: firstLineTop,
            width: boxWidth - padding * 2,
            height: totalHeight
          };
        } else {
          // Fallback: calculate from runs if no linePositions available
          const firstAnswerY = Math.min(...answerRuns.map((run: TextRun) => run.y));
          const lastAnswerY = Math.max(...answerRuns.map((run: TextRun) => run.y));
          const firstLineTop = firstAnswerY - answerBaselineOffset;
          const lastLineBottom = lastAnswerY - answerBaselineOffset + answerLineHeight;
          
          return {
            x: padding,
            y: firstLineTop,
            width: boxWidth - padding * 2,
            height: lastLineBottom - firstLineTop
          };
        }
      } else if (questionRuns.length > 0) {
        // No answer yet - calculate expected position
        const questionBaselineOffset = effectiveQuestionStyle.fontSize * 0.8;
        const questionLineHeight = getLineHeight(effectiveQuestionStyle);
        const answerLineHeight = getLineHeight(answerStyle);
        
        const lastQuestionY = Math.max(...questionRuns.map((run: TextRun) => run.y - questionBaselineOffset + questionLineHeight));
        const answerStartY = lastQuestionY + (answerLineHeight * 0.2);
        
        return {
          x: padding,
          y: answerStartY,
          width: boxWidth - padding * 2,
          height: Math.max(answerLineHeight, boxHeight - answerStartY - padding)
        };
      }
    }
    
    return null;
  }, [layoutVariant, layout.answerArea, layout.runs, layout.linePositions, effectiveQuestionStyle, answerStyle, padding, boxWidth, boxHeight, element.questionId, isAnswerEditorOpen]);

  // Generate ruled lines if enabled
  const ruledLines = qnaElement.ruledLines ?? false;
  const ruledLinesWidth = qnaElement.ruledLinesWidth ?? 0.8;
  // Use theme defaults from qnaDefaults - prioritize element value, then theme defaults, then fallback
  const ruledLinesTheme = qnaElement.ruledLinesTheme || qnaDefaults.ruledLinesTheme || 'rough';
  const ruledLinesColor = qnaElement.ruledLinesColor || qnaDefaults.ruledLinesColor || '#1f2937';
  const ruledLinesOpacity = qnaElement.ruledLinesOpacity ?? 1;

  const ruledLinesElements = useMemo(() => {
    if (!ruledLines || !layout.linePositions || layout.linePositions.length === 0) {
      return [];
    }

    const elements: React.ReactElement[] = [];

    const generateRuledLineElement = (y: number, startX: number, endX: number): React.ReactElement | null => {
      const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
      // Ensure theme is one of the supported themes
      const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly'];
      // Convert to string and check if it's a valid theme
      const themeString = String(ruledLinesTheme || 'default').toLowerCase().trim();
      const theme = (supportedThemes.includes(themeString as Theme) ? themeString : 'default') as Theme;
      
      return renderThemedBorder({
        width: ruledLinesWidth,
        color: ruledLinesColor,
        opacity: ruledLinesOpacity,
        path: createLinePath(startX, y, endX, y),
        theme: theme,
        themeSettings: {
          seed: seed + y,
          roughness: theme === 'rough' ? 2 : 1
        },
        strokeScaleEnabled: true,
        listening: false,
        key: `ruled-line-${y}`
      });
    };

    // For canvas display, show ruled lines for all text when enabled
    // The ruledLinesTarget is used for PDF export but for canvas we show all lines
    const targetLinePositions = layout.linePositions;

    // Render existing lines
    targetLinePositions.forEach((linePos: LinePosition) => {
      // For block layout, only render lines within the target area
      if (layoutVariant === 'block' && layout.questionArea && layout.answerArea) {
        const targetArea = ruledLinesTarget === 'question' ? layout.questionArea : layout.answerArea;
        
        // Check if line is within the target area (vertically)
        if (linePos.y >= targetArea.y && linePos.y <= targetArea.y + targetArea.height) {
          const lineStartX = targetArea.x;
          const lineEndX = targetArea.x + targetArea.width;
          const lineElement = generateRuledLineElement(linePos.y, lineStartX, lineEndX);
          if (lineElement) {
            elements.push(lineElement);
          }
        }
      } else {
        // For inline layout, use full width with padding
        const startX = padding;
        const endX = boxWidth - padding;
        
        // Only generate lines that are within the box dimensions (0 <= y <= boxHeight)
        // This ensures ruled lines only appear inside the visible border area
        if (linePos.y >= 0 && linePos.y <= boxHeight) {
          const lineElement = generateRuledLineElement(linePos.y, startX, endX);
          if (lineElement) {
            elements.push(lineElement);
          }
        }
      }
    });

    // For answer lines, extend to bottom of textbox
    if (ruledLinesTarget === 'answer' && targetLinePositions.length > 0) {
      const answerLineHeight = getLineHeight(answerStyle);
      const lastLinePosition = targetLinePositions[targetLinePositions.length - 1];
      let nextLineY = lastLinePosition.y + lastLinePosition.lineHeight;
      
      // Determine start and end X positions
      let startX: number;
      let endX: number;
      let bottomY: number;
      
      if (layoutVariant === 'block' && layout.answerArea) {
        startX = layout.answerArea.x;
        endX = layout.answerArea.x + layout.answerArea.width;
        bottomY = layout.answerArea.y + layout.answerArea.height;
      } else {
        startX = padding;
        endX = boxWidth - padding;
        bottomY = boxHeight - padding;
      }
      
      // Generate additional lines until we reach the bottom
      while (nextLineY <= bottomY) {
        const lineElement = generateRuledLineElement(nextLineY, startX, endX);
        if (lineElement) {
          elements.push(lineElement);
        }
        nextLineY += answerLineHeight;
      }
    }

    return elements;
  }, [ruledLines, layout.linePositions, layout.questionArea, layout.answerArea, padding, boxWidth, boxHeight, ruledLinesWidth, ruledLinesTheme, ruledLinesColor, ruledLinesOpacity, element.id, layoutVariant, ruledLinesTarget, qnaDefaults, effectiveQuestionStyle, answerStyle]);

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
      
      // Get the Group node to access position and determine resize direction
      const rectNode = textRef.current;
      if (!rectNode) return;
      
      const groupNode = rectNode.getParent();
      if (!groupNode || groupNode.getClassName() !== 'Group') return;
      
      // Use current transformDimensions if available, otherwise use element dimensions
      // This ensures we start from the correct visual state (prevents jumping)
      const currentTransformDims = transformDimensionsRef.current;
      const currentWidth = currentTransformDims?.width ?? elementWidth;
      const currentHeight = currentTransformDims?.height ?? elementHeight;
      
      // Store initial dimensions and position at transform start
      transformStartDimensionsRef.current = {
        width: currentWidth,
        height: currentHeight
      };
      
      // Store original dimensions (from element state) for position calculation
      transformOriginalDimensionsRef.current = {
        width: elementWidth,
        height: elementHeight
      };
      
      transformStartPositionRef.current = {
        x: groupNode.x(),
        y: groupNode.y()
      };
      
      // Determine resize direction from active anchor (only once at start)
      const stage = groupNode.getStage();
      const transformer = stage?.findOne('Transformer') as Konva.Transformer | null;
      
      let fromTop = false;
      let fromLeft = false;
      let fromBottom = false;
      let fromRight = false;
      
      if (transformer) {
        const activeAnchor = transformer.getActiveAnchor();
        if (activeAnchor) {
          fromTop = activeAnchor.includes('top');
          fromLeft = activeAnchor.includes('left');
          fromBottom = activeAnchor.includes('bottom');
          fromRight = activeAnchor.includes('right');
        }
      }
      
      transformResizeDirectionRef.current = { fromTop, fromLeft, fromBottom, fromRight };
      
      // Reset minimum dimension flags
      minDimensionReachedRef.current = { width: false, height: false };
      
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
      
      const stage = groupNode.getStage();
      if (!stage) return;
      
      // Get current mouse position in stage coordinates
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;
      
      const scaleX = groupNode.scaleX();
      const scaleY = groupNode.scaleY();
      
      // Only reset scale if it's not already 1 (to avoid unnecessary operations)
      if (scaleX !== 1 || scaleY !== 1) {
        // Get initial dimensions from when transform started
        const startDims = transformStartDimensionsRef.current || { width: elementWidth, height: elementHeight };
        const originalDims = transformOriginalDimensionsRef.current || { width: elementWidth, height: elementHeight };
        const startPos = transformStartPositionRef.current || { x: element.x || 0, y: element.y || 0 };
        const resizeDirection = transformResizeDirectionRef.current || { fromTop: false, fromLeft: false, fromBottom: false, fromRight: false };
        
        // Convert mouse position to local coordinates (relative to element's local coordinate system)
        // This is critical: we need the pointer position in the element's local space
        // to compare against the opposite edges
        const groupTransform = groupNode.getAbsoluteTransform().copy().invert();
        const localPointerPos = groupTransform.point(pointerPos);
        
        // Configuration: Buffer zone and minimum dimension
        const BUFFER = 60; // Puffer in Pixeln - Dimension wird eingefroren, wenn Maus noch BUFFER Pixel vor der Grenze ist
        const MIN_DIMENSION = 70; // Minimale Größe der Textbox (größer als vorher)
        
        // ============================================
        // HANDLE WIDTH DIMENSION (X-direction)
        // ============================================
        // This applies to handles that resize width:
        // - left, right (middle handles)
        // - top-left, top-right, bottom-left, bottom-right (corner handles)
        let newWidth = startDims.width * scaleX;
        
        if (resizeDirection.fromLeft || resizeDirection.fromRight) {
          // Determine opposite edge position in local coordinates
          // For left-side handles (left, top-left, bottom-left): opposite edge is RIGHT (x = startDims.width)
          // For right-side handles (right, top-right, bottom-right): opposite edge is LEFT (x = 0)
          const oppositeX = resizeDirection.fromLeft ? startDims.width : 0;
          
          // Calculate buffer zone: freeze dimension when pointer is within BUFFER pixels of the opposite edge
          // For left-side: freeze when pointer is at or beyond (oppositeX - BUFFER)
          // For right-side: freeze when pointer is at or before (oppositeX + BUFFER)
          const bufferThresholdX = resizeDirection.fromLeft 
            ? oppositeX - BUFFER  // Left-side: freeze when pointer reaches this point (BUFFER pixels before right edge)
            : oppositeX + BUFFER; // Right-side: freeze when pointer reaches this point (BUFFER pixels after left edge)
          
          // Check if pointer has crossed the buffer threshold in X direction
          const hasCrossedBufferX = resizeDirection.fromLeft 
            ? localPointerPos.x >= bufferThresholdX  // Left-side: pointer at or beyond buffer threshold
            : localPointerPos.x <= bufferThresholdX;  // Right-side: pointer at or before buffer threshold
          
          if (hasCrossedBufferX) {
            // Freeze width dimension at minimum
            if (!minDimensionReachedRef.current.width) {
              minDimensionReachedRef.current.width = true;
            }
            newWidth = MIN_DIMENSION;
          } else {
            // Pointer is back on the correct side in X direction - allow resizing again
            minDimensionReachedRef.current.width = false;
            newWidth = Math.max(MIN_DIMENSION, newWidth);
          }
        } else {
          // Not resizing width (e.g., top-center or bottom-center handle) - reset flag
          minDimensionReachedRef.current.width = false;
          newWidth = Math.max(MIN_DIMENSION, newWidth);
        }
        
        // ============================================
        // HANDLE HEIGHT DIMENSION (Y-direction)
        // ============================================
        // This applies to handles that resize height:
        // - top, bottom (middle handles)
        // - top-left, top-right, bottom-left, bottom-right (corner handles)
        let newHeight = startDims.height * scaleY;
        
        if (resizeDirection.fromTop || resizeDirection.fromBottom) {
          // Determine opposite edge position in local coordinates
          // For top-side handles (top, top-left, top-right): opposite edge is BOTTOM (y = startDims.height)
          // For bottom-side handles (bottom, bottom-left, bottom-right): opposite edge is TOP (y = 0)
          const oppositeY = resizeDirection.fromTop ? startDims.height : 0;
          
          // Calculate buffer zone: freeze dimension when pointer is within BUFFER pixels of the opposite edge
          // For top-side: freeze when pointer is at or beyond (oppositeY - BUFFER)
          // For bottom-side: freeze when pointer is at or before (oppositeY + BUFFER)
          const bufferThresholdY = resizeDirection.fromTop
            ? oppositeY - BUFFER  // Top-side: freeze when pointer reaches this point (BUFFER pixels before bottom edge)
            : oppositeY + BUFFER; // Bottom-side: freeze when pointer reaches this point (BUFFER pixels after top edge)
          
          // Check if pointer has crossed the buffer threshold in Y direction
          const hasCrossedBufferY = resizeDirection.fromTop
            ? localPointerPos.y >= bufferThresholdY  // Top-side: pointer at or beyond buffer threshold
            : localPointerPos.y <= bufferThresholdY; // Bottom-side: pointer at or before buffer threshold
          
          if (hasCrossedBufferY) {
            // Freeze height dimension at minimum
            if (!minDimensionReachedRef.current.height) {
              minDimensionReachedRef.current.height = true;
            }
            newHeight = MIN_DIMENSION;
          } else {
            // Pointer is back on the correct side in Y direction - allow resizing again
            minDimensionReachedRef.current.height = false;
            newHeight = Math.max(MIN_DIMENSION, newHeight);
          }
        } else {
          // Not resizing height (e.g., middle-left or middle-right handle) - reset flag
          minDimensionReachedRef.current.height = false;
          newHeight = Math.max(MIN_DIMENSION, newHeight);
        }
        
        // Calculate dimension changes from original dimensions
        const widthChange = newWidth - originalDims.width;
        const heightChange = newHeight - originalDims.height;
        
        // Reset scale to 1 immediately (this is the key part from Konva docs)
        // This allows the transform to continue smoothly
        groupNode.scaleX(1);
        groupNode.scaleY(1);
        
        // Adjust position to maintain anchor point
        // Use the original position and resize direction to calculate the new position
        // This avoids feedback loops by using fixed reference values
        let newX = startPos.x;
        let newY = startPos.y;
        
        if (resizeDirection.fromLeft) {
          // Resizing from left: anchor is at right, so move left by width change
          newX = startPos.x - widthChange;
        }
        
        if (resizeDirection.fromTop) {
          // Resizing from top: anchor is at bottom, so move up by height change
          newY = startPos.y - heightChange;
        }
        
        // Update position to maintain anchor point, but only if it changed
        // This avoids unnecessary updates that could cause feedback loops
        const currentX = groupNode.x();
        const currentY = groupNode.y();
        if (Math.abs(currentX - newX) > 0.01 || Math.abs(currentY - newY) > 0.01) {
          groupNode.x(newX);
          groupNode.y(newY);
        }
        
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
      
      // Get the Group node to adjust position if needed
      const rectNode = textRef.current;
      const groupNode = rectNode?.getParent();
      
      // Apply the final dimensions update
      const finalDims = transformStartDimensionsRef.current;
      
      if (finalDims && (finalDims.width !== elementWidth || finalDims.height !== elementHeight)) {
        // Get final position from groupNode (already adjusted during transform)
        const finalX = groupNode ? groupNode.x() : (element.x || 0);
        const finalY = groupNode ? groupNode.y() : (element.y || 0);
        
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
              height: finalDims.height,
              x: finalX,
              y: finalY
            }
          }
        });
        
        // Keep transformDimensions until element dimensions are updated
        // The useEffect will reset it when element dimensions match
      } else {
        // If dimensions didn't change, reset immediately
        setTransformDimensions(null);
      }
      
      // Reset flags and refs (but keep transformDimensions until element updates)
      isTransformingRef.current = false;
      transformStartDimensionsRef.current = null;
      transformOriginalDimensionsRef.current = null;
      transformStartPositionRef.current = null;
      transformResizeDirectionRef.current = null;
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

  const enableInlineAnswerEditing = useCallback(() => {
    createInlineTextEditor({
      element: qnaElement,
      answerText,
      answerStyle,
      effectiveQuestionStyle,
      layout,
      layoutVariant,
      padding,
      boxWidth,
      boxHeight,
      textRef,
      setIsAnswerEditorOpen,
      user: user || null,
      dispatch,
      getLineHeight,
      measureText
    });
  }, [answerText, answerStyle, effectiveQuestionStyle, layout, layoutVariant, padding, boxWidth, boxHeight, qnaElement, user, dispatch, textRef, getLineHeight, measureText]);
  
  // Update cursor style based on hovered area
  useEffect(() => {
    const stage = textRef.current?.getStage();
    if (!stage) return;
    
    const container = stage.container();
    // Only show text cursor for answer area if question is assigned and user is authorized
    if (hoveredArea === 'answer' && element.questionId && assignedUser && assignedUser.id === user?.id && state.activeTool === 'select') {
      container.style.cursor = 'pointer';
    } else if (hoveredArea === 'question' && state.activeTool === 'select') {
      // Show pointer cursor for question area
      container.style.cursor = 'pointer';
    } else {
      container.style.cursor = '';
    }
    
    return () => {
      if (container) {
        container.style.cursor = '';
      }
    };
  }, [hoveredArea, assignedUser, user?.id, state.activeTool, element.questionId]);
  
  // Render tooltip directly in DOM (outside Konva canvas)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    // Determine if tooltip should be shown
    let shouldShowTooltip = false;
    
    if (hoveredArea === 'question' && tooltipPosition && questionAreaBounds && state.activeTool === 'select') {
      // Question area tooltip - always show if hovering over question area
      shouldShowTooltip = true;
    } else if (hoveredArea === 'answer' && tooltipPosition && answerAreaBounds && element.questionId && assignedUser && assignedUser.id === user?.id && state.activeTool === 'select') {
      // Answer area tooltip - only show if question is assigned and user is authorized
      shouldShowTooltip = true;
    }
    
    if (!shouldShowTooltip) {
      // Start disappearing transition
      setIsTooltipVisible(false);
      const hideTimeout = setTimeout(() => {
        setIsTooltipMounted(false);
        // Remove existing tooltip after transition
        const existingTooltip = document.getElementById(`qna-tooltip-${element.id}`);
        if (existingTooltip) {
          existingTooltip.remove();
        }
      }, 200);
      return () => clearTimeout(hideTimeout);
    }
    
    // Start appearing transition
    setIsTooltipMounted(true);
    const showTimeout = setTimeout(() => setIsTooltipVisible(true), 10);
    
    return () => {
      clearTimeout(showTimeout);
    };
  }, [hoveredArea, tooltipPosition, answerAreaBounds, questionAreaBounds, assignedUser, user?.id, element.id, element.questionId, answerContent, state.activeTool]);
  
  // Separate effect to render tooltip with transition
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isTooltipMounted || !tooltipPosition) return;
    
    // Determine tooltip content
    let tooltipContentText = '';
    if (hoveredArea === 'question' && questionAreaBounds && state.activeTool === 'select') {
      tooltipContentText = element.questionId ? 'Double-click to change question' : 'Double-click to add a question';
    } else if (hoveredArea === 'answer' && answerAreaBounds && element.questionId && assignedUser && assignedUser.id === user?.id && state.activeTool === 'select') {
      tooltipContentText = answerContent.trim().length > 0 ? 'Double-click to edit answer' : 'Double-click to add an answer';
    }
    
    // Remove existing tooltip if any
    const existingTooltip = document.getElementById(`qna-tooltip-${element.id}`);
    if (existingTooltip) {
      existingTooltip.remove();
    }
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = `qna-tooltip-${element.id}`;
    tooltip.className = `fixed pointer-events-none transition-all duration-200 ease-out ${
      isTooltipVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
    }`;
    tooltip.style.left = `${tooltipPosition.x}px`;
    tooltip.style.top = `${tooltipPosition.y - 30}px`;
    tooltip.style.transform = 'translateX(-100%)'; // Align to right side
    tooltip.style.zIndex = '10'; // Gleicher z-index wie Canvas-Overlay, damit es hinter Toolbars (1000) liegt
    
    const tooltipContent = document.createElement('div');
    tooltipContent.className = 'text-xs bg-background text-foreground px-2 py-1 rounded whitespace-nowrap';
    tooltipContent.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
    tooltipContent.textContent = tooltipContentText;
    tooltip.appendChild(tooltipContent);
    
    // Add to canvas overlay if available, otherwise fallback to document.body
    let removeElement: (() => void) | null = null;
    if (addElementRef.current) {
      removeElement = addElementRef.current(tooltip);
    } else {
      document.body.appendChild(tooltip);
      removeElement = () => {
        const tooltipToRemove = document.getElementById(`qna-tooltip-${element.id}`);
        if (tooltipToRemove) {
          tooltipToRemove.remove();
        }
      };
    }
    
    return () => {
      if (removeElement) {
        removeElement();
      }
    };
  }, [isTooltipMounted, tooltipPosition, hoveredArea, questionAreaBounds, answerAreaBounds, assignedUser, user?.id, element.id, element.questionId, answerContent, state.activeTool]);
  
  // Separate effect to update visibility class when isTooltipVisible changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isTooltipMounted) return;
    
    const tooltipElement = document.getElementById(`qna-tooltip-${element.id}`);
    if (tooltipElement) {
      if (isTooltipVisible) {
        tooltipElement.className = `fixed pointer-events-none transition-all duration-200 ease-out opacity-100 scale-100`;
      } else {
        tooltipElement.className = `fixed pointer-events-none transition-all duration-200 ease-out opacity-0 scale-95`;
      }
    }
  }, [isTooltipVisible, isTooltipMounted, element.id]);

  // Helper function to get click area from mouse position
  const getClickAreaFromEvent = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return null;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return null;
    
    // Transform pointer position to element's local coordinate system
    const groupNode = textRef.current?.getParent();
    if (!groupNode) return null;
    
    const transform = groupNode.getAbsoluteTransform().copy().invert();
    const localPos = transform.point(pointerPos);
    
    return getClickArea(
      localPos.x,
      localPos.y,
      layout,
      layoutVariant,
      effectiveQuestionStyle,
      answerStyle,
      padding,
      boxWidth,
      boxHeight,
      answerContent.trim().length > 0
    );
  }, [layout, layoutVariant, effectiveQuestionStyle, answerStyle, padding, boxWidth, boxHeight, answerContent]);
  
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (props.interactive === false || state.activeTool !== 'select') {
      setHoveredArea(null);
      setTooltipPosition(null);
      return;
    }
    
    const clickArea = getClickAreaFromEvent(e);
    const stage = e.target.getStage();
    
    if (!stage) {
      setHoveredArea(null);
      setTooltipPosition(null);
      return;
    }
    
    // Calculate tooltip position based on hovered area
    // Position tooltip above the element, aligned to the right side
    const groupNode = textRef.current?.getParent();
    if (!groupNode) {
      setHoveredArea(clickArea);
      setTooltipPosition(null);
      return;
    }
    
    const groupTransform = groupNode.getAbsoluteTransform();
    const stageBox = stage.container().getBoundingClientRect();
    
    // Calculate the top-right corner of the element (boxWidth, 0 in local coordinates)
    const topRightLocalPos = {
      x: boxWidth,
      y: 0
    };
    const topRightStagePos = groupTransform.point(topRightLocalPos);
    
    if (clickArea === 'question' && questionAreaBounds) {
      setHoveredArea('question');
      setTooltipPosition({
        x: stageBox.left + topRightStagePos.x,
        y: stageBox.top + topRightStagePos.y
      });
    } else if (clickArea === 'answer' && answerAreaBounds && element.questionId) {
      // Only show answer tooltip if question is assigned
      setHoveredArea('answer');
      setTooltipPosition({
        x: stageBox.left + topRightStagePos.x,
        y: stageBox.top + topRightStagePos.y
      });
    } else {
      setHoveredArea(clickArea);
      setTooltipPosition(null);
    }
  }, [props.interactive, state.activeTool, getClickAreaFromEvent, answerAreaBounds, questionAreaBounds, element.questionId, boxWidth]);
  
  const handleMouseLeave = useCallback(() => {
    setHoveredArea(null);
    setTooltipPosition(null);
  }, []);

  const handleDoubleClick = (e?: Konva.KonvaEventObject<MouseEvent>) => {
    if (props.interactive === false) return;
    if (state.activeTool !== 'select') return;
    if (e?.evt && e.evt.button !== 0) return;
    
    // Get mouse position relative to the element
    if (!e) return;
    
    const clickArea = getClickAreaFromEvent(e);
    
    if (clickArea === 'question') {
      // Open question selector modal directly
      const globalWindow = window as ExtendedWindow;
      const directFn = globalWindow[`openQuestionSelector_${element.id}`];
      if (typeof directFn === 'function') {
        (directFn as () => void)();
        } else {
        globalWindow.dispatchEvent(new CustomEvent('openQuestionDialog', {
          detail: { elementId: element.id }
        }));
      }
    } else if (clickArea === 'answer') {
      // Disable answer editing if no question is assigned
      if (!element.questionId) {
        return; // No question assigned, cannot add answer
      }
      
      // Check if user is assigned to this page
      if (!assignedUser || assignedUser.id !== user?.id) {
        return; // User not assigned or not the assigned user
      }
      
      // Open inline answer editor
      enableInlineAnswerEditing();
    }
  };

  // enableQuillEditing function removed - now using inline editor for answers
  // and direct question selector modal for questions

  // Create a hit area that matches only the box dimensions (not the extended text)
  const hitArea = useMemo(() => ({
    x: 0,
    y: 0,
    width: boxWidth,
    height: boxHeight
  }), [boxWidth, boxHeight]);

  return (
    <>
    <BaseCanvasItem
      {...props}
      onDoubleClick={handleDoubleClick}
        onMouseLeave={handleMouseLeave}
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

      {/* Ruled lines underneath each text row - render after background, before border and text */}
      {/* Wrap in Group to ensure they stay together with other body parts */}
      {ruledLines && ruledLinesElements.length > 0 && (
        <Group listening={false}>
          {ruledLinesElements}
        </Group>
      )}

      {showBorder && (() => {
        const borderColor = qnaElement.borderColor || '#000000';
        const borderWidth = qnaElement.borderWidth || 1;
        const borderOpacity = qnaElement.borderOpacity ?? 1;
        const cornerRadius = qnaElement.cornerRadius ?? qnaDefaults.cornerRadius ?? 0;
        // Get theme from element or defaults
        // Check element.borderTheme first, then fallback to element.theme, then 'default'
        const themeValue = qnaElement.borderTheme || element.theme || 'default';
        const theme = themeValue as Theme; // Use the selected theme directly (don't map 'default' to 'rough')

        const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
        
        const borderElement = renderThemedBorder({
          width: borderWidth,
          color: borderColor,
          opacity: borderOpacity,
          cornerRadius: cornerRadius,
          path: createRectPath(0, 0, boxWidth, boxHeight),
          theme: theme,
          themeSettings: {
            roughness: theme === 'rough' ? 8 : undefined,
            seed: seed
          },
          strokeScaleEnabled: true,
          listening: false
        });

        // Fallback to simple rect border if theme rendering fails
        if (!borderElement) {
          return (
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
        }

        return borderElement;
      })()}

      {/* Text that can extend beyond the box */}
      {/* When answer editor is open, only show question runs */}
      <RichTextShape ref={textShapeRef} runs={visibleRuns} width={boxWidth} height={layout.contentHeight} />

      {/* Placeholder text when no answer exists */}
      {answerAreaBounds && !answerContent && !isAnswerEditorOpen && (
        <KonvaText
          x={answerAreaBounds.x}
          y={answerAreaBounds.y}
          width={answerAreaBounds.width}
          height={answerAreaBounds.height}
          text="Antwort eingeben..."
          fontSize={answerStyle.fontSize}
          fontFamily={answerStyle.fontFamily}
          fontStyle="italic"
          fill={answerStyle.fontColor}
          opacity={0.4}
          align={answerStyle.align || 'left'}
          verticalAlign="top"
          listening={false}
        />
      )}
      
      {/* Hit area for double-click detection and mouse move - limited to box dimensions */}
      <Rect
        ref={textRef}
        x={0}
        y={0}
        width={boxWidth}
        height={boxHeight}
        fill="transparent"
        listening={true}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </BaseCanvasItem>
    </>
  );
}

