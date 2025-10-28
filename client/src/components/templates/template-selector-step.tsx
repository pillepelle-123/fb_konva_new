import { useState, useEffect } from 'react';
import type { PageTemplate, TemplateCategory, ColorPalette } from '../../types/template-types';
import { pageTemplates } from '../../data/templates/page-templates';
import { colorPalettes } from '../../data/templates/color-palettes';
import { getTemplatesByCategory } from '../../utils/template-utils';
import TemplateCard from './template-card';
import TemplatePreview from './template-preview';

interface TemplateSelection {
  templateId: string | null;
  paletteId: string | null;
  customizations?: any;
}

interface TemplateSelectorStepProps {
  selection: TemplateSelection;
  onSelectionChange: (selection: TemplateSelection) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function TemplateSelectorStep({
  selection,
  onSelectionChange,
  onNext,
  onBack,
  onSkip
}: TemplateSelectorStepProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplate | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);

  const categories: Array<{ key: TemplateCategory | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'structured', label: 'Structured' },
    { key: 'playful', label: 'Playful' },
    { key: 'minimal', label: 'Minimal' },
    { key: 'creative', label: 'Creative' }
  ];

  const filteredTemplates = activeCategory === 'all' 
    ? pageTemplates 
    : getTemplatesByCategory(activeCategory);

  // Initialize from selection
  useEffect(() => {
    if (selection.templateId) {
      const template = pageTemplates.find(t => t.id === selection.templateId);
      setSelectedTemplate(template || null);
    }
    if (selection.paletteId) {
      const palette = colorPalettes.find(p => p.id === selection.paletteId);
      setSelectedPalette(palette || null);
    }
  }, [selection]);

  // Auto-select first template when category changes
  useEffect(() => {
    if (filteredTemplates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(filteredTemplates[0]);
    }
  }, [filteredTemplates, selectedTemplate]);

  const handleTemplateSelect = (template: PageTemplate) => {
    setSelectedTemplate(template);
    onSelectionChange({
      ...selection,
      templateId: template.id
    });
  };

  const handlePaletteSelect = (palette: ColorPalette) => {
    setSelectedPalette(palette);
    onSelectionChange({
      ...selection,
      paletteId: palette.id
    });
  };

  const handleSkip = () => {
    onSelectionChange({
      templateId: 'default',
      paletteId: 'default'
    });
    onSkip();
  };

  const canProceed = selectedTemplate && selectedPalette;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Choose Template & Colors</h2>
        <p className="text-gray-600">Select a template and color palette for your book pages</p>
      </div>

      {/* Category filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.key}
              onClick={() => setActiveCategory(category.key)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${activeCategory === category.key
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Template selection */}
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Templates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate?.id === template.id}
                onClick={handleTemplateSelect}
              />
            ))}
          </div>
        </div>

        {/* Preview and palette selection */}
        <div className="w-80">
          {selectedTemplate && (
            <>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
              <div className="mb-6">
                <TemplatePreview template={selectedTemplate} width={280} height={200} />
              </div>
            </>
          )}

          <h3 className="text-lg font-medium text-gray-900 mb-4">Color Palettes</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {colorPalettes.map(palette => (
              <div
                key={palette.id}
                onClick={() => handlePaletteSelect(palette)}
                className={`
                  p-3 border rounded-lg cursor-pointer transition-all
                  ${selectedPalette?.id === palette.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="font-medium text-sm mb-2">{palette.name}</div>
                <div className="flex gap-1">
                  {Object.entries(palette.colors).slice(0, 6).map(([key, color]) => (
                    <div
                      key={key}
                      className="w-4 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          Skip this step
        </button>

        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`
            px-6 py-2 rounded-md transition-colors
            ${canProceed
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export type { TemplateSelection };