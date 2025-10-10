import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth-context';

export interface CanvasElement {
  id: string;
  type: 'text' | 'photo' | 'placeholder' | 'line' | 'circle' | 'rect' | 'brush' | 'heart' | 'star' | 'speech-bubble' | 'dog' | 'cat' | 'smiley';
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
}

export interface Page {
  id: number;
  pageNumber: number;
  elements: CanvasElement[];
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
  activeTool: 'select' | 'text' | 'question' | 'answer' | 'photo' | 'line' | 'circle' | 'rect' | 'brush' | 'pan' | 'heart' | 'star' | 'speech-bubble' | 'dog' | 'cat' | 'smiley';
  selectedElementIds: string[];
  user?: { id: number; role: string } | null;
  userRole?: 'author' | 'publisher' | null;
  assignedPages: number[];
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
  | { type: 'SAVE_TO_HISTORY'; payload: string };

const initialState: EditorState = {
  currentBook: null,
  activePageIndex: 0,
  activeTool: 'select',
  selectedElementIds: [],
  user: null,
  userRole: null,
  assignedPages: [],
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
      const newState = { ...state, activePageIndex: action.payload, selectedElementIds: [] };
      // Auto-set pan tool for authors on non-assigned pages
      if (newState.userRole === 'author' && !newState.assignedPages.includes(action.payload + 1)) {
        newState.activeTool = 'pan';
      }
      return newState;
    
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
      const newBook = {
        ...savedState.currentBook!,
        pages: savedState.currentBook!.pages.map((page, index) => 
          index === savedState.activePageIndex 
            ? { ...page, elements: [...page.elements, action.payload] }
            : page
        )
      };
      return { ...savedState, currentBook: newBook, hasUnsavedChanges: true };
    
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
      return { ...state, currentBook: updatedBook, hasUnsavedChanges: true };
    
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
      const filteredBook = { ...savedDeleteState.currentBook! };
      filteredBook.pages[savedDeleteState.activePageIndex].elements = 
        filteredBook.pages[savedDeleteState.activePageIndex].elements.filter(el => el.id !== action.payload);
      return { 
        ...savedDeleteState, 
        currentBook: filteredBook,
        selectedElementIds: savedDeleteState.selectedElementIds.filter(id => id !== action.payload),
        hasUnsavedChanges: true
      };
    
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
      return {
        ...savedDuplicateState,
        currentBook: {
          ...savedDuplicateState.currentBook!,
          pages: pagesWithDuplicate
        },
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
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      
      // Save new questions first
      for (const newQuestion of state.newQuestions) {
        const response = await fetch(`${apiUrl}/books/${state.currentBook.id}/questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ questionText: newQuestion.text })
        });
        
        if (response.ok) {
          const savedQuestion = await response.json();
          // Update the element with the new questionId
          dispatch({ 
            type: 'UPDATE_ELEMENT', 
            payload: { 
              id: newQuestion.elementId, 
              updates: { questionId: savedQuestion.id } 
            } 
          });
        }
      }
      
      // Save updated questions
      for (const [questionId, text] of Object.entries(state.tempQuestions)) {
        await fetch(`${apiUrl}/questions/${questionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ questionText: text })
        });
      }
      
      // Save answers
      for (const [questionId, text] of Object.entries(state.tempAnswers)) {
        await fetch(`${apiUrl}/answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ questionId: parseInt(questionId), answerText: text })
        });
      }
      
      let bookToSave = state.currentBook;
      
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
      
      // Clear temporary data after successful save
      dispatch({ type: 'CLEAR_TEMP_DATA' });
      dispatch({ type: 'MARK_SAVED' });
    } catch (error) {
      throw error;
    }
  };

  const loadBook = useCallback(async (bookId: number) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/books/${bookId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load book');
      const book = await response.json();
      
      // Load questions and answers into temporary storage without updating canvas elements
      // This allows users to see the current database state but edit in temporary storage
      try {
        const questionsResponse = await fetch(`${apiUrl}/books/${bookId}/questions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (questionsResponse.ok) {
          const questions = await questionsResponse.json();
          // Store current database questions in temp storage as baseline
          questions.forEach(q => {
            dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId: q.id, text: q.question_text } });
          });
        }
      } catch (error) {
        console.log('Questions API error:', error.message);
      }
      
      try {
        const answersResponse = await fetch(`${apiUrl}/answers/book/${bookId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (answersResponse.ok) {
          const answers = await answersResponse.json();
          // Store current database answers in temp storage as baseline
          answers.forEach(a => {
            dispatch({ type: 'UPDATE_TEMP_ANSWER', payload: { questionId: a.question_id, text: a.answer_text } });
          });
        }
      } catch (error) {
        console.log('Answers API error:', error.message);
      }
      
      dispatch({ type: 'SET_BOOK', payload: book });
      
      // Fetch user role and page assignments
      const roleResponse = await fetch(`${apiUrl}/books/${bookId}/user-role`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        dispatch({ type: 'SET_USER_ROLE', payload: { role: roleData.role, assignedPages: roleData.assignedPages || [] } });
      }
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
      getHistoryActions
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