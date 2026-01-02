/**
 * Plattformunabhängige QnA Layout-Berechnungen
 * Exakte Kopie der Client-Implementierung für gemeinsame Nutzung
 */

import type { RichTextStyle } from '../types/text-layout';
import type { LayoutResult, LinePosition } from '../types/layout';
import type { TextRun } from '../types/text-layout';
import { wrapText, measureText, calculateTextX, getLineHeight, buildFont } from './text-layout.ts';

/**
 * Consistent baseline offset for ruled lines (in pixels)
 * This creates a uniform gap between text baseline and ruled line,
 * regardless of font size
 */
// Use smaller offset when running PDF export (set by PDF renderer) to match server printout
// Check multiple ways to detect PDF export environment
const isPdfExport = typeof window !== 'undefined' && (
  (window as any).__PDF_EXPORT__ === true ||
  window.location.pathname.includes('pdf-renderer') ||
  window.location.search.includes('pdf=true') ||
  navigator.userAgent.includes('HeadlessChrome')
);
// Use negative offset for PDF to move lines above text baseline
const RULED_LINE_BASELINE_OFFSET = isPdfExport ? -20 : 12;

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
  const questionLineHeight = isPdfExport ? getLineHeight(questionStyle) * 1.15 : getLineHeight(questionStyle);
  const answerLineHeight = isPdfExport ? getLineHeight(answerStyle) * 1 : getLineHeight(answerStyle);
  
  // Baseline offsets
  const questionBaselineOffset = questionStyle.fontSize * 0.8;
  const answerBaselineOffset = answerStyle.fontSize * 0.8;
  
  // Calculate question and answer areas based on position
  let questionArea = { x: padding, y: padding, width: width - padding * 2, height: height - padding * 2 };
  let answerArea = { x: padding, y: padding, width: width - padding * 2, height: height - padding * 2 };
  
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
    // For vertical layouts (top/bottom), calculate height correctly
    // The question area starts at y: padding, and the text fills the area
    // finalQuestionHeight should be just the text height (no extra padding)
    const textHeight = questionText && ctx 
      ? wrapText(questionText, questionStyle, width - padding * 2, ctx).length * questionLineHeight
      : questionStyle.fontSize;
    const finalQuestionHeight = Math.max(textHeight, questionStyle.fontSize);
    const gap = blockQuestionAnswerGap;
    const answerHeight = height - finalQuestionHeight - padding * 2 - gap;
    
    if (questionPosition === 'top') {
      questionArea = { x: padding, y: padding, width: width - padding * 2, height: finalQuestionHeight };
      answerArea = { x: padding, y: padding + finalQuestionHeight + gap, width: width - padding * 2, height: answerHeight };
    } else {
      answerArea = { x: padding, y: padding, width: width - padding * 2, height: answerHeight };
      questionArea = { x: padding, y: padding + answerHeight + gap, width: width - padding * 2, height: finalQuestionHeight };
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
            y: baselineY + RULED_LINE_BASELINE_OFFSET,
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
            y: baselineY + RULED_LINE_BASELINE_OFFSET,
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
            y: baselineY + RULED_LINE_BASELINE_OFFSET,
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
            y: baselineY + RULED_LINE_BASELINE_OFFSET,
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
  // For PDF export, apply scaling factor to match visual appearance (same as block layout)
  const questionLineHeight = isPdfExport ? getLineHeight(questionStyle) * 1.2 : getLineHeight(questionStyle);
  const answerLineHeight = isPdfExport ? getLineHeight(answerStyle) * 1 : getLineHeight(answerStyle);
  
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
        y: baselineY + RULED_LINE_BASELINE_OFFSET,
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
        y: baselineY + RULED_LINE_BASELINE_OFFSET,
        lineHeight: questionLineHeight,
        style: questionStyle
      });
      cursorY += questionLineHeight;
    }
  });

  // Calculate gap: base gap + user-defined gap
  // If answerInNewRow is true, questionAnswerGap applies vertically (not horizontally)
  // IMPORTANT: Match client-side calculation exactly: baseInlineGap + questionAnswerGap (always added, even if 0)
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
            // CRITICAL: Position cursor after the combined line using the combined line height
            // Reduce spacing by font-size dependent offset to match other answer lines
            // Convert actual fontSize to common fontSize for calculation
            const questionCommonSize = Math.round(questionStyle.fontSize * 12 / 50);
            const answerCommonSize = Math.round(answerStyle.fontSize * 12 / 50);
            const sizeDiff = questionCommonSize - answerCommonSize;
            const multiplier = sizeDiff <= 0 ? 0 : 3.23 * Math.pow(sizeDiff / 64, 1.8);
            const spacingAdjustment = answerStyle.fontSize * multiplier * 0.6;
            cursorY = padding + (questionLines.length * questionLineHeight) - questionLineHeight + combinedLineHeight - spacingAdjustment;

            // console.log("questionLineHeight", questionLineHeight, "answerLineHeight", answerLineHeight, "combinedLineHeight", combinedLineHeight, "sizeDiff", sizeDiff, "multiplier", multiplier, "spacingAdjustment", spacingAdjustment, "cursorY", cursorY);
            
            // Update the last line position for ruled lines (use combined line height)
            if (linePositions.length > 0) {
              linePositions[linePositions.length - 1] = {
                y: combinedBaselineY + RULED_LINE_BASELINE_OFFSET,
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
  const baseVerticalSpacing = (questionLines.length && !startAtSameLine) ? answerLineHeight * 0.2 : 0;
  
  // Apply spacing adjustment for separated lines too
  let separatedSpacingAdjustment = 0;
  if (!startAtSameLine && questionLines.length > 0) {
    const questionCommonSize = Math.round(questionStyle.fontSize * 12 / 50);
    const answerCommonSize = Math.round(answerStyle.fontSize * 12 / 50);
    const sizeDiff = questionCommonSize - answerCommonSize;
    const multiplier = sizeDiff <= 0 ? 0 : 3.23 * Math.pow(sizeDiff / 64, 1.8);
    separatedSpacingAdjustment = answerStyle.fontSize * multiplier * 0.6;
  }
  
  // CRITICAL: When startAtSameLine is true, use cursorY directly without any additional spacing
  // The combinedLineHeight calculation already set cursorY to the correct position
  let answerCursorY = startAtSameLine ? cursorY : cursorY + baseVerticalSpacing + verticalGap - separatedSpacingAdjustment;

  // Render leading empty lines based on leadingBreaks count
  // One \n means answer starts on next line (no empty line)
  // Two \n means one empty line between question and answer
  // Three \n means two empty lines, etc.
  // So we render (leadingBreaks - 1) empty lines
  const emptyLinesToRender = Math.max(0, leadingBreaks - 1);
  for (let i = 0; i < emptyLinesToRender; i++) {
    const answerBaselineY = answerCursorY + answerBaselineOffset;
    linePositions.push({
      y: answerBaselineY + RULED_LINE_BASELINE_OFFSET,
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
        y: answerBaselineY + RULED_LINE_BASELINE_OFFSET,
        lineHeight: answerLineHeight,
        style: answerStyle
      });
      answerCursorY += answerLineHeight;
    }
    emptyRun = 0;
  };

  remainingAnswerLines.forEach((line) => {
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
      y: answerBaselineY + RULED_LINE_BASELINE_OFFSET,
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
