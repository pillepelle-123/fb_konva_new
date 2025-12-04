/**
 * QnA rendering function for PDF export
 * This handles the standard QnA textbox (not inline)
 */

const { getGlobalThemeDefaults, deepMerge } = require('./utils/theme-utils');

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
  const { questionText, answerText, questionStyle, answerStyle, width, height, padding, ctx, layoutVariant = 'inline', questionPosition = 'left', questionWidth = 40, ruledLinesTarget = 'answer', blockQuestionAnswerGap = 10 } = params;
  
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
  
  let cursorY = padding;
  const questionLines = wrapText(questionText, questionStyle, availableWidth, ctx);

  questionLines.forEach((line) => {
    if (line.text) {
      const baselineY = cursorY + questionBaselineOffset;
      const textX = calculateTextX(line.text, questionStyle, padding, availableWidth, ctx);
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
      linePositions.push({
        y: baselineY + questionStyle.fontSize * 0.15,
        lineHeight: questionLineHeight,
        style: questionStyle
      });
    }
    cursorY += questionLineHeight;
  });

  const lastQuestionLineWidth = questionLines.length ? questionLines[questionLines.length - 1].width : 0;
  const lastQuestionLineY = questionLines.length ? cursorY - questionLineHeight : padding;

  const answerLines = wrapText(answerText, answerStyle, availableWidth, ctx);
  const inlineGap = Math.min(32, answerStyle.fontSize * 0.5);
  let contentHeight = cursorY;

  let startAtSameLine = false;
  let remainingAnswerLines = answerLines;

  if (questionLines.length > 0 && answerLines.length > 0) {
    const inlineAvailable = availableWidth - lastQuestionLineWidth - inlineGap;
    if (inlineAvailable > measureText(answerLines[0].text, answerStyle, ctx)) {
      startAtSameLine = true;
      const baselineY = lastQuestionLineY + answerBaselineOffset;
      runs.push({
        text: answerLines[0].text,
        x: padding + lastQuestionLineWidth + inlineGap,
        y: baselineY,
        style: answerStyle
      });
      // Track line position for combined line
      linePositions.push({
        y: baselineY + answerStyle.fontSize * 0.15,
        lineHeight: Math.max(questionLineHeight, answerLineHeight),
        style: answerStyle
      });
      remainingAnswerLines = answerLines.slice(1);
    }
  }

  let answerCursorY = startAtSameLine ? cursorY : cursorY + (questionLines.length ? answerLineHeight * 0.2 : 0);

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
    blockQuestionAnswerGap: blockQuestionAnswerGap
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
    
    const borderRect = new Konva.Rect({
      x: x,
      y: y,
      width: width,
      height: height,
      fill: 'transparent',
      stroke: borderColor,
      strokeWidth: borderWidth,
      opacity: borderOpacity * opacity,
      cornerRadius: cornerRadius,
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
        // Only generate lines that are within the box dimensions
        if (linePos.y < 0 || linePos.y > height) {
          return;
        }
        lineStartX = x + padding;
        lineEndX = x + width - padding;
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

