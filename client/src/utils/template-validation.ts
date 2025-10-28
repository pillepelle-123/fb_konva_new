import type { PageTemplate, ColorPalette } from '../types/template-types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate template data structure
 */
export function validateTemplate(template: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!template.id) errors.push('Template ID is required');
  if (!template.name) errors.push('Template name is required');
  if (!template.category) errors.push('Template category is required');
  if (!template.elements || !Array.isArray(template.elements)) {
    errors.push('Template elements array is required');
  }
  if (!template.background) errors.push('Template background is required');
  if (!template.colorPalette) errors.push('Template color palette is required');

  // Validate elements
  if (template.elements) {
    template.elements.forEach((element: any, index: number) => {
      if (!element.id) errors.push(`Element ${index} missing ID`);
      if (!element.type) errors.push(`Element ${index} missing type`);
      if (typeof element.x !== 'number') errors.push(`Element ${index} missing x coordinate`);
      if (typeof element.y !== 'number') errors.push(`Element ${index} missing y coordinate`);
      if (typeof element.width !== 'number') errors.push(`Element ${index} missing width`);
      if (typeof element.height !== 'number') errors.push(`Element ${index} missing height`);
    });
  }

  // Validate background
  if (template.background) {
    if (!template.background.type) errors.push('Background type is required');
    if (!template.background.value) errors.push('Background value is required');
  }

  // Validate color palette
  if (template.colorPalette) {
    const requiredColors = ['primary', 'secondary', 'background', 'text'];
    requiredColors.forEach(color => {
      if (!template.colorPalette[color]) {
        warnings.push(`Missing recommended color: ${color}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate color palette
 */
export function validateColorPalette(palette: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!palette.id) errors.push('Palette ID is required');
  if (!palette.name) errors.push('Palette name is required');
  if (!palette.colors || typeof palette.colors !== 'object') {
    errors.push('Palette colors object is required');
  }

  // Check for valid hex colors
  if (palette.colors) {
    Object.entries(palette.colors).forEach(([key, value]) => {
      if (typeof value === 'string' && value !== 'transparent') {
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexRegex.test(value as string)) {
          errors.push(`Invalid color format for ${key}: ${value}`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check template compatibility with current page
 */
export function checkTemplateCompatibility(template: PageTemplate, pageElements: any[]): ValidationResult {
  const warnings: string[] = [];

  if (pageElements.length > 0) {
    warnings.push('Applying template will replace existing page content');
  }

  const questionElements = template.elements.filter(el => el.textType === 'question');
  if (questionElements.length > 5) {
    warnings.push('Template contains many questions - may affect page performance');
  }

  const imageElements = template.elements.filter(el => el.type === 'image');
  if (imageElements.length > 3) {
    warnings.push('Template contains multiple images - ensure you have content ready');
  }

  return {
    isValid: true,
    errors: [],
    warnings
  };
}

/**
 * Sanitize template data
 */
export function sanitizeTemplate(template: any): PageTemplate | null {
  try {
    const validation = validateTemplate(template);
    if (!validation.isValid) {
      console.error('Template validation failed:', validation.errors);
      return null;
    }

    // Ensure required properties exist with defaults
    return {
      id: template.id,
      name: template.name,
      category: template.category,
      theme: template.theme || 'default',
      elements: template.elements.map((el: any) => ({
        ...el,
        id: el.id || `element-${Date.now()}-${Math.random()}`,
        x: Number(el.x) || 0,
        y: Number(el.y) || 0,
        width: Number(el.width) || 100,
        height: Number(el.height) || 50
      })),
      background: {
        type: template.background.type || 'color',
        value: template.background.value || '#ffffff'
      },
      colorPalette: template.colorPalette || {
        primary: '#000000',
        secondary: '#666666',
        background: '#ffffff',
        text: '#333333'
      }
    };
  } catch (error) {
    console.error('Error sanitizing template:', error);
    return null;
  }
}