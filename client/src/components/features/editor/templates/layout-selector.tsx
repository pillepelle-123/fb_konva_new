import { useMemo, useRef, useState } from 'react';
import { Layout, Eye, Filter } from 'lucide-react';
import { pageTemplates as builtinPageTemplates } from '../../../../data/templates/page-templates';
import type { PageTemplate, TemplateCategory } from '../../../../types/template-types';
import { SelectorShell, SelectorListSection } from './selector-shell';
import { getMirroredTemplateId, mirrorTemplate } from '../../../../utils/layout-mirroring';
import { LayoutTemplatePreview } from './layout-template-preview';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { Tooltip } from '../../../ui/composites/tooltip';
import { Card } from '../../../ui/composites/card';
import { Separator } from '../../../ui';

interface LayoutSelectorProps {
  selectedLayout: PageTemplate | null;
  onLayoutSelect: (template: PageTemplate) => void;
  onPreviewClick?: (template: PageTemplate) => void; // Optional - for preview functionality
  skipShell?: boolean; // If true, return only the listSection without SelectorShell wrapper
  onCancel?: () => void;
  onApply?: () => void;
  canApply?: boolean;
  applyToEntireBook?: boolean;
  onApplyToEntireBookChange?: (checked: boolean) => void;
}

export function LayoutSelector({
  selectedLayout,
  onLayoutSelect,
  onPreviewClick,
  skipShell = false,
  onCancel,
  onApply,
  canApply = false,
  applyToEntireBook = false,
  onApplyToEntireBookChange
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

  const listSection = (
    <SelectorListSection
      title={
        <>
          <Layout className="h-4 w-4" />
          Layout Templates
        </>
      }
      className=""
      scrollClassName="min-h-0"
      onCancel={skipShell ? undefined : onCancel}
      onApply={skipShell ? undefined : onApply}
      canApply={canApply}
      applyToEntireBook={applyToEntireBook}
      onApplyToEntireBookChange={skipShell ? undefined : onApplyToEntireBookChange}
      beforeList={(
        <div className="space-y-2 mb-3 w-full">
          <div className="flex items-start gap-2 px-2">
            <div className="flex-1 text-left">
              <div className="text-xs text-gray-500 capitalize font-medium mb-1">
                {selectedLayout?.category || 'No Layout Selected'} (selected)
              </div>
              {selectedLayout && (
                <div className="text-xs text-gray-600 flex flex-wrap gap-2">
                  <span>{selectedLayout.meta?.qnaInlineCount ?? selectedLayout.textboxes.length} Questions</span>
                  <span>•</span>
                  <span>{selectedLayout.meta?.imageCount ?? selectedLayout.elements.filter((element) => element.type === 'image').length} image{(selectedLayout.meta?.imageCount ?? selectedLayout.elements.filter((element) => element.type === 'image').length) === 1 ? '' : 's'}</span>
                  <span>•</span>
                  <span>{selectedLayout.meta?.columns ?? selectedLayout.columns ?? 1} column{(selectedLayout.meta?.columns ?? selectedLayout.columns ?? 1) === 1 ? '' : 's'}</span>
                </div>
              )}
            </div>
            {selectedLayout && (
              <div className="w-1/4 min-w-[70px]">
                <LayoutTemplatePreview
                  template={selectedLayout}
                  showItemLabels={false}
                />
              </div>
            )}
          </div>
          <Separator />
        </div>
      )}
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
                  columns: 'any',
                  category: 'any'
                })
              }
            >
              Reset
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-600 space-y-1">
            <span># of Q&A Boxes</span>
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
      {filteredTemplates.map((template) => {
        const mirroredId = getMirroredTemplateId(template.id);
        const isBaseSelected = selectedLayout?.id === template.id;
        const isMirroredSelected = selectedLayout?.id === mirroredId;
        const isActive = isBaseSelected || isMirroredSelected;
        const mirrorChecked = mirroredFlags[template.id] ?? isMirroredSelected;
        const displayTemplate = getDisplayTemplate(template, mirrorChecked);
        const meta = template.meta ?? {
          qnaInlineCount: template.textboxes.length,
          imageCount: template.elements.filter((element) => element.type === 'image').length,
          columns: template.columns ?? 1
        };
        return (
        <Card
          key={template.id}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            // Don't trigger if clicking on button or checkbox
            if (target.closest('button[type="button"]') || target.closest('input[type="checkbox"]') || target.closest('label')) {
              return;
            }
            const isMirrored = mirroredFlags[template.id] ?? isMirroredSelected;
            onLayoutSelect(getDisplayTemplate(template, isMirrored));
          }}
          onMouseDown={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button[type="button"]')) {
              e.preventDefault();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              const target = e.target as HTMLElement;
              // Don't trigger if focus is on button or checkbox
              if (target.closest('button[type="button"]') || target.closest('input[type="checkbox"]')) {
                return;
              }
              e.preventDefault();
              const isMirrored = mirroredFlags[template.id] ?? isMirroredSelected;
              onLayoutSelect(getDisplayTemplate(template, isMirrored));
            }
          }}
          className={`w-full p-3 transition-colors flex items-start gap-2 select-none cursor-pointer ${
            isActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          role="button"
          tabIndex={0}
        >
          <div className="flex-1 text-left">
            <div className="flex items-center justify-between mb-2">
              {/* <span className="font-medium text-sm">{template.name}</span> */}
              <span className="text-xs text-gray-500 capitalize">{template.category}</span>
            </div>
            <div className="text-xs text-gray-600 flex flex-wrap gap-2">
              <span>{meta.qnaInlineCount} Questions</span>
              <span>•</span>
              <span>{meta.imageCount} image{meta.imageCount === 1 ? '' : 's'}</span>
              <span>•</span>
              <span>{meta.columns} column{meta.columns === 1 ? '' : 's'}</span>
            </div>

            <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-gray-600">
              <Checkbox
                checked={mirrorChecked}
                onCheckedChange={(checked) => handleMirrorToggle(template, checked === true)}
                onClick={(event) => event.stopPropagation()}
              />
              <span>Mirrored</span>
            </label>
          </div>
          {onPreviewClick && (
            <Tooltip content="Preview Page with this Layout" side="left">
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
                className="w-1/4 min-w-[70px] relative group cursor-pointer"
              >
                <LayoutTemplatePreview
                  template={displayTemplate}
                  showItemLabels={false}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                  <Eye className="h-5 w-5 text-white" />
                </div>
              </button>
            </Tooltip>
          )}
          {!onPreviewClick && (
            <div className="w-1/4 min-w-[70px]">
              <LayoutTemplatePreview
                template={displayTemplate}
                showItemLabels={false}
              />
            </div>
          )}
        </Card>
        );
      })}
    </SelectorListSection>
  );

  if (skipShell) {
    return listSection;
  }

  return (
    <SelectorShell
      listSection={listSection}
    />
  );
}

