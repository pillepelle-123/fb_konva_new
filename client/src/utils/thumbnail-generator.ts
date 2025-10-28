import type { PageTemplate } from '../types/template-types';

interface ThumbnailOptions {
  width?: number;
  height?: number;
  scale?: number;
}

/**
 * Generate a thumbnail for a template using Canvas API
 */
export function generateTemplateThumbnail(
  template: PageTemplate, 
  options: ThumbnailOptions = {}
): string {
  const { width = 200, height = 250, scale = 0.2 } = options;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return '';
  }
  
  canvas.width = width;
  canvas.height = height;
  
  // Set background
  if (template.background.type === 'color') {
    ctx.fillStyle = template.background.value;
    ctx.fillRect(0, 0, width, height);
  } else if (template.background.type === 'pattern') {
    // Simple pattern representation
    ctx.fillStyle = template.colorPalette.background || '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Draw pattern dots/lines
    ctx.fillStyle = template.colorPalette.primary || '#000000';
    const patternSize = 8;
    for (let x = 0; x < width; x += patternSize * 2) {
      for (let y = 0; y < height; y += patternSize * 2) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }
  
  // Draw template elements as simplified shapes
  template.elements.forEach((element, index) => {
    const x = element.x * scale;
    const y = element.y * scale;
    const w = element.width * scale;
    const h = element.height * scale;
    
    ctx.save();
    
    switch (element.type) {
      case 'text':
        // Text box representation
        ctx.fillStyle = template.colorPalette.background || '#ffffff';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = template.colorPalette.primary || '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        
        // Text lines
        ctx.strokeStyle = template.colorPalette.text || '#333333';
        ctx.lineWidth = 0.5;
        const lineHeight = 4;
        for (let i = 0; i < Math.min(3, h / lineHeight); i++) {
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 8 + i * lineHeight);
          ctx.lineTo(x + w - 4, y + 8 + i * lineHeight);
          ctx.stroke();
        }
        break;
        
      case 'image':
        // Image placeholder
        ctx.fillStyle = template.colorPalette.secondary || '#f0f0f0';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = template.colorPalette.primary || '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        
        // Image icon (X)
        ctx.strokeStyle = template.colorPalette.text || '#666666';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.3, y + h * 0.3);
        ctx.lineTo(x + w * 0.7, y + h * 0.7);
        ctx.moveTo(x + w * 0.7, y + h * 0.3);
        ctx.lineTo(x + w * 0.3, y + h * 0.7);
        ctx.stroke();
        break;
        
      case 'shape':
        ctx.fillStyle = template.colorPalette.accent || '#e0e0e0';
        if (element.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(x + w/2, y + h/2, Math.min(w, h)/2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, w, h);
        }
        break;
        
      default:
        // Generic element
        ctx.fillStyle = template.colorPalette.secondary || '#f5f5f5';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = template.colorPalette.primary || '#cccccc';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, w, h);
        break;
    }
    
    ctx.restore();
  });
  
  return canvas.toDataURL('image/png');
}

/**
 * Generate thumbnails for all templates and cache them
 */
export function generateAllThumbnails(templates: PageTemplate[]): Map<string, string> {
  const thumbnailCache = new Map<string, string>();
  
  templates.forEach(template => {
    const thumbnail = generateTemplateThumbnail(template);
    thumbnailCache.set(template.id, thumbnail);
  });
  
  return thumbnailCache;
}

/**
 * Get cached thumbnail or generate on demand
 */
let thumbnailCache: Map<string, string> | null = null;

export function getThumbnail(template: PageTemplate): string {
  if (!thumbnailCache) {
    thumbnailCache = new Map();
  }
  
  if (!thumbnailCache.has(template.id)) {
    const thumbnail = generateTemplateThumbnail(template);
    thumbnailCache.set(template.id, thumbnail);
  }
  
  return thumbnailCache.get(template.id) || '';
}

/**
 * Preload thumbnails for better performance
 */
export function preloadThumbnails(templates: PageTemplate[]): Promise<void> {
  return new Promise((resolve) => {
    if (!thumbnailCache) {
      thumbnailCache = new Map();
    }
    
    let loaded = 0;
    const total = templates.length;
    
    if (total === 0) {
      resolve();
      return;
    }
    
    templates.forEach(template => {
      // Generate thumbnail in next tick to avoid blocking
      setTimeout(() => {
        const thumbnail = generateTemplateThumbnail(template);
        thumbnailCache!.set(template.id, thumbnail);
        loaded++;
        
        if (loaded === total) {
          resolve();
        }
      }, 0);
    });
  });
}