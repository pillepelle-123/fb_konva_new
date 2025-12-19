/**
 * Main rendering function for PDF export
 * This is the entry point for rendering a complete page with Konva
 */

const { renderBackground } = require('./render-background');
const { renderElement } = require('./render-element');
const { loadThemes } = require('./utils/theme-server');
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
  // Sort elements by z-order
  const originalElements = pageData.elements || [];
  const elements = originalElements.slice().sort((a, b) => {
    // For all elements: maintain array order (z-order)
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
    const elementId = child.getAttr('__elementId');
    const nodeType = child.getAttr('__nodeType');
    const isQnaNode = child.getAttr('__isQnaNode');
    const className = child.getClassName();
    console.log(`[DEBUG z-order]   [${idx}] ${className} - zOrder: ${zOrder !== undefined ? zOrder : 'undefined (sync)'}, isFrame: ${isFrame || false}, elementId: ${elementId || 'undefined'}, nodeType: ${nodeType || 'undefined'}, isQnaNode: ${isQnaNode || false}`);
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
    const elementId = child.getAttr('__elementId');
    const nodeType = child.getAttr('__nodeType');
    
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
    
    // Store original opacity before reordering
    const originalOpacity = child.opacity();
    
    allElements.push({
      node: child,
      zOrder: elementZOrder,
      isFrame: isFrame || false,
      originalIndex: i,
      elementId: elementId,
      nodeType: nodeType,
      originalOpacity: originalOpacity
    });
  }
  
  // Define node type order for QnA elements (within each element, maintain this order)
  // Text should appear above border and ruled lines
  const nodeTypeOrder = {
    'qna-background': 0,
    'qna-line': 1,
    'qna-border': 2,
    'qna-text': 3
  };
  
  // Sort all elements by z-order, frames come after their parent image
  // For elements with the same z-order and elementId, maintain node type order
  allElements.sort((a, b) => {
    if (a.zOrder !== b.zOrder) {
      return a.zOrder - b.zOrder;
    }
    // If same z-order, frames should come after images
    if (a.isFrame && !b.isFrame) return 1;
    if (!a.isFrame && b.isFrame) return -1;
    
    // If same z-order and same elementId, sort by node type (for QnA elements)
    if (a.elementId && b.elementId && a.elementId === b.elementId) {
      const aOrder = nodeTypeOrder[a.nodeType || ''] ?? 999;
      const bOrder = nodeTypeOrder[b.nodeType || ''] ?? 999;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      // If same node type, maintain original order
      return a.originalIndex - b.originalIndex;
    }
    
    // If same z-order but different elements, maintain original insertion order
    // This preserves the intended z-order from the elements array
    return a.originalIndex - b.originalIndex;
  });
  
  console.log('[DEBUG z-order] All elements after sorting (total:', allElements.length, '):');
  allElements.forEach((el, idx) => {
    const className = el.node.getClassName();
    const elementId = el.elementId;
    const nodeType = el.nodeType;
    const isQnaNode = el.node.getAttr('__isQnaNode');
    console.log(`[DEBUG z-order]   [${idx}] ${className} - zOrder: ${el.zOrder}, isFrame: ${el.isFrame}, originalIndex: ${el.originalIndex}, elementId: ${elementId || 'undefined'}, nodeType: ${nodeType || 'undefined'}, isQnaNode: ${isQnaNode || false}`);
  });
  
  // Reposition all elements in correct z-order
  // Instead of using moveTo() which can fail, remove all elements and re-add them in correct order
  // This matches the approach used in pdf-renderer.tsx
  console.log('[DEBUG z-order] Repositioning elements...');
  console.log('[DEBUG z-order] Layer children before reordering:', layer.getChildren().length);
  
  // Store original opacity for all nodes before removing
  allElements.forEach((el) => {
    if (el.originalOpacity === undefined) {
      el.originalOpacity = el.node.opacity();
    }
  });
  
  // Remove all elements from layer (except background at index 0)
  const backgroundNode = layer.getChildren()[0];
  layer.removeChildren();
  
  // Re-add background first
  if (backgroundNode) {
    layer.add(backgroundNode);
  }
  
  // Re-add all elements in sorted order
  allElements.forEach((el, i) => {
    try {
      layer.add(el.node);
      // Restore original opacity if it was stored
      if (el.originalOpacity !== undefined && el.originalOpacity !== null) {
        el.node.opacity(el.originalOpacity);
      }
      console.log(`[DEBUG z-order] Added ${el.node.getClassName()} at position ${i + 1} (zOrder: ${el.zOrder}, elementId: ${el.elementId || 'undefined'}, nodeType: ${el.nodeType || 'undefined'}, originalIndex: ${el.originalIndex})`);
    } catch (error) {
      console.error(`[DEBUG z-order] Error adding node at position ${i + 1}:`, error);
    }
  });
  
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

