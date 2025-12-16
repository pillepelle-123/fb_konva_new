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
  
  // Render all elements in their array order (z-order)
  // Only sort qna_inline elements by questionOrder if needed
  const originalElements = pageData.elements || [];
  const elements = originalElements.slice().sort((a, b) => {
    // qna_inline elements: sort by questionOrder first
    if (a.textType === 'qna_inline' && b.textType === 'qna_inline') {
      const orderA = a.questionOrder ?? Infinity;
      const orderB = b.questionOrder ?? Infinity;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // If order is the same, maintain array order (z-order)
      const indexA = originalElements.findIndex(el => el.id === a.id);
      const indexB = originalElements.findIndex(el => el.id === b.id);
      return indexA - indexB;
    }
    
    // If only one is qna_inline, prioritize it based on questionOrder
    if (a.textType === 'qna_inline') {
      const orderA = a.questionOrder ?? Infinity;
      return orderA === Infinity ? 1 : -1; // qna_inline with order comes first
    }
    if (b.textType === 'qna_inline') {
      const orderB = b.questionOrder ?? Infinity;
      return orderB === Infinity ? -1 : 1; // qna_inline with order comes first
    }
    
    // For all other elements: maintain array order (z-order)
    // This preserves the z-order set by MOVE_ELEMENT actions
    const indexA = originalElements.findIndex(el => el.id === a.id);
    const indexB = originalElements.findIndex(el => el.id === b.id);
    return indexA - indexB;
  });
  
  let elementsRendered = 0;
  let elementsSkipped = 0;
  
  // Track z-order positions for async elements (images/stickers)
  // We need to know how many elements have been rendered synchronously before each async element
  let syncElementCount = 0;
  
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    // Debug logging for all elements before rendering
    console.log('[renderPageWithKonva] Processing element:', {
      id: element.id,
      type: element.type,
      textType: element.textType,
      questionId: element.questionId,
      zOrderIndex: i
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
    
    // Render element with z-order index
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
      imagePromises,
      i, // z-order index
      syncElementCount // current sync element count (for async elements)
    );
    
    // Increment sync element count if element was rendered synchronously
    if (renderedNode && renderedNode.type !== 'image-loading') {
      syncElementCount++;
    }
    
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
  
  // After all elements are processed, ensure correct z-order for all elements
  // Wait for all image promises to resolve first
  console.log('[DEBUG z-order] ⚠️ STARTING Z-ORDER FIX - imagePromises.length:', imagePromises.length);
  if (imagePromises.length > 0) {
    console.log('[DEBUG z-order] ⚠️ Waiting for image promises to resolve...');
    await Promise.all(imagePromises);
    console.log('[DEBUG z-order] ✅ All image promises resolved');
  } else {
    console.log('[DEBUG z-order] ⚠️ No image promises to wait for');
  }
  
  // Debug: Log original element order from sorted array
  // Use console.log with explicit formatting for browser context
  console.log('[DEBUG z-order] ========================================');
  console.log('[DEBUG z-order] Original sorted elements array:');
  elements.forEach((el, idx) => {
    console.log(`[DEBUG z-order]   [${idx}] ${el.type}${el.textType ? ' (textType: ' + el.textType + ')' : ''} - id: ${el.id}`);
  });
  console.log('[DEBUG z-order] ========================================');
  
  // Now reorder ALL elements (sync and async) based on their z-order
  // Simple approach: collect all elements with their z-order, sort, and reposition
  const allElements = [];
  const children = layer.children.slice(); // Copy to avoid modification during iteration
  
  console.log('[DEBUG z-order] Layer children before reordering (total:', children.length, '):');
  children.forEach((child, idx) => {
    const zOrder = child.getAttr('__zOrderIndex');
    const isFrame = child.getAttr('__isFrame');
    const className = child.getClassName();
    console.log(`[DEBUG z-order]   [${idx}] ${className} - zOrder: ${zOrder !== undefined ? zOrder : 'undefined (sync)'}, isFrame: ${isFrame || false}`);
  });
  
  // Create a map of element IDs to their z-order index in the sorted array
  // This is the source of truth for z-order
  const elementIdToZOrder = new Map();
  elements.forEach((el, idx) => {
    elementIdToZOrder.set(el.id, idx);
  });
  
  // Collect all elements (except background at index 0) with their z-order
  for (let i = 1; i < children.length; i++) {
    const child = children[i];
    const storedZOrder = child.getAttr('__zOrderIndex');
    const isFrame = child.getAttr('__isFrame');
    const parentImageId = child.getAttr('__parentImageId');
    
    // Try to find the element ID from the node
    // For QnA elements, we need to find the element that created this node
    // For images, we stored the zOrderIndex directly
    // For frames, we stored the parentImageId
    
    let elementZOrder = storedZOrder;
    
    // If we don't have a stored zOrder, try to find it from the element ID
    // We need to match the node to an element in the sorted array
    // This is tricky because we don't store element IDs on nodes directly
    // For now, if we have storedZOrder, use it; otherwise, we need a different approach
    
    // For frames, use the parent image's z-order
    if (isFrame && parentImageId) {
      const parentZOrder = elementIdToZOrder.get(parentImageId);
      if (parentZOrder !== undefined) {
        elementZOrder = parentZOrder;
      }
    }
    
    // If we still don't have a zOrder, we can't determine it reliably
    // This should not happen if we stored zOrderIndex on all nodes
    if (elementZOrder === undefined) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`[DEBUG z-order] ⚠️ Could not determine z-order for node at index ${i}, using fallback: ${i - 1}`);
      }
      elementZOrder = i - 1; // Fallback to current position
    }
    
    allElements.push({
      node: child,
      zOrder: elementZOrder,
      isFrame: isFrame || false,
      originalIndex: i
    });
  }
  
  // Sort all elements by z-order, frames come after their parent image
  allElements.sort((a, b) => {
    if (a.zOrder !== b.zOrder) {
      return a.zOrder - b.zOrder;
    }
    // If same z-order, frames should come after images
    if (a.isFrame && !b.isFrame) return 1;
    if (!a.isFrame && b.isFrame) return -1;
    return 0;
  });
  
  console.log('[DEBUG z-order] All elements after sorting (total:', allElements.length, '):');
  allElements.forEach((el, idx) => {
    const className = el.node.getClassName();
    console.log(`[DEBUG z-order]   [${idx}] ${className} - zOrder: ${el.zOrder}, isFrame: ${el.isFrame}, originalIndex: ${el.originalIndex}`);
  });
  
  // Reposition all elements in correct z-order
  // Background stays at index 0, elements start at index 1
  console.log('[DEBUG z-order] Repositioning elements...');
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const targetPosition = i + 1; // +1 because background is at index 0
    console.log(`[DEBUG z-order] Moving ${el.node.getClassName()} from position ${el.originalIndex} to position ${targetPosition}`);
    el.node.moveTo(targetPosition);
  }
  
  console.log('[DEBUG z-order] Layer children after reordering (total:', layer.children.length, '):');
  layer.children.forEach((child, idx) => {
    const zOrder = child.getAttr('__zOrderIndex');
    const isFrame = child.getAttr('__isFrame');
    const className = child.getClassName();
    console.log(`[DEBUG z-order]   [${idx}] ${className} - zOrder: ${zOrder !== undefined ? zOrder : 'undefined (sync)'}, isFrame: ${isFrame || false}`);
  });
  console.log('[DEBUG z-order] ========================================');
  
  // Return layer and image promises
  return {
    layer,
    imagePromises
  };
}

module.exports = {
  renderPageWithKonva
};

