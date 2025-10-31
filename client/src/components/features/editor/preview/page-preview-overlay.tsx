import { X } from 'lucide-react';
import { useEditor } from '../../../../context/editor-context';
import QuestionsManager from '../../questions/questions-manager';
import BookManagerContent from '../../books/book-manager-content';
import { TemplateSelector } from '../template-selector';

interface PagePreviewOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  content?: 'preview' | 'questions' | 'manager' | 'templates';
}

export default function PagePreviewOverlay({ isOpen, onClose, content = 'preview' }: PagePreviewOverlayProps) {
  const { state } = useEditor();

  if (!isOpen) return null;

  const currentPage = state.currentBook?.pages[state.activePageIndex];

  const renderElement = (element: any) => {
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
           content === 'templates' ? 'Templates' : 'Page Preview'}
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
              <QuestionsManager bookId={state.currentBook.id} onClose={onClose} />
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