import { useRef, useState, useEffect, useMemo } from 'react';
import { Text, Rect, Group, Path } from 'react-konva';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import type { CanvasElement } from '../../../../context/editor-context';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { getParagraphSpacing, getPadding } from '../../../../utils/format-utils';
import { getRuledLinesOpacity } from '../../../../utils/ruled-lines-utils';
import { getRuledLinesTheme } from '../../../../utils/theme-utils';
import { getThemeRenderer } from '../../../../utils/themes';
import { getToolDefaults } from '../../../../utils/tool-defaults';
import rough from 'roughjs';
import { KonvaSkeleton } from '../../../ui/primitives/skeleton';


// Rich text formatting function for Quill HTML output
function formatRichText(text: string, fontSize: number, fontFamily: string, maxWidth: number, hasRuledLines: boolean = false, paragraphSpacing: string = 'medium', element?: CanvasElement) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  
  const lineHeight = hasRuledLines ? fontSize * Math.max(2.5, (paragraphSpacing === 'small' ? 1.0 : paragraphSpacing === 'large' ? 3.0 : 1.5) * 1.5) : fontSize * 1.2;
  const textParts: any[] = [];
  
  // Create temporary div to parse Quill HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  
  let currentX = 0;
  let currentY = 0;
  
  // Process each paragraph/line
  const processElement = (element: Element, inheritedStyles: any = {}) => {
    const styles = { ...inheritedStyles };
    
    // Check element styles
    if (element.tagName === 'STRONG' || element.tagName === 'B') {
      styles.bold = true;
    }
    if (element.tagName === 'EM' || element.tagName === 'I') {
      styles.italic = true;
    }
    if (element.tagName === 'U') {
      styles.underline = true;
    }
    if (element.tagName === 'H1') {
      styles.bold = false;
      styles.fontSize = fontSize * 1.8;
    }
    if (element.tagName === 'H2') {
      styles.bold = false;
      styles.fontSize = fontSize * 1.5;
    }
    if (element.tagName === 'H3') {
      styles.bold = false;
      styles.fontSize = fontSize * 1.2;
    }
    
    // Check for styles in style attribute
    const styleAttr = element.getAttribute('style');
    if (styleAttr) {
      if (styleAttr.includes('color:')) {
        const colorMatch = styleAttr.match(/color:\s*([^;]+)/i);
        if (colorMatch) {
          styles.color = colorMatch[1].trim();
        }
      }
      if (styleAttr.includes('font-family:')) {
        const fontMatch = styleAttr.match(/font-family:\s*([^;]+)/i);
        if (fontMatch) {
          styles.fontFamily = fontMatch[1].trim().replace(/["']/g, '');
        }
      }
    }
    
    // Check for Quill font and size classes
    const className = element.getAttribute('class');
    if (className) {
      if (className.includes('ql-font-')) {
        const fontClass = className.match(/ql-font-([a-z]+)/);
        if (fontClass) {
          const fontMap: { [key: string]: string } = {
            'georgia': 'Georgia, serif',
            'helvetica': 'Helvetica, sans-serif',
            'arial': 'Arial, sans-serif',
            'courier': 'Courier New, monospace',
            'kalam': 'Kalam, cursive',
            'shadows': 'Shadows Into Light, cursive',
            'playwrite': 'Playwrite DE SAS, cursive',
            'msmadi': 'Ms Madi, cursive',
            'giveyouglory': 'Give You Glory, cursive',
            'meowscript': 'Meow Script, cursive'
          };
          styles.fontFamily = fontMap[fontClass[1]] || fontFamily;
        }
      }
      if (className.includes('ql-size-')) {
        const sizeClass = className.match(/ql-size-([a-z]+)/);
        if (sizeClass) {
          const sizeMap: { [key: string]: number } = {
            'small': fontSize * 0.75,
            'large': fontSize * 1.5,
            'huge': fontSize * 2.5
          };
          styles.fontSize = sizeMap[sizeClass[1]] || fontSize;
        }
      }
    }
    
    // Process child nodes
    element.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || '';
        if (text.trim()) {
          processText(text, styles);
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        processElement(child as Element, styles);
      }
    });
    
    // Add line break after block elements
    if (['P', 'DIV', 'H1', 'H2', 'H3'].includes(element.tagName)) {
      currentX = 0;
      let elementLineHeight = lineHeight;
      if (element.tagName === 'H1') {
        elementLineHeight = fontSize * 1.8 * 1.2;
      } else if (element.tagName === 'H2') {
        elementLineHeight = fontSize * 1.5 * 1.2;
      } else if (element.tagName === 'H3') {
        elementLineHeight = fontSize * 1.2 * 1.2;
      }
      currentY += elementLineHeight;
    }
  };
  
  const processText = (text: string, styles: any) => {
    
    const words = text.split(' ');
    let currentLineMaxFontSize = fontSize;
    
    words.forEach((word, index) => {
      if (index > 0) word = ' ' + word;
      
      const currentFontSize = styles.fontSize || fontSize;
      const fontStyle = `${styles.bold ? 'bold ' : ''}${styles.italic ? 'italic ' : ''}${currentFontSize}px ${fontFamily}`;
      context.font = fontStyle;
      
      const wordWidth = context.measureText(word).width;
      
      if (currentX + wordWidth > maxWidth && currentX > 0) {
        // Move to next line with proper line height based on largest font in previous line
        const lineHeight = hasRuledLines ? currentLineMaxFontSize * 2.5 : currentLineMaxFontSize * 1.4;
        currentX = 0;
        currentY += lineHeight;
        currentLineMaxFontSize = currentFontSize; // Reset for new line
      } else {
        // Track largest font size in current line
        currentLineMaxFontSize = Math.max(currentLineMaxFontSize, currentFontSize);
      }
      
      // Calculate baseline offset for proper vertical alignment
      const baselineOffset = (currentFontSize - fontSize) * 1;
      
      textParts.push({
        text: word,
        x: currentX,
        y: currentY - baselineOffset,
        fontSize: currentFontSize,
        fontFamily: styles.fontFamily || fontFamily,
        fontStyle: `${styles.bold ? 'bold' : ''}${styles.italic ? ' italic' : ''}`.trim() || 'normal',
        textDecoration: styles.underline ? 'underline' : '',
        fill: styles.color || '#000000'
      });
      
      currentX += wordWidth;
    });
  };
  
  // Process all child elements
  tempDiv.childNodes.forEach(child => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      processElement(child as Element);
    } else if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || '';
      if (text.trim()) {
        processText(text, {});
      }
    }
  });
  
  return textParts;
}

