import { useState, useEffect } from 'react';
import type { PageTemplate, ColorPalette } from '../../types/template-types';
import { colorPalettes } from '../../data/templates/color-palettes';
import { mergeTemplateWithPalette } from '../../utils/template-utils';
import { useEditor } from '../../context/editor-context';
import TemplatePreview from './template-preview';
import ColorPaletteSelector from './color-palette-selector';

interface TemplateCustomizerProps {
  isOpen: boolean;
  template: PageTemplate | null;
  onClose: () => void;
  onBack: () => void;
}

export default function TemplateCustomizer({ isOpen, template, onClose, onBack }: TemplateCustomizerProps) {
  const { applyTemplateToPage } = useEditor();
  const [customizedTemplate, setCustomizedTemplate] = useState<PageTemplate | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [arrangementStyle, setArrangementStyle] = useState('keep existing');
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);
  const [imageSlots, setImageSlots] = useState(1);
  const [stickerSlots, setStickerSlots] = useState(3);

  // Initialize customizer when template changes
  useEffect(() => {
    if (template) {
      setCustomizedTemplate(template);
      setQuestionCount(template.textboxes.length);
      setImageSlots(template.constraints.imageSlots);
      setStickerSlots(template.constraints.stickerSlots);
      
      // Find matching palette or use first one
      const matchingPalette = colorPalettes.find(p => 
        p.colors.primary === template.colorPalette.primary
      ) || colorPalettes[0];
      setSelectedPalette(matchingPalette);
    }
  }, [template]);

  // Update template when customization changes
  useEffect(() => {
    if (!template || !selectedPalette) return;

    let updatedTemplate = { ...template };

    // Apply color palette
    updatedTemplate = mergeTemplateWithPalette(updatedTemplate, selectedPalette);

    // Adjust question count
    if (questionCount !== template.textboxes.length) {
      updatedTemplate = adjustQuestionCount(updatedTemplate, questionCount);
    }

    // Update constraints
    updatedTemplate.constraints = {
      ...updatedTemplate.constraints,
      imageSlots,
      stickerSlots
    };

    setCustomizedTemplate(updatedTemplate);
  }, [template, selectedPalette, questionCount, arrangementStyle, imageSlots, stickerSlots]);

  const adjustQuestionCount = (template: PageTemplate, newCount: number): PageTemplate => {
    const currentCount = template.textboxes.length;
    
    if (newCount === currentCount) return template;

    let newTextboxes = [...template.textboxes];

    if (newCount > currentCount) {
      // Add more textboxes by duplicating existing ones with offset
      const toAdd = newCount - currentCount;
      for (let i = 0; i < toAdd; i++) {
        const sourceIndex = i % currentCount;
        const sourceTextbox = template.textboxes[sourceIndex];
        const offsetY = Math.floor(i / currentCount) * 150;
        
        newTextboxes.push({
          ...sourceTextbox,
          position: {
            x: sourceTextbox.position.x,
            y: sourceTextbox.position.y + offsetY + 300
          }
        });
      }
    } else {
      // Remove textboxes from the end
      newTextboxes = newTextboxes.slice(0, newCount);
    }

    return {
      ...template,
      textboxes: newTextboxes
    };
  };

  const handleApply = () => {
    if (customizedTemplate) {
      applyTemplateToPage(customizedTemplate);
      onClose();
    }
  };

  if (!isOpen || !template || !customizedTemplate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Customize Template</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - Controls */}
          <div className="w-80 border-r bg-gray-50 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Question Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions: {questionCount}
                </label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>15</span>
                </div>
              </div>

              {/* Arrangement Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arrangement Style
                </label>
                <select
                  value={arrangementStyle}
                  onChange={(e) => setArrangementStyle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="keep existing">Keep Existing</option>
                  <option value="more structured">More Structured</option>
                  <option value="more scattered">More Scattered</option>
                </select>
              </div>

              {/* Image Slots */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Slots
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImageSlots(1)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      imageSlots === 1
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    1 Image
                  </button>
                  <button
                    onClick={() => setImageSlots(2)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      imageSlots === 2
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    2 Images
                  </button>
                </div>
              </div>

              {/* Sticker Slots */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sticker Slots: {stickerSlots}
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={stickerSlots}
                  onChange={(e) => setStickerSlots(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>10</span>
                </div>
              </div>

              {/* Color Palette */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Color Palette
                </label>
                <ColorPaletteSelector
                  palettes={colorPalettes}
                  selectedPalette={selectedPalette}
                  onSelect={setSelectedPalette}
                />
              </div>
            </div>
          </div>

          {/* Right panel - Preview */}
          <div className="flex-1 p-6 flex items-center justify-center bg-gray-100">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                Live Preview
              </h3>
              <TemplatePreview template={customizedTemplate} width={400} height={500} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Back to Gallery
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Apply Template
          </button>
        </div>
      </div>
    </div>
  );
}