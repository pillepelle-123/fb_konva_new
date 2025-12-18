/**
 * Background rendering function for PDF export
 */

const { PATTERNS } = require('../utils/constants');
const { resolveBackgroundImageUrl, getPalettePartColor, getPalette, resolveImageUrlThroughProxy } = require('./utils/palette-utils');

/**
 * Create pattern image tile
 */
function createPatternImage(pattern, color, size, strokeWidth, document) {
  const tileSize = 20 * size;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  
  if (pattern.id === 'dots') {
    ctx.beginPath();
    ctx.arc(tileSize/2, tileSize/2, tileSize * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (pattern.id === 'grid') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tileSize, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, tileSize);
    ctx.stroke();
  } else if (pattern.id === 'diagonal') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, tileSize);
    ctx.lineTo(tileSize, 0);
    ctx.stroke();
  } else if (pattern.id === 'cross') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, tileSize);
    ctx.lineTo(tileSize, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(tileSize, tileSize);
    ctx.stroke();
  } else if (pattern.id === 'waves') {
    ctx.lineWidth = strokeWidth * 2;
    ctx.beginPath();
    ctx.moveTo(0, tileSize/2);
    ctx.quadraticCurveTo(tileSize/4, 0, tileSize/2, tileSize/2);
    ctx.quadraticCurveTo(3*tileSize/4, tileSize, tileSize, tileSize/2);
    ctx.stroke();
  } else if (pattern.id === 'hexagon') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    const centerX = tileSize/2;
    const centerY = tileSize/2;
    const radius = tileSize * 0.3;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  
  return canvas;
}

/**
 * Render background for a page
 * @param {Object} layer - Konva layer
 * @param {Object} pageData - Page data with background property
 * @param {Object} bookData - Book data with colorPaletteId
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} konvaInstance - Konva instance (e.g., window.Konva)
 * @param {Object} document - Document object (for creating canvas)
 * @param {Object} Image - Image constructor
 * @param {Function} callback - Callback function when done
 * @returns {Promise} Promise that resolves when background is rendered
 */
