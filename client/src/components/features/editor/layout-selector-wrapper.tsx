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
import { getActiveTemplateIds } from '../../../utils/template-inheritance';

interface LayoutSelectorWrapperProps {
  onBack: () => void;
  title: string;
  isBookLevel?: boolean;
  previewPosition?: 'top' | 'bottom'; // 'bottom' = Preview below list (default), 'top' = Preview above list
}

export function LayoutSelectorWrapper({ onBack, title, isBookLevel = false }: LayoutSelectorWrapperProps) {
  const { state, dispatch } = useEditor();
  
  // Get active layout template ID with inheritance fallback
  const currentPage = isBookLevel ? undefined : state.currentBook?.pages[state.activePageIndex];
  const activeTemplateIds = getActiveTemplateIds(currentPage, state.currentBook);
  const currentLayoutId = activeTemplateIds.layoutTemplateId;
  
  const currentLayout = currentLayoutId 
    ? pageTemplates.find((t: PageTemplate) => t.id === currentLayoutId) || null 
    : null;
  
  const [selectedLayout, setSelectedLayout] = useState<PageTemplate | null>(currentLayout);
  const [previewLayout, setPreviewLayout] = useState<PageTemplate | null>(null); // Separate state for preview
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
  
  
  // Update selectedLayout when currentLayoutId changes (with inheritance fallback)
  useEffect(() => {
    if (currentLayoutId && currentLayout) {
      setSelectedLayout(currentLayout);
    } else if (!currentLayoutId) {
      setSelectedLayout(null);
    }
  }, [currentLayoutId, currentLayout]);
  
  // Erstelle Preview-Seite wenn Dialog öffnet
  useEffect(() => {
    if (!showPreviewDialog || !previewLayout || !state.currentBook) {
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
  }, [showPreviewDialog, previewLayout, state.currentBook, dispatch]);
  
  // Wenn Preview-Seite erstellt wurde, navigiere dorthin und wende Layout an
  useEffect(() => {
    if (!showPreviewDialog || !previewLayout || !state.currentBook) {
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
            template: previewLayout,
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
  }, [showPreviewDialog, previewLayout, state.currentBook?.pages, dispatch]);
  
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
  
  const handlePreview = (template?: PageTemplate) => {
    const layoutToPreview = template || selectedLayout;
    if (!layoutToPreview) return;
    // Set preview layout (without changing selectedLayout to avoid blue border)
    setPreviewLayout(layoutToPreview);
    // Open dialog immediately
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
    if (!previewLayout) return;
    
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    
    setTimeout(() => {
      dispatch({
        type: 'APPLY_LAYOUT_TEMPLATE',
        payload: {
          template: previewLayout,
          pageIndex: state.activePageIndex,
          applyToAllPages: false
        }
      });
      
      dispatch({
        type: 'SET_PAGE_LAYOUT_TEMPLATE',
        payload: {
          pageIndex: state.activePageIndex,
          layoutTemplateId: previewLayout.id
        }
      });
      
      // Update selectedLayout after applying
      setSelectedLayout(previewLayout);
      
      dispatch({
        type: 'SAVE_TO_HISTORY',
        payload: `Apply Page Layout: ${previewLayout.name}`
      });
    }, 100);
  };
  
  const handleApplyToBook = () => {
    if (!previewLayout) return;
    
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    
    setTimeout(() => {
      dispatch({
        type: 'APPLY_LAYOUT_TEMPLATE',
        payload: {
          template: previewLayout,
          pageIndex: undefined,
          applyToAllPages: true
        }
      });
      
      dispatch({
        type: 'SET_BOOK_LAYOUT_TEMPLATE',
        payload: previewLayout.id
      });
      
      // Update selectedLayout after applying
      setSelectedLayout(previewLayout);
      
      dispatch({
        type: 'SAVE_TO_HISTORY',
        payload: `Apply Book Layout: ${previewLayout.name}`
      });
    }, 100);
  };
  
  const handleCancelFromPreview = () => {
    dispatch({ type: 'DELETE_PREVIEW_PAGE' });
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: originalPageIndexRef.current });
    setShowPreviewDialog(false);
    setPreviewImage(null);
    setPreviewLayout(null);
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

      {/* Content area - flex-1 to take remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        <TemplateLayoutSelector
          selectedLayout={selectedLayout}
          onLayoutSelect={setSelectedLayout}
          onPreviewClick={(template) => {
            // Open preview dialog immediately with the template
            handlePreview(template);
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

