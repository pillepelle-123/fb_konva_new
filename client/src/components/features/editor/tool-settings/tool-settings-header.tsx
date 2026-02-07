import { useEditor, type CanvasElement } from '../../../../context/editor-context';
import { Button } from '../../../ui/primitives/button';
import { Undo2, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { getHeaderTitleAndIcon } from './tool-settings-utils';

interface ToolSettingsHeaderProps {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  activeLinkedElement: string | null;
  setActiveLinkedElement: (id: string | null) => void;
  showColorSelector: string | null;
  isOnAssignedPage: boolean;
  showBackgroundSettings: boolean;
  showPageTheme: boolean;
  showBookTheme: boolean;
  showFontSelector?: boolean;
  showBookChatPanel?: boolean;
  showPagePalette?: boolean;
  showBookPalette?: boolean;
  showPageLayout?: boolean;
  showBookLayout?: boolean;
  showPageThemeSelector?: boolean;
  showBookThemeSelector?: boolean;
  showEditorSettings?: boolean;
  showPatternSettings?: boolean;
  selectorTitle?: string | null;
  onBack?: () => void;
  onCancel?: () => void;
  onApply?: () => void;
  canApply?: boolean;
}

export function ToolSettingsHeader({
  isCollapsed,
  onToggleCollapsed,
  activeLinkedElement,
  setActiveLinkedElement,
  showColorSelector,
  isOnAssignedPage,
  showBackgroundSettings,
  showPageTheme,
  showBookTheme,
  showFontSelector = false,
  showBookChatPanel = false,
  showPagePalette = false,
  showBookPalette = false,
  showPageLayout = false,
  showBookLayout = false,
  showPageThemeSelector = false,
  showBookThemeSelector = false,
  showEditorSettings = false,
  showPatternSettings = false,
  selectorTitle = null,
  onBack,
  onCancel,
  onApply,
  canApply = false
}: ToolSettingsHeaderProps) {
  const { state } = useEditor();
  const activeTool = state.activeTool;

  // Check if any dialog is open
  // Include element-specific color selectors (those starting with 'element-')
  // This includes: element-text-color, element-ruled-lines-color, element-border-color, element-background-color
  const hasOpenDialog = Boolean(showColorSelector) || showBackgroundSettings || showPageTheme || showBookTheme || showFontSelector || showBookChatPanel || state.selectedGroupedElement;

  // Check if any selector is open
  const hasOpenSelector = showPagePalette || showBookPalette || showPageLayout || showBookLayout || showPageThemeSelector || showBookThemeSelector;

  // Determine if we have a linked question-answer pair
  let isLinkedQuestionAnswerPair = false;
  let selectedElement: CanvasElement | null = null;

  if (state.selectedElementIds.length === 2 && state.currentBook) {
    const selectedElements = state.currentBook.pages[state.activePageIndex]?.elements.filter(
      el => state.selectedElementIds.includes(el.id)
    ) || [];

    const questionElement = selectedElements.find(el => el.textType === 'question');
    const answerElement = selectedElements.find(el => el.textType === 'answer' && el.questionElementId === questionElement?.id);

    if (questionElement && answerElement) {
      isLinkedQuestionAnswerPair = true;
    }
  } else if (state.selectedElementIds.length === 1 && state.currentBook) {
    selectedElement = state.currentBook.pages[state.activePageIndex]?.elements.find(
      el => el.id === state.selectedElementIds[0]
    ) || null;

    // If a grouped element is selected, show that element's type
    if (state.selectedGroupedElement && selectedElement?.groupedElements) {
      const groupedElementId = state.selectedGroupedElement.elementId;
      selectedElement = selectedElement.groupedElements.find(
        (el: CanvasElement) => el.id === groupedElementId
      ) || null;
    }
  }

  // Get title and icon using centralized function
  const headerInfo = getHeaderTitleAndIcon({
    selectedElementIds: state.selectedElementIds,
    selectedElement: selectedElement || undefined,
    selectedGroupedElement: state.selectedGroupedElement || undefined,
    elementType: selectedElement
      ? (selectedElement.type === 'text' && selectedElement.textType ? selectedElement.textType : selectedElement.type)
      : undefined,
    textType: selectedElement?.textType,
    showColorSelector,
    showBackgroundSettings,
    showPageTheme,
    showBookTheme,
    showFontSelector,
    showBookChatPanel,
    showPagePalette,
    showBookPalette,
    showPageLayout,
    showBookLayout,
    showPageThemeSelector,
    showBookThemeSelector,
    showEditorSettings,
    showPatternSettings,
    selectorTitle,
    activeTool,
    isLinkedQuestionAnswerPair
  });

  const IconComponent = headerInfo.icon;

  return (
    <div className="flex items-center justify-between px-2 border-b pb-0">
      {!isCollapsed && (
        <div className="text-sm flex items-center gap-2 flex-1">
          <IconComponent className="h-4 w-4" />
          {headerInfo.title}
        </div>
      )}

      {/* Right-aligned buttons container */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Back Button - only show when a dialog is open */}
        {/* Show button for all color selectors, including element-specific ones (element-ruled-lines-color, element-border-color, element-background-color, element-text-color) */}
        {/* Ensure button is shown even when an element is selected and element-specific color selector is open */}
        {/* {(hasOpenDialog || (showColorSelector && showColorSelector.startsWith('element-'))) && onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0"
            title="Back"
          >
            <Undo2 className="h-4 w-4 scale-y-[-1]" />
          </Button>
        )} */}

        {!(state.userRole === 'author' && !isOnAssignedPage) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapsed}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
          </Button>
        )}
      </div>
    </div>
  );
}