function renderBackground(layer, pageData, bookData, width, height, konvaInstance, document, Image, callback, imagePromises, options = {}) {
  const Konva = konvaInstance;
  
  // Debug: Log background rendering start
  console.log('[DEBUG renderBackground] ⚠️ STARTING BACKGROUND RENDERING:', {
    pageNumber: pageData.pageNumber,
    hasBackground: !!pageData.background,
    backgroundType: pageData.background?.type,
    backgroundValue: pageData.background?.value,
    backgroundOpacity: pageData.background?.opacity,
    width: width,
    height: height
  });
  const background = pageData.background || {};
  
  return new Promise((resolve, reject) => {
    if (background.type === 'color') {
      const bgColor = background.value || '#ffffff';
      const bgOpacity = background.opacity !== undefined ? background.opacity : 1;
      
      const bgRect = new Konva.Rect({
        x: 0,
        y: 0,
        width: width,
        height: height,
        fill: bgColor,
        opacity: bgOpacity,
        listening: false
      });
      layer.add(bgRect);
      bgRect.zIndex(0); // Ensure page background is at the bottom
      if (callback) callback();
      resolve();
    } else if (background.type === 'pattern') {
      const pattern = PATTERNS.find(p => p.id === background.value);
      if (pattern) {
        // Get pattern properties
        const patternColor = background.patternBackgroundColor || '#666';
        const patternSize = background.patternSize !== undefined ? background.patternSize : 1;
        const patternStrokeWidth = background.patternStrokeWidth !== undefined ? background.patternStrokeWidth : 1;
        const patternOpacity = background.patternOpacity !== undefined ? background.patternOpacity : 1;
        
        // Get background color (for pattern backgrounds, this is the base color behind the pattern)
        const activePaletteId = pageData.colorPaletteId || bookData.colorPaletteId;
        const activePalette = activePaletteId ? getPalette(activePaletteId) : null;
        const paletteBackgroundColor = getPalettePartColor(
          activePalette,
          'pageBackground',
          'background',
          '#ffffff'
        ) || '#ffffff';
        const backgroundColor = background.backgroundColor || paletteBackgroundColor;
        const hasBackgroundColor = background.backgroundColorEnabled !== false; // Default to true if not specified
        
        // Render background color first if enabled
        // Match client-side: background color should use main opacity, not separate opacity
        if (hasBackgroundColor && backgroundColor && backgroundColor !== 'transparent') {
          // Use background.opacity for the background color (like client does)
          const bgColorOpacity = background.opacity !== undefined ? background.opacity : 1;
          const bgColorRect = new Konva.Rect({
            x: 0,
            y: 0,
            width: width,
            height: height,
            fill: backgroundColor,
            opacity: bgColorOpacity,
            listening: false
          });
          layer.add(bgColorRect);
          bgColorRect.zIndex(0); // Ensure page background is at the bottom
        }
        
        // Create pattern image with correct size
        const patternImage = createPatternImage(
          pattern,
          patternColor,
          patternSize,
          patternStrokeWidth,
          document
        );
        
        // Render pattern with opacity
        const patternRect = new Konva.Rect({
          x: 0,
          y: 0,
          width: width,
          height: height,
          fillPatternImage: patternImage,
          fillPatternRepeat: 'repeat',
          opacity: patternOpacity,
          listening: false
        });
        layer.add(patternRect);
        patternRect.zIndex(0); // Ensure page background is at the bottom
      } else {
        // Fallback to white if pattern not found
        const bgRect = new Konva.Rect({
          x: 0,
          y: 0,
          width: width,
          height: height,
          fill: '#ffffff',
          listening: false
        });
        layer.add(bgRect);
        bgRect.zIndex(0); // Ensure page background is at the bottom
      }
      if (callback) callback();
      resolve();
    } else if (background.type === 'image') {
      // Resolve URL with palette colors if template ID is present
      const activePaletteId = pageData.colorPaletteId || bookData.colorPaletteId;
      const activePalette = activePaletteId ? getPalette(activePaletteId) : null;
      
      let imageUrl = resolveBackgroundImageUrl(background, {
        paletteId: activePaletteId,
        paletteColors: activePalette?.colors
      }) || background.value;
      
      // Resolve S3 URLs through proxy if token is available
      const token = options.token || null;
      const apiUrl = options.apiUrl || '/api';
      if (imageUrl) {
        imageUrl = resolveImageUrlThroughProxy(imageUrl, token, apiUrl);
      }
      
      // Debug: Log image background information - ALWAYS log
      console.log('[DEBUG renderBackground] ⚠️ IMAGE BACKGROUND DETECTED:', {
        backgroundType: background.type,
        backgroundValue: background.value,
        backgroundImageTemplateId: background.backgroundImageTemplateId,
        resolvedImageUrl: imageUrl,
        originalImageUrl: background.value,
        isS3Url: imageUrl && (imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('s3.us-east-1.amazonaws.com')),
        hasToken: !!token,
        willUseProxy: !!token && imageUrl && (imageUrl.includes('/api/images/proxy') || (imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('s3.us-east-1.amazonaws.com'))),
        willAttemptLoad: !!imageUrl
      });
      
      // Check if background color is enabled
      const hasBackgroundColor = background.backgroundColorEnabled === true;
      const paletteBackgroundColor = getPalettePartColor(
        activePalette,
        'pageBackground',
        'background',
        '#ffffff'
      ) || '#ffffff';
      const backgroundColor = hasBackgroundColor
        ? (background.backgroundColor || paletteBackgroundColor)
        : paletteBackgroundColor;
      
      // Render background color first if enabled OR if we have a palette color
      if (hasBackgroundColor || (activePalette && backgroundColor !== '#ffffff')) {
        const bgColorRect = new Konva.Rect({
          x: 0,
          y: 0,
          width: width,
          height: height,
          fill: backgroundColor,
          listening: false
        });
        layer.add(bgColorRect);
        bgColorRect.zIndex(0); // Ensure page background is at the bottom
      }
      
      if (imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        // Debug: Log before starting image load
        console.log('[DEBUG renderBackground] ⚠️ STARTING IMAGE LOAD:', {
          imageUrl: imageUrl,
          crossOrigin: img.crossOrigin,
          timestamp: new Date().toISOString()
        });
        
        // Create promise for image loading
        const imagePromise = new Promise((resolveImg, rejectImg) => {
          img.onload = function() {
            console.log('[DEBUG renderBackground] ✅ IMAGE LOADED SUCCESSFULLY:', {
              imageUrl: imageUrl,
              imageWidth: img.width,
              imageHeight: img.height,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              timestamp: new Date().toISOString()
            });
            try {
              const bgImage = new Konva.Image({
                x: 0,
                y: 0,
                image: img,
                width: width,
                height: height,
                opacity: background.opacity !== undefined ? background.opacity : 1,
                listening: false
              });
              
              // Handle image sizing modes
              if (background.imageSize === 'contain') {
                const imgAspect = img.width / img.height;
                const pageAspect = width / height;
                let newWidth, newHeight;
                
                if (imgAspect > pageAspect) {
                  newWidth = width;
                  newHeight = width / imgAspect;
                } else {
                  newHeight = height;
                  newWidth = height * imgAspect;
                }
                
                bgImage.width(newWidth);
                bgImage.height(newHeight);
                
                // Handle positioning
                if (background.imagePosition === 'top-right') {
                  bgImage.x(width - newWidth);
                } else if (background.imagePosition === 'bottom-left') {
                  bgImage.y(height - newHeight);
                } else if (background.imagePosition === 'bottom-right') {
                  bgImage.x(width - newWidth);
                  bgImage.y(height - newHeight);
                }
              } else if (background.imageSize === 'stretch') {
                bgImage.width(width);
                bgImage.height(height);
              }
              // 'cover' is default - already set above
              
              // CRITICAL: Move background image to bottom to ensure it's behind all elements
              layer.add(bgImage);
              bgImage.zIndex(0); // Ensure page background is at the bottom
              layer.draw();
              if (typeof window !== 'undefined' && window.stage) {
                window.stage.draw();
              }
              
              if (callback) callback();
              resolveImg(bgImage);
            } catch (e) {
              console.error('Error creating Konva.Image for background:', e);
              rejectImg(e);
            }
          };
          
          img.onerror = function(error) {
            console.error('[DEBUG renderBackground] ❌ IMAGE LOAD FAILED:', {
              imageUrl: imageUrl,
              error: error,
              errorMessage: error?.message || 'Unknown error',
              errorType: error?.type || 'unknown',
              isS3Url: imageUrl && (imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('s3.us-east-1.amazonaws.com')),
              timestamp: new Date().toISOString(),
              likelyCorsIssue: imageUrl && (imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('s3.us-east-1.amazonaws.com'))
            });
            // Fallback: if backgroundColorEnabled is true, use backgroundColor, otherwise use white
            if (!hasBackgroundColor && (!activePalette || backgroundColor === '#ffffff')) {
              const bgRect = new Konva.Rect({
                x: 0,
                y: 0,
                width: width,
                height: height,
                fill: '#ffffff',
                listening: false
              });
              layer.add(bgRect);
              bgRect.zIndex(0); // Ensure page background is at the bottom
              layer.draw();
              if (typeof window !== 'undefined' && window.stage) {
                window.stage.draw();
              }
            }
            if (callback) callback();
            rejectImg(new Error('Background image failed to load: ' + imageUrl));
          };
          
          img.src = imageUrl;
        });
        
        // Add to imagePromises if provided
        if (imagePromises) {
          imagePromises.push(imagePromise);
        }
        
        // Wait for image to load and resolve main promise
        imagePromise.then((bgImage) => {
          resolve(bgImage);
        }).catch((error) => {
          reject(error);
        });
      } else {
        // No image URL - just render background color if available
        if (callback) callback();
        resolve();
      }
    } else {
      // No background type - render white background
      const bgRect = new Konva.Rect({
        x: 0,
        y: 0,
        width: width,
        height: height,
        fill: '#ffffff',
        listening: false
      });
      layer.add(bgRect);
      bgRect.zIndex(0); // Ensure page background is at the bottom
      if (callback) callback();
      resolve();
    }
  });
}

module.exports = {
  renderBackground
};

