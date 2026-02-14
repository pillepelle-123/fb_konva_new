import { useState, useMemo, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Layout, Filter } from 'lucide-react';
import { pageTemplates as builtinPageTemplates } from '../../../../data/templates/page-templates';
import type { PageTemplate, TemplateCategory } from '../../../../types/template-types';
import { SelectorBase } from './selector-base';
import { getMirroredTemplateId, mirrorTemplate } from '../../../../utils/layout-mirroring';
import { LayoutTemplatePreview } from './layout-template-preview';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { Card } from '../../../ui/composites/card';
import { Separator } from '../../../ui';
import { useEditor, type Page } from '../../../../context/editor-context';
import { getActiveTemplateIds } from '../../../../utils/template-inheritance';
import { useSettingsPanel } from '../../../../hooks/useSettingsPanel';

interface SelectorLayoutProps {
  onBack: () => void;
}

export interface SelectorLayoutRef {
  discard: () => void;
}

export const SelectorLayout = forwardRef<SelectorLayoutRef, SelectorLayoutProps>(function SelectorLayout({ onBack }, ref) {
  const { state, dispatch, canEditBookSettings } = useEditor();
  const canApplyToEntireBook = canEditBookSettings();
  
  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const activeTemplateIds = getActiveTemplateIds(currentPage, state.currentBook);
  const currentLayoutId = activeTemplateIds.layoutTemplateId;
  
  const currentLayout = currentLayoutId 
    ? builtinPageTemplates.find((t: PageTemplate) => t.id === currentLayoutId) || null 
    : null;
  
  const pageHasCustomLayout = currentPage 
    ? Object.prototype.hasOwnProperty.call(currentPage, 'layoutTemplateId') && 
      currentPage.layoutTemplateId !== undefined && 
      currentPage.layoutTemplateId !== null
    : false;

  const [selectedLayout, setSelectedLayout] = useState<PageTemplate | null>(currentLayout);
  const [applyToEntireBook, setApplyToEntireBook] = useState(false);
  const mirroredCache = useRef<Record<string, PageTemplate>>({});
  const [mirroredFlags, setMirroredFlags] = useState<Record<string, boolean>>({});
  const originalPageStateRef = useRef<Page | null>(null);
  const hasAppliedRef = useRef(false);

  // Capture complete page state on mount (deep clone)
  useEffect(() => {
    if (!originalPageStateRef.current && currentPage) {
      originalPageStateRef.current = structuredClone(currentPage);
    }
  }, []);

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
    if (selectedLayout && (selectedLayout.id === template.id || selectedLayout.id === getMirroredTemplateId(template.id))) {
      setSelectedLayout(getDisplayTemplate(template, enabled));
    }
  };

  const uniqueCounts = useMemo(() => {
    const qna = new Set<number>();
    const images = new Set<number>();
    const columns = new Set<number>();
    const categories = new Set<TemplateCategory>();

    builtinPageTemplates.forEach((template) => {
      categories.add(template.category);
      const meta = template.meta;
      if (meta) {
        qna.add(meta.qnaInlineCount);
        images.add(meta.imageCount);
        columns.add(meta.columns);
      } else {
        qna.add(template.textboxes.length);
        images.add(template.elements.filter((element) => element.type === 'image').length);
        columns.add(template.columns ?? 1);
      }
    });

    return {
      qna: Array.from(qna).sort((a, b) => a - b),
      images: Array.from(images).sort((a, b) => a - b),
      columns: Array.from(columns).sort((a, b) => a - b),
      categories: Array.from(categories).sort()
    };
  }, []);

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

  const hasActiveFilters = filters.qna !== 'any' || filters.images !== 'any' || filters.columns !== 'any' || filters.category !== 'any';

  const filteredTemplates = useMemo(() => {
    return builtinPageTemplates.filter((template) => {
      const meta = template.meta;
      const qnaInlineCount = meta?.qnaInlineCount ?? template.textboxes.length;
      const imageCount = meta?.imageCount ?? template.elements.filter((element) => element.type === 'image').length;
      const columns = meta?.columns ?? template.columns ?? 1;

      if (filters.qna !== 'any' && qnaInlineCount !== filters.qna) return false;
      if (filters.images !== 'any' && imageCount !== filters.images) return false;
      if (filters.columns !== 'any' && columns !== filters.columns) return false;
      if (filters.category !== 'any' && template.category !== filters.category) return false;
      return true;
    });
  }, [filters]);

  const handlePreview = (template: PageTemplate) => {
    dispatch({
      type: 'APPLY_LAYOUT_TEMPLATE',
      payload: { template, pageIndex: state.activePageIndex, applyToAllPages: false, skipHistory: true }
    });
  };

  const handleCancel = useCallback(() => {
    if (!hasAppliedRef.current && originalPageStateRef.current) {
      dispatch({
        type: 'RESTORE_PAGE_STATE',
        payload: {
          pageIndex: state.activePageIndex,
          pageState: originalPageStateRef.current
        }
      });
    }
    onBack();
  }, [dispatch, state.activePageIndex, onBack]);

  useImperativeHandle(ref, () => ({ discard: handleCancel }), [handleCancel]);
  const { panelRef } = useSettingsPanel(handleCancel);

  const handleApply = () => {
    if (!selectedLayout) return;

    if (applyToEntireBook && state.currentBook) {
      state.currentBook.pages.forEach((_, pageIndex) => {
        dispatch({
          type: 'APPLY_LAYOUT_TEMPLATE',
          payload: { template: selectedLayout, pageIndex, applyToAllPages: false, skipHistory: true }
        });
        dispatch({
          type: 'SET_PAGE_LAYOUT_TEMPLATE',
          payload: { pageIndex, layoutTemplateId: selectedLayout.id }
        });
      });
      
      dispatch({ type: 'SAVE_TO_HISTORY', payload: `Apply Layout to all pages: ${selectedLayout.name}` });
      hasAppliedRef.current = true;
      onBack();
      return;
    }

    dispatch({
      type: 'APPLY_LAYOUT_TEMPLATE',
      payload: { template: selectedLayout, pageIndex: state.activePageIndex, applyToAllPages: false }
    });
    
    dispatch({
      type: 'SET_PAGE_LAYOUT_TEMPLATE',
      payload: { pageIndex: state.activePageIndex, layoutTemplateId: selectedLayout.id }
    });
    
    dispatch({ type: 'SAVE_TO_HISTORY', payload: `Apply Layout: ${selectedLayout.name}` });
    hasAppliedRef.current = true;
    onBack();
  };

  return (
    <div ref={panelRef} className="h-full">
    <SelectorBase
      title={<><Layout className="h-4 w-4" />Layout</>}
      items={filteredTemplates}
      selectedItem={selectedLayout}
      onItemSelect={(template) => {
        const isMirrored = mirroredFlags[template.id] ?? false;
        const displayTemplate = getDisplayTemplate(template, isMirrored);
        setSelectedLayout(displayTemplate);
        handlePreview(displayTemplate);
      }}
      getItemKey={(template) => template.id}
      onCancel={handleCancel}
      onApply={handleApply}
      canApply={selectedLayout !== currentLayout}
      applyToEntireBook={applyToEntireBook}
      onApplyToEntireBookChange={canApplyToEntireBook ? setApplyToEntireBook : undefined}
      filterComponent={(
        <div className="w-full p-3 mb-3 border border-gray-200 rounded-lg bg-white/70">
          <div className="flex items-center gap-2 mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            <Filter className="h-3.5 w-3.5" />
            Filter
            {hasActiveFilters && (
              <button
                type="button"
                className="ml-auto text-blue-600 hover:underline"
                onClick={() => setFilters({ qna: 'any', images: 'any', columns: 'any', category: 'any' })}
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
                onChange={(e) => setFilters((prev) => ({ ...prev, qna: e.target.value === 'any' ? 'any' : Number(e.target.value) }))}
              >
                <option value="any">Any</option>
                {uniqueCounts.qna.map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-600 space-y-1">
              <span>Images</span>
              <select
                className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm"
                value={filters.images}
                onChange={(e) => setFilters((prev) => ({ ...prev, images: e.target.value === 'any' ? 'any' : Number(e.target.value) }))}
              >
                <option value="any">Any</option>
                {uniqueCounts.images.map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-600 space-y-1">
              <span>Columns</span>
              <select
                className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm"
                value={filters.columns}
                onChange={(e) => setFilters((prev) => ({ ...prev, columns: e.target.value === 'any' ? 'any' : Number(e.target.value) }))}
              >
                <option value="any">Any</option>
                {uniqueCounts.columns.map((count) => (
                  <option key={count} value={count}>{count === 1 ? '1 column' : `${count} columns`}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-600 space-y-1">
              <span>Category</span>
              <select
                className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm"
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value === 'any' ? 'any' : (e.target.value as TemplateCategory) }))}
              >
                <option value="any">Any</option>
                {uniqueCounts.categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
      renderItem={(template, isActive) => {
        const mirroredId = getMirroredTemplateId(template.id);
        const isMirroredSelected = selectedLayout?.id === mirroredId;
        const mirrorChecked = mirroredFlags[template.id] ?? isMirroredSelected;
        const displayTemplate = getDisplayTemplate(template, mirrorChecked);
        const meta = template.meta ?? {
          qnaInlineCount: template.textboxes.length,
          imageCount: template.elements.filter((element) => element.type === 'image').length,
          columns: template.columns ?? 1
        };
        return (
          <Card
            className={`w-full p-3 transition-colors flex items-start gap-2 select-none cursor-pointer ${
              isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between mb-2">
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
                  onClick={(e) => e.stopPropagation()}
                />
                <span>Mirrored</span>
              </label>
            </div>
            <div className="w-1/4 min-w-[70px]">
              <LayoutTemplatePreview template={displayTemplate} showItemLabels={false} />
            </div>
          </Card>
        );
      }}
      renderSelectedPreview={(selected) => (
        <div className="space-y-2 mt-3 w-full shrink-0">
          <Separator />
          <div className="flex items-start gap-2 px-2">
            <div className="flex-1 text-left">
              <div className="text-xs text-gray-500 capitalize font-medium mb-1">
                {selected?.category || 'No Layout Selected'} (selected)
              </div>
              {selected && (
                <div className="text-xs text-gray-600 flex flex-wrap gap-2">
                  <span>{selected.meta?.qnaInlineCount ?? selected.textboxes.length} Questions</span>
                  <span>•</span>
                  <span>{selected.meta?.imageCount ?? selected.elements.filter((e) => e.type === 'image').length} image{(selected.meta?.imageCount ?? selected.elements.filter((e) => e.type === 'image').length) === 1 ? '' : 's'}</span>
                  <span>•</span>
                  <span>{selected.meta?.columns ?? selected.columns ?? 1} column{(selected.meta?.columns ?? selected.columns ?? 1) === 1 ? '' : 's'}</span>
                </div>
              )}
            </div>
            {selected && (
              <div className="w-1/4 min-w-[70px]">
                <LayoutTemplatePreview template={selected} showItemLabels={false} />
              </div>
            )}
          </div>
          <div className="px-2">
            <Separator />
          </div>
        </div>
      )}
    />
    </div>
  );
});
