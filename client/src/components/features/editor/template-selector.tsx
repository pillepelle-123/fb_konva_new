import React, { useState, useEffect } from 'react';
import { useEditor } from '../../../context/editor-context';
import { Button } from '../../ui/primitives/button';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { validateTemplateCompatibility } from '../../../utils/content-preservation';
import ConfirmationDialog from '../../ui/overlays/confirmation-dialog';
import { TemplateLayout } from './templates/template-layout';
import { TemplateTheme } from './templates/template-theme';
import { TemplatePalette } from './templates/template-palette';
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
          <TemplateLayout 
            selectedLayout={selectedLayout}
            onLayoutSelect={setSelectedLayout}
          />
          <TemplateTheme 
            selectedTheme={selectedTheme}
            onThemeSelect={setSelectedTheme}
          />
          <TemplatePalette 
            selectedPalette={selectedPalette}
            onPaletteSelect={setSelectedPalette}
          />
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