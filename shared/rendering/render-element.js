/**
 * Element rendering function for PDF export
 */

const { renderQnA } = require('./render-qna');
const { getCrop } = require('./utils/image-utils');
const { applyFillOpacity, applyStrokeOpacity } = require('./utils/color-utils');
const { getGlobalThemeDefaults } = require('./utils/theme-utils');

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
 * Render a single element
 * @param {Object} layer - Konva layer
 * @param {Object} element - Element data
 * @param {Object} pageData - Page data
 * @param {Object} bookData - Book data
 * @param {Object} konvaInstance - Konva instance
 * @param {Object} document - Document object
 * @param {Object} Image - Image constructor
 * @param {Object} roughInstance - Rough.js instance (optional)
 * @param {Object} themesData - Themes data
 * @param {Array} colorPalettes - Color palettes array
 * @param {Array} imagePromises - Array to store image loading promises
 * @param {number} zOrderIndex - Z-order index in the sorted elements array
 * @param {number} syncElementCount - Current count of synchronously rendered elements
 * @returns {Object|null} Rendered Konva node or null
 */
function renderElement(layer, element, pageData, bookData, konvaInstance, document, Image, roughInstance, themesData, colorPalettes, imagePromises, zOrderIndex, syncElementCount) {
  const Konva = konvaInstance;
  
  // Debug logging for all elements
  console.log('renderElement called for element:', {
    id: element.id,
    type: element.type,
    textType: element.textType,
    questionId: element.questionId
  });
  
  // Skip brush-multicolor elements (they are rendered as groups)
  if (element.type === 'brush-multicolor') {
    return null;
  }
  
  // Get element properties
  const x = element.x || 0;
  const y = element.y || 0;
  const width = element.width || 100;
  const height = element.height || 100;
  const rotation = element.rotation || 0;
  const opacity = element.opacity !== undefined ? element.opacity : 1;
  
  // Get fill and stroke with opacity applied
  let fill = element.fill !== undefined ? element.fill : (element.fillColor || 'transparent');
  const fillOpacity = element.fillOpacity !== undefined ? element.fillOpacity : 1;
  fill = applyFillOpacity(fill, fillOpacity, opacity);

  let stroke = element.stroke || element.strokeColor || '#000000';
  const strokeOpacity = element.strokeOpacity ?? element.borderOpacity ?? element.border?.opacity ?? 1;
  
  const strokeWidth = element.strokeWidth || 0;
  
  // Render QnA elements (standard QnA textbox)
  // qna_inline is deprecated and treated as qna
  if (element.type === 'text' && (element.textType === 'qna' || element.textType === 'qna2' || element.textType === 'qna_inline')) {
    console.log('Rendering QnA element:', element.id, 'textType:', element.textType);
    // Use global function if available (browser context), otherwise fallback to local require (Node.js context)
    const renderQnAFunc = (typeof window !== 'undefined' && window.renderQnA) ? window.renderQnA : renderQnA;
    if (!renderQnAFunc) {
      console.error('renderQnA is not defined. window.renderQnA:', typeof window !== 'undefined' ? (window.renderQnA ? 'exists' : 'undefined') : 'N/A', 'local renderQnA:', typeof renderQnA);
      return null;
    }
    console.log('Calling renderQnAFunc for element:', element.id, 'zOrderIndex:', zOrderIndex);
    const nodesAdded = renderQnAFunc(
      layer,
      element,
      pageData,
      bookData,
      x,
      y,
      width,
      height,
      rotation,
      opacity,
      konvaInstance,
      document,
      roughInstance,
      themesData,
      colorPalettes,
      zOrderIndex
    );
    
    return { type: 'qna', nodesAdded: nodesAdded };
  }
  
  // Render regular text elements
  if (element.type === 'text' || element.textType === 'question' || element.textType === 'answer' || element.textType === 'free_text') {
    let textContent = element.formattedText || element.text || '';
    
    // If formattedText contains HTML, extract plain text
    if (textContent.includes('<')) {
      textContent = extractPlainText(textContent, document);
    }
    
    if (!textContent || textContent.trim() === '') {
      return null;
    }
    
    const fontColor = element.fontColor || element.font?.fontColor || fill || '#000000';
    const fontSize = element.fontSize || element.font?.fontSize || 16;
    let fontFamilyRaw = element.fontFamily || element.font?.fontFamily || 'Arial, sans-serif';
    const fontFamily = fontFamilyRaw.replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
    const fontWeight = element.fontWeight || element.font?.fontWeight || (element.font?.fontBold ? 'bold' : 'normal');
    const fontStyle = element.fontStyle || element.font?.fontStyle || (element.font?.fontItalic ? 'italic' : 'normal');
    
    const textNode = new Konva.Text({
      x: x,
      y: y,
      text: textContent,
      fontSize: fontSize,
      fontFamily: fontFamily,
      fontStyle: fontStyle,
      fontWeight: fontWeight,
      fill: fontColor,
      width: width,
      height: height,
      align: element.align || 'left',
      verticalAlign: element.verticalAlign || 'top',
      wrap: 'word',
      rotation: rotation,
      opacity: opacity,
      visible: true,
      listening: false
    });
    
    layer.add(textNode);
    // Store z-order information on text node
    if (zOrderIndex !== undefined) {
      textNode.setAttr('__zOrderIndex', zOrderIndex);
    }
    return textNode;
  }
  
  // Render image elements
  if (element.type === 'image') {
    if (!element.src) {
      return null;
    }
    
    const imagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = function() {
        const clipPosition = element.imageClipPosition || 'center-middle';
        const crop = getCrop(img, { width: width, height: height }, clipPosition);
        
        // Slightly reduce corner radius to match client-side rendering
        // Reduce by a small amount to account for rendering differences
        const imageCornerRadius = element.cornerRadius ? Math.max(0, element.cornerRadius - 2) : 0;
        
        const konvaImage = new Konva.Image({
          x: x,
          y: y,
          image: img,
          width: width,
          height: height,
          cropX: crop.cropX,
          cropY: crop.cropY,
          cropWidth: crop.cropWidth,
          cropHeight: crop.cropHeight,
          cornerRadius: imageCornerRadius,
          rotation: rotation,
          opacity: element.imageOpacity !== undefined ? element.imageOpacity : opacity,
          listening: false
        });
        
        // Store z-order information on the image node for later positioning
        konvaImage.setAttr('__zOrderIndex', zOrderIndex);
        
        // Add image to layer (will be repositioned after all images load)
        layer.add(konvaImage);
        
        // Render frame/border if enabled
        const frameEnabled = element.frameEnabled !== undefined 
          ? element.frameEnabled 
          : (element.strokeWidth || 0) > 0;
        const strokeWidth = element.strokeWidth || 0;
        const stroke = element.stroke || '#1f2937';
        const strokeOpacity = element.strokeOpacity !== undefined ? element.strokeOpacity : 1;
        const frameCornerRadius = element.cornerRadius ? Math.max(0, element.cornerRadius - 2) : 0;
        const frameTheme = element.frameTheme || element.theme || 'default';
        
        if (frameEnabled && strokeWidth > 0) {
          // Use theme renderer for all themes (matches client-side rendering)
          // getThemeRenderer is available in browser context via window.getThemeRenderer
          const getThemeRenderer = (typeof window !== 'undefined' && window.getThemeRenderer) || null;
          
          if (getThemeRenderer && frameTheme !== 'default') {
            try {
              const themeRenderer = getThemeRenderer(frameTheme);
              if (themeRenderer) {
                // Create frame element for theme renderer
                const frameRoughness = frameTheme === 'rough' ? 8 : (frameTheme === 'sketchy' ? 2 : (frameTheme === 'wobbly' ? 3 : undefined));
                const frameElement = {
                  type: 'rect',
                  id: element.id + '-frame',
                  x: 0,
                  y: 0,
                  width: width,
                  height: height,
                  cornerRadius: frameCornerRadius,
                  stroke: stroke,
                  strokeWidth: strokeWidth,
                  fill: 'transparent',
                  theme: frameTheme,
                  // Set roughness for rough theme to match client-side rendering
                  roughness: frameRoughness
                };
                
                // Generate path and stroke props using theme renderer
                const pathData = themeRenderer.generatePath(frameElement, 1);
                const strokeProps = themeRenderer.getStrokeProps(frameElement, 1);
                
                if (pathData) {
                  
                  const framePath = new Konva.Path({
                    data: pathData,
                    x: x,
                    y: y,
                    stroke: strokeProps.stroke || stroke,
                    strokeWidth: strokeProps.strokeWidth || strokeWidth,
                    opacity: strokeOpacity,
                    fill: strokeProps.fill || 'transparent',
                    strokeScaleEnabled: true,
                    listening: false,
                    lineCap: 'round',
                    lineJoin: 'round'
                  });
                  layer.add(framePath);
                  // Store z-order on frame too (will be positioned after images load)
                  framePath.setAttr('__zOrderIndex', zOrderIndex);
                  framePath.setAttr('__isFrame', true);
                  framePath.setAttr('__parentImageId', element.id);
                } else {
                  console.warn('[render-element] No path generated by theme renderer, falling back to simple rect:', {
                    elementId: element.id,
                    frameTheme: frameTheme
                  });
                  // Fallback to simple rect
                  const frameRect = new Konva.Rect({
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    fill: 'transparent',
                    stroke: stroke,
                    strokeWidth: strokeWidth,
                    opacity: strokeOpacity,
                    cornerRadius: frameCornerRadius,
                    strokeScaleEnabled: true,
                    listening: false
                  });
                  layer.add(frameRect);
                  // Store z-order on frame too (will be positioned after images load)
                  frameRect.setAttr('__zOrderIndex', zOrderIndex);
                  frameRect.setAttr('__isFrame', true);
                  frameRect.setAttr('__parentImageId', element.id);
                }
              } else {
                console.warn('[render-element] Theme renderer not found for theme:', frameTheme);
                // Fallback to simple rect
                const frameRect = new Konva.Rect({
                  x: x,
                  y: y,
                  width: width,
                  height: height,
                  fill: 'transparent',
                  stroke: stroke,
                  strokeWidth: strokeWidth,
                  opacity: strokeOpacity,
                  cornerRadius: frameCornerRadius,
                  strokeScaleEnabled: true,
                  listening: false
                });
                layer.add(frameRect);
              }
            } catch (err) {
              console.warn('[render-element] Failed to render themed frame, falling back to simple rect:', err);
              // Fallback to simple rect if theme renderer fails
              const frameRect = new Konva.Rect({
                x: x,
                y: y,
                width: width,
                height: height,
                fill: 'transparent',
                stroke: stroke,
                strokeWidth: strokeWidth,
                opacity: strokeOpacity,
                cornerRadius: frameCornerRadius,
                strokeScaleEnabled: true,
                listening: false
              });
              layer.add(frameRect);
            }
          } else {
            // Default: simple rect for default theme or when getThemeRenderer is not available
            const frameRect = new Konva.Rect({
              x: x,
              y: y,
              width: width,
              height: height,
              fill: 'transparent',
              stroke: stroke,
              strokeWidth: strokeWidth,
              opacity: strokeOpacity,
              cornerRadius: frameCornerRadius,
              strokeScaleEnabled: true,
              listening: false
            });
            layer.add(frameRect);
          }
        }
        
        layer.draw();
        if (typeof window !== 'undefined' && window.stage) {
          window.stage.draw();
        }
        resolve(konvaImage);
      };
      
      img.onerror = function() {
        reject(new Error('Image failed to load: ' + element.src));
      };
      
      img.src = element.src;
    });
    
    if (imagePromises) {
      imagePromises.push(imagePromise);
    }
    
    return { type: 'image-loading' };
  }
  
  // Render rectangle
  if (element.type === 'rect') {
    const cornerRadius = element.cornerRadius || 0;
    const backgroundEnabled = element.backgroundEnabled !== undefined ? element.backgroundEnabled : 
                              (fill !== 'transparent' && fill !== undefined && fill !== null);
    const finalFill = (!backgroundEnabled || fill === 'transparent') ? undefined : fill;
    
    // Check if rough theme should be applied
    const elementTheme = element.theme || pageData.theme || bookData.theme || 'default';
    const useRough = elementTheme === 'rough' && roughInstance;
    
    // Debug: Log rough theme information - ALWAYS log for rect
    console.log('[DEBUG renderElement] Rendering rect:', {
      elementId: element.id,
      elementType: 'rect',
      elementTheme: elementTheme,
      hasRoughInstance: !!roughInstance,
      useRough: useRough,
      roughInstanceType: typeof roughInstance,
      roughInstanceExists: roughInstance !== null && roughInstance !== undefined,
      roughSvgMethod: roughInstance && typeof roughInstance.svg === 'function' ? 'exists' : 'missing'
    });
    
    if (elementTheme === 'rough') {
      console.log('[DEBUG renderElement] ⚠️ ROUGH THEME DETECTED FOR RECT:', {
        elementId: element.id,
        willUseRough: useRough,
        hasRoughInstance: !!roughInstance
      });
    } else {
      console.log('[DEBUG renderElement] Using default theme for rect:', {
        elementId: element.id,
        theme: elementTheme
      });
    }
    
    if (useRough) {
      try {
        const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const rc = roughInstance.svg(svg);
        
        let roughElement;
        if (cornerRadius > 0) {
          const r = Math.min(cornerRadius, width / 2, height / 2);
          const roundedRectPath = `M ${r} 0 L ${width - r} 0 Q ${width} 0 ${width} ${r} L ${width} ${height - r} Q ${width} ${height} ${width - r} ${height} L ${r} ${height} Q 0 ${height} 0 ${height - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
          roughElement = rc.path(roundedRectPath, {
            roughness: element.roughness || 1,
            strokeWidth: strokeWidth,
            stroke: stroke,
            fill: finalFill !== undefined && finalFill !== 'transparent' ? finalFill : undefined,
            fillStyle: 'solid',
            seed: seed
          });
        } else {
          roughElement = rc.rectangle(0, 0, width, height, {
            roughness: element.roughness || 1,
            strokeWidth: strokeWidth,
            stroke: stroke,
            fill: finalFill !== undefined && finalFill !== 'transparent' ? finalFill : undefined,
            fillStyle: 'solid',
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
          // Stroke opacity is applied to stroke color, shape opacity uses element opacity
          const pathNode = new Konva.Path({
            x: x,
            y: y,
            data: combinedPath.trim(),
            fill: finalFill !== undefined && finalFill !== 'transparent' ? finalFill : undefined,
            stroke: stroke,
            strokeWidth: strokeWidth,
            opacity: opacity,
            rotation: rotation,
            listening: false
          });
          layer.add(pathNode);
          // Store z-order information on rect node
          if (zOrderIndex !== undefined) {
            pathNode.setAttr('__zOrderIndex', zOrderIndex);
          }
          return pathNode;
        }
      } catch (error) {
        console.warn('Rough theme rendering failed for rect, falling back to regular rect:', error);
      }
    }
    
    // Regular rect (fallback or default theme)
    // Create separate shapes for fill and stroke to have independent opacities
    const strokeOpacity = element.strokeOpacity ?? element.borderOpacity ?? element.border?.opacity ?? element.opacity ?? element.backgroundOpacity ?? 1;


    // Fill rect (background) - only if fill is visible
    let lastShape = null;
    if (finalFill && finalFill !== 'transparent') {
      const fillRect = new Konva.Rect({
        x: x,
        y: y,
        width: width,
        height: height,
        fill: finalFill, // Already RGBA from applyFillOpacity
        stroke: 'transparent',
        cornerRadius: cornerRadius,
        rotation: rotation,
        opacity: 1,
        listening: false
      });
      layer.add(fillRect);
      lastShape = fillRect;
      // Store z-order information on fill rect
      if (zOrderIndex !== undefined) {
        fillRect.setAttr('__zOrderIndex', zOrderIndex);
      }
    }

    // Stroke rect (border) - only if stroke is visible
    if (strokeWidth > 0 && stroke !== 'transparent') {
      const strokeRect = new Konva.Rect({
        x: x,
        y: y,
        width: width,
        height: height,
        fill: 'transparent',
        stroke: stroke,
        strokeWidth: strokeWidth,
        cornerRadius: cornerRadius,
        rotation: rotation,
        opacity: strokeOpacity,
        listening: false
      });
      layer.add(strokeRect);
      lastShape = strokeRect;
      // Store z-order information on stroke rect
      if (zOrderIndex !== undefined) {
        strokeRect.setAttr('__zOrderIndex', zOrderIndex);
      }
    }

    return lastShape;
  }
  
  // Render circle
  if (element.type === 'circle') {
    const radius = Math.min(width, height) / 2;
    const backgroundEnabled = element.backgroundEnabled !== undefined ? element.backgroundEnabled : 
                              (fill !== 'transparent' && fill !== undefined && fill !== null);
    const finalFill = (!backgroundEnabled || fill === 'transparent') ? undefined : fill;
    
    // Check if rough theme should be applied
    const elementTheme = element.theme || pageData.theme || bookData.theme || 'default';
    const useRough = elementTheme === 'rough' && roughInstance;
    
    // Debug: Log circle dimensions and rendering info - ALWAYS log for circle
    // Log values directly (not as object) to avoid JSHandle serialization issues
    console.log('[DEBUG renderElement] Rendering circle:');
    console.log('  elementId:', element.id);
    console.log('  elementWidth:', element.width);
    console.log('  elementHeight:', element.height);
    console.log('  width:', width);
    console.log('  height:', height);
    console.log('  radius:', radius, '(calculated: Math.min(' + width + ', ' + height + ') / 2 = ' + radius + ')');
    console.log('  x:', x);
    console.log('  y:', y);
    console.log('  centerX:', x + width / 2);
    console.log('  centerY:', y + height / 2);
    console.log('  strokeWidth:', strokeWidth);
    console.log('  elementTheme:', elementTheme);
    console.log('  useRough:', useRough);
    
    if (elementTheme === 'rough') {
      console.log('[DEBUG renderElement] ⚠️ ROUGH THEME DETECTED FOR CIRCLE:', {
        elementId: element.id,
        willUseRough: useRough,
        hasRoughInstance: !!roughInstance
      });
    } else {
      console.log('[DEBUG renderElement] Using default theme for circle:', {
        elementId: element.id,
        theme: elementTheme
      });
    }
    
    if (useRough) {
      try {
        const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const rc = roughInstance.svg(svg);
        
        const roughElement = rc.circle(width / 2, height / 2, radius * 2, {
          roughness: element.roughness || 1,
          strokeWidth: strokeWidth,
          stroke: stroke,
          fill: finalFill !== undefined && finalFill !== 'transparent' ? finalFill : undefined,
          fillStyle: 'solid',
          seed: seed
        });
        
        const paths = roughElement.querySelectorAll('path');
        let combinedPath = '';
        paths.forEach(path => {
          const d = path.getAttribute('d');
          if (d) combinedPath += d + ' ';
        });
        
        if (combinedPath) {
          // Stroke opacity is applied to stroke color, shape opacity uses element opacity
          const pathNode = new Konva.Path({
            x: x,
            y: y,
            data: combinedPath.trim(),
            fill: finalFill !== undefined && finalFill !== 'transparent' ? finalFill : undefined,
            stroke: stroke,
            strokeWidth: strokeWidth,
            opacity: opacity,
            rotation: rotation,
            listening: false
          });
          layer.add(pathNode);
          // Store z-order information on circle node
          if (zOrderIndex !== undefined) {
            pathNode.setAttr('__zOrderIndex', zOrderIndex);
          }
          return pathNode;
        }
      } catch (error) {
        console.warn('Rough theme rendering failed for circle, falling back to regular circle:', error);
      }
    }
    
    // Regular circle (fallback or default theme)
    // Create separate shapes for fill and stroke to have independent opacities
    const strokeOpacity = element.strokeOpacity ?? element.borderOpacity ?? element.border?.opacity ?? element.opacity ?? element.backgroundOpacity ?? 1;

    // Fill circle (background) - only if fill is visible
    let lastShape = null;
    if (finalFill && finalFill !== 'transparent') {
      const fillCircle = new Konva.Circle({
        x: x + width / 2,
        y: y + height / 2,
        radius: radius,
        fill: finalFill, // Already RGBA from applyFillOpacity
        stroke: 'transparent',
        rotation: rotation,
        opacity: 1,
        listening: false
      });
      layer.add(fillCircle);
      lastShape = fillCircle;
      // Store z-order information on fill circle
      if (zOrderIndex !== undefined) {
        fillCircle.setAttr('__zOrderIndex', zOrderIndex);
      }
    }

    // Stroke circle (border) - only if stroke is visible
    if (strokeWidth > 0 && stroke !== 'transparent') {
      const strokeCircle = new Konva.Circle({
        x: x + width / 2,
        y: y + height / 2,
        radius: radius,
        fill: 'transparent',
        stroke: stroke,
        strokeWidth: strokeWidth,
        rotation: rotation,
        opacity: strokeOpacity,
        listening: false
      });
      layer.add(strokeCircle);
      lastShape = strokeCircle;
      // Store z-order information on stroke circle
      if (zOrderIndex !== undefined) {
        strokeCircle.setAttr('__zOrderIndex', zOrderIndex);
      }
    }

    return lastShape;
  }
  
  // Render line
  if (element.type === 'line' && element.points && Array.isArray(element.points)) {
    const line = new Konva.Line({
      x: x,
      y: y,
      points: element.points,
      stroke: stroke,
      strokeWidth: strokeWidth,
      lineCap: element.lineCap || 'round',
      lineJoin: element.lineJoin || 'round',
      opacity: opacity,
      listening: false
    });
    
    layer.add(line);
    // Store z-order information on line node
    if (zOrderIndex !== undefined) {
      line.setAttr('__zOrderIndex', zOrderIndex);
    }
    return line;
  }
  
  // Render brush (freehand drawing)
  if (element.type === 'brush' && element.points && Array.isArray(element.points)) {
    const line = new Konva.Line({
      x: 0,
      y: 0,
      points: element.points,
      stroke: stroke,
      strokeWidth: strokeWidth,
      lineCap: 'round',
      lineJoin: 'round',
      tension: 0.5,
      opacity: opacity,
      listening: false
    });
    
    layer.add(line);
    // Store z-order information on brush node
    if (zOrderIndex !== undefined) {
      line.setAttr('__zOrderIndex', zOrderIndex);
    }
    return line;
  }
  
  // Render other shapes (triangle, polygon, etc.)
  if (['triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(element.type)) {
    const backgroundEnabled = element.backgroundEnabled !== undefined ? element.backgroundEnabled : 
                              (fill !== 'transparent' && fill !== undefined);
    const finalFill = (!backgroundEnabled || fill === 'transparent') ? undefined : fill;
    
    // Try to get theme defaults
    // Use global function if available (browser context), otherwise fallback to local require (Node.js context)
    const getGlobalThemeDefaultsFunc = (typeof window !== 'undefined' && window.getGlobalThemeDefaults) ? window.getGlobalThemeDefaults : getGlobalThemeDefaults;
    const themeDefaults = getGlobalThemeDefaultsFunc(
      pageData.theme || pageData.templateId || bookData.theme || bookData.templateId || 'default',
      element.type,
      themesData
    );
    
    const finalStroke = stroke || themeDefaults.stroke;
    const finalShapeFill = (fill !== undefined && fill !== 'transparent') ? finalFill : 
                          (themeDefaults.fill && themeDefaults.fill !== 'transparent' ? themeDefaults.fill : finalFill);
    
    const shapeRect = new Konva.Rect({
      x: x,
      y: y,
      width: width,
      height: height,
      fill: finalShapeFill === 'transparent' ? undefined : finalShapeFill,
      stroke: finalStroke,
      strokeWidth: strokeWidth,
      rotation: rotation,
      opacity: opacity,
      listening: false
    });
    
    layer.add(shapeRect);
    // Store z-order information on shape node
    if (zOrderIndex !== undefined) {
      shapeRect.setAttr('__zOrderIndex', zOrderIndex);
    }
    return shapeRect;
  }
  
  // Unknown element type - skip
  console.warn('Unknown element type, skipping:', element.type, element.id);
  return null;
}

module.exports = {
  renderElement
};

