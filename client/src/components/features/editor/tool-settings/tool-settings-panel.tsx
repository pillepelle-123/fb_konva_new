import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import { ToolSettingsContainer } from './tool-settings-container';
import { ToolSettingsHeader } from './tool-settings-header';
import { ToolSettingsContent } from './tool-settings-content';
import { Dialog, DialogContent } from '../../../ui/overlays/dialog';
import { Modal } from '../../../ui/overlays/modal';
import QuestionsManagerDialog from '../questions-manager-dialog';
import ImagesContent from '../../images/images-content';
import PagePreviewOverlay from '../preview/page-preview-overlay';
import { SquareMousePointer, Hand, MessageCircle, MessageCircleQuestion, MessageCircleHeart, Image, Minus, Circle, Square, Paintbrush, Heart, Star, MessageSquare, Dog, Cat, Smile } from 'lucide-react';
import { getBackgroundImagesWithUrl } from '../../../../data/templates/background-images';
import { applyBackgroundImageTemplate } from '../../../../utils/background-image-utils';


const TOOL_ICONS = {
  select: SquareMousePointer,
  pan: Hand,
  text: MessageCircle,
  question: MessageCircleQuestion,
  answer: MessageCircleHeart,
  image: Image,
  line: Minus,
  circle: Circle,
  rect: Square,
  brush: Paintbrush,
  heart: Heart,
  star: Star,
  'speech-bubble': MessageSquare,
  dog: Dog,
  cat: Cat,
  smiley: Smile
};

export interface ToolSettingsPanelRef {
  openBookTheme: () => void;
}

interface ToolSettingsPanelProps {}

