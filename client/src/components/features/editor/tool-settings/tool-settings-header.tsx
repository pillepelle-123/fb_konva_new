import { useEditor } from '../../../../context/editor-context';
import { Button } from '../../../ui/primitives/button';
import { ChevronRight, ChevronLeft, SquareMousePointer, Hand, MessageCircle, MessageCircleQuestion, MessageCircleHeart, Image, Minus, Circle, Square, Paintbrush, Heart, Star, MessageSquare, Dog, Cat, Smile, Settings, PaintBucket, Palette, MessageCircleQuestionMark, Undo2, X, Check } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../../../ui/composites/tabs';

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

interface ToolSettingsHeaderProps {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  activeLinkedElement: string | null;
  setActiveLinkedElement: (id: string | null) => void;
  showColorSelector: string | null;
  getColorSelectorTitle: (colorType: string) => string;
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
  getColorSelectorTitle,
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
  selectorTitle = null,
  onBack,
  onCancel,
  onApply,
  canApply = false
}: ToolSettingsHeaderProps) {
  const { state } = useEditor();
  const activeTool = state.activeTool;

  // Check if any dialog is open
  const hasOpenDialog = showColorSelector || showBackgroundSettings || showPageTheme || showBookTheme || showFontSelector || showBookChatPanel || state.selectedGroupedElement;

  // Check if any selector is open
  const hasOpenSelector = showPagePalette || showBookPalette || showPageLayout || showBookLayout || showPageThemeSelector || showBookThemeSelector;

  return (
    <div className="flex items-center justify-between px-2 border-b pb-0">
      {!isCollapsed && (
        <div className="text-sm flex items-center gap-2 flex-1">
          {(() => {
            // Check for linked question-answer pair
            if (state.selectedElementIds.length === 2 && state.currentBook) {
              const selectedElements = state.currentBook.pages[state.activePageIndex]?.elements.filter(
                el => state.selectedElementIds.includes(el.id)
              ) || [];

              const questionElement = selectedElements.find(el => el.textType === 'question');
              const answerElement = selectedElements.find(el => el.textType === 'answer' && el.questionElementId === questionElement?.id);

              if (questionElement && answerElement) {
                return (
                  <>
                    <MessageCircleQuestionMark className="h-4 w-4" />
                    Question & Answer
                  </>
                );
              }
            }

            if (state.selectedElementIds.length > 1) {
              const IconComponent = TOOL_ICONS.select;
              return (
                <>
                  {IconComponent && <IconComponent className="h-4 w-4" />}
                  Select Settings
                </>
              );
            } else if (state.selectedElementIds.length === 1 && state.currentBook) {
              let selectedElement = state.currentBook.pages[state.activePageIndex]?.elements.find(
                el => el.id === state.selectedElementIds[0]
              );

              // If a grouped element is selected, show that element's type
              if (state.selectedGroupedElement && selectedElement?.groupedElements) {
                selectedElement = selectedElement.groupedElements.find(
                  el => el.id === state.selectedGroupedElement.elementId
                );
              }

              if (selectedElement) {
                const elementType = selectedElement.type === 'text' && selectedElement.textType
                  ? selectedElement.textType
                  : selectedElement.type;
                const IconComponent = TOOL_ICONS[elementType as keyof typeof TOOL_ICONS];
                return (
                  <Button variant="ghost" size="sm" className="h-8 px-0 gap-2">
                    {IconComponent && <IconComponent className="h-4 w-4" />}
                    {showColorSelector ? getColorSelectorTitle(showColorSelector) : `${elementType.charAt(0).toUpperCase() + elementType.slice(1)}`}
                  </Button>
                );
              }
              return `Element Settings (${state.selectedElementIds.length})`;
            } else {
              if (activeTool === 'select') {
                let settingsName = 'Settings';
                let IconComponent = Settings;
                if (selectorTitle) {
                  settingsName = selectorTitle;
                  IconComponent = Palette;
                } else if (showColorSelector) {
                  settingsName = getColorSelectorTitle(showColorSelector);
                } else if (showBackgroundSettings) {
                  settingsName = 'Background';
                  IconComponent = PaintBucket;
                } else if (showPageTheme) {
                  settingsName = 'Page Theme';
                  IconComponent = Palette;
                } else if (showBookTheme) {
                  settingsName = 'Book Theme';
                  IconComponent = Palette;
                }
                return (
                  <>
                    <IconComponent className="h-4 w-4" />
                    {settingsName}
                  </>
                );
              }
              const IconComponent = TOOL_ICONS[activeTool as keyof typeof TOOL_ICONS];
              return (
                <>
                  {IconComponent && <IconComponent className="h-4 w-4" />}
                  {activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}
                </>
              );
            }
          })()}
        </div>
      )}

      {/* Back Button - only show when a dialog is open */}
      {hasOpenDialog && onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0"
          title="Back"
        >
          <Undo2 className="h-4 w-4 scale-y-[-1]" />
        </Button>
      )}

      {/* Cancel/Apply Buttons - only show when a selector is open */}
      {hasOpenSelector && (
        <>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {onApply && (
            <Button
              variant="default"
              size="sm"
              onClick={onApply}
              disabled={!canApply}
              className="h-8 w-8 p-0"
              title="Apply"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
        </>
      )}

      {!(state.userRole === 'author' && !isOnAssignedPage) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapsed}
          className="h-8 w-8 p-0"
        >
          {isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}