import type { LayoutMeta, PageTemplate } from '../../types/template-types';
import { getPageTemplatesData } from './templates-data';

const extractColumnsFromId = (id: string): number => {
  const match = id.match(/qna-(\d)col/i);
  if (match) {
    const parsed = parseInt(match[1], 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 1;
};

const ensureMeta = (template: PageTemplate): PageTemplate => {
  const qnaInlineCount =
    template.meta?.qnaInlineCount ?? template.textboxes?.length ?? 0;
  const imageCount =
    template.meta?.imageCount ??
    template.elements?.filter((element) => element.type === 'image').length ??
    0;
  const columns =
    template.meta?.columns ??
    template.columns ??
    extractColumnsFromId(template.id);

  const meta: LayoutMeta = {
    qnaInlineCount,
    imageCount,
    columns
  };

  return {
    ...template,
    columns,
    meta
  };
};

export function getPageTemplates(): PageTemplate[] {
  return getPageTemplatesData().map(ensureMeta);
}

/** @deprecated Use getPageTemplates() - kept for compatibility during migration */
export const pageTemplates = new Proxy([] as PageTemplate[], {
  get(_, prop) {
    const data = getPageTemplates();
    if (prop === 'length') return data.length;
    if (typeof prop === 'string' && /^\d+$/.test(prop)) return data[parseInt(prop, 10)];
    return (data as Record<string, unknown>)[prop as string];
  }
});
