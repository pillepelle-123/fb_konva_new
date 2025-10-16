import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth-context';
import { getToolDefaults } from '../utils/tool-defaults';
import { apiService } from '../services/api';

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
}

export interface HistoryState {
  currentBook: Book | null;
  activePageIndex: number;
  selectedElementIds: string[];
  toolSettings: Record<string, Record<string, any>>;
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
  | { type: 'UPDATE_TEMP_QUESTION'; payload: { questionId: number; text: string } }
  | { type: 'UPDATE_TEMP_ANSWER'; payload: { questionId: number; text: string } }
  | { type: 'ADD_NEW_QUESTION'; payload: { elementId: string; text: string } }
  | { type: 'UPDATE_NEW_QUESTION'; payload: { elementId: string; text: string } }

  | { type: 'CLEAR_TEMP_DATA' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'GO_TO_HISTORY_STEP'; payload: number }
  | { type: 'SAVE_TO_HISTORY'; payload: string }
  | { type: 'UPDATE_PAGE_NUMBERS'; payload: { pageId: number; newPageNumber: number }[] }
  | { type: 'SET_PAGE_ASSIGNMENTS'; payload: Record<number, any> }
  | { type: 'SET_BOOK_FRIENDS'; payload: any[] }
  | { type: 'UPDATE_PAGE_BACKGROUND'; payload: { pageIndex: number; background: PageBackground } }
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
  tempQuestions: {},
  tempAnswers: {},
  newQuestions: [],
  history: [],
  historyIndex: -1,
  historyActions: [],
};

const MAX_HISTORY_SIZE = 50;

function saveToHistory(state: EditorState, actionName: string): EditorState {
  if (!state.currentBook) return state;
  
  const historyState: HistoryState = {
    currentBook: JSON.parse(JSON.stringify(state.currentBook)),
    activePageIndex: state.activePageIndex,
    selectedElementIds: [...state.selectedElementIds],
    toolSettings: JSON.parse(JSON.stringify(state.toolSettings))
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
      const defaults = getToolDefaults(toolType as any);
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
        page.elements[elementIndex] = { ...page.elements[elementIndex], ...action.payload.updates };
      }
      const updatedState = { ...state, currentBook: updatedBook, hasUnsavedChanges: true };
      

      
      return updatedState;
    
    case 'UPDATE_ELEMENT_PRESERVE_SELECTION':
      if (!state.currentBook) return state;
      const updatedBookPreserve = { ...state.currentBook };
      const pagePreserve = updatedBookPreserve.pages[state.activePageIndex];
      const elementIndexPreserve = pagePreserve.elements.findIndex(el => el.id === action.payload.id);
      if (elementIndexPreserve !== -1) {
        pagePreserve.elements[elementIndexPreserve] = { ...pagePreserve.elements[elementIndexPreserve], ...action.payload.updates };
      }
      return { ...state, currentBook: updatedBookPreserve, hasUnsavedChanges: true };
    
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