import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth-context';
import { getToolDefaults } from '../utils/tool-defaults';
import { apiService } from '../services/api';
import { actualToCommon } from '../utils/font-size-converter';
import { actualToCommonStrokeWidth, commonToActualStrokeWidth, THEME_STROKE_RANGES } from '../utils/stroke-width-converter';
import { actualToCommonRadius } from '../utils/corner-radius-converter';
import { getRuledLinesOpacity } from '../utils/ruled-lines-utils';
import { getBorderTheme } from '../utils/theme-utils';

// Function to extract theme structure from current book state
function logThemeStructure(book: Book | null) {
  if (!book) return;
  
  const currentPage = book.pages[0]; // Use first page as reference
  if (!currentPage) return;
  
  // Extract page settings
  const pageSettings = {
    backgroundColor: currentPage.background?.type === 'color' ? currentPage.background.value : 'green',
    backgroundOpacity: currentPage.background?.opacity || 1,
    backgroundPattern: currentPage.background?.type === 'pattern' ? {
      enabled: true,
      style: currentPage.background.value as 'dots' | 'grid' | 'lines' | 'cross',
      size: currentPage.background.patternSize || 20,
      strokeWidth: 12,
      patternBackgroundColor: currentPage.background.patternBackgroundColor || '#f0f0f0',
      patternBackgroundOpacity: currentPage.background.patternBackgroundOpacity || 0.3
    } : {
      enabled: false,
      style: 'dots' as const,
      size: 20,
      strokeWidth: 1,
      patternBackgroundColor: '#f0f0f0',
      patternBackgroundOpacity: 0.3
    }
  };
  
  // Extract element defaults from canvas elements
  const elementDefaults = {
    text: {},
    question: {},
    answer: {},
    shape: {},
    brush: {},
    line: {}
  };
  
  // Process all elements from all pages to find examples of each type
  book.pages.forEach(page => {
    page.elements.forEach(element => {
      const elementType = element.textType || element.type;
      let category: keyof typeof elementDefaults;
      
      switch (elementType) {
        case 'text':
          category = 'text';
          break;
        case 'question':
          category = 'question';
          break;
        case 'answer':
          category = 'answer';
          break;
        case 'image':
        case 'placeholder':
          // Skip image elements - not included in themes.json
          return;
          break;
        case 'brush':
          category = 'brush';
          break;
        case 'line':
          category = 'line';
          break;
        default:
          category = 'shape';
          break;
      }
      
      // Extract relevant properties for theme
      const themeElement: any = {};
      
      // Add text-specific properties
      if (category === 'text' || category === 'question' || category === 'answer') {
        themeElement.cornerRadius = element.cornerRadius ? actualToCommonRadius(element.cornerRadius) : 0;
        
        // Use actual element font size, converted to common scale
        let actualFontSize = element.font?.fontSize || element.fontSize;
        let commonFontSize = actualFontSize ? Math.round(actualFontSize * 12 / 50) : undefined;
        
        if (commonFontSize) {
          themeElement.font = {
            fontSize: commonFontSize,
            fontFamily: element.font?.fontFamily || element.fontFamily,
            fontColor: element.font?.fontColor || element.fontColor || element.fill,
            fontOpacity: element.font?.fontOpacity || element.fillOpacity,
            fontBold: element.font?.fontBold || (element.fontWeight === 'bold'),
            fontItalic: element.font?.fontItalic || (element.fontStyle === 'italic')
          };
        }
        
        const borderWidth = element.border?.borderWidth || element.borderWidth;
        if (borderWidth) {
          themeElement.border = {
            enabled: element.border?.enabled !== false && borderWidth > 0,
            borderWidth: actualToCommonStrokeWidth(borderWidth, element.border?.borderTheme || element.theme || 'default'),
            borderColor: element.border?.borderColor || element.borderColor,
            borderOpacity: element.border?.borderOpacity || element.borderOpacity,
            borderTheme: getBorderTheme(element)
          };
        }
        
        const textAlign = element.format?.align || element.align;
        const paragraphSpacing = element.format?.paragraphSpacing || element.paragraphSpacing;
        const padding = element.format?.padding || element.padding;
        if (textAlign || paragraphSpacing || padding) {
          themeElement.format = {
            textAlign: textAlign,
            paragraphSpacing: paragraphSpacing,
            padding: padding
          };
        }
        
        const backgroundColor = element.background?.backgroundColor || element.backgroundColor;
        const backgroundOpacity = element.background?.backgroundOpacity || element.backgroundOpacity;
        if (backgroundColor && backgroundColor !== 'transparent') {
          themeElement.background = {
            enabled: element.background?.enabled !== false,
            backgroundColor: backgroundColor,
            backgroundOpacity: backgroundOpacity
          };
        }
        
        const ruledLinesEnabled = element.ruledLines?.enabled;
        const ruledLinesWidth = element.ruledLinesWidth;
        const ruledLinesColor = element.ruledLines?.lineColor || element.ruledLinesColor;
        if (ruledLinesEnabled || ruledLinesWidth || ruledLinesColor) {
          themeElement.ruledLines = {
            enabled: ruledLinesEnabled,
            lineWidth: ruledLinesWidth,
            lineColor: ruledLinesColor,
            lineOpacity: getRuledLinesOpacity(element),
            ruledLinesTheme: element.ruledLines?.ruledLinesTheme || element.ruledLines?.inheritTheme || element.ruledLinesTheme
          };
        }
      }
      

      
      // Add shape-specific properties
      if (category === 'shape') {
        if (element.cornerRadius) themeElement.cornerRadius = actualToCommonRadius(element.cornerRadius);
        if (element.strokeWidth) themeElement.strokeWidth = actualToCommonStrokeWidth(element.strokeWidth, element.theme || 'default');
        if (element.stroke) themeElement.stroke = element.stroke;
        if (element.fill) themeElement.fill = element.fill;
        if (element.opacity) themeElement.opacity = element.opacity;
        if (element.inheritTheme || element.theme) themeElement.inheritTheme = element.inheritTheme || element.theme;
        if (element.borderEnabled !== undefined) themeElement.borderEnabled = element.borderEnabled;
        if (element.backgroundEnabled !== undefined) themeElement.backgroundEnabled = element.backgroundEnabled;
      }
      
      // Add brush/line-specific properties
      if (category === 'brush' || category === 'line') {
        if (element.strokeWidth) themeElement.strokeWidth = actualToCommonStrokeWidth(element.strokeWidth, element.theme || 'default');
        if (element.stroke) themeElement.stroke = element.stroke;
        if (element.strokeOpacity) themeElement.strokeOpacity = element.strokeOpacity;
        if (element.inheritTheme || element.theme) themeElement.inheritTheme = element.inheritTheme || element.theme;
      }
      
      // Only update if we don't have this element type yet or if this element has more properties
      if (!elementDefaults[category] || Object.keys(themeElement).length > Object.keys(elementDefaults[category]).length) {
        elementDefaults[category] = themeElement;
      }
    });
  });
  
  // Create the complete theme structure and convert values to common scale
  const convertedElementDefaults = {};
  Object.entries(elementDefaults).forEach(([key, element]: [string, any]) => {
    if (!element || Object.keys(element).length === 0) {
      convertedElementDefaults[key] = {};
      return;
    }
    
    const converted = { ...element };
    
    // Convert strokeWidth
    if (converted.strokeWidth) {
      converted.strokeWidth = actualToCommonStrokeWidth(converted.strokeWidth, converted.theme || 'custom');
    }
    
    // Convert cornerRadius
    // if (converted.cornerRadius) {
    //   converted.cornerRadius = actualToCommonRadius(converted.cornerRadius);
    // }
    
    // Font fontSize is already in common scale, no conversion needed
    
    // Convert border borderWidth
    if (converted.border?.borderWidth) {
      converted.border.borderWidth = actualToCommonStrokeWidth(converted.border.borderWidth, converted.theme || 'custom');
    }
    
    convertedElementDefaults[key] = converted;
  });
  
  const themeStructure = {
    name: 'Custom Theme',
    description: 'Theme created from canvas elements',
    palette: 'custom-palette',
    pageSettings,
    elementDefaults: convertedElementDefaults
  };
  
  // console.log('=== THEME STRUCTURE FOR GLOBAL-THEMES.TS ===');
  // console.log('temp. disabled in editor-context.tsx line 217')
  // // console.log(JSON.stringify(themeStructure, null, 2));
  // console.log('=== END THEME STRUCTURE ===');
}

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'placeholder' | 'line' | 'circle' | 'rect' | 'brush' | 'brush-multicolor' | 'heart' | 'star' | 'speech-bubble' | 'dog' | 'cat' | 'smiley' | 'triangle' | 'polygon' | 'group';
  polygonSides?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke?: string;
  text?: string;
  formattedText?: string;
  fontSize?: number;
  paragraphSpacing?: 'small' | 'medium' | 'large';
  lineHeight?: number;
  align?: 'left' | 'center' | 'right';
  fontFamily?: string;
  fontStyle?: 'normal' | 'italic';
  fontColor?: string;
  textType?: 'question' | 'answer' | 'text' | 'qna' | 'qna2' | 'qna_inline';
  questionId?: string; // UUID - for both question and answer elements
  answerId?: string; // UUID - for answer elements
  questionElementId?: string; // Legacy - for linking answer to question element
  src?: string;
  points?: number[];
  roughness?: number;
  strokeWidth?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  borderWidth?: number;
  borderColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  padding?: number;
  theme?: 'rough' | 'default' | 'chalk' | 'watercolor' | 'crayon' | 'candy' | 'zigzag' | 'multi-strokes';
  // Backward compatibility
  fill?: string; // @deprecated - use fontColor instead
  // Group properties
  groupedElements?: CanvasElement[];
  // Brush-multicolor properties
  brushStrokes?: Array<{ points: number[]; strokeColor: string; strokeWidth: number }>;
}

