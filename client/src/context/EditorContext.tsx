import { createContext, useContext, useReducer, useCallback } from 'react';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'placeholder' | 'line' | 'circle' | 'rect' | 'roughPath';
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
  textType?: 'question' | 'answer' | 'regular';
  questionId?: number;
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
  activeTool: 'select' | 'text' | 'question' | 'answer' | 'photo' | 'line' | 'circle' | 'rect' | 'brush' | 'pan';
  selectedElementIds: string[];
  user?: { id: number; role: string } | null;
  editorBarVisible: boolean;
  toolbarVisible: boolean;
  hasUnsavedChanges: boolean;
}

type EditorAction =
  | { type: 'SET_BOOK'; payload: Book }
  | { type: 'SET_ACTIVE_PAGE'; payload: number }
  | { type: 'SET_ACTIVE_TOOL'; payload: EditorState['activeTool'] }
  | { type: 'SET_SELECTED_ELEMENTS'; payload: string[] }
  | { type: 'ADD_ELEMENT'; payload: CanvasElement }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; updates: Partial<CanvasElement> } }
  | { type: 'UPDATE_ELEMENT_PRESERVE_SELECTION'; payload: { id: string; updates: Partial<CanvasElement> } }
  | { type: 'DELETE_ELEMENT'; payload: string }
  | { type: 'ADD_PAGE' }
  | { type: 'DELETE_PAGE'; payload: number }
  | { type: 'DUPLICATE_PAGE'; payload: number }
  | { type: 'TOGGLE_EDITOR_BAR' }
  | { type: 'TOGGLE_TOOLBAR' }
  | { type: 'MARK_SAVED' };

const initialState: EditorState = {
  currentBook: null,
  activePageIndex: 0,
  activeTool: 'select',
  selectedElementIds: [],
  user: null,
  editorBarVisible: true,
  toolbarVisible: true,
  hasUnsavedChanges: false,
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_BOOK':
      return { ...state, currentBook: action.payload, activePageIndex: 0 };
    
    case 'SET_ACTIVE_PAGE':
      return { ...state, activePageIndex: action.payload, selectedElementIds: [] };
    
    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.payload };
    
    case 'SET_SELECTED_ELEMENTS':
      return { ...state, selectedElementIds: action.payload };
    
    case 'ADD_ELEMENT':
      if (!state.currentBook || !state.currentBook.pages[state.activePageIndex]) return state;
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
      if (!state.currentBook) return state;
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
        activePageIndex: state.currentBook.pages.length,
        hasUnsavedChanges: true
      };
    
    case 'DELETE_PAGE':
      if (!state.currentBook || state.currentBook.pages.length <= 1) return state;
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
      if (!state.currentBook) return state;
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
        activePageIndex: action.payload + 1,
        hasUnsavedChanges: true
      };
    
    case 'TOGGLE_EDITOR_BAR':
      return { ...state, editorBarVisible: !state.editorBarVisible };
    
    case 'TOGGLE_TOOLBAR':
      return { ...state, toolbarVisible: !state.toolbarVisible };
    
    case 'MARK_SAVED':
      return { ...state, hasUnsavedChanges: false };
    
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

  const saveBook = async () => {
    if (!state.currentBook) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/books/${state.currentBook.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(state.currentBook)
      });
      
      if (!response.ok) throw new Error('Failed to save book');
      dispatch({ type: 'MARK_SAVED' });
    } catch (error) {
      throw error;
    }
  };

  const loadBook = useCallback(async (bookId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/books/${bookId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load book');
      const book = await response.json();
      
      // Update linked question textboxes with latest database text
      const questionsResponse = await fetch(`http://localhost:5000/api/questions/${bookId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (questionsResponse.ok) {
        const questions = await questionsResponse.json();
        console.log('Questions from DB:', questions);
        const questionMap = new Map(questions.map(q => [q.id, q.question_text]));
        
        let updated = false;
        book.pages.forEach(page => {
          page.elements.forEach(element => {
            if (element.textType === 'question') {
              console.log('Question element:', element.id, 'questionId:', element.questionId, 'current text:', element.text);
              if (element.questionId && questionMap.has(element.questionId)) {
                const latestText = questionMap.get(element.questionId);
                console.log('Latest text from DB:', latestText);
                if (element.text !== latestText) {
                  console.log('Updating text from', element.text, 'to', latestText);
                  element.text = latestText;
                  updated = true;
                }
              }
            }
          });
        });
        
        console.log('Updated any questions:', updated);
        if (updated) {
          await fetch(`http://localhost:5000/api/books/${bookId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(book)
          });
          console.log('Book saved with updated questions');
        }
      }
      
      dispatch({ type: 'SET_BOOK', payload: book });
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