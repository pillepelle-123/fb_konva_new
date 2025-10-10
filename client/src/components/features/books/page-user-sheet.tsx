import { useState } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useEditor } from '../../../context/editor-context';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../../ui/overlays/sheet';
import PageUserContent from './page-user-content';

interface PageAssignment {
  pageId: number;
  pageNumber: number;
  assignedUser: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface PagesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: number;
  onSaved?: () => void;
}

export default function PagesSheet({ open, onOpenChange, bookId, onSaved }: PagesSheetProps) {
  const { token } = useAuth();
  const { state, dispatch } = useEditor();
  const [saving, setSaving] = useState(false);

  const handleSave = async (assignments: PageAssignment[], pageOrder: number[]) => {
    setSaving(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      // Store page assignments in editor context (not database)
      const pageAssignments = assignments.reduce((acc, assignment) => {
        if (assignment.assignedUser) {
          acc[assignment.pageNumber] = assignment.assignedUser;
        } else {
          acc[assignment.pageNumber] = null; // Explicitly store null for removals
        }
        return acc;
      }, {} as Record<number, any>);
      
      dispatch({ type: 'SET_PAGE_ASSIGNMENTS', payload: pageAssignments });

      // Track current page ID and reorder pages in context immediately
      const currentPageId = state.currentBook?.pages[state.activePageIndex]?.id;
      
      if (state.currentBook) {
        // Create reordered pages array based on assignments
        const reorderedPages = assignments.map(assignment => {
          const originalPage = state.currentBook!.pages.find(p => p.id === assignment.pageId);
          return originalPage ? { ...originalPage, pageNumber: assignment.pageNumber } : null;
        }).filter(Boolean);
        
        // Update book with new page order in context
        const updatedBook = {
          ...state.currentBook,
          pages: reorderedPages
        };
        dispatch({ type: 'SET_BOOK', payload: updatedBook });
        
        // Find new position of current page and update active page index
        if (currentPageId) {
          const newPageIndex = reorderedPages.findIndex((page: any) => page.id === currentPageId);
          if (newPageIndex !== -1) {
            dispatch({ type: 'SET_ACTIVE_PAGE', payload: newPageIndex });
          }
        }
      }

      // Trigger page assignment update event
      window.dispatchEvent(new CustomEvent('pageAssignmentUpdated'));
      
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving page assignments:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Page User Manager</SheetTitle>
          <SheetDescription>
            Manage page assignments and reorder pages for this book
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 flex flex-col h-[calc(100vh-120px)]">
          <PageUserContent
            bookId={bookId}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}