export interface PageBackground {
  type: 'color' | 'pattern' | 'image';
  value: string; // color hex, pattern name, or image URL
  opacity?: number;
  imageSize?: 'cover' | 'contain' | 'stretch';
  imageRepeat?: boolean; // for contain mode
  patternSize?: number; // 1-10 scale for pattern size
  patternForegroundColor?: string; // pattern drawing color
  patternBackgroundColor?: string; // pattern background color
  patternBackgroundOpacity?: number;
  pageTheme?: string; // page-specific theme ID
  ruledLines?: {
    enabled: boolean;
    theme: 'notebook' | 'college' | 'graph' | 'dotted';
    lineWidth: number;
    lineColor: string;
    lineOpacity: number;
  };
}

export interface Page {
  id: number;
  pageNumber: number;
  elements: CanvasElement[];
  background?: PageBackground;
  database_id?: number; // Database pages.id
}

export interface Book {
  id: number | string;
  name: string;
  pageSize: string;
  orientation: string;
  pages: Page[];
  bookTheme?: string; // book-level theme ID
  owner_id?: number; // book owner ID
  isTemporary?: boolean; // temporary book flag
}

export interface HistoryState {
  currentBook: Book | null;
  activePageIndex: number;
  selectedElementIds: string[];
  toolSettings: Record<string, Record<string, any>>;
  editorSettings: Record<string, Record<string, any>>;
}

export interface EditorState {
  currentBook: Book | null;
  activePageIndex: number;
  activeTool: 'select' | 'text' | 'question' | 'answer' | 'qna' | 'image' | 'line' | 'circle' | 'rect' | 'brush' | 'pan' | 'zoom' | 'heart' | 'star' | 'speech-bubble' | 'dog' | 'cat' | 'smiley' | 'triangle' | 'polygon';
  selectedElementIds: string[];
  selectedGroupedElement?: { groupId: string; elementId: string };
  user?: { id: number; role: string } | null;
  userRole?: 'author' | 'publisher' | null;
  assignedPages: number[];
  pageAccessLevel?: 'form_only' | 'own_page' | 'all_pages';
  editorInteractionLevel?: 'no_access' | 'answer_only' | 'full_edit' | 'full_edit_with_settings';
  pageAssignments: Record<number, any>; // pageNumber -> user
  bookFriends?: any[];
  editorBarVisible: boolean;
  toolbarVisible: boolean;
  settingsPanelVisible: boolean;
  hasUnsavedChanges: boolean;
  toolSettings: Record<string, Record<string, any>>;
  editorSettings: Record<string, Record<string, any>>;
  tempQuestions: { [key: string]: string }; // questionId (UUID) -> text
  tempAnswers: { [key: string]: { [userId: number]: { text: string; answerId: string } } }; // questionId (UUID) -> { userId -> { text, answerId } }
  history: HistoryState[];
  historyIndex: number;
  historyActions: string[];
  magneticSnapping: boolean;
  qnaActiveSection: 'question' | 'answer';
  stylePainterActive: boolean;
  copiedStyle: Partial<CanvasElement> | null;
}

type EditorAction =
  | { type: 'SET_BOOK'; payload: Book }
  | { type: 'SET_ACTIVE_PAGE'; payload: number }
  | { type: 'SET_ACTIVE_TOOL'; payload: EditorState['activeTool'] }
  | { type: 'SET_SELECTED_ELEMENTS'; payload: string[] }
  | { type: 'SELECT_GROUPED_ELEMENT'; payload: { groupId: string; elementId: string } }
  | { type: 'SET_USER'; payload: { id: number; role: string } | null }
  | { type: 'SET_USER_ROLE'; payload: { role: 'author' | 'publisher' | null; assignedPages: number[] } }
  | { type: 'SET_USER_PERMISSIONS'; payload: { pageAccessLevel: 'form_only' | 'own_page' | 'all_pages'; editorInteractionLevel: 'no_access' | 'answer_only' | 'full_edit' | 'full_edit_with_settings' } }
  | { type: 'ADD_ELEMENT'; payload: CanvasElement }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; updates: Partial<CanvasElement> } }
  | { type: 'UPDATE_ELEMENT_PRESERVE_SELECTION'; payload: { id: string; updates: Partial<CanvasElement> } }
  | { type: 'UPDATE_ELEMENT_ALL_PAGES'; payload: { id: string; updates: Partial<CanvasElement> } }
  | { type: 'UPDATE_GROUPED_ELEMENT'; payload: { groupId: string; elementId: string; updates: Partial<CanvasElement> } }
  | { type: 'DELETE_ELEMENT'; payload: string }
  | { type: 'MOVE_ELEMENT_TO_FRONT'; payload: string }
  | { type: 'MOVE_ELEMENT_TO_BACK'; payload: string }
  | { type: 'MOVE_ELEMENT_UP'; payload: string }
  | { type: 'MOVE_ELEMENT_DOWN'; payload: string }
  | { type: 'ADD_PAGE' }
  | { type: 'DELETE_PAGE'; payload: number }
  | { type: 'DUPLICATE_PAGE'; payload: number }
  | { type: 'TOGGLE_EDITOR_BAR' }
  | { type: 'TOGGLE_TOOLBAR' }
  | { type: 'TOGGLE_SETTINGS_PANEL' }
  | { type: 'MARK_SAVED' }
  | { type: 'UPDATE_TOOL_SETTINGS'; payload: { tool: string; settings: Record<string, any> } }
  | { type: 'SET_EDITOR_SETTINGS'; payload: Record<string, Record<string, any>> }
  | { type: 'UPDATE_TEMP_QUESTION'; payload: { questionId: string; text: string } }
  | { type: 'DELETE_TEMP_QUESTION'; payload: { questionId: string } }
  | { type: 'UPDATE_TEMP_ANSWER'; payload: { questionId: string; text: string; userId?: number; answerId?: string } }
  | { type: 'UPDATE_BOOK_NAME'; payload: string }
  | { type: 'CLEAR_TEMP_DATA' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'GO_TO_HISTORY_STEP'; payload: number }
  | { type: 'SAVE_TO_HISTORY'; payload: string }
  | { type: 'UPDATE_PAGE_NUMBERS'; payload: { pageId: number; newPageNumber: number }[] }
  | { type: 'SET_PAGE_ASSIGNMENTS'; payload: Record<number, any> }
  | { type: 'SET_BOOK_FRIENDS'; payload: any[] }
  | { type: 'UPDATE_PAGE_BACKGROUND'; payload: { pageIndex: number; background: PageBackground } }
  | { type: 'SET_BOOK_THEME'; payload: string }
  | { type: 'SET_PAGE_THEME'; payload: { pageIndex: number; themeId: string } }
  | { type: 'APPLY_THEME_TO_ELEMENTS'; payload: { pageIndex: number; themeId: string; elementType?: string } }
  | { type: 'REORDER_PAGES'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'TOGGLE_MAGNETIC_SNAPPING' }
  | { type: 'SET_QNA_ACTIVE_SECTION'; payload: 'question' | 'answer' }
  | { type: 'TOGGLE_STYLE_PAINTER' }
  | { type: 'APPLY_COPIED_STYLE'; payload: string }
  | { type: 'UPDATE_BOOK_SETTINGS'; payload: { pageSize: string; orientation: string } };

