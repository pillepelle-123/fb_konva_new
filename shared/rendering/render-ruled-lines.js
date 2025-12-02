/**
 * Ruled lines rendering function for PDF export
 */

/**
 * Get line height multiplier based on paragraph spacing
 */
function getLineHeightMultiplier(spacing) {
  switch (spacing) {
    case 'small': return 1.0;
    case 'medium': return 1.2;
    case 'large': return 1.5;
    default: return 1.0;
  }
}

/**
 * Render ruled lines for QnA inline textbox
 * @param {Object} layer - Konva layer
 * @param {Object} element - Element data
 * @param {string} questionText - Question text
 * @param {string} answerText - Answer text
 * @param {Object} questionSettings - Question settings
 * @param {Object} answerSettings - Answer settings
 * @param {number} padding - Padding value
 * @param {number} width - Element width
 * @param {number} height - Element height
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {Object} konvaInstance - Konva instance
 * @param {Object} document - Document object
 * @param {Object} roughInstance - Rough.js instance (optional)
 * @returns {number} Number of lines rendered
 */
function renderRuledLines(layer, element, questionText, answerText, questionSettings, answerSettings, padding, width, height, x, y, konvaInstance, document, roughInstance) {
  const Konva = konvaInstance;
  const rough = roughInstance;
  
  // Check if ruled lines are enabled
  // Ruled lines are now only on element level
  const isEnabled = element.ruledLines === true;
  
  if (!isEnabled) {
    return 0;
  }
  
  const layoutVariant = element.layoutVariant || 'inline';
  const answerFontSize = answerSettings.fontSize || 50;
  const questionFontSize = questionSettings.fontSize || 45;
  const paragraphSpacing = answerSettings.paragraphSpacing || element.paragraphSpacing || 'medium';
  const ruledLinesTheme = element.ruledLinesTheme || 'rough';
  const ruledLinesColor = element.ruledLinesColor || '#1f2937';
  const ruledLinesWidth = element.ruledLinesWidth || 1;
  const ruledLinesOpacity = element.ruledLinesOpacity ?? 0.6;
  
  const lines = [];
  const startX = x + padding;
  const endX = x + width - padding;
  
  if (layoutVariant === 'inline' && questionText && answerText) {
    // Inline layout: calculate lines based on question and answer text positioning
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const qFontFamily = questionSettings.fontFamily || 'Arial, sans-serif';
    const qFontSize = questionFontSize;
    const qFontWeight = questionSettings.fontBold ? 'bold' : 'normal';
    const qFontStyle = questionSettings.fontItalic ? 'italic' : 'normal';
    context.font = qFontWeight + ' ' + qFontStyle + ' ' + qFontSize + 'px ' + qFontFamily;
    
    const textWidth = width - (padding * 2);
    const questionWords = questionText.split(' ');
    let questionLineCount = 1;
    let currentLineWidth = 0;
    
    for (const word of questionWords) {
      const wordWidth = context.measureText(word + ' ').width;
      if (currentLineWidth + wordWidth > textWidth && currentLineWidth > 0) {
        questionLineCount++;
        currentLineWidth = wordWidth;
      } else {
        currentLineWidth += wordWidth;
      }
    }
    
    const qSpacing = questionSettings.paragraphSpacing || 'small';
    const aSpacing = paragraphSpacing;
    const maxFontSizeUsed = Math.max(qFontSize, answerFontSize);
    const effectivePadding = padding + (maxFontSizeUsed * 0.2);
    const combinedLineHeight = maxFontSizeUsed * Math.max(getLineHeightMultiplier(qSpacing), getLineHeightMultiplier(aSpacing));
    const aLineHeight = answerFontSize * getLineHeightMultiplier(aSpacing);
    
    // Text baseline offset calculation (matches client-side exactly)
    const maxLineHeightMultiplier = Math.max(getLineHeightMultiplier(qSpacing), getLineHeightMultiplier(aSpacing));
    const factor = answerFontSize >= 50 ? answerFontSize >= 96 ? answerFontSize >= 145 ? -0.07 : 0.01 : 0.07 : 0.1;
    const textBaselineOffset = -(maxFontSizeUsed * maxLineHeightMultiplier * 0.15) + (maxFontSizeUsed * factor);
    const answerBaselineOffset = -(answerFontSize * getLineHeightMultiplier(aSpacing) * 0.15) + (answerFontSize * factor);
    
    // Check if answer can fit on same line as last question line
    const lastQuestionLine = questionText.split(' ').reduce((acc, word) => {
      const testLine = acc ? acc + ' ' + word : word;
      const testWidth = context.measureText(testLine).width;
      if (testWidth > textWidth && acc) {
        return word;
      }
      return testLine;
    }, '');
    const lastQuestionLineWidth = context.measureText(lastQuestionLine).width;
    const gap = 40;
    const availableWidthAfterQuestion = textWidth - lastQuestionLineWidth - gap;
    
    // Check if first word of answer fits after last question line
    const aFontFamily = answerSettings.fontFamily || 'Arial, sans-serif';
    const aFontBold = answerSettings.fontBold ?? false;
    const aFontItalic = answerSettings.fontItalic ?? false;
    const answerContext = document.createElement('canvas').getContext('2d');
    answerContext.font = (aFontBold ? 'bold ' : '') + (aFontItalic ? 'italic ' : '') + answerFontSize + 'px ' + aFontFamily;
    const firstAnswerLine = answerText.split('\n')[0] || '';
    const firstAnswerWord = firstAnswerLine.split(' ')[0] || '';
    const canFitOnSameLine = firstAnswerWord && availableWidthAfterQuestion > 0 && answerContext.measureText(firstAnswerWord).width <= availableWidthAfterQuestion;
    
    // Calculate baseline for the combined line (last question line with answer)
    const combinedLineBaseline = effectivePadding + ((questionLineCount - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSizeUsed * 0.6);
    
    // Generate ruled lines for question lines (if answer starts on new line or question spans multiple lines)
    if (questionLineCount > 1 || !canFitOnSameLine) {
      const maxQuestionLineIndex = (questionLineCount > 1 && canFitOnSameLine) 
        ? questionLineCount - 1  // Skip last line if answer fits on same line
        : questionLineCount;     // Include all lines if answer starts on new line
      
      for (let questionLineIndex = 0; questionLineIndex < maxQuestionLineIndex; questionLineIndex++) {
        const questionLineBaseline = effectivePadding + (questionLineIndex * combinedLineHeight) + textBaselineOffset + (maxFontSizeUsed * 0.6);
        const baseline = questionLineBaseline + answerBaselineOffset + (answerFontSize * 0.6);
        const lineY = y + baseline + (answerFontSize * 0.15);
        
        if (isFinite(lineY) && !isNaN(lineY) && lineY < y + height - padding - 10) {
          // Render line with theme support
          if (ruledLinesTheme === 'rough' && rough) {
            try {
              const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              const rc = rough.svg(svg);
              const roughLine = rc.line(startX, lineY, endX, lineY, {
                roughness: 2,
                strokeWidth: ruledLinesWidth,
                stroke: ruledLinesColor,
                seed: seed + lineY
              });
              const paths = roughLine.querySelectorAll('path');
              let combinedPath = '';
              paths.forEach(path => {
                const d = path.getAttribute('d');
                if (d) combinedPath += d + ' ';
              });
              if (combinedPath) {
                const pathNode = new Konva.Path({
                  data: combinedPath.trim(),
                  stroke: ruledLinesColor,
                  strokeWidth: ruledLinesWidth,
                  opacity: ruledLinesOpacity,
                  strokeScaleEnabled: true,
                  listening: false
                });
                lines.push(pathNode);
              }
            } catch (error) {
              const line = new Konva.Line({
                points: [startX, lineY, endX, lineY],
                stroke: ruledLinesColor,
                strokeWidth: ruledLinesWidth,
                opacity: ruledLinesOpacity,
                listening: false
              });
              lines.push(line);
            }
          } else {
            const line = new Konva.Line({
              points: [startX, lineY, endX, lineY],
              stroke: ruledLinesColor,
              strokeWidth: ruledLinesWidth,
              opacity: ruledLinesOpacity,
              listening: false
            });
            lines.push(line);
          }
        }
      }
    }
    
    // Generate ruled lines for answer lines
    let answerLineIndex = 0;
    if (!canFitOnSameLine) {
      answerLineIndex = 1; // Start from next line after question
    }
    
    const dynamicHeight = height - padding - 10;
    const maxLines = 1000;
    let iterationCount = 0;
    
    if (aLineHeight > 0 && isFinite(aLineHeight) && !isNaN(aLineHeight)) {
      while (iterationCount < maxLines) {
        const answerBaseline = combinedLineBaseline + (answerLineIndex * aLineHeight) + answerBaselineOffset + (answerFontSize * 0.6);
        const lineY = y + answerBaseline + (answerFontSize * 0.15);
        
        if (!isFinite(lineY) || lineY === Infinity || isNaN(lineY)) break;
        if (lineY >= y + dynamicHeight) break;
        
        // Render line with theme support
        if (ruledLinesTheme === 'rough' && rough) {
          try {
            const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            const rc = rough.svg(svg);
            const roughLine = rc.line(startX, lineY, endX, lineY, {
              roughness: 2,
              strokeWidth: ruledLinesWidth,
              stroke: ruledLinesColor,
              seed: seed + lineY
            });
            const paths = roughLine.querySelectorAll('path');
            let combinedPath = '';
            paths.forEach(path => {
              const d = path.getAttribute('d');
              if (d) combinedPath += d + ' ';
            });
            if (combinedPath) {
              const pathNode = new Konva.Path({
                data: combinedPath.trim(),
                stroke: ruledLinesColor,
                strokeWidth: ruledLinesWidth,
                opacity: ruledLinesOpacity,
                strokeScaleEnabled: true,
                listening: false
              });
              lines.push(pathNode);
            }
          } catch (error) {
            const line = new Konva.Line({
              points: [startX, lineY, endX, lineY],
              stroke: ruledLinesColor,
              strokeWidth: ruledLinesWidth,
              opacity: ruledLinesOpacity,
              listening: false
            });
            lines.push(line);
          }
        } else {
          const line = new Konva.Line({
            points: [startX, lineY, endX, lineY],
            stroke: ruledLinesColor,
            strokeWidth: ruledLinesWidth,
            opacity: ruledLinesOpacity,
            listening: false
          });
          lines.push(line);
        }
        
        answerLineIndex++;
        iterationCount++;
      }
    }
  } else {
    // Block layout or single text: calculate lines based on answer area
    const aSpacing = paragraphSpacing;
    const lineHeightMultiplier = getLineHeightMultiplier(aSpacing);
    const combinedLineHeight = answerFontSize * lineHeightMultiplier;
    const textBaselineOffset = answerFontSize * 0.2;
    
    let answerStartY = y + padding;
    if (questionText && layoutVariant === 'block') {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const qFontFamily = questionSettings.fontFamily || 'Arial, sans-serif';
      const qFontSize = questionFontSize;
      const qFontWeight = questionSettings.fontBold ? 'bold' : 'normal';
      const qFontStyle = questionSettings.fontItalic ? 'italic' : 'normal';
      context.font = qFontWeight + ' ' + qFontStyle + ' ' + qFontSize + 'px ' + qFontFamily;
      
      const textWidth = width - (padding * 2);
      const questionWords = questionText.split(' ');
      let questionLineCount = 1;
      let currentLineWidth = 0;
      
      for (const word of questionWords) {
        const wordWidth = context.measureText(word + ' ').width;
        if (currentLineWidth + wordWidth > textWidth && currentLineWidth > 0) {
          questionLineCount++;
          currentLineWidth = wordWidth;
        } else {
          currentLineWidth += wordWidth;
        }
      }
      
      const questionHeight = questionLineCount * qFontSize * lineHeightMultiplier;
      answerStartY = y + padding + questionHeight + (padding / 2);
    }
    
    let lineY = answerStartY + textBaselineOffset + (answerFontSize * 0.8);
    const dynamicHeight = height - padding - 10;
    const maxLines = 1000;
    let iterationCount = 0;
    
    if (combinedLineHeight > 0) {
      while (lineY < dynamicHeight && iterationCount < maxLines) {
        if (!isFinite(lineY) || lineY === Infinity || isNaN(lineY)) break;
        if (lineY >= dynamicHeight) break;
        
        // Render line with theme support
        if (ruledLinesTheme === 'rough' && rough) {
          try {
            const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            const rc = rough.svg(svg);
            const roughLine = rc.line(startX, lineY, endX, lineY, {
              roughness: 2,
              strokeWidth: ruledLinesWidth,
              stroke: ruledLinesColor,
              seed: seed + lineY
            });
            const paths = roughLine.querySelectorAll('path');
            let combinedPath = '';
            paths.forEach(path => {
              const d = path.getAttribute('d');
              if (d) combinedPath += d + ' ';
            });
            if (combinedPath) {
              const pathNode = new Konva.Path({
                data: combinedPath.trim(),
                stroke: ruledLinesColor,
                strokeWidth: ruledLinesWidth,
                opacity: ruledLinesOpacity,
                strokeScaleEnabled: true,
                listening: false
              });
              lines.push(pathNode);
            }
          } catch (error) {
            // Fallback to regular line if rough fails
            const line = new Konva.Line({
              points: [startX, lineY, endX, lineY],
              stroke: ruledLinesColor,
              strokeWidth: ruledLinesWidth,
              opacity: ruledLinesOpacity,
              listening: false
            });
            lines.push(line);
          }
        } else {
          const line = new Konva.Line({
            points: [startX, lineY, endX, lineY],
            stroke: ruledLinesColor,
            strokeWidth: ruledLinesWidth,
            opacity: ruledLinesOpacity,
            listening: false
          });
          lines.push(line);
        }
        
        lineY += combinedLineHeight;
        iterationCount++;
      }
    }
  }
  
  // Add all lines to layer
  lines.forEach(line => layer.add(line));
  
  return lines.length;
}

module.exports = {
  renderRuledLines
};

