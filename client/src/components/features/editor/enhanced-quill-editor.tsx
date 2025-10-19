import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '../../ui/overlays/dialog';
import QuestionsManagerDialog from './questions-manager-dialog';
import { useAuth } from '../../../context/auth-context';
import { useEditor } from '../../../context/editor-context';
import type { CanvasElement } from '../../../context/editor-context';
import { Button } from '../../ui/primitives/button';
import { PenLine } from 'lucide-react';

interface EnhancedQuillEditorProps {
  element: CanvasElement;
  onSave: (content: string, formattedContent?: string) => void;
  onClose: () => void;
  bookId?: number;
  bookName?: string;
  token?: string;
}

// Global flag to prevent multiple modals
let isModalOpen = false;

export default function EnhancedQuillEditor({ element, onSave, onClose, bookId, bookName, token }: EnhancedQuillEditorProps) {
  const { user } = useAuth();
  const { state, updateTempQuestion, updateTempAnswer, addNewQuestion, getQuestionText, getAnswerText } = useEditor();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [qnaData, setQnaData] = useState<Array<{id: string, questionId?: number, questionText: string, answerText: string}>>([]);
  
  useEffect(() => {
    // Prevent multiple modals globally
    if (isModalOpen || modalRef.current) {
      return;
    }
    
    isModalOpen = true;
    
    // Parse existing QnA content
    if (element.formattedText || element.text) {
      parseQnaContent(element.formattedText || element.text || '');
    }
    
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
    
    function parseQnaContent(content: string) {
      // Parse existing QnA content from text format
      const parsedData: Array<{id: string, questionId?: number, questionText: string, answerText: string}> = [];
      
      // Look for [QUESTION: text] and [ANSWER:] patterns
      const questionRegex = /\[QUESTION:\s*([^\]]+)\]/g;
      const parts = content.split(questionRegex);
      
      for (let i = 1; i < parts.length; i += 2) {
        const questionText = parts[i].trim();
        const afterQuestion = parts[i + 1] || '';
        
        // Extract answer text (everything after [ANSWER:] until next [QUESTION:] or end)
        const answerMatch = afterQuestion.match(/\[ANSWER:\]\s*([^\[]*)/s);
        const answerText = answerMatch ? answerMatch[1].trim() : '';
        
        parsedData.push({
          id: `qna-${Math.floor(i/2)}`,
          questionText,
          answerText
        });
      }
      
      setQnaData(parsedData);
    }
    
    function initQuillEditor() {
      // Create modal using DOM
      const modal = document.createElement('div');
      modalRef.current = modal;
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:hsl(var(--background)/0.8);backdrop-filter:blur(2px);display:flex;justify-content:center;align-items:center;z-index:10000';
      
      const container = document.createElement('div');
      container.style.cssText = 'background:white;border-radius:8px;padding:20px;width:90vw;max-width:1000px;min-width:600px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.3)';
      
      const header = document.createElement('div');
      header.style.cssText = 'margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e2e8f0';
      header.innerHTML = '<h2 style="margin:0;font-size:1.25rem;font-weight:600">Questions & Answers Editor</h2>';
      
      const toolbar = document.createElement('div');
      toolbar.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;padding:8px;background:#f8fafc;border-radius:4px';
      
      const insertQuestionBtn = document.createElement('button');
      insertQuestionBtn.textContent = 'Insert Question';
      insertQuestionBtn.style.cssText = 'padding:6px 12px;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:white;font-size:0.875rem';
      insertQuestionBtn.onmouseover = () => insertQuestionBtn.style.background = '#f1f5f9';
      insertQuestionBtn.onmouseout = () => insertQuestionBtn.style.background = 'white';
      insertQuestionBtn.onclick = () => {
        setShowQuestionDialog(true);
      };
      
      toolbar.appendChild(insertQuestionBtn);
      
      const editorContainer = document.createElement('div');
      editorContainer.style.cssText = 'flex:1;min-height:300px;margin-bottom:12px;border:1px solid #e2e8f0;border-radius:4px';
      
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
      
      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(saveBtn);
      
      container.appendChild(header);
      container.appendChild(toolbar);
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
        
        quillRef.current = quill;
        
        // Load existing content
        loadQnaContent(quill);
        
        saveBtn.onclick = () => {
          const plainText = quill.getText();
          const htmlContent = quill.root.innerHTML;
          
          // Save QnA data to temporary storage
          saveQnaData(plainText);
          
          onSave(plainText, htmlContent);
          closeModal();
        };
        
        modal.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Escape') closeModal();
        });
      }, 100);
    }
    
    function loadQnaContent(quill: any) {
      if (qnaData.length === 0) {
        quill.root.innerHTML = '<p>Click "Insert Question" to add your first question.</p>';
        return;
      }
      
      let content = '';
      qnaData.forEach((item) => {
        content += `\n\n[QUESTION: ${item.questionText}]\n\n[ANSWER:]\n${item.answerText}\n\n`;
      });
      
      quill.setText(content.trim());
    }
    
    function saveQnaData(content: string) {
      // Parse the content and save question/answer pairs
      const questionRegex = /\[QUESTION:\s*([^\]]+)\]/g;
      const parts = content.split(questionRegex);
      
      for (let i = 1; i < parts.length; i += 2) {
        const questionText = parts[i].trim();
        const afterQuestion = parts[i + 1] || '';
        
        // Extract answer text
        const answerMatch = afterQuestion.match(/\[ANSWER:\]\s*([^\[]*)/s);
        const answerText = answerMatch ? answerMatch[1].trim() : '';
        
        // For now, we'll store these as new questions
        // In a real implementation, you'd want to track question IDs
        if (questionText) {
          addNewQuestion(element.id + '-' + Math.floor(i/2), questionText);
          // Store answer if provided
          if (answerText) {
            // This would need proper question ID tracking
            console.log('Answer for question:', questionText, 'Answer:', answerText);
          }
        }
      }
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

  const handleQuestionSelect = (questionId: number, questionText: string) => {
    if (!quillRef.current) return;
    
    // Insert styled question block
    const range = quillRef.current.getSelection() || { index: 0, length: 0 };
    
    const questionHtml = `
      <div style="background:#e0f2fe;border-left:4px solid #0284c7;padding:12px;margin:8px 0;border-radius:6px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <strong style="color:#0369a1;font-size:14px;">📝 Question:</strong>
          <button style="padding:4px 8px;border:1px solid #0284c7;border-radius:4px;background:white;color:#0369a1;font-size:12px;cursor:pointer;">✏️ Edit</button>
        </div>
        <div style="font-weight:500;color:#1e293b;line-height:1.5;">${questionText}</div>
      </div>
      <div style="margin:8px 0 16px 16px;">
        <strong style="color:#059669;font-size:14px;">💬 Answer:</strong>
        <div style="margin-top:8px;padding:12px;border:2px dashed #d1d5db;border-radius:6px;background:#fafafa;min-height:60px;" contenteditable="true"></div>
      </div>
    `;
    
    quillRef.current.clipboard.dangerouslyPasteHTML(range.index, questionHtml);
    
    updateTempQuestion(questionId, questionText);
    setShowQuestionDialog(false);
  };

  return (
    <>
      {showQuestionDialog && bookId && bookName && token && (
        <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden z-[10001]">
            <QuestionsManagerDialog
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