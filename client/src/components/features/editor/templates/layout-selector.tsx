import { Layout, Eye } from 'lucide-react';
import { pageTemplates as builtinPageTemplates } from '../../../../data/templates/page-templates';
import type { PageTemplate } from '../../../../types/template-types';

interface LayoutSelectorProps {
  selectedLayout: PageTemplate | null;
  onLayoutSelect: (template: PageTemplate) => void;
  onPreviewClick?: (template: PageTemplate) => void; // Optional - for preview functionality
  previewPosition?: 'top' | 'bottom' | 'right'; // 'bottom' = Preview below list (default), 'top' = Preview above list, 'right' = Preview to the right
}

export function LayoutSelector({ selectedLayout, onLayoutSelect, onPreviewClick, previewPosition = 'bottom' }: LayoutSelectorProps) {
  // All templates are now in page-templates.ts, no conversion needed
  const mergedPageTemplates: PageTemplate[] = builtinPageTemplates;

  const previewSection = (
    <div className="p-4 border-t border-gray-200 shrink-0">
      <h3 className="text-sm font-medium mb-3">Preview</h3>
      {selectedLayout ? (
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm font-medium mb-2">{selectedLayout.name}</div>
          <div className="text-xs text-gray-600 mb-3">
            {selectedLayout.textboxes.length} Textbox{selectedLayout.textboxes.length !== 1 ? 'es' : ''} • {selectedLayout.constraints.imageSlots} Image{selectedLayout.constraints.imageSlots !== 1 ? 's' : ''}
          </div>
          <div className="aspect-[210/297] bg-gray-50 border rounded relative overflow-hidden">
            {selectedLayout.textboxes.map((textbox, i) => (
              <div
                key={i}
                className="absolute bg-blue-200 border-2 border-blue-400 rounded opacity-80 flex items-center justify-center"
                style={{
                  left: `${(textbox.position.x / 2480) * 100}%`,
                  top: `${(textbox.position.y / 3508) * 100}%`,
                  width: `${(textbox.size.width / 2480) * 100}%`,
                  height: `${(textbox.size.height / 3508) * 100}%`,
                  fontSize: '10px',
                  color: '#1e40af',
                  fontWeight: '600'
                }}
              >
                {textbox.type === 'qna_inline' ? 'Q&A' : 'Text'}
              </div>
            ))}
            {selectedLayout.constraints.imageSlots > 0 && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                {selectedLayout.constraints.imageSlots} image slot{selectedLayout.constraints.imageSlots !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-gray-500 text-sm">Select a layout to see preview</div>
      )}
    </div>
  );

  const listSection = (
    <div className="p-2 flex-1 min-h-0 flex flex-col">
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Layout className="h-4 w-4" />
        Layout Templates
      </h3>
      <div className="space-y-2 flex-1 overflow-y-auto">
        {mergedPageTemplates.map((template) => (
          <div
            key={template.id}
            className={`w-full p-3 border rounded-lg transition-colors flex items-start gap-2 ${
              selectedLayout?.id === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <button
              onClick={() => onLayoutSelect(template)}
              className="flex-1 text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{template.name}</span>
                <span className="text-xs text-gray-500 capitalize">{template.category}</span>
              </div>
              <div className="text-xs text-gray-600">
                {template.textboxes.length} elements • {template.constraints.imageSlots} images
              </div>
              <div className="mt-2 h-12 bg-gray-100 rounded border relative overflow-hidden">
                <div className="absolute inset-1 grid grid-cols-2 gap-1">
                  {template.textboxes.slice(0, 4).map((_, i) => (
                    <div key={i} className="bg-blue-200 rounded-sm opacity-60" />
                  ))}
                </div>
              </div>
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
                className="p-1.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0 mt-1"
                title="Preview"
              >
                <Eye className="h-4 w-4 text-gray-600" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (previewPosition === 'right') {
    return (
      <div className="flex flex-row h-full">
        {listSection}
        <div className="w-1/2 border-l border-gray-200">
          {previewSection}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {previewPosition === 'top' ? (
        <>
          {previewSection}
          {listSection}
        </>
      ) : (
        <>
          {listSection}
          {previewSection}
        </>
      )}
    </div>
  );
}

