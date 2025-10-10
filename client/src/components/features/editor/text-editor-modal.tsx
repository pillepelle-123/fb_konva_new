import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '../../ui/overlays/dialog';
import QuestionsManagerContent from '../questions/questions-manager-content';
import { useAuth } from '../../../context/auth-context';
import { useEditor } from '../../../context/editor-context';
import type { CanvasElement } from '../../../context/editor-context';

interface TextEditorModalProps {
  element: CanvasElement;
  onSave: (content: string, formattedContent?: string) => void;
  onClose: () => void;
  onSelectQuestion?: () => void;
  bookId?: number;
  bookName?: string;
  token?: string;
}

// Global flag to prevent multiple modals
let isModalOpen = false;

// Helper function to find question element
const findQuestionElement = async (questionElementId: string) => {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('findQuestionElement', {
      detail: { questionElementId, callback: resolve }
    }));
  });
};

export default function TextEditorModal({ element, onSave, onClose, onSelectQuestion, bookId, bookName, token }: TextEditorModalProps) {
  const { user } = useAuth();
  const { updateTempQuestion, updateTempAnswer, addNewQuestion, getQuestionText, getAnswerText } = useEditor();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const questionDialogTrigger = useRef<(() => void) | null>(null);
  
  useEffect(() => {
    // Prevent multiple modals globally
    if (isModalOpen || modalRef.current) {
      return;
    }
    
    isModalOpen = true;
    
    // Load Quill.js if not already loaded
    if (!window.Quill) {
      const quillCSS = document.createElement('link');
      quillCSS.rel = 'stylesheet';
      quillCSS.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
      document.head.appendChild(quillCSS);
      
      const quillJS = document.createElement('script');
      quillJS.src = 'https://cdn.quilljs.com/1.3.6/quill.min.js';
      document.head.appendChild(quillJS);
      
      quillJS.onload = () => initQuillEditor();
      return;
    } else {
      initQuillEditor();
    }
    
    function initQuillEditor() {
      // Create modal using DOM
      const modal = document.createElement('div');
      modalRef.current = modal;
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:hsl(var(--background)/0.8);backdrop-filter:blur(2px);display:flex;justify-content:center;align-items:center;z-index:10000';
      
      const container = document.createElement('div');
      container.style.cssText = 'background:white;border-radius:8px;padding:20px;width:80vw;max-width:900px;min-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.3)';
      
      const editorContainer = document.createElement('div');
      editorContainer.style.cssText = 'min-height:200px;margin-bottom:12px';
      
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px;font-size:.875rem;font-weight:500;line-height:1.25rem;color:hsl(var(--foreground));padding:0 12px';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding:8px 16px;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:white';
      cancelBtn.onmouseover = () => cancelBtn.style.background = '#f1f5f9';
      cancelBtn.onmouseout = () => cancelBtn.style.background = 'white';
      
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.style.cssText = 'padding:8px 16px;border:none;border-radius:4px;background:#304050;color:white;cursor:pointer';
      saveBtn.onmouseover = () => saveBtn.style.background = '#303a50e6';
      saveBtn.onmouseout = () => saveBtn.style.background = '#304050';
      
      const closeModal = () => {
        if (modalRef.current && document.body.contains(modalRef.current)) {
          document.body.removeChild(modalRef.current);
        }
        modalRef.current = null;
        isModalOpen = false;
        onClose();
      };
      
      cancelBtn.onclick = closeModal;
      
      if (element.textType === 'question' && user?.role !== 'author') {
        const selectQuestionBtn = document.createElement('button');
        selectQuestionBtn.textContent = 'Select Question';
        selectQuestionBtn.style.cssText = 'padding:8px 16px;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:white';
        selectQuestionBtn.onmouseover = () => selectQuestionBtn.style.background = '#f1f5f9';
        selectQuestionBtn.onmouseout = () => selectQuestionBtn.style.background = 'white';
        selectQuestionBtn.onclick = () => {
          window.dispatchEvent(new CustomEvent('openQuestionDialog'));
        };
        buttonContainer.appendChild(selectQuestionBtn);
      }
      
      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(saveBtn);
      
      container.appendChild(editorContainer);
      container.appendChild(buttonContainer);
      modal.appendChild(container);
      document.body.appendChild(modal);
      
      // Initialize Quill
      setTimeout(() => {
        const quill = new window.Quill(editorContainer, {
          theme: 'snow',
          formats: ['bold', 'italic', 'underline', 'color', 'font', 'header'],
          modules: {
            toolbar: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline'],
              [{ 'color': ['#000000', '#e60000', '#ff9900', '#ffff00', '#008a00', '#0066cc', '#9933ff'] }],
              [{ 'font': ['helvetica', 'georgia', 'arial', 'courier'] }]
            ]
          }
        });
        
        const textToLoad = element.formattedText || element.text;
        if (textToLoad) {
          if (textToLoad.includes('data-ruled="true"')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = textToLoad;
            const ruledDiv = tempDiv.querySelector('[data-ruled="true"]');
            if (ruledDiv) {
              quill.root.innerHTML = ruledDiv.innerHTML;
            }
          } else {
            quill.root.innerHTML = textToLoad;
          }
        }
        
        saveBtn.onclick = async () => {
          const htmlContent = quill.root.innerHTML;
          
          // Extract plain text for database storage
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
          const plainText = tempDiv.textContent || tempDiv.innerText || '';
          
          // Store in temporary state instead of saving to database immediately
          if (element.textType === 'question') {
            if (element.questionId) {
              // Update existing question in temp storage
              updateTempQuestion(element.questionId, plainText);
            } else {
              // New question - add to temp storage
              addNewQuestion(element.id, plainText);
            }
          } else if (element.textType === 'answer' && element.questionElementId) {
            // Find the linked question element to get questionId
            const questionElement = await findQuestionElement(element.questionElementId);
            if (questionElement && questionElement.questionId) {
              // Store answer in temp storage
              updateTempAnswer(questionElement.questionId, plainText);
            }
          }
          
          onSave(plainText, htmlContent);
          closeModal();
        };
        
        // Don't focus to avoid addRange errors
        
        modal.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Escape') closeModal();
        });
      }, 100);
    }
    
    // Cleanup function
    return () => {
      if (modalRef.current && document.body.contains(modalRef.current)) {
        document.body.removeChild(modalRef.current);
      }
      modalRef.current = null;
      isModalOpen = false;
    };
  }, [element.id]);
  
  // Listen for the question dialog event
  useEffect(() => {
    const handleOpenQuestionDialog = () => {
      setShowQuestionDialog(true);
    };
    
    window.addEventListener('openQuestionDialog', handleOpenQuestionDialog);
    return () => {
      window.removeEventListener('openQuestionDialog', handleOpenQuestionDialog);
    };
  }, []);

  const handleQuestionSelect = (questionId: number, questionText: string) => {
    // Store question selection in temp storage
    updateTempQuestion(questionId, questionText);
    
    onSave(questionText);
    setShowQuestionDialog(false);
    
    // Close main modal
    if (modalRef.current && document.body.contains(modalRef.current)) {
      document.body.removeChild(modalRef.current);
    }
    modalRef.current = null;
    isModalOpen = false;
    onClose();
  };

  return (
    <>
      {showQuestionDialog && bookId && bookName && token && (
        <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden z-[10001]">
            <QuestionsManagerContent
              bookId={bookId}
              bookName={bookName}
              onQuestionSelect={handleQuestionSelect}
              mode="select"
              token={token}
              onClose={() => setShowQuestionDialog(false)}
            />
          </DialogContent>
        </Dialog>
      )}
      {null} {/* This component only creates DOM elements */}
    </>
  );
}