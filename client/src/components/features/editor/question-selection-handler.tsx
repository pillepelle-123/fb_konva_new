import { useEffect } from 'react';
import { useEditor } from '../../../context/editor-context';

export default function QuestionSelectionHandler() {
  const { state, dispatch, isQuestionAvailableForUser } = useEditor();

  useEffect(() => {
    const handleQuestionSelect = (event: CustomEvent) => {
      const { elementId, questionId, questionText } = event.detail;
      
      // Get current page and check if user is assigned
      const currentPageNumber = state.activePageIndex + 1;
      const assignedUser = state.pageAssignments[currentPageNumber];
      
      if (assignedUser && questionId) {
        // Check if question is available for this user
        if (!isQuestionAvailableForUser(questionId, assignedUser.id)) {
          // Show alert and prevent assignment
          window.dispatchEvent(new CustomEvent('showAlert', {
            detail: { 
              message: `Question "${questionText}" is already assigned to ${assignedUser.name} on another page.`,
              x: 100,
              y: 100,
              width: 300,
              height: 100
            }
          }));
          return;
        }
      }
      
      // Store question text in temp storage for new questions
      if (questionId && questionText) {
        dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId, text: questionText } });
      }
      
      // Proceed with question assignment
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          id: elementId,
          updates: { questionId: questionId, text: questionText }
        }
      });
    };

    window.addEventListener('questionSelected', handleQuestionSelect as EventListener);
    return () => window.removeEventListener('questionSelected', handleQuestionSelect as EventListener);
  }, [state.activePageIndex, state.pageAssignments, dispatch, isQuestionAvailableForUser]);

  return null;
}