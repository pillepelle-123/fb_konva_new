import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth-context';
import { getToolDefaults } from '../utils/tool-defaults';
import { apiService } from '../services/api';
import { actualToCommon } from '../utils/font-size-converter';
import { actualToCommonStrokeWidth, commonToActualStrokeWidth, THEME_STROKE_RANGES } from '../utils/stroke-width-converter';
import { actualToCommonRadius } from '../utils/corner-radius-converter';

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
            fontColor: element.font?.fontColor || element.fill,
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
            borderTheme: element.border?.borderTheme || element.border?.inheritTheme || element.theme
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
            lineOpacity: element.ruledLines?.lineOpacity || element.ruledLinesOpacity,
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
  
  console.log('=== THEME STRUCTURE FOR GLOBAL-THEMES.TS ===');
  console.log(JSON.stringify(themeStructure, null, 2));
  console.log('=== END THEME STRUCTURE ===');
}

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'placeholder' | 'line' | 'circle' | 'rect' | 'brush' | 'heart' | 'star' | 'speech-bubble' | 'dog' | 'cat' | 'smiley';
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  text?: string;
  formattedText?: string;
  fontSize?: number;
  paragraphSpacing?: 'small' | 'medium' | 'large';
  lineHeight?: number;
  align?: 'left' | 'center' | 'right';
  fontFamily?: string;
  textType?: 'question' | 'answer' | 'text';
  questionId?: number;
  answerId?: number;
  questionElementId?: string;
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
}

export interface Book {
  id: number;
  name: string;
  pageSize: string;
  orientation: string;
  pages: Page[];
  bookTheme?: string; // book-level theme ID
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
  activeTool: 'select' | 'text' | 'question' | 'answer' | 'image' | 'line' | 'circle' | 'rect' | 'brush' | 'pan' | 'heart' | 'star' | 'speech-bubble' | 'dog' | 'cat' | 'smiley';
  selectedElementIds: string[];
  user?: { id: number; role: string } | null;
  userRole?: 'author' | 'publisher' | null;
  assignedPages: number[];
  pageAssignments: Record<number, any>; // pageNumber -> user
  bookFriends?: any[];
  editorBarVisible: boolean;
  toolbarVisible: boolean;
  hasUnsavedChanges: boolean;
  toolSettings: Record<string, Record<string, any>>;
  editorSettings: Record<string, Record<string, any>>;
  tempQuestions: { [key: number]: string }; // questionId -> text
  tempAnswers: { [key: number]: string }; // questionId -> text
  newQuestions: { elementId: string; text: string }[]; // new questions not yet saved
  history: HistoryState[];
  historyIndex: number;
  historyActions: string[];
}

type EditorAction =
  | { type: 'SET_BOOK'; payload: Book }
  | { type: 'SET_ACTIVE_PAGE'; payload: number }
  | { type: 'SET_ACTIVE_TOOL'; payload: EditorState['activeTool'] }
  | { type: 'SET_SELECTED_ELEMENTS'; payload: string[] }
  | { type: 'SET_USER'; payload: { id: number; role: string } | null }
  | { type: 'SET_USER_ROLE'; payload: { role: 'author' | 'publisher' | null; assignedPages: number[] } }
  | { type: 'ADD_ELEMENT'; payload: CanvasElement }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; updates: Partial<CanvasElement> } }
  | { type: 'UPDATE_ELEMENT_PRESERVE_SELECTION'; payload: { id: string; updates: Partial<CanvasElement> } }
  | { type: 'UPDATE_ELEMENT_ALL_PAGES'; payload: { id: string; updates: Partial<CanvasElement> } }
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
  | { type: 'MARK_SAVED' }
  | { type: 'UPDATE_TOOL_SETTINGS'; payload: { tool: string; settings: Record<string, any> } }
  | { type: 'SET_EDITOR_SETTINGS'; payload: Record<string, Record<string, any>> }
  | { type: 'UPDATE_TEMP_QUESTION'; payload: { questionId: number; text: string } }
  | { type: 'UPDATE_TEMP_ANSWER'; payload: { questionId: number; text: string } }
  | { type: 'ADD_NEW_QUESTION'; payload: { elementId: string; text: string } }
  | { type: 'UPDATE_NEW_QUESTION'; payload: { elementId: string; text: string } }
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
  | { type: 'REORDER_PAGES'; payload: { fromIndex: number; toIndex: number } };

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
  hasUnsavedChanges: false,
  toolSettings: {},
  editorSettings: {},
  tempQuestions: {},
  tempAnswers: {},
  newQuestions: [],
  history: [],
  historyIndex: -1,
  historyActions: [],
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
      return { ...state, selectedElementIds: action.payload };
    
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'SET_USER_ROLE':
      const roleState = { ...state, userRole: action.payload.role, assignedPages: action.payload.assignedPages };
      // Auto-set pan tool for authors on non-assigned pages
      if (roleState.userRole === 'author' && !roleState.assignedPages.includes(roleState.activePageIndex + 1)) {
        roleState.activeTool = 'pan';
      }
      return roleState;
    
    case 'ADD_ELEMENT':
      if (!state.currentBook || !state.currentBook.pages[state.activePageIndex]) return state;
      // Check if author is assigned to current page
      if (state.userRole === 'author' && !state.assignedPages.includes(state.activePageIndex + 1)) return state;
      const savedState = saveToHistory(state, `Add ${action.payload.type}`);
      
      // Apply tool defaults to the new element
      const toolType = action.payload.textType || action.payload.type;
      const currentPage = savedState.currentBook!.pages[savedState.activePageIndex];
      const pageTheme = currentPage?.background?.pageTheme;
      const bookTheme = savedState.currentBook!.bookTheme;
      const defaults = getToolDefaults(toolType as any, pageTheme, bookTheme);
      const elementWithDefaults = { ...defaults, ...action.payload };
      
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
        elements: []
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
        elements: pageToDuplicate.elements.map(el => ({ ...el, id: uuidv4() }))
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
    
    case 'UPDATE_TEMP_ANSWER':
      return {
        ...state,
        tempAnswers: {
          ...state.tempAnswers,
          [action.payload.questionId]: action.payload.text
        },
        hasUnsavedChanges: true
      };
    
    case 'ADD_NEW_QUESTION':
      return {
        ...state,
        newQuestions: [...state.newQuestions, action.payload],
        hasUnsavedChanges: true
      };
    
    case 'UPDATE_NEW_QUESTION':
      return {
        ...state,
        newQuestions: state.newQuestions.map(q => 
          q.elementId === action.payload.elementId 
            ? { ...q, text: action.payload.text }
            : q
        ),
        hasUnsavedChanges: true
      };
    

    
    case 'CLEAR_TEMP_DATA':
      return {
        ...state,
        tempQuestions: {},
        tempAnswers: {},
        newQuestions: []
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
    
    default:
      return state;
  }
}

