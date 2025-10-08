import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './auth-context';

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'placeholder' | 'line' | 'circle' | 'rect' | 'roughPath' | 'heart' | 'star' | 'speech-bubble' | 'dog' | 'cat' | 'smiley';
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  text?: string;
  fontSize?: number;
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
  | { type: 'UPDATE_TOOL_SETTINGS'; payload: { tool: string; settings: Record<string, any> } };

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
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_BOOK':
      return { ...state, currentBook: action.payload, activePageIndex: 0 };
    
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
      const newBook = {
        ...state.currentBook,
        pages: state.currentBook.pages.map((page, index) => 
          index === state.activePageIndex 
            ? { ...page, elements: [...page.elements, action.payload] }
            : page
        )
      };
      return { ...state, currentBook: newBook, hasUnsavedChanges: true };
    
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
      const filteredBook = { ...state.currentBook };
      filteredBook.pages[state.activePageIndex].elements = 
        filteredBook.pages[state.activePageIndex].elements.filter(el => el.id !== action.payload);
      return { 
        ...state, 
        currentBook: filteredBook,
        selectedElementIds: state.selectedElementIds.filter(id => id !== action.payload),
        hasUnsavedChanges: true
      };
    
    case 'ADD_PAGE':
      if (!state.currentBook || state.userRole === 'author') return state;
      const newPageNumber = state.currentBook.pages.length + 1;
      const newPage: Page = {
        id: Date.now(),
        pageNumber: newPageNumber,
        elements: []
      };
      return {
        ...state,
        currentBook: {
          ...state.currentBook,
          pages: [...state.currentBook.pages, newPage]
        },
        hasUnsavedChanges: true
      };
    
    case 'DELETE_PAGE':
      if (!state.currentBook || state.currentBook.pages.length <= 1 || state.userRole === 'author') return state;
      const pagesAfterDelete = state.currentBook.pages.filter((_, index) => index !== action.payload);
      const newActiveIndex = action.payload >= pagesAfterDelete.length ? pagesAfterDelete.length - 1 : state.activePageIndex;
      return {
        ...state,
        currentBook: {
          ...state.currentBook,
          pages: pagesAfterDelete.map((page, index) => ({ ...page, pageNumber: index + 1 }))
        },
        activePageIndex: newActiveIndex,
        selectedElementIds: [],
        hasUnsavedChanges: true
      };
    
    case 'DUPLICATE_PAGE':
      if (!state.currentBook || state.userRole === 'author') return state;
      const pageToDuplicate = state.currentBook.pages[action.payload];
      const duplicatedPage: Page = {
        id: Date.now(),
        pageNumber: action.payload + 2,
        elements: pageToDuplicate.elements.map(el => ({ ...el, id: uuidv4() }))
      };
      const pagesWithDuplicate = [
        ...state.currentBook.pages.slice(0, action.payload + 1),
        duplicatedPage,
        ...state.currentBook.pages.slice(action.payload + 1)
      ].map((page, index) => ({ ...page, pageNumber: index + 1 }));
      return {
        ...state,
        currentBook: {
          ...state.currentBook,
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
      return {
        ...state,
        toolSettings: {
          ...state.toolSettings,
          [action.payload.tool]: {
            ...state.toolSettings[action.payload.tool],
            ...action.payload.settings
          }
        }
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
      
      // Update linked question textboxes with latest database text
      const questionsResponse = await fetch(`${apiUrl}/questions/${bookId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      let updated = false;
      
      if (questionsResponse.ok) {
        const questions = await questionsResponse.json();
        const questionMap = new Map(questions.map(q => [q.id, q.question_text]));
        
        book.pages.forEach(page => {
          page.elements.forEach(element => {
            if (element.textType === 'question' && element.questionId && questionMap.has(element.questionId)) {
              const latestText = questionMap.get(element.questionId);
              if (element.text !== latestText) {
                element.text = latestText;
                updated = true;
              }
            }
          });
        });
      }
      
      // Update linked answer textboxes with latest database text
      try {
        const answersResponse = await fetch(`${apiUrl}/answers/book/${bookId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (answersResponse.ok) {
          const answers = await answersResponse.json();
          const answerMap = new Map(answers.map(a => [a.question_id, { id: a.id, text: a.answer_text }]));
          
          book.pages.forEach(page => {
            page.elements.forEach(element => {
              if (element.textType === 'answer' && element.questionElementId) {
                // Find the linked question element
                const questionElement = page.elements.find(el => el.id === element.questionElementId);
                if (questionElement && questionElement.questionId && answerMap.has(questionElement.questionId)) {
                  const answerData = answerMap.get(questionElement.questionId);
                  if (element.text !== answerData.text || element.answerId !== answerData.id) {
                    element.text = answerData.text;
                    element.answerId = answerData.id;
                    updated = true;
                  }
                }
              }
            });
          });
        }
      } catch (error) {
        console.log('Answers API not available yet:', error.message);
      }
      
      if (updated) {
        await fetch(`${apiUrl}/books/${bookId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(book)
        });
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

  return (
    <EditorContext.Provider value={{ state, dispatch, saveBook, loadBook }}>
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