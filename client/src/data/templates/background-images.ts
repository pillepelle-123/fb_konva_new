import type { BackgroundImage, BackgroundImageWithUrl } from '../../types/template-types';
import backgroundImagesData from './background-images.json';

// Import SVG assets (these will be bundled)
// Note: When adding new SVG files, add the import here

import colorfulGeometric01Svg from '../../assets/background-images/colorful-geometric-01.svg';
// Floral category imports
import abstractFloralAesthetic01Svg from '../../assets/background-images/floral/abstract-floral-aesthetic-01.svg';
import abstractFloralAesthetic02Svg from '../../assets/background-images/floral/abstract-floral-aesthetic-02.svg';
import abstractFloralAesthetic03Svg from '../../assets/background-images/floral/abstract-floral-aesthetic-03.svg';
import abstractFloralAestheticVar01Svg from '../../assets/background-images/floral/abstract-floral-aesthetic-var-01.svg';
import abstractFloralOrganicPastel01Svg from '../../assets/background-images/floral/abstract-floral-organic-pastel-01.svg';
import aestheticMinimalistBackground01Svg from '../../assets/background-images/floral/aesthetic-minimalist-background_01.svg';
import aestheticMinimalistBackground01SvgRaw from '../../assets/background-images/floral/aesthetic-minimalist-background_01.svg?raw';
import leopardPattern01Svg from '../../assets/background-images/floral/leopard-pattern-01.svg';
import abstractFloralAesthetic01SvgRaw from '../../assets/background-images/floral/abstract-floral-aesthetic-01.svg?raw';
import abstractFloralAesthetic02SvgRaw from '../../assets/background-images/floral/abstract-floral-aesthetic-02.svg?raw';
import abstractFloralAesthetic03SvgRaw from '../../assets/background-images/floral/abstract-floral-aesthetic-03.svg?raw';
import abstractFloralAestheticVar01SvgRaw from '../../assets/background-images/floral/abstract-floral-aesthetic-var-01.svg?raw';
import abstractFloralOrganicPastel01SvgRaw from '../../assets/background-images/floral/abstract-floral-organic-pastel-01.svg?raw';
import leopardPattern01SvgRaw from '../../assets/background-images/floral/leopard-pattern-01.svg?raw';

// SVG import mapping: filename -> imported asset URL
// Note: For files in subfolders, use the full relative path from background-images/
const svgImports: Record<string, string> = {
  'colorful-geometric-01.svg': colorfulGeometric01Svg,
  // Floral category
  'floral/abstract-floral-aesthetic-01.svg': abstractFloralAesthetic01Svg,
  'floral/abstract-floral-aesthetic-02.svg': abstractFloralAesthetic02Svg,
  'floral/abstract-floral-aesthetic-03.svg': abstractFloralAesthetic03Svg,
  'floral/abstract-floral-aesthetic-var-01.svg': abstractFloralAestheticVar01Svg,
  'floral/abstract-floral-organic-pastel-01.svg': abstractFloralOrganicPastel01Svg,
  'floral/aesthetic-minimalist-background_01.svg': aestheticMinimalistBackground01Svg,
  'floral/leopard-pattern-01.svg': leopardPattern01Svg,
};

export const svgRawImports: Record<string, string | undefined> = {
  'floral/aesthetic-minimalist-background_01.svg': aestheticMinimalistBackground01SvgRaw,
  'floral/abstract-floral-aesthetic-01.svg': abstractFloralAesthetic01SvgRaw,
  'floral/abstract-floral-aesthetic-02.svg': abstractFloralAesthetic02SvgRaw,
  'floral/abstract-floral-aesthetic-03.svg': abstractFloralAesthetic03SvgRaw,
  'floral/abstract-floral-aesthetic-var-01.svg': abstractFloralAestheticVar01SvgRaw,
  'floral/abstract-floral-organic-pastel-01.svg': abstractFloralOrganicPastel01SvgRaw,
  'floral/leopard-pattern-01.svg': leopardPattern01SvgRaw,
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
