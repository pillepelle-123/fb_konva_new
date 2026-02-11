import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface UseCanvasItemActionsProps {
  state: any;
  clipboard: any[];
  setClipboard: (clipboard: any[]) => void;
  dispatch: (action: any) => void;
  getQuestionAssignmentsForUser: (userId: number) => Set<string>;
  currentPage: any;
  isCoverPage: boolean;
  showCoverRestrictionAlert: (message: string) => void;
  setContextMenu: (menu: { x: number; y: number; visible: boolean }) => void;
  canCreateQna: boolean;
  canDeleteQna: boolean;
}

export const useCanvasItemActions = ({
  state,
  clipboard,
  setClipboard,
  dispatch,
  getQuestionAssignmentsForUser,
  currentPage,
  isCoverPage,
  showCoverRestrictionAlert,
  setContextMenu,
  canCreateQna,
  canDeleteQna
}: UseCanvasItemActionsProps) => {

  const hasSelectedQna = () =>
    currentPage?.elements?.some((el: any) => state.selectedElementIds.includes(el.id) && el.textType === 'qna') || false;

  const handleDuplicateItems = useCallback(() => {
    if (!currentPage) return;
    if (!canCreateQna && hasSelectedQna()) return;
    if (isCoverPage) {
      const hasQnaInline = state.selectedElementIds.some((elementId) => {
        const element = currentPage.elements.find((el) => el.id === elementId);
        return false;
      });
      if (hasQnaInline) {
        showCoverRestrictionAlert('Q&A inline elements cannot be placed on cover pages.');
        return;
      }
    }

    if (state.selectedElementIds.length > 0) {
      const actionLabel = state.selectedElementIds.length > 1 ? 'Duplicate Elements' : 'Duplicate Element';
      dispatch({ type: 'SAVE_TO_HISTORY', payload: actionLabel });
    }

    // Create ID mapping for question-answer pairs
    const idMapping = new Map<string, string>();
    state.selectedElementIds.forEach(elementId => {
      idMapping.set(elementId, uuidv4());
    });

    const newElementIds: string[] = [];

    state.selectedElementIds.forEach(elementId => {
      const element = currentPage.elements.find(el => el.id === elementId);
      if (element) {
        const newId = idMapping.get(elementId)!;
        newElementIds.push(newId);
        const duplicatedElement = {
          ...element,
          id: newId,
          x: element.x + 20,
          y: element.y + 20,
          // Clear text for question, answer and qna elements
          text: (element.textType === 'question' || element.textType === 'answer' || element.textType === 'qna') ? '' : element.text,
          formattedText: (element.textType === 'question' || element.textType === 'answer' || element.textType === 'qna') ? '' : element.formattedText,
          // Clear question styling for duplicated questions
          fontColor: element.textType === 'question' ? '#9ca3af' : (element.fontColor || element.fill),
          // Clear questionId for question and qna elements
          questionId: (element.textType === 'question' || element.textType === 'qna') ? undefined : element.questionId,
          // Update questionElementId reference for answer elements
          questionElementId: element.questionElementId ? idMapping.get(element.questionElementId) : element.questionElementId
        };
        dispatch({ type: 'ADD_ELEMENT', payload: duplicatedElement, skipHistory: true });
      }
    });

    // Select the duplicated elements
    setTimeout(() => {
      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: newElementIds });
    }, 10);
  }, [state.selectedElementIds, currentPage, dispatch, isCoverPage, showCoverRestrictionAlert, canCreateQna]);

  const handleDeleteItems = useCallback(() => {
    if (!canDeleteQna && hasSelectedQna()) return;
    if (state.selectedElementIds.length > 0) {
      const actionLabel = state.selectedElementIds.length > 1 ? 'Delete Elements' : 'Delete Element';
      dispatch({ type: 'SAVE_TO_HISTORY', payload: actionLabel });
    }
    state.selectedElementIds.forEach(elementId => {
      dispatch({ type: 'DELETE_ELEMENT', payload: elementId, skipHistory: true });
    });
    setContextMenu({ x: 0, y: 0, visible: false });
  }, [state.selectedElementIds, dispatch, setContextMenu, canDeleteQna]);

  const handleCopyItems = useCallback(() => {
    if (state.selectedElementIds.length === 0) return;
    if (!canCreateQna && hasSelectedQna()) return;

    const elementsToCopy = state.selectedElementIds
      .map((id: string) => currentPage?.elements.find((el: any) => el.id === id))
      .filter(Boolean);

    if (elementsToCopy.length > 0) {
      setClipboard(elementsToCopy);
    }
  }, [state.selectedElementIds, currentPage, setClipboard, canCreateQna]);

  const handlePasteItems = useCallback(() => {
    if (clipboard.length === 0) return;
    if (!canCreateQna && clipboard.some((element: any) => element.textType === 'qna')) return;

    const hasQuestionAnswer = clipboard.some((element: any) =>
      element.textType === 'question' || element.textType === 'answer'
    );

    if (hasQuestionAnswer) {
      const currentPageId = currentPage?.id;
      if (clipboard.some((element: any) => element.pageId === currentPageId)) {
        return undefined; // Hide paste option for same page
      }
      const currentPageNumber = state.activePageIndex + 1;
      const assignedUser = state.pageAssignments[currentPageNumber];
      if (assignedUser) {
        const questionElements = clipboard.filter((el: any) => el.textType === 'question' && el.questionId);
        const userQuestions = getQuestionAssignmentsForUser(assignedUser.id);
        const hasConflict = questionElements.some((el: any) => userQuestions.has(el.questionId));
        if (hasConflict) return undefined; // Hide paste option for conflicts
      }
    }

    const pastedElements = clipboard.map((element: any) => ({
      ...element,
      id: crypto.randomUUID(),
      x: element.x + 20,
      y: element.y + 20,
      pageId: currentPage?.id
    }));

    dispatch({
      type: 'ADD_ELEMENTS',
      payload: { elements: pastedElements, pageId: currentPage?.id }
    });

    // Select the pasted elements
    dispatch({
      type: 'SET_SELECTED_ELEMENTS',
      payload: pastedElements.map((el: any) => el.id)
    });

    return undefined;
  }, [clipboard, currentPage, state.pageAssignments, state.activePageIndex, getQuestionAssignmentsForUser, dispatch, canCreateQna]);

  const handleMoveToFront = useCallback(() => {
    if (state.selectedElementIds.length === 0) return;

    dispatch({
      type: 'MOVE_ELEMENTS_TO_FRONT',
      payload: { elementIds: state.selectedElementIds }
    });
  }, [state.selectedElementIds, dispatch]);

  const handleMoveToBack = useCallback(() => {
    if (state.selectedElementIds.length === 0) return;

    dispatch({
      type: 'MOVE_ELEMENTS_TO_BACK',
      payload: { elementIds: state.selectedElementIds }
    });
  }, [state.selectedElementIds, dispatch]);

  const handleMoveUp = useCallback(() => {
    if (state.selectedElementIds.length === 0) return;

    dispatch({
      type: 'MOVE_ELEMENTS_UP',
      payload: { elementIds: state.selectedElementIds }
    });
  }, [state.selectedElementIds, dispatch]);

  const handleMoveDown = useCallback(() => {
    if (state.selectedElementIds.length === 0) return;

    dispatch({
      type: 'MOVE_ELEMENTS_DOWN',
      payload: { elementIds: state.selectedElementIds }
    });
  }, [state.selectedElementIds, dispatch]);

  const handleGroup = useCallback(() => {
    if (state.selectedElementIds.length < 2) return;
    if ((!canCreateQna || !canDeleteQna) && hasSelectedQna()) return;

    dispatch({
      type: 'GROUP_ELEMENTS',
      payload: { elementIds: state.selectedElementIds }
    });
  }, [state.selectedElementIds, dispatch, canCreateQna, canDeleteQna]);

  const handleUngroup = useCallback(() => {
    if (state.selectedElementIds.length !== 1) return;
    if ((!canCreateQna || !canDeleteQna) && hasSelectedQna()) return;

    const element = currentPage?.elements.find((el: any) => el.id === state.selectedElementIds[0]);
    if (element?.type === 'group' || element?.type === 'brush-multicolor') {
      dispatch({
        type: 'UNGROUP_ELEMENTS',
        payload: { elementId: state.selectedElementIds[0] }
      });
    }
  }, [state.selectedElementIds, currentPage, dispatch, canCreateQna, canDeleteQna]);

  return {
    handleDuplicateItems,
    handleDeleteItems,
    handleCopyItems,
    handlePasteItems,
    handleMoveToFront,
    handleMoveToBack,
    handleMoveUp,
    handleMoveDown,
    handleGroup,
    handleUngroup
  };
};
