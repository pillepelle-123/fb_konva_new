import { 
  SquareMousePointer, 
  Hand, 
  MessageCircle, 
  MessageCircleQuestion, 
  MessageCircleHeart, 
  Image, 
  Minus, 
  Circle, 
  Square, 
  Paintbrush, 
  Heart, 
  Star, 
  MessageSquare, 
  Dog, 
  Cat, 
  Smile,
  Settings,
  PaintBucket,
  Palette,
  MessageCircleQuestionMark,
  Type,
  MessagesSquare,
  LayoutPanelLeft,
  Triangle,
  Pentagon,
  Columns3Cog,
  QrCode
} from 'lucide-react';
import type { CanvasElement } from '../../../../context/editor-context';

// Zentrale Icon-Mappings
export const TOOL_ICONS = {
  select: SquareMousePointer,
  pan: Hand,
  text: MessageCircle,
  question: MessageCircleQuestion,
  answer: MessageCircleHeart,
  qna: MessageSquare,
  image: Image,
  line: Minus,
  circle: Circle,
  rect: Square,
  brush: Paintbrush,
  'brush-multicolor': Paintbrush,
  heart: Heart,
  star: Star,
  'speech-bubble': MessageSquare,
  dog: Dog,
  cat: Cat,
  smiley: Smile,
  triangle: Triangle,
  polygon: Pentagon,
  qr_code: QrCode
} as const;

// Icon-Mappings für Dialoge
const DIALOG_ICONS = {
  colorSelector: Palette,
  backgroundSettings: PaintBucket,
  pageTheme: Palette,
  bookTheme: Palette,
  fontSelector: Type,
  bookChat: MessagesSquare,
  pagePalette: Palette,
  bookPalette: Palette,
  pageLayout: LayoutPanelLeft,
  bookLayout: LayoutPanelLeft,
  pageThemeSelector: Palette,
  bookThemeSelector: Palette,
  editorSettings: Columns3Cog,
  patternSettings: Settings,
  default: Settings
} as const;

export interface HeaderInfo {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface GetHeaderTitleAndIconParams {
  // Element-State
  selectedElementIds: string[];
  selectedElement?: CanvasElement | null;
  selectedGroupedElement?: { groupId: string; elementId: string } | null;
  elementType?: string;
  textType?: string;
  
  // Dialog-States
  showColorSelector?: string | null;
  showBackgroundSettings?: boolean;
  showFontSelector?: boolean;
  showBookChatPanel?: boolean;
  showPalette?: boolean;
  showLayout?: boolean;
  showThemeSelector?: boolean;
  showEditorSettings?: boolean;
  showPatternSettings?: boolean;
  selectorTitle?: string | null;
  
  // Tool-State
  activeTool?: string;
  
  // Special cases
  isLinkedQuestionAnswerPair?: boolean;
}

/**
 * Bestimmt den Anzeige-Titel für einen Element-Typ
 */
export function getElementDisplayTitle(elementType: string): string {
  switch (elementType.toLowerCase()) {
    // Text-Typen
    case 'text':
    case 'free_text':
      return 'Free Text';
    case 'question':
      return 'Question';
    case 'answer':
      return 'Answer';
    case 'qna':
      return 'Question & Answer';
    
    // Formen
    case 'rect':
      return 'Rectangle';
    case 'circle':
      return 'Circle';
    case 'line':
      return 'Line';
    case 'brush':
      return 'Brush';
    case 'brush-multicolor':
      return 'Brush';
    case 'triangle':
      return 'Triangle';
    case 'polygon':
      return 'Polygon';
    case 'heart':
      return 'Heart';
    case 'star':
      return 'Star';
    case 'speech-bubble':
      return 'Speech Bubble';
    
    // Sticker
    case 'dog':
      return 'Dog';
    case 'cat':
      return 'Cat';
    case 'smiley':
      return 'Smiley';
    case 'sticker':
      return 'Sticker';
    
    // Bilder
    case 'image':
      return 'Image';
    case 'placeholder':
      return 'Placeholder';
    case 'qr_code':
      return 'QR Code';
    
    // Gruppen
    case 'group':
      return 'Group';
    
    // Fallback: Erste Buchstabe groß
    default:
      return elementType.charAt(0).toUpperCase() + elementType.slice(1);
  }
}

/**
 * Bestimmt den Titel für einen Color Selector basierend auf dem colorType
 */
export function getColorSelectorTitle(colorType: string): string {
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
      return 'Background Color';

    case 'text-color':
    case 'element-text-color':
      return 'Font Color';

    case 'text-border':
    case 'element-text-border':
        return 'Border Color';

    case 'text-background':
    case 'element-text-background':
    case 'element-background-color':
    case 'background-color':
      return 'Background Color';
 
    case 'pattern-background':
      return 'Pattern Color';
    case 'ruled-lines-color':
    case 'element-ruled-lines-color':
      return 'Line Color';
    case 'element-sticker-color':
      return 'Sticker Color';
    default:
      return 'Color';
  }
}

