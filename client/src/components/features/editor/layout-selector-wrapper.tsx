import { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/primitives/button';
import { Check, X } from 'lucide-react';
import { LayoutSelector as TemplateLayoutSelector } from './templates/layout-selector';
import type { PageTemplate } from '../../../types/template-types';
import { useEditor } from '../../../context/editor-context';
import { pageTemplates } from '../../../data/templates/page-templates';
import { PreviewImageDialog } from './preview/preview-image-dialog';
import { exportCanvasAsImage } from '../../../utils/canvas-export';
import Konva from 'konva';

interface LayoutSelectorWrapperProps {
  onBack: () => void;
  title: string;
  isBookLevel?: boolean;
  previewPosition?: 'top' | 'bottom'; // 'bottom' = Preview below list (default), 'top' = Preview above list
}

export function LayoutSelectorWrapper({ onBack, title, isBookLevel = false }: LayoutSelectorWrapperProps) {
  const { state, dispatch } = useEditor();
  
  // Initialize with current book/page layout if available
  const currentLayoutId = isBookLevel 
    ? state.currentBook?.layoutTemplateId 
    : state.currentBook?.pages[state.activePageIndex]?.layoutTemplateId;
  const currentLayout = currentLayoutId 
    ? pageTemplates.find((t: PageTemplate) => t.id === currentLayoutId) || null 
    : null;
  
  const [selectedLayout, setSelectedLayout] = useState<PageTemplate | null>(currentLayout);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const originalPageIndexRef = useRef<number>(state.activePageIndex);
  const previewPageIndexRef = useRef<number | null>(null);
  
  // Cleanup: Lösche Preview-Seite wenn Component unmountet
  useEffect(() => {
    return () => {
      dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    };
  }, [dispatch]);
  
  
  // Update selectedLayout when currentLayoutId changes
  useEffect(() => {
    if (currentLayoutId && currentLayout) {
      setSelectedLayout(currentLayout);
    } else if (!currentLayoutId) {
      setSelectedLayout(null);
    }
  }, [currentLayoutId, currentLayout]);
  
  // Erstelle Preview-Seite wenn Dialog öffnet
  useEffect(() => {
    if (!showPreviewDialog || !selectedLayout || !state.currentBook) {
      return;
    }
    
    // Speichere ursprüngliche Page-Index (wird nur einmal beim Öffnen gesetzt)
    if (originalPageIndexRef.current === undefined || previewPageIndexRef.current === null) {
      originalPageIndexRef.current = state.activePageIndex;
    }
    
    // Erstelle Preview-Seite nur wenn noch keine existiert
    const hasPreviewPage = state.currentBook.pages.some(p => p.isPreview);
    if (!hasPreviewPage) {
      dispatch({ type: 'CREATE_PREVIEW_PAGE', payload: originalPageIndexRef.current });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreviewDialog, selectedLayout, state.currentBook, dispatch]);
  
  // Wenn Preview-Seite erstellt wurde, navigiere dorthin und wende Layout an
  useEffect(() => {
    if (!showPreviewDialog || !selectedLayout || !state.currentBook) {
      return;
    }
    
    const previewPageIndex = state.currentBook.pages.findIndex(p => p.isPreview);
    if (previewPageIndex === -1) {
      return;
    }
    
    // Verhindere Endlosschleife: Nur verarbeiten, wenn wir noch nicht auf der Preview-Seite sind
    // oder wenn wir noch nicht verarbeitet haben
    if (previewPageIndexRef.current === previewPageIndex && state.activePageIndex === previewPageIndex) {
      return; // Bereits verarbeitet und auf Preview-Seite
    }
    
    // Wenn wir bereits auf der Preview-Seite sind, aber noch nicht verarbeitet haben,
    // dann haben wir bereits die Navigation gemacht, nur noch Layout anwenden
    const isAlreadyOnPreviewPage = state.activePageIndex === previewPageIndex;
    previewPageIndexRef.current = previewPageIndex;
    
    const applyLayoutAndExport = async () => {
      setIsExporting(true);
      
      try {
        // Navigiere zur Preview-Seite nur wenn noch nicht dort
        if (!isAlreadyOnPreviewPage) {
          dispatch({ type: 'SET_ACTIVE_PAGE', payload: previewPageIndex });
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Wende Layout auf Preview-Seite an (skip history)
        dispatch({
          type: 'APPLY_LAYOUT_TEMPLATE',
          payload: {
            template: selectedLayout,
            pageIndex: previewPageIndex,
            applyToAllPages: false,
            skipHistory: true
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const stage = (window as unknown as { konvaStage?: Konva.Stage }).konvaStage || null;
        if (stage) {
          const dataURL = await exportCanvasAsImage(stage, 0.5, 0.75);
          setPreviewImage(dataURL);
        }
      } catch (error) {
        console.error('Error creating preview:', error);
      } finally {
        setIsExporting(false);
      }
    };
    
    applyLayoutAndExport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreviewDialog, selectedLayout, state.currentBook?.pages, dispatch]);
  
  const handleApply = () => {
    if (!selectedLayout) return;
    
    // Apply layout template permanently (this will save to history)
    dispatch({
      type: 'APPLY_LAYOUT_TEMPLATE',
      payload: {
        template: selectedLayout,
        pageIndex: isBookLevel ? undefined : state.activePageIndex,
        applyToAllPages: isBookLevel
      }
    });
    
    // Also set the layout template ID for reference
    if (isBookLevel) {
      dispatch({
        type: 'SET_BOOK_LAYOUT_TEMPLATE',
        payload: selectedLayout.id
      });
    } else {
      dispatch({
        type: 'SET_PAGE_LAYOUT_TEMPLATE',
        payload: {
          pageIndex: state.activePageIndex,
          layoutTemplateId: selectedLayout.id
        }
      });
    }
    
    // Save current state to history
    dispatch({
      type: 'SAVE_TO_HISTORY',
      payload: `Apply ${isBookLevel ? 'Book' : 'Page'} Layout: ${selectedLayout.name}`
    });
    
    onBack();
  };
  
  const handleCancel = () => {
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    onBack();
  };
  
  const handlePreview = () => {
    if (!selectedLayout) return;
    setShowPreviewDialog(true);
  };
  
  const handleRefreshPreview = async (): Promise<string | null> => {
    const stage = (window as unknown as { konvaStage?: Konva.Stage }).konvaStage || null;
    if (stage) {
      const dataURL = await exportCanvasAsImage(stage, 0.5, 0.75);
      setPreviewImage(dataURL);
      return dataURL;
    }
    return null;
  };
  
  const handleApplyToPage = () => {
    if (!selectedLayout) return;
    
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    
    setTimeout(() => {
      dispatch({
        type: 'APPLY_LAYOUT_TEMPLATE',
        payload: {
          template: selectedLayout,
          pageIndex: state.activePageIndex,
          applyToAllPages: false
        }
      });
      
      dispatch({
        type: 'SET_PAGE_LAYOUT_TEMPLATE',
        payload: {
          pageIndex: state.activePageIndex,
          layoutTemplateId: selectedLayout.id
        }
      });
      
      dispatch({
        type: 'SAVE_TO_HISTORY',
        payload: `Apply Page Layout: ${selectedLayout.name}`
      });
    }, 100);
  };
  
  const handleApplyToBook = () => {
    if (!selectedLayout) return;
    
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    
    setTimeout(() => {
      dispatch({
        type: 'APPLY_LAYOUT_TEMPLATE',
        payload: {
          template: selectedLayout,
          pageIndex: undefined,
          applyToAllPages: true
        }
      });
      
      dispatch({
        type: 'SET_BOOK_LAYOUT_TEMPLATE',
        payload: selectedLayout.id
      });
      
      dispatch({
        type: 'SAVE_TO_HISTORY',
        payload: `Apply Book Layout: ${selectedLayout.name}`
      });
    }, 100);
  };
  
  const handleCancelFromPreview = () => {
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    setShowPreviewDialog(false);
    setPreviewImage(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Apply and Cancel buttons */}
      <div className="flex flex-col items-center justify-between p-4 border-b border-gray-200 shrink-0">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-3">
            <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="py-5 px-3 h-8"
            >
                <X className="h-4 w-4 mr mr-1" />
                Cancel
            </Button>
            <Button
                variant="default"
                size="sm"
                onClick={handleApply}
                disabled={!selectedLayout}
                className="py-5 px-3 h-8"
            >
                <Check className="h-4 w-4 mr-1" />
                Apply
            </Button>
            </div>
        </div>
      </div>

      {/* <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={!selectedLayout}
            className="px-3 h-8"
            title="Preview auf aktueller Seite anzeigen"
          >
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
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
            variant="default"
            size="sm"
            onClick={handleApply}
            disabled={!selectedLayout}
            className="px-3 h-8"
          >
            <Check className="h-4 w-4 mr-1" />
            Apply
          </Button>
        </div>
      </div> */}

      {/* Content area - flex-1 to take remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        <TemplateLayoutSelector
          selectedLayout={selectedLayout}
          onLayoutSelect={setSelectedLayout}
          onPreviewClick={(template) => {
            setSelectedLayout(template);
            handlePreview();
          }}
          previewPosition="bottom"
        />
      </div>

      {/* Preview Dialog */}
      <PreviewImageDialog
        isOpen={showPreviewDialog}
        onClose={() => handleCancelFromPreview()}
        previewImage={previewImage}
        onApplyToPage={handleApplyToPage}
        onApplyToBook={handleApplyToBook}
        onCancel={handleCancelFromPreview}
        previewType="layout"
        isBookLevel={isBookLevel}
        onRefreshPreview={handleRefreshPreview}
        isLoading={isExporting}
      />
    </div>
  );
}