const initialState: EditorState = {
  currentBook: null,
  activePageIndex: 0,
  activeTool: 'select',
  selectedElementIds: [],
  user: null,
  userRole: null,
  assignedPages: [],
  pageAssignments: {},
  bookFriends: undefined,
  editorBarVisible: true,
  toolbarVisible: true,
  settingsPanelVisible: true,
  hasUnsavedChanges: false,
  toolSettings: {},
  editorSettings: {},
  tempQuestions: {},
  tempAnswers: {},
  history: [],
  historyIndex: -1,
  historyActions: [],
  magneticSnapping: true,
  qnaActiveSection: 'question',
  stylePainterActive: false,
  copiedStyle: null,
};

const MAX_HISTORY_SIZE = 50;

// Function to enforce theme stroke width boundaries
function enforceThemeBoundaries(updates: Partial<CanvasElement>, oldElement: CanvasElement): Partial<CanvasElement> {
  // No conversion needed - keep common values everywhere
  // Conversion happens only during rendering in themes.ts
  return updates;
}

function saveToHistory(state: EditorState, actionName: string): EditorState {
  if (!state.currentBook) return state;
  
  const historyState: HistoryState = {
    currentBook: JSON.parse(JSON.stringify(state.currentBook)),
    activePageIndex: state.activePageIndex,
    selectedElementIds: [...state.selectedElementIds],
    toolSettings: JSON.parse(JSON.stringify(state.toolSettings)),
    editorSettings: JSON.parse(JSON.stringify(state.editorSettings))
  };
  
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(historyState);
  
  if (newHistory.length > MAX_HISTORY_SIZE) {
    newHistory.shift();
  }
  
  const newHistoryActions = state.historyActions.slice(0, state.historyIndex + 1);
  newHistoryActions.push(actionName);
  
  if (newHistoryActions.length > MAX_HISTORY_SIZE) {
    newHistoryActions.shift();
  }
  
  return {
    ...state,
    history: newHistory,
    historyIndex: newHistory.length - 1,
    historyActions: newHistoryActions
  };
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_BOOK':
      const bookState = { ...state, currentBook: action.payload, activePageIndex: 0 };
      if (action.payload) {
        return saveToHistory(bookState, 'Load Book');
      }
      return bookState;
    
    case 'SET_ACTIVE_PAGE':
      const activePageState = { ...state, activePageIndex: action.payload, selectedElementIds: [] };
      // Auto-set pan tool for authors on non-assigned pages
      if (activePageState.userRole === 'author' && !activePageState.assignedPages.includes(action.payload + 1)) {
        activePageState.activeTool = 'pan';
      }
      // Auto-set select tool for authors on assigned pages
      else if (activePageState.userRole === 'author' && activePageState.assignedPages.includes(action.payload + 1)) {
        activePageState.activeTool = 'select';
      }
      return activePageState;
    
    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.payload };
    
    case 'SET_SELECTED_ELEMENTS':
      // Preserve selectedGroupedElement if the group is still selected
      const preserveGroupedElement = state.selectedGroupedElement && 
        action.payload.includes(state.selectedGroupedElement.groupId);
      return { 
        ...state, 
        selectedElementIds: action.payload, 
        selectedGroupedElement: preserveGroupedElement ? state.selectedGroupedElement : undefined 
      };
    
    case 'SELECT_GROUPED_ELEMENT':
      return { 
        ...state, 
        selectedElementIds: [action.payload.groupId],
        selectedGroupedElement: action.payload
      };
    
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'SET_USER_ROLE':
      const roleState = { ...state, userRole: action.payload.role, assignedPages: action.payload.assignedPages };
      // Auto-set pan tool for authors on non-assigned pages
      if (roleState.userRole === 'author' && !roleState.assignedPages.includes(roleState.activePageIndex + 1)) {
        roleState.activeTool = 'pan';
      }
      return roleState;
    
    case 'SET_USER_PERMISSIONS':
      return { ...state, pageAccessLevel: action.payload.pageAccessLevel, editorInteractionLevel: action.payload.editorInteractionLevel };
    
    case 'ADD_ELEMENT':
      if (!state.currentBook || !state.currentBook.pages[state.activePageIndex]) return state;
      // Block for answer_only users
      if (state.editorInteractionLevel === 'answer_only') return state;
      // Check if author is assigned to current page
      if (state.userRole === 'author' && !state.assignedPages.includes(state.activePageIndex + 1)) return state;
      const savedState = saveToHistory(state, `Add ${action.payload.type}`);
      
      // Apply tool defaults to the new element
      const toolType = action.payload.textType || action.payload.type;
      const currentPage = savedState.currentBook!.pages[savedState.activePageIndex];
      const pageTheme = currentPage?.background?.pageTheme;
      const bookTheme = savedState.currentBook!.bookTheme;
      const defaults = getToolDefaults(toolType as any, pageTheme, bookTheme);
      let elementWithDefaults = { ...defaults, ...action.payload };
      
      // Assign UUID to question elements
      if (elementWithDefaults.textType === 'question' && !elementWithDefaults.questionId) {
        elementWithDefaults.questionId = uuidv4();
      }
      
      const newBook = {
        ...savedState.currentBook!,
        pages: savedState.currentBook!.pages.map((page, index) => 
          index === savedState.activePageIndex 
            ? { ...page, elements: [...page.elements, elementWithDefaults] }
            : page
        )
      };
      const newState = { 
        ...savedState, 
        currentBook: newBook, 
        selectedElementIds: [action.payload.id], 
        hasUnsavedChanges: true 
      };
      

      
      return newState;
    
    case 'UPDATE_ELEMENT':
      if (!state.currentBook) return state;
      // Block for answer_only users (except for answer elements)
      if (state.editorInteractionLevel === 'answer_only') {
        const element = state.currentBook.pages[state.activePageIndex]?.elements.find(el => el.id === action.payload.id);
        if (!element || element.textType !== 'answer') return state;
      }
      // Check if author is assigned to current page
      if (state.userRole === 'author' && !state.assignedPages.includes(state.activePageIndex + 1)) return state;
      const updatedBook = { ...state.currentBook };
      const page = updatedBook.pages[state.activePageIndex];
      const elementIndex = page.elements.findIndex(el => el.id === action.payload.id);
      if (elementIndex !== -1) {
        const oldElement = page.elements[elementIndex];
        const enforcedUpdates = enforceThemeBoundaries(action.payload.updates, oldElement);
        page.elements[elementIndex] = { ...oldElement, ...enforcedUpdates };
      }
      const updatedState = { ...state, currentBook: updatedBook, hasUnsavedChanges: true };
      

      
      return updatedState;
    
    case 'UPDATE_ELEMENT_PRESERVE_SELECTION':
      if (!state.currentBook) return state;
      const updatedBookPreserve = {
        ...state.currentBook,
        pages: state.currentBook.pages.map((page, index) => {
          if (index === state.activePageIndex) {
            const elementIndex = page.elements.findIndex(el => el.id === action.payload.id);
            if (elementIndex !== -1) {
              const oldElement = page.elements[elementIndex];
              const enforcedUpdates = enforceThemeBoundaries(action.payload.updates, oldElement);
              return {
                ...page,
                elements: page.elements.map((el, elIndex) => 
                  elIndex === elementIndex ? { ...oldElement, ...enforcedUpdates } : el
                )
              };
            }
          }
          return page;
        })
      };
      return { ...state, currentBook: updatedBookPreserve, hasUnsavedChanges: true };
    
    case 'UPDATE_GROUPED_ELEMENT':
      if (!state.currentBook) return state;
      const updatedBookGrouped = {
        ...state.currentBook,
        pages: state.currentBook.pages.map((page, index) => {
          if (index === state.activePageIndex) {
            return {
              ...page,
              elements: page.elements.map(el => {
                if (el.id === action.payload.groupId && el.groupedElements) {
                  return {
                    ...el,
                    groupedElements: el.groupedElements.map(groupedEl => 
                      groupedEl.id === action.payload.elementId
                        ? { ...groupedEl, ...action.payload.updates }
                        : groupedEl
                    )
                  };
                }
                return el;
              })
            };
          }
          return page;
        })
      };
      return { ...state, currentBook: updatedBookGrouped, hasUnsavedChanges: true };
    
    case 'UPDATE_ELEMENT_ALL_PAGES':
      if (!state.currentBook) return state;
      const updatedBookAllPages = { ...state.currentBook };
      updatedBookAllPages.pages.forEach(page => {
        const elementIndex = page.elements.findIndex(el => el.id === action.payload.id);
        if (elementIndex !== -1) {
          const oldElementAllPages = page.elements[elementIndex];
          const enforcedUpdatesAllPages = enforceThemeBoundaries(action.payload.updates, oldElementAllPages);
          page.elements[elementIndex] = { ...oldElementAllPages, ...enforcedUpdatesAllPages };
        }
      });
      return { ...state, currentBook: updatedBookAllPages, hasUnsavedChanges: true };
    
    case 'DELETE_ELEMENT':
      if (!state.currentBook) return state;
      // Block for answer_only users
      if (state.editorInteractionLevel === 'answer_only') return state;
      // Check if author is assigned to current page
      if (state.userRole === 'author' && !state.assignedPages.includes(state.activePageIndex + 1)) return state;
      const savedDeleteState = saveToHistory(state, 'Delete Element');
      
      // Find the element being deleted to check if it's a question
      const elementToDelete = savedDeleteState.currentBook!.pages[savedDeleteState.activePageIndex].elements
        .find(el => el.id === action.payload);
      
      const filteredBook = { ...savedDeleteState.currentBook! };
      filteredBook.pages[savedDeleteState.activePageIndex].elements = 
        filteredBook.pages[savedDeleteState.activePageIndex].elements.filter(el => el.id !== action.payload);
      
      let deleteState = { 
        ...savedDeleteState, 
        currentBook: filteredBook,
        selectedElementIds: savedDeleteState.selectedElementIds.filter(id => id !== action.payload),
        hasUnsavedChanges: true
      };
      

      
      return deleteState;
    
    case 'ADD_PAGE':
      if (!state.currentBook || state.userRole === 'author') return state;
      const savedAddPageState = saveToHistory(state, 'Add Page');
      const newPageNumber = savedAddPageState.currentBook!.pages.length + 1;
      const newPage: Page = {
        id: Date.now(),
        pageNumber: newPageNumber,
        elements: [],
        database_id: undefined // New page, no database ID yet
      };
      return {
        ...savedAddPageState,
        currentBook: {
          ...savedAddPageState.currentBook!,
          pages: [...savedAddPageState.currentBook!.pages, newPage]
        },
        hasUnsavedChanges: true
      };
    
    case 'DELETE_PAGE':
      if (!state.currentBook || state.currentBook.pages.length <= 1 || state.userRole === 'author') return state;
      const savedDeletePageState = saveToHistory(state, 'Delete Page');
      const pagesAfterDelete = savedDeletePageState.currentBook!.pages.filter((_, index) => index !== action.payload);
      const newActiveIndex = action.payload >= pagesAfterDelete.length ? pagesAfterDelete.length - 1 : savedDeletePageState.activePageIndex;
      return {
        ...savedDeletePageState,
        currentBook: {
          ...savedDeletePageState.currentBook!,
          pages: pagesAfterDelete.map((page, index) => ({ ...page, pageNumber: index + 1 }))
        },
        activePageIndex: newActiveIndex,
        selectedElementIds: [],
        hasUnsavedChanges: true
      };
    
    case 'DUPLICATE_PAGE':
      if (!state.currentBook || state.userRole === 'author') return state;
      const savedDuplicateState = saveToHistory(state, 'Duplicate Page');
      const pageToDuplicate = savedDuplicateState.currentBook!.pages[action.payload];
      const duplicatedPage: Page = {
        id: Date.now(),
        pageNumber: action.payload + 2,
        elements: pageToDuplicate.elements.map(el => ({ ...el, id: uuidv4() })),
        background: pageToDuplicate.background,
        database_id: undefined // Duplicated page, no database ID yet
      };
      const pagesWithDuplicate = [
        ...savedDuplicateState.currentBook!.pages.slice(0, action.payload + 1),
        duplicatedPage,
        ...savedDuplicateState.currentBook!.pages.slice(action.payload + 1)
      ].map((page, index) => ({ ...page, pageNumber: index + 1 }));
      
      // Shift page assignments for pages after the duplicated page
      const updatedPageAssignments = { ...savedDuplicateState.pageAssignments };
      const insertPosition = action.payload + 2; // New page position
      
      // Shift assignments for pages >= insertPosition
      const pageNumbers = Object.keys(updatedPageAssignments).map(n => parseInt(n)).sort((a, b) => b - a);
      pageNumbers.forEach(pageNumber => {
        if (pageNumber >= insertPosition) {
          const user = updatedPageAssignments[pageNumber];
          delete updatedPageAssignments[pageNumber];
          updatedPageAssignments[pageNumber + 1] = user;
        }
      });
      
      // Ensure new duplicated page has no assignment
      updatedPageAssignments[insertPosition] = null;
      
      return {
        ...savedDuplicateState,
        currentBook: {
          ...savedDuplicateState.currentBook!,
          pages: pagesWithDuplicate
        },
        pageAssignments: updatedPageAssignments,
        hasUnsavedChanges: true
      };
    
    case 'TOGGLE_EDITOR_BAR':
      return { ...state, editorBarVisible: !state.editorBarVisible };
    
    case 'TOGGLE_TOOLBAR':
      return { ...state, toolbarVisible: !state.toolbarVisible };
    
    case 'TOGGLE_SETTINGS_PANEL':
      return { ...state, settingsPanelVisible: !state.settingsPanelVisible };
    
    case 'MARK_SAVED':
      return { ...state, hasUnsavedChanges: false };
    
    case 'UPDATE_TOOL_SETTINGS':
      const savedToolState = saveToHistory(state, 'Update Tool Settings');
      return {
        ...savedToolState,
        toolSettings: {
          ...savedToolState.toolSettings,
          [action.payload.tool]: {
            ...savedToolState.toolSettings[action.payload.tool],
            ...action.payload.settings
          }
        }
      };
    
    case 'SET_EDITOR_SETTINGS':
      return {
        ...state,
        editorSettings: action.payload
      };
    
    case 'UPDATE_TEMP_QUESTION':
      return {
        ...state,
        tempQuestions: {
          ...state.tempQuestions,
          [action.payload.questionId]: action.payload.text
        },
        hasUnsavedChanges: true
      };
    
    case 'DELETE_TEMP_QUESTION':
      const newTempQuestions = { ...state.tempQuestions };
      const newTempAnswers = { ...state.tempAnswers };
      delete newTempQuestions[action.payload.questionId];
      delete newTempAnswers[action.payload.questionId];
      
      // Reset textboxes that reference this question
      let bookWithResetTextboxes = state.currentBook;
      if (bookWithResetTextboxes) {
        bookWithResetTextboxes = {
          ...bookWithResetTextboxes,
          pages: bookWithResetTextboxes.pages.map(page => ({
            ...page,
            elements: page.elements.map(element => {
              if (element.questionId === action.payload.questionId) {
                return { ...element, questionId: undefined, text: '', formattedText: '' };
              }
              return element;
            })
          }))
        };
      }
      
      return {
        ...state,
        currentBook: bookWithResetTextboxes,
        tempQuestions: newTempQuestions,
        tempAnswers: newTempAnswers,
        hasUnsavedChanges: true
      };
    
    case 'UPDATE_TEMP_ANSWER':
      const userId = action.payload.userId || state.user?.id;
      if (!userId) return state;
      const answerId = action.payload.answerId || uuidv4();
      return {
        ...state,
        tempAnswers: {
          ...state.tempAnswers,
          [action.payload.questionId]: {
            ...state.tempAnswers[action.payload.questionId],
            [userId]: { text: action.payload.text, answerId }
          }
        },
        hasUnsavedChanges: true
      };
    

    
    case 'CLEAR_TEMP_DATA':
      return {
        ...state,
        tempQuestions: {},
        tempAnswers: {}
      };
    
    case 'UNDO':
      if (state.historyIndex > 0) {
        const prevState = state.history[state.historyIndex - 1];
        return {
          ...state,
          currentBook: prevState.currentBook,
          activePageIndex: prevState.activePageIndex,
          selectedElementIds: prevState.selectedElementIds,
          toolSettings: prevState.toolSettings,
          editorSettings: prevState.editorSettings,
          historyIndex: state.historyIndex - 1,
          hasUnsavedChanges: true
        };
      }
      return state;
    
    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        const nextState = state.history[state.historyIndex + 1];
        return {
          ...state,
          currentBook: nextState.currentBook,
          activePageIndex: nextState.activePageIndex,
          selectedElementIds: nextState.selectedElementIds,
          toolSettings: nextState.toolSettings,
          editorSettings: nextState.editorSettings,
          historyIndex: state.historyIndex + 1,
          hasUnsavedChanges: true
        };
      }
      return state;
    
    case 'GO_TO_HISTORY_STEP':
      if (action.payload >= 0 && action.payload < state.history.length) {
        const targetState = state.history[action.payload];
        return {
          ...state,
          currentBook: targetState.currentBook,
          activePageIndex: targetState.activePageIndex,
          selectedElementIds: targetState.selectedElementIds,
          toolSettings: targetState.toolSettings,
          editorSettings: targetState.editorSettings,
          historyIndex: action.payload,
          hasUnsavedChanges: true
        };
      }
      return state;
    
    case 'SAVE_TO_HISTORY':
      return saveToHistory(state, action.payload);
    
    case 'UPDATE_PAGE_NUMBERS':
      if (!state.currentBook) return state;
      const bookWithUpdatedPages = { ...state.currentBook };
      bookWithUpdatedPages.pages = bookWithUpdatedPages.pages.map(page => {
        const update = action.payload.find(u => u.pageId === page.id);
        return update ? { ...page, pageNumber: update.newPageNumber } : page;
      });
      return { ...state, currentBook: bookWithUpdatedPages };
    
    case 'SET_PAGE_ASSIGNMENTS':
      return { ...state, pageAssignments: action.payload, hasUnsavedChanges: true };
    
    case 'SET_BOOK_FRIENDS':
      return { ...state, bookFriends: action.payload, hasUnsavedChanges: true };
    
    case 'UPDATE_PAGE_BACKGROUND':
      if (!state.currentBook) return state;
      const savedBgState = saveToHistory(state, 'Update Page Background');
      const updatedBookBg = { ...savedBgState.currentBook! };
      const targetPage = updatedBookBg.pages[action.payload.pageIndex];
      if (targetPage) {
        targetPage.background = action.payload.background;
      }
      return { ...savedBgState, currentBook: updatedBookBg, hasUnsavedChanges: true };
    
    case 'SET_BOOK_THEME':
      if (!state.currentBook) return state;
      const savedBookThemeState = saveToHistory(state, 'Set Book Theme');
      return {
        ...savedBookThemeState,
        currentBook: {
          ...savedBookThemeState.currentBook!,
          bookTheme: action.payload
        },
        hasUnsavedChanges: true
      };
    
    case 'SET_PAGE_THEME':
      if (!state.currentBook) return state;
      const savedPageThemeState = saveToHistory(state, 'Set Page Theme');
      const updatedBookPageTheme = { ...savedPageThemeState.currentBook! };
      const targetPageTheme = updatedBookPageTheme.pages[action.payload.pageIndex];
      if (targetPageTheme) {
        if (!targetPageTheme.background) {
          targetPageTheme.background = { type: 'color', value: '#ffffff', opacity: 1 };
        }
        targetPageTheme.background.pageTheme = action.payload.themeId;
      }
      return { ...savedPageThemeState, currentBook: updatedBookPageTheme, hasUnsavedChanges: true };
    
    case 'APPLY_THEME_TO_ELEMENTS':
      if (!state.currentBook) return state;
      const savedApplyThemeState = saveToHistory(state, 'Apply Theme to Elements');
      const updatedBookApplyTheme = { ...savedApplyThemeState.currentBook! };
      const targetPageApplyTheme = updatedBookApplyTheme.pages[action.payload.pageIndex];
      
      if (targetPageApplyTheme) {
        targetPageApplyTheme.elements = targetPageApplyTheme.elements.map(element => {
          // Only apply theme to specified element type or all if not specified
          if (action.payload.elementType && element.type !== action.payload.elementType && element.textType !== action.payload.elementType) {
            return element;
          }
          
          const toolType = element.textType || element.type;
          const themeDefaults = getToolDefaults(toolType as any, action.payload.themeId, undefined);
          
          // Apply theme defaults while preserving essential properties
          return {
            ...themeDefaults,
            theme: action.payload.themeId,
            id: element.id,
            type: element.type,
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height,
            text: element.text,
            formattedText: element.formattedText,
            textType: element.textType,
            questionId: element.questionId,
            answerId: element.answerId,
            questionElementId: element.questionElementId,
            src: element.src,
            points: element.points
          };
        });
      }
      
      return { ...savedApplyThemeState, currentBook: updatedBookApplyTheme, hasUnsavedChanges: true };
    
    case 'UPDATE_BOOK_NAME':
      if (!state.currentBook) return state;
      return {
        ...state,
        currentBook: {
          ...state.currentBook,
          name: action.payload
        },
        hasUnsavedChanges: true
      };
    
    case 'UPDATE_BOOK_SETTINGS':
      if (!state.currentBook) return state;
      const savedBookSettingsState = saveToHistory(state, 'Update Book Settings');
      return {
        ...savedBookSettingsState,
        currentBook: {
          ...savedBookSettingsState.currentBook!,
          pageSize: action.payload.pageSize,
          orientation: action.payload.orientation
        },
        hasUnsavedChanges: true
      };
    
    case 'REORDER_PAGES':
      if (!state.currentBook || state.userRole === 'author') return state;
      const savedReorderState = saveToHistory(state, 'Reorder Pages');
      const { fromIndex, toIndex } = action.payload;
      const reorderedPages = [...savedReorderState.currentBook!.pages];
      const [movedPage] = reorderedPages.splice(fromIndex, 1);
      reorderedPages.splice(toIndex, 0, movedPage);
      
      // Update page numbers
      const updatedPages = reorderedPages.map((page, index) => ({ ...page, pageNumber: index + 1 }));
      
      // Reorder page assignments to match new page order
      const newPageAssignments = {};
      updatedPages.forEach((page, newIndex) => {
        const originalIndex = savedReorderState.currentBook!.pages.findIndex(p => p.id === page.id);
        const oldAssignment = savedReorderState.pageAssignments[originalIndex + 1];
        if (oldAssignment) {
          newPageAssignments[newIndex + 1] = oldAssignment;
        }
      });
      
      return {
        ...savedReorderState,
        currentBook: {
          ...savedReorderState.currentBook!,
          pages: updatedPages
        },
        pageAssignments: newPageAssignments,
        hasUnsavedChanges: true
      };
    
    case 'MOVE_ELEMENT_TO_FRONT':
      if (!state.currentBook) return state;
      // Block for answer_only users
      if (state.editorInteractionLevel === 'answer_only') return state;
      const savedFrontState = saveToHistory(state, 'Move to Front');
      const bookFront = { ...savedFrontState.currentBook! };
      const pageFront = bookFront.pages[savedFrontState.activePageIndex];
      const elementIndexFront = pageFront.elements.findIndex(el => el.id === action.payload);
      if (elementIndexFront !== -1) {
        const element = pageFront.elements.splice(elementIndexFront, 1)[0];
        pageFront.elements.push(element);
      }
      return { ...savedFrontState, currentBook: bookFront, hasUnsavedChanges: true };
    
    case 'MOVE_ELEMENT_TO_BACK':
      if (!state.currentBook) return state;
      // Block for answer_only users
      if (state.editorInteractionLevel === 'answer_only') return state;
      const savedBackState = saveToHistory(state, 'Move to Back');
      const bookBack = { ...savedBackState.currentBook! };
      const pageBack = bookBack.pages[savedBackState.activePageIndex];
      const elementIndexBack = pageBack.elements.findIndex(el => el.id === action.payload);
      if (elementIndexBack !== -1) {
        const element = pageBack.elements.splice(elementIndexBack, 1)[0];
        pageBack.elements.unshift(element);
      }
      return { ...savedBackState, currentBook: bookBack, hasUnsavedChanges: true };
    
    case 'MOVE_ELEMENT_UP':
      if (!state.currentBook) return state;
      // Block for answer_only users
      if (state.editorInteractionLevel === 'answer_only') return state;
      const savedUpState = saveToHistory(state, 'Move Up');
      const bookUp = { ...savedUpState.currentBook! };
      const pageUp = bookUp.pages[savedUpState.activePageIndex];
      const elementIndexUp = pageUp.elements.findIndex(el => el.id === action.payload);
      if (elementIndexUp !== -1 && elementIndexUp < pageUp.elements.length - 1) {
        const element = pageUp.elements[elementIndexUp];
        pageUp.elements[elementIndexUp] = pageUp.elements[elementIndexUp + 1];
        pageUp.elements[elementIndexUp + 1] = element;
      }
      return { ...savedUpState, currentBook: bookUp, hasUnsavedChanges: true };
    
    case 'MOVE_ELEMENT_DOWN':
      if (!state.currentBook) return state;
      // Block for answer_only users
      if (state.editorInteractionLevel === 'answer_only') return state;
      const savedDownState = saveToHistory(state, 'Move Down');
      const bookDown = { ...savedDownState.currentBook! };
      const pageDown = bookDown.pages[savedDownState.activePageIndex];
      const elementIndexDown = pageDown.elements.findIndex(el => el.id === action.payload);
      if (elementIndexDown > 0) {
        const element = pageDown.elements[elementIndexDown];
        pageDown.elements[elementIndexDown] = pageDown.elements[elementIndexDown - 1];
        pageDown.elements[elementIndexDown - 1] = element;
      }
      return { ...savedDownState, currentBook: bookDown, hasUnsavedChanges: true };
    
    case 'TOGGLE_MAGNETIC_SNAPPING':
      return { ...state, magneticSnapping: !state.magneticSnapping };
    
    case 'SET_QNA_ACTIVE_SECTION':
      return { ...state, qnaActiveSection: action.payload };
    
    case 'TOGGLE_STYLE_PAINTER':
      console.log('TOGGLE_STYLE_PAINTER action received', { currentBook: !!state.currentBook, selectedCount: state.selectedElementIds.length, active: state.stylePainterActive });
      if (!state.currentBook || state.selectedElementIds.length !== 1) return state;
      
      if (!state.stylePainterActive) {
        // Activate style painter and copy style from selected element
        const selectedElement = state.currentBook.pages[state.activePageIndex]?.elements
          .find(el => el.id === state.selectedElementIds[0]);
        
        console.log('Selected element for style copy:', selectedElement);
        if (!selectedElement) return state;
        
        // Copy all style-related properties
        const copiedStyle: Partial<CanvasElement> = {
          fontSize: selectedElement.fontSize,
          fontFamily: selectedElement.fontFamily,
          fontStyle: selectedElement.fontStyle,
          fontColor: selectedElement.fontColor,
          backgroundColor: selectedElement.backgroundColor,
          backgroundOpacity: selectedElement.backgroundOpacity,
          borderWidth: selectedElement.borderWidth,
          borderColor: selectedElement.borderColor,
          padding: selectedElement.padding,
          align: selectedElement.align,
          paragraphSpacing: selectedElement.paragraphSpacing,
          lineHeight: selectedElement.lineHeight,
          stroke: selectedElement.stroke,
          strokeWidth: selectedElement.strokeWidth,
          strokeOpacity: selectedElement.strokeOpacity,
          fill: selectedElement.fill,
          fillOpacity: selectedElement.fillOpacity,
          opacity: selectedElement.opacity,
          theme: selectedElement.theme,
          roughness: selectedElement.roughness,
          // Copy all nested style objects
          font: selectedElement.font ? { ...selectedElement.font } : undefined,
          format: selectedElement.format ? { ...selectedElement.format } : undefined,
          background: selectedElement.background ? { ...selectedElement.background } : undefined,
          border: selectedElement.border ? { ...selectedElement.border } : undefined,
          ruledLines: selectedElement.ruledLines ? { ...selectedElement.ruledLines } : undefined,
          ruledLinesWidth: selectedElement.ruledLinesWidth,
          ruledLinesColor: selectedElement.ruledLinesColor,
          ruledLinesTheme: selectedElement.ruledLinesTheme,
          // QnA specific styles
          questionSettings: selectedElement.questionSettings ? { ...selectedElement.questionSettings } : undefined,
          answerSettings: selectedElement.answerSettings ? { ...selectedElement.answerSettings } : undefined,
          qnaIndividualSettings: selectedElement.qnaIndividualSettings
        };
        
        console.log('Activating style painter with copied style:', copiedStyle);
        return {
          ...state,
          stylePainterActive: true,
          copiedStyle
        };
      } else {
        // Deactivate style painter
        return {
          ...state,
          stylePainterActive: false,
          copiedStyle: null
        };
      }
    
    case 'APPLY_COPIED_STYLE':
      if (!state.currentBook || !state.stylePainterActive || !state.copiedStyle) return state;
      
      const targetElement = state.currentBook.pages[state.activePageIndex]?.elements
        .find(el => el.id === action.payload);
      
      if (!targetElement) return state;
      
      const savedStyleState = saveToHistory(state, 'Apply Style');
      
      // Apply copied style to target element
      const updatedBookStyle = { ...savedStyleState.currentBook! };
      const pageStyle = updatedBookStyle.pages[savedStyleState.activePageIndex];
      const targetElementIndex = pageStyle.elements.findIndex(el => el.id === action.payload);
      
      if (targetElementIndex !== -1) {
        // Filter out undefined values and apply style
        const styleToApply = Object.fromEntries(
          Object.entries(savedStyleState.copiedStyle!).filter(([_, value]) => value !== undefined)
        );
        
        pageStyle.elements[targetElementIndex] = {
          ...pageStyle.elements[targetElementIndex],
          ...styleToApply
        };
      }
      
      // Deactivate style painter after applying
      return {
        ...savedStyleState,
        currentBook: updatedBookStyle,
        stylePainterActive: false,
        copiedStyle: null,
        hasUnsavedChanges: true
      };
    
    default:
      return state;
  }
}