export default function TextboxQnAInline(props: CanvasItemProps) {
  const { element } = props;
  const { state, dispatch } = useEditor();
  const { user } = useAuth();
  const textRef = useRef<Konva.Text>(null);
  
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Listen for transformer events from the canvas
  useEffect(() => {
    const handleTransformStart = (e: CustomEvent) => {
      if (e.detail.elementId === element.id) {
        setIsResizing(true);
      }
    };
    
    const handleTransformEnd = (e: CustomEvent) => {
      if (e.detail.elementId === element.id) {
        setIsResizing(false);
      }
    };
    
    window.addEventListener('transformStart', handleTransformStart as EventListener);
    window.addEventListener('transformEnd', handleTransformEnd as EventListener);
    
    return () => {
      window.removeEventListener('transformStart', handleTransformStart as EventListener);
      window.removeEventListener('transformEnd', handleTransformEnd as EventListener);
    };
  }, [element.id]);

  // Force refresh when element properties change (e.g., from Style Painter)
  useEffect(() => {
    // Simulate the resize process to force proper re-calculation of ruled lines
    setIsResizing(true);
    setTimeout(() => {
      setIsResizing(false);
      setRefreshKey(prev => prev + 1);
    }, 10);
  }, [element.questionSettings, element.answerSettings, element.fontSize, element.fontFamily, element.fontColor, element.width, element.height]);


  
  const fontSize = (() => {
    let size = element.font?.fontSize || element.fontSize;
    if (!size) {
      const currentPage = state.currentBook?.pages[state.activePageIndex];
      const pageTheme = currentPage?.background?.pageTheme;
      const bookTheme = state.currentBook?.bookTheme;
      const elementTheme = element.theme;
      const activeTheme = pageTheme || bookTheme || elementTheme;
      if (activeTheme) {
        const themeDefaults = getGlobalThemeDefaults(activeTheme, 'text');
        size = themeDefaults?.font?.fontSize || themeDefaults?.fontSize;
      }
      if (!size) {
        const toolDefaults = getToolDefaults('qna_inline', pageTheme, bookTheme);
        size = toolDefaults.fontSize;
      }
    }
    return size || 50;
  })();
  
  const fontFamily = element.font?.fontFamily || element.fontFamily || 'Arial, sans-serif';
  
  const getQuestionText = () => {
    if (!element.questionId) return '';
    return state.tempQuestions[element.questionId] || 'Loading question...';
  };

  const getUserText = () => {
    // First check element text (for immediate display after save)
    let text = element.formattedText || element.text || '';
    if (text) {
      if (text.includes('<')) {
        text = text.replace(/<p>/gi, '').replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        text = tempDiv.textContent || tempDiv.innerText || '';
      }
      return text;
    }
    
    // Fallback to temp answers if no element text
    if (element.questionId) {
      const assignedUser = state.pageAssignments[state.activePageIndex + 1];
      if (assignedUser) {
        return state.tempAnswers[element.questionId]?.[assignedUser.id]?.text || '';
      }
    }
    
    return '';
  };


  
  // Update element text when assigned user changes to show their answer
  useEffect(() => {
    if (element.questionId) {
      const assignedUser = state.pageAssignments[state.activePageIndex + 1];
      const answerText = assignedUser ? (state.tempAnswers[element.questionId]?.[assignedUser.id]?.text || '') : '';
      
      // Always update to show the assigned user's answer (or empty if no answer yet)
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: {
          id: element.id,
          updates: {
            text: answerText,
            formattedText: answerText
          }
        }
      });
    }
  }, [element.questionId, state.pageAssignments, state.activePageIndex, state.tempAnswers, element.id, dispatch]);

  // Generate ruled lines
  const generateRuledLines = () => {
    const lines = [];
    // Get default settings from tool defaults if not present
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const pageTheme = currentPage?.background?.pageTheme;
    const bookTheme = state.currentBook?.bookTheme;
    const qnaInlineDefaults = getToolDefaults('qna_inline', pageTheme, bookTheme);
    
    const questionStyle = {
      ...qnaInlineDefaults.questionSettings,
      ...element.questionSettings
    };
    const answerStyle = {
      ...qnaInlineDefaults.answerSettings,
      ...element.answerSettings
    };
    const padding = questionStyle.padding || answerStyle.padding || element.format?.padding || element.padding || 4;
    
    // Check if ruled lines are enabled for question or answer
    const questionRuledLines = questionStyle.ruledLines ?? false;
    const answerRuledLines = answerStyle.ruledLines ?? false;
    
    if (!questionRuledLines && !answerRuledLines) return [];
    
    const questionFontSize = questionStyle.fontSize || fontSize;
    const answerFontSize = answerStyle.fontSize || fontSize;
    
    // Generate lines for question section
    if (questionRuledLines) {
      const qTheme = questionStyle.ruledLinesTheme || 'rough';
      const qColor = questionStyle.ruledLinesColor || '#1f2937';
      const qWidth = questionStyle.ruledLinesWidth || 0.8;
      const qOpacity = questionStyle.ruledLinesOpacity ?? 1;
      const qSpacing = questionStyle.paragraphSpacing || 'medium';
      
      const lineSpacing = questionFontSize * (qSpacing === 'small' ? 1.0 : qSpacing === 'large' ? 1.5 : 1.2);
      const firstLineY = padding + Math.max(questionFontSize, answerFontSize) * 0.8;
      for (let y = firstLineY; y < element.height / 2; y += lineSpacing) {
        lines.push(...generateLineElement(y, qTheme, padding, qColor, qWidth, qOpacity));
      }
    }
    
    // Generate lines for answer section
    if (answerRuledLines) {
      const aTheme = answerStyle.ruledLinesTheme || 'rough';
      const aColor = answerStyle.ruledLinesColor || '#1f2937';
      const aWidth = answerStyle.ruledLinesWidth || 0.8;
      const aOpacity = answerStyle.ruledLinesOpacity ?? 1;
      const aSpacing = answerStyle.paragraphSpacing || 'medium';
      
      const lineSpacing = answerFontSize * (aSpacing === 'small' ? 1.0 : aSpacing === 'large' ? 1.5 : 1.2);
      const firstLineY = questionRuledLines ? element.height / 2 : padding + Math.max(questionFontSize, answerFontSize) * 0.8;
      for (let y = firstLineY; y < element.height - padding; y += lineSpacing) {
        lines.push(...generateLineElement(y, aTheme, padding, aColor, aWidth, aOpacity));
      }
    }
    
    return lines;
  };
  
  const generateLineElement = (y: number, theme: string, padding: number, ruledLineColor: string, ruledLineWidth: number, ruledLineOpacity: number) => {
    const lineElements = [];
    if (theme === 'rough') {
      const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const rc = rough.svg(svg);
      
      try {
        const roughLine = rc.line(padding, y, element.width - padding, y, {
          roughness: 2,
          strokeWidth: ruledLineWidth,
          stroke: ruledLineColor,
          seed: seed + y
        });
        
        const paths = roughLine.querySelectorAll('path');
        let combinedPath = '';
        paths.forEach(path => {
          const d = path.getAttribute('d');
          if (d) combinedPath += d + ' ';
        });
        
        if (combinedPath) {
          lineElements.push(
            <Path
              key={y}
              data={combinedPath.trim()}
              stroke={ruledLineColor}
              strokeWidth={ruledLineWidth}
              opacity={ruledLineOpacity}
              listening={false}
            />
          );
        }
      } catch (error) {
        lineElements.push(
          <Path
            key={y}
            data={`M ${padding} ${y} L ${element.width - padding} ${y}`}
            stroke={ruledLineColor}
            strokeWidth={ruledLineWidth}
            opacity={ruledLineOpacity}
            listening={false}
          />
        );
      }
    } else {
      lineElements.push(
        <Path
          key={y}
          data={`M ${padding} ${y} L ${element.width - padding} ${y}`}
          stroke={ruledLineColor}
          strokeWidth={ruledLineWidth}
          opacity={ruledLineOpacity}
          listening={false}
        />
      );
    }
    
    return lineElements;
  };

  const handleDoubleClick = (e: any) => {
    if (state.activeTool !== 'select') return;
    if (e.evt.button !== 0) return; // Only left button (0)
    enableQuillEditing();
  };

  const enableQuillEditing = () => {
    const stage = textRef.current?.getStage();
    if (!stage) return;
    
    // Load Quill.js if not already loaded
    if (!window.Quill) {
      const quillCSS = document.createElement('link');
      quillCSS.rel = 'stylesheet';
      quillCSS.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
      document.head.appendChild(quillCSS);
      
      const quillJS = document.createElement('script');
      quillJS.src = 'https://cdn.quilljs.com/1.3.6/quill.min.js';
      document.head.appendChild(quillJS);
      
      quillJS.onload = () => initQuillForQnAInline();
      return;
    } else {
      initQuillForQnAInline();
    }
    
    function initQuillForQnAInline() {
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255, 255, 255, 0.5);backdrop-filter:blur(2px);display:flex;justify-content:center;align-items:center;z-index:10000';
      
      const container = document.createElement('div');
      container.style.cssText = 'background:white;border-radius:8px;padding:20px;width:80vw;max-width:800px;min-width:400px;box-shadow:0 3px 6px rgba(0,0,0,0.1)';
      
      const header = document.createElement('div');
      header.style.cssText = 'margin-bottom:16px;padding-bottom:12px';
      header.innerHTML = '<h2 style="margin:0;font-size:1.25rem;font-weight:600">Frage Antwort</h2>';
      
      const toolbar = document.createElement('div');
      toolbar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:8px;background:#f8fafc;border-radius:4px';
      
      const questionText = document.createElement('div');
      const hasExistingQuestion = element.questionId;
      questionText.textContent = hasExistingQuestion ? getQuestionText() : 'No question selected';
      questionText.style.cssText = 'font-size:0.875rem;color:#374151;font-weight:500;flex:1';
      
      const insertQuestionBtn = document.createElement('button');
      insertQuestionBtn.textContent = hasExistingQuestion ? 'Change Question' : 'Insert Question';
      insertQuestionBtn.style.cssText = 'padding:6px 12px;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:white;font-size:0.875rem';
      insertQuestionBtn.onmouseover = () => insertQuestionBtn.style.background = '#f1f5f9';
      insertQuestionBtn.onmouseout = () => insertQuestionBtn.style.background = 'white';
      insertQuestionBtn.onclick = () => {
        window.dispatchEvent(new CustomEvent('openQuestionDialog', {
          detail: { elementId: element.id }
        }));
      };
      
      toolbar.appendChild(questionText);
      toolbar.appendChild(insertQuestionBtn);
      
      const editorContainer = document.createElement('div');
      editorContainer.style.cssText = 'min-height:90px;margin-bottom:0px;border:1px solid #e2e8f0;border-radius:4px';
      
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding:4px 16px;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:white;font-size:0.875rem';
      cancelBtn.onmouseover = () => cancelBtn.style.background = '#f1f5f9';
      cancelBtn.onmouseout = () => cancelBtn.style.background = 'white';
      
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.style.cssText = 'padding:8px 16px;border:none;border-radius:6px;background:#304050;color:white;cursor:pointer;font-size:0.875rem';
      saveBtn.onmouseover = () => saveBtn.style.background = '#303a50e6';
      saveBtn.onmouseout = () => saveBtn.style.background = '#304050';
      
      let closeModal = () => {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
        stage.draw();
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
      
      setTimeout(() => {
        const quill = new window.Quill(editorContainer, {
          theme: 'snow'
        });
        
        // Hide toolbar and style container with fixed height
        const style = document.createElement('style');
        style.textContent = `
          .ql-toolbar { display: none !important; }
          .ql-container { 
            border: 2px solid #3b82f6 !important; 
            border-radius: 4px;
            height: 144px !important;
          }
          .ql-container.ql-disabled {
            border: 1px solid #e5e7eb !important;
          }
          .ql-editor {
            height: 144px !important;
            overflow-y: auto !important;
            line-height: 24px !important;
          }
        `;
        document.head.appendChild(style);
        
        // Load existing answer content
        const assignedUser = state.pageAssignments[state.activePageIndex + 1];
        let contentToLoad = '';
        
        if (element.questionId && assignedUser) {
          contentToLoad = state.tempAnswers[element.questionId]?.[assignedUser.id]?.text || element.formattedText || element.text || '';
        } else {
          contentToLoad = element.formattedText || element.text || '';
        }
        
        if (contentToLoad) {
          if (contentToLoad.includes('<')) {
            quill.root.innerHTML = contentToLoad;
          } else {
            quill.setText(contentToLoad);
          }
        }
        
        // No need to protect placeholder since it's not in the editor
        
        // No need to block deletion since there's no placeholder
        
        saveBtn.onclick = () => {
          const htmlContent = quill.root.innerHTML;
          const plainText = quill.getText().trim();
          
          // Always update element text first
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: {
                text: plainText,
                formattedText: htmlContent
              }
            }
          });
          
          // Save to answer system if questionId exists
          if (element.questionId && user?.id) {
            dispatch({
              type: 'UPDATE_TEMP_ANSWER',
              payload: {
                questionId: element.questionId,
                text: plainText,
                userId: user.id,
                answerId: element.answerId || uuidv4()
              }
            });
          }
          
          closeModal();
        };
        
        // Create unique event name for this element
        const uniqueEventName = `questionSelected-${element.id}`;
        
        // Listen for question selection events specific to this element
        const handleQuestionSelected = (event: CustomEvent) => {
          const { questionId, questionText: selectedQuestionText } = event.detail;
          
          // Update button text and question display
          insertQuestionBtn.textContent = 'Change Question';
          questionText.textContent = selectedQuestionText || 'No question selected';
          
          // Update element with questionId and load question text
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: { questionId }
            }
          });
          
          // Store question text in temp questions only if it doesn't exist yet
          if (!state.tempQuestions[questionId]) {
            dispatch({
              type: 'UPDATE_TEMP_QUESTION',
              payload: {
                questionId,
                text: selectedQuestionText
              }
            });
          }
          
          // Load assigned user's answer for the new question
          if (assignedUser) {
            const existingAnswer = state.tempAnswers[questionId]?.[assignedUser.id]?.text || '';
            quill.setText(existingAnswer);
            
            // Update element text to show the answer
            dispatch({
              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
              payload: {
                id: element.id,
                updates: {
                  text: existingAnswer,
                  formattedText: existingAnswer
                }
              }
            });
          } else {
            quill.setText('');
            
            // Clear element text if no assigned user
            dispatch({
              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
              payload: {
                id: element.id,
                updates: {
                  text: '',
                  formattedText: ''
                }
              }
            });
          }
          
          // Check if user can edit after question change
          const canEdit = !assignedUser || assignedUser.id === user?.id;
          
          if (!canEdit) {
            quill.disable();
            quill.root.setAttribute('data-placeholder', `${assignedUser?.name || 'User'} can answer here`);
            quill.root.style.backgroundColor = '#f9fafb';
            quill.root.style.color = '#9ca3af';
          } else {
            quill.enable();
            quill.root.removeAttribute('data-placeholder');
            quill.root.style.backgroundColor = '';
            quill.root.style.color = '';
            quill.focus();
          }
        };
        
        window.addEventListener(uniqueEventName, handleQuestionSelected);
        
        // Cleanup function to remove the event listener when modal closes
        const originalCloseModal = closeModal;
        closeModal = () => {
          window.removeEventListener(uniqueEventName, handleQuestionSelected);
          originalCloseModal();
        };
        
        // Update cancel button to use new closeModal
        cancelBtn.onclick = closeModal;
        

        

        
        // Handle paste to insert unformatted text
        quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
          const plaintext = node.innerText || node.textContent || '';
          const Delta = window.Quill.import('delta');
          return new Delta().insert(plaintext);
        });
        
        // Check if user can edit
        const canEdit = !assignedUser || assignedUser.id === user?.id;
        
        if (!canEdit) {
          quill.disable();
          quill.root.setAttribute('data-placeholder', `${assignedUser?.name || 'User'} can answer here`);
          quill.root.style.backgroundColor = '#f9fafb';
          quill.root.style.color = '#9ca3af';
        } else if (!hasExistingQuestion) {
          quill.disable();
          quill.root.setAttribute('data-placeholder', 'Add a question');
          quill.root.style.backgroundColor = '#f9fafb';
          quill.root.style.color = '#9ca3af';
        } else {
          quill.focus();
        }
        
        // Block keyboard events from reaching canvas
        modal.addEventListener('keydown', (e: KeyboardEvent) => {
          e.stopPropagation();
          if (e.key === 'Escape') closeModal();
        }, true);
        modal.addEventListener('keyup', (e: KeyboardEvent) => {
          e.stopPropagation();
        }, true);
      }, 100);
    }
  };

  return (
    <>
      <BaseCanvasItem 
        {...props} 
        onSelect={(e) => {
          // Handle right-click to exit Style Painter mode
          if (e?.evt?.button === 2 && state.stylePainterActive) {
            e.evt.preventDefault();
            dispatch({ type: 'TOGGLE_STYLE_PAINTER' });
            return;
          }
          // Call original onSelect if provided
          if (props.onSelect) {
            props.onSelect(e);
          }
        }}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTransformStart={() => setIsResizing(true)}
        onTransformEnd={() => setIsResizing(false)}
      >
        <Group 
          key={refreshKey}
          onContextMenu={(e) => {
            if (state.stylePainterActive) {
              e.evt.preventDefault();
              e.evt.stopPropagation();
              dispatch({ type: 'TOGGLE_STYLE_PAINTER' });
            }
          }}
        >
          {/* Background and Border */}
          {(() => {
            // Get default settings from tool defaults if not present
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            const pageTheme = currentPage?.background?.pageTheme;
            const bookTheme = state.currentBook?.bookTheme;
            const qnaInlineDefaults = getToolDefaults('qna_inline', pageTheme, bookTheme);
            
            const questionStyle = {
              ...qnaInlineDefaults.questionSettings,
              ...element.questionSettings
            };
            const answerStyle = {
              ...qnaInlineDefaults.answerSettings,
              ...element.answerSettings
            };
            const showBackground = questionStyle.backgroundEnabled || answerStyle.backgroundEnabled;
            const showBorder = questionStyle.borderEnabled || answerStyle.borderEnabled;
            const cornerRadius = questionStyle.cornerRadius || answerStyle.cornerRadius || 0;
            
            if (showBackground || showBorder) {
              const theme = questionStyle.borderTheme || answerStyle.borderTheme || 'default';
              
              if (theme === 'rough' && showBorder) {
                // Use rough.js for border
                const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                const rc = rough.svg(svg);
                
                try {
                  const borderColor = questionStyle.borderColor || answerStyle.borderColor || '#000000';
                  const borderWidth = questionStyle.borderWidth || answerStyle.borderWidth || 1;
                  const borderOpacity = questionStyle.borderOpacity || answerStyle.borderOpacity || 1;
                  const backgroundColor = showBackground ? (questionStyle.backgroundColor || answerStyle.backgroundColor || 'transparent') : 'transparent';
                  const backgroundOpacity = showBackground ? (questionStyle.backgroundOpacity ?? answerStyle.backgroundOpacity ?? 1) : 0;
                  
                  const roughRect = rc.rectangle(0, 0, element.width, element.height, {
                    roughness: 2,
                    strokeWidth: borderWidth,
                    stroke: borderColor,
                    fill: backgroundColor !== 'transparent' ? backgroundColor : undefined,
                    fillStyle: 'solid',
                    seed: seed
                  });
                  
                  const paths = roughRect.querySelectorAll('path');
                  let combinedPath = '';
                  paths.forEach(path => {
                    const d = path.getAttribute('d');
                    if (d) combinedPath += d + ' ';
                  });
                  
                  if (combinedPath) {
                    return (
                      <Path
                        data={combinedPath.trim()}
                        stroke={borderColor}
                        strokeWidth={borderWidth}
                        strokeOpacity={borderOpacity}
                        fill={backgroundColor !== 'transparent' ? backgroundColor : undefined}
                        opacity={backgroundColor !== 'transparent' ? backgroundOpacity : 0}
                        listening={false}
                      />
                    );
                  }
                } catch (error) {
                  // Fallback to regular rect
                }
              }
              
              const backgroundColor = showBackground ? (questionStyle.backgroundColor || answerStyle.backgroundColor || 'transparent') : 'transparent';
              const backgroundOpacity = showBackground ? (questionStyle.backgroundOpacity ?? answerStyle.backgroundOpacity ?? 1) : 0;
              
              return (
                <Rect
                  width={element.width}
                  height={element.height}
                  fill={backgroundColor !== 'transparent' ? backgroundColor : 'transparent'}
                  opacity={backgroundColor !== 'transparent' ? backgroundOpacity : 0}
                  stroke={showBorder ? (questionStyle.borderColor || answerStyle.borderColor || '#000000') : 'transparent'}
                  strokeWidth={showBorder ? (questionStyle.borderWidth || answerStyle.borderWidth || 1) : 0}
                  strokeOpacity={showBorder ? (questionStyle.borderOpacity || answerStyle.borderOpacity || 1) : 0}
                  cornerRadius={cornerRadius}
                  listening={false}
                />
              );
            }
            return null;
          })()}
          
          {/* Ruled lines */}
          {!isResizing && (
            <Group>
              {generateRuledLines()}
            </Group>
          )}
          
          {/* Show skeleton during resize, otherwise show text content */}
          {isResizing ? (
            <KonvaSkeleton width={element.width} height={element.height} />
          ) : (() => {
            // Get default settings from tool defaults if not present
            const currentPage = state.currentBook?.pages[state.activePageIndex];
            const pageTheme = currentPage?.background?.pageTheme;
            const bookTheme = state.currentBook?.bookTheme;
            const qnaInlineDefaults = getToolDefaults('qna_inline', pageTheme, bookTheme);
            
            const questionStyle = {
              ...qnaInlineDefaults.questionSettings,
              ...element.questionSettings
            };
            const answerStyle = {
              ...qnaInlineDefaults.answerSettings,
              ...element.answerSettings
            };
            const padding = questionStyle.padding || answerStyle.padding || element.format?.padding || element.padding || 4;
            const textWidth = element.width - (padding * 2);
            const questionText = getQuestionText();
            const userText = getUserText();
            
            // Get alignment settings
            const questionAlign = questionStyle.align || 'left';
            const answerAlign = answerStyle.align || 'left';
            
            // Get layout variant
            const layoutVariant = element.layoutVariant || 'inline';
            const questionPosition = element.questionPosition || 'left';
            
            if (!questionText && !userText) {
              return (
                <Text
                  ref={textRef}
                  x={padding}
                  y={padding}
                  width={textWidth}
                  text="Double-click to add text..."
                  fontSize={Math.max(fontSize * 1, 54)}
                  fontFamily={fontFamily}
                  fill="#9ca3af"
                  opacity={0.7}
                  align="left"
                  verticalAlign="top"
                  wrap="word"
                  lineHeight={1.2}
                  listening={true}
                />
              );
            }

            
            let currentY = padding;
            const elements = [];
            
            // Calculate baseline alignment for question and user text
            const qFontSize = questionStyle.fontSize || fontSize;
            const aFontSize = answerStyle.fontSize || fontSize;
            const maxFontSize = Math.max(qFontSize, aFontSize);
            const baselineY = currentY + maxFontSize * 0.8; // Baseline position
            
            // Get paragraph spacing settings
            const qParagraphSpacing = questionStyle.paragraphSpacing || 'small';
            const aParagraphSpacing = answerStyle.paragraphSpacing || 'small';
            
            // Calculate line heights based on paragraph spacing
            const getLineHeightMultiplier = (spacing: string) => {
              switch (spacing) {
                case 'small': return 1.0;
                case 'medium': return 1.2;
                case 'large': return 1.5;
                default: return 1.0;
              }
            };
            
            const qLineHeight = qFontSize * getLineHeightMultiplier(qParagraphSpacing);
            const aLineHeight = aFontSize * getLineHeightMultiplier(aParagraphSpacing);
            
            // Text baseline offset to float above ruled lines - accounts for font size and paragraph spacing
            const maxFontSizeUsed = Math.max(qFontSize, aFontSize);
            const maxLineHeightMultiplier = Math.max(getLineHeightMultiplier(qParagraphSpacing), getLineHeightMultiplier(aParagraphSpacing));
            const factor = aFontSize >= 50 ? aFontSize >= 96 ? aFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1;
            const textBaselineOffset = -(maxFontSizeUsed * maxLineHeightMultiplier * 0.15) + (maxFontSizeUsed * factor); 
            
            // Render based on layout variant
            if (layoutVariant === 'block') {
              // Block layout: question and answer in separate areas
              const qFontFamily = questionStyle.fontFamily || fontFamily;
              const qFontColor = questionStyle.fontColor || '#666666';
              const qFontBold = questionStyle.fontBold || false;
              const qFontItalic = questionStyle.fontItalic || false;
              const qFontOpacity = questionStyle.fontOpacity ?? 1;
              
              const aFontFamily = answerStyle.fontFamily || fontFamily;
              const aFontColor = answerStyle.fontColor || '#1f2937';
              const aFontBold = answerStyle.fontBold || false;
              const aFontItalic = answerStyle.fontItalic || false;
              const aFontOpacity = answerStyle.fontOpacity ?? 1;
              
              let questionArea = { x: padding, y: padding, width: textWidth, height: element.height - padding * 2 };
              let answerArea = { x: padding, y: padding, width: textWidth, height: element.height - padding * 2 };
              
              // Calculate areas based on position
              if (questionPosition === 'left' || questionPosition === 'right') {
                const questionWidth = element.width * 0.3;
                const answerWidth = element.width - questionWidth - padding * 3;
                
                if (questionPosition === 'left') {
                  questionArea = { x: padding, y: padding, width: questionWidth, height: element.height - padding * 2 };
                  answerArea = { x: questionWidth + padding * 2, y: padding, width: answerWidth, height: element.height - padding * 2 };
                } else {
                  answerArea = { x: padding, y: padding, width: answerWidth, height: element.height - padding * 2 };
                  questionArea = { x: answerWidth + padding * 2, y: padding, width: questionWidth, height: element.height - padding * 2 };
                }
              } else {
                const questionHeight = element.height * 0.3;
                const answerHeight = element.height - questionHeight - padding * 3;
                
                if (questionPosition === 'top') {
                  questionArea = { x: padding, y: padding, width: textWidth, height: questionHeight };
                  answerArea = { x: padding, y: questionHeight + padding * 2, width: textWidth, height: answerHeight };
                } else {
                  answerArea = { x: padding, y: padding, width: textWidth, height: answerHeight };
                  questionArea = { x: padding, y: answerHeight + padding * 2, width: textWidth, height: questionHeight };
                }
              }
              
              // Render question in its area
              if (questionText) {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                context.font = `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic ' : ''}${qFontSize}px ${qFontFamily}`;
                
                const words = questionText.split(' ');
                let currentLine = '';
                let currentY = questionArea.y;
                
                words.forEach((word, index) => {
                  const testLine = currentLine ? currentLine + ' ' + word : word;
                  const testWidth = context.measureText(testLine).width;
                  
                  if (testWidth > questionArea.width && currentLine) {
                    elements.push(
                      <Text
                        key={`q-${currentY}`}
                        x={questionArea.x}
                        y={currentY}
                        text={currentLine}
                        fontSize={qFontSize}
                        fontFamily={qFontFamily}
                        fontStyle={`${qFontBold ? 'bold' : ''} ${qFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                        fill={qFontColor}
                        opacity={qFontOpacity}
                        align={questionAlign}
                        width={questionArea.width}
                        listening={false}
                      />
                    );
                    currentLine = word;
                    currentY += qLineHeight;
                  } else {
                    currentLine = testLine;
                  }
                });
                
                if (currentLine) {
                  elements.push(
                    <Text
                      key={`q-${currentY}`}
                      x={questionArea.x}
                      y={currentY}
                      text={currentLine}
                      fontSize={qFontSize}
                      fontFamily={qFontFamily}
                      fontStyle={`${qFontBold ? 'bold' : ''} ${qFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                      fill={qFontColor}
                      opacity={qFontOpacity}
                      align={questionAlign}
                      width={questionArea.width}
                      listening={false}
                    />
                  );
                }
              }
              
              // Render answer in its area
              if (userText) {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                context.font = `${aFontBold ? 'bold ' : ''}${aFontItalic ? 'italic ' : ''}${aFontSize}px ${aFontFamily}`;
                
                const lines = userText.split('\n');
                let currentY = answerArea.y;
                
                lines.forEach((line) => {
                  if (!line.trim()) {
                    currentY += aLineHeight;
                    return;
                  }
                  
                  const words = line.split(' ');
                  let currentLine = '';
                  
                  words.forEach((word) => {
                    const testLine = currentLine ? currentLine + ' ' + word : word;
                    const testWidth = context.measureText(testLine).width;
                    
                    if (testWidth > answerArea.width && currentLine) {
                      elements.push(
                        <Text
                          key={`a-${currentY}`}
                          x={answerArea.x}
                          y={currentY}
                          text={currentLine}
                          fontSize={aFontSize}
                          fontFamily={aFontFamily}
                          fontStyle={`${aFontBold ? 'bold' : ''} ${aFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                          fill={aFontColor}
                          opacity={aFontOpacity}
                          align={answerAlign}
                          width={answerArea.width}
                          listening={false}
                        />
                      );
                      currentLine = word;
                      currentY += aLineHeight;
                    } else {
                      currentLine = testLine;
                    }
                  });
                  
                  if (currentLine) {
                    elements.push(
                      <Text
                        key={`a-${currentY}`}
                        x={answerArea.x}
                        y={currentY}
                        text={currentLine}
                        fontSize={aFontSize}
                        fontFamily={aFontFamily}
                        fontStyle={`${aFontBold ? 'bold' : ''} ${aFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                        fill={aFontColor}
                        opacity={aFontOpacity}
                        align={answerAlign}
                        width={answerArea.width}
                        listening={false}
                      />
                    );
                    currentY += aLineHeight;
                  }
                });
              }
            } else {
              // Inline layout: original implementation
              // Render question text first
              if (questionText) {
              const qFontFamily = questionStyle.fontFamily || fontFamily;
              const qFontColor = questionStyle.fontColor || '#666666';
              const qFontBold = questionStyle.fontBold || false;
              const qFontItalic = questionStyle.fontItalic || false;
              const qFontOpacity = questionStyle.fontOpacity ?? 1;
              
              // Calculate question text width and handle wrapping
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d')!;
              context.font = `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic ' : ''}${qFontSize}px ${qFontFamily}`;
              
              const questionWords = questionText.split(' ');
              let questionLines = [];
              let currentLine = '';
              let currentLineWidth = 0;
              
              // Build question lines
              for (const word of questionWords) {
                const wordWithSpace = currentLine ? ' ' + word : word;
                const wordWidth = context.measureText(wordWithSpace).width;
                
                if (currentLineWidth + wordWidth <= textWidth) {
                  currentLine += wordWithSpace;
                  currentLineWidth += wordWidth;
                } else {
                  if (currentLine) questionLines.push(currentLine);
                  currentLine = word;
                  currentLineWidth = context.measureText(word).width;
                }
              }
              if (currentLine) questionLines.push(currentLine);
              
              // Render question lines with alignment
              questionLines.forEach((line, index) => {
                let xPos = padding;
                if (questionAlign === 'center') {
                  xPos = element.width / 2;
                } else if (questionAlign === 'right') {
                  xPos = element.width - padding;
                }
                
                elements.push(
                  <Text
                    key={`question-${index}`}
                    x={questionAlign === 'left' ? xPos : padding}
                    y={baselineY - qFontSize * 0.8 + (index * qLineHeight) + textBaselineOffset}
                    text={line}
                    fontSize={qFontSize}
                    fontFamily={qFontFamily}
                    fontStyle={`${qFontBold ? 'bold' : ''} ${qFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                    fill={qFontColor}
                    opacity={qFontOpacity}
                    align={questionAlign}
                    width={textWidth}
                    listening={false}
                  />
                );
              });
              
              // Calculate where question ends for user text positioning
              const lastQuestionLine = questionLines[questionLines.length - 1] || '';
              const questionTextWidth = context.measureText(lastQuestionLine).width;
              const questionEndY = baselineY - qFontSize * 0.8 + ((questionLines.length - 1) * qLineHeight);
              
              // Render user text with custom wrapping logic
              if (userText) {
                const aFontFamily = answerStyle.fontFamily || fontFamily;
                const aFontColor = answerStyle.fontColor || '#1f2937';
                const aFontBold = answerStyle.fontBold || false;
                const aFontItalic = answerStyle.fontItalic || false;
                const aFontOpacity = answerStyle.fontOpacity ?? 1;
                
                context.font = `${aFontBold ? 'bold ' : ''}${aFontItalic ? 'italic ' : ''}${aFontSize}px ${aFontFamily}`;
                
                // Handle line breaks in user text first
                const userLines = userText.split('\n');
                let currentLineY = questionEndY;
                let isFirstLine = true;
                
                userLines.forEach((line) => {
                  if (!line.trim() && !isFirstLine) {
                    currentLineY += aLineHeight;
                    return;
                  }
                  
                  const words = line.split(' ');
                  let wordIndex = 0;
                  
                  while (wordIndex < words.length) {
                    let lineText = '';
                    let lineWidth = 0;
                    let currentX = padding;
                    let availableWidth = textWidth;
                    
                    // For first line only, start after question
                    if (isFirstLine) {
                      const gap = 40;
                      currentX = padding + questionTextWidth + gap;
                      availableWidth = textWidth - questionTextWidth - gap;
                    }
                    
                    // Build line with as many words as fit
                    while (wordIndex < words.length) {
                      const word = words[wordIndex];
                      const wordWithSpace = lineText ? ' ' + word : word;
                      const wordWidth = context.measureText(wordWithSpace).width;
                      
                      if (lineWidth + wordWidth <= availableWidth) {
                        lineText += wordWithSpace;
                        lineWidth += wordWidth;
                        wordIndex++;
                      } else {
                        break;
                      }
                    }
                    
                    // Render the line with alignment
                    if (lineText) {
                      let finalX = currentX;
                      let textAlign = 'left';
                      
                      if (!isFirstLine && answerAlign !== 'left') {
                        if (answerAlign === 'center') {
                          finalX = element.width / 2;
                          textAlign = 'center';
                        } else if (answerAlign === 'right') {
                          finalX = element.width - padding;
                          textAlign = 'right';
                        }
                      }
                      
                      elements.push(
                        <Text
                          key={`user-line-${currentLineY}-${currentX}`}
                          x={isFirstLine ? finalX : padding}
                          y={currentLineY + (qFontSize - aFontSize) * 0.8 + textBaselineOffset}
                          text={lineText}
                          fontSize={aFontSize}
                          fontFamily={aFontFamily}
                          fontStyle={`${aFontBold ? 'bold' : ''} ${aFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                          fill={aFontColor}
                          opacity={aFontOpacity}
                          align={isFirstLine ? 'left' : textAlign}
                          width={isFirstLine ? undefined : textWidth}
                          listening={false}
                        />
                      );
                    }
                    
                    // Move to next line
                    currentLineY += aLineHeight;
                    isFirstLine = false;
                  }
                });
              }
            } else if (userText) {
              // Only user text, no question - handle line breaks manually
              const aFontFamily = answerStyle.fontFamily || fontFamily;
              const aFontColor = answerStyle.fontColor || '#1f2937';
              const aFontBold = answerStyle.fontBold || false;
              const aFontItalic = answerStyle.fontItalic || false;
              const aFontOpacity = answerStyle.fontOpacity ?? 1;
              
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d')!;
              context.font = `${aFontBold ? 'bold ' : ''}${aFontItalic ? 'italic ' : ''}${aFontSize}px ${aFontFamily}`;
              
              const lines = userText.split('\n');
              let currentLineIndex = 0;
              
              lines.forEach((line) => {
                if (!line.trim()) {
                  // Empty line - just increment line index
                  currentLineIndex++;
                  return;
                }
                
                const words = line.split(' ');
                let currentLine = '';
                let currentLineWidth = 0;
                
                words.forEach((word) => {
                  const wordWithSpace = currentLine ? ' ' + word : word;
                  const wordWidth = context.measureText(wordWithSpace).width;
                  
                  if (currentLineWidth + wordWidth <= textWidth) {
                    currentLine += wordWithSpace;
                    currentLineWidth += wordWidth;
                  } else {
                    if (currentLine) {
                      let xPos = padding;
                      if (answerAlign === 'center') {
                        xPos = element.width / 2;
                      } else if (answerAlign === 'right') {
                        xPos = element.width - padding;
                      }
                      
                      elements.push(
                        <Text
                          key={`user-line-${currentLineIndex}`}
                          x={padding}
                          y={baselineY - aFontSize * 0.8 + (currentLineIndex * aFontSize * 1.2)}
                          text={currentLine}
                          fontSize={aFontSize}
                          fontFamily={aFontFamily}
                          fontStyle={`${aFontBold ? 'bold' : ''} ${aFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                          fill={aFontColor}
                          opacity={aFontOpacity}
                          align={answerAlign}
                          width={textWidth}
                          listening={false}
                        />
                      );
                      currentLineIndex++;
                    }
                    currentLine = word;
                    currentLineWidth = context.measureText(word).width;
                  }
                });
                
                if (currentLine) {
                  let xPos = padding;
                  if (answerAlign === 'center') {
                    xPos = element.width / 2;
                  } else if (answerAlign === 'right') {
                    xPos = element.width - padding;
                  }
                  
                  elements.push(
                    <Text
                      key={`user-line-${currentLineIndex}`}
                      x={padding}
                      y={baselineY - aFontSize * 0.8 + (currentLineIndex * aFontSize * 1.2)}
                      text={currentLine}
                      fontSize={aFontSize}
                      fontFamily={aFontFamily}
                      fontStyle={`${aFontBold ? 'bold' : ''} ${aFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                      fill={aFontColor}
                      opacity={aFontOpacity}
                      align={answerAlign}
                      width={textWidth}
                      listening={false}
                    />
                  );
                  currentLineIndex++;
                }
              });
            }
            } // End of inline layout
            
            // Add invisible overlay for double-click detection
            elements.push(
              <Rect
                key="overlay"
                ref={textRef}
                x={0}
                y={0}
                width={element.width}
                height={element.height}
                fill="transparent"
                listening={true}
              />
            );
            
            return elements;
          })()}
        </Group>
      </BaseCanvasItem>
      

    </>
  );
}