import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import { ToolSettingsContainer } from './tool-settings-container';
import { ToolSettingsHeader } from './tool-settings-header';
import { ToolSettingsContent } from './tool-settings-content';
import { Modal } from '../../../ui/overlays/modal';
import { QuestionSelectorModal } from '../question-selector-modal';
import ImagesContent from '../../images/images-content';
import { SquareMousePointer, Hand, MessageCircle, MessageCircleQuestion, MessageCircleHeart, Image, Minus, Circle, Square, Paintbrush, Heart, Star, MessageSquare, Dog, Cat, Smile } from 'lucide-react';
import { getBackgroundImagesWithUrl } from '../../../../data/templates/background-images';
import { applyBackgroundImageTemplate } from '../../../../utils/background-image-utils';
import type { Conversation } from '../../messenger/types';


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
  const [showBookPaletteOverlay, setShowBookPaletteOverlay] = useState(false);
  const [showBookChatPanel, setShowBookChatPanel] = useState(false);
  const [showPagePalette, setShowPagePalette] = useState(false);
  const [showBookPalette, setShowBookPalette] = useState(false);
  const [showPageLayout, setShowPageLayout] = useState(false);
  const [showBookLayout, setShowBookLayout] = useState(false);
  const [showPageThemeSelector, setShowPageThemeSelector] = useState(false);
  const [showBookThemeSelector, setShowBookThemeSelector] = useState(false);
  const [selectorTitle, setSelectorTitle] = useState<string | null>(null);
  const [bookChatConversation, setBookChatConversation] = useState<Conversation | null>(null);
  const [bookChatLoading, setBookChatLoading] = useState(false);
  const [bookChatError, setBookChatError] = useState<string | null>(null);
  const [bookChatShouldFocusInput, setBookChatShouldFocusInput] = useState(false);
  const isBookChatAvailable = Boolean(
    (state.currentBook as any)?.groupChatEnabled ?? (state.currentBook as any)?.group_chat_enabled
  );

  const fetchBookChatConversation = useCallback(async () => {
    if (!state.currentBook?.id || !token) {
      return null;
    }
    setBookChatLoading(true);
    setBookChatError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/messenger/books/${state.currentBook.id}/conversation`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }
      const data = await response.json();
      setBookChatConversation(data.conversation);
      return data.conversation as Conversation;
    } catch (error) {
      console.error('Error fetching book chat conversation:', error);
      setBookChatError('Chat konnte nicht geladen werden.');
      return null;
    } finally {
      setBookChatLoading(false);
    }
  }, [state.currentBook?.id, token]);

  const handleOpenBookChat = useCallback(() => {
    if (!isBookChatAvailable) {
      return;
    }
    setShowBookChatPanel(true);
    setBookChatShouldFocusInput(true);
    if (!bookChatConversation || bookChatConversation.book_id !== state.currentBook?.id) {
      fetchBookChatConversation();
    }
  }, [isBookChatAvailable, bookChatConversation, state.currentBook?.id, fetchBookChatConversation]);

  const handleCloseBookChat = useCallback(() => {
    setShowBookChatPanel(false);
  }, []);

  useEffect(() => {
    setShowBookChatPanel(false);
    setBookChatConversation(null);
    setBookChatError(null);
  }, [state.currentBook?.id]);
  
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
        return 'Font Color';
      case 'text-border':
      case 'element-text-border':
        return 'Border Color';
      case 'text-background':
      case 'element-text-background':
        return 'Background Color';
      case 'background-color':
        return 'Color';
      case 'pattern-background':
        return 'Background Color';
      case 'ruled-lines-color':
      case 'element-ruled-lines-color':
        return 'Line Color';
      case 'element-sticker-color':
        return 'Sticker Color';
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
          showFontSelector={showFontSelector}
          showBookChatPanel={showBookChatPanel}
          showPagePalette={showPagePalette}
          showBookPalette={showBookPalette}
          showPageLayout={showPageLayout}
          showBookLayout={showBookLayout}
          showPageThemeSelector={showPageThemeSelector}
          showBookThemeSelector={showBookThemeSelector}
          selectorTitle={selectorTitle}
          onBack={() => {
            // Reset all dialog states
            setShowColorSelector(null);
            setShowBackgroundSettings(false);
            setShowPatternSettings(false);
            setShowPageTheme(false);
            setShowBookTheme(false);
            setShowFontSelector(false);
            setShowBookChatPanel(false);
            // Clear grouped element selection
            dispatch({ type: 'SET_SELECTED_GROUPED_ELEMENT', payload: null });
            // Clear selected elements if we're in a grouped element view
            if (state.selectedGroupedElement) {
              dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
            }
          }}
          onCancel={() => {
            // Close all selector dialogs
            setShowPagePalette(false);
            setShowBookPalette(false);
            setShowPageLayout(false);
            setShowBookLayout(false);
            setShowPageThemeSelector(false);
            setShowBookThemeSelector(false);
          }}
          onApply={() => {
            // Apply logic - for now, just close the dialogs
            // The actual apply logic is handled by the individual components
            // This will be enhanced later to trigger the apply actions
            setShowPagePalette(false);
            setShowBookPalette(false);
            setShowPageLayout(false);
            setShowBookLayout(false);
            setShowPageThemeSelector(false);
            setShowBookThemeSelector(false);
          }}
          canApply={showPagePalette || showBookPalette || showPageLayout || showBookLayout || showPageThemeSelector || showBookThemeSelector}
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
            onApplyBackgroundImage={handleApplyBackgroundImage}
          isBackgroundApplyDisabled={isBackgroundApplyDisabled}
          isBookChatAvailable={isBookChatAvailable}
          onOpenBookChat={handleOpenBookChat}
          showBookChatPanel={showBookChatPanel}
          onCloseBookChat={handleCloseBookChat}
          bookChatConversation={bookChatConversation}
          bookChatLoading={bookChatLoading}
          bookChatError={bookChatError}
          onRetryBookChat={fetchBookChatConversation}
          bookChatShouldFocusInput={bookChatShouldFocusInput}
          onChatInputFocused={() => setBookChatShouldFocusInput(false)}
          showPagePalette={showPagePalette}
          setShowPagePalette={setShowPagePalette}
          showBookPalette={showBookPalette}
          setShowBookPalette={setShowBookPalette}
          showPageLayout={showPageLayout}
          setShowPageLayout={setShowPageLayout}
          showBookLayout={showBookLayout}
          setShowBookLayout={setShowBookLayout}
          showPageThemeSelector={showPageThemeSelector}
          setShowPageThemeSelector={setShowPageThemeSelector}
          showBookThemeSelector={showBookThemeSelector}
          setShowBookThemeSelector={setShowBookThemeSelector}
          setSelectorTitle={setSelectorTitle}
          />
        )}
      </ToolSettingsContainer>
      
      {showQuestionDialog && state.currentBook && token && (
        <QuestionSelectorModal
          isOpen={showQuestionDialog}
          onClose={() => setShowQuestionDialog(false)}
          onQuestionSelect={(questionId, questionText, questionPosition) => {
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
        />
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

    </>
  );
});

export default ToolSettingsPanel;