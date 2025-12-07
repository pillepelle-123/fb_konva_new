/**
 * Plattformunabhängige QnA Layout-Berechnungen
 * Exakte Kopie der Client-Implementierung für gemeinsame Nutzung
 */

import type { RichTextStyle } from '../types/text-layout';
import type { LayoutResult, LinePosition } from '../types/layout';
import type { TextRun } from '../types/text-layout';
import { wrapText, measureText, calculateTextX, getLineHeight } from './text-layout.ts';

export interface CreateBlockLayoutParams {
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
}

export interface CreateLayoutParams {
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
}

export function createBlockLayout(params: CreateBlockLayoutParams): LayoutResult {
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

export function createLayout(params: CreateLayoutParams): LayoutResult {
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
  // Also skip if answer text starts with a line break (manual Enter key) - respect user's line break
  const answerStartsWithLineBreak = answerText && (answerText.startsWith('\n') || answerText.trim().split('\n')[0] === '');
  if (!answerInNewRow && questionLines.length > 0 && answerText && answerText.trim() && !answerStartsWithLineBreak) {
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

  // Wrap remaining answer text for new lines
  // Only wrap remaining text if startAtSameLine is true AND there is remaining text
  // If startAtSameLine is true but remainingAnswerText is empty, don't render any additional lines
  const remainingAnswerLines = startAtSameLine && remainingAnswerText && remainingAnswerText.trim()
    ? wrapText(remainingAnswerText, answerStyle, availableWidth, ctx)
    : startAtSameLine
    ? [] // If startAtSameLine is true but no remaining text, don't render additional lines
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
      // Advance cursor by line height (same spacing as natural line breaks)
      answerCursorY += answerLineHeight;
    } else {
      // Empty line from line break (Enter key): skip without adding spacing
      // The spacing between text lines is already handled by answerLineHeight when rendering text
      // Empty lines should not create additional spacing - they just mark a paragraph break
      // The next text line will naturally have the correct spacing from the previous text line
      // Do nothing - don't advance cursor, don't add linePosition
    }
  });

  contentHeight = Math.max(contentHeight, answerCursorY, height);

  return {
    runs,
    contentHeight,
    linePositions
  };
}

