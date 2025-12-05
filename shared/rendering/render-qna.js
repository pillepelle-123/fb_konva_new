/**
 * QnA rendering function for PDF export
 * This handles the standard QnA textbox (not inline)
 */

const { getGlobalThemeDefaults, deepMerge, getThemeRenderer } = require('./utils/theme-utils');

/**
 * Extract plain text from HTML
 */
function extractPlainText(html, document) {
  if (!html) return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
}

/**
 * Parse question payload (can be JSON with text property or plain string)
 */
function parseQuestionPayload(payload) {
  if (!payload) return '';
  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed === 'object' && parsed.text) {
      return parsed.text;
    }
  } catch {
    // ignore
  }
  return payload;
}

/**
 * Get tool defaults for QnA
 */
function getToolDefaults(tool, pageTheme, bookTheme, existingElement, pageColorPaletteId, bookColorPaletteId, themesData, colorPalettes) {
  const TOOL_DEFAULTS_QNA = {
    fontSize: 50,
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontColor: '#000000',
    align: 'left',
    paragraphSpacing: 'medium',
    cornerRadius: 0,
    borderWidth: 0,
    borderColor: '#000000',
    backgroundColor: 'transparent',
    padding: 8,
    questionSettings: {
      fontSize: 42,
      fontFamily: 'Arial, sans-serif',
      fontColor: '#666666',
      fontBold: false,
      fontItalic: false,
      fontOpacity: 1,
      align: 'left',
      paragraphSpacing: 'small',
      padding: 8
    },
    answerSettings: {
      fontSize: 48,
      fontFamily: 'Arial, sans-serif',
      fontColor: '#1f2937',
      fontBold: false,
      fontItalic: false,
      fontOpacity: 1,
      align: 'left',
      paragraphSpacing: 'medium',
      padding: 8
    }
  };
  
  if (tool !== 'qna') {
    return TOOL_DEFAULTS_QNA;
  }
  
  const baseDefaults = TOOL_DEFAULTS_QNA;
  const activeTheme = pageTheme || bookTheme || 'default';
  const getGlobalThemeDefaultsFunc = (typeof window !== 'undefined' && window.getGlobalThemeDefaults) ? window.getGlobalThemeDefaults : getGlobalThemeDefaults;
  const themeDefaults = getGlobalThemeDefaultsFunc(activeTheme, 'qna_inline', existingElement, undefined, undefined, undefined, undefined, themesData, colorPalettes);
  
  const deepMergeFunc = (typeof window !== 'undefined' && window.deepMerge) ? window.deepMerge : deepMerge;
  let mergedDefaults = deepMergeFunc(baseDefaults, themeDefaults);
  
  // Apply color palette (Page > Book hierarchy)
  const activePaletteId = pageColorPaletteId || bookColorPaletteId;
  if (activePaletteId && colorPalettes) {
    const palette = colorPalettes.find(p => p.id === activePaletteId);
    if (palette) {
      // Apply palette colors to defaults
      if (palette.primary) mergedDefaults.fontColor = palette.primary;
      if (palette.secondary) mergedDefaults.questionSettings.fontColor = palette.secondary;
      if (palette.accent) mergedDefaults.answerSettings.fontColor = palette.accent;
    }
  }
  
  return mergedDefaults;
}

/**
 * Build font string from style
 */
function buildFont(style) {
  const weight = style.fontBold ? 'bold ' : '';
  const italic = style.fontItalic ? 'italic ' : '';
  return `${weight}${italic}${style.fontSize}px ${style.fontFamily}`;
}

/**
 * Get line height multiplier based on paragraph spacing
 */
const LINE_HEIGHT = {
  small: 1,
  medium: 1.2,
  large: 1.5
};

function getLineHeight(style) {
  const spacing = style.paragraphSpacing || 'medium';
  return style.fontSize * (LINE_HEIGHT[spacing] || 1.2);
}

/**
 * Measure text width
 */
function measureText(text, style, ctx) {
  if (!ctx) {
    return text.length * (style.fontSize * 0.6);
  }
  ctx.save();
  ctx.font = buildFont(style);
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}

/**
 * Wrap text into lines
 */
function wrapText(text, style, maxWidth, ctx) {
  const lines = [];
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

/**
 * Calculate text X position based on alignment
 */
function calculateTextX(text, style, startX, availableWidth, ctx) {
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

/**
 * Create block layout for question and answer text
 */
function createBlockLayout(params) {
  const { questionText, answerText, questionStyle, answerStyle, width, height, padding, ctx, questionPosition = 'left', questionWidth = 40, ruledLinesTarget = 'answer', blockQuestionAnswerGap = 10 } = params;
  const runs = [];
  const linePositions = [];
  
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

/**
 * Create layout for question and answer text
 */
function createLayout(params) {
  const { questionText, answerText, questionStyle, answerStyle, width, height, padding, ctx, layoutVariant = 'inline', questionPosition = 'left', questionWidth = 40, ruledLinesTarget = 'answer', blockQuestionAnswerGap = 10, answerInNewRow = false, questionAnswerGap = 0 } = params;
  
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
      ruledLinesTarget,
      blockQuestionAnswerGap
    });
  }
  const availableWidth = Math.max(10, width - padding * 2);
  const runs = [];
  const linePositions = [];
  
  // Calculate line heights for both styles
  const questionLineHeight = getLineHeight(questionStyle);
  const answerLineHeight = getLineHeight(answerStyle);
  
  // Baseline offsets
  const questionBaselineOffset = questionStyle.fontSize * 0.8;
  const answerBaselineOffset = answerStyle.fontSize * 0.8;
  // For combined lines, use the larger baseline offset to align both texts
  const combinedBaselineOffset = Math.max(questionBaselineOffset, answerBaselineOffset);
  
  // Store Y positions for each question line
  const questionLinePositions = [];
  // Store X positions for each question line (to handle text alignment)
  const questionLineXPositions = [];
  
  let cursorY = padding;
  const questionLines = wrapText(questionText, questionStyle, availableWidth, ctx);

  questionLines.forEach((line) => {
    if (line.text) {
      const baselineY = cursorY + questionBaselineOffset;
      questionLinePositions.push(baselineY);
      const textX = calculateTextX(line.text, questionStyle, padding, availableWidth, ctx);
      questionLineXPositions.push(textX); // Store actual X position
      runs.push({
        text: line.text,
        x: textX,
        y: baselineY,
        style: questionStyle
      });
      // Track line position for ruled lines
      linePositions.push({
        y: baselineY + questionStyle.fontSize * 0.15,
        lineHeight: questionLineHeight,
        style: questionStyle
      });
    } else {
      // Track empty line position for ruled lines
      const baselineY = cursorY + questionBaselineOffset;
      questionLinePositions.push(baselineY);
      questionLineXPositions.push(padding); // For empty lines, use left alignment position
      linePositions.push({
        y: baselineY + questionStyle.fontSize * 0.15,
        lineHeight: questionLineHeight,
        style: questionStyle
      });
    }
    cursorY += questionLineHeight;
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
    // Get the actual X position and width of the last question line
    const lastQuestionLineIndex = questionLines.length - 1;
    const lastQuestionLine = questionLines[lastQuestionLineIndex];
    const lastQuestionLineActualX = questionLineXPositions[lastQuestionLineIndex] || padding;
    const lastQuestionLineActualWidth = lastQuestionLine.width;
    const lastQuestionLineEndX = lastQuestionLineActualX + lastQuestionLineActualWidth;
    
    // Calculate available space for answer text
    const rightEdge = padding + availableWidth;
    
    // Check alignment to determine placement strategy
    const align = questionStyle.align || 'left';
    const isRightAligned = align === 'right';
    const isCenterAligned = align === 'center';
    
    let inlineAvailable;
    
    if (isRightAligned) {
      const spaceBefore = lastQuestionLineActualX - padding - inlineGap;
      inlineAvailable = spaceBefore;
    } else if (isCenterAligned) {
      const spaceAfter = rightEdge - lastQuestionLineEndX - inlineGap;
      inlineAvailable = spaceAfter;
    } else {
      const spaceAfter = rightEdge - lastQuestionLineEndX - inlineGap;
      inlineAvailable = spaceAfter;
    }
    
    // Split answer into words to check if at least the first word fits
    const answerWords = answerText.split(' ').filter(Boolean);
    if (answerWords.length > 0) {
      const firstWordWidth = measureText(answerWords[0], answerStyle, ctx);
      
      if (inlineAvailable > firstWordWidth) {
        startAtSameLine = true;
        
        // Build text that fits on the same line
        let inlineText = '';
        let wordsUsed = 0;
        
        for (let i = 0; i < answerWords.length; i++) {
          const word = answerWords[i];
          const testText = inlineText ? inlineText + ' ' + word : word;
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
          const combinedBaselineY = lastQuestionLineY + (combinedBaselineOffset - questionBaselineOffset);
          
          // Update the last question line Y position to use combined baseline
          const lastQuestionRunIndex = runs.length - 1;
          if (lastQuestionRunIndex >= 0 && runs[lastQuestionRunIndex].style === questionStyle) {
            runs[lastQuestionRunIndex].y = combinedBaselineY;
          }
          
          // Position answer text based on alignment
          const inlineTextWidth = measureText(inlineText, answerStyle, ctx);
          let inlineTextX;
          let questionTextX;
          
          if (isRightAligned) {
            const combinedWidth = lastQuestionLineActualWidth + inlineGap + inlineTextWidth;
            const combinedBlockStartX = rightEdge - combinedWidth;
            questionTextX = Math.max(combinedBlockStartX, padding);
            inlineTextX = questionTextX + lastQuestionLineActualWidth + inlineGap;
            
            if (lastQuestionRunIndex >= 0 && runs[lastQuestionRunIndex].style === questionStyle) {
              runs[lastQuestionRunIndex].x = questionTextX;
            }
          } else if (isCenterAligned) {
            const combinedWidth = lastQuestionLineActualWidth + inlineGap + inlineTextWidth;
            const combinedBlockStartX = padding + (availableWidth - combinedWidth) / 2;
            questionTextX = Math.max(combinedBlockStartX, padding);
            inlineTextX = questionTextX + lastQuestionLineActualWidth + inlineGap;
            
            if (lastQuestionRunIndex >= 0 && runs[lastQuestionRunIndex].style === questionStyle) {
              runs[lastQuestionRunIndex].x = questionTextX;
            }
          } else {
            inlineTextX = lastQuestionLineEndX + inlineGap;
            inlineTextX = Math.min(inlineTextX, rightEdge - inlineTextWidth);
          }
          
          // Add answer text aligned to the same baseline
          runs.push({
            text: inlineText,
            x: inlineTextX,
            y: combinedBaselineY,
            style: answerStyle
          });
          
          // Update the last line position for ruled lines (use combined line height)
          // Match client-side logic: update the last linePositions entry instead of adding a new one
          if (linePositions.length > 0) {
            linePositions[linePositions.length - 1] = {
              y: combinedBaselineY + Math.max(questionStyle.fontSize, answerStyle.fontSize) * 0.15,
              lineHeight: Math.max(questionLineHeight, answerLineHeight),
              style: answerStyle // Use answer style for combined line
            };
          }
          
          // Update cursorY to account for combined line height
          const combinedLineHeight = Math.max(questionLineHeight, answerLineHeight);
          cursorY = padding + ((questionLines.length - 1) * questionLineHeight) + combinedLineHeight;
          
          // Get remaining text (words not used + rest of answer)
          const remainingWords = answerWords.slice(wordsUsed);
          remainingAnswerText = remainingWords.join(' ');
        } else {
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
      const baselineY = answerCursorY + answerBaselineOffset;
      const textX = calculateTextX(line.text, answerStyle, padding, availableWidth, ctx);
      runs.push({
        text: line.text,
        x: textX,
        y: baselineY,
        style: answerStyle
      });
      // Track line position for ruled lines
      linePositions.push({
        y: baselineY + answerStyle.fontSize * 0.15,
        lineHeight: answerLineHeight,
        style: answerStyle
      });
    } else {
      // Track empty line position for ruled lines
      const baselineY = answerCursorY + answerBaselineOffset;
      linePositions.push({
        y: baselineY + answerStyle.fontSize * 0.15,
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

/**
 * Render QnA textbox
 * @param {Object} layer - Konva layer
 * @param {Object} element - Element data
 * @param {Object} pageData - Page data
 * @param {Object} bookData - Book data with questions
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Element width
 * @param {number} height - Element height
 * @param {number} rotation - Rotation angle
 * @param {number} opacity - Opacity value
 * @param {Object} konvaInstance - Konva instance
 * @param {Object} document - Document object
 * @param {Object} roughInstance - Rough.js instance (optional)
 * @param {Object} themesData - Themes data
 * @param {Array} colorPalettes - Color palettes array
 * @returns {number} Number of nodes added
 */
function renderQnA(layer, element, pageData, bookData, x, y, width, height, rotation, opacity, konvaInstance, document, roughInstance, themesData, colorPalettes) {
  const { renderRuledLines } = require('./render-ruled-lines');
  const Konva = konvaInstance;
  
  // Debug logging
  console.log('renderQnA called for element:', {
    id: element.id,
    textType: element.textType,
    questionId: element.questionId,
    text: element.text,
    formattedText: element.formattedText,
    questionSettings: element.questionSettings,
    answerSettings: element.answerSettings
  });
  
  // Find question text
  // Match client-side logic: questionText comes from state.tempQuestions[element.questionId]
  // But in server context, we need to get it from bookData.questions
  let questionText = '';
  if (element.questionId) {
    // Try to find question in bookData.questions array
    const question = bookData.questions?.find(q => q.id === element.questionId);
    if (question) {
      questionText = parseQuestionPayload(question.text || question.question_text || '');
      console.log('Found question text:', questionText);
    } else {
      console.log('Question not found for questionId:', element.questionId, 'Available questions:', bookData.questions?.map(q => q.id));
    }
  } else {
    console.log('No questionId for element:', element.id);
  }
  
  // Get answer text - match client-side logic exactly
  let answerText = element.text || element.formattedText || '';
  if (answerText && answerText.includes('<')) {
    answerText = extractPlainText(answerText, document);
  }
  // Match client-side: const sanitizedAnswer = answerText ? stripHtml(answerText) : '';
  // const answerContent = sanitizedAnswer || 'Antwort hinzufügen...';
  const sanitizedAnswer = answerText || '';
  const answerContent = sanitizedAnswer || 'Antwort hinzufügen...';
  
  // Get tool defaults using theme system
  const toolDefaults = getToolDefaults(
    'qna',
    pageData.theme || pageData.templateId,
    bookData.theme || bookData.templateId,
    element,
    pageData.colorPaletteId,
    bookData.colorPaletteId,
    themesData,
    colorPalettes
  );
  
  // Match client-side style extraction exactly
  // Client-side: fontSize: qnaDefaults.questionSettings?.fontSize || qnaElement.questionSettings?.fontSize || qnaDefaults.fontSize || 42
  const questionStyle = {
    fontSize: element.questionSettings?.fontSize || toolDefaults.questionSettings?.fontSize || toolDefaults.fontSize || 42,
    fontFamily: element.questionSettings?.fontFamily || toolDefaults.questionSettings?.fontFamily || toolDefaults.fontFamily || 'Arial, sans-serif',
    fontBold: element.questionSettings?.fontBold ?? toolDefaults.questionSettings?.fontBold ?? false,
    fontItalic: element.questionSettings?.fontItalic ?? toolDefaults.questionSettings?.fontItalic ?? false,
    fontColor: element.questionSettings?.fontColor || toolDefaults.questionSettings?.fontColor || '#666666',
    fontOpacity: element.questionSettings?.fontOpacity ?? toolDefaults.questionSettings?.fontOpacity ?? 1,
    paragraphSpacing: element.questionSettings?.paragraphSpacing || toolDefaults.questionSettings?.paragraphSpacing || element.paragraphSpacing || 'small',
    align: element.align || element.format?.textAlign || element.questionSettings?.align || toolDefaults.questionSettings?.align || 'left'
  };
  
  const answerStyle = {
    fontSize: element.answerSettings?.fontSize || toolDefaults.answerSettings?.fontSize || toolDefaults.fontSize || 48,
    fontFamily: element.answerSettings?.fontFamily || toolDefaults.answerSettings?.fontFamily || toolDefaults.fontFamily || 'Arial, sans-serif',
    fontBold: element.answerSettings?.fontBold ?? toolDefaults.answerSettings?.fontBold ?? false,
    fontItalic: element.answerSettings?.fontItalic ?? toolDefaults.answerSettings?.fontItalic ?? false,
    fontColor: element.answerSettings?.fontColor || toolDefaults.answerSettings?.fontColor || '#1f2937',
    fontOpacity: element.answerSettings?.fontOpacity ?? toolDefaults.answerSettings?.fontOpacity ?? 1,
    paragraphSpacing: element.answerSettings?.paragraphSpacing || toolDefaults.answerSettings?.paragraphSpacing || element.paragraphSpacing || 'medium',
    align: element.align || element.format?.textAlign || element.answerSettings?.align || toolDefaults.answerSettings?.align || 'left'
  };
  
  // When individualSettings is false, use answer font properties for question as well
  // Match client-side: const effectiveQuestionStyle = individualSettings ? questionStyle : { ...questionStyle, ...answerStyle };
  const individualSettings = element.qnaIndividualSettings ?? false;
  const effectiveQuestionStyle = individualSettings ? questionStyle : { ...questionStyle, ...answerStyle };
  
  // Get padding
  const padding = element.padding ?? toolDefaults.padding ?? 8;
  
  // Create canvas context for text measurement
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Extract layout settings from element
  const layoutVariant = element.layoutVariant || 'inline';
  const questionPosition = element.questionPosition || 'left';
  const questionWidth = element.questionWidth ?? 40;
  const ruledLinesTarget = element.ruledLinesTarget || 'answer';
  const blockQuestionAnswerGap = element.blockQuestionAnswerGap ?? 10;
  const answerInNewRow = element.answerInNewRow ?? false;
  // Use the appropriate gap value based on mode, with fallback to questionAnswerGap for backward compatibility
  const questionAnswerGap = answerInNewRow 
    ? (element.questionAnswerGapVertical ?? element.questionAnswerGap ?? 0)
    : (element.questionAnswerGapHorizontal ?? element.questionAnswerGap ?? 0);
  
  // Create layout
  const layout = createLayout({
    questionText: questionText || '',
    answerText: answerContent,
    questionStyle: effectiveQuestionStyle,
    answerStyle: answerStyle,
    width: width,
    height: height,
    padding: padding,
    ctx: ctx,
    layoutVariant: layoutVariant,
    questionPosition: questionPosition,
    questionWidth: questionWidth,
    ruledLinesTarget: ruledLinesTarget,
    blockQuestionAnswerGap: blockQuestionAnswerGap,
    answerInNewRow: answerInNewRow,
    questionAnswerGap: questionAnswerGap
  });
  
  // Debug logging for layout result
  console.log('renderQnA layout result:', {
    id: element.id,
    layoutVariant: layoutVariant,
    runsCount: layout.runs ? layout.runs.length : 0,
    linePositionsCount: layout.linePositions ? layout.linePositions.length : 0,
    linePositions: layout.linePositions,
    contentHeight: layout.contentHeight,
    height: height
  });
  
  let nodesAdded = 0;
  
  // Render background if enabled
  const showBackground = element.backgroundEnabled && element.backgroundColor;
  let bgRect = null;
  if (showBackground) {
    const backgroundColor = element.backgroundColor || 'transparent';
    const backgroundOpacity = element.backgroundOpacity !== undefined ? element.backgroundOpacity : 1;
    const cornerRadius = element.cornerRadius ?? toolDefaults.cornerRadius ?? 0;
    
    bgRect = new Konva.Rect({
      x: x,
      y: y,
      width: width,
      height: height,
      fill: backgroundColor,
      opacity: backgroundOpacity * opacity,
      cornerRadius: cornerRadius,
      listening: false,
      visible: true
    });
    
    layer.add(bgRect);
    bgRect.zIndex(0);
    
    // Find all page background nodes and move bgRect after them
    const stage = layer.getStage();
    const stageWidth = stage ? stage.width() : 0;
    const stageHeight = stage ? stage.height() : 0;
    
    let lastPageBgIndex = -1;
    layer.getChildren().forEach((node, idx) => {
      if (node === bgRect) return;
      if (node.getClassName() !== 'Rect' && node.getClassName() !== 'Image') return;
      const nodeX = node.x ? node.x() : 0;
      const nodeY = node.y ? node.y() : 0;
      const nodeWidth = node.width ? node.width() : 0;
      const nodeHeight = node.height ? node.height() : 0;
      if (nodeX === 0 && nodeY === 0 && nodeWidth === stageWidth && nodeHeight === stageHeight) {
        lastPageBgIndex = Math.max(lastPageBgIndex, idx);
      }
    });
    
    if (lastPageBgIndex !== -1) {
      const bgRectIndex = layer.getChildren().indexOf(bgRect);
      if (bgRectIndex !== -1 && bgRectIndex !== lastPageBgIndex + 1) {
        layer.getChildren().splice(bgRectIndex, 1);
        layer.getChildren().splice(lastPageBgIndex + 1, 0, bgRect);
      }
    }
    
    nodesAdded++;
  }
  
  // Render border if enabled
  const showBorder = element.borderEnabled && element.borderColor && element.borderWidth !== undefined;
  if (showBorder) {
    const borderColor = element.borderColor || '#000000';
    const borderWidth = element.borderWidth || 1;
    const borderOpacity = element.borderOpacity !== undefined ? element.borderOpacity : 1;
    const cornerRadius = element.cornerRadius ?? toolDefaults.cornerRadius ?? 0;
    const borderTheme = element.borderTheme || 
                       (element.questionSettings && element.questionSettings.borderTheme) || 
                       (element.answerSettings && element.answerSettings.borderTheme) || 
                       'default';
    
    // Use layout.contentHeight for border (matches text height)
    const borderHeight = layout.contentHeight || height;
    
    // Render border with theme support
    // For rough/sketchy themes, use rough.js directly (matches client-side logic)
    if (roughInstance && (borderTheme === 'rough' || borderTheme === 'sketchy')) {
      try {
        const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const rc = roughInstance.svg(svg);
        
        let roughElement;
        if (cornerRadius > 0) {
          const roundedRectPath = 'M ' + cornerRadius + ' 0 L ' + (width - cornerRadius) + ' 0 Q ' + width + ' 0 ' + width + ' ' + cornerRadius + ' L ' + width + ' ' + (borderHeight - cornerRadius) + ' Q ' + width + ' ' + borderHeight + ' ' + (width - cornerRadius) + ' ' + borderHeight + ' L ' + cornerRadius + ' ' + borderHeight + ' Q 0 ' + borderHeight + ' 0 ' + (borderHeight - cornerRadius) + ' L 0 ' + cornerRadius + ' Q 0 0 ' + cornerRadius + ' 0 Z';
          roughElement = rc.path(roundedRectPath, {
            roughness: borderTheme === 'sketchy' ? 2 : 8, // Use roughness 8 for 'rough' theme to match client-side rendering
            strokeWidth: borderWidth,
            stroke: borderColor,
            fill: 'transparent',
            seed: seed
          });
        } else {
          roughElement = rc.rectangle(0, 0, width, borderHeight, {
            roughness: borderTheme === 'sketchy' ? 2 : 8, // Use roughness 8 for 'rough' theme to match client-side rendering
            strokeWidth: borderWidth,
            stroke: borderColor,
            fill: 'transparent',
            seed: seed
          });
        }
        
        const paths = roughElement.querySelectorAll('path');
        let combinedPath = '';
        paths.forEach(path => {
          const d = path.getAttribute('d');
          if (d) combinedPath += d + ' ';
        });
        
        if (combinedPath) {
          const borderPath = new Konva.Path({
            x: x,
            y: y,
            data: combinedPath.trim(),
            stroke: borderColor,
            strokeWidth: borderWidth,
            opacity: borderOpacity * opacity,
            fill: 'transparent',
            strokeScaleEnabled: true,
            rotation: rotation,
            listening: false,
            lineCap: 'round',
            lineJoin: 'round',
            visible: true
          });
          layer.add(borderPath);
          
          // Insert border after ruled lines (or after background if no ruled lines)
          const insertAfterIndex = bgRect ? layer.getChildren().indexOf(bgRect) + 1 + ruledLinesNodes.length : layer.getChildren().length;
          const borderPathIndex = layer.getChildren().indexOf(borderPath);
          if (borderPathIndex !== -1 && borderPathIndex !== insertAfterIndex) {
            layer.getChildren().splice(borderPathIndex, 1);
            layer.getChildren().splice(insertAfterIndex, 0, borderPath);
          }
          
          // Fallback: if no background, insert after page background
          if (!bgRect) {
            const stage = layer.getStage();
            const stageWidth = stage ? stage.width() : 0;
            const stageHeight = stage ? stage.height() : 0;
            let lastPageBgIndex = -1;
            layer.getChildren().forEach((node, idx) => {
              if (node === borderPath) return;
              if (node.getClassName() !== 'Rect' && node.getClassName() !== 'Image') return;
              const nodeX = node.x ? node.x() : 0;
              const nodeY = node.y ? node.y() : 0;
              const nodeWidth = node.width ? node.width() : 0;
              const nodeHeight = node.height ? node.height() : 0;
              if (nodeX === 0 && nodeY === 0 && nodeWidth === stageWidth && nodeHeight === stageHeight) {
                lastPageBgIndex = Math.max(lastPageBgIndex, idx);
              }
            });
            if (lastPageBgIndex !== -1) {
              const borderIndex = layer.getChildren().indexOf(borderPath);
              if (borderIndex !== -1 && borderIndex !== lastPageBgIndex + 1) {
                layer.getChildren().splice(borderIndex, 1);
                layer.getChildren().splice(lastPageBgIndex + 1, 0, borderPath);
              }
            }
          }
          
          nodesAdded++;
        } else {
          // Fallback to Rect if path generation fails
          const borderRect = new Konva.Rect({
            x: x,
            y: y,
            width: width,
            height: borderHeight,
            fill: 'transparent',
            stroke: borderColor,
            strokeWidth: borderWidth,
            opacity: borderOpacity * opacity,
            cornerRadius: cornerRadius,
            rotation: rotation,
            listening: false,
            visible: true
          });
          layer.add(borderRect);
          
          // Insert border after ruled lines (or after background if no ruled lines)
          const insertAfterIndex = bgRect ? layer.getChildren().indexOf(bgRect) + 1 + ruledLinesNodes.length : layer.getChildren().length;
          const borderRectIndex = layer.getChildren().indexOf(borderRect);
          if (borderRectIndex !== -1 && borderRectIndex !== insertAfterIndex) {
            layer.getChildren().splice(borderRectIndex, 1);
            layer.getChildren().splice(insertAfterIndex, 0, borderRect);
          }
          nodesAdded++;
        }
      } catch (error) {
        // Fallback to Rect if rough.js fails
        const borderRect = new Konva.Rect({
          x: x,
          y: y,
          width: width,
          height: borderHeight,
          fill: 'transparent',
          stroke: borderColor,
          strokeWidth: borderWidth,
          opacity: borderOpacity * opacity,
          cornerRadius: cornerRadius,
          rotation: rotation,
          listening: false,
          visible: true
        });
        layer.add(borderRect);
        
        // Insert border after ruled lines (or after background if no ruled lines)
        const insertAfterIndex = bgRect ? layer.getChildren().indexOf(bgRect) + 1 + ruledLinesNodes.length : layer.getChildren().length;
        const borderRectIndex = layer.getChildren().indexOf(borderRect);
        if (borderRectIndex !== -1 && borderRectIndex !== insertAfterIndex) {
          layer.getChildren().splice(borderRectIndex, 1);
          layer.getChildren().splice(insertAfterIndex, 0, borderRect);
        }
        nodesAdded++;
      }
    } else {
      // Default: simple rect border
      const borderRect = new Konva.Rect({
        x: x,
        y: y,
        width: width,
        height: borderHeight,
        fill: 'transparent',
        stroke: borderColor,
        strokeWidth: borderWidth,
        opacity: borderOpacity * opacity,
        cornerRadius: cornerRadius,
        rotation: rotation,
        listening: false,
        visible: true
      });
      
      layer.add(borderRect);
      
      // Insert border after ruled lines (or after background if no ruled lines)
      const insertAfterIndex = bgRect ? layer.getChildren().indexOf(bgRect) + 1 + ruledLinesNodes.length : layer.getChildren().length;
      const borderRectIndex = layer.getChildren().indexOf(borderRect);
      if (borderRectIndex !== -1 && borderRectIndex !== insertAfterIndex) {
        layer.getChildren().splice(borderRectIndex, 1);
        layer.getChildren().splice(insertAfterIndex, 0, borderRect);
      }
      
      // Fallback: if no background, insert after page background
      if (!bgRect) {
        // No background, so insert border after page background nodes
        const stage = layer.getStage();
        const stageWidth = stage ? stage.width() : 0;
        const stageHeight = stage ? stage.height() : 0;
        let lastPageBgIndex = -1;
        layer.getChildren().forEach((node, idx) => {
          if (node === borderRect) return;
          if (node.getClassName() !== 'Rect' && node.getClassName() !== 'Image') return;
          const nodeX = node.x ? node.x() : 0;
          const nodeY = node.y ? node.y() : 0;
          const nodeWidth = node.width ? node.width() : 0;
          const nodeHeight = node.height ? node.height() : 0;
          if (nodeX === 0 && nodeY === 0 && nodeWidth === stageWidth && nodeHeight === stageHeight) {
            lastPageBgIndex = Math.max(lastPageBgIndex, idx);
          }
        });
      if (lastPageBgIndex !== -1) {
        const borderRectIndex = layer.getChildren().indexOf(borderRect);
        if (borderRectIndex !== -1 && borderRectIndex !== lastPageBgIndex + 1) {
          layer.getChildren().splice(borderRectIndex, 1);
          layer.getChildren().splice(lastPageBgIndex + 1, 0, borderRect);
        }
      }
    }
    
    nodesAdded++;
  }
  
  // Render ruled lines if enabled (after background, before border and text)
  const ruledLines = element.ruledLines ?? false;
  const ruledLinesNodes = [];
  
  // Debug logging for ruled lines
  console.log('renderQnA ruled lines check:', {
    id: element.id,
    ruledLines: ruledLines,
    layoutVariant: layoutVariant,
    hasLinePositions: !!layout.linePositions,
    linePositionsCount: layout.linePositions ? layout.linePositions.length : 0,
    linePositions: layout.linePositions,
    height: height,
    width: width
  });
  
  if (ruledLines && layout.linePositions && layout.linePositions.length > 0) {
    const ruledLinesWidth = element.ruledLinesWidth ?? 0.8;
    const ruledLinesTheme = element.ruledLinesTheme || 'rough';
    const ruledLinesColor = element.ruledLinesColor || '#1f2937';
    const ruledLinesOpacity = element.ruledLinesOpacity ?? 1;
    
    layout.linePositions.forEach((linePos) => {
      let lineStartX, lineEndX;
      
      // For block layout, only render lines within the target area
      if (layoutVariant === 'block' && layout.questionArea && layout.answerArea) {
        const targetArea = ruledLinesTarget === 'question' ? layout.questionArea : layout.answerArea;
        
        // Check if line is within the target area (vertically)
        // Since linePositions are already filtered by ruledLinesTarget in createBlockLayout,
        // we just need to check if the line is within the target area bounds
        if (linePos.y >= targetArea.y && linePos.y <= targetArea.y + targetArea.height) {
          // Use the target area's x position and width, not the full width
          // This ensures lines are only drawn within the question or answer block
          lineStartX = x + targetArea.x;
          lineEndX = x + targetArea.x + targetArea.width;
        } else {
          // Skip this line if it's not in the target area
          return;
        }
      } else {
        // For inline layout, use full width with padding
        // Only generate lines that are within the box dimensions (0 <= y <= height)
        // linePos.y is relative to element top (0 = top of element)
        // Match client-side logic: if (linePos.y >= 0 && linePos.y <= boxHeight)
        if (linePos.y < 0 || linePos.y > height) {
          console.log('renderQnA skipping ruled line (out of bounds):', {
            linePosY: linePos.y,
            height: height,
            condition: linePos.y < 0 || linePos.y > height
          });
          return;
        }
        lineStartX = x + padding;
        lineEndX = x + width - padding;
        
        console.log('renderQnA rendering ruled line (inline):', {
          linePosY: linePos.y,
          height: height,
          lineStartX: lineStartX,
          lineEndX: lineEndX,
          x: x,
          y: y,
          padding: padding,
          absoluteY: y + linePos.y
        });
      }
      
      // Generate ruled line
      let lineNode = null;
      if (ruledLinesTheme === 'rough' && roughInstance) {
        try {
          const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          const rc = roughInstance.svg(svg);
          
          const roughLine = rc.line(lineStartX, y + linePos.y, lineEndX, y + linePos.y, {
            roughness: 2,
            strokeWidth: ruledLinesWidth,
            stroke: ruledLinesColor,
            seed: seed + linePos.y
          });
          
          const paths = roughLine.querySelectorAll('path');
          let combinedPath = '';
          paths.forEach(path => {
            const d = path.getAttribute('d');
            if (d) combinedPath += d + ' ';
          });
          
          if (combinedPath) {
            lineNode = new Konva.Path({
              data: combinedPath.trim(),
              stroke: ruledLinesColor,
              strokeWidth: ruledLinesWidth,
              opacity: ruledLinesOpacity * opacity,
              strokeScaleEnabled: true,
              listening: false,
              visible: true
            });
          }
        } catch (err) {
          // Fallback to simple line if rough.js fails
          lineNode = new Konva.Line({
            points: [lineStartX, y + linePos.y, lineEndX, y + linePos.y],
            stroke: ruledLinesColor,
            strokeWidth: ruledLinesWidth,
            opacity: ruledLinesOpacity * opacity,
            listening: false,
            visible: true
          });
        }
      } else {
        // Default: simple line
        lineNode = new Konva.Line({
          points: [lineStartX, y + linePos.y, lineEndX, y + linePos.y],
          stroke: ruledLinesColor,
          strokeWidth: ruledLinesWidth,
          opacity: ruledLinesOpacity * opacity,
          listening: false,
          visible: true
        });
      }
      
      if (lineNode) {
        ruledLinesNodes.push(lineNode);
        nodesAdded++;
      }
    });
    
    // Insert all ruled lines after background
    if (ruledLinesNodes.length > 0) {
      const insertIndex = bgRect ? layer.getChildren().indexOf(bgRect) + 1 : layer.getChildren().length;
      ruledLinesNodes.forEach((lineNode, idx) => {
        layer.add(lineNode);
        const currentIndex = layer.getChildren().indexOf(lineNode);
        if (currentIndex !== insertIndex + idx) {
          layer.getChildren().splice(currentIndex, 1);
          layer.getChildren().splice(insertIndex + idx, 0, lineNode);
        }
      });
    }
  }
  
  // Render text runs
  layout.runs.forEach((run) => {
    const style = run.style;
    // Match client-side: fontFamily.replace(/^['"]|['"]$/g, '').replace(/['"]/g, '')
    let fontFamilyRaw = style.fontFamily || 'Arial, sans-serif';
    const fontFamily = fontFamilyRaw.replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
    
    // Konva uses separate fontStyle and fontWeight attributes
    // fontStyle: 'normal' or 'italic'
    // fontWeight: 'normal' or 'bold'
    const fontStyle = style.fontItalic ? 'italic' : 'normal';
    const fontWeight = style.fontBold ? 'bold' : 'normal';
    
    // Convert baseline Y position to top Y position for Konva.Text
    // Client uses textBaseline = 'alphabetic' with baseline Y position
    // Server uses verticalAlign = 'top', so we need to subtract baseline offset
    const baselineOffset = style.fontSize * 0.8;
    const topY = run.y - baselineOffset;
    
    const textNode = new Konva.Text({
      x: x + run.x,
      y: y + topY,
      text: run.text,
      fontSize: style.fontSize || 16,
      fontFamily: fontFamily,
      fontStyle: fontStyle,
      fontWeight: fontWeight,
      fill: style.fontColor || '#000000',
      opacity: (style.fontOpacity !== undefined ? style.fontOpacity : 1) * opacity,
      align: style.align || 'left',
      verticalAlign: 'top',
      listening: false,
      visible: true
    });
    
    layer.add(textNode);
    nodesAdded++;
  });
  
  return nodesAdded;
}

module.exports = {
  renderQnA
};

