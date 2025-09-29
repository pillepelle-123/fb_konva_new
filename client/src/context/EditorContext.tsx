import { createContext, useContext, useReducer, ReactNode } from 'react';
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
  activeTool: 'select' | 'text' | 'question' | 'answer' | 'photo' | 'line' | 'circle' | 'rect' | 'brush';
  selectedElementIds: string[];
  user?: { id: number; role: string } | null;
}

type EditorAction =
  | { type: 'SET_BOOK'; payload: Book }
  | { type: 'SET_ACTIVE_PAGE'; payload: number }
  | { type: 'SET_ACTIVE_TOOL'; payload: EditorState['activeTool'] }
  | { type: 'SET_SELECTED_ELEMENTS'; payload: string[] }
  | { type: 'ADD_ELEMENT'; payload: CanvasElement }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; updates: Partial<CanvasElement> } }
  | { type: 'DELETE_ELEMENT'; payload: string };

const initialState: EditorState = {
  currentBook: null,
  activePageIndex: 0,
  activeTool: 'select',
  selectedElementIds: [],
  user: null,
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_BOOK':
      return { ...state, currentBook: action.payload, activePageIndex: 0 };
    
    case 'SET_ACTIVE_PAGE':
      return { ...state, activePageIndex: action.payload, selectedElementIds: [] };
    
    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.payload, selectedElementIds: [] };
    
    case 'SET_SELECTED_ELEMENTS':
      return { ...state, selectedElementIds: action.payload };
    
    case 'ADD_ELEMENT':
      if (!state.currentBook) return state;
      const newBook = {
        ...state.currentBook,
        pages: state.currentBook.pages.map((page, index) => 
          index === state.activePageIndex 
            ? { ...page, elements: [...page.elements, action.payload] }
            : page
        )
      };
      return { ...state, currentBook: newBook };
    
    case 'UPDATE_ELEMENT':
      if (!state.currentBook) return state;
      const updatedBook = { ...state.currentBook };
      const page = updatedBook.pages[state.activePageIndex];
      const elementIndex = page.elements.findIndex(el => el.id === action.payload.id);
      if (elementIndex !== -1) {
        page.elements[elementIndex] = { ...page.elements[elementIndex], ...action.payload.updates };
      }
      return { ...state, currentBook: updatedBook };
    
    case 'DELETE_ELEMENT':
      if (!state.currentBook) return state;
      const filteredBook = { ...state.currentBook };
      filteredBook.pages[state.activePageIndex].elements = 
        filteredBook.pages[state.activePageIndex].elements.filter(el => el.id !== action.payload);
      return { 
        ...state, 
        currentBook: filteredBook,
        selectedElementIds: state.selectedElementIds.filter(id => id !== action.payload)
      };
    
    default:
      return state;
  }
}

const EditorContext = createContext<{
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
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

  return (
    <EditorContext.Provider value={{ state, dispatch }}>
      {children}
    </EditorContext.Provider>
  );
};

// Helper functions
export const createSampleBook = (): Book => ({
  id: 1,
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