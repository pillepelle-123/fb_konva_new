import { Layout } from 'lucide-react';
import { pageTemplates } from '../../../../data/templates/page-templates';
import type { PageTemplate } from '../../../../types/template-types';

interface TemplateLayoutProps {
  selectedLayout: PageTemplate | null;
  onLayoutSelect: (template: PageTemplate) => void;
}

export function TemplateLayout({ selectedLayout, onLayoutSelect }: TemplateLayoutProps) {
  return (
    <div className="flex h-full">
      {/* Left side - List */}
      <div className="w-1/2 border-r border-gray-200 p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Layout className="h-4 w-4" />
          Layout Templates
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {pageTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => onLayoutSelect(template)}
              className={`w-full p-3 border rounded-lg text-left transition-colors ${
                selectedLayout?.id === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
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
          ))}
        </div>
      </div>
      
      {/* Right side - Preview */}
      <div className="w-1/2 p-4">
        <h3 className="text-sm font-medium mb-3">Preview</h3>
        {selectedLayout ? (
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm font-medium mb-2">{selectedLayout.name}</div>
            <div className="aspect-[210/297] bg-gray-50 border rounded relative overflow-hidden">
              {selectedLayout.textboxes.map((textbox, i) => (
                <div
                  key={i}
                  className="absolute bg-blue-200 border border-blue-300 rounded opacity-70"
                  style={{
                    left: `${(textbox.x / 2480) * 100}%`,
                    top: `${(textbox.y / 3508) * 100}%`,
                    width: `${(textbox.width / 2480) * 100}%`,
                    height: `${(textbox.height / 3508) * 100}%`
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm">Select a layout to see preview</div>
        )}
      </div>
    </div>
  );
}