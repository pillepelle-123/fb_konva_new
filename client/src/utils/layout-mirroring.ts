import type { PageTemplate } from '../types/template-types';

const DEFAULT_PAGE_WIDTH = 2480;

export function getMirroredTemplateId(templateId: string) {
  return `${templateId}__mirrored`;
}

export function mirrorTemplate(template: PageTemplate): PageTemplate {
  const pageWidth = template.baseSize?.width ?? DEFAULT_PAGE_WIDTH;

  const mirrorX = (x: number, width: number) => pageWidth - (x + width);

  return {
    ...template,
    id: getMirroredTemplateId(template.id),
    name: `${template.name} (Mirrored)`,
    textboxes: template.textboxes.map((textbox) => ({
      ...textbox,
      position: {
        ...textbox.position,
        x: mirrorX(textbox.position.x, textbox.size.width)
      }
    })),
    elements: template.elements.map((element) => ({
      ...element,
      position: {
        ...element.position,
        x: mirrorX(element.position.x, element.size.width)
      }
    }))
  };
}

