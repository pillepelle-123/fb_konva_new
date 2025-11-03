import type { BackgroundImage, BackgroundImageWithUrl } from '../../types/template-types';
import backgroundImagesData from './background-images.json';

// Import SVG assets (these will be bundled)
// Note: When adding new SVG files, add the import here
import geometricGrid01Svg from '../../assets/background-images/geometric-grid-01.svg';
import natureWaves01Svg from '../../assets/background-images/nature-waves-01.svg';
import abstractBlob01Svg from '../../assets/background-images/abstract-blob-01.svg';
import decorativeBorder01Svg from '../../assets/background-images/decorative-border-01.svg';
import minimalDots01Svg from '../../assets/background-images/minimal-dots-01.svg';
import patternGeometric01Svg from '../../assets/background-images/pattern-geometric-01.svg';
import colorfulGeometric01Svg from '../../assets/background-images/colorful-geometric-01.svg';
// Floral category imports
import abstractFloralAesthetic01Svg from '../../assets/background-images/floral/abstract-floral-aesthetic-01.svg';
import abstractFloralAesthetic02Svg from '../../assets/background-images/floral/abstract-floral-aesthetic-02.svg';
import abstractFloralAesthetic03Svg from '../../assets/background-images/floral/abstract-floral-aesthetic-03.svg';
import abstractFloralAestheticVar01Svg from '../../assets/background-images/floral/abstract-floral-aesthetic-var-01.svg';
import abstractFloralOrganicPastel01Svg from '../../assets/background-images/floral/abstract-floral-organic-pastel-01.svg';
import abstractFloralOrganicPastel02Svg from '../../assets/background-images/floral/abstract-floral-organic-pastel-02.svg';
import aestheticMinimalistBackground01Svg from '../../assets/background-images/floral/aesthetic-minimalist-background_01.svg';
import blackColorSimpleNaturalLeaf01Svg from '../../assets/background-images/floral/black-color-simple-natural-leaf-01.svg';
import botanicalFloralElementHandDrawn01Svg from '../../assets/background-images/floral/botanical-floral-element-hand-drawn-01.svg';
import leopardPattern01Svg from '../../assets/background-images/floral/leopard-pattern-01.svg';
import simpleCleanGreenFloral01Svg from '../../assets/background-images/floral/simple-clean-green-floral-01.svg';
import simpleCleanGreenFloral02Svg from '../../assets/background-images/floral/simple-clean-green-floral-02.svg';
import simpleCleanGreenFloral03Svg from '../../assets/background-images/floral/simple-clean-green-floral-03.svg';

// SVG import mapping: filename -> imported asset URL
// Note: For files in subfolders, use the full relative path from background-images/
const svgImports: Record<string, string> = {
  'geometric-grid-01.svg': geometricGrid01Svg,
  'nature-waves-01.svg': natureWaves01Svg,
  'abstract-blob-01.svg': abstractBlob01Svg,
  'decorative-border-01.svg': decorativeBorder01Svg,
  'minimal-dots-01.svg': minimalDots01Svg,
  'pattern-geometric-01.svg': patternGeometric01Svg,
  'colorful-geometric-01.svg': colorfulGeometric01Svg,
  // Floral category
  'floral/abstract-floral-aesthetic-01.svg': abstractFloralAesthetic01Svg,
  'floral/abstract-floral-aesthetic-02.svg': abstractFloralAesthetic02Svg,
  'floral/abstract-floral-aesthetic-03.svg': abstractFloralAesthetic03Svg,
  'floral/abstract-floral-aesthetic-var-01.svg': abstractFloralAestheticVar01Svg,
  'floral/abstract-floral-organic-pastel-01.svg': abstractFloralOrganicPastel01Svg,
  'floral/abstract-floral-organic-pastel-02.svg': abstractFloralOrganicPastel02Svg,
  'floral/aesthetic-minimalist-background_01.svg': aestheticMinimalistBackground01Svg,
  'floral/black-color-simple-natural-leaf-01.svg': blackColorSimpleNaturalLeaf01Svg,
  'floral/botanical-floral-element-hand-drawn-01.svg': botanicalFloralElementHandDrawn01Svg,
  'floral/leopard-pattern-01.svg': leopardPattern01Svg,
  'floral/simple-clean-green-floral-01.svg': simpleCleanGreenFloral01Svg,
  'floral/simple-clean-green-floral-02.svg': simpleCleanGreenFloral02Svg,
  'floral/simple-clean-green-floral-03.svg': simpleCleanGreenFloral03Svg,
};

// Load images from JSON file
export const backgroundImages: BackgroundImage[] = (backgroundImagesData as { images: BackgroundImage[] }).images;

/**
 * Resolve image URL based on format
 * - Vector (SVG): Uses import mapping (bundled asset)
 * - Pixel (PNG/JPG): Uses static path from public folder
 */
function resolveImageUrl(image: BackgroundImage, isThumbnail = false): string {
  const filePath = isThumbnail ? image.thumbnail : image.filePath;
  
  if (image.format === 'vector') {
    // SVG files are bundled, use import mapping
    // First try with full path (for subfolder files like floral/image.svg)
    const importedUrl = svgImports[filePath];
    if (importedUrl) {
      return importedUrl;
    }
    // Fallback: try with just filename (for root-level files)
    const fileName = filePath.split('/').pop() || filePath;
    const importedUrlByName = svgImports[fileName];
    if (importedUrlByName) {
      return importedUrlByName;
    }
    // Fallback: try to construct path (shouldn't happen if all SVGs are imported)
    console.warn(`SVG import not found for ${filePath} (id: ${image.id}). Available keys:`, Object.keys(svgImports).filter(k => k.includes('floral')).slice(0, 5));
    return `/src/assets/background-images/${filePath}`;
  } else {
    // Pixel images are static, use as-is (path should already be absolute from public/)
    return filePath.startsWith('/') ? filePath : `/background-images/${filePath}`;
  }
}

/**
 * Get all background images
 */
export function getBackgroundImages(): BackgroundImage[] {
  return backgroundImages;
}

/**
 * Get background image by ID
 */
export function getBackgroundImageById(id: string): BackgroundImage | undefined {
  return backgroundImages.find(img => img.id === id);
}

/**
 * Get background images by category
 */
export function getBackgroundImagesByCategory(category: BackgroundImage['category']): BackgroundImage[] {
  return backgroundImages.filter(img => img.category === category);
}

/**
 * Get background images by format
 */
export function getBackgroundImagesByFormat(format: 'vector' | 'pixel'): BackgroundImage[] {
  return backgroundImages.filter(img => img.format === format);
}

/**
 * Search background images by name or tags
 */
export function searchBackgroundImages(query: string): BackgroundImage[] {
  const lowerQuery = query.toLowerCase();
  return backgroundImages.filter(img => {
    const nameMatch = img.name.toLowerCase().includes(lowerQuery);
    const descMatch = img.description?.toLowerCase().includes(lowerQuery);
    const tagMatch = img.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
    return nameMatch || descMatch || tagMatch;
  });
}

/**
 * Get background image with resolved URLs
 */
export function getBackgroundImageWithUrl(id: string): BackgroundImageWithUrl | undefined {
  const image = getBackgroundImageById(id);
  if (!image) return undefined;
  
  return {
    ...image,
    url: resolveImageUrl(image, false),
    thumbnailUrl: resolveImageUrl(image, true),
  };
}

/**
 * Get all background images with resolved URLs
 */
export function getBackgroundImagesWithUrl(): BackgroundImageWithUrl[] {
  return backgroundImages.map(image => ({
    ...image,
    url: resolveImageUrl(image, false),
    thumbnailUrl: resolveImageUrl(image, true),
  }));
}

/**
 * Get all available categories
 */
export function getBackgroundImageCategories(): BackgroundImage['category'][] {
  const categories = new Set<BackgroundImage['category']>();
  backgroundImages.forEach(img => categories.add(img.category));
  return Array.from(categories);
}
