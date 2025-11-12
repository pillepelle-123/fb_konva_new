import { Layout, Eye } from 'lucide-react';
import { pageTemplates as builtinPageTemplates } from '../../../../data/templates/page-templates';
import type { PageTemplate } from '../../../../types/template-types';
import { SelectorShell, SelectorListSection } from './selector-shell';

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
    label: 'Bild'
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

interface LayoutTemplatePreviewProps {
  template: PageTemplate;
  className?: string;
  showLegend?: boolean;
}

function LayoutTemplatePreview({
  template,
  className,
  showLegend = false
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
              <span className="px-2 py-0.5 rounded-full bg-slate-900/20 backdrop-blur">
                {styleConfig.label}
              </span>
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
      {mergedPageTemplates.map((template) => {
        const isActive = !isBookLayoutSelected && selectedLayout?.id === template.id;
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
              onLayoutSelect(template);
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
            <div className="text-xs text-gray-600">
              {template.textboxes.length} elements • {template.constraints.imageSlots} images
            </div>
            <LayoutTemplatePreview template={template} className="mt-3" />
          </button>
          {onPreviewClick && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPreviewClick(template);
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