/**
 * Zentrale Funktion zur Bestimmung von Titel und Icon für den Tool-Settings-Header
 * Gibt immer ein Icon zurück (Settings als Default)
 */
export function getHeaderTitleAndIcon(params: GetHeaderTitleAndIconParams): HeaderInfo {
  const {
    selectedElementIds,
    selectedElement,
    selectedGroupedElement,
    elementType,
    textType,
    showColorSelector,
    showBackgroundSettings,
    showFontSelector,
    showBookChatPanel,
    showPalette,
    showLayout,
    showThemeSelector,
    showEditorSettings,
    showPatternSettings,
    selectorTitle,
    activeTool,
    isLinkedQuestionAnswerPair
  } = params;

  // 1. Linked Question-Answer Pair
  if (isLinkedQuestionAnswerPair) {
    return {
      title: 'Question & Answer',
      icon: MessageCircleQuestionMark
    };
  }

  // 2. Selector-Dialoge (höchste Priorität für Dialoge)
  if (showPalette) {
    return {
      title: selectorTitle || 'Color Palette',
      icon: DIALOG_ICONS.pagePalette
    };
  }
  if (showLayout) {
    return {
      title: selectorTitle || 'Layout',
      icon: DIALOG_ICONS.pageLayout
    };
  }
  if (showThemeSelector) {
    return {
      title: selectorTitle || 'Theme',
      icon: DIALOG_ICONS.pageThemeSelector
    };
  }

  // 3. Element-spezifischer Color Selector (wenn Element ausgewählt)
  if (showColorSelector && showColorSelector.startsWith('element-') && selectedElementIds.length > 0) {
    return {
      title: getColorSelectorTitle(showColorSelector),
      icon: DIALOG_ICONS.colorSelector
    };
  }

  // 4. Allgemeine Dialoge
  if (showEditorSettings) {
    return {
      title: 'Editor',
      icon: DIALOG_ICONS.editorSettings
    };
  }
  if (showPatternSettings) {
    return {
      title: 'Pattern Settings',
      icon: DIALOG_ICONS.patternSettings
    };
  }
  if (showBookChatPanel) {
    return {
      title: 'Buch-Chat',
      icon: DIALOG_ICONS.bookChat
    };
  }
  if (showFontSelector) {
    return {
      title: 'Font',
      icon: DIALOG_ICONS.fontSelector
    };
  }
  if (showBackgroundSettings) {
    return {
      title: 'Background',
      icon: DIALOG_ICONS.backgroundSettings
    };
  }

  // 5. Color Selector für Tool (wenn kein Element ausgewählt)
  if (showColorSelector && selectedElementIds.length === 0) {
    return {
      title: getColorSelectorTitle(showColorSelector),
      icon: DIALOG_ICONS.colorSelector
    };
  }

  // 6. Einzelnes Element ausgewählt
  if (selectedElementIds.length === 1 && (selectedElement || elementType)) {
    // Wenn ein grouped element ausgewählt ist, verwende dessen Typ
    const effectiveElement = selectedGroupedElement && selectedElement?.groupedElements
      ? selectedElement.groupedElements.find(el => el.id === selectedGroupedElement.elementId)
      : selectedElement;

    const effectiveElementType = effectiveElement
      ? (effectiveElement.type === 'text' && effectiveElement.textType ? effectiveElement.textType : effectiveElement.type)
      : elementType || '';

    const effectiveTextType = effectiveElement?.textType || textType;

    // Bestimme Icon basierend auf Element-Typ
    const iconKey = effectiveTextType || effectiveElementType;
    const IconComponent = TOOL_ICONS[iconKey as keyof typeof TOOL_ICONS] || DIALOG_ICONS.default;

    // Bestimme Titel
    let title: string;
    if (showColorSelector && !showColorSelector.startsWith('element-')) {
      // Color Selector für Element (nicht element-spezifisch)
      title = getColorSelectorTitle(showColorSelector);
    } else {
      // Normaler Element-Titel
      const displayType = effectiveTextType || effectiveElementType;
      title = getElementDisplayTitle(displayType);
    }

    return {
      title,
      icon: IconComponent
    };
  }

  // 7. Mehrere Elemente ausgewählt
  if (selectedElementIds.length > 1) {
    return {
      title: 'Select Settings',
      icon: TOOL_ICONS.select
    };
  }

  // 8. Select Tool ohne Dialog
  if (activeTool === 'select') {
    if (selectorTitle) {
      return {
        title: selectorTitle,
        icon: DIALOG_ICONS.colorSelector
      };
    }
    return {
      title: 'Book Settings',
      icon: DIALOG_ICONS.default
    };
  }

  // 9. Aktives Tool
  if (activeTool) {
    const IconComponent = TOOL_ICONS[activeTool as keyof typeof TOOL_ICONS] || DIALOG_ICONS.default;
    return {
      title: getElementDisplayTitle(activeTool),
      icon: IconComponent
    };
  }

  // Fallback (sollte nie erreicht werden, aber garantiert Icon)
  return {
    title: 'Settings',
    icon: DIALOG_ICONS.default
  };
}
