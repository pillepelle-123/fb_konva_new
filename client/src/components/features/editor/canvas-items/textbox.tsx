import { useRef, useState, useEffect } from 'react';
import { Text, Rect, Path, Group } from 'react-konva';
import Konva from 'konva';
import rough from 'roughjs';
import { v4 as uuidv4 } from 'uuid';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import type { CanvasElement } from '../../../../context/editor-context';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';
import ThemedShape from './themed-shape';
import { getThemeRenderer } from '../../../../utils/themes';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';


// Rich text formatting function for Quill HTML output
function formatRichText(text: string, fontSize: number, fontFamily: string, maxWidth: number, hasRuledLines: boolean = false) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  
  const lineHeight = hasRuledLines ? fontSize * Math.max(2.5, (element.paragraphSpacing === 'small' ? 1.0 : element.paragraphSpacing === 'large' ? 3.0 : 1.5) * 1.5) : fontSize * 1.2;
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
    /* Label "Huge" */
    if (element.tagName === 'H1') {
      styles.bold = false;
      styles.fontSize = fontSize * 1.8;
    }
    /* Label "Big" */
    if (element.tagName === 'H2') {
      styles.bold = false;
      styles.fontSize = fontSize * 1.5;
    }
    /* Label "Normal" */
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
    
    // Check for Quill font classes
    const className = element.getAttribute('class');
    if (className && className.includes('ql-font-')) {
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
    
    // Add line break after block elements with proper line height
    if (['P', 'DIV', 'H1', 'H2', 'H3'].includes(element.tagName)) {
      currentX = 0;
      // Use appropriate line height based on element type
      let elementLineHeight = lineHeight;
      if (element.tagName === 'H1') {
        elementLineHeight = fontSize * 1.8 * 1.2;
      } else if (element.tagName === 'H2') {
        elementLineHeight = fontSize * 1.5 * 1.2;
      } else if (element.tagName === 'H3') {
        elementLineHeight = fontSize * 1.2 * 1.2;
      }
      // Check if element has ruled lines
      if (element.querySelector && element.querySelector('[data-ruled="true"]')) {
        elementLineHeight = fontSize * 2.5;
      }
      currentY += elementLineHeight;
    }
  };
  
  const processText = (text: string, styles: any) => {
    const words = text.split(' ');
    
    words.forEach((word, index) => {
      if (index > 0) word = ' ' + word;
      
      const currentFontSize = styles.fontSize || fontSize;
      const fontStyle = `${styles.bold ? 'bold ' : ''}${styles.italic ? 'italic ' : ''}${currentFontSize}px ${fontFamily}`;
      context.font = fontStyle;
      
      const wordWidth = context.measureText(word).width;
      
      if (currentX + wordWidth > maxWidth && currentX > 0) {
        currentX = 0;
        currentY += hasRuledLines ? (styles.fontSize || fontSize) * 2.5 : (styles.fontSize || fontSize) * 1.2;
      }
      
      textParts.push({
        text: word,
        x: currentX,
        y: currentY,
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

export default function Textbox(props: CanvasItemProps) {
  const { element } = props;
  const { state, dispatch, getQuestionText, getAnswerText } = useEditor();
  const { user } = useAuth();
  const textRef = useRef<Konva.Text>(null);

  const [hasOverflow, setHasOverflow] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Check if user is on assigned page and this is an answer textbox
  const isOnAssignedPage = state.pageAssignments[state.activePageIndex + 1]?.id === user?.id;
  const shouldHighlightAnswer = isOnAssignedPage && element.textType === 'answer';
  const shouldHighlightQuestion = isOnAssignedPage && element.textType === 'question';
  const shouldShowFlashyHover = shouldHighlightAnswer || shouldHighlightQuestion;
  


  const fontSize = (() => {
    let size = element.font?.fontSize || element.fontSize;
    // console.log('Textbox fontSize - ACTUAL VALUE USED FOR RENDERING:', {
    //   elementId: element.id,
    //   actualFontSizeUsed: size || 16,
    //   commonScaleEquivalent: Math.round((size || 16) * 12 / 50),
    //   elementFontNew: element.font?.fontSize,
    //   elementFontOld: element.fontSize
    // });
    if (!size) {
      const currentPage = state.currentBook?.pages[state.activePageIndex];
      const pageTheme = currentPage?.background?.pageTheme;
      const bookTheme = state.currentBook?.bookTheme;
      const elementTheme = element.theme;
      const activeTheme = pageTheme || bookTheme || elementTheme;
      if (activeTheme) {
        const themeDefaults = getGlobalThemeDefaults(activeTheme, element.textType || 'text');
        size = themeDefaults?.font?.fontSize;
      }
    }
    return size || 16;
  })();
  
  // Calculate lineHeight based on paragraph spacing and ruled lines
  const getLineHeight = () => {
    const spacing = element.format?.paragraphSpacing || element.paragraphSpacing || 'medium';
    
    if (element.ruledLines || (element.text && element.text.includes('data-ruled="true"'))) {
      const ruledSpacingMap = {
        small: 1.8,
        medium: 2.2,
        large: 2.8
      };
      return ruledSpacingMap[spacing as keyof typeof ruledSpacingMap];
    }
    
    const spacingMap = {
      small: 1.0,
      medium: 1.2,
      large: 1.5
    };
    
    return element.format?.lineHeight || element.lineHeight || spacingMap[spacing as keyof typeof spacingMap];
  };
  
  // Generate themed ruled lines
  const generateRuledLines = () => {
    if (!element.ruledLines || element.ruledLines?.enabled === false) return [];
    
    const lines = [];
    const padding = element.format?.padding || element.padding || 4;
    const lineSpacing = fontSize * getLineHeight(); // Use same spacing as text
    // Priority: individual setting > theme defaults > fallback
    let theme = 'rough'; // fallback
    
    // Check if element has individual setting
    if (element.ruledLines?.ruledLinesTheme || element.ruledLines?.inheritTheme || element.ruledLinesTheme) {
      theme = element.ruledLines?.ruledLinesTheme || element.ruledLines?.inheritTheme || element.ruledLinesTheme;
    } else {
      // Use theme defaults if no individual setting
      const currentPage = state.currentBook?.pages[state.activePageIndex];
      const pageTheme = currentPage?.background?.pageTheme;
      const bookTheme = state.currentBook?.bookTheme;
      const activeTheme = pageTheme || bookTheme;
      
      if (activeTheme) {
        const themeDefaults = getGlobalThemeDefaults(activeTheme, element.textType || 'text');
        theme = themeDefaults?.ruledLines?.ruledLinesTheme || themeDefaults?.ruledLines?.inheritTheme || theme;
      }
    }
    const ruledLineColor = element.ruledLines?.lineColor || element.ruledLinesColor || '#1f2937';
    const ruledLineWidth = element.ruledLinesWidth || 0.8;
    const ruledLineOpacity = element.ruledLines?.lineOpacity || element.ruledLinesOpacity || 0.5;
    
    // Generate lines from top to bottom of textbox (positioned as underlines)
    for (let y = padding + lineSpacing * 0.8; y < element.height - padding; y += lineSpacing) {
      if (theme === 'rough') {
        // Use rough.js for rough theme
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
            lines.push(
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
          lines.push(
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
        if (theme === 'candy') {
          // Use actual width for candy theme ruled lines
          lines.push(
            <Path
              key={y}
              data={`M ${padding} ${y} L ${element.width - padding} ${y}`}
              stroke={ruledLineColor}
              strokeWidth={ruledLineWidth}
              opacity={ruledLineOpacity}
              lineCap="round"
              listening={false}
            />
          );
        } else {
          // Use theme renderer for other themes
          const lineElement = {
            id: `${element.id}-line-${y}`,
            type: 'line' as const,
            width: element.width - (padding * 2),
            height: 0,
            stroke: ruledLineColor,
            strokeWidth: ruledLineWidth,
            theme: theme
          };
          
          try {
            const renderer = getThemeRenderer(theme);
            const pathData = renderer.generatePath(lineElement, 1);
            const strokeProps = renderer.getStrokeProps(lineElement, 1);
            
            if (pathData) {
              lines.push(
                <Path
                  key={y}
                  x={padding}
                  y={y}
                  data={pathData}
                  {...strokeProps}
                  stroke={ruledLineColor}
                  strokeWidth={ruledLineWidth}
                  opacity={ruledLineOpacity}
                  listening={false}
                />
              );
            }
          } catch (error) {
            lines.push(
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
        }
      }
    }
    
    return lines;
  };
  
  const lineHeight = getLineHeight();
  const align = element.format?.align || element.align || 'left';
  const fontFamily = element.font?.fontFamily || element.fontFamily || 'Arial, sans-serif';
  
  const getPlaceholderText = () => {
    if (element.textType === 'question') return 'Double-click to pose a question...';
    if (element.textType === 'qna') return 'Double-click to add questions & answers...';
    if (element.textType === 'answer') {
      // Check if linked question has a questionId set
      if (element.questionElementId) {
        const currentPage = state.currentBook?.pages[state.activePageIndex];
        if (currentPage) {
          const questionElement = currentPage.elements.find(el => el.id === element.questionElementId);
          if (!questionElement?.questionId) {
            return 'Set a question first...';
          }
        }
      } else {
        return 'Set a question first...';
      }
      return 'Double-click to answer...';
    }
    return 'Double-click to add text...';
  };

  // Process text to handle HTML content from Quill
  const getDisplayText = () => {
    let textToUse = element.formattedText || element.text;
    
    // Check for temporary question/answer text first
    if (element.textType === 'question' && element.questionId) {
      const tempText = getQuestionText(element.questionId);
      if (tempText) textToUse = tempText;
    } else if (element.textType === 'answer' && element.questionElementId) {
      // Find the linked question element to get questionId
      const currentPage = state.currentBook?.pages[state.activePageIndex];
      if (currentPage) {
        const questionElement = currentPage.elements.find(el => el.id === element.questionElementId);
        if (questionElement?.questionId) {
          // Get the assigned user for this page
          const assignedUser = state.pageAssignments[state.activePageIndex + 1];
          const userIdToShow = assignedUser?.id;
          
          if (userIdToShow) {
            const tempText = getAnswerText(questionElement.questionId, userIdToShow);
            if (tempText) {
              textToUse = tempText;
            }
          }
        }
      }
    }
    
    if (!textToUse) return getPlaceholderText();
    
    // Check if text contains HTML tags
    if (textToUse.includes('<') && textToUse.includes('>')) {
      // Convert HTML to text with line breaks preserved
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = textToUse;
      
      // Handle empty paragraphs (just <p></p> or <p><br></p>) as single newlines
      let textContent = tempDiv.innerHTML;
      textContent = textContent.replace(/<p[^>]*><\/p>/g, '\n'); // Empty paragraphs
      textContent = textContent.replace(/<p[^>]*><br[^>]*><\/p>/g, '\n'); // Paragraphs with just <br>
      textContent = textContent.replace(/<p[^>]*>/g, '').replace(/<\/p>/g, '\n');
      textContent = textContent.replace(/<br[^>]*>/g, '\n');
      
      // Remove other HTML tags and get plain text
      tempDiv.innerHTML = textContent;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      // Clean up extra newlines at start/end
      return plainText.replace(/\n+$/, '').replace(/^\n+/, '') || getPlaceholderText();
    }
    
    return textToUse;
  };

  const displayText = getDisplayText();

  // Check for text overflow and update text wrapping
  useEffect(() => {
    if (textRef.current) {
      // Always reset scale transforms to prevent text scaling
      textRef.current.scaleX(1);
      textRef.current.scaleY(1);
      
      // Force text to rewrap when width changes
      const padding = element.padding || 4;
      textRef.current.width(element.width - (padding * 2));
      
      // Force re-render to apply new width
      textRef.current.text(displayText);
      textRef.current.getLayer()?.batchDraw();
      
      // Check if text overflows the container
      const textHeight = textRef.current.height();
      const containerHeight = element.height - (padding * 2);
      setHasOverflow(textHeight > containerHeight);
    }
  }, [element.text, element.formattedText, element.width, element.height, element.paragraphSpacing, element.ruledLines, fontSize, lineHeight, displayText]);

  // Additional effect to ensure text never scales during transformations
  useEffect(() => {
    if (textRef.current && (element.textType === 'question' || element.textType === 'answer')) {
      const handleTransform = () => {
        // Immediately reset any scale applied to text nodes
        textRef.current?.scaleX(1);
        textRef.current?.scaleY(1);
      };
      
      const group = textRef.current.getParent();
      if (group) {
        group.on('transform', handleTransform);
        return () => group.off('transform', handleTransform);
      }
    }
  }, [element.textType]);

  const handleDoubleClick = () => {
    if (state.activeTool !== 'select') return;
    
    // For answer_only users, only allow double-click on answer textboxes
    if (state.editorInteractionLevel === 'answer_only' && element.textType !== 'answer') {
      return;
    }
    
    if (element.textType === 'question') {
      // Prevent authors from opening question manager
      if (state.userRole === 'author') {
        return;
      }
      
      // Open question selection dialog for question elements
      window.dispatchEvent(new CustomEvent('openQuestionModal', {
        detail: { elementId: element.id }
      }));
      return;
    }
    
    if (element.textType === 'answer') {
      // Check if current user is assigned to this page
      const assignedUser = state.pageAssignments[state.activePageIndex + 1];
      if (assignedUser && assignedUser.id !== user?.id) {
        // Not assigned to this page, prevent editing
        return;
      }
      
      // Check if linked question element has a questionId set
      if (element.questionElementId) {
        const currentPage = state.currentBook?.pages[state.activePageIndex];
        if (currentPage) {
          const questionElement = currentPage.elements.find(el => el.id === element.questionElementId);
          if (!questionElement?.questionId) {
            // No question is set yet, show alert and prevent editing
            window.dispatchEvent(new CustomEvent('showAlert', {
              detail: { 
                message: 'A question has to be set first.',
                x: element.x,
                y: element.y,
                width: element.width,
                height: element.height
              }
            }));
            return;
          }
        }
      } else {
        // No linked question element, show alert and prevent editing
        window.dispatchEvent(new CustomEvent('showAlert', {
          detail: { 
            message: 'A question has to be set first.',
            x: element.x,
            y: element.y,
            width: element.width,
            height: element.height
          }
        }));
        return;
      }
    }
    
    if (element.textType === 'qna') {
      enableQnaEditing();
      return;
    }
    
    // Enable inline editing for text and answer types
    if (element.textType === 'text' || element.textType === 'answer') {
      enableInlineEditing();
    } else {
      window.dispatchEvent(new CustomEvent('editText', {
        detail: { elementId: element.id }
      }));
    }
  };

  const enableQnaEditing = () => {
    if (!textRef.current) return;
    
    const textNode = textRef.current;
    const stage = textNode.getStage();
    if (!stage) return;
    
    textNode.hide();
    
    const textarea = document.createElement('textarea');
    const popover = document.createElement('div');
    const addQuestionBtn = document.createElement('button');
    
    document.body.appendChild(textarea);
    document.body.appendChild(popover);
    
    const transform = textNode.getAbsoluteTransform();
    const pos = transform.point({ x: element.padding || 4, y: element.padding || 4 });
    const stageBox = stage.container().getBoundingClientRect();
    const scale = transform.m[0];
    
    const areaPosition = {
      x: stageBox.left + pos.x,
      y: stageBox.top + pos.y
    };
    
    textarea.value = element.text || '';
    textarea.style.position = 'absolute';
    textarea.style.top = areaPosition.y + 'px';
    textarea.style.left = areaPosition.x + 'px';
    textarea.style.width = ((element.width - (element.padding || 4) * 2) * scale) + 'px';
    textarea.style.height = ((element.height - (element.padding || 4) * 2) * scale) + 'px';
    textarea.style.fontSize = ((fontSize) * scale) + 'px';
    textarea.style.fontFamily = fontFamily;
    textarea.style.color = element.font?.fontColor || element.fill || '#1f2937';
    textarea.style.background = 'transparent';
    textarea.style.border = '1px solid #ccc';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = lineHeight.toString();
    textarea.style.padding = '4px';
    textarea.style.borderRadius = '4px';
    textarea.placeholder = 'Type questions and answers here...';
    
    let showQuestionDialog = false;
    
    addQuestionBtn.textContent = 'Add Question';
    addQuestionBtn.style.cssText = 'padding:6px 12px;background:#0ea5e9;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;pointer-events:auto';
    addQuestionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showQuestionDialog = true;
      window.dispatchEvent(new CustomEvent('openQuestionModal', {
        detail: { elementId: element.id }
      }));
    });
    
    popover.appendChild(addQuestionBtn);
    popover.style.cssText = `position:absolute;top:${areaPosition.y - 40}px;left:${areaPosition.x}px;background:white;border:1px solid #ccc;border-radius:4px;padding:4px;box-shadow:0 2px 8px rgba(0,0,0,0.1);z-index:10000;pointer-events:auto`;
    
    textarea.focus();
    textarea.select();
    
    let removeElements = () => {
      document.body.removeChild(textarea);
      document.body.removeChild(popover);
      textNode.show();
      stage.draw();
    };
    
    const originalKeydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        removeElements();
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        dispatch({
          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
          payload: {
            id: element.id,
            updates: { text: textarea.value }
          }
        });
        removeElements();
      }
    };
    
    textarea.addEventListener('keydown', originalKeydownHandler);
    
    textarea.addEventListener('blur', (e) => {
      setTimeout(() => {
        if (!showQuestionDialog && !popover.contains(document.activeElement)) {
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: { text: textarea.value }
            }
          });
          removeElements();
        }
      }, 100);
    });
    
    // Listen for question insertion
    const handleInsertQuestion = (event: CustomEvent) => {
      const { questionId, questionText } = event.detail;
      const cursorPos = textarea.selectionStart;
      const textBefore = textarea.value.substring(0, cursorPos);
      const textAfter = textarea.value.substring(textarea.selectionEnd);
      textarea.value = textBefore + `\n\n[QUESTION: ${questionText}]\n[ANSWER:]\n` + textAfter;
      textarea.focus();
      const newCursorPos = cursorPos + questionText.length + 21; // Position after [ANSWER:]
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    };
    
    // Prevent editing of question text in brackets
    textarea.addEventListener('keydown', (e) => {
      const cursorPos = textarea.selectionStart;
      const text = textarea.value;
      
      // Find if cursor is within a [QUESTION: ...] block
      const beforeCursor = text.substring(0, cursorPos);
      const afterCursor = text.substring(cursorPos);
      
      const lastQuestionStart = beforeCursor.lastIndexOf('[QUESTION:');
      const lastQuestionEnd = beforeCursor.lastIndexOf(']');
      const nextQuestionEnd = afterCursor.indexOf(']');
      
      // If cursor is inside a question block, prevent editing
      if (lastQuestionStart !== -1 && (lastQuestionEnd < lastQuestionStart || nextQuestionEnd !== -1)) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Tab' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
        }
      }
    });
    
    window.addEventListener('insertQuestionIntoQnA', handleInsertQuestion as EventListener);
    
    // Cleanup function for event listener
    const originalRemoveElements = removeElements;
    removeElements = () => {
      window.removeEventListener('insertQuestionIntoQnA', handleInsertQuestion as EventListener);
      originalRemoveElements();
    };
  };

  const enableInlineEditing = () => {
    if (!textRef.current) return;
    
    const textNode = textRef.current;
    const stage = textNode.getStage();
    if (!stage) return;
    
    // Hide text node
    textNode.hide();
    
    // Create textarea
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    
    const transform = textNode.getAbsoluteTransform();
    const pos = transform.point({ x: element.padding || 4, y: element.padding || 4 });
    const stageBox = stage.container().getBoundingClientRect();
    const scale = transform.m[0]; // Get scale from transform matrix
    
    const areaPosition = {
      x: stageBox.left + pos.x,
      y: stageBox.top + pos.y
    };
    
    textarea.value = element.text || '';
    textarea.style.position = 'absolute';
    textarea.style.top = areaPosition.y + 'px';
    textarea.style.left = areaPosition.x + 'px';
    textarea.style.width = ((element.width - (element.format?.padding || element.padding || 4) * 2) * scale) + 'px';
    textarea.style.height = ((element.height - (element.format?.padding || element.padding || 4) * 2) * scale) + 'px';
    textarea.style.fontSize = ((element.font?.fontSize || element.fontSize || 16) * scale) + 'px';
    textarea.style.fontFamily = element.font?.fontFamily || element.fontFamily || 'Arial, sans-serif';
    textarea.style.fontWeight = element.font?.fontBold || element.fontWeight === 'bold' ? 'bold' : 'normal';
    textarea.style.fontStyle = element.font?.fontItalic || element.fontStyle === 'italic' ? 'italic' : 'normal';
    textarea.style.color = element.font?.fontColor || element.fill || '#1f2937';
    textarea.style.background = 'transparent';
    textarea.style.border = 'transparent';
    textarea.style.outline = 'none';
    textarea.style.setProperty('--tw-ring-shadow', 'transparent');
    textarea.style.setProperty('::selection', 'background-color: #72bcf5');
    textarea.style.setProperty('::-moz-selection', 'background-color: #72bcf5');
    textarea.style.resize = 'none';
    textarea.style.lineHeight = getLineHeight().toString();
    textarea.style.textAlign = element.format?.align || element.align || 'left';
    textarea.style.padding = '0';
    textarea.style.margin = '0';
    textarea.style.overflow = 'hidden';
    textarea.style.whiteSpace = 'pre-wrap';
    textarea.style.wordWrap = 'break-word';
    
    // For answer textboxes, use the current answer from tempAnswers
    if (element.textType === 'answer' && element.questionElementId) {
      const currentPage = state.currentBook?.pages[state.activePageIndex];
      if (currentPage) {
        const questionElement = currentPage.elements.find(el => el.id === element.questionElementId);
        if (questionElement?.questionId) {
          // Use assigned user's answer or current user's answer
          const assignedUser = state.pageAssignments[state.activePageIndex + 1];
          const userIdToEdit = assignedUser?.id || user?.id;
          const currentAnswer = getAnswerText(questionElement.questionId, userIdToEdit);
          textarea.value = currentAnswer || '';
        }
      }
    }
    
    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };
    
    textarea.addEventListener('input', adjustHeight);
    
    textarea.focus();
    textarea.select();
    
    // Initial height adjustment
    setTimeout(adjustHeight, 0);
    
    let isRemoved = false;
    const removeTextarea = () => {
      if (!isRemoved) {
        try {
          if (document.body.contains(textarea)) {
            document.body.removeChild(textarea);
          }
        } catch (e) {
          // Textarea already removed
        }
        isRemoved = true;
      }
      textNode.show();
      stage.draw();
    };
    
    const setTextareaWidth = () => {
      const newWidth = ((element.width - (element.format?.padding || element.padding || 4) * 2) * scale);
      textarea.style.width = newWidth + 'px';
    };
    
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        removeTextarea();
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        const newText = textarea.value;
        
        // For answer textboxes, update temp answer state using element's answerId
        if (element.textType === 'answer' && element.questionElementId) {
          const currentPage = state.currentBook?.pages[state.activePageIndex];
          if (currentPage) {
            const questionElement = currentPage.elements.find(el => el.id === element.questionElementId);
            if (questionElement?.questionId && user?.id) {
              // Use element's answerId or create new one if missing
              const answerId = element.answerId || uuidv4();
              
              dispatch({
                type: 'UPDATE_TEMP_ANSWER',
                payload: {
                  questionId: questionElement.questionId,
                  text: newText,
                  userId: user.id,
                  answerId
                }
              });
              
              // Update element with answerId if it was missing
              if (!element.answerId) {
                dispatch({
                  type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                  payload: {
                    id: element.id,
                    updates: { answerId }
                  }
                });
              }
              
              // Trigger answer saved event
              window.dispatchEvent(new CustomEvent('answerSaved'));
            }
          }
        }
        
        // Check if user can resize textbox
        const canResize = user?.role === 'admin' || 
                         state.currentBook?.role === 'publisher' || 
                         state.currentBook?.owner_id === user?.id;
        
        let updates: any = {};
        
        // Update element text for all textboxes
        updates.text = newText;
        
        if (canResize && newText) {
          // Calculate required height for text
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          context.font = `${element.font?.fontSize || element.fontSize || 16}px ${element.font?.fontFamily || element.fontFamily || 'Arial, sans-serif'}`;
          
          const padding = element.format?.padding || element.padding || 4;
          const textWidth = element.width - (padding * 2);
          const lineHeight = (element.font?.fontSize || element.fontSize || 16) * getLineHeight();
          
          // Split by line breaks first
          const paragraphs = newText.split('\n');
          let totalLines = 0;
          
          paragraphs.forEach(paragraph => {
            if (paragraph.trim() === '') {
              totalLines += 1;
              return;
            }
            
            const words = paragraph.split(' ');
            let lines = 1;
            let currentLineWidth = 0;
            
            words.forEach(word => {
              const wordWidth = context.measureText(word + ' ').width;
              if (currentLineWidth + wordWidth > textWidth && currentLineWidth > 0) {
                lines++;
                currentLineWidth = wordWidth;
              } else {
                currentLineWidth += wordWidth;
              }
            });
            
            totalLines += lines;
          });
          
          const requiredHeight = (totalLines * lineHeight) + (padding * 2) + 10;
          updates.height = Math.max(element.height, Math.ceil(requiredHeight));
        }
        
        dispatch({
          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
          payload: {
            id: element.id,
            updates
          }
        });
        removeTextarea();
      }
    });
    
    textarea.addEventListener('blur', () => {
      const newText = textarea.value;
      
      // For answer textboxes, update temp answer state using element's answerId
      if (element.textType === 'answer' && element.questionElementId) {
        const currentPage = state.currentBook?.pages[state.activePageIndex];
        if (currentPage) {
          const questionElement = currentPage.elements.find(el => el.id === element.questionElementId);
          if (questionElement?.questionId && user?.id) {
            // Use element's answerId or create new one if missing
            const answerId = element.answerId || uuidv4();
            
            dispatch({
              type: 'UPDATE_TEMP_ANSWER',
              payload: {
                questionId: questionElement.questionId,
                text: newText,
                userId: user.id,
                answerId
              }
            });
            
            // Update element with answerId if it was missing
            if (!element.answerId) {
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: {
                  id: element.id,
                  updates: { answerId }
                }
              });
            }
            
            // Trigger answer saved event
            window.dispatchEvent(new CustomEvent('answerSaved'));
          }
        }
      }
      
      // Check if user can resize textbox
      const canResize = user?.role === 'admin' || 
                       state.currentBook?.role === 'publisher' || 
                       state.currentBook?.owner_id === user?.id;
      
      let updates: any = {};
      
      // Update element text for all textboxes
      updates.text = newText;
      
      if (canResize && newText) {
        // Calculate required height for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        context.font = `${element.font?.fontSize || element.fontSize || 16}px ${element.font?.fontFamily || element.fontFamily || 'Arial, sans-serif'}`;
        
        const padding = element.format?.padding || element.padding || 4;
        const textWidth = element.width - (padding * 2);
        const lineHeight = (element.font?.fontSize || element.fontSize || 16) * getLineHeight();
        
        // Split by line breaks first
        const paragraphs = newText.split('\n');
        let totalLines = 0;
        
        paragraphs.forEach(paragraph => {
          if (paragraph.trim() === '') {
            totalLines += 1;
            return;
          }
          
          const words = paragraph.split(' ');
          let lines = 1;
          let currentLineWidth = 0;
          
          words.forEach(word => {
            const wordWidth = context.measureText(word + ' ').width;
            if (currentLineWidth + wordWidth > textWidth && currentLineWidth > 0) {
              lines++;
              currentLineWidth = wordWidth;
            } else {
              currentLineWidth += wordWidth;
            }
          });
          
          totalLines += lines;
        });
        
        const requiredHeight = (totalLines * lineHeight) + (padding * 2) + 10;
        updates.height = Math.max(element.height, Math.ceil(requiredHeight));
      }
      
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: {
          id: element.id,
          updates
        }
      });
      removeTextarea();
    });
    
    setTextareaWidth();
  };



  const handleSelectQuestion = () => {
    // Prevent authors from opening question manager
    if (state.userRole === 'author') {
      return;
    }
    

    
    window.dispatchEvent(new CustomEvent('openQuestionModal', {
      detail: { elementId: element.id }
    }));
  };

  // Override getClientRect to return only visible area
  useEffect(() => {
    if (textRef.current) {
      const group = textRef.current.getParent();
      if (group) {
        group.getClientRect = () => ({
          x: 0,
          y: 0,
          width: element.width,
          height: element.height
        });
      }
    }
  }, [element.width, element.height]);

  // Create border element for ThemedShape if borderWidth > 0
  const borderWidth = element.border?.borderWidth ?? element.borderWidth ?? 0;
  const borderColor = element.border?.borderColor || element.borderColor || '#000000';
  const borderOpacity = element.border?.borderOpacity ?? element.borderOpacity ?? 1;
  const borderTheme = element.border?.borderTheme || element.border?.inheritTheme || element.theme || 'default';
  
  const borderElement = (borderWidth > 0 && (element.border?.enabled !== false)) ? {
    ...element,
    id: `${element.id}-border`,
    type: 'rect' as const,
    x: 0,
    y: 0,
    stroke: borderColor,
    strokeWidth: borderWidth,
    strokeOpacity: borderOpacity,
    fill: 'transparent',
    theme: borderTheme,
    inheritTheme: borderTheme,
    roughness: borderTheme === 'rough' ? 3 : element.roughness
  } : null;

  return (
    <BaseCanvasItem 
      {...props} 
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => shouldShowFlashyHover && setIsHovered(true)}
      onMouseLeave={() => shouldShowFlashyHover && setIsHovered(false)}
    >
      <Group>
        {/* Background rectangle - render before border for Candy theme */}
        <Rect
          width={element.width}
          height={element.height}
          fill={(element.background?.enabled === false) ? "transparent" : (element.background?.backgroundColor || element.backgroundColor || "transparent")}
          opacity={(element.background?.enabled === false) ? 0 : (element.background?.backgroundOpacity || element.backgroundOpacity || 1)}
          stroke={shouldShowFlashyHover && isHovered ? "hsl(45, 92%, 42%)" : ((element.textType === 'question' || element.textType === 'answer') ? "#9ca3af" : "transparent")}
          strokeWidth={shouldShowFlashyHover && isHovered ? 4 : ((element.textType === 'question' || element.textType === 'answer') ? 1 : 0)}
          dash={shouldShowFlashyHover && isHovered ? [] : ((element.textType === 'question' || element.textType === 'answer') ? [5, 5] : [])}
          cornerRadius={element.cornerRadius || 0}
          listening={true}
        />
        
        {/* Themed border using ThemedShape component */}
        {borderElement && borderWidth > 0 && (element.border?.enabled !== false) && (
          <Group listening={false}>
            <ThemedShape
              element={borderElement}
              isSelected={false}
              isDragging={false}
              zoom={props.zoom || 1}
              onSelect={() => {}}
              onTransform={() => {}}
            />
          </Group>
        )}
        
        {/* Ruled lines */}
        {generateRuledLines()}
        
        {/* Text content */}
        {(() => {
          const padding = element.format?.padding || element.padding || 4;
          const textWidth = element.width - (padding * 2);
          const textHeight = element.height - (padding * 2);
          
          return (element.formattedText || element.text) && ((element.formattedText || element.text).includes('<') && ((element.formattedText || element.text).includes('<strong>') || (element.formattedText || element.text).includes('<em>') || (element.formattedText || element.text).includes('<u>') || (element.formattedText || element.text).includes('color:') || (element.formattedText || element.text).includes('font-family:') || (element.formattedText || element.text).includes('ql-font-') || (element.formattedText || element.text).includes('data-ruled=') || (element.formattedText || element.text).includes('<h'))) ? (
            <>
              {formatRichText(element.formattedText || element.text, fontSize, fontFamily, textWidth, element.ruledLines || (element.formattedText || element.text).includes('data-ruled="true"')).map((textPart, index) => (
                <Text
                  key={index}
                  text={textPart.text}
                  x={padding + textPart.x}
                  y={padding + textPart.y}
                  fontSize={textPart.fontSize}
                  fontFamily={textPart.fontFamily}
                  fontStyle={textPart.fontStyle}
                  fill={textPart.fill || element.font?.fontColor || element.fill || '#1f2937'}
                  opacity={element.font?.fontOpacity || element.fillOpacity || 1}
                  textDecoration={textPart.textDecoration}
                  listening={false}
                />
              ))}
            </>
          ) : (
            <Text
              ref={textRef}
              x={padding}
              y={padding}
              width={textWidth}
              height={textHeight}
              text={displayText}
              fontSize={fontSize}
              fontFamily={fontFamily}
              fontStyle={`${(element.font?.fontBold || element.fontWeight === 'bold') ? 'bold' : ''} ${(element.font?.fontItalic || element.fontStyle === 'italic') ? 'italic' : ''}`.trim() || 'normal'}
              fill={element.font?.fontColor || element.fill || (element.text ? '#1f2937' : '#9ca3af')}
              opacity={(element.formattedText || element.text) ? (element.font?.fontOpacity || element.fillOpacity || 1) : 0.6}
              align={align}
              verticalAlign="top"
              wrap="word"
              lineHeight={lineHeight}
              listening={false}
              name={(element.formattedText || element.text || element.textType === 'qna') ? '' : 'no-print'}
            />
          );
        })()}
        
        {/* Flashy hover border - renders on top */}
        {shouldShowFlashyHover && isHovered && (
          <Rect
          position={{ x: -10, y: -10 }}
            width={element.width + 20}
            height={element.height + 20}
            fill="transparent"
            stroke="hsl(45, 92%, 42%)"
            strokeWidth={30}
            // cornerRadius={element.cornerRadius || 0}
            listening={false}
          />
        )}
        
        {/* Overflow indicator */}
        {hasOverflow && (
          <Rect
            x={element.width - 20}
            y={element.height - 20}
            width={16}
            height={16}
            fill="#ef4444"
            cornerRadius={8}
            listening={false}
          />
        )}
      </Group>
    </BaseCanvasItem>
  );
}