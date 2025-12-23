import React, { useMemo } from 'react';
import { EditorContext } from '../../context/editor-context.tsx';
import type { Book, Page, CanvasElement } from '../../context/editor-context.tsx';
import { getGlobalThemeDefaults } from '../../utils/global-themes';

interface PDFExportEditorProviderProps {
  children: React.ReactNode;
  bookData: Book;
}

export function PDFExportEditorProvider({
  children,
  bookData,
}: PDFExportEditorProviderProps) {
  const state = useMemo(() => {
    // Helper function to apply theme defaults to elements
    const applyThemeToElements = (elements: CanvasElement[], page: Page): CanvasElement[] => {
      return elements.map((element) => {
        const toolType = (element.textType || element.type) as any;
        const pageThemeId = page.themeId || bookData.themeId || bookData.bookTheme || 'default';
        const bookThemeId = bookData.themeId || bookData.bookTheme || 'default';
        const pagePaletteId = page.colorPaletteId || bookData.colorPaletteId || null;
        const bookPaletteId = bookData.colorPaletteId || null;
        
        const activeTheme = pageThemeId || bookThemeId || 'default';
        const effectivePaletteId = pagePaletteId || bookPaletteId;
        const themeDefaults = getGlobalThemeDefaults(activeTheme, toolType, effectivePaletteId);
        
        // Merge theme defaults into element
        const updatedElement: any = {
          ...element,
          ...themeDefaults,
          theme: pageThemeId,
          // Preserve element-specific properties
          id: element.id,
          type: element.type,
          textType: element.textType,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
        };
        
        // Handle nested settings for qna
        if (element.textType === 'qna' && themeDefaults.questionSettings) {
          updatedElement.questionSettings = {
            ...(element.questionSettings || {}),
            ...themeDefaults.questionSettings,
          };
        }
        if (element.textType === 'qna' && themeDefaults.answerSettings) {
          updatedElement.answerSettings = {
            ...(element.answerSettings || {}),
            ...themeDefaults.answerSettings,
          };
        }
        
        // Handle nested settings for free_text
        if (element.textType === 'free_text' && themeDefaults.textSettings) {
          updatedElement.textSettings = {
            ...(element.textSettings || {}),
            ...themeDefaults.textSettings,
          };
        }
        
        return updatedElement;
      });
    };

    // Apply theme defaults to all pages
    const processedPages = bookData.pages.map((page) => ({
      ...page,
      elements: applyThemeToElements(page.elements || [], page),
    }));

    const processedBook: Book = {
      ...bookData,
      pages: processedPages,
    };

    // Load questions into tempQuestions format
    const tempQuestions: Record<string, string> = {};
    if ((bookData as any).questions && Array.isArray((bookData as any).questions)) {
      (bookData as any).questions.forEach((q: any) => {
        if (q.id && q.question_text) {
          // Store as JSON string if poolId exists, otherwise as plain text
          if (q.question_pool_id) {
            tempQuestions[q.id] = JSON.stringify({ text: q.question_text, poolId: q.question_pool_id });
          } else {
            tempQuestions[q.id] = q.question_text;
          }
        }
      });
    }

    // Load answers into tempAnswers format
    const tempAnswers: Record<string, Record<number, { text: string; answerId?: string }>> = {};
    if ((bookData as any).answers && Array.isArray((bookData as any).answers)) {
      (bookData as any).answers.forEach((a: any) => {
        if (a.question_id && a.user_id && a.answer_text !== undefined) {
          if (!tempAnswers[a.question_id]) {
            tempAnswers[a.question_id] = {};
          }
          tempAnswers[a.question_id][a.user_id] = {
            text: a.answer_text || '',
            answerId: a.id
          };
        }
      });
    }

    // Load page assignments
    const pageAssignments: Record<number, any> = {};
    if ((bookData as any).pageAssignments && Array.isArray((bookData as any).pageAssignments)) {
      (bookData as any).pageAssignments.forEach((pa: any) => {
        if (pa.page_id && pa.user_id) {
          // Find page number from processed pages
          const page = processedPages.find(p => p.id === pa.page_id);
          if (page && page.pageNumber) {
            pageAssignments[page.pageNumber] = {
              id: pa.user_id,
              name: pa.name,
              email: pa.email,
              role: pa.role
            };
          }
        }
      });
    }

    return {
      // Editor state subset needed by Canvas
      currentBook: processedBook,
      activePageIndex: 0,
      selectedElementIds: [] as string[],
      isMiniPreview: true,
      hoveredElementId: null as string | null,
      // No interactions in PDF export
      editorInteractionLevel: 'no_access' as const,
      magneticSnapping: false,
      toolSettings: {},
      pageAssignments: pageAssignments,
      tempQuestions: tempQuestions,
      tempAnswers: tempAnswers,
      userRole: 'viewer',
      activeTool: 'select' as const,
      canAccessEditor: () => false,
      canEditCanvas: () => false,
      getAnswerText: (_qid: string, _uid?: number) => '',
    };
  }, [bookData]);

  // No-op dispatch and functions
  const dispatch = () => {};
  const undo = () => {};
  const redo = () => {};
  const saveBook = async () => {};
  const loadBook = async (_bookId: number) => {};
  const applyTemplateToPage = () => {};
  const applyCompleteTemplate = () => {};
  const getWizardTemplateSelection = () => ({
    selectedTemplateId: null,
    selectedPaletteId: null,
    templateCustomizations: undefined,
  });
  const setWizardTemplateSelection = () => {};
  const getQuestionText = () => '';
  const getAnswerText = (_qid: string, _uid?: number) => '';
  const updateTempQuestion = () => {};
  const updateTempAnswer = () => {};
  const goToHistoryStep = () => {};
  const getHistoryActions = () => [];
  const refreshPageAssignments = async () => {};
  const getQuestionAssignmentsForUser = () => new Set<string>();
  const isQuestionAvailableForUser = () => true;
  const checkUserQuestionConflicts = () => [];
  const validateQuestionSelection = () => ({ valid: true });
  const canEditSettings = () => false;
  const getVisiblePages = () => state.currentBook?.pages || [];
  const getVisiblePageNumbers = () => state.currentBook?.pages.map(p => p.pageNumber) || [];
  const ensurePagesLoaded = async () => {};
  const pageMetadata = {} as Record<number, any>;
  const getPageMetadata = () => undefined;

  return (
    <EditorContext.Provider
      value={{
        state: state as any,
        dispatch: dispatch as any,
        undo,
        redo,
        saveBook,
        loadBook,
        applyTemplateToPage,
        applyCompleteTemplate,
        getWizardTemplateSelection,
        setWizardTemplateSelection,
        getQuestionText,
        getAnswerText,
        updateTempQuestion,
        updateTempAnswer,
        goToHistoryStep,
        getHistoryActions,
        refreshPageAssignments,
        getQuestionAssignmentsForUser,
        isQuestionAvailableForUser,
        checkUserQuestionConflicts,
        validateQuestionSelection,
        canAccessEditor: state.canAccessEditor,
        canEditCanvas: state.canEditCanvas,
        canEditSettings,
        getVisiblePages,
        getVisiblePageNumbers,
        ensurePagesLoaded,
        pageMetadata,
        getPageMetadata,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

