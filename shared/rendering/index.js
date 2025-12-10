/**
 * Main rendering function for PDF export
 * This is the entry point for rendering a complete page with Konva
 */

const { renderBackground } = require('./render-background');
const { renderElement } = require('./render-element');
const { loadThemes } = require('./utils/theme-utils');
const { loadColorPalettes } = require('./utils/palette-utils');

/**
 * Render a complete page with Konva
 * @param {Object} pageData - Page data with elements and background
 * @param {Object} bookData - Book data with questions and themes
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {Object} konvaInstance - Konva instance (e.g., window.Konva)
 * @param {Object} document - Document object
 * @param {Object} Image - Image constructor
 * @param {Object} options - Options object with rough instance, etc.
 * @returns {Promise<Object>} Promise that resolves with { layer, imagePromises }
 */
async function renderPageWithKonva(pageData, bookData, canvasWidth, canvasHeight, konvaInstance, document, Image, options = {}) {
  // Extract token and apiUrl from options for background rendering
  const backgroundOptions = {
    token: options.token || null,
    apiUrl: options.apiUrl || '/api'
  };
  const Konva = konvaInstance;
  const roughInstance = options.rough;
  
  // Debug: Log rough instance availability - ALWAYS log
  console.log('[DEBUG renderPageWithKonva] ⚠️ ROUGH INSTANCE CHECK:', {
    hasRoughInstance: !!roughInstance,
    roughInstanceType: typeof roughInstance,
    roughInstanceExists: roughInstance !== null && roughInstance !== undefined,
    hasSvgFunction: roughInstance && typeof roughInstance.svg === 'function',
    hasCanvasFunction: roughInstance && typeof roughInstance.canvas === 'function',
    pageTheme: pageData.theme || bookData.theme || 'default',
    willNeedRough: (pageData.theme === 'rough' || bookData.theme === 'rough')
  });
  
  // Load themes and color palettes
  const themesData = loadThemes();
  const colorPalettes = loadColorPalettes();
  
  // Create a new layer for this page
  const layer = new Konva.Layer();
  
  // Initialize image promises array
  const imagePromises = [];
  
  // Render background first (it will be behind all elements)
  await renderBackground(
    layer,
    pageData,
    bookData,
    canvasWidth,
    canvasHeight,
    konvaInstance,
    document,
    Image,
    null, // callback
    imagePromises, // Pass imagePromises to track background image loading
    backgroundOptions // Pass options with token and apiUrl for proxy
  );
  
  // Render all elements
  // Sort elements to ensure correct z-order (like client-side rendering)
  // Priority: zIndex > y position
  const elements = (pageData.elements || []).slice().sort((a, b) => {
    // First, sort by zIndex if available (like PDFRenderer does)
    const aZ = a.zIndex ?? 0;
    const bZ = b.zIndex ?? 0;
    if (aZ !== bZ) {
      return aZ - bZ;
    }
    
    // For all elements, maintain original order (by y position)
    return (a.y ?? 0) - (b.y ?? 0);
  });
  
  let elementsRendered = 0;
  let elementsSkipped = 0;
  
  for (const element of elements) {
    // Debug logging for all elements before rendering
    console.log('[renderPageWithKonva] Processing element:', {
      id: element.id,
      type: element.type,
      textType: element.textType,
      questionId: element.questionId
    });
    
    // Skip placeholder elements
    if (element.type === 'placeholder') {
      elementsSkipped++;
      continue;
    }
    
    // Skip brush-multicolor elements (they are rendered as groups)
    if (element.type === 'brush-multicolor') {
      elementsSkipped++;
      continue;
    }
    
    // Render element
    const renderedNode = renderElement(
      layer,
      element,
      pageData,
      bookData,
      konvaInstance,
      document,
      Image,
      roughInstance,
      themesData,
      colorPalettes,
      imagePromises
    );
    
    console.log('[renderPageWithKonva] Element rendered:', {
      id: element.id,
      rendered: !!renderedNode,
      type: renderedNode?.type
    });
    
    if (renderedNode) {
      elementsRendered++;
    } else {
      elementsSkipped++;
    }
  }
  
  // Return layer and image promises
  return {
    layer,
    imagePromises
  };
}

module.exports = {
  renderPageWithKonva
};