const EditorContext = createContext<{
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  saveBook: () => Promise<void>;
  loadBook: (bookId: number) => Promise<void>;
  getQuestionText: (questionId: number) => string;
  getAnswerText: (questionId: number) => string;
  updateTempQuestion: (questionId: number, text: string) => void;
  updateTempAnswer: (questionId: number, text: string) => void;
  addNewQuestion: (elementId: string, text: string) => void;
  undo: () => void;
  redo: () => void;
  goToHistoryStep: (step: number) => void;
  getHistoryActions: () => string[];
  refreshPageAssignments: () => Promise<void>;
  getQuestionAssignmentsForUser: (userId: number) => Set<number>;
  isQuestionAvailableForUser: (questionId: number, userId: number) => boolean;
  checkUserQuestionConflicts: (userId: number, pageNumber: number) => { questionId: number; questionText: string; pageNumber: number }[];
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
    
    try {
      await apiService.saveBook(
        state.currentBook,
        state.tempQuestions,
        state.tempAnswers,
        state.newQuestions,
        state.pageAssignments,
        state.bookFriends || []
      );
      
      // Update elements with new question IDs
      for (const newQuestion of state.newQuestions) {
        const savedQuestion = await apiService.createQuestion(state.currentBook.id, newQuestion.text);
        dispatch({ 
          type: 'UPDATE_ELEMENT', 
          payload: { 
            id: newQuestion.elementId, 
            updates: { questionId: savedQuestion.id } 
          } 
        });
      }
      
      let bookToSave = state.currentBook;
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      
      // For authors, only save assigned pages
      if (state.userRole === 'author' && state.assignedPages.length > 0) {
        const response = await fetch(`${apiUrl}/books/${state.currentBook.id}/author-save`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            pages: state.currentBook.pages.filter((_, index) => 
              state.assignedPages.includes(index + 1)
            )
          })
        });
        
        if (!response.ok) throw new Error('Failed to save book');
      } else {
        // Themes are now saved to database, no localStorage needed
        
        const response = await fetch(`${apiUrl}/books/${state.currentBook.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(bookToSave)
        });
        
        if (!response.ok) throw new Error('Failed to save book');
      }
      
      // Save page assignments if any exist
      if (Object.keys(state.pageAssignments).length > 0) {
        const assignments = Object.entries(state.pageAssignments).map(([pageNumber, user]) => ({
          pageNumber: parseInt(pageNumber),
          userId: user?.id || null
        }));
        
        await fetch(`${apiUrl}/page-assignments/book/${state.currentBook.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ assignments })
        });
      }
      
      // Save book friends if any exist
      if (state.bookFriends && state.bookFriends.length > 0) {
        // Get current book friends from database
        const currentFriendsResponse = await fetch(`${apiUrl}/books/${state.currentBook.id}/friends`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (currentFriendsResponse.ok) {
          const currentFriends = await currentFriendsResponse.json();
          const currentFriendIds = new Set(currentFriends.map(f => f.id));
          const newFriendIds = new Set(state.bookFriends.map(f => f.id));
          
          // Add new friends
          for (const friend of state.bookFriends) {
            if (!currentFriendIds.has(friend.id)) {
              await fetch(`${apiUrl}/books/${state.currentBook.id}/friends`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ friendId: friend.id, role: friend.role })
              });
            } else {
              // Update role if changed
              const currentFriend = currentFriends.find(f => f.id === friend.id);
              if (currentFriend && currentFriend.role !== friend.role) {
                await fetch(`${apiUrl}/books/${state.currentBook.id}/friends/${friend.id}/role`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ role: friend.role })
                });
              }
            }
          }
          
          // Remove friends that are no longer in the list
          for (const currentFriend of currentFriends) {
            if (!newFriendIds.has(currentFriend.id)) {
              await fetch(`${apiUrl}/books/${state.currentBook.id}/friends/${currentFriend.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
            }
          }
        }
      }
      

      
      // Log theme structure for copying to global-themes.ts
      logThemeStructure(state.currentBook);
      
      // Clear temporary data after successful save
      dispatch({ type: 'CLEAR_TEMP_DATA' });
      dispatch({ type: 'MARK_SAVED' });
    } catch (error) {
      throw error;
    }
  };

  const loadBook = useCallback(async (bookId: number) => {
    try {
      const { book, questions, answers, userRole, pageAssignments } = await apiService.loadBook(bookId);
      
      // Store questions and answers in temp storage
      questions.forEach(q => {
        dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId: q.id, text: q.question_text } });
      });
      
      answers.forEach(a => {
        dispatch({ type: 'UPDATE_TEMP_ANSWER', payload: { questionId: a.question_id, text: a.answer_text } });
      });
      
      // Load editor settings
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
      
      // Themes are now loaded from database, no localStorage needed
      
      dispatch({ type: 'SET_BOOK', payload: book });
      
      if (userRole) {
        dispatch({ type: 'SET_USER_ROLE', payload: { role: userRole.role, assignedPages: userRole.assignedPages || [] } });
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

  const getQuestionText = (questionId: number): string => {
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
  
  const getAnswerText = (questionId: number): string => {
    // Check temporary storage first, then fallback to canvas elements
    if (state.tempAnswers[questionId]) {
      return state.tempAnswers[questionId];
    }
    
    // Find answer text from canvas elements
    for (const page of state.currentBook?.pages || []) {
      for (const element of page.elements) {
        if (element.textType === 'answer' && element.questionElementId) {
          const questionElement = page.elements.find(el => el.id === element.questionElementId);
          if (questionElement?.questionId === questionId) {
            return element.text || '';
          }
        }
      }
    }
    
    return '';
  };
  
  const updateTempQuestion = (questionId: number, text: string) => {
    dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId, text } });
  };
  
  const updateTempAnswer = (questionId: number, text: string) => {
    dispatch({ type: 'UPDATE_TEMP_ANSWER', payload: { questionId, text } });
  };
  
  const addNewQuestion = (elementId: string, text: string) => {
    dispatch({ type: 'ADD_NEW_QUESTION', payload: { elementId, text } });
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
  
  const getQuestionAssignmentsForUser = (userId: number): Set<number> => {
    if (!state.currentBook) return new Set();
    
    // Get all pages assigned to this user
    const userPages = Object.entries(state.pageAssignments)
      .filter(([_, user]) => user?.id === userId)
      .map(([pageNum, _]) => parseInt(pageNum));
    
    // Get all questions on those pages
    const assignedQuestions = new Set<number>();
    state.currentBook.pages.forEach(page => {
      if (userPages.includes(page.pageNumber)) {
        page.elements.forEach(element => {
          if (element.textType === 'question' && element.questionId) {
            assignedQuestions.add(element.questionId);
          }
        });
      }
    });
    
    return assignedQuestions;
  };
  
  const checkUserQuestionConflicts = (userId: number, pageNumber: number): { questionId: number; questionText: string; pageNumber: number }[] => {
    if (!state.currentBook) return [];
    
    const conflicts: { questionId: number; questionText: string; pageNumber: number }[] = [];
    
    // Get questions on the target page
    const targetPage = state.currentBook.pages.find(p => p.pageNumber === pageNumber);
    if (!targetPage) return [];
    
    targetPage.elements.forEach(element => {
      if (element.textType === 'question' && element.questionId) {
        // Check if this question is already assigned to the user on another page
        for (const page of state.currentBook!.pages) {
          if (page.pageNumber !== pageNumber) {
            const assignedUser = state.pageAssignments[page.pageNumber];
            if (assignedUser && assignedUser.id === userId) {
              const hasQuestion = page.elements.some(el => 
                el.textType === 'question' && el.questionId === element.questionId
              );
              if (hasQuestion) {
                conflicts.push({
                  questionId: element.questionId,
                  questionText: getQuestionText(element.questionId) || 'Unknown question',
                  pageNumber: page.pageNumber
                });
              }
            }
          }
        }
      }
    });
    
    return conflicts;
  };
  
  const isQuestionAvailableForUser = (questionId: number, userId: number): boolean => {
    const userQuestions = getQuestionAssignmentsForUser(userId);
    return !userQuestions.has(questionId);
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
      addNewQuestion,
      undo,
      redo,
      goToHistoryStep,
      getHistoryActions,
      refreshPageAssignments,
      getQuestionAssignmentsForUser,
      isQuestionAvailableForUser,
      checkUserQuestionConflicts
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