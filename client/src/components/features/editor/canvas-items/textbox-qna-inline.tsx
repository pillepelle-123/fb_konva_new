import { useRef, useState, useEffect, useMemo } from 'react';
import { Text, Rect, Group } from 'react-konva';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import type { CanvasElement } from '../../../../context/editor-context';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { getParagraphSpacing, getPadding } from '../../../../utils/format-utils';


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
        const { getToolDefaults } = require('../../../utils/tool-defaults');
        const toolDefaults = getToolDefaults('text', pageTheme, bookTheme);
        size = toolDefaults.fontSize;
      }
    }
    return size || 58;
  })();
  
  const fontFamily = element.font?.fontFamily || element.fontFamily || 'Arial, sans-serif';
  
  const getQuestionText = () => {
    if (!element.questionId) return '';
    return state.tempQuestions[element.questionId] || 'Loading question...';
  };

  const getUserText = () => {
    let text = element.formattedText || element.text || '';
    // Strip HTML tags for display
    if (text.includes('<')) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      text = tempDiv.textContent || tempDiv.innerText || '';
    }
    return text;
  };

  const getDisplayText = () => {
    const questionText = getQuestionText();
    const userText = getUserText();
    
    if (!questionText && !userText) {
      return 'Double-click to add text...';
    }
    
    return questionText + userText;
  };

  const displayText = useMemo(() => getDisplayText(), [element.text, element.formattedText, element.questionId, state.tempQuestions]);

  const handleDoubleClick = () => {
    if (state.activeTool !== 'select') return;
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
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(2px);display:flex;justify-content:center;align-items:center;z-index:10000';
      
      const container = document.createElement('div');
      container.style.cssText = 'background:white;border-radius:8px;padding:20px;width:80vw;max-width:800px;min-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.3)';
      
      const header = document.createElement('div');
      header.style.cssText = 'margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e2e8f0';
      header.innerHTML = '<h2 style="margin:0;font-size:1.25rem;font-weight:600">Text Editor</h2>';
      
      const toolbar = document.createElement('div');
      toolbar.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;padding:8px;background:#f8fafc;border-radius:4px';
      
      const insertQuestionBtn = document.createElement('button');
      const hasExistingQuestion = element.questionId;
      insertQuestionBtn.textContent = hasExistingQuestion ? 'Change Question' : 'Insert Question';
      insertQuestionBtn.style.cssText = 'padding:6px 12px;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;background:white;font-size:0.875rem';
      insertQuestionBtn.onmouseover = () => insertQuestionBtn.style.background = '#f1f5f9';
      insertQuestionBtn.onmouseout = () => insertQuestionBtn.style.background = 'white';
      insertQuestionBtn.onclick = () => {
        window.dispatchEvent(new CustomEvent('openQuestionDialog'));
      };
      
      toolbar.appendChild(insertQuestionBtn);
      
      const editorContainer = document.createElement('div');
      editorContainer.style.cssText = 'min-height:200px;margin-bottom:12px;border:1px solid #e2e8f0;border-radius:4px';
      
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px';
      
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
          theme: 'snow',
          formats: ['bold', 'italic', 'underline', 'color', 'font', 'header', 'size'],
          modules: {
            toolbar: [
              [{ 'header': [1, 2, 3, false] }],
              [{ 'size': ['small', false, 'large', 'huge'] }],
              ['bold', 'italic', 'underline'],
              [{ 'color': ['#000000', '#e60000', '#ff9900', '#ffff00', '#008a00', '#0066cc', '#9933ff'] }],
              [{ 'font': ['helvetica', 'georgia', 'arial', 'courier', 'kalam', 'shadows', 'playwrite', 'msmadi', 'giveyouglory', 'meowscript'] }]
            ]
          }
        });
        
        // Load existing user content only (no question placeholder)
        let contentToLoad = element.formattedText || element.text || '';
        
        if (contentToLoad) {
          if (element.formattedText && contentToLoad.includes('<')) {
            quill.root.innerHTML = contentToLoad;
          } else {
            quill.setText(contentToLoad);
          }
        }
        
        // No need to protect placeholder since it's not in the editor
        
        // No need to block deletion since there's no placeholder
        
        saveBtn.onclick = () => {
          const htmlContent = quill.root.innerHTML;
          const plainText = quill.getText();
          
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
          
          closeModal();
        };
        
        // Listen for question selection events
        const handleQuestionSelected = (event: CustomEvent) => {
          const { questionId, questionText } = event.detail;
          
          // Update button text
          insertQuestionBtn.textContent = 'Change Question';
          
          // Update element with questionId and load question text
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: { questionId }
            }
          });
          
          // Store question text in temp questions
          dispatch({
            type: 'UPDATE_TEMP_QUESTION',
            payload: {
              questionId,
              text: questionText
            }
          });
        };
        
        window.addEventListener('questionSelected', handleQuestionSelected);
        

        

        
        quill.focus();
        
        modal.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Escape') closeModal();
        });
      }, 100);
    }
  };

  return (
    <>
      <BaseCanvasItem 
        {...props} 
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Group>
          {/* Text content */}
          {(() => {
            const padding = element.format?.padding || element.padding || 4;
            const textWidth = element.width - (padding * 2);
            const questionText = getQuestionText();
            const userText = getUserText();
            
            if (!questionText && !userText) {
              return (
                <Text
                  ref={textRef}
                  x={padding}
                  y={padding}
                  width={textWidth}
                  text="Double-click to add text..."
                  fontSize={fontSize}
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
            
            const questionStyle = element.questionSettings || {};
            const answerStyle = element.answerSettings || {};
            
            let currentY = padding;
            const elements = [];
            
            // Calculate baseline alignment for question and user text
            const qFontSize = questionStyle.fontSize || fontSize;
            const aFontSize = answerStyle.fontSize || fontSize;
            const maxFontSize = Math.max(qFontSize, aFontSize);
            const baselineY = currentY + maxFontSize * 0.8; // Baseline position
            
            // Render question text first
            if (questionText) {
              const qFontFamily = questionStyle.fontFamily || fontFamily;
              const qFontColor = questionStyle.fontColor || '#666666';
              const qFontBold = questionStyle.fontBold || false;
              const qFontItalic = questionStyle.fontItalic || false;
              
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
              
              // Render question lines
              questionLines.forEach((line, index) => {
                elements.push(
                  <Text
                    key={`question-${index}`}
                    x={padding}
                    y={baselineY - qFontSize * 0.8 + (index * qFontSize * 1.2)}
                    text={line}
                    fontSize={qFontSize}
                    fontFamily={qFontFamily}
                    fontStyle={`${qFontBold ? 'bold' : ''} ${qFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                    fill={qFontColor}
                    opacity={questionStyle.fontOpacity || 1}
                    listening={false}
                  />
                );
              });
              
              // Calculate where question ends for user text positioning
              const lastQuestionLine = questionLines[questionLines.length - 1] || '';
              const questionTextWidth = context.measureText(lastQuestionLine).width;
              const questionEndY = baselineY - qFontSize * 0.8 + ((questionLines.length - 1) * qFontSize * 1.2);
              
              // Render user text with custom wrapping logic
              if (userText) {
                const aFontFamily = answerStyle.fontFamily || fontFamily;
                const aFontColor = answerStyle.fontColor || '#1f2937';
                const aFontBold = answerStyle.fontBold || false;
                const aFontItalic = answerStyle.fontItalic || false;
                
                context.font = `${aFontBold ? 'bold ' : ''}${aFontItalic ? 'italic ' : ''}${aFontSize}px ${aFontFamily}`;
                
                // Calculate where question ends and how much space is left
                const gap = 40; // Small gap between question and answer
                const remainingWidth = textWidth - questionTextWidth - gap;
                const words = userText.split(' ');
                let currentLineY = questionEndY;
                let currentX = padding + questionTextWidth + gap;
                let availableWidth = remainingWidth;
                let wordIndex = 0;
                
                while (wordIndex < words.length) {
                  let lineText = '';
                  let lineWidth = 0;
                  
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
                  
                  // Render the line with proper baseline alignment
                  if (lineText) {
                    elements.push(
                      <Text
                        key={`user-line-${currentLineY}`}
                        x={currentX}
                        y={currentLineY + (qFontSize - aFontSize) * 0.8}
                        text={lineText}
                        fontSize={aFontSize}
                        fontFamily={aFontFamily}
                        fontStyle={`${aFontBold ? 'bold' : ''} ${aFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                        fill={aFontColor}
                        opacity={answerStyle.fontOpacity || 1}
                        listening={false}
                      />
                    );
                  }
                  
                  // Move to next line - subsequent lines start from left edge
                  currentLineY += aFontSize * 1.2;
                  currentX = padding;
                  availableWidth = textWidth;
                }
              }
            } else if (userText) {
              // Only user text, no question
              const aFontFamily = answerStyle.fontFamily || fontFamily;
              const aFontColor = answerStyle.fontColor || '#1f2937';
              const aFontBold = answerStyle.fontBold || false;
              const aFontItalic = answerStyle.fontItalic || false;
              
              elements.push(
                <Text
                  key="user"
                  x={padding}
                  y={baselineY - aFontSize * 0.8}
                  width={textWidth}
                  text={userText}
                  fontSize={aFontSize}
                  fontFamily={aFontFamily}
                  fontStyle={`${aFontBold ? 'bold' : ''} ${aFontItalic ? 'italic' : ''}`.trim() || 'normal'}
                  fill={aFontColor}
                  opacity={answerStyle.fontOpacity || 1}
                  wrap="word"
                  lineHeight={1.2}
                  listening={false}
                />
              );
            }
            
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