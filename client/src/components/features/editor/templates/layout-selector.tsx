import { useMemo, useRef, useState } from 'react';
import { Layout, Eye, Filter } from 'lucide-react';
import { pageTemplates as builtinPageTemplates } from '../../../../data/templates/page-templates';
import type { PageTemplate, TemplateCategory } from '../../../../types/template-types';
import { SelectorShell, SelectorListSection } from './selector-shell';
import { getMirroredTemplateId, mirrorTemplate } from '../../../../utils/layout-mirroring';

interface LayoutSelectorProps {
  selectedLayout: PageTemplate | null;
  onLayoutSelect: (template: PageTemplate) => void;
  onPreviewClick?: (template: PageTemplate) => void; // Optional - for preview functionality
  previewPosition?: 'top' | 'bottom' | 'right'; // 'bottom' = Preview below list (default), 'top' = Preview above list, 'right' = Preview to the right
  showBookLayoutOption?: boolean;
  isBookLayoutSelected?: boolean;
  onBookLayoutSelect?: () => void;
  bookLayout?: PageTemplate | null;
}

const PAGE_WIDTH = 2480;
const PAGE_HEIGHT = 3508;

type TemplateItem =
  | {
      id: string;
      type: 'qna_inline' | 'text' | 'qna' | 'answer' | 'other';
      position: { x: number; y: number };
      size: { width: number; height: number };
    }
  | {
      id: string;
      type: 'image';
      position: { x: number; y: number };
      size: { width: number; height: number };
    };

const ITEM_STYLE: Record<
  TemplateItem['type'],
  { background: string; border: string; label: string }
> = {
  qna_inline: {
    background: 'rgba(59, 130, 246, 0.65)', // blue
    border: '#1d4ed8',
    label: 'Q&A Inline'
  },
  qna: {
    background: 'rgba(37, 99, 235, 0.65)', // darker blue
    border: '#1e3a8a',
    label: 'Q&A'
  },
  answer: {
    background: 'rgba(56, 189, 248, 0.65)',
    border: '#0ea5e9',
    label: 'Answer'
  },
  text: {
    background: 'rgba(96, 165, 250, 0.65)',
    border: '#2563eb',
    label: 'Text'
  },
  other: {
    background: 'rgba(148, 163, 184, 0.65)',
    border: '#475569',
    label: 'Element'
  },
  image: {
    background: 'rgba(249, 115, 22, 0.65)', // orange
    border: '#ea580c',
    label: 'Image'
  }
};

function normalizeTemplateItems(template: PageTemplate): TemplateItem[] {
  const textboxItems =
    template.textboxes?.map((textbox, index) => {
      const type = (textbox.type as TemplateItem['type']) ?? 'other';
      return {
        id: `textbox-${index}`,
        type: ITEM_STYLE[type] ? type : ('other' as const),
        position: {
          x: textbox.position.x ?? 0,
          y: textbox.position.y ?? 0
        },
        size: {
          width: textbox.size.width ?? 0,
          height: textbox.size.height ?? 0
        }
      };
    }) ?? [];

  const elementItems =
    template.elements?.map((element, index) => ({
      id: `element-${index}`,
      type: element.type === 'image' ? ('image' as const) : ('other' as const),
      position: {
        x: element.position.x ?? 0,
        y: element.position.y ?? 0
      },
      size: {
        width: element.size.width ?? 0,
        height: element.size.height ?? 0
      }
    })) ?? [];

  return [...textboxItems, ...elementItems];
}

export interface LayoutTemplatePreviewProps {
  template: PageTemplate;
  className?: string;
  showLegend?: boolean;
  showItemLabels?: boolean;
}

export function LayoutTemplatePreview({
  template,
  className,
  showLegend = false,
  showItemLabels = true
}: LayoutTemplatePreviewProps) {
  const items = normalizeTemplateItems(template);

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <div className="relative w-full rounded-lg border border-gray-200 bg-slate-50 shadow-inner aspect-[210/297] overflow-hidden">
        <div className="absolute inset-2 rounded-md border border-dashed border-slate-300 bg-white" />
        {items.map((item) => {
          const styleConfig = ITEM_STYLE[item.type] ?? ITEM_STYLE.other;
          const widthPercent = (item.size.width / PAGE_WIDTH) * 100;
          const heightPercent = (item.size.height / PAGE_HEIGHT) * 100;
          const leftPercent = (item.position.x / PAGE_WIDTH) * 100;
          const topPercent = (item.position.y / PAGE_HEIGHT) * 100;

          return (
            <div
              key={item.id}
              className="absolute flex items-center justify-center text-[11px] font-medium text-white"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                backgroundColor: styleConfig.background,
                border: `1.5px solid ${styleConfig.border}`,
                borderRadius: 6,
                boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)',
                letterSpacing: '0.02em'
              }}
            >
              {showItemLabels && (
                <span className="px-2 py-0.5 rounded-full bg-slate-900/20 backdrop-blur">
                  {styleConfig.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
          {Object.entries(ITEM_STYLE).map(([key, value]) => {
            // Hide generic "Element" legend if no item uses it
            if (
              key === 'other' &&
              !items.some((item) => item.type === ('other' as TemplateItem['type']))
            ) {
              return null;
            }
            return (
              <div key={key} className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-2 py-1 shadow-sm">
                <span
                  className="inline-flex h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: value.background, border: `1px solid ${value.border}` }}
                />
                <span className="font-medium">{value.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LayoutSelector({
  selectedLayout,
  onLayoutSelect,
  onPreviewClick,
  previewPosition = 'bottom',
  showBookLayoutOption = false,
  isBookLayoutSelected = false,
  onBookLayoutSelect,
  bookLayout
}: LayoutSelectorProps) {
  // All templates are now in page-templates.ts, no conversion needed
  const mergedPageTemplates: PageTemplate[] = builtinPageTemplates;
  const mirroredCache = useRef<Record<string, PageTemplate>>({});
  const [mirroredFlags, setMirroredFlags] = useState<Record<string, boolean>>({});

  const getDisplayTemplate = (template: PageTemplate, mirrored: boolean) => {
    if (!mirrored) return template;
    const mirroredId = getMirroredTemplateId(template.id);
    if (!mirroredCache.current[mirroredId]) {
      mirroredCache.current[mirroredId] = mirrorTemplate(template);
    }
    return mirroredCache.current[mirroredId];
  };

  const handleMirrorToggle = (template: PageTemplate, enabled: boolean) => {
    setMirroredFlags((prev) => ({ ...prev, [template.id]: enabled }));
    if (
      selectedLayout &&
      (selectedLayout.id === template.id || selectedLayout.id === getMirroredTemplateId(template.id))
    ) {
      onLayoutSelect(getDisplayTemplate(template, enabled));
    }
  };

  const uniqueCounts = useMemo(() => {
    const qna = new Set<number>();
    const images = new Set<number>();
    const columns = new Set<number>();
    const categories = new Set<TemplateCategory>();

    mergedPageTemplates.forEach((template) => {
      categories.add(template.category);
      const meta = template.meta;
      if (meta) {
        qna.add(meta.qnaInlineCount);
        images.add(meta.imageCount);
        columns.add(meta.columns);
      } else {
        qna.add(template.textboxes.length);
        images.add(
          template.elements.filter((element) => element.type === 'image').length
        );
        columns.add(template.columns ?? 1);
      }
    });

    const sortNumeric = (values: Set<number>) =>
      Array.from(values).sort((a, b) => a - b);

    return {
      qna: sortNumeric(qna),
      images: sortNumeric(images),
      columns: sortNumeric(columns),
      categories: Array.from(categories).sort()
    };
  }, [mergedPageTemplates]);

  type FilterValue = 'any' | number;
  const [filters, setFilters] = useState<{
    qna: FilterValue;
    images: FilterValue;
    columns: FilterValue;
    category: 'any' | TemplateCategory;
  }>({
    qna: 'any',
    images: 'any',
    columns: 'any',
    category: 'any'
  });

  const hasActiveFilters =
    filters.qna !== 'any' ||
    filters.images !== 'any' ||
    filters.columns !== 'any' ||
    filters.category !== 'any';

  const filteredTemplates = useMemo(() => {
    return mergedPageTemplates.filter((template) => {
      const meta = template.meta;
      const qnaInlineCount = meta?.qnaInlineCount ?? template.textboxes.length;
      const imageCount =
        meta?.imageCount ??
        template.elements.filter((element) => element.type === 'image').length;
      const columns = meta?.columns ?? template.columns ?? 1;

      if (filters.qna !== 'any' && qnaInlineCount !== filters.qna) {
        return false;
      }
      if (filters.images !== 'any' && imageCount !== filters.images) {
        return false;
      }
      if (filters.columns !== 'any' && columns !== filters.columns) {
        return false;
      }
      if (filters.category !== 'any' && template.category !== filters.category) {
        return false;
      }
      return true;
    });
  }, [mergedPageTemplates, filters]);

  const previewSection = (
    <div className="p-4 border-t border-gray-200 shrink-0">
      <h3 className="text-sm font-medium mb-3">Preview</h3>
      {selectedLayout ? (
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm font-medium mb-2">{selectedLayout.name}</div>
          <div className="text-xs text-gray-600 mb-3">
            {selectedLayout.textboxes.length} Textbox{selectedLayout.textboxes.length !== 1 ? 'es' : ''} •{' '}
            {selectedLayout.constraints.imageSlots} Image
            {selectedLayout.constraints.imageSlots !== 1 ? 's' : ''}
          </div>
          <LayoutTemplatePreview template={selectedLayout} showLegend />
        </div>
      ) : (
        <div className="text-gray-500 text-sm">Select a layout to see preview</div>
      )}
    </div>
  );

  const listSection = (
    <SelectorListSection
      title={
        <>
          <Layout className="h-4 w-4" />
          Layout Templates
        </>
      }
      className={previewPosition === 'right' ? 'w-1/2 border-r border-gray-200' : ''}
      scrollClassName="min-h-0"
    >
      <div className="w-full p-3 mb-3 border border-gray-200 rounded-lg bg-white/70">
        <div className="flex items-center gap-2 mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          <Filter className="h-3.5 w-3.5" />
          Filter
          {hasActiveFilters && (
            <button
              type="button"
              className="ml-auto text-blue-600 hover:underline"
              onClick={() =>
                setFilters({
                  qna: 'any',
                  images: 'any',
                  columns: 'any'
                })
              }
            >
              Reset
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="text-xs text-slate-600 space-y-1">
            <span>Q&A Boxes</span>
            <select
              className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm"
              value={filters.qna}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  qna:
                    event.target.value === 'any'
                      ? 'any'
                      : Number(event.target.value)
                }))
              }
            >
              <option value="any">Any</option>
              {uniqueCounts.qna.map((count) => (
                <option key={`filter-qna-${count}`} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600 space-y-1">
            <span>Images</span>
            <select
              className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm"
              value={filters.images}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  images:
                    event.target.value === 'any'
                      ? 'any'
                      : Number(event.target.value)
                }))
              }
            >
              <option value="any">Any</option>
              {uniqueCounts.images.map((count) => (
                <option key={`filter-images-${count}`} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600 space-y-1">
            <span>Columns</span>
            <select
              className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm"
              value={filters.columns}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  columns:
                    event.target.value === 'any'
                      ? 'any'
                      : Number(event.target.value)
                }))
              }
            >
              <option value="any">Any</option>
              {uniqueCounts.columns.map((count) => (
                <option key={`filter-columns-${count}`} value={count}>
                  {count === 1 ? '1 column' : `${count} columns`}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-600 space-y-1">
            <span>Category</span>
            <select
              className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm"
              value={filters.category}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  category:
                    event.target.value === 'any'
                      ? 'any'
                      : (event.target.value as TemplateCategory)
                }))
              }
            >
              <option value="any">Any</option>
              {uniqueCounts.categories.map((category) => (
                <option key={`filter-category-${category}`} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {showBookLayoutOption && (
        <div
          key="book-layout-entry"
          className={`w-full p-3 border rounded-lg transition-colors flex items-start gap-2 ${
            isBookLayoutSelected
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookLayoutSelect?.();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className="flex-1 text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">Book Layout</span>
            </div>
            <div className="text-xs text-gray-600">
              {bookLayout ? `${bookLayout.textboxes.length} elements • ${bookLayout.constraints.imageSlots} images` : 'Follow the layout set at book level'}
            </div>
          </button>
          {onPreviewClick && bookLayout && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPreviewClick(bookLayout);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0 mt-1"
              title="Preview Page with Book Layout"
            >
              <Eye className="h-4 w-4 text-gray-600" />
            </button>
          )}
        </div>
      )}
      {filteredTemplates.map((template) => {
        const mirroredId = getMirroredTemplateId(template.id);
        const isBaseSelected = !isBookLayoutSelected && selectedLayout?.id === template.id;
        const isMirroredSelected = !isBookLayoutSelected && selectedLayout?.id === mirroredId;
        const isActive = isBaseSelected || isMirroredSelected;
        const mirrorChecked = mirroredFlags[template.id] ?? isMirroredSelected;
        const displayTemplate = getDisplayTemplate(template, mirrorChecked);
        const meta = template.meta ?? {
          qnaInlineCount: template.textboxes.length,
          imageCount: template.elements.filter((element) => element.type === 'image').length,
          columns: template.columns ?? 1
        };
        return (
        <div
          key={template.id}
          className={`w-full p-3 border rounded-lg transition-colors flex items-start gap-2 select-none ${
            isActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button[type="button"]')) {
              e.preventDefault();
            }
          }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button[type="button"]')) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              const isMirrored = mirroredFlags[template.id] ?? isMirroredSelected;
              onLayoutSelect(getDisplayTemplate(template, isMirrored));
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className="flex-1 text-left"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{template.name}</span>
              <span className="text-xs text-gray-500 capitalize">{template.category}</span>
            </div>
            <div className="text-xs text-gray-600 flex flex-wrap gap-2">
              <span>{meta.qnaInlineCount} Q&A</span>
              <span>•</span>
              <span>{meta.imageCount} image{meta.imageCount === 1 ? '' : 's'}</span>
              <span>•</span>
              <span>{meta.columns} column{meta.columns === 1 ? '' : 's'}</span>
            </div>
            <div className="mt-3 w-1/4 min-w-[70px]">
              <LayoutTemplatePreview
                template={displayTemplate}
                showItemLabels={false}
              />
            </div>
            <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-gray-600">
              <input
                type="checkbox"
                checked={mirrorChecked}
                onChange={(event) => handleMirrorToggle(template, event.target.checked)}
                onClick={(event) => event.stopPropagation()}
              />
              <span>Mirrored</span>
            </label>
          </button>
          {onPreviewClick && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPreviewClick(displayTemplate);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0 mt-1"
              title="Preview Page with this Layout"
            >
              <Eye className="h-4 w-4 text-gray-600" />
            </button>
          )}
        </div>
        );
      })}
    </SelectorListSection>
  );

  return (
    <SelectorShell
      listSection={listSection}
      previewSection={previewSection}
      previewPosition={previewPosition}
      sidePreviewWrapperClassName="w-1/2"
    />
  );
}

