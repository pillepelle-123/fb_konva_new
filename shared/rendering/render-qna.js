/**
 * QnA rendering function for PDF export
 * This handles the standard QnA textbox (not inline)
 */

const { getGlobalThemeDefaults, deepMerge, getThemeRenderer } = require('./utils/theme-utils');
const { buildFont, getLineHeight, measureText, calculateTextX, wrapText } = require('../utils/text-layout.server');
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