const ToolSettingsPanel = forwardRef<ToolSettingsPanelRef, ToolSettingsPanelProps>((props, ref) => {
  const { state, dispatch } = useEditor();
  const { token, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [selectedQuestionElementId, setSelectedQuestionElementId] = useState<string | null>(null);
  const [activeLinkedElement, setActiveLinkedElement] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageElementId, setSelectedImageElementId] = useState<string | null>(null);
  const [showBackgroundImageModal, setShowBackgroundImageModal] = useState(false);
  const [showBackgroundImageTemplateSelector, setShowBackgroundImageTemplateSelector] = useState(false);
  const [showPatternSettings, setShowPatternSettings] = useState(false);
  const [showBackgroundSettings, setShowBackgroundSettings] = useState(false);
  const [showColorSelector, setShowColorSelector] = useState<string | null>(null);
  const [showPageTheme, setShowPageTheme] = useState(false);
  const [showBookTheme, setShowBookTheme] = useState(false);
  const [showFontSelector, setShowFontSelector] = useState(false);
  const [showTemplateOverlay, setShowTemplateOverlay] = useState(false);
  const [showLayoutOverlay, setShowLayoutOverlay] = useState(false);
  const [showBookLayoutOverlay, setShowBookLayoutOverlay] = useState(false);
  const [showThemeOverlay, setShowThemeOverlay] = useState(false);
  const [showPaletteOverlay, setShowPaletteOverlay] = useState(false);
  const [showBookPaletteOverlay, setShowBookPaletteOverlay] = useState(false);
  
  // State for background image selection
  const [selectedBackgroundImageId, setSelectedBackgroundImageId] = useState<string | null>(null);
  const activeTool = state.activeTool;

  useImperativeHandle(ref, () => ({
    openBookTheme: () => {
      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
      setIsCollapsed(false);
      setShowBookTheme(true);
    }
  }), [dispatch]);

  // Set default active element for linked pairs (removed auto-expand logic)
  useEffect(() => {
    if (state.selectedElementIds.length === 2 && state.currentBook) {
      const selectedElements = state.currentBook.pages[state.activePageIndex]?.elements.filter(
        el => state.selectedElementIds.includes(el.id)
      ) || [];
      
      const questionElement = selectedElements.find(el => el.textType === 'question');
      const answerElement = selectedElements.find(el => el.textType === 'answer' && el.questionElementId === questionElement?.id);
      
      if (questionElement && answerElement && !activeLinkedElement) {
        setActiveLinkedElement(questionElement.id);
      }
    } else {
      setActiveLinkedElement(null);
    }
  }, [state.selectedElementIds.length, state.currentBook, state.activePageIndex, activeLinkedElement]);

  // Flash effect when elements are selected
  useEffect(() => {
    if (state.selectedElementIds.length > 0 && isCollapsed) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [state.selectedElementIds.length, isCollapsed]);

  const isOnAssignedPage = state.userRole === 'author' 
    ? state.assignedPages.includes(state.activePageIndex + 1)
    : true;
  
  // Force collapsed state for authors on non-assigned pages, auto-open for assigned pages
  useEffect(() => {
    if (state.userRole === 'author') {
      if (!isOnAssignedPage) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    }
  }, [state.userRole, isOnAssignedPage]);

  // Reset settings views when not showing background settings
  useEffect(() => {
    if (activeTool !== 'select' || state.selectedElementIds.length > 0) {
      setShowPatternSettings(false);
      setShowBackgroundSettings(false);
    }
    // Reset color selector when element selection changes
    setShowColorSelector(null);
  }, [activeTool, state.selectedElementIds.length]);
  
  // Initialize background image state when selector opens
  useEffect(() => {
    if (showBackgroundImageTemplateSelector) {
      const currentPage = state.currentBook?.pages[state.activePageIndex];
      const currentBackground = currentPage?.background;
      if (currentBackground?.type === 'image') {
        setSelectedBackgroundImageId(currentBackground.backgroundImageTemplateId || null);
      }
    } else {
      // Reset when selector closes
      setSelectedBackgroundImageId(null);
    }
  }, [showBackgroundImageTemplateSelector, state.activePageIndex, state.currentBook?.pages]);

  const getColorSelectorTitle = (colorType: string) => {
    switch (colorType) {
      case 'line-stroke':
      case 'brush-stroke':
        return 'Color';
      case 'shape-stroke':
      case 'element-brush-stroke':
      case 'element-line-stroke':
      case 'element-shape-stroke':
        return 'Stroke Color';
      case 'shape-fill':
      case 'element-shape-fill':
        return 'Fill Color';
      case 'text-color':
      case 'element-text-color':
        return 'Font Color & Opacity';
      case 'text-border':
      case 'element-text-border':
        return 'Border Color';
      case 'text-background':
      case 'element-text-background':
        return 'Background Color & Opacity';
      case 'background-color':
        return 'Color';
      case 'pattern-background':
        return 'Background Color & Opacity';
      case 'ruled-lines-color':
      case 'element-ruled-lines-color':
        return 'Line Color';
      default:
        return 'Color Selector';
    }
  };
















  const currentPage = state.currentBook?.pages?.[state.activePageIndex];
  const currentBackgroundImageId = currentPage?.background?.backgroundImageTemplateId ?? null;
  const isBackgroundApplyDisabled = !selectedBackgroundImageId || selectedBackgroundImageId === currentBackgroundImageId;

  const handleApplyBackgroundImage = () => {
    if (!selectedBackgroundImageId || !state.currentBook || !currentPage) return;

    const allImages = getBackgroundImagesWithUrl();
    const selectedImageData = allImages.find((img) => img.id === selectedBackgroundImageId) ?? null;

    const background = applyBackgroundImageTemplate(selectedBackgroundImageId, {
      imageSize: currentPage.background?.imageSize || 'cover',
      imageRepeat: currentPage.background?.imageRepeat || false,
      backgroundColor:
        selectedImageData?.backgroundColor?.enabled && selectedImageData.backgroundColor.defaultValue
          ? selectedImageData.backgroundColor.defaultValue
          : undefined,
    });

    if (!background) {
      return;
    }

    if (currentPage.background) {
      background.imageSize = currentPage.background.imageSize || 'cover';
      background.imageRepeat = currentPage.background.imageRepeat || false;
      background.imagePosition = currentPage.background.imagePosition || 'top-left';
      background.opacity = currentPage.background.opacity ?? 0.15;
    }

    dispatch({
      type: 'UPDATE_PAGE_BACKGROUND',
      payload: {
        pageIndex: state.activePageIndex,
        background,
      },
    });

    setShowBackgroundImageTemplateSelector(false);
  };

  // Hide tool settings panel completely for users without edit permissions
  if (state.editorInteractionLevel === 'no_access' || state.editorInteractionLevel === 'answer_only') {
    return null;
  }

  return (
    <>
      <ToolSettingsContainer 
        isExpanded={!isCollapsed} 
        isVisible={state.settingsPanelVisible}
      >

        {/* Header with Collapse Button */}
        <ToolSettingsHeader
          isCollapsed={isCollapsed}
          onToggleCollapsed={() => setIsCollapsed(!isCollapsed)}
          activeLinkedElement={activeLinkedElement}
          setActiveLinkedElement={setActiveLinkedElement}
          showColorSelector={showColorSelector}
          getColorSelectorTitle={getColorSelectorTitle}
          isOnAssignedPage={isOnAssignedPage}
          showBackgroundSettings={showBackgroundSettings}
          showPageTheme={showPageTheme}
          showBookTheme={showBookTheme}
        />
        
        {/* Selected Tool Icon Preview (when collapsed) */}
        {isCollapsed && state.selectedElementIds.length > 0 && (
          <div className="p-1 pt-3">
            <div className="flex items-center justify-center p-1">
              {(() => {
                // Get the appropriate icon for selected element(s) - same logic as header
                let IconComponent = null;
                
                if (state.selectedElementIds.length === 2 && state.currentBook) {
                  const selectedElements = state.currentBook.pages[state.activePageIndex]?.elements.filter(
                    el => state.selectedElementIds.includes(el.id)
                  ) || [];
                  
                  const questionElement = selectedElements.find(el => el.textType === 'question');
                  const answerElement = selectedElements.find(el => el.textType === 'answer' && el.questionElementId === questionElement?.id);
                  
                  if (questionElement && answerElement) {
                    IconComponent = MessageCircleQuestion;
                  }
                } else if (state.selectedElementIds.length > 1) {
                  IconComponent = TOOL_ICONS.select;
                } else if (state.selectedElementIds.length === 1 && state.currentBook) {
                  const selectedElement = state.currentBook.pages[state.activePageIndex]?.elements.find(
                    el => el.id === state.selectedElementIds[0]
                  );
                  if (selectedElement) {
                    const elementType = selectedElement.type === 'text' && selectedElement.textType 
                      ? selectedElement.textType 
                      : selectedElement.type;
                    IconComponent = TOOL_ICONS[elementType as keyof typeof TOOL_ICONS];
                  }
                }
                
                return IconComponent ? (
                  <IconComponent className={`h-6 w-6 ${isFlashing ? 'animate-pulse text-blue-500' : 'text-muted-foreground'}`} />
                ) : null;
              })()} 
            </div>
          </div>
        )}
        
        {/* Tool Settings Main Area */}
        {!isCollapsed && (
          <ToolSettingsContent
            showColorSelector={showColorSelector}
            setShowColorSelector={setShowColorSelector}
            showBackgroundSettings={showBackgroundSettings}
            setShowBackgroundSettings={setShowBackgroundSettings}
            showPatternSettings={showPatternSettings}
            setShowPatternSettings={setShowPatternSettings}
            showPageTheme={showPageTheme}
            setShowPageTheme={setShowPageTheme}
            showBookTheme={showBookTheme}
            setShowBookTheme={setShowBookTheme}
            showImageModal={showImageModal}
            setShowImageModal={setShowImageModal}
            showBackgroundImageModal={showBackgroundImageModal}
            setShowBackgroundImageModal={setShowBackgroundImageModal}
            showBackgroundImageTemplateSelector={showBackgroundImageTemplateSelector}
            setShowBackgroundImageTemplateSelector={setShowBackgroundImageTemplateSelector}
            selectedImageElementId={selectedImageElementId}
            selectedBackgroundImageId={selectedBackgroundImageId}
            onBackgroundImageSelect={setSelectedBackgroundImageId}
            setSelectedImageElementId={setSelectedImageElementId}
            showQuestionDialog={showQuestionDialog}
            setShowQuestionDialog={setShowQuestionDialog}
            selectedQuestionElementId={selectedQuestionElementId}
            setSelectedQuestionElementId={setSelectedQuestionElementId}
            activeLinkedElement={activeLinkedElement}
            showFontSelector={showFontSelector}
            setShowFontSelector={setShowFontSelector}
            onOpenTemplates={() => setShowTemplateOverlay(true)}
            onOpenLayouts={() => setShowLayoutOverlay(true)}
            onOpenBookLayouts={() => setShowBookLayoutOverlay(true)}
            onOpenThemes={() => setShowThemeOverlay(true)}
            onOpenPalettes={() => setShowPaletteOverlay(true)}
            onApplyBackgroundImage={handleApplyBackgroundImage}
            isBackgroundApplyDisabled={isBackgroundApplyDisabled}
          />
        )}
      </ToolSettingsContainer>
      
      {showQuestionDialog && state.currentBook && token && (
        <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <QuestionsManagerDialog
              bookId={state.currentBook.id}
              bookName={state.currentBook.name}
              mode="select"
              token={token}
              onQuestionSelect={(questionId, questionText) => {
                if (selectedQuestionElementId) {
                  const updates = questionId === 0 
                    ? { text: '', fill: '#9ca3af', questionId: undefined }
                    : { text: questionText, fill: '#1f2937', questionId: questionId };
                  dispatch({
                    type: 'UPDATE_ELEMENT',
                    payload: {
                      id: selectedQuestionElementId,
                      updates
                    }
                  });
                }
                setShowQuestionDialog(false);
                setSelectedQuestionElementId(null);
              }}
              onClose={() => {
                setShowQuestionDialog(false);
                setSelectedQuestionElementId(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
      
      <Modal
        isOpen={showImageModal}
        onClose={() => {
          setShowImageModal(false);
          setSelectedImageElementId(null);
        }}
        title="Select Image"
      >
        <ImagesContent
          token={token || ''}
          mode="select"
          onImageSelect={(imageId: number, imageUrl: string) => {
            if (selectedImageElementId) {
              const currentElement = state.currentBook?.pages[state.activePageIndex]?.elements.find(el => el.id === selectedImageElementId);
              if (currentElement) {
                const img = new window.Image();
                img.onload = () => {
                  const currentWidth = currentElement.width;
                  const currentHeight = currentElement.height;
                  const newAspectRatio = img.width / img.height;
                  const currentAspectRatio = currentWidth / currentHeight;
                  
                  let newWidth, newHeight;
                  
                  if (Math.abs(newAspectRatio - currentAspectRatio) > 0.5) {
                    // Significant aspect ratio change - swap dimensions
                    const targetArea = currentWidth * currentHeight;
                    newHeight = Math.sqrt(targetArea / newAspectRatio);
                    newWidth = newHeight * newAspectRatio;
                  } else {
                    // Similar aspect ratio - maintain current size
                    if (newAspectRatio > currentAspectRatio) {
                      newWidth = currentWidth;
                      newHeight = currentWidth / newAspectRatio;
                    } else {
                      newHeight = currentHeight;
                      newWidth = currentHeight * newAspectRatio;
                    }
                  }
                  
                  const cacheBustedUrl = `${imageUrl}?t=${Date.now()}`;
                  dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Change Image' });
                  dispatch({
                    type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                    payload: {
                      id: selectedImageElementId,
                      updates: { 
                        src: cacheBustedUrl,
                        width: Math.round(newWidth),
                        height: Math.round(newHeight)
                      }
                    }
                  });
                  setTimeout(() => {
                    dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
                    setTimeout(() => {
                      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [selectedImageElementId] });
                    }, 10);
                  }, 10);
                };
                img.src = imageUrl;
              }
            }
            setShowImageModal(false);
            setSelectedImageElementId(null);
          }}
          onImageUpload={(imageUrl) => {
            if (selectedImageElementId) {
              const currentElement = state.currentBook?.pages[state.activePageIndex]?.elements.find(el => el.id === selectedImageElementId);
              if (currentElement) {
                const img = new window.Image();
                img.onload = () => {
                  const currentWidth = currentElement.width;
                  const currentHeight = currentElement.height;
                  const newAspectRatio = img.width / img.height;
                  const currentAspectRatio = currentWidth / currentHeight;
                  
                  let newWidth, newHeight;
                  
                  if (Math.abs(newAspectRatio - currentAspectRatio) > 0.5) {
                    // Significant aspect ratio change - swap dimensions
                    const targetArea = currentWidth * currentHeight;
                    newHeight = Math.sqrt(targetArea / newAspectRatio);
                    newWidth = newHeight * newAspectRatio;
                  } else {
                    // Similar aspect ratio - maintain current size
                    if (newAspectRatio > currentAspectRatio) {
                      newWidth = currentWidth;
                      newHeight = currentWidth / newAspectRatio;
                    } else {
                      newHeight = currentHeight;
                      newWidth = currentHeight * newAspectRatio;
                    }
                  }
                  
                  const cacheBustedUrl = `${imageUrl}?t=${Date.now()}`;
                  dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Change Image' });
                  dispatch({
                    type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                    payload: {
                      id: selectedImageElementId,
                      updates: { 
                        src: cacheBustedUrl,
                        width: Math.round(newWidth),
                        height: Math.round(newHeight)
                      }
                    }
                  });
                  setTimeout(() => {
                    dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
                    setTimeout(() => {
                      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [selectedImageElementId] });
                    }, 10);
                  }, 10);
                };
                img.src = imageUrl;
              }
            }
            setShowImageModal(false);
            setSelectedImageElementId(null);
          }}
          onClose={() => {
            setShowImageModal(false);
            setSelectedImageElementId(null);
          }}
        />
      </Modal>
      
      <Modal
        isOpen={showBackgroundImageModal}
        onClose={() => setShowBackgroundImageModal(false)}
        title="Select Background Image"
      >
        <ImagesContent
          token={token || ''}
          mode="select"
          onImageSelect={(imageId: number, imageUrl: string) => {
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            const background = currentPage?.background || { type: 'color', value: '#ffffff', opacity: 1 };
            const newBackground = { ...background, type: 'image' as const, value: imageUrl, imageSize: 'cover' as const };
            dispatch({
              type: 'UPDATE_PAGE_BACKGROUND',
              payload: { pageIndex: state.activePageIndex, background: newBackground }
            });
            setShowBackgroundImageModal(false);
          }}
          onImageUpload={(imageUrl: string) => {
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            const background = currentPage?.background || { type: 'color', value: '#ffffff', opacity: 1 };
            const newBackground = { ...background, type: 'image' as const, value: imageUrl, imageSize: 'cover' as const };
            dispatch({
              type: 'UPDATE_PAGE_BACKGROUND',
              payload: { pageIndex: state.activePageIndex, background: newBackground }
            });
            setShowBackgroundImageModal(false);
          }}
          onClose={() => setShowBackgroundImageModal(false)}
        />
      </Modal>
      
      <PagePreviewOverlay
        isOpen={showTemplateOverlay}
        onClose={() => setShowTemplateOverlay(false)}
        content="templates"
      />
      
      <PagePreviewOverlay
        isOpen={showLayoutOverlay}
        onClose={() => setShowLayoutOverlay(false)}
        content="layouts"
        isBookLevel={false}
      />
      
      <PagePreviewOverlay
        isOpen={showBookLayoutOverlay}
        onClose={() => setShowBookLayoutOverlay(false)}
        content="layouts"
        isBookLevel={true}
      />
      
      <PagePreviewOverlay
        isOpen={showThemeOverlay}
        onClose={() => setShowThemeOverlay(false)}
        content="themes"
        isBookLevel={false}
      />
      
      <PagePreviewOverlay
        isOpen={showPaletteOverlay}
        onClose={() => setShowPaletteOverlay(false)}
        content="palettes"
        isBookLevel={false}
      />

    </>
  );
});

export default ToolSettingsPanel;