/**
 * QnA rendering function for PDF export
 * This handles the standard QnA textbox (not inline)
 */

const { getGlobalThemeDefaults, deepMerge, getThemeRenderer } = require('./utils/theme-server');
const { applyStrokeOpacity } = require('../utils/color-utils');
const { buildFont, getLineHeight, measureText, calculateTextX, wrapText, getBaselineOffset, resolveFontFamily } = require('../utils/text-layout.server');
const { createLayout, createBlockLayout } = require('../utils/qna-layout.server');

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
  const themeDefaults = getGlobalThemeDefaultsFunc(activeTheme, 'qna', existingElement, undefined, undefined, undefined, undefined, themesData, colorPalettes);
  
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

// Text layout functions and layout functions are now imported from shared/utils/
// buildFont, getLineHeight, measureText, wrapText, calculateTextX, createLayout, createBlockLayout are imported above

// Layout functions are now imported from shared/utils/qna-layout.server.js
// The local implementations below have been removed in favor of shared versions

// Removed: createBlockLayout - now imported from shared/utils/qna-layout.server.js
// Removed: createLayout - now imported from shared/utils/qna-layout.server.js

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
 * @param {number} zOrderIndex - Z-order index for this element (optional)
 * @returns {number} Number of nodes added
 */
function renderQnA(layer, element, pageData, bookData, x, y, width, height, rotation, opacity, konvaInstance, document, roughInstance, themesData, colorPalettes, zOrderIndex) {
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
  
  // Get answer text - for QnA elements, use answerText field set during PDF export data loading
  let answerText = '';
  if (element.textType === 'qna') {
    // For QnA elements in PDF export, answerText is set during data loading
    answerText = element.answerText || element.formattedAnswerText || '';
  } else {
    // Fallback for legacy elements
    answerText = element.text || element.formattedText || '';
  }

  if (answerText && answerText.includes('<')) {
    answerText = extractPlainText(answerText, document);
  }
  // Match client-side: const sanitizedAnswer = answerText ? stripHtml(answerText) : '';
  // const answerContent = sanitizedAnswer || 'Antwort hinzufügen...';
  const sanitizedAnswer = answerText || '';
  const answerContent = sanitizedAnswer || 'Antwort hinzufügen...';
  
  // Get tool defaults using theme system
  // CRITICAL: Use element.theme if present (set during loadBook for pages that inherit book theme)
  // This matches client-side logic in textbox-qna.tsx line 988-992
  const elementTheme = element.theme;
  const pageTheme = elementTheme || pageData.theme || pageData.templateId;
  const bookTheme = elementTheme || bookData.theme || bookData.templateId;
  
  const toolDefaults = getToolDefaults(
    'qna',
    pageTheme,
    bookTheme,
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
  // IMPORTANT: Match client-side logic exactly - use questionAnswerGap directly, no Horizontal/Vertical variants
  // Client uses: const questionAnswerGap = qnaElement.questionAnswerGap ?? 0;
  const questionAnswerGap = element.questionAnswerGap ?? 0;
  
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
  
  // Debug: Log first few runs to verify they exist
  if (layout.runs && layout.runs.length > 0) {
    console.log('[SERVER render-qna] Layout has runs:', layout.runs.length);
    layout.runs.slice(0, 3).forEach((run, idx) => {
      console.log(`[SERVER render-qna] Run ${idx}:`, {
        text: run.text ? run.text.substring(0, 30) : '(empty)',
        x: run.x,
        y: run.y,
        fontSize: run.style?.fontSize,
        fontFamily: run.style?.fontFamily
      });
    });
  } else {
    console.log('[SERVER render-qna] WARNING: layout.runs is empty or undefined!');
  }
  
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
      opacity: backgroundOpacity,
      cornerRadius: cornerRadius,
      listening: false,
      visible: true
    });
    
    layer.add(bgRect);
    bgRect.zIndex(0);
    // Set z-index attributes for proper sorting
    if (zOrderIndex !== undefined) {
      bgRect.setAttr('__zOrderIndex', zOrderIndex);
    }
    bgRect.setAttr('__elementId', element.id);
    bgRect.setAttr('__nodeType', 'qna-background');
    bgRect.setAttr('__isQnaNode', true);
    
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
    const borderOpacity = element.borderOpacity ?? element.border?.opacity ?? element.opacity ?? 1;
    const cornerRadius = element.cornerRadius ?? toolDefaults.cornerRadius ?? 0;
    const borderThemeRaw = element.borderTheme || 
                       (element.questionSettings && element.questionSettings.borderTheme) || 
                       (element.answerSettings && element.answerSettings.borderTheme) || 
                       'default';
    // Map 'sketchy' to 'rough' if needed, or use as-is if valid Theme
    const borderTheme = (borderThemeRaw === 'sketchy' ? 'rough' : borderThemeRaw);
    
    // Use layout.contentHeight for border (matches text height)
    const borderHeight = layout.contentHeight || height;
    
    // Render border with theme support using getThemeRenderer (matching PDFRenderer component)
    // Pass roughInstance to getThemeRenderer to ensure it uses the correct instance
    const themeRenderer = getThemeRenderer(borderTheme, roughInstance);
    if (themeRenderer) {
      try {
        // Create a temporary element-like object for generatePath
        // Set roughness to 8 for 'rough' theme to match client-side rendering
        const borderElement = {
          type: 'rect',
          id: element.id + '-border',
          x: 0,
          y: 0,
          width: width,
          height: borderHeight,
          cornerRadius: cornerRadius,
          stroke: borderColor,
          strokeWidth: borderWidth, // Use raw borderWidth value, not adjusted
          fill: 'transparent',
          roughness: borderTheme === 'rough' ? 8 : (borderTheme === 'sketchy' ? 2 : 1),
          theme: borderTheme
        };
        
        const pathData = themeRenderer.generatePath(borderElement);
        console.log('[renderQnA] Border path data:', {
          elementId: element.id,
          hasPathData: !!pathData,
          pathDataLength: pathData ? pathData.length : 0,
          pathDataPreview: pathData ? pathData.substring(0, 100) : null
        });
        
        // Get stroke props from theme renderer (important for candy theme which uses fill instead of stroke)
        const strokeProps = themeRenderer.getStrokeProps(borderElement);
        
        if (pathData) {
          // Use strokeWidth from strokeProps (converted by getStrokeProps)
          const pathStrokeWidth = strokeProps.strokeWidth || borderWidth;

          // Apply border opacity to stroke color for Path elements (Konva Path may not respect opacity property)
          const finalBorderColor = applyStrokeOpacity(strokeProps.stroke || borderColor, borderOpacity);

          const borderPath = new Konva.Path({
            x: x,
            y: y,
            data: pathData,
            stroke: finalBorderColor,
            strokeWidth: pathStrokeWidth,
            fill: strokeProps.fill !== undefined ? strokeProps.fill : 'transparent',
            opacity: 1, // Opacity applied to stroke color instead
            strokeScaleEnabled: true,
            rotation: rotation,
            listening: false,
            lineCap: strokeProps.lineCap || 'round',
            lineJoin: strokeProps.lineJoin || 'round',
            visible: true
          });
          // Set z-index attributes for proper sorting
          if (zOrderIndex !== undefined) {
            borderPath.setAttr('__zOrderIndex', zOrderIndex);
          }
          borderPath.setAttr('__elementId', element.id);
          borderPath.setAttr('__nodeType', 'qna-border');
          borderPath.setAttr('__isQnaNode', true);
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
          // Apply border opacity to stroke color for consistency
          const finalBorderColor = applyStrokeOpacity(borderColor, borderOpacity);
          const borderRect = new Konva.Rect({
            x: x,
            y: y,
            width: width,
            height: borderHeight,
            fill: 'transparent',
            stroke: finalBorderColor,
            strokeWidth: borderWidth,
            opacity: 1, // Opacity applied to stroke color instead
            cornerRadius: cornerRadius,
            rotation: rotation,
            listening: false,
            visible: true
          });
          // Set z-index attributes for proper sorting
          if (zOrderIndex !== undefined) {
            borderRect.setAttr('__zOrderIndex', zOrderIndex);
          }
          borderRect.setAttr('__elementId', element.id);
          borderRect.setAttr('__nodeType', 'qna-border');
          borderRect.setAttr('__isQnaNode', true);
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
        // Fallback to Rect if theme renderer fails
        // Apply border opacity to stroke color for consistency
        const finalBorderColor = applyStrokeOpacity(borderColor, borderOpacity);
        const borderRect = new Konva.Rect({
          x: x,
          y: y,
          width: width,
          height: borderHeight,
          fill: 'transparent',
          stroke: finalBorderColor,
          strokeWidth: borderWidth,
          opacity: 1, // Opacity applied to stroke color instead
          cornerRadius: cornerRadius,
          rotation: rotation,
          listening: false,
          visible: true
        });
        // Set z-index attributes for proper sorting
        // Use same zOrderIndex as other body parts - internal order determined by nodeTypeOrder
        if (zOrderIndex !== undefined) {
          borderRect.setAttr('__zOrderIndex', zOrderIndex);
        }
        borderRect.setAttr('__elementId', element.id);
        borderRect.setAttr('__nodeType', 'qna-border');
        borderRect.setAttr('__isQnaNode', true);
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
      // Apply border opacity to stroke color for consistency
      const finalBorderColor = applyStrokeOpacity(borderColor, borderOpacity);
      const borderRect = new Konva.Rect({
        x: x,
        y: y,
        width: width,
        height: borderHeight,
        fill: 'transparent',
        stroke: finalBorderColor,
        strokeWidth: borderWidth,
        opacity: 1, // Opacity applied to stroke color instead
        cornerRadius: cornerRadius,
        rotation: rotation,
        listening: false,
        visible: true
      });

      // Set z-index attributes for proper sorting
      // Use same zOrderIndex as other body parts - internal order determined by nodeTypeOrder
      if (zOrderIndex !== undefined) {
        borderRect.setAttr('__zOrderIndex', zOrderIndex);
      }
      borderRect.setAttr('__elementId', element.id);
      borderRect.setAttr('__nodeType', 'qna-border');
      borderRect.setAttr('__isQnaNode', true);

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
  
  // Debug logging for ruled lines - ALWAYS log
  console.log('[DEBUG renderQnA] ⚠️ RULED LINES CHECK:', {
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
              opacity: ruledLinesOpacity,
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
        // Set z-index attributes for proper sorting
        if (zOrderIndex !== undefined) {
          lineNode.setAttr('__zOrderIndex', zOrderIndex);
        }
        lineNode.setAttr('__elementId', element.id);
        lineNode.setAttr('__nodeType', 'qna-line');
        lineNode.setAttr('__isQnaNode', true);
        ruledLinesNodes.push(lineNode);
        nodesAdded++;
      }
    });
    
    // Generate additional ruled lines to fill the rest of the textbox (matching client-side logic)
    // This only applies to answer lines (ruledLinesTarget === 'answer')
    console.log('[renderQnA] Checking for additional ruled lines:', {
      elementId: element.id,
      ruledLinesTarget: ruledLinesTarget,
      hasLinePositions: !!layout.linePositions,
      linePositionsLength: layout.linePositions ? layout.linePositions.length : 0,
      conditionMet: ruledLinesTarget === 'answer' && layout.linePositions && layout.linePositions.length > 0
    });
    
    if (ruledLinesTarget === 'answer' && layout.linePositions && layout.linePositions.length > 0) {
      console.log('[renderQnA] Generating additional ruled lines for answer area', {
        elementId: element.id,
        totalLinePositions: layout.linePositions.length
      });
      // Filter line positions by target (answer)
      // For block layout, linePositions are already filtered by ruledLinesTarget in createBlockLayout
      // For inline layout, we need to filter by style properties
      const targetLinePositions = layout.linePositions.filter((linePos) => {
        if (!linePos.style) return false;
        // For block layout, all linePositions are already answer lines (filtered in createBlockLayout)
        if (layoutVariant === 'block') {
          return true; // All linePositions in block layout with ruledLinesTarget='answer' are answer lines
        }
        // For inline layout, compare style properties to identify answer lines
        // Use fontSize as primary identifier (most reliable)
        const styleMatches = linePos.style.fontSize === answerStyle.fontSize;
        // Also check fontFamily if available
        const familyMatches = !linePos.style.fontFamily || !answerStyle.fontFamily || 
                             linePos.style.fontFamily === answerStyle.fontFamily;
        return styleMatches && familyMatches;
      });
      
      console.log('[renderQnA] Filtered target line positions:', {
        elementId: element.id,
        targetLinePositionsCount: targetLinePositions.length,
        lastLinePosition: targetLinePositions.length > 0 ? targetLinePositions[targetLinePositions.length - 1] : null
      });
      
      if (targetLinePositions.length > 0) {
        const answerLineHeight = getLineHeight(answerStyle);
        const lastLinePosition = targetLinePositions[targetLinePositions.length - 1];
        let nextLineY = lastLinePosition.y + lastLinePosition.lineHeight;
        
        console.log('[renderQnA] Starting additional lines generation:', {
          elementId: element.id,
          lastLineY: lastLinePosition.y,
          lastLineHeight: lastLinePosition.lineHeight,
          nextLineY: nextLineY,
          answerLineHeight: answerLineHeight
        });
        
        // Determine start and end X positions and bottom Y (all relative to element)
        let relativeStartX, relativeEndX, relativeBottomY;
        
        if (layoutVariant === 'block' && layout.answerArea) {
          relativeStartX = layout.answerArea.x;
          relativeEndX = layout.answerArea.x + layout.answerArea.width;
          relativeBottomY = layout.answerArea.y + layout.answerArea.height;
        } else {
          // Inline layout
          relativeStartX = padding;
          relativeEndX = width - padding;
          relativeBottomY = height - padding;
        }
        
        // Generate additional lines until we reach the bottom
        // nextLineY is relative to element (0 = top of element)
        let additionalLinesGenerated = 0;
        console.log('[renderQnA] Generating additional lines loop:', {
          elementId: element.id,
          nextLineY: nextLineY,
          relativeBottomY: relativeBottomY,
          relativeStartX: relativeStartX,
          relativeEndX: relativeEndX,
          condition: nextLineY <= relativeBottomY
        });
        
        while (nextLineY <= relativeBottomY) {
          // Generate ruled line
          // Convert relative coordinates to absolute for rendering
          const absoluteStartX = x + relativeStartX;
          const absoluteEndX = x + relativeEndX;
          const absoluteLineY = y + nextLineY;
          
          let lineNode = null;
          if (ruledLinesTheme === 'rough' && roughInstance) {
            try {
              const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              const rc = roughInstance.svg(svg);
              
              const roughLine = rc.line(absoluteStartX, absoluteLineY, absoluteEndX, absoluteLineY, {
                roughness: 2,
                strokeWidth: ruledLinesWidth,
                stroke: ruledLinesColor,
                seed: seed + nextLineY
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
                  opacity: ruledLinesOpacity,
                  strokeScaleEnabled: true,
                  listening: false,
                  visible: true
                });
              }
            } catch (err) {
              // Fallback to simple line if rough.js fails
              lineNode = new Konva.Line({
                points: [absoluteStartX, absoluteLineY, absoluteEndX, absoluteLineY],
                stroke: ruledLinesColor,
                strokeWidth: ruledLinesWidth,
                opacity: ruledLinesOpacity,
                listening: false,
                visible: true
              });
            }
          } else {
            // Default: simple line
            lineNode = new Konva.Line({
              points: [absoluteStartX, absoluteLineY, absoluteEndX, absoluteLineY],
              stroke: ruledLinesColor,
              strokeWidth: ruledLinesWidth,
              opacity: ruledLinesOpacity,
              listening: false,
              visible: true
            });
          }
          
          if (lineNode) {
            // Set z-index attributes for proper sorting
            console.log('[renderQnA] Setting attributes for ruled line node:', element.id, 'zOrderIndex:', zOrderIndex);
            if (zOrderIndex !== undefined) {
              lineNode.setAttr('__zOrderIndex', zOrderIndex);
            }
            lineNode.setAttr('__elementId', element.id);
            lineNode.setAttr('__nodeType', 'qna-line');
            lineNode.setAttr('__isQnaNode', true);
            console.log('[renderQnA] Ruled line node attributes set:', {
              __elementId: lineNode.getAttr('__elementId'),
              __nodeType: lineNode.getAttr('__nodeType'),
              __isQnaNode: lineNode.getAttr('__isQnaNode'),
              __zOrderIndex: lineNode.getAttr('__zOrderIndex')
            });
            ruledLinesNodes.push(lineNode);
            nodesAdded++;
            additionalLinesGenerated++;
          }
          
          nextLineY += answerLineHeight;
        }
        
        console.log('[renderQnA] Generated additional ruled lines:', {
          elementId: element.id,
          additionalLinesGenerated: additionalLinesGenerated,
          totalRuledLinesNodes: ruledLinesNodes.length
        });
      } else {
        console.log('[renderQnA] No target line positions found for additional lines', {
          elementId: element.id,
          totalLinePositions: layout.linePositions.length
        });
      }
    } else {
      console.log('[renderQnA] Additional ruled lines condition not met', {
        elementId: element.id,
        ruledLinesTarget: ruledLinesTarget,
        hasLinePositions: !!layout.linePositions,
        linePositionsLength: layout.linePositions ? layout.linePositions.length : 0
      });
    }
    
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
  
  // Create canvas context for precise baseline offset calculation
  // This ensures consistent text positioning between client and server
  const canvas = typeof document !== 'undefined' 
    ? document.createElement('canvas')
    : require('canvas').createCanvas(1, 1);
  const ctx = canvas.getContext('2d');
  
  // Render text runs using a single Konva.Shape (matching client-side RichTextShape behavior)
  // IMPORTANT: Client uses a SINGLE Shape for ALL runs, not one Shape per run
  // The Shape is positioned at (x, y), then all runs are drawn within it
  if (layout.runs && layout.runs.length > 0) {
    const { buildFont } = require('../utils/text-layout.server');
    
    const textShape = new Konva.Shape({
      x: x,
      y: y,
      sceneFunc: (ctx, shape) => {
        ctx.save();
        // Use 'alphabetic' baseline for proper text alignment (matching client)
        ctx.textBaseline = 'alphabetic';
        // Draw all runs within this single shape (like client-side RichTextShape)
        layout.runs.forEach((run) => {
          const style = run.style;
          // Build font string with bold/italic support (like client)
          const fontString = buildFont(style);
          const fontColor = style.fontColor || '#000000';
          const fontOpacity = style.fontOpacity !== undefined ? style.fontOpacity : 1;
          
          ctx.font = fontString;
          ctx.fillStyle = fontColor;
          ctx.globalAlpha = fontOpacity;
          // Y position is already the baseline position (from sharedCreateLayout)
          ctx.fillText(run.text || '', run.x, run.y);
        });
        ctx.restore();
        ctx.fillStrokeShape(shape);
      },
      width: width,
      height: height,
      rotation: rotation,
      listening: false,
      visible: true
    });

    // Set z-index attributes for proper sorting
    if (zOrderIndex !== undefined) {
      textShape.setAttr('__zOrderIndex', zOrderIndex);
    }
    textShape.setAttr('__elementId', element.id);
    textShape.setAttr('__nodeType', 'qna-text');
    textShape.setAttr('__isQnaNode', true);

    layer.add(textShape);
    nodesAdded++;
  }
  
  return nodesAdded;
}
}

module.exports = {
  renderQnA
};

