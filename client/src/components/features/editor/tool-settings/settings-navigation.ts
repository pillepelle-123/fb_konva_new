export type SettingsMenuType = 
  | 'general'
  | 'background'
  | 'pattern'
  | 'color-selector'
  | 'font-selector'
  | 'theme-selector'
  | 'layout-selector'
  | 'palette-selector'
  | 'editor-settings'
  | 'qna'
  | 'shape'
  | 'image'
  | 'sticker'
  | 'free-text';

export interface MenuHierarchy {
  parent: SettingsMenuType | null;
  title: string;
}

export const MENU_HIERARCHY: Record<SettingsMenuType, MenuHierarchy> = {
  'general': { parent: null, title: 'Book Settings' },
  'background': { parent: 'general', title: 'Background Settings' },
  'pattern': { parent: 'background', title: 'Pattern Settings' },
  'color-selector': { parent: null, title: 'Color' }, // Parent wird dynamisch bestimmt
  'font-selector': { parent: null, title: 'Font' }, // Parent wird dynamisch bestimmt
  'theme-selector': { parent: 'general', title: 'Theme' },
  'layout-selector': { parent: 'general', title: 'Layout' },
  'palette-selector': { parent: 'general', title: 'Color Palette' },
  'editor-settings': { parent: 'general', title: 'Editor Settings' },
  'qna': { parent: null, title: 'QnA Settings' },
  'shape': { parent: null, title: 'Shape Settings' },
  'image': { parent: null, title: 'Image Settings' },
  'sticker': { parent: null, title: 'Sticker Settings' },
  'free-text': { parent: null, title: 'Text Settings' },
};

export interface SettingsNavigationState {
  showColorSelector: string | null;
  showFontSelector: boolean;
  showBackgroundSettings: boolean;
  showPatternSettings: boolean;
  showEditorSettings: boolean;
  showPalette: boolean;
  showLayout: boolean;
  showThemeSelector: boolean;
  selectedElementIds: string[];
  currentBook: any;
  activePageIndex: number;
}

/**
 * Bestimmt das aktuell aktive Menü basierend auf dem State
 */
export function getCurrentMenu(state: SettingsNavigationState): SettingsMenuType | null {
  if (state.showEditorSettings) return 'editor-settings';
  if (state.showPatternSettings) return 'pattern';
  if (state.showBackgroundSettings) return 'background';
  if (state.showPalette) return 'palette-selector';
  if (state.showLayout) return 'layout-selector';
  if (state.showThemeSelector) return 'theme-selector';
  if (state.showColorSelector) return 'color-selector';
  if (state.showFontSelector) return 'font-selector';
  
  // Für Element-spezifische Menüs
  if (state.selectedElementIds.length === 1 && state.currentBook) {
    const selectedElement = state.currentBook.pages[state.activePageIndex]?.elements.find(
      (el: any) => el.id === state.selectedElementIds[0]
    );
    if (selectedElement) {
      if (selectedElement.textType === 'qna' || selectedElement.textType === 'qna2') return 'qna';
      if (selectedElement.type === 'text') return 'free-text';
      if (['brush', 'line', 'rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(selectedElement.type)) return 'shape';
      if (selectedElement.type === 'image' || selectedElement.type === 'placeholder') return 'image';
      if (selectedElement.type === 'sticker') return 'sticker';
    }
  }
  
  // Wenn select tool aktiv und keine Elemente ausgewählt
  // (wird in tool-settings-content.tsx geprüft)
  
  return null;
}

/**
 * Bestimmt das Parent-Menü für ein gegebenes Menü basierend auf dem Kontext
 */
export function getParentMenu(
  currentMenu: SettingsMenuType,
  state: SettingsNavigationState
): SettingsMenuType | null {
  // Spezielle Behandlung für color-selector und font-selector
  if (currentMenu === 'color-selector') {
    // Bestimme Parent basierend auf Kontext und showColorSelector Wert
    // Wenn background-color, immer zurück zu background (nicht pattern)
    if (state.showColorSelector === 'background-color' && state.showBackgroundSettings) {
      return 'background';
    }
    // Wenn pattern-background, zurück zu pattern
    if (state.showColorSelector === 'pattern-background' && state.showPatternSettings) {
      return 'pattern';
    }
    // Fallback: Prüfe andere Kontexte
    if (state.showPatternSettings) return 'pattern';
    if (state.showBackgroundSettings) return 'background';
    if (state.selectedElementIds.length === 1 && state.currentBook) {
      const selectedElement = state.currentBook.pages[state.activePageIndex]?.elements.find(
        (el: any) => el.id === state.selectedElementIds[0]
      );
      if (selectedElement?.textType === 'qna' || selectedElement?.textType === 'qna2') return 'qna';
      if (selectedElement?.type === 'text') return 'free-text';
      if (['brush', 'line', 'rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(selectedElement?.type || '')) return 'shape';
      if (selectedElement?.type === 'image' || selectedElement?.type === 'placeholder') return 'image';
      if (selectedElement?.type === 'sticker') return 'sticker';
    }
  }
  
  if (currentMenu === 'font-selector') {
    if (state.selectedElementIds.length === 1 && state.currentBook) {
      const selectedElement = state.currentBook.pages[state.activePageIndex]?.elements.find(
        (el: any) => el.id === state.selectedElementIds[0]
      );
      if (selectedElement?.textType === 'qna' || selectedElement?.textType === 'qna2') return 'Textbox Settings';
      if (selectedElement?.type === 'text') return 'free-text';
    }
  }
  
  return MENU_HIERARCHY[currentMenu]?.parent || null;
}

/**
 * Gibt den Titel eines Menüs zurück
 */
export function getMenuTitle(menuType: SettingsMenuType): string {
  return MENU_HIERARCHY[menuType]?.title || menuType;
}