const EditorContext = createContext<{
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  saveBook: () => Promise<void>;
  loadBook: (bookId: number) => Promise<void>;
  getQuestionText: (questionId: string) => string;
  getAnswerText: (questionId: string, userId?: number) => string;
  updateTempQuestion: (questionId: string, text: string) => void;
  updateTempAnswer: (questionId: string, text: string, userId?: number) => void;
  undo: () => void;
  redo: () => void;
  goToHistoryStep: (step: number) => void;
  getHistoryActions: () => string[];
  refreshPageAssignments: () => Promise<void>;
  getQuestionAssignmentsForUser: (userId: number) => Set<string>;
  isQuestionAvailableForUser: (questionId: string, userId: number) => boolean;
  checkUserQuestionConflicts: (userId: number, pageNumber: number) => { questionId: string; questionText: string; pageNumber: number }[];
  validateQuestionSelection: (questionId: string, currentPageNumber: number) => { valid: boolean; reason?: string };
  canAccessEditor: () => boolean;
  canEditCanvas: () => boolean;
  canEditSettings: () => boolean;
  getVisiblePages: () => Page[];
  getVisiblePageNumbers: () => number[];
} | undefined>(undefined);

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      dispatch({ type: 'SET_USER', payload: { id: user.id, role: user.role } });
    }
  }, [user]);

  const saveBook = async () => {
    if (!state.currentBook) return;
    
    // Prevent concurrent saves
    if (saveBook.isRunning) {
      console.log('Save already in progress, skipping duplicate call');
      return;
    }
    
    saveBook.isRunning = true;
    
    try {

      
      // Save questions and answers to database
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      
      // Save questions first (skip for authors and answer_only users)
      if (user?.role !== 'author' && state.userRole !== 'author' && state.editorInteractionLevel !== 'answer_only') {
        for (const [questionId, questionText] of Object.entries(state.tempQuestions)) {
          if (questionText && questionText.trim()) {
            try {
              const response = await fetch(`${apiUrl}/questions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  id: questionId,
                  bookId: state.currentBook.id,
                  questionText: questionText
                })
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error('Question save failed:', response.status, errorText);
              }
            } catch (error) {
              console.error('Failed to save question', questionId, ':', error);
            }
          }
        }
      }
      
      // Save answers
      for (const [questionId, userAnswers] of Object.entries(state.tempAnswers)) {
        for (const [userId, answerData] of Object.entries(userAnswers)) {
          if (answerData.text && answerData.text.trim()) {
            try {
              const response = await fetch(`${apiUrl}/answers`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  id: answerData.answerId,
                  questionId: questionId,
                  answerText: answerData.text,
                  userId: parseInt(userId)
                })
              });
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error('Answer save failed:', response.status, errorText);
              }
            } catch (error) {
              console.error('Failed to save answer for question', questionId, 'user', userId, ':', error);
            }
          }
        }
      }

      
      // For answer_only users, only save answers - no book/page updates
      if (state.editorInteractionLevel === 'answer_only') {
        dispatch({ type: 'MARK_SAVED' });
        return;
      }
      
      // For authors, only save assigned pages and answers
      if ((user?.role === 'author' || state.userRole === 'author') && state.assignedPages.length > 0) {
        const assignedPages = state.currentBook.pages.filter((_, index) => 
          state.assignedPages.includes(index + 1)
        );
        
        const response = await fetch(`${apiUrl}/books/${state.currentBook.id}/author-save`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            pages: assignedPages.map(page => ({
              ...page,
              elements: page.elements
            }))
          })
        });
        
        if (!response.ok) throw new Error('Failed to save book');
        
        dispatch({ type: 'MARK_SAVED' });
        return;
      } else {
        // For publishers/owners - save full book
        const response = await fetch(`${apiUrl}/books/${state.currentBook.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(state.currentBook)
        });
        
        if (!response.ok) throw new Error('Failed to save book');
      }
      
      // Save page assignments if any exist (publishers only)
      if (user?.role !== 'author' && state.userRole !== 'author' && Object.keys(state.pageAssignments).length > 0) {
        const assignments = Object.entries(state.pageAssignments)
          .filter(([_, assignedUser]) => assignedUser !== null)
          .map(([pageNumber, assignedUser]) => ({
            pageNumber: parseInt(pageNumber),
            userId: assignedUser?.id || null
          }));
        

        
        const assignmentResponse = await fetch(`${apiUrl}/page-assignments/book/${state.currentBook.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ assignments })
        });
        
        if (!assignmentResponse.ok) {
          throw new Error('Failed to save page assignments');
        }
      }
      
      // Save book friends and permissions (publishers only)
      
      if (user?.role !== 'author' && state.userRole !== 'author' && state.bookFriends && state.bookFriends.length > 0) {
        // First, add any new friends to the book
        for (const friend of state.bookFriends) {
          try {
            const addResponse = await fetch(`${apiUrl}/books/${state.currentBook.id}/friends`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                friendId: friend.id,
                book_role: friend.book_role || 'author',
                page_access_level: friend.pageAccessLevel || 'own_page',
                editor_interaction_level: friend.editorInteractionLevel || 'full_edit'
              })
            });
            
            if (!addResponse.ok && addResponse.status !== 409) { // 409 = already exists
              throw new Error(`Failed to add friend ${friend.id}`);
            }
          } catch (error) {
            // Ignore errors for existing friends
          }
        }
        
        // Then update permissions for all friends
        const friendsWithPermissions = state.bookFriends.map(friend => ({
          user_id: friend.id,
          role: friend.role,
          book_role: friend.book_role || 'author',
          page_access_level: friend.pageAccessLevel || 'own_page',
          editor_interaction_level: friend.editorInteractionLevel || 'full_edit'
        }));
        

        
        const response = await fetch(`${apiUrl}/books/${state.currentBook.id}/friends/bulk-update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ friends: friendsWithPermissions })
        });
        
        if (!response.ok) {
          throw new Error('Failed to save book friends permissions');
        }
      }
      

      
      // Log theme structure for copying to global-themes.ts
      logThemeStructure(state.currentBook);
      
      // Don't clear temp data after save - keep it for display
      dispatch({ type: 'MARK_SAVED' });
    } catch (error) {
      throw error;
    } finally {
      saveBook.isRunning = false;
    }
  };

  const loadBook = useCallback(async (bookId: number) => {
    try {
      const { book, questions, answers, userRole, pageAssignments } = await apiService.loadBook(bookId);
      
      // Store questions and answers in temp storage using UUID keys
      questions.forEach(q => {
        dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId: q.id, text: q.question_text } });
      });
      
      answers.forEach(a => {
        dispatch({ type: 'UPDATE_TEMP_ANSWER', payload: { questionId: a.question_id, text: a.answer_text, userId: a.user_id, answerId: a.id } });
      });
      
      // Load editor settings and book friends
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      try {
        const settingsResponse = await fetch(`${apiUrl}/editor-settings/${bookId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (settingsResponse.ok) {
          const editorSettings = await settingsResponse.json();
          // Store editor settings in state
          dispatch({ type: 'SET_EDITOR_SETTINGS', payload: editorSettings });
          // Apply editor settings to tool settings for backward compatibility
          if (editorSettings.favoriteColors?.strokeColors) {
            dispatch({ 
              type: 'UPDATE_TOOL_SETTINGS', 
              payload: { 
                tool: 'favoriteColors', 
                settings: { strokeColors: editorSettings.favoriteColors.strokeColors } 
              } 
            });
          }
        }
      } catch (settingsError) {
        console.warn('Failed to load editor settings:', settingsError);
      }
      
      // Load book friends
      try {
        const friendsResponse = await fetch(`${apiUrl}/books/${bookId}/friends`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (friendsResponse.ok) {
          const bookFriends = await friendsResponse.json();

          dispatch({ type: 'SET_BOOK_FRIENDS', payload: bookFriends });
        }
      } catch (friendsError) {
        console.warn('Failed to load book friends:', friendsError);
      }
      
      // Map database IDs to pages
      const bookWithDatabaseIds = {
        ...book,
        pages: book.pages.map(page => ({
          ...page,
          database_id: page.id // Store original database ID
        }))
      };
      
      dispatch({ type: 'SET_BOOK', payload: bookWithDatabaseIds });
      
      if (userRole) {
        dispatch({ type: 'SET_USER_ROLE', payload: { role: userRole.role, assignedPages: userRole.assignedPages || [] } });
        
        // Use permissions from database
        // console.log('', {
        //   pageAccessLevel: userRole.page_access_level || 'all_pages',
        //   editorInteractionLevel: userRole.editor_interaction_level || 'full_edit_with_settings'
        // });
        dispatch({ type: 'SET_USER_PERMISSIONS', payload: { 
          pageAccessLevel: userRole.page_access_level || 'all_pages', 
          editorInteractionLevel: userRole.editor_interaction_level || 'full_edit_with_settings' 
        } });
      } else {
        // Default permissions for book owner (no specific role returned)
        dispatch({ type: 'SET_USER_PERMISSIONS', payload: { 
          pageAccessLevel: 'all_pages', 
          editorInteractionLevel: 'full_edit_with_settings' 
        } });
      }
      
      // Load page assignments - use pageNumber as key for consistency
      const pageAssignmentsMap = {};
      pageAssignments.forEach(assignment => {
        pageAssignmentsMap[assignment.page_number] = {
          id: assignment.user_id,
          name: assignment.name,
          email: assignment.email,
          role: assignment.role
        };
      });
      dispatch({ type: 'SET_PAGE_ASSIGNMENTS', payload: pageAssignmentsMap });
      

    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const getQuestionText = (questionId: string): string => {
    // Check temporary storage first, then fallback to canvas elements
    if (state.tempQuestions[questionId]) {
      return state.tempQuestions[questionId];
    }
    
    // Find question text from canvas elements
    for (const page of state.currentBook?.pages || []) {
      for (const element of page.elements) {
        if (element.textType === 'question' && element.questionId === questionId) {
          return element.text || '';
        }
      }
    }
    
    return '';
  };
  
  const getAnswerText = (questionId: string, userId?: number): string => {
    if (!userId) return '';
    
    // Check temporary storage first
    if (state.tempAnswers[questionId]?.[userId]) {
      return state.tempAnswers[questionId][userId].text;
    }
    
    return '';
  };
  
  const updateTempQuestion = (questionId: string, text: string) => {
    dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId, text } });
  };
  
  const updateTempAnswer = (questionId: string, text: string, userId?: number) => {
    dispatch({ type: 'UPDATE_TEMP_ANSWER', payload: { questionId, text, userId } });
  };
  
  const undo = () => {
    dispatch({ type: 'UNDO' });
  };
  
  const redo = () => {
    dispatch({ type: 'REDO' });
  };
  
  const goToHistoryStep = (step: number) => {
    dispatch({ type: 'GO_TO_HISTORY_STEP', payload: step });
  };
  
  const getHistoryActions = () => {
    return state.historyActions;
  };
  
  const getQuestionAssignmentsForUser = (userId: number): Set<string> => {
    if (!state.currentBook) return new Set();
    
    // Get all pages assigned to this user
    const userPages = Object.entries(state.pageAssignments)
      .filter(([_, user]) => user?.id === userId)
      .map(([pageNum, _]) => parseInt(pageNum));
    
    // Get all questions on those pages
    const assignedQuestions = new Set<string>();
    state.currentBook.pages.forEach(page => {
      if (userPages.includes(page.pageNumber)) {
        page.elements.forEach(element => {
          if ((element.textType === 'question' || element.textType === 'qna') && element.questionId) {
            assignedQuestions.add(element.questionId);
          }
        });
      }
    });
    
    return assignedQuestions;
  };
  
  const checkUserQuestionConflicts = (userId: number, pageNumber: number): { questionId: string; questionText: string; pageNumber: number }[] => {
    if (!state.currentBook) return [];
    
    const conflicts: { questionId: string; questionText: string; pageNumber: number }[] = [];
    
    // Get questions on the target page
    const targetPage = state.currentBook.pages.find(p => p.pageNumber === pageNumber);
    if (!targetPage) return [];
    
    // Get all questions on the target page
    const targetQuestions = new Set<string>();
    targetPage.elements.forEach(element => {
      if ((element.textType === 'question' || element.textType === 'qna') && element.questionId) {
        targetQuestions.add(element.questionId);
      }
    });
    
    // Check if any of these questions already exist on pages assigned to this user
    for (const page of state.currentBook.pages) {
      if (page.pageNumber !== pageNumber) {
        const assignedUser = state.pageAssignments[page.pageNumber];
        if (assignedUser && assignedUser.id === userId) {
          page.elements.forEach(element => {
            if ((element.textType === 'question' || element.textType === 'qna') && element.questionId && targetQuestions.has(element.questionId)) {
              conflicts.push({
                questionId: element.questionId,
                questionText: getQuestionText(element.questionId) || 'Unknown question',
                pageNumber: page.pageNumber
              });
            }
          });
        }
      }
    }
    
    return conflicts;
  };
  
  const isQuestionAvailableForUser = (questionId: string, userId: number): boolean => {
    if (!state.currentBook) return false;
    
    // Get all pages assigned to this user
    const userPages = Object.entries(state.pageAssignments)
      .filter(([_, user]) => user?.id === userId)
      .map(([pageNum, _]) => parseInt(pageNum));
    
    // Check if question exists on any of these pages
    for (const page of state.currentBook.pages) {
      if (userPages.includes(page.pageNumber)) {
        const hasQuestion = page.elements.some(el => 
          (el.textType === 'question' || el.textType === 'qna') && el.questionId === questionId
        );
        if (hasQuestion) {
          return false; // Question already exists on a page assigned to this user
        }
      }
    }
    
    return true;
  };
  
  const refreshPageAssignments = useCallback(async () => {
    if (!state.currentBook) return;
    
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Fetch updated user role and page assignments
      const roleResponse = await fetch(`${apiUrl}/books/${state.currentBook.id}/user-role`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        dispatch({ type: 'SET_USER_ROLE', payload: { role: roleData.role, assignedPages: roleData.assignedPages || [] } });
      }
    } catch (error) {
      console.error('Error refreshing page assignments:', error);
    }
  }, [state.currentBook]);

  const canAccessEditor = () => {
    return state.editorInteractionLevel !== 'no_access';
  };
  
  const canEditCanvas = () => {
    return state.editorInteractionLevel === 'full_edit' || state.editorInteractionLevel === 'full_edit_with_settings';
  };
  
  const canEditSettings = () => {
    return state.editorInteractionLevel === 'full_edit_with_settings';
  };
  
  const getVisiblePages = () => {
    if (!state.currentBook) return [];
    
    if (state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0) {
      // Show only assigned pages in correct order
      return state.currentBook.pages
        .filter((_, index) => state.assignedPages.includes(index + 1))
        .sort((a, b) => a.pageNumber - b.pageNumber);
    }
    
    // Show all pages for 'all_pages' or when no restrictions
    return state.currentBook.pages;
  };
  
  const getVisiblePageNumbers = () => {
    if (!state.currentBook) return [];
    
    if (state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0) {
      // Return only assigned page numbers in sorted order
      return [...state.assignedPages].sort((a, b) => a - b);
    }
    
    // Return all page numbers
    return state.currentBook.pages.map((_, index) => index + 1);
  };
  
  const validateQuestionSelection = (questionId: string, currentPageNumber: number): { valid: boolean; reason?: string } => {
    if (!state.currentBook) return { valid: false, reason: 'No book loaded' };
    
    const assignedUser = state.pageAssignments[currentPageNumber];
    const currentPage = state.currentBook.pages.find(p => p.pageNumber === currentPageNumber);
    
    if (!assignedUser) {
      // No user assigned, only check if question already exists on current page
      if (currentPage) {
        const hasQuestion = currentPage.elements.some(el => 
          (el.textType === 'question' || el.textType === 'qna') && el.questionId === questionId
        );
        if (hasQuestion) {
          return { valid: false, reason: 'This question already exists on this page.' };
        }
      }
      return { valid: true };
    }
    
    // Check if this question is already used by this user on another page
    const isAvailable = isQuestionAvailableForUser(questionId, assignedUser.id);
    if (!isAvailable) {
      return { 
        valid: false, 
        reason: `This question is already assigned to ${assignedUser.name} on another page.` 
      };
    }
    
    return { valid: true };
  };

  return (
    <EditorContext.Provider value={{ 
      state, 
      dispatch, 
      saveBook, 
      loadBook, 
      getQuestionText, 
      getAnswerText, 
      updateTempQuestion, 
      updateTempAnswer,
      undo,
      redo,
      goToHistoryStep,
      getHistoryActions,
      refreshPageAssignments,
      getQuestionAssignmentsForUser,
      isQuestionAvailableForUser,
      checkUserQuestionConflicts,
      validateQuestionSelection,
      canAccessEditor,
      canEditCanvas,
      canEditSettings,
      getVisiblePages,
      getVisiblePageNumbers
    }}>
      {children}
    </EditorContext.Provider>
  );
};

// Helper functions
export const createSampleBook = (id: number = 1): Book => ({
  id,
  name: 'Sample Book',
  pageSize: 'A4',
  orientation: 'portrait',
  pages: [{
    id: 1,
    pageNumber: 1,
    elements: [
      {
        id: uuidv4(),
        type: 'placeholder',
        x: 100,
        y: 100,
        width: 150,
        height: 100,
        fill: '#e5e7eb',
        stroke: '#9ca3af'
      },
      {
        id: uuidv4(),
        type: 'placeholder',
        x: 300,
        y: 200,
        width: 120,
        height: 80,
        fill: '#ddd6fe',
        stroke: '#8b5cf6'
      }
    ]
  }]
});