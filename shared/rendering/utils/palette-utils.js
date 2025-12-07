/**
 * Palette utility functions for PDF rendering
 */

const path = require('path');
const fs = require('fs');

// Load color palettes from JSON file
let COLOR_PALETTES = null;

function loadColorPalettes() {
  if (COLOR_PALETTES) return COLOR_PALETTES;
  
  try {
    // Try to load from shared directory first (preferred)
    const sharedPath = path.join(__dirname, '../../data/templates/color-palettes.json');
    if (fs.existsSync(sharedPath)) {
      const data = JSON.parse(fs.readFileSync(sharedPath, 'utf-8'));
      COLOR_PALETTES = data.palettes || [];
      return COLOR_PALETTES;
    }
    
    // Fallback to client directory (for backward compatibility)
    const clientPath = path.join(__dirname, '../../../client/src/data/templates/color-palettes.json');
    if (fs.existsSync(clientPath)) {
      const data = JSON.parse(fs.readFileSync(clientPath, 'utf-8'));
      COLOR_PALETTES = data.palettes || [];
      return COLOR_PALETTES;
    }
  } catch (error) {
    console.warn('Could not load color palettes:', error);
  }
  
  // Fallback to empty array
  COLOR_PALETTES = [];
  return COLOR_PALETTES;
}

const DEFAULT_PALETTE_PARTS = {
  pageBackground: 'surface',
  pagePatternForeground: 'primary',
  pagePatternBackground: 'background',
  qnaBorder: 'primary',
  qnaBackground: 'surface',
  qnaQuestionText: 'text',
  qnaQuestionBackground: 'surface',
  qnaQuestionBorder: 'secondary',
  qnaAnswerText: 'text',
  qnaAnswerBackground: 'surface',
  qnaAnswerBorder: 'primary',
  qnaAnswerRuledLines: 'primary',
  freeTextText: 'text',
  freeTextBorder: 'secondary',
  freeTextBackground: 'surface',
  freeTextRuledLines: 'accent',
  shapeStroke: 'primary',
  shapeFill: 'surface',
  lineStroke: 'primary',
  brushStroke: 'primary'
};

/**
 * Get color from palette part
 * @param {Object} palette - Color palette object
 * @param {string} partName - Part name (e.g., 'pageBackground')
 * @param {string} fallbackSlot - Fallback slot name
 * @param {string} fallbackColor - Fallback color
 * @returns {string|undefined} Color value
 */
function getPalettePartColor(palette, partName, fallbackSlot, fallbackColor) {
  if (!palette) return fallbackColor;
  
  const palettes = loadColorPalettes();
  const normalizedPalette = palettes.find(p => p.id === palette.id || p.id === palette) || palette;
  
  if (!normalizedPalette || !normalizedPalette.colors) return fallbackColor;
  
  const slot = (normalizedPalette.parts || DEFAULT_PALETTE_PARTS)[partName];
  if (slot && normalizedPalette.colors[slot]) {
    return normalizedPalette.colors[slot];
  }
  
  if (fallbackSlot && normalizedPalette.colors[fallbackSlot]) {
    return normalizedPalette.colors[fallbackSlot];
  }
  
  return fallbackColor;
}

/**
 * Resolve background image URL with palette colors applied
 * @param {Object} background - Background object
 * @param {Object} options - Options with paletteId and paletteColors
 * @returns {string|undefined} Resolved image URL
 */
function resolveBackgroundImageUrl(background, options = {}) {
  if (!background || background.type !== 'image') {
    return undefined;
  }
  
  // If using template, resolve template URL (with palette support for SVGs)
  if (background.backgroundImageTemplateId) {
    const shouldApplyPalette = background.applyPalette !== false;
    
    if (shouldApplyPalette && options.paletteId) {
      // For SVG backgrounds, we would apply palette colors here
      // For now, return the direct value
      // TODO: Implement SVG palette color application
    }
    
    // Return direct value for now
    return background.value;
  }
  
  // Otherwise use direct value
  return background.value;
}

/**
 * Get palette by ID
 * @param {string} paletteId - Palette ID
 * @returns {Object|undefined} Palette object
 */
function getPalette(paletteId) {
  if (!paletteId) return undefined;
  
  const palettes = loadColorPalettes();
  return palettes.find(p => p.id === paletteId);
}

/**
 * Resolve image URL through proxy if it's an S3 URL and token is available
 * This helps avoid CORS issues when loading images from S3 into Konva canvas
 * @param {string} imageUrl - Original image URL
 * @param {string|null} token - Authentication token (optional)
 * @param {string} apiUrl - API base URL (optional, defaults to /api)
 * @returns {string} Resolved image URL (proxy URL if S3, original URL otherwise)
 */
function resolveImageUrlThroughProxy(imageUrl, token = null, apiUrl = '/api') {
  if (!imageUrl) return imageUrl;
  
  // Check if this is an S3 URL that might have CORS issues
  const isS3Url = imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('s3.us-east-1.amazonaws.com');
  
  // For S3 URLs, use the proxy endpoint to avoid CORS issues
  if (isS3Url && token) {
    return `${apiUrl}/images/proxy?url=${encodeURIComponent(imageUrl)}&token=${encodeURIComponent(token)}`;
  }
  
  // Return original URL if not S3 or no token available
  return imageUrl;
}

module.exports = {
  getPalettePartColor,
  resolveBackgroundImageUrl,
  getPalette,
  loadColorPalettes,
  resolveImageUrlThroughProxy
};






