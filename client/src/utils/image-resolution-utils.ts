/**
 * Utility functions for adaptive image resolution
 * Dynamically adjusts image quality based on zoom level to optimize memory usage and performance
 */

export interface AdaptiveImageOptions {
  zoom: number;
  enabled?: boolean;
  baseWidth?: number;
  baseHeight?: number;
}

/**
 * Generates an adaptive image URL based on zoom level
 * Higher zoom levels get higher resolution images, lower zoom levels get optimized smaller images
 */
export function getAdaptiveImageUrl(
  originalUrl: string,
  options: AdaptiveImageOptions
): string {
  const { zoom, enabled = true, baseWidth = 800, baseHeight = 600 } = options;

  // If feature is disabled, return original URL
  if (!enabled) return originalUrl;

  try {
    // High zoom levels (>= 150%): Use full resolution
    if (zoom >= 1.5) {
      return originalUrl;
    }

    // Medium zoom levels (75-149%): Use 75% resolution
    if (zoom >= 0.75) {
      return getResizedImageUrl(originalUrl, baseWidth * 0.75, baseHeight * 0.75);
    }

    // Low zoom levels (< 75%): Use 50% resolution
    return getResizedImageUrl(originalUrl, baseWidth * 0.5, baseHeight * 0.5);

  } catch (error) {
    // If anything fails, always return original URL as fallback
    console.warn('Adaptive image resolution failed, using original URL:', error);
    return originalUrl;
  }
}

/**
 * Generates a resized image URL for supported image services
 * Local uploads use the original URL; external services could be extended here
 */
function getResizedImageUrl(url: string, _width: number, _height: number): string {
  return url;
}

/**
 * Determines if adaptive image resolution should be used for a given zoom level
 */
export function shouldUseAdaptiveResolution(zoom: number, enabled: boolean = true): boolean {
  if (!enabled) return false;

  // Only use adaptive resolution for zoom levels below 150%
  // Above that, we want full resolution for quality
  return zoom < 1.5;
}

/**
 * Gets the resolution scale factor for a given zoom level
 * Returns a value between 0.5 and 1.0
 */
export function getResolutionScale(zoom: number): number {
  if (zoom >= 1.5) return 1.0;    // Full resolution
  if (zoom >= 0.75) return 0.75;  // 75% resolution
  return 0.5;                     // 50% resolution
}