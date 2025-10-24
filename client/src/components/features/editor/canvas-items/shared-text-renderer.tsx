import { useMemo } from 'react';
import { useEditor } from '../../../../context/editor-context';

interface SharedTextRendererProps {
  element: any;
  getQuestionText: (questionId: string) => string | null;
  getAnswerText: (questionId: string, userId: string) => string | null;
  state: any;
}

export function useSharedTextRenderer({ element, getQuestionText, getAnswerText, state }: SharedTextRendererProps) {
  
  const getPlaceholderText = () => {
    if (element.textType === 'qna' || element.textType === 'answer') {
      return ''; // Return empty for qna/answer types to let parent handle placeholders
    }
    if (!element.questionId) {
      return 'Double-click to add question and answer...';
    }
    return 'Double-click for options...';
  };

  // Process text with question placeholders and omit [question] for qna and answer types
  const getDisplayText = () => {
    // For answer elements, check for questionId or linked question element
    let questionId = element.questionId;
    
    if (!questionId && element.textType === 'answer' && element.questionElementId) {
      // Find the linked question element to get questionId
      const currentPage = state.currentBook?.pages[state.activePageIndex];
      if (currentPage) {
        const questionElement = currentPage.elements.find((el: any) => el.id === element.questionElementId);
        questionId = questionElement?.questionId;
      }
    }
    
    // If no questionId is set, always show placeholder
    if (!questionId) {
      return getPlaceholderText();
    }
    
    // Get question text
    const questionText = getQuestionText(questionId);
    
    // If we have a questionId but no question text yet, show loading state
    if (!questionText) {
      return 'Loading question...';
    }
    
    // Get answer text from temp answers (like qna textboxes)
    const assignedUser = state.pageAssignments[state.activePageIndex + 1];
    const answerText = assignedUser ? getAnswerText(questionId, assignedUser.id) : '';
    
    // Use stored answer text from temp answers, not element.text
    let textToUse = answerText || '';
    
    // For qna and answer textTypes, omit [question] placeholders
    if (element.textType === 'qna' || element.textType === 'answer') {
      // Remove [question] placeholders and handle empty lines
      if (textToUse.includes('[question]')) {
        // Split into lines and process each line
        const lines = textToUse.split('\n');
        const processedLines = lines.map(line => {
          const trimmedLine = line.trim();
          // If line only contains [question], omit the entire line
          if (trimmedLine === '[question]') {
            return null;
          }
          // Remove [question] from lines that contain other content
          return line.replace(/\[question\]/g, '');
        }).filter(line => line !== null); // Remove null lines
        
        textToUse = processedLines.join('\n');
      }
      
      // Also handle bracketed question text
      if (questionText) {
        const questionPlaceholder = `[${questionText}]`;
        if (textToUse.includes(questionPlaceholder)) {
          const lines = textToUse.split('\n');
          const processedLines = lines.map(line => {
            const trimmedLine = line.trim();
            // If line only contains the bracketed question, omit the entire line
            if (trimmedLine === questionPlaceholder) {
              return null;
            }
            // Remove bracketed question from lines that contain other content
            return line.replace(questionPlaceholder, '');
          }).filter(line => line !== null);
          
          textToUse = processedLines.join('\n');
        }
      }
    } else {
      // For other textTypes (like qna2), replace placeholders with actual question text
      if (textToUse.includes('[question]')) {
        textToUse = textToUse.replace(/\[question\]/g, questionText);
      } else {
        // Look for bracketed question text and replace it with just the question text
        const questionPlaceholder = `[${questionText}]`;
        if (textToUse.includes(questionPlaceholder)) {
          textToUse = textToUse.replace(questionPlaceholder, questionText);
        } else if (!textToUse) {
          // If no text content but we have a question, show just the question
          textToUse = questionText;
        } else {
          // If we have both question and text content, but no placeholder,
          // prepend the question to preserve both
          textToUse = questionText + '\n\n' + textToUse;
        }
      }
    }
    
    // Convert HTML to plain text for Konva display
    if (textToUse && textToUse.includes('<')) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = textToUse;
      textToUse = tempDiv.textContent || tempDiv.innerText || textToUse;
    }
    
    // Clean up any remaining whitespace
    textToUse = textToUse.trim();
    
    return textToUse || getPlaceholderText();
  };

  const displayText = useMemo(() => getDisplayText(), [
    element, 
    element.questionId,
    element.questionElementId,
    element.text,
    element.formattedText,
    state.pageAssignments, 
    state.tempAnswers, 
    state.activeTool,
    state.selectedElementIds,
    getQuestionText, 
    getAnswerText, 
    state.activePageIndex,
    state.tempQuestions,
    state.loadedQuestions
  ]);

  return { displayText, getDisplayText };
}