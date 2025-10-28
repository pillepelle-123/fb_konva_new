import type { PageTemplate, ColorPalette, TemplateCategory } from '../types/template-types';
import { pageTemplates } from '../data/templates/page-templates';
import { colorPalettes } from '../data/templates/color-palettes';
import { getTemplatesByCategory, mergeTemplateWithPalette } from './template-utils';
import { validatePaletteAccessibility } from './color-contrast-checker';

export function selectRandomTemplate(templates: PageTemplate[], category?: TemplateCategory): PageTemplate {
  const filteredTemplates = category ? getTemplatesByCategory(category) : templates;
  const randomIndex = Math.floor(Math.random() * filteredTemplates.length);
  return filteredTemplates[randomIndex];
}

export function selectRandomPalette(palettes: ColorPalette[]): ColorPalette {
  // Filter for accessible palettes only
  const accessiblePalettes = palettes.filter(palette => {
    const validation = validatePaletteAccessibility(palette);
    return validation.valid;
  });
  
  const palettePool = accessiblePalettes.length > 0 ? accessiblePalettes : palettes;
  const randomIndex = Math.floor(Math.random() * palettePool.length);
  return palettePool[randomIndex];
}

export function applyRandomVariations(template: PageTemplate): PageTemplate {
  const isPlayfulOrCreative = template.category === 'playful' || template.category === 'creative';
  
  return {
    ...template,
    textboxes: template.textboxes.map(textbox => ({
      ...textbox,
      position: {
        x: textbox.position.x + (Math.random() - 0.5) * 40, // ±20px jitter
        y: textbox.position.y + (Math.random() - 0.5) * 40
      },
      size: {
        width: textbox.size.width * (0.95 + Math.random() * 0.1), // 0.95-1.05 scale
        height: textbox.size.height * (0.95 + Math.random() * 0.1)
      }
    })),
    elements: template.elements.map(element => ({
      ...element,
      position: {
        x: element.position.x + (Math.random() - 0.5) * 40,
        y: element.position.y + (Math.random() - 0.5) * 40
      },
      size: {
        width: element.size.width * (0.95 + Math.random() * 0.1),
        height: element.size.height * (0.95 + Math.random() * 0.1)
      },
      // Add rotation for playful/creative templates
      ...(isPlayfulOrCreative && {
        rotation: (Math.random() - 0.5) * 10 // ±5° rotation
      })
    }))
  };
}

export function ensureAccessibility(template: PageTemplate): PageTemplate {
  // Validate current palette
  const paletteValidation = validatePaletteAccessibility({
    id: 'current',
    name: 'Current',
    colors: template.colorPalette,
    contrast: 'AA'
  });
  
  // If current palette fails, select a new accessible one
  if (!paletteValidation.valid) {
    const accessiblePalette = selectRandomPalette(colorPalettes);
    return mergeTemplateWithPalette(template, accessiblePalette);
  }
  
  return template;
}

export function applyMagicWand(category?: TemplateCategory): {
  template: PageTemplate;
  palette: ColorPalette;
  templateName: string;
  paletteName: string;
} {
  // Select random template
  const randomTemplate = selectRandomTemplate(pageTemplates, category);
  
  // Select random palette
  const randomPalette = selectRandomPalette(colorPalettes);
  
  // Apply palette to template
  let finalTemplate = mergeTemplateWithPalette(randomTemplate, randomPalette);
  
  // Apply random variations
  finalTemplate = applyRandomVariations(finalTemplate);
  
  // Ensure accessibility
  finalTemplate = ensureAccessibility(finalTemplate);
  
  return {
    template: finalTemplate,
    palette: randomPalette,
    templateName: randomTemplate.name,
    paletteName: randomPalette.name
  };
}