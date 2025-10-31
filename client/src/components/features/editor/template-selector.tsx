import React, { useState, useEffect } from 'react';
import { useEditor } from '../../../context/editor-context';
import { Button } from '../../ui/primitives/button';
import { ChevronLeft, Layout, Palette, Paintbrush2, AlertTriangle } from 'lucide-react';
import { pageTemplates } from '../../../data/templates/page-templates';
import { colorPalettes } from '../../../data/templates/color-palettes';
import { getGlobalTheme } from '../../../utils/global-themes';
import { validateTemplateCompatibility } from '../../../utils/content-preservation';
import ConfirmationDialog from '../../ui/overlays/confirmation-dialog';
import type { PageTemplate, ColorPalette } from '../../../types/template-types';

interface TemplateSelectorProps {
  onBack: () => void;
}

export function TemplateSelector({ onBack }: TemplateSelectorProps) {
  const { state, applyCompleteTemplate } = useEditor();
  const [selectedLayout, setSelectedLayout] = useState<PageTemplate | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);
  const [applyToBook, setApplyToBook] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  const themes = ['default', 'sketchy', 'minimal', 'colorful'];
  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const hasContent = currentPage?.elements && currentPage.elements.length > 0;

  const handleApply = () => {
    if (hasContent) {
      setShowConfirmDialog(true);
    } else {
      applyTemplate();
    }
  };

  const applyTemplate = async () => {
    setIsApplying(true);
    
    try {
      // Apply complete template with all selections
      applyCompleteTemplate(
        selectedLayout?.id,
        selectedTheme,
        selectedPalette?.id,
        applyToBook ? 'entire-book' : 'current-page'
      );
      
      onBack();
    } catch (error) {
      console.error('Failed to apply template:', error);
    } finally {
      setIsApplying(false);
    }
  };
  
  // Validate template compatibility when layout changes
  useEffect(() => {
    if (selectedLayout && state.currentBook) {
      const currentPage = state.currentBook.pages[state.activePageIndex];
      if (currentPage) {
        const validation = validateTemplateCompatibility(selectedLayout, currentPage.elements);
        setValidationWarnings(validation.warnings);
      }
    } else {
      setValidationWarnings([]);
    }
  }, [selectedLayout, state.currentBook, state.activePageIndex]);

  const renderLayoutColumn = () => (
    <div className="flex-1 border-r border-gray-200 p-4">
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Layout className="h-4 w-4" />
        Layout Templates
      </h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {pageTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => setSelectedLayout(template)}
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
              {/* Simple visual preview */}
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
  );

  const renderThemeColumn = () => (
    <div className="flex-1 border-r border-gray-200 p-4">
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Paintbrush2 className="h-4 w-4" />
        Themes
      </h3>
      <div className="space-y-2">
        {themes.map((themeId) => {
          const theme = getGlobalTheme(themeId);
          return (
            <button
              key={themeId}
              onClick={() => setSelectedTheme(themeId)}
              className={`w-full p-3 border rounded-lg text-left transition-colors ${
                selectedTheme === themeId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm capitalize">{theme?.name || themeId}</div>
              <div className="text-xs text-gray-600 mt-1">
                {theme?.description || 'Theme styling'}
              </div>
              <div className="mt-2 flex gap-1">
                {/* Theme style indicators */}
                <div className={`w-4 h-4 rounded-sm ${
                  themeId === 'sketchy' ? 'bg-orange-200 border-2 border-orange-400' :
                  themeId === 'minimal' ? 'bg-gray-100 border border-gray-300' :
                  themeId === 'colorful' ? 'bg-gradient-to-r from-pink-200 to-blue-200' :
                  'bg-white border border-gray-400'
                }`} />
                <div className={`w-4 h-4 rounded-sm ${
                  themeId === 'sketchy' ? 'bg-yellow-200 border-2 border-yellow-400' :
                  themeId === 'minimal' ? 'bg-gray-50 border border-gray-200' :
                  themeId === 'colorful' ? 'bg-gradient-to-r from-green-200 to-purple-200' :
                  'bg-gray-50 border border-gray-300'
                }`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderPaletteColumn = () => (
    <div className="flex-1 p-4">
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Palette className="h-4 w-4" />
        Color Palettes
      </h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {colorPalettes.map((palette) => (
          <button
            key={palette.id}
            onClick={() => setSelectedPalette(palette)}
            className={`w-full p-3 border rounded-lg text-left transition-colors ${
              selectedPalette?.id === palette.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-sm">{palette.name}</div>
            <div className="mt-2 flex gap-1">
              <div 
                className="w-4 h-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: palette.colors.primary }}
              />
              <div 
                className="w-4 h-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: palette.colors.secondary }}
              />
              <div 
                className="w-4 h-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: palette.colors.accent }}
              />
              <div 
                className="w-4 h-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: palette.colors.background }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {palette.contrast} contrast
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="px-2 h-8"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h2 className="text-lg font-semibold">Template Selection</h2>
        </div>

        {/* Three-column layout */}
        <div className="flex border border-gray-200 rounded-lg bg-white min-h-[400px]">
          {renderLayoutColumn()}
          {renderThemeColumn()}
          {renderPaletteColumn()}
        </div>

        {/* Apply scope toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium">Apply to:</span>
          <div className="flex gap-2">
            <Button
              variant={!applyToBook ? "default" : "outline"}
              size="sm"
              onClick={() => setApplyToBook(false)}
            >
              Current Page
            </Button>
            <Button
              variant={applyToBook ? "default" : "outline"}
              size="sm"
              onClick={() => setApplyToBook(true)}
            >
              Entire Book
            </Button>
          </div>
        </div>

        {/* Validation warnings */}
        {validationWarnings.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-yellow-800 mb-1">Template Compatibility</div>
                <ul className="text-yellow-700 space-y-1">
                  {validationWarnings.map((warning, index) => (
                    <li key={index} className="text-xs">• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Preview and apply */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {(selectedLayout || selectedTheme !== 'default' || selectedPalette) && (
              <span>
                Selected: {selectedLayout?.name || 'No layout'}
                {selectedTheme !== 'default' && ` • ${selectedTheme}`}
                {selectedPalette && ` • ${selectedPalette.name}`}
              </span>
            )}
          </div>
          <Button
            onClick={handleApply}
            disabled={!selectedLayout && selectedTheme === 'default' && !selectedPalette || isApplying}
            className="px-6"
          >
            {isApplying ? 'Applying...' : 'Apply Template'}
          </Button>
        </div>
      </div>

      <ConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Apply Template Changes"
        description="This will reorganize existing elements and may reposition some content. Your content will be preserved. Continue?"
        onConfirm={() => {
          setShowConfirmDialog(false);
          applyTemplate();
        }}
        onCancel={() => setShowConfirmDialog(false)}
        confirmText="Continue"
        cancelText="Cancel"
      />
    </>
  );
}