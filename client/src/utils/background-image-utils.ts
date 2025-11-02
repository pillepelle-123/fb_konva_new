import type { PageBackground } from '../context/editor-context';
import type { BackgroundImage } from '../types/template-types';
import { getBackgroundImageById, getBackgroundImageWithUrl } from '../data/templates/background-images';

/**
 * Apply background image template to PageBackground
 */
export function applyBackgroundImageTemplate(
  templateId: string,
  customSettings?: {
    imageSize?: PageBackground['imageSize'];
    imageRepeat?: boolean;
    backgroundColor?: string;
    opacity?: number;
  }
): PageBackground | null {
  const template = getBackgroundImageWithUrl(templateId);
  if (!template) {
    console.warn(`Background image template not found: ${templateId}`);
    return null;
  }

  // Map defaultSize to imageSize and imageRepeat
  let imageSize: PageBackground['imageSize'] = 'cover';
  let imageRepeat = false;
  
  if (customSettings?.imageSize) {
    imageSize = customSettings.imageSize;
    imageRepeat = customSettings.imageRepeat ?? false;
  } else {
    switch (template.defaultSize) {
      case 'cover':
        imageSize = 'cover';
        imageRepeat = false;
        break;
      case 'contain':
        imageSize = 'contain';
        imageRepeat = false;
        break;
      case 'contain-repeat':
        imageSize = 'contain';
        imageRepeat = true;
        break;
      case 'stretch':
        imageSize = 'stretch';
        imageRepeat = false;
        break;
      default:
        imageSize = 'cover';
        imageRepeat = false;
    }
  }

  const background: PageBackground = {
    type: 'image',
    value: template.url,
    opacity: customSettings?.opacity ?? 1,
    imageSize,
    imageRepeat,
    backgroundImageTemplateId: templateId,
  };

  // Apply background color if enabled and provided
  if (template.backgroundColor?.enabled && customSettings?.backgroundColor) {
    // Background color is applied via a separate Rect layer in canvas rendering
    // Store it in a custom property for rendering
    (background as any).backgroundColor = customSettings.backgroundColor;
    (background as any).backgroundColorEnabled = true;
  } else if (template.backgroundColor?.enabled && template.backgroundColor.defaultValue) {
    (background as any).backgroundColor = template.backgroundColor.defaultValue;
    (background as any).backgroundColorEnabled = true;
  }

  return background;
}

/**
 * Get background image URL for a template ID
 */
export function getBackgroundImageUrl(templateId: string): string | undefined {
  const template = getBackgroundImageWithUrl(templateId);
  return template?.url;
}

/**
 * Get background image thumbnail URL for a template ID
 */
export function getBackgroundImageThumbnailUrl(templateId: string): string | undefined {
  const template = getBackgroundImageWithUrl(templateId);
  return template?.thumbnailUrl;
}

/**
 * Validate background image template
 */
export function validateBackgroundImageTemplate(templateId: string): {
  valid: boolean;
  error?: string;
} {
  const template = getBackgroundImageById(templateId);
  if (!template) {
    return {
      valid: false,
      error: `Background image template not found: ${templateId}`,
    };
  }

  // Additional validation could be added here
  // e.g., check if file exists, validate imageSize values, etc.

  return { valid: true };
}

/**
 * Resolve image URL from PageBackground (handles both template and direct URLs)
 */
export function resolveBackgroundImageUrl(background: PageBackground): string | undefined {
  if (background.type !== 'image') {
    return undefined;
  }

  // If using template, resolve template URL
  if (background.backgroundImageTemplateId) {
    return getBackgroundImageUrl(background.backgroundImageTemplateId);
  }

  // Otherwise use direct value
  return background.value;
}

/**
 * Check if background uses a template
 */
export function isTemplateBackground(background: PageBackground): boolean {
  return background.type === 'image' && !!background.backgroundImageTemplateId;
}

