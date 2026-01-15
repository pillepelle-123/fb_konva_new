import { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../../context/editor-context';
import { Button } from '../../ui/primitives/button';
import { AlertTriangle, Check, X } from 'lucide-react';
import { validateTemplateCompatibility } from '../../../utils/content-preservation';
import ConfirmationDialog from '../../ui/overlays/confirmation-dialog';
import { LayoutSelector } from './templates/layout-selector';
import { ThemeSelector } from './templates/theme-selector';
import { TemplatePalette } from './templates/template-palette';
import { SelectorShell } from './templates/selector-shell';
import type { PageTemplate, ColorPalette } from '../../../types/template-types';

interface TemplateSelectorProps {
  onBack: () => void;
}

export function TemplateSelector({ onBack }: TemplateSelectorProps) {
  const { state, applyCompleteTemplate, dispatch } = useEditor();
  const [selectedLayout, setSelectedLayout] = useState<PageTemplate | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);
  const [applyToBook, setApplyToBook] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const hasContent = currentPage?.elements && currentPage.elements.length > 0;
  
  // Store history index and activePageIndex at mount for cancel functionality
  const snapshotHistoryIndexRef = useRef<number | null>(null);
  const originalActivePageIndexRef = useRef<number | null>(null);
  const hasCreatedSnapshotRef = useRef(false);
  
  // Save history snapshot every time component becomes visible
  useEffect(() => {
    if (state.currentBook && !hasCreatedSnapshotRef.current) {
      // Store the history index and activePageIndex BEFORE creating the snapshot
      snapshotHistoryIndexRef.current = state.historyIndex;
      originalActivePageIndexRef.current = state.activePageIndex;
      // Create a snapshot in history before making any changes
      dispatch({
        type: 'SAVE_TO_HISTORY',
        payload: 'Before template selection'
      });
      hasCreatedSnapshotRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only once on mount, but we reset the refs on cancel/apply

  // Track applied selections to avoid re-applying
  const tempAppliedRef = useRef<{ layout?: string; theme?: string; palette?: string }>({});
  
  // Temporarily apply selections when they change
  useEffect(() => {
    if (!state.currentBook || !dispatch) return;
    
    // Temporarily apply layout if selected and different from last applied
    if (selectedLayout && tempAppliedRef.current.layout !== selectedLayout.id) {
      dispatch({
        type: 'APPLY_LAYOUT_TEMPLATE',
        payload: {
          template: selectedLayout,
          pageIndex: state.activePageIndex,
          applyToAllPages: false,
          skipHistory: true
        }
      });
      tempAppliedRef.current.layout = selectedLayout.id;
      (window as unknown as { _tempTemplateApplied?: boolean })._tempTemplateApplied = true;
    }
    
    // Temporarily apply theme if selected and different from last applied
    if (selectedTheme !== 'default' && tempAppliedRef.current.theme !== selectedTheme) {
      dispatch({
        type: 'SET_PAGE_THEME',
        payload: { pageIndex: state.activePageIndex, themeId: selectedTheme }
      });
      dispatch({
        type: 'APPLY_THEME_TO_ELEMENTS',
        payload: { pageIndex: state.activePageIndex, themeId: selectedTheme, skipHistory: true }
      });
      tempAppliedRef.current.theme = selectedTheme;
      (window as unknown as { _tempTemplateApplied?: boolean })._tempTemplateApplied = true;
    }
    
    // Temporarily apply palette if selected and different from last applied
    if (selectedPalette && tempAppliedRef.current.palette !== selectedPalette.id) {
      dispatch({
        type: 'SET_PAGE_COLOR_PALETTE',
        payload: { pageIndex: state.activePageIndex, colorPaletteId: selectedPalette.id, skipHistory: true }
      });
      dispatch({
        type: 'APPLY_COLOR_PALETTE',
        payload: {
          palette: selectedPalette,
          pageIndex: state.activePageIndex,
          applyToAllPages: false
        }
      });
      tempAppliedRef.current.palette = selectedPalette.id;
      (window as unknown as { _tempTemplateApplied?: boolean })._tempTemplateApplied = true;
    }
  }, [selectedLayout, selectedTheme, selectedPalette, state.currentBook, state.activePageIndex, dispatch]);
  
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
      // Clear temporary flag
      tempAppliedRef.current = {};
      (window as unknown as { _tempTemplateApplied?: boolean })._tempTemplateApplied = false;
      
      // Apply complete template with all selections (permanently)
      applyCompleteTemplate(
        selectedLayout?.id,
        selectedTheme,
        selectedPalette?.id,
        applyToBook ? 'entire-book' : 'current-page'
      );
      
      // Save current state to history (changes are already applied, now we make them permanent)
      dispatch({
        type: 'SAVE_TO_HISTORY',
        payload: `Apply Complete Template${applyToBook ? ' (Entire Book)' : ' (Current Page)'}`
      });
      
      // Reset refs to allow new snapshot on next open
      snapshotHistoryIndexRef.current = null;
      originalActivePageIndexRef.current = null;
      hasCreatedSnapshotRef.current = false;
      
      onBack();
    } catch (error) {
      console.error('Failed to apply template:', error);
    } finally {
      setIsApplying(false);
    }
  };
  
  const handleCancel = () => {
    // Clear temporary flag
    tempAppliedRef.current = {};
    (window as unknown as { _tempTemplateApplied?: boolean })._tempTemplateApplied = false;
    
    // Restore to history snapshot
    if (snapshotHistoryIndexRef.current !== null) {
      dispatch({
        type: 'GO_TO_HISTORY_STEP',
        payload: snapshotHistoryIndexRef.current
      });
      
      // Restore original activePageIndex if it was stored
      if (originalActivePageIndexRef.current !== null) {
        setTimeout(() => {
          dispatch({
            type: 'SET_ACTIVE_PAGE',
            payload: originalActivePageIndexRef.current!
          });
        }, 10);
      }
    }
    
    // Reset refs to allow new snapshot on next open
    snapshotHistoryIndexRef.current = null;
    originalActivePageIndexRef.current = null;
    hasCreatedSnapshotRef.current = false;
    
    onBack();
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
      <div className="h-full flex flex-col">
        {/* Header with Apply and Cancel buttons */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold">Template Selection</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="px-3 h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!selectedLayout && selectedTheme === 'default' && !selectedPalette || isApplying}
              className="px-3 h-8"
            >
              <Check className="h-4 w-4 mr-1" />
              {isApplying ? 'Applying...' : 'Apply'}
            </Button>
          </div>
        </div>

        {/* Content area - flex-1 to take remaining space */}
        <div className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden">
          {/* Three-column layout */}
          <div className="flex border border-gray-200 rounded-lg bg-white flex-1 min-h-0 overflow-hidden">
            <SelectorShell
              headerContent={<div className="text-sm font-medium">Select</div>}
              listSection={
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <LayoutSelector 
                    selectedLayout={selectedLayout}
                    onLayoutSelect={setSelectedLayout}
                    skipShell={true}
                  />
                </div>
              }
              className="flex-1 min-h-0"
            />
            <SelectorShell
              headerContent={<div className="text-sm font-medium">Select</div>}
              listSection={
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <ThemeSelector 
                    selectedTheme={selectedTheme}
                    onThemeSelect={setSelectedTheme}
                    skipShell={true}
                  />
                </div>
              }
              className="flex-1 min-h-0 border-l border-gray-200"
            />
            <SelectorShell
              headerContent={<div className="text-sm font-medium">Select</div>}
              listSection={
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <TemplatePalette 
                    selectedPalette={selectedPalette}
                    onPaletteSelect={setSelectedPalette}
                    skipShell={true}
                  />
                </div>
              }
              className="flex-1 min-h-0 border-l border-gray-200"
            />
          </div>

          {/* Apply scope toggle and validation warnings */}
          <div className="space-y-2 mt-4 shrink-0">
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
          </div>
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