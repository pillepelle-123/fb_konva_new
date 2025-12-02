/**
 * QnA Inline rendering function for PDF export
 */

const { renderRuledLines } = require('./render-ruled-lines');
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
 * Get tool defaults for QnA inline
 */
function getToolDefaults(tool, pageTheme, bookTheme, existingElement, pageColorPaletteId, bookColorPaletteId, themesData, colorPalettes) {
  const TOOL_DEFAULTS_QNA_INLINE = {
    fontSize: 50,
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontColor: '#000000',
    align: 'left',
    paragraphSpacing: 'medium',
    ruledLines: false,
    ruledLinesTheme: 'rough',
    ruledLinesColor: '#1f2937',
    ruledLinesWidth: 1,
    cornerRadius: 0,
    borderWidth: 0,
    borderColor: '#000000',
    backgroundColor: 'transparent',
    padding: 4,
    questionSettings: {
      fontSize: 45,
      fontFamily: 'Arial, sans-serif',
      fontColor: '#666666',
      fontBold: false,
      fontItalic: false,
      fontOpacity: 1,
      align: 'left',
      paragraphSpacing: 'small',
      ruledLines: false,
      padding: 4,
      border: {
        borderColor: '#000000',
        enabled: false
      },
      background: {
        backgroundColor: 'transparent',
        enabled: false
      }
    },
    answerSettings: {
      fontSize: 50,
      fontFamily: 'Arial, sans-serif',
      fontColor: '#1f2937',
      fontBold: false,
      fontItalic: false,
      fontOpacity: 1,
      align: 'left',
      paragraphSpacing: 'medium',
      ruledLines: false,
      padding: 4,
      ruledLinesColor: '#1f2937',
      border: {
        borderColor: '#000000',
        enabled: false
      },
      background: {
        backgroundColor: 'transparent',
        enabled: false
      }
    }
  };
  
  if (tool !== 'qna_inline') {
    return TOOL_DEFAULTS_QNA_INLINE;
  }
  
  const baseDefaults = TOOL_DEFAULTS_QNA_INLINE;
  const activeTheme = pageTheme || bookTheme || 'default';
  // Use global function if available (browser context), otherwise fallback to local require (Node.js context)
  const getGlobalThemeDefaultsFunc = (typeof window !== 'undefined' && window.getGlobalThemeDefaults) ? window.getGlobalThemeDefaults : getGlobalThemeDefaults;
  // CRITICAL: Call the function, don't just assign it!
  const themeDefaults = getGlobalThemeDefaultsFunc(activeTheme, tool, existingElement, undefined, undefined, undefined, undefined, themesData, colorPalettes);
  
  // Deep merge theme defaults with base defaults
  // Use global function if available (browser context), otherwise fallback to local require (Node.js context)
  const deepMergeFunc = (typeof window !== 'undefined' && window.deepMerge) ? window.deepMerge : deepMerge;
  let mergedDefaults = deepMergeFunc(baseDefaults, themeDefaults);
  
  // Apply color palette (Page > Book hierarchy)
  const activePaletteId = pageColorPaletteId || bookColorPaletteId;
  if (activePaletteId && colorPalettes) {
    const activePalette = colorPalettes.find(p => p.id === activePaletteId);
    if (activePalette) {
      // Use global function if available (browser context), otherwise fallback to local require (Node.js context)
      const applyPaletteToElementFunc = (typeof window !== 'undefined' && window.applyPaletteToElement) ? window.applyPaletteToElement : (() => {
        try {
          const { applyPaletteToElement } = require('./utils/theme-utils');
          return applyPaletteToElement;
        } catch (e) {
          return () => ({});
        }
      })();
      const paletteUpdates = applyPaletteToElementFunc(activePalette, tool);
      mergedDefaults = deepMergeFunc(mergedDefaults, paletteUpdates);
    }
  }
  
  return mergedDefaults;
}

/**
 * Render QnA Inline textbox
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
function renderQnAInline(layer, element, pageData, bookData, x, y, width, height, rotation, opacity, konvaInstance, document, roughInstance, themesData, colorPalettes) {
  const Konva = konvaInstance;
  const rough = roughInstance;
  
  // Find question text
  let questionText = '';
  if (element.questionId) {
    const question = bookData.questions?.find(q => q.id === element.questionId);
    if (question) {
      questionText = question.text || question.question_text || '';
    }
  }
  
  const answerText = element.text || element.formattedText || '';
  const plainAnswerText = answerText ? extractPlainText(answerText, document) : '';
  
  // Get tool defaults using theme system
  const toolDefaults = getToolDefaults(
    'qna_inline',
    pageData.theme || pageData.templateId,
    bookData.theme || bookData.templateId,
    element,
    pageData.colorPaletteId,
    bookData.colorPaletteId,
    themesData,
    colorPalettes
  );
  
  // Merge element settings with tool defaults
  // Use spread operator EXACTLY like client-side: const questionStyle = { ...qnaInlineDefaults.questionSettings, ...element.questionSettings };
  const questionSettings = {
    ...(toolDefaults.questionSettings || {}),
    ...(element.questionSettings || {})
  };
  const answerSettings = {
    ...(toolDefaults.answerSettings || {}),
    ...(element.answerSettings || {})
  };
  
  // Match client-side: fontFamily is explicitly set after spread with fallback chain
  // Font properties are now only directly in questionSettings/answerSettings
  questionSettings.fontFamily = element.questionSettings?.fontFamily || toolDefaults.questionSettings?.fontFamily || questionSettings.fontFamily || 'Arial, sans-serif';
  answerSettings.fontFamily = element.answerSettings?.fontFamily || toolDefaults.answerSettings?.fontFamily || answerSettings.fontFamily || 'Arial, sans-serif';
  
  // Match client-side: align is also explicitly set after spread
  // Priority: element.align > element.format?.textAlign > questionSettings/answerSettings > default
  questionSettings.align = element.align || element.format?.textAlign || element.questionSettings?.align || toolDefaults.questionSettings?.align || questionSettings.align;
  answerSettings.align = element.align || element.format?.textAlign || element.answerSettings?.align || toolDefaults.answerSettings?.align || answerSettings.align;
  
  // CRITICAL: Use SIMPLE spread operator like client-side, NO complex nested object merging
  // Client-side uses: const questionStyle = { ...qnaInlineDefaults.questionSettings, ...element.questionSettings };
  // This means: if element.questionSettings has background/border with enabled: false, it OVERWRITES the defaults
  // The complex merging logic above was causing the mismatch!
  
  // When individualSettings is false, use answer font properties for question as well
  // Match client-side logic exactly: questionStyle.fontBold = answerStyle.fontBold ?? questionStyle.fontBold ?? false
  const individualSettings = element.qnaIndividualSettings ?? false;
  if (!individualSettings) {
    // Override question font properties with answer font properties
    // Use ?? to handle false values correctly (false || something would always return something)
    questionSettings.fontSize = answerSettings.fontSize ?? questionSettings.fontSize;
    questionSettings.fontFamily = answerSettings.fontFamily ?? questionSettings.fontFamily;
    questionSettings.fontBold = answerSettings.fontBold ?? questionSettings.fontBold ?? false;
    questionSettings.fontItalic = answerSettings.fontItalic ?? questionSettings.fontItalic ?? false;
    questionSettings.fontColor = answerSettings.fontColor ?? questionSettings.fontColor;
    questionSettings.fontOpacity = answerSettings.fontOpacity ?? questionSettings.fontOpacity ?? 1;
  }
  
  // Get question font properties
  // Font properties are now only directly in questionSettings/answerSettings
  // Match client-side logic exactly: questionStyle.fontBold ?? qnaInlineDefaults.questionSettings?.fontBold ?? false
  // Note: questionSettings already contains merged values from toolDefaults and element.questionSettings
  // After individualSettings override (if false), questionSettings.fontBold may be from answerSettings
  const qFontColor = questionSettings.fontColor || toolDefaults.questionSettings?.fontColor || '#000000';
  const qFontSize = questionSettings.fontSize || toolDefaults.questionSettings?.fontSize || 45;
  let qFontFamilyRaw = questionSettings.fontFamily || 'Arial, sans-serif';
  const qFontFamily = qFontFamilyRaw.replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
  
  // Use ?? operator to match client-side logic exactly
  // Client-side: questionStyle.fontBold ?? qnaInlineDefaults.questionSettings?.fontBold ?? false
  // questionSettings already has merged values from toolDefaults and element.questionSettings
  // After individualSettings override (if false), questionSettings.fontBold may be from answerSettings
  // So we just check if questionSettings.fontBold is undefined, then use toolDefaults
  const qFontBold = questionSettings.fontBold ?? toolDefaults.questionSettings?.fontBold ?? false;
  
  // Font properties are now only directly in questionSettings
  // Use ?? to handle false values correctly (false || something would always return something)
  const qFontItalic = questionSettings.fontItalic ?? toolDefaults.questionSettings?.fontItalic ?? false;
  const qFontStyle = qFontItalic ? 'italic' : 'normal';
  
  // Get answer font properties
  // Font properties are now only directly in answerSettings
  // Match client-side logic exactly: answerStyle.fontBold ?? qnaInlineDefaults.answerSettings?.fontBold ?? false
  const aFontColor = answerSettings.fontColor || toolDefaults.answerSettings?.fontColor || '#000000';
  const aFontSize = answerSettings.fontSize || toolDefaults.answerSettings?.fontSize || 50;
  let aFontFamilyRaw = answerSettings.fontFamily || 'Arial, sans-serif';
  const aFontFamily = aFontFamilyRaw.replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
  
  // Use ?? operator to match client-side logic exactly
  // Client-side: answerStyle.fontBold ?? qnaInlineDefaults.answerSettings?.fontBold ?? false
  // answerSettings already has merged values from toolDefaults and element.answerSettings
  const aFontBold = answerSettings.fontBold ?? toolDefaults.answerSettings?.fontBold ?? false;
  const aFontWeight = aFontBold ? 'bold' : 'normal';
  
  const aFontItalic = answerSettings.fontItalic ?? toolDefaults.answerSettings?.fontItalic ?? false;
  // Match client-side: fontStyle should include bold if aFontBold is true
  // Client-side: fontStyle={`${aFontBold ? 'bold' : ''} ${aFontItalic ? 'italic' : ''}`.trim() || 'normal'}
  const aFontStyle = aFontBold ? (aFontItalic ? 'bold italic' : 'bold') : (aFontItalic ? 'italic' : 'normal');
  
  // Get ruled lines settings
  // Ruled lines are now only on element level
  const ruledLinesEnabled = element.ruledLines === true;
  
  const layoutVariant = element.layoutVariant || 'inline';
  // Priority: element.padding > questionSettings/answerSettings > default
  const padding = element.padding || questionSettings.padding || answerSettings.padding || 4;
  
  
  let nodesAdded = 0;
  
  // Render background if enabled (before text so it appears behind)
  // Border/Background are shared properties - only check top-level element.backgroundEnabled
  // Fallback to questionSettings/answerSettings for backward compatibility with old data
  const showBackground = element.backgroundEnabled ?? (questionSettings.background?.enabled || answerSettings.background?.enabled) ?? false;
  
  // Debug: Log background rendering decision
  if (typeof console !== 'undefined' && console.log) {
    const debugInfo = {
      elementBackgroundEnabled: element.backgroundEnabled,
      questionBackgroundEnabled: questionSettings.background?.enabled,
      answerBackgroundEnabled: answerSettings.background?.enabled,
      showBackground: showBackground,
      backgroundColor: element.backgroundColor || questionSettings.background?.backgroundColor || answerSettings.background?.backgroundColor
    };
    console.log('DEBUG Background:', JSON.stringify(debugInfo, null, 2));
  }
  
  // Render background if showBackground is true (match client-side logic)
  // Client-side renders background even if backgroundColor is 'transparent' (as long as showBackground is true)
  let bgRect = null;
  if (showBackground) {
    // Priority: element (top-level) > questionSettings > answerSettings (fallback for old data)
    const backgroundColor = element.backgroundColor ||
                           questionSettings.background?.backgroundColor || 
                           answerSettings.background?.backgroundColor ||
                           questionSettings.backgroundColor ||
                           answerSettings.backgroundColor ||
                           'transparent';
    const backgroundOpacity = element.backgroundOpacity !== undefined ? element.backgroundOpacity :
                             (questionSettings.backgroundOpacity !== undefined ? questionSettings.backgroundOpacity : 
                             (answerSettings.backgroundOpacity !== undefined ? answerSettings.backgroundOpacity : 1));
    const cornerRadius = element.cornerRadius ?? toolDefaults.cornerRadius ?? 0;
    
    // Calculate dynamic height for background (match client-side calculateDynamicHeight logic)
    let dynamicHeight = height;
    if ((questionText && questionText.trim()) || (plainAnswerText && plainAnswerText.trim())) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      let totalLines = 0;
      const textWidth = width - (padding * 2);
      
      if (questionText && questionText.trim()) {
        context.font = (qFontBold ? 'bold ' : '') + (qFontStyle === 'italic' ? 'italic ' : '') + qFontSize + 'px ' + qFontFamily;
        const words = questionText.split(' ');
        let lines = 1;
        let currentWidth = 0;
        
        for (const word of words) {
          const wordWidth = context.measureText(word + ' ').width;
          if (currentWidth + wordWidth > textWidth && currentWidth > 0) {
            lines++;
            currentWidth = wordWidth;
          } else {
            currentWidth += wordWidth;
          }
        }
        totalLines += lines;
      }
      
      if (plainAnswerText && plainAnswerText.trim()) {
        context.font = (aFontBold ? 'bold ' : '') + (aFontStyle === 'italic' ? 'italic ' : '') + aFontSize + 'px ' + aFontFamily;
        const answerLines = plainAnswerText.split('\n');
        for (const line of answerLines) {
          if (!line.trim()) {
            totalLines++;
            continue;
          }
          const words = line.split(' ');
          let lineCount = 1;
          let currentWidth = 0;
          
          for (const word of words) {
            const wordWidth = context.measureText(word + ' ').width;
            if (currentWidth + wordWidth > textWidth && currentWidth > 0) {
              lineCount++;
              currentWidth = wordWidth;
            } else {
              currentWidth += wordWidth;
            }
          }
          totalLines += lineCount;
        }
      }
      
      // Match client-side: Math.max(totalLines * 70 + padding * 4, element.height)
      dynamicHeight = Math.max(totalLines * 70 + padding * 4, height);
    }
    
    bgRect = new Konva.Rect({
      x: x,
      y: y,
      width: width,
      height: dynamicHeight,
      fill: backgroundColor,
      opacity: backgroundOpacity,
      cornerRadius: cornerRadius,
      listening: false,
      visible: true
    });
    // Konva uses insertion order, not zIndex
    // Background must be added AFTER page background but BEFORE other element nodes
    // Since renderBackground is called first, page background nodes should already exist
    // But we need to ensure bgRect is inserted after ALL page background nodes
    // First add it, then move it to the correct position
    layer.add(bgRect);
    
    // Find all page background nodes (full canvas size at 0,0) and move bgRect after them
    const stage = layer.getStage();
    const stageWidth = stage ? stage.width() : 0;
    const stageHeight = stage ? stage.height() : 0;
    
    // Find all page background nodes
    let lastPageBgIndex = -1;
    layer.getChildren().forEach((node, idx) => {
      if (node === bgRect) return; // Skip self
      if (node.getClassName() !== 'Rect' && node.getClassName() !== 'Image') return;
      const nodeX = node.x ? node.x() : 0;
      const nodeY = node.y ? node.y() : 0;
      const nodeWidth = node.width ? node.width() : 0;
      const nodeHeight = node.height ? node.height() : 0;
      if (nodeX === 0 && nodeY === 0 && nodeWidth === stageWidth && nodeHeight === stageHeight) {
        lastPageBgIndex = Math.max(lastPageBgIndex, idx);
      }
    });
    
    // Move bgRect to position right after last page background node
    if (lastPageBgIndex !== -1) {
      const bgRectIndex = layer.getChildren().indexOf(bgRect);
      if (bgRectIndex !== -1 && bgRectIndex !== lastPageBgIndex + 1) {
        layer.getChildren().splice(bgRectIndex, 1);
        layer.getChildren().splice(lastPageBgIndex + 1, 0, bgRect);
      }
    }
    // If no page background found, bgRect is already at the end, which is fine
    nodesAdded++;
    
    // Debug: Verify background node was added
    if (typeof console !== 'undefined' && console.log) {
      const stage = layer.getStage();
      const stageWidth = stage ? stage.width() : 0;
      const stageHeight = stage ? stage.height() : 0;
      const bgRectIndex = layer.getChildren().indexOf(bgRect);
      const allChildren = layer.getChildren().map((node, idx) => ({
        idx: idx,
        className: node.getClassName(),
        x: node.x ? node.x() : 0,
        y: node.y ? node.y() : 0,
        width: node.width ? node.width() : 0,
        height: node.height ? node.height() : 0,
        fill: node.fill ? node.fill() : 'N/A',
        stroke: node.stroke ? node.stroke() : 'N/A',
        visible: node.visible(),
        opacity: node.opacity(),
        zIndex: node.zIndex()
      }));
      
      console.log('DEBUG Background Node Added:', JSON.stringify({
        className: bgRect.getClassName(),
        x: bgRect.x(),
        y: bgRect.y(),
        width: bgRect.width(),
        height: bgRect.height(),
        fill: bgRect.fill(),
        opacity: bgRect.opacity(),
        visible: bgRect.visible(),
        zIndex: bgRect.zIndex(),
        indexInLayer: bgRectIndex,
        stageSize: { width: stageWidth, height: stageHeight },
        layerChildrenCount: layer.getChildren().length,
        allChildren: allChildren
      }, null, 2));
    }
  }
  
  // Render border if enabled (BEFORE text so text appears on top)
  // Border/Background are shared properties - only check top-level element.borderEnabled
  // Fallback to questionSettings/answerSettings for backward compatibility with old data
  // Match client-side logic exactly: element.borderEnabled ?? (questionStyle.border?.enabled || answerStyle.border?.enabled) ?? false
  const showBorder = element.borderEnabled ?? (questionSettings.border?.enabled || answerSettings.border?.enabled) ?? false;
  
  // Debug: Log border rendering decision
  if (typeof console !== 'undefined' && console.log) {
    const debugInfo = {
      elementBorderEnabled: element.borderEnabled,
      questionBorderEnabled: questionSettings.border?.enabled,
      answerBorderEnabled: answerSettings.border?.enabled,
      showBorder: showBorder,
      borderWidth: element.borderWidth || questionSettings.borderWidth || answerSettings.borderWidth,
      borderColor: element.borderColor || questionSettings.border?.borderColor || answerSettings.border?.borderColor
    };
    console.log('DEBUG Border:', JSON.stringify(debugInfo, null, 2));
  }
  
  if (showBorder) {
    // Priority: element (top-level) > questionSettings > answerSettings (fallback for old data)
    const borderColor = element.borderColor || 
                       questionSettings.border?.borderColor || 
                       answerSettings.border?.borderColor ||
                       questionSettings.borderColor ||
                       answerSettings.borderColor ||
                       '#000000';
    const borderWidth = element.borderWidth || questionSettings.borderWidth || answerSettings.borderWidth || 1;
    const borderOpacity = element.borderOpacity !== undefined ? element.borderOpacity :
                         (questionSettings.borderOpacity !== undefined ? questionSettings.borderOpacity : 
                         (answerSettings.borderOpacity !== undefined ? answerSettings.borderOpacity : 1));
    const cornerRadius = element.cornerRadius ?? toolDefaults.cornerRadius ?? 0;
    const borderTheme = element.borderTheme || questionSettings.borderTheme || answerSettings.borderTheme || 'default';
    
    // Calculate dynamic height for border (must match client-side calculateDynamicHeight logic)
    // This should account for both question and answer text
    let dynamicHeight = height;
    if ((questionText && questionText.trim()) || (plainAnswerText && plainAnswerText.trim())) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      let totalLines = 0;
      const textWidth = width - (padding * 2);
      
      if (questionText && questionText.trim()) {
        context.font = (qFontBold ? 'bold ' : '') + (qFontStyle === 'italic' ? 'italic ' : '') + qFontSize + 'px ' + qFontFamily;
        const words = questionText.split(' ');
        let lines = 1;
        let currentWidth = 0;
        
        for (const word of words) {
          const wordWidth = context.measureText(word + ' ').width;
          if (currentWidth + wordWidth > textWidth && currentWidth > 0) {
            lines++;
            currentWidth = wordWidth;
          } else {
            currentWidth += wordWidth;
          }
        }
        totalLines += lines;
      }
      
      if (plainAnswerText && plainAnswerText.trim()) {
        context.font = (aFontBold ? 'bold ' : '') + (aFontStyle === 'italic' ? 'italic ' : '') + aFontSize + 'px ' + aFontFamily;
        const answerLines = plainAnswerText.split('\n');
        for (const line of answerLines) {
          if (!line.trim()) {
            totalLines++;
            continue;
          }
          const words = line.split(' ');
          let lineCount = 1;
          let currentWidth = 0;
          
          for (const word of words) {
            const wordWidth = context.measureText(word + ' ').width;
            if (currentWidth + wordWidth > textWidth && currentWidth > 0) {
              lineCount++;
              currentWidth = wordWidth;
            } else {
              currentWidth += wordWidth;
            }
          }
          totalLines += lineCount;
        }
      }
      
      // Match client-side: Math.max(totalLines * 70 + padding * 4, element.height)
      dynamicHeight = Math.max(totalLines * 70 + padding * 4, height);
    }
    
    // Render border with theme support
    // For rough/sketchy themes, use rough.js directly (matches client-side logic)
    if (rough && (borderTheme === 'rough' || borderTheme === 'sketchy')) {
      try {
        const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const rc = rough.svg(svg);
        
        let roughElement;
        if (cornerRadius > 0) {
          const roundedRectPath = 'M ' + cornerRadius + ' 0 L ' + (width - cornerRadius) + ' 0 Q ' + width + ' 0 ' + width + ' ' + cornerRadius + ' L ' + width + ' ' + (dynamicHeight - cornerRadius) + ' Q ' + width + ' ' + dynamicHeight + ' ' + (width - cornerRadius) + ' ' + dynamicHeight + ' L ' + cornerRadius + ' ' + dynamicHeight + ' Q 0 ' + dynamicHeight + ' 0 ' + (dynamicHeight - cornerRadius) + ' L 0 ' + cornerRadius + ' Q 0 0 ' + cornerRadius + ' 0 Z';
          roughElement = rc.path(roundedRectPath, {
            roughness: borderTheme === 'sketchy' ? 2 : 1,
            strokeWidth: borderWidth,
            stroke: borderColor,
            fill: 'transparent',
            seed: seed
          });
        } else {
          roughElement = rc.rectangle(0, 0, width, dynamicHeight, {
            roughness: borderTheme === 'sketchy' ? 2 : 1,
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
            opacity: borderOpacity,
            fill: 'transparent',
            strokeScaleEnabled: true,
            listening: false,
            lineCap: 'round',
            lineJoin: 'round',
            visible: true
          });
          // Konva uses insertion order, not zIndex
          // Border must be added right after background node
          layer.add(borderPath);
          if (bgRect) {
            const bgRectIndex = layer.getChildren().indexOf(bgRect);
            const borderIndex = layer.getChildren().indexOf(borderPath);
            if (bgRectIndex !== -1 && borderIndex !== -1 && borderIndex !== bgRectIndex + 1) {
              layer.getChildren().splice(borderIndex, 1);
              layer.getChildren().splice(bgRectIndex + 1, 0, borderPath);
            }
          } else {
            // No background, so move border after page background nodes
            const stage = layer.getStage();
            const stageWidth = stage ? stage.width() : 0;
            const stageHeight = stage ? stage.height() : 0;
            let lastPageBgIndex = -1;
            layer.getChildren().forEach((node, idx) => {
              if (node === borderPath) return; // Skip self
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
          
              // Debug: Verify border node was added (rough.js path)
              if (typeof console !== 'undefined' && console.log) {
                console.log('DEBUG Border Node Added (rough.js):', JSON.stringify({
                  className: borderPath.getClassName(),
                  x: borderPath.x(),
                  y: borderPath.y(),
                  stroke: borderPath.stroke(),
                  strokeWidth: borderPath.strokeWidth(),
                  opacity: borderPath.opacity(),
                  visible: borderPath.visible(),
                  zIndex: borderPath.zIndex(),
                  layerChildren: layer.getChildren().length,
                  allZIndices: layer.getChildren().map((node, idx) => ({
                    idx: idx,
                    className: node.getClassName(),
                    zIndex: node.zIndex(),
                    x: node.x ? node.x() : 'N/A',
                    y: node.y ? node.y() : 'N/A'
                  }))
                }, null, 2));
              }
        }
      } catch (error) {
        // Fallback to regular rect border
        const borderRect = new Konva.Rect({
          x: x,
          y: y,
          width: width,
          height: dynamicHeight,
          stroke: borderColor,
          strokeWidth: borderWidth,
          opacity: borderOpacity,
          cornerRadius: cornerRadius,
          fill: 'transparent',
          strokeScaleEnabled: true,
          listening: false,
          visible: true
        });
            // Konva uses insertion order, not zIndex
            // Insert border right after background node (if it exists), otherwise after page background
            if (bgRect) {
              const bgRectIndex = layer.getChildren().indexOf(bgRect);
              if (bgRectIndex !== -1) {
                layer.getChildren().splice(bgRectIndex + 1, 0, borderRect);
              } else {
                layer.add(borderRect);
              }
            } else {
              // No background, so insert border after page background nodes
              const stage = layer.getStage();
              const stageWidth = stage ? stage.width() : 0;
              const stageHeight = stage ? stage.height() : 0;
              const pageBackgroundNodes = [];
              layer.getChildren().forEach((node, idx) => {
                if (node.getClassName() !== 'Rect' && node.getClassName() !== 'Image') return;
                const nodeX = node.x ? node.x() : 0;
                const nodeY = node.y ? node.y() : 0;
                const nodeWidth = node.width ? node.width() : 0;
                const nodeHeight = node.height ? node.height() : 0;
                if (nodeX === 0 && nodeY === 0 && nodeWidth === stageWidth && nodeHeight === stageHeight) {
                  pageBackgroundNodes.push({ node, idx });
                }
              });
              if (pageBackgroundNodes.length > 0) {
                const lastPageBg = pageBackgroundNodes[pageBackgroundNodes.length - 1];
                layer.getChildren().splice(lastPageBg.idx + 1, 0, borderRect);
              } else {
                layer.add(borderRect);
              }
            }
            nodesAdded++;
            
            // Debug: Verify border node was added (rough.js fallback)
        if (typeof console !== 'undefined' && console.log) {
          console.log('DEBUG Border Node Added (rough.js fallback):', JSON.stringify({
            className: borderRect.getClassName(),
            x: borderRect.x(),
            y: borderRect.y(),
            width: borderRect.width(),
            height: borderRect.height(),
            stroke: borderRect.stroke(),
            strokeWidth: borderRect.strokeWidth(),
            opacity: borderRect.opacity(),
            visible: borderRect.visible(),
            layerChildren: layer.getChildren().length,
            error: error.message
          }, null, 2));
        }
      }
    } else {
      // Default border (no theme)
      const borderRect = new Konva.Rect({
        x: x,
        y: y,
        width: width,
        height: dynamicHeight,
        stroke: borderColor,
        strokeWidth: borderWidth,
        opacity: borderOpacity,
        cornerRadius: cornerRadius,
        fill: 'transparent',
        strokeScaleEnabled: true,
        listening: false,
        visible: true
      });
      // Konva uses insertion order, not zIndex
      // Insert border right after background node (if it exists), otherwise after page background
      if (bgRect) {
        const bgRectIndex = layer.getChildren().indexOf(bgRect);
        if (bgRectIndex !== -1) {
          layer.getChildren().splice(bgRectIndex + 1, 0, borderRect);
        } else {
          layer.add(borderRect);
        }
      } else {
        // No background, so insert border after page background nodes
        const stage = layer.getStage();
        const stageWidth = stage ? stage.width() : 0;
        const stageHeight = stage ? stage.height() : 0;
        const pageBackgroundNodes = [];
        layer.getChildren().forEach((node, idx) => {
          if (node.getClassName() !== 'Rect' && node.getClassName() !== 'Image') return;
          const nodeX = node.x ? node.x() : 0;
          const nodeY = node.y ? node.y() : 0;
          const nodeWidth = node.width ? node.width() : 0;
          const nodeHeight = node.height ? node.height() : 0;
          if (nodeX === 0 && nodeY === 0 && nodeWidth === stageWidth && nodeHeight === stageHeight) {
            pageBackgroundNodes.push({ node, idx });
          }
        });
        if (pageBackgroundNodes.length > 0) {
          const lastPageBg = pageBackgroundNodes[pageBackgroundNodes.length - 1];
          layer.getChildren().splice(lastPageBg.idx + 1, 0, borderRect);
        } else {
          layer.add(borderRect);
        }
      }
      nodesAdded++;
      
      // Debug: Verify border node was added
      if (typeof console !== 'undefined' && console.log) {
        console.log('DEBUG Border Node Added:', JSON.stringify({
          className: borderRect.getClassName(),
          x: borderRect.x(),
          y: borderRect.y(),
          width: borderRect.width(),
          height: borderRect.height(),
          stroke: borderRect.stroke(),
          strokeWidth: borderRect.strokeWidth(),
          opacity: borderRect.opacity(),
          visible: borderRect.visible(),
          layerChildren: layer.getChildren().length
        }, null, 2));
      }
    }
  }
  
  // Get paragraph spacing settings
  const qParagraphSpacing = element.paragraphSpacing || questionSettings.paragraphSpacing || 'small';
  const aParagraphSpacing = element.paragraphSpacing || answerSettings.paragraphSpacing || 'medium';
  
  // Get line height multiplier function
  function getLineHeightMultiplier(spacing) {
    switch (spacing) {
      case 'small': return 1.0;
      case 'medium': return 1.2;
      case 'large': return 1.5;
      default: return 1.0;
    }
  }
  
  // Calculate baseline alignment for question and answer text (for inline layout)
  const maxFontSize = Math.max(qFontSize, aFontSize);
  const effectivePadding = layoutVariant === 'inline' ? padding + (maxFontSize * 0.2) : padding;
  const combinedLineHeight = layoutVariant === 'inline' ? 
    maxFontSize * Math.max(getLineHeightMultiplier(qParagraphSpacing), getLineHeightMultiplier(aParagraphSpacing)) :
    qFontSize * getLineHeightMultiplier(qParagraphSpacing);
  const qLineHeight = layoutVariant === 'inline' ? combinedLineHeight : qFontSize * getLineHeightMultiplier(qParagraphSpacing);
  const aLineHeight = aFontSize * getLineHeightMultiplier(aParagraphSpacing);
  
  // Text baseline offset calculation (matches client-side exactly)
  const maxFontSizeUsed = Math.max(qFontSize, aFontSize);
  const maxLineHeightMultiplier = Math.max(getLineHeightMultiplier(qParagraphSpacing), getLineHeightMultiplier(aParagraphSpacing));
  const factor = aFontSize >= 50 ? aFontSize >= 96 ? aFontSize >= 145 ? -0.07 : 0.01 : 0.07 : 0.1;
  const textBaselineOffset = -(maxFontSizeUsed * maxLineHeightMultiplier * 0.15) + (maxFontSizeUsed * factor);
  
  // Render question text if present
  if (questionText && questionText.trim()) {
    // Calculate text width for wrapping
    const textWidth = width - (padding * 2);
    
    // Create canvas to measure text for proper wrapping
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontString = (qFontBold ? 'bold ' : '') + (qFontStyle === 'italic' ? 'italic ' : '') + qFontSize + 'px ' + qFontFamily;
    context.font = fontString;
    
    // Split text into lines based on width
    const words = questionText.split(' ');
    const questionLines = [];
    let currentLine = '';
    let currentLineWidth = 0;
    
    for (const word of words) {
      const wordWithSpace = currentLine ? ' ' + word : word;
      const wordWidth = context.measureText(wordWithSpace).width;
      
      if (currentLineWidth + wordWidth <= textWidth) {
        currentLine += wordWithSpace;
        currentLineWidth += wordWidth;
      } else {
        if (currentLine) questionLines.push(currentLine);
        currentLine = word;
        currentLineWidth = context.measureText(word).width;
      }
    }
    if (currentLine) {
      questionLines.push(currentLine);
    }
    
    // Render question lines with proper baseline alignment
    if (layoutVariant === 'inline') {
      // Inline layout: use shared baseline alignment
      const number = qFontSize - aFontSize;
      questionLines.forEach((line, index) => {
        const sharedBaseline = effectivePadding + (index * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.8) - (number / 7);
        const questionY = y + sharedBaseline - (qFontSize * 0.8);
        
        const questionNode = new Konva.Text({
          x: x + padding,
          y: questionY,
          text: line,
          fontSize: qFontSize,
          fontFamily: qFontFamily,
          fontStyle: qFontBold ? (qFontStyle === 'italic' ? 'bold italic' : 'bold') : qFontStyle,
          fill: qFontColor,
          width: textWidth,
          align: questionSettings.align || element.align || 'left',
          verticalAlign: 'top',
          wrap: 'none',
          rotation: rotation,
          opacity: opacity,
          visible: true,
          listening: false
        });
        layer.add(questionNode);
        nodesAdded++;
      });
    } else {
      // Block layout: simple vertical stacking
      questionLines.forEach((line, index) => {
        const questionNode = new Konva.Text({
          x: x + padding,
          y: y + padding + (index * qLineHeight),
          text: line,
          fontSize: qFontSize,
          fontFamily: qFontFamily,
          fontStyle: qFontBold ? (qFontStyle === 'italic' ? 'bold italic' : 'bold') : qFontStyle,
          fill: qFontColor,
          width: textWidth,
          align: questionSettings.align || element.align || 'left',
          verticalAlign: 'top',
          wrap: 'none',
          rotation: rotation,
          opacity: opacity,
          visible: true,
          listening: false
        });
        layer.add(questionNode);
        nodesAdded++;
      });
    }
  }
  
  // Render answer text if present
  if (plainAnswerText && plainAnswerText.trim()) {
    const textWidth = width - (padding * 2);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const aFontString = (aFontBold ? 'bold ' : '') + (aFontStyle === 'italic' ? 'italic ' : '') + aFontSize + 'px ' + aFontFamily;
    context.font = aFontString;
    
    if (layoutVariant === 'inline' && questionText && questionText.trim()) {
      // Inline layout: check if answer can fit on same line as question
      const qCanvas = document.createElement('canvas');
      const qContext = qCanvas.getContext('2d');
      const qFontString = (qFontBold ? 'bold ' : '') + (qFontStyle === 'italic' ? 'italic ' : '') + qFontSize + 'px ' + qFontFamily;
      qContext.font = qFontString;
      
      // Recalculate question lines for width measurement
      const qWords = questionText.split(' ');
      const qLines = [];
      let qCurrentLine = '';
      let qCurrentLineWidth = 0;
      
      for (const word of qWords) {
        const wordWithSpace = qCurrentLine ? ' ' + word : word;
        const wordWidth = qContext.measureText(wordWithSpace).width;
        
        if (qCurrentLineWidth + wordWidth <= textWidth) {
          qCurrentLine += wordWithSpace;
          qCurrentLineWidth += wordWidth;
        } else {
          if (qCurrentLine) qLines.push(qCurrentLine);
          qCurrentLine = word;
          qCurrentLineWidth = qContext.measureText(word).width;
        }
      }
      if (qCurrentLine) {
        qLines.push(qCurrentLine);
      }
      
      const lastQuestionLine = qLines[qLines.length - 1] || '';
      const questionTextWidth = qContext.measureText(lastQuestionLine).width;
      const gap = 40;
      const availableWidthAfterQuestion = textWidth - questionTextWidth - gap;
      
      // Check if first word of answer fits after last question line
      const firstAnswerLine = plainAnswerText.split('\n')[0] || '';
      const firstAnswerWord = firstAnswerLine.split(' ')[0] || '';
      const canFitOnSameLine = firstAnswerWord && availableWidthAfterQuestion > 0 && context.measureText(firstAnswerWord).width <= availableWidthAfterQuestion;
      
      if (canFitOnSameLine) {
        // Render answer on same line as question
        const number = qFontSize - aFontSize;
        const sharedBaseline = effectivePadding + ((qLines.length - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.8) - (number / 7);
        const answerY = y + sharedBaseline - (aFontSize * 0.8);
        const answerX = x + padding + questionTextWidth + gap;
        
        // Split answer text into words and render with wrapping
        const answerWords = plainAnswerText.split(' ');
        let currentAnswerLine = '';
        let currentAnswerLineWidth = 0;
        let answerLineIndex = 0;
        
        answerWords.forEach((word) => {
          const wordWithSpace = currentAnswerLine ? ' ' + word : word;
          const wordWidth = context.measureText(wordWithSpace).width;
          
          if (answerLineIndex === 0) {
            // First line: check against available width after question
            if (currentAnswerLineWidth + wordWidth <= availableWidthAfterQuestion) {
              currentAnswerLine += wordWithSpace;
              currentAnswerLineWidth += wordWidth;
            } else {
              // Render current line and start new line
              if (currentAnswerLine) {
                const answerNode = new Konva.Text({
                  x: answerX,
                  y: answerY,
                  text: currentAnswerLine,
                  fontSize: aFontSize,
                  fontFamily: aFontFamily,
                  fontStyle: aFontStyle,
                  fill: aFontColor,
                  align: 'left',
                  verticalAlign: 'top',
                  wrap: 'none',
                  rotation: rotation,
                  opacity: opacity,
                  visible: true,
                  listening: false
                });
                layer.add(answerNode);
                nodesAdded++;
              }
              currentAnswerLine = word;
              currentAnswerLineWidth = context.measureText(word).width;
              answerLineIndex++;
            }
          } else {
            // Subsequent lines: check against full text width
            if (currentAnswerLineWidth + wordWidth <= textWidth) {
              currentAnswerLine += wordWithSpace;
              currentAnswerLineWidth += wordWidth;
            } else {
              // Render current line and start new line
              if (currentAnswerLine) {
                const combinedLineBaseline = effectivePadding + ((qLines.length - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.6);
                const answerBaselineOffset = -(aFontSize * getLineHeightMultiplier(aParagraphSpacing) * 0.15) + (aFontSize * factor);
                const answerBaseline = combinedLineBaseline + (answerLineIndex * aLineHeight) + answerBaselineOffset + (aFontSize * 0.6);
                const answerLineY = y + answerBaseline - (aFontSize * 0.8);
                
                const answerNode = new Konva.Text({
                  x: x + padding,
                  y: answerLineY,
                  text: currentAnswerLine,
                  fontSize: aFontSize,
                  fontFamily: aFontFamily,
                  fontStyle: aFontStyle,
                  fill: aFontColor,
                  width: textWidth,
                  align: answerSettings.align || element.align || 'left',
                  verticalAlign: 'top',
                  wrap: 'none',
                  rotation: rotation,
                  opacity: opacity,
                  visible: true,
                  listening: false
                });
                layer.add(answerNode);
                nodesAdded++;
              }
              currentAnswerLine = word;
              currentAnswerLineWidth = context.measureText(word).width;
              answerLineIndex++;
            }
          }
        });
        
        // Render remaining answer text
        if (currentAnswerLine) {
          if (answerLineIndex === 0) {
            // Still on first line (combined line)
            const answerNode = new Konva.Text({
              x: answerX,
              y: answerY,
              text: currentAnswerLine,
              fontSize: aFontSize,
              fontFamily: aFontFamily,
              fontStyle: aFontStyle,
              fontWeight: aFontWeight,
              fill: aFontColor,
              align: 'left',
              verticalAlign: 'top',
              wrap: 'none',
              rotation: rotation,
              opacity: opacity,
              visible: true,
              listening: false
            });
            layer.add(answerNode);
            nodesAdded++;
          } else {
            // On subsequent line
            const combinedLineBaseline = effectivePadding + ((qLines.length - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.6);
            const answerBaselineOffset = -(aFontSize * getLineHeightMultiplier(aParagraphSpacing) * 0.15) + (aFontSize * factor);
            const answerBaseline = combinedLineBaseline + (answerLineIndex * aLineHeight) + answerBaselineOffset + (aFontSize * 0.6);
            const answerLineY = y + answerBaseline - (aFontSize * 0.8);
            
            const answerNode = new Konva.Text({
              x: x + padding,
              y: answerLineY,
              text: currentAnswerLine,
              fontSize: aFontSize,
              fontFamily: aFontFamily,
              fontStyle: aFontStyle,
              fontWeight: aFontWeight,
              fill: aFontColor,
              width: textWidth,
              align: answerSettings.align || element.align || 'left',
              verticalAlign: 'top',
              wrap: 'none',
              rotation: rotation,
              opacity: opacity,
              visible: true,
              listening: false
            });
            layer.add(answerNode);
            nodesAdded++;
          }
        }
      } else {
        // Answer starts on new line after question
        const combinedLineBaseline = effectivePadding + ((qLines.length - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.6);
        const answerBaselineOffset = -(aFontSize * getLineHeightMultiplier(aParagraphSpacing) * 0.15) + (aFontSize * factor);
        const answerBaseline = combinedLineBaseline + (1 * aLineHeight) + answerBaselineOffset + (aFontSize * 0.6);
        const answerY = y + answerBaseline - (aFontSize * 0.8);
        
        const answerNode = new Konva.Text({
          x: x + padding,
          y: answerY,
          text: plainAnswerText,
          fontSize: aFontSize,
          fontFamily: aFontFamily,
          fontStyle: aFontStyle,
          fontWeight: aFontWeight,
          fill: aFontColor,
          width: textWidth,
          align: answerSettings.align || element.align || 'left',
          verticalAlign: 'top',
          wrap: 'word',
          rotation: rotation,
          opacity: opacity,
          visible: true,
          listening: false
        });
        layer.add(answerNode);
        nodesAdded++;
      }
    } else {
      // Block layout or no question: simple vertical positioning
      let answerY = y + padding;
      if (questionText && questionText.trim() && layoutVariant === 'block') {
        const qCanvas = document.createElement('canvas');
        const qContext = qCanvas.getContext('2d');
        const qFontString = (qFontBold ? 'bold ' : '') + (qFontStyle === 'italic' ? 'italic ' : '') + qFontSize + 'px ' + qFontFamily;
        qContext.font = qFontString;
        
        const qWords = questionText.split(' ');
        const qLines = [];
        let qCurrentLine = '';
        let qCurrentLineWidth = 0;
        
        for (const word of qWords) {
          const wordWithSpace = qCurrentLine ? ' ' + word : word;
          const wordWidth = qContext.measureText(wordWithSpace).width;
          
          if (qCurrentLineWidth + wordWidth <= textWidth) {
            qCurrentLine += wordWithSpace;
            qCurrentLineWidth += wordWidth;
          } else {
            if (qCurrentLine) qLines.push(qCurrentLine);
            qCurrentLine = word;
            qCurrentLineWidth = qContext.measureText(word).width;
          }
        }
        if (qCurrentLine) {
          qLines.push(qCurrentLine);
        }
        
        const questionHeight = qLines.length * qLineHeight;
        answerY = y + padding + questionHeight + (padding / 2);
      }
      
      const answerNode = new Konva.Text({
        x: x + padding,
        y: answerY,
        text: plainAnswerText,
        fontSize: aFontSize,
        fontFamily: aFontFamily,
        fontStyle: aFontStyle,
        fontWeight: aFontWeight,
        fill: aFontColor,
        width: textWidth,
        height: height - answerY + y - padding,
        align: answerSettings.align || element.align || 'left',
        verticalAlign: 'top',
        wrap: 'word',
        rotation: rotation,
        opacity: opacity,
        visible: true,
        listening: false
      });
      layer.add(answerNode);
      nodesAdded++;
    }
  }
  
  // Render ruled lines if enabled
  if (ruledLinesEnabled) {
    // Use global function if available (browser context), otherwise fallback to local require (Node.js context)
    const renderRuledLinesFunc = (typeof window !== 'undefined' && window.renderRuledLines) ? window.renderRuledLines : renderRuledLines;
    const ruledLinesCount = renderRuledLinesFunc(
      layer,
      element,
      questionText,
      plainAnswerText,
      questionSettings,
      answerSettings,
      padding,
      width,
      height,
      x,
      y,
      konvaInstance,
      document,
      roughInstance
    );
    nodesAdded += ruledLinesCount;
  }
  
  return nodesAdded;
}

module.exports = {
  renderQnAInline
};

