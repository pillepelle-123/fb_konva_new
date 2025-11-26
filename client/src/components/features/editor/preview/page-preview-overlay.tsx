import { X } from 'lucide-react';
import { useEditor } from '../../../../context/editor-context';
import { QuestionList } from '../../questions/question-list';
import BookManagerContent from '../../books/book-manager-content';
import { useState, useEffect } from 'react';
import { apiService } from '../../../../services/api';
import { TemplateSelector } from '../template-selector';
import { TemplateWrapper } from '../templates/template-wrapper';
import { getPalette } from '../../../../data/templates/color-palettes';

interface PagePreviewOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  content?: 'preview' | 'questions' | 'manager' | 'templates' | 'layouts' | 'themes' | 'palettes';
  isBookLevel?: boolean;
}

export default function PagePreviewOverlay({ isOpen, onClose, content = 'preview', isBookLevel = false }: PagePreviewOverlayProps) {
  const { state, dispatch } = useEditor();
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && content === 'questions' && state.currentBook?.id) {
      fetchQuestions();
      fetchAnswers();
    }
  }, [isOpen, content, state.currentBook?.id]);

  const fetchQuestions = async () => {
    try {
      const data = await apiService.getQuestions(state.currentBook!.id);
      setQuestions(data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const fetchAnswers = async () => {
    try {
      const data = await apiService.getUserAnswers(state.currentBook!.id);
      setAnswers(data);
    } catch (error) {
      console.error('Error fetching answers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAnswersForQuestion = (questionId: string) => {
    return answers.filter((answer: any) => answer.question_id === questionId).map((answer: any) => ({
      id: answer.id,
      user_id: answer.user_id,
      answer_text: answer.answer_text,
      user_name: answer.user_name || 'Unknown',
      user_email: answer.user_email || '',
    }));
  };

  if (!isOpen) return null;

  const currentPage = state.currentBook?.pages[state.activePageIndex];

  const renderElement = (element: { x: number; y: number; width: number; height: number; type: string; textType?: string; questionId?: number; text?: string; fontSize?: number; fontFamily?: string; fontColor?: string; backgroundColor?: string }) => {
    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${(element.x / 2480) * 100}%`,
      top: `${(element.y / 3508) * 100}%`,
      width: `${(element.width / 2480) * 100}%`,
      height: `${(element.height / 3508) * 100}%`,
    };

    if (element.type === 'text') {
      let displayText = '';
      
      if (element.textType === 'qna_inline' && element.questionId) {
        const questionText = state.tempQuestions[element.questionId] || '';
        const assignedUser = state.pageAssignments[state.activePageIndex + 1];
        const userText = assignedUser ? (state.tempAnswers[element.questionId]?.[assignedUser.id]?.text || '') : '';
        displayText = questionText + ' ' + userText;
      } else {
        displayText = element.text || '';
      }

      return (
        <div
          key={element.id}
          style={{
            ...style,
            fontSize: `${Math.max(8, (element.fontSize || 16) * 0.3)}px`,
            fontFamily: element.fontFamily || 'Arial, sans-serif',
            color: element.fontColor || '#000000',
            backgroundColor: element.backgroundColor || 'transparent',
            padding: '2px',
            overflow: 'hidden',
            wordWrap: 'break-word',
            lineHeight: '1.2'
          }}
        >
          {displayText || 'Empty text'}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-white z-40">
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <h2 className="text-lg font-semibold">
          {content === 'questions' ? 'Questions' : 
           content === 'manager' ? 'Book Manager' : 
           content === 'templates' ? 'Templates' :
           content === 'layouts' ? 'Layout Templates' :
           content === 'themes' ? 'Themes' :
           content === 'palettes' ? 'Color Palettes' : 'Page Preview'}
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <X size={20} />
        </button>
      </div>
      
      <div className="h-[calc(100vh-64px)] overflow-auto">
        {content === 'questions' ? (
          <div className="p-6">
            {state.currentBook && (
              <div className="space-y-4">
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
                  >
                    Back to Canvas
                  </button>
                )}
                <h2 className="text-xl font-semibold">Questions & Answers (Book ID: {state.currentBook.id})</h2>
                <QuestionList
                  mode="view"
                  questions={questions.map(q => ({
                    ...q,
                    answers: getAnswersForQuestion(q.id)
                  }))}
                  loading={loading}
                  showAnswers={true}
                  showDates={true}
                  emptyMessage="No questions found for this book."
                />
              </div>
            )}
          </div>
        ) : content === 'manager' ? (
          <div className="h-full flex flex-col">
            {state.currentBook && (
              <BookManagerContent bookId={state.currentBook.id} onClose={onClose} />
            )}
          </div>
        ) : content === 'templates' ? (
          <div className="p-6">
            <TemplateSelector onBack={onClose} />
          </div>
        ) : (content === 'layouts' || content === 'themes' || content === 'palettes') ? (
          <TemplateWrapper
            type={content}
            isBookLevel={isBookLevel}
            onApply={(applyToAll, selectedLayout, selectedTheme, selectedPalette) => {
              // If isBookLevel is true, always apply to book level, ignoring applyToAll toggle
              const shouldApplyToBook = isBookLevel || applyToAll;
              
              if (content === 'layouts' && selectedLayout) {
                // Apply layout template to existing pages with element integration
                dispatch({
                  type: 'APPLY_LAYOUT_TEMPLATE',
                  payload: {
                    template: selectedLayout,
                    pageIndex: shouldApplyToBook ? undefined : state.activePageIndex,
                    applyToAllPages: shouldApplyToBook
                  }
                });
                
                // Also set the layout template ID for reference
                if (shouldApplyToBook) {
                  dispatch({
                    type: 'SET_BOOK_LAYOUT_TEMPLATE',
                    payload: selectedLayout.id
                  });
                } else {
                  dispatch({
                    type: 'SET_PAGE_LAYOUT_TEMPLATE',
                    payload: {
                      pageIndex: state.activePageIndex,
                      layoutTemplateId: selectedLayout.id
                    }
                  });
                }
              } else if (content === 'themes' && selectedTheme !== 'default') {
                if (shouldApplyToBook) {
                  dispatch({
                    type: 'SET_BOOK_THEME',
                    payload: selectedTheme
                  });
                } else {
                  dispatch({
                    type: 'SET_PAGE_THEME',
                    payload: {
                      pageIndex: state.activePageIndex,
                      themeId: selectedTheme as string
                    }
                  });
                }
              } else if (content === 'palettes' && selectedPalette) {
                const palette = getPalette(selectedPalette.id as string);
                if (palette) {
                  if (shouldApplyToBook) {
                    dispatch({
                      type: 'SET_BOOK_COLOR_PALETTE',
                      payload: selectedPalette.id
                    });
                  } else {
                    dispatch({
                      type: 'SET_PAGE_COLOR_PALETTE',
                      payload: {
                        pageIndex: state.activePageIndex,
                        colorPaletteId: selectedPalette.id as string
                      }
                    });
                  }
                  // Apply palette colors to existing elements
                  dispatch({
                    type: 'APPLY_COLOR_PALETTE',
                    payload: {
                      palette,
                      pageIndex: shouldApplyToBook ? undefined : state.activePageIndex,
                      applyToAllPages: shouldApplyToBook
                    }
                  });
                }
              }
              
              onClose();
            }}
            onCancel={onClose}
          />
        ) : (
          <div className="p-6">
            <div
              className="relative bg-white shadow-lg mx-auto"
              style={{
                width: '420px',
                height: '594px'
              }}
            >
              {currentPage?.elements.map(renderElement)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}