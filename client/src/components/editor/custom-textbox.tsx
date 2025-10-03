import { useRef, useState, useEffect } from 'react';
import { Group, Rect, Text, Circle, Path } from 'react-konva';
import Konva from 'konva';
import { useEditor } from '../../context/editor-context';
import type { CanvasElement } from '../../context/editor-context';
import RoughShape from './canvas/rough-shape';
import QuestionSelectionCard from '../cards/question-selection-card';

// Rich text formatting function for Quill HTML output
function formatRichText(text: string, fontSize: number, fontFamily: string, maxWidth: number, hasRuledLines: boolean = false) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  
  const lineHeight = hasRuledLines ? fontSize * 2.5 : fontSize * 1.2;
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

interface CustomTextboxProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  scale: number;
  isMovingGroup?: boolean;
}

export default function CustomTextbox({ element, isSelected, onSelect, onDragEnd, scale, isMovingGroup }: CustomTextboxProps) {
  const { state, dispatch } = useEditor();
  const groupRef = useRef<Konva.Group>(null);
  const textRef = useRef<Konva.Text>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);



  const fontSize = element.fontSize || 16;
  const lineHeight = element.lineHeight || (element.text && element.text.includes('data-ruled="true"') ? 2.5 : 1.2);
  const align = element.align || 'left';
  const fontFamily = element.fontFamily || 'Arial, sans-serif';
  
  const getPlaceholderText = () => {
    if (element.textType === 'question') return 'Double-click to pose a question...';
    if (element.textType === 'answer') return 'Double-click to answer...';
    return 'Double-click add text...';
  };

  const displayText = element.text || getPlaceholderText();

  // Check for text overflow and update text wrapping
  useEffect(() => {
    if (textRef.current) {
      // Reset any scale transforms
      textRef.current.scaleX(1);
      textRef.current.scaleY(1);
      
      // Force text to rewrap when width changes
      textRef.current.width(element.width - 8);
      
      // Force re-render to apply new width
      textRef.current.text(displayText);
      textRef.current.getLayer()?.batchDraw();
      
      // Check if text overflows the container
      const textHeight = textRef.current.height();
      const containerHeight = element.height - 8;
      setHasOverflow(textHeight > containerHeight);
    }
  }, [element.text, element.width, element.height, fontSize, lineHeight, displayText]);

  const handleDoubleClick = () => {
    if (state.activeTool !== 'select') return;
    
    // Check permissions for editing
    if (element.textType === 'question' && state.currentBook?.owner_id !== state.user?.id) {
      return; // Only admins can edit questions
    }
    
    setIsEditing(true);
    
    // Load Quill.js if not already loaded
    if (!window.Quill) {
      const quillCSS = document.createElement('link');
      quillCSS.rel = 'stylesheet';
      quillCSS.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
      document.head.appendChild(quillCSS);
      
      const quillJS = document.createElement('script');
      quillJS.src = 'https://cdn.quilljs.com/1.3.6/quill.min.js';
      document.head.appendChild(quillJS);
      
      // Wait for Quill to load
      quillJS.onload = () => initQuillEditor();
      return;
    } else {
      initQuillEditor();
    }
    
    function initQuillEditor() {
      // Create modal using React components
      const modalRoot = document.createElement('div');
      document.body.appendChild(modalRoot);
      
      // Import React and ReactDOM dynamically
      import('react').then(React => {
        import('react-dom/client').then(ReactDOM => {
          const root = ReactDOM.createRoot(modalRoot);
          
          const closeModal = () => {
            root.unmount();
            document.body.removeChild(modalRoot);
            setIsEditing(false);
          };
          
          // Create Quill editor container
          const editorContainer = document.createElement('div');
          editorContainer.style.minHeight = '200px';
          editorContainer.style.marginBottom = '12px';

          // Create different buttons based on text type
          let saveBtn, saveQuestionBtn, resetBtn, selectQuestionBtn;
          
          const showQuestionListHandler = () => {
            // Show question list
            editorContainer.style.display = 'none';
            buttonContainerEl.style.display = 'none';
            const toolbar = modal.querySelector('.ql-toolbar');
            if (toolbar) toolbar.style.display = 'none';
            showQuestionList();
          };
          
          if (element.textType === 'question') {
            saveQuestionBtn = document.createElement('button');
            saveQuestionBtn.textContent = '💾';
            saveQuestionBtn.style.padding = '8px 12px';
            saveQuestionBtn.style.border = 'none';
            saveQuestionBtn.style.borderRadius = '4px';
            saveQuestionBtn.style.backgroundColor = '#f59e0b';
            saveQuestionBtn.style.color = 'white';
            saveQuestionBtn.style.cursor = 'pointer';
            saveQuestionBtn.style.display = 'none';
            
            resetBtn = document.createElement('button');
            resetBtn.textContent = '↺';
            resetBtn.style.padding = '8px 12px';
            resetBtn.style.border = 'none';
            resetBtn.style.borderRadius = '4px';
            resetBtn.style.backgroundColor = '#ef4444';
            resetBtn.style.color = 'white';
            resetBtn.style.cursor = 'pointer';
            resetBtn.style.display = 'none';
          }
          
          saveBtn = document.createElement('button');
          saveBtn.textContent = 'OK';
          saveBtn.style.padding = '8px 16px';
          saveBtn.style.border = 'none';
          saveBtn.style.borderRadius = '4px';
          saveBtn.style.backgroundColor = '#2563eb';
          saveBtn.style.color = 'white';
          saveBtn.style.cursor = 'pointer';
          let showQuestionList: () => void;
      

          
          // Create button container element
          const buttonContainerEl = document.createElement('div');
          buttonContainerEl.setAttribute('data-button-container', 'true');
          buttonContainerEl.style.display = 'flex';
          buttonContainerEl.style.justifyContent = 'flex-end';
          buttonContainerEl.style.gap = '8px';
          buttonContainerEl.style.marginTop = '12px';
          
          // Create cancel button
          const cancelBtn = document.createElement('button');
          cancelBtn.textContent = 'Cancel';
          cancelBtn.style.padding = '8px 16px';
          cancelBtn.style.border = '1px solid #ccc';
          cancelBtn.style.borderRadius = '4px';
          cancelBtn.style.cursor = 'pointer';
          cancelBtn.onclick = closeModal;
          
          if (element.textType === 'question') {
            const selectQuestionBtn = document.createElement('button');
            selectQuestionBtn.textContent = 'Select Question';
            selectQuestionBtn.style.padding = '8px 16px';
            selectQuestionBtn.style.border = '1px solid #ccc';
            selectQuestionBtn.style.borderRadius = '4px';
            selectQuestionBtn.style.cursor = 'pointer';
            selectQuestionBtn.onclick = showQuestionListHandler;
            
            buttonContainerEl.appendChild(selectQuestionBtn);
            if (saveQuestionBtn) buttonContainerEl.appendChild(saveQuestionBtn);
            if (resetBtn) buttonContainerEl.appendChild(resetBtn);
            buttonContainerEl.appendChild(cancelBtn);
            buttonContainerEl.appendChild(saveBtn);
          } else {
            buttonContainerEl.appendChild(cancelBtn);
            buttonContainerEl.appendChild(saveBtn);
          }
          
          // Create modal overlay using DOM (simpler approach)
          const modal = document.createElement('div');
          modal.style.position = 'fixed';
          modal.style.top = '0';
          modal.style.left = '0';
          modal.style.width = '100%';
          modal.style.height = '100%';
          modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          modal.style.display = 'flex';
          modal.style.justifyContent = 'center';
          modal.style.alignItems = 'center';
          modal.style.zIndex = '10000';
          
          // Create main container
          const containerEl = document.createElement('div');
          containerEl.setAttribute('data-editor-container', 'true');
          containerEl.style.backgroundColor = 'white';
          containerEl.style.borderRadius = '8px';
          containerEl.style.padding = '20px';
          containerEl.style.width = '80vw';
          containerEl.style.maxWidth = '900px';
          containerEl.style.minWidth = '400px';
          containerEl.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
          
          containerEl.appendChild(editorContainer);
          containerEl.appendChild(buttonContainerEl);
          modal.appendChild(containerEl);
          
          // Clean up React root and use pure DOM
          root.unmount();
          document.body.removeChild(modalRoot);
          document.body.appendChild(modal);
          
          // Update closeModal to work with DOM
          const closeModalDOM = () => {
            document.body.removeChild(modal);
            setIsEditing(false);
          };
          
          // Update cancel button
          cancelBtn.onclick = closeModalDOM;
          
          // Initialize Quill after DOM is attached
          setTimeout(() => {
            const userColors = [
              '#000000', '#e60000', '#ff9900', '#ffff00', '#008a00', '#0066cc', 
              '#9933ff', '#ffffff', '#facccc', '#ffebcc', '#ffffcc', '#cce8cc', 
              '#cce0f5', '#ebd6ff', '#bbbbbb', '#f06666', '#ffc266', '#ffff66', 
              '#66b966', '#66a3e0', '#c285ff', '#888888', '#a10000', '#b26b00', 
              '#b2b200', '#006100', '#0047b2', '#6b24b2', '#444444', '#5c0000'
            ];
            
            // Register custom fonts with Quill
            const Font = window.Quill.import('formats/font');
            Font.whitelist = ['georgia', 'helvetica', 'arial', 'courier', 'kalam', 'shadows', 'playwrite', 'msmadi', 'giveyouglory', 'meowscript'];
            window.Quill.register(Font, true);
            
            const quill = new window.Quill(editorContainer, {
              theme: 'snow',
              formats: ['bold', 'italic', 'underline', 'color', 'font', 'header'],
              modules: {
                toolbar: {
                  container: [
                    [{ 'header': [1, 2, 3, false] }],

                    ['bold', 'italic', 'underline'],
                    [{ 'color': userColors }],
                    [{ 'font': ['helvetica', 'georgia', 'arial', 'courier', 'kalam', 'shadows', 'playwrite', 'msmadi', 'giveyouglory', 'meowscript'] }],
                    ['ruled-lines'],
                    ['clean']
                  ],
                  handlers: {
                    'ruled-lines': function() {
                      const button = document.querySelector('.ql-ruled-lines');
                      const hasRuledAttr = quill.root.hasAttribute('data-ruled');
                      
                      if (hasRuledAttr) {
                        button.classList.remove('ql-active');
                        quill.root.removeAttribute('data-ruled');
                        quill.root.style.lineHeight = '';
                      } else {
                        button.classList.add('ql-active');
                        quill.root.setAttribute('data-ruled', 'true');
                        quill.root.style.lineHeight = '2.5';
                      }
                    }
                  }
                }
              }
            });
      
            // Set default formatting
            quill.format('font', 'helvetica');
            quill.format('color', '#000000');
            quill.format('header', 3);
            
            // Handle global font changes and fix header labels
            setTimeout(() => {
              const fontItems = document.querySelectorAll('.ql-font .ql-picker-item');
              fontItems.forEach(item => {
                item.addEventListener('click', function() {
                  const selectedFont = this.getAttribute('data-value');
                  if (selectedFont) {
                    quill.formatText(0, quill.getLength(), 'font', selectedFont);
                  }
                });
              });
            }, 100);
            
            // Handle paste events to process ruled line content
            quill.root.addEventListener('paste', function(e) {
              const clipboardData = e.clipboardData;
              const htmlData = clipboardData?.getData('text/html');
              
              if (htmlData && htmlData.includes('data-ruled="true"')) {
                e.preventDefault();
                
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlData;
                const ruledDiv = tempDiv.querySelector('[data-ruled="true"]');
                
                if (ruledDiv) {
                  const content = ruledDiv.innerHTML;
                  const selection = quill.getSelection();
                  
                  if (selection) {
                    quill.clipboard.dangerouslyPasteHTML(selection.index, content);
                  }
                }
              }
            });
            
            // Load Google Fonts for handwriting styles
            const googleFonts = document.createElement('link');
            googleFonts.rel = 'stylesheet';
            googleFonts.href = 'https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&family=Shadows+Into+Light&family=Playwrite+DE+SAS&family=Ms+Madi&family=Give+You+Glory&family=Meow+Script&display=swap';
            document.head.appendChild(googleFonts);
            
            // Register custom ruled lines format only once globally
            if (!window.ruledLinesRegistered) {
              const Inline = window.Quill.import('blots/inline');
              class RuledLinesBlot extends Inline {
                static create() {
                  const node = super.create();
                  node.setAttribute('data-ruled', 'true');
                  return node;
                }
                
                static formats(node) {
                  return node.getAttribute('data-ruled') === 'true';
                }
              }
              RuledLinesBlot.blotName = 'ruled-lines';
              RuledLinesBlot.tagName = 'span';
              window.Quill.register(RuledLinesBlot);
              window.ruledLinesRegistered = true;
            }
            
            // Add CSS for font families and dropdown labels
            const fontCSS = document.createElement('style');
            fontCSS.textContent = `
              .ql-font-georgia { font-family: Georgia, serif; }
              .ql-font-helvetica { font-family: Helvetica, sans-serif; }
              .ql-font-arial { font-family: Arial, sans-serif; }
              .ql-font-courier { font-family: 'Courier New', monospace; }
              .ql-font-kalam { font-family: 'Kalam', cursive; }
              .ql-font-shadows { font-family: 'Shadows Into Light', cursive; }
              .ql-font-playwrite { font-family: 'Playwrite DE SAS', cursive; }
              .ql-font-msmadi { font-family: 'Ms Madi', cursive; }
              .ql-font-giveyouglory { font-family: 'Give You Glory', cursive; }
              .ql-font-meowscript { font-family: 'Meow Script', cursive; }
              
              .ql-picker.ql-font .ql-picker-label[data-value="georgia"]::before,
              .ql-picker.ql-font .ql-picker-item[data-value="georgia"]::before {
                content: 'Georgia';
              }
              .ql-picker.ql-font .ql-picker-label[data-value="helvetica"]::before,
              .ql-picker.ql-font .ql-picker-item[data-value="helvetica"]::before {
                content: 'Helvetica';
              }
              .ql-picker.ql-font .ql-picker-label[data-value="arial"]::before,
              .ql-picker.ql-font .ql-picker-item[data-value="arial"]::before {
                content: 'Arial';
              }
              .ql-picker.ql-font .ql-picker-label[data-value="courier"]::before,
              .ql-picker.ql-font .ql-picker-item[data-value="courier"]::before {
                content: 'Courier New';
              }
              .ql-picker.ql-font .ql-picker-label[data-value="kalam"]::before,
              .ql-picker.ql-font .ql-picker-item[data-value="kalam"]::before {
                content: 'Kalam';
              }
              .ql-picker.ql-font .ql-picker-label[data-value="shadows"]::before,
              .ql-picker.ql-font .ql-picker-item[data-value="shadows"]::before {
                content: 'Shadows Into Light';
              }
              .ql-picker.ql-font .ql-picker-label[data-value="playwrite"]::before,
              .ql-picker.ql-font .ql-picker-item[data-value="playwrite"]::before {
                content: 'Playwrite Deutschland';
              }
              .ql-picker.ql-font .ql-picker-label[data-value="msmadi"]::before,
              .ql-picker.ql-font .ql-picker-item[data-value="msmadi"]::before {
                content: 'Ms Madi';
              }
              .ql-picker.ql-font .ql-picker-label[data-value="giveyouglory"]::before,
              .ql-picker.ql-font .ql-picker-item[data-value="giveyouglory"]::before {
                content: 'Give You Glory';
              }
              .ql-picker.ql-font .ql-picker-label[data-value="meowscript"]::before,
              .ql-picker.ql-font .ql-picker-item[data-value="meowscript"]::before {
                content: 'Meow Script';
              }
              
              .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="false"]::before,
              .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="false"]::before,
              .ql-snow .ql-picker.ql-header .ql-picker-item:not([data-value])::before {
                content: 'S' !important;
              }
              .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="3"]::before,
              .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before {
                content: 'M' !important;
              }
              .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="2"]::before,
              .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="2"]::before {
                content: 'L' !important;
              }
              .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="1"]::before,
              .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="1"]::before {
                content: 'XL' !important;
              }
              .ql-snow .ql-picker.ql-header .ql-picker-label:not([data-value])::before {
                content: 'Small' !important;
              }
              
              .ql-toolbar .ql-ruled-lines {
                width: 28px;
                height: 28px;
              }
              .ql-toolbar .ql-ruled-lines:before {
                content: '≡';
                font-size: 18px;
                line-height: 1;
              }
              .ql-toolbar .ql-ruled-lines.ql-active {
                color: #06c;
              }
              
              .ql-editor span[data-ruled="true"] {
                line-height: 2.5 !important;
              }
            `;
            document.head.appendChild(fontCSS);
      
            // Create "Add question" button for empty content using React component
            const addQuestionButtonContainer = document.createElement('div');
            const addQuestionRoot = ReactDOM.createRoot(addQuestionButtonContainer);
            
            addQuestionRoot.render(
              React.createElement(QuestionSelectionCard, {
                onSelect: () => {
                  editorContainer.style.display = 'none';
                  buttonContainerEl.style.display = 'none';
                  const toolbar = modal.querySelector('.ql-toolbar');
                  if (toolbar) toolbar.style.display = 'none';
                  showQuestionList();
                }
              })
            );
            
            const updateContainerVisibility = () => {
              if (element.textType === 'question') {
                const isEmpty = !quill.getText().trim();
                const qlContainer = editorContainer.querySelector('.ql-container');
                if (isEmpty) {
                  if (qlContainer) qlContainer.style.display = 'none';
                  quill.root.style.pointerEvents = 'none';
                  quill.blur();
                  if (!editorContainer.contains(addQuestionButtonContainer)) {
                    editorContainer.appendChild(addQuestionButtonContainer);
                  }
                } else {
                  if (qlContainer) qlContainer.style.display = 'block';
                  quill.root.style.pointerEvents = 'auto';
                  if (editorContainer.contains(addQuestionButtonContainer)) {
                    editorContainer.removeChild(addQuestionButtonContainer);
                  }
                }
              }
            };
            
            // Set initial content and ruled lines state
            if (element.text) {
              if (element.text.includes('data-ruled="true"')) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = element.text;
                const ruledDiv = tempDiv.querySelector('[data-ruled="true"]');
                if (ruledDiv) {
                  quill.root.innerHTML = ruledDiv.innerHTML;
                  quill.root.setAttribute('data-ruled', 'true');
                  quill.root.style.lineHeight = '2.5';
                  setTimeout(() => {
                    const button = document.querySelector('.ql-ruled-lines');
                    if (button) button.classList.add('ql-active');
                  }, 100);
                }
              } else {
                // Check if content has HTML formatting
                if (element.text.includes('<span') || element.text.includes('<strong') || element.text.includes('<em') || element.text.includes('ql-font-')) {
                  quill.root.innerHTML = element.text;
                } else {
                  // Plain text - remove paragraph tags if present
                  let content = element.text;
                  if (content.startsWith('<p>') && content.endsWith('</p>') && !content.includes('</p><p>')) {
                    content = content.slice(3, -4);
                  }
                  quill.setText(content);
                  quill.formatText(0, content.length, 'font', 'helvetica');
                }
                // Ensure ruled lines button state matches content
                setTimeout(() => {
                  const button = document.querySelector('.ql-ruled-lines');
                  if (button) {
                    button.classList.remove('ql-active');
                    quill.root.removeAttribute('data-ruled');
                    quill.root.style.lineHeight = '';
                  }
                }, 100);
              }
            } else {
              quill.format('font', 'helvetica');
            }
            
            setTimeout(() => {
              updateContainerVisibility();
            }, 0);
            
            // Update button state on focus
            quill.on('selection-change', function() {
              const button = document.querySelector('.ql-ruled-lines');
              const hasRuledAttr = quill.root.hasAttribute('data-ruled');
              if (button) {
                if (hasRuledAttr) {
                  button.classList.add('ql-active');
                } else {
                  button.classList.remove('ql-active');
                }
              }
              updateContainerVisibility();
            });
            
            // Preserve formatting on Enter from headers
            quill.on('text-change', function(delta, oldDelta, source) {
              if (source === 'user') {
                delta.ops?.forEach(op => {
                  if (op.insert === '\n') {
                    const selection = quill.getSelection();
                    if (selection) {
                      const prevFormat = quill.getFormat(selection.index - 2, 1);
                      if (prevFormat.header) {
                        setTimeout(() => {
                          if (prevFormat.header) quill.format('header', prevFormat.header);
                          if (prevFormat.font) quill.format('font', prevFormat.font);
                          if (prevFormat.color) quill.format('color', prevFormat.color);
                          if (prevFormat.bold) quill.format('bold', true);
                          if (prevFormat.italic) quill.format('italic', true);
                          if (prevFormat.underline) quill.format('underline', true);
                        }, 0);
                      }
                    }
                  }
                });
              }
            });
            
            // Disable text input but allow formatting
            quill.root.addEventListener('beforeinput', (e) => {
              if (element.textType === 'question' && (e.inputType.includes('insert') || e.inputType.includes('delete'))) {
                e.preventDefault();
              }
            });
            
            quill.root.addEventListener('keydown', (e) => {
              if (element.textType === 'question' && !e.ctrlKey && !e.metaKey && e.key.length === 1) {
                e.preventDefault();
              }
              if (element.textType === 'question' && (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Enter')) {
                e.preventDefault();
              }
              if (element.textType === 'question' && (e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
              }
            });
            
            quill.root.addEventListener('paste', (e) => {
              if (element.textType === 'question') {
                e.preventDefault();
              }
            });
            
            // Define showQuestionList function now that quill is available
            showQuestionList = () => {
              import('../questions-manager-content').then(({ default: QuestionsManagerContent }) => {
                // Create React container
                const reactContainer = document.createElement('div');
                containerEl.insertBefore(reactContainer, buttonContainerEl);
                
                const questionRoot = ReactDOM.createRoot(reactContainer);
                
                const handleQuestionSelect = (questionId: number, questionText: string) => {
                  quill.root.innerHTML = questionText;
                  dispatch({
                    type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                    payload: {
                      id: element.id,
                      updates: { text: questionText, questionId: questionId }
                    }
                  });
                  
                  // Clean up React component
                  questionRoot.unmount();
                  reactContainer.remove();
                  
                  // Show editor again
                  editorContainer.style.display = 'block';
                  buttonContainerEl.style.display = 'flex';
                  const toolbar = modal.querySelector('.ql-toolbar');
                  if (toolbar) toolbar.style.display = 'block';
                  
                  setTimeout(() => {
                    updateContainerVisibility();
                    quill.focus();
                  }, 0);
                };
                
                const handleCancel = () => {
                  // Clean up React component
                  questionRoot.unmount();
                  reactContainer.remove();
                  
                  // Show editor again
                  editorContainer.style.display = 'block';
                  buttonContainerEl.style.display = 'flex';
                  const toolbar = modal.querySelector('.ql-toolbar');
                  if (toolbar) toolbar.style.display = 'block';
                  updateContainerVisibility();
                };
                
                // Render QuestionsManagerContent
                questionRoot.render(
                  React.createElement(QuestionsManagerContent, {
                    bookId: state.currentBook?.id || 0,
                    bookName: state.currentBook?.name || '',
                    onQuestionSelect: handleQuestionSelect,
                    mode: 'select',
                    token: localStorage.getItem('token') || '',
                    onClose: handleCancel,
                    showAsContent: true
                  })
                );
              });
            };
            
            // Set up save button handler now that quill is available
            saveBtn.onclick = () => {
              let htmlContent = quill.root.innerHTML;
              
              // Check if ruled lines are active
              const hasRuledLines = quill.root.hasAttribute('data-ruled');
              if (hasRuledLines) {
                // Wrap content with ruled lines marker
                htmlContent = `<div data-ruled="true">${htmlContent}</div>`;
              }
              
              // Clean up Quill's automatic <p> wrapping for simple text
              if (htmlContent.startsWith('<p>') && htmlContent.endsWith('</p>') && !htmlContent.includes('</p><p>') && !hasRuledLines && !htmlContent.includes('<span') && !htmlContent.includes('<strong') && !htmlContent.includes('<em')) {
                htmlContent = htmlContent.slice(3, -4);
              }
              
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: {
                  id: element.id,
                  updates: { text: htmlContent }
                }
              });
              closeModalDOM();
            };
            
            quill.focus();
      
            // Handle escape key
            const handleKeyDown = (e: KeyboardEvent) => {
              if (e.key === 'Escape') {
                closeModalDOM();
              }
            };
            
            modal.addEventListener('keydown', handleKeyDown);
            
          }, 100); // End setTimeout
        }); // End ReactDOM import
      }); // End React import
    }

    const cleanupHTML = (html: string) => {
      // Create temporary div to decode HTML entities
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const decodedHtml = tempDiv.innerHTML;
      
      // Remove empty tags and clean up HTML
      return decodedHtml
        .replace(/<b>\s*<\/b>/g, '')
        .replace(/<i>\s*<\/i>/g, '')
        .replace(/<u>\s*<\/u>/g, '')
        .replace(/<strong>\s*<\/strong>/g, '')
        .replace(/<em>\s*<\/em>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
    };


  };

  const [lastClickTime, setLastClickTime] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (state.activeTool === 'select') {
      if (e.evt.button === 0) {
        // Check for double-click with left button only
        const currentTime = Date.now();
        if (currentTime - lastClickTime < 300) {
          handleDoubleClick();
        }
        setLastClickTime(currentTime);
        
        // Only handle left-click for selection
        onSelect();
      } else if (e.evt.button === 2 && isSelected) {
        // Right-click on selected item - don't change selection
        return;
      }
    }
  };

  // Override getClientRect to return only visible area
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.getClientRect = () => {
        return {
          x: 0,
          y: 0,
          width: element.width,
          height: element.height
        };
      };
    }
  }, [element.width, element.height]);

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      scaleX={1}
      scaleY={1}
      draggable={state.activeTool === 'select' && !isEditing && isSelected && !isMovingGroup}
      onClick={handleClick}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background rectangle - this defines the selection bounds */}
      <Rect
        width={element.width}
        height={element.height}
        /*fill="rgba(255, 255, 255, 0.8)"*/
        stroke={isSelected ? '#2563eb' : 'transparent'}
        strokeWidth={1}
        cornerRadius={4}
        name="selectableRect"
      />
      
      {/* Light grey dashed border for print exclusion - only on hover */}
      {isHovered && (
        <Rect
          width={element.width}
          height={element.height}
          fill="transparent" 
          stroke="#64748b"
          strokeWidth={2}
          dash={[18, 18]}
          cornerRadius={8}
          name="no-print"
        />
      )}
      
      {/* Type icon in upper right corner - only on hover */}
      {isHovered && (
        <Group
          x={element.width - 70}
          y={10}
          name="no-print"
        >
          <Circle
            x={70}
            y={-10}
            radius={30}
            stroke="#64748b99"
            strokeWidth={4}
            fill="white"
          />
          <Text
            x={element.textType === 'question' ? 72 : 68}
            y={element.textType === 'question' ? -12 : -14}
            text={element.textType === 'question' ? '?' : element.textType === 'answer' ? '♡' : '⋯'}
            fontSize={element.textType === 'answer' ? 48 : 42}
            fontFamily="Arial"
            fontStyle="bold"
            fill="#64748b99"
            align="center"
            verticalAlign="middle"
            offsetX={16}
            offsetY={16}
          />
        </Group>
      )}
      
      {/* Red dashed bottom border for overflow */}
      {hasOverflow && isSelected && (
        <>
          <Path
            data={`M0 ${element.height} L${element.width} ${element.height}`}
            stroke="#dc2626"
            strokeWidth={1}
            dash={[4, 2]}
          />
          <Path
            data={`M0 ${element.height - 3} L${element.width} ${element.height - 3}`}
            stroke="#dc2626"
            strokeWidth={2}
            dash={[4, 2]}
          />
        </>
      )}
      
      {/* Ruled lines background */}
      {element.text && element.text.includes('data-ruled="true"') && (
        <Group
          clipX={4}
          clipY={4}
          clipWidth={element.width - 8}
          clipHeight={element.height - 8}
        >
          {(() => {
            // Count total visual lines including text wrapping
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = element.text;
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            context.font = `${fontSize}px ${fontFamily}`;
            
            let totalLines = 0;
            const maxWidth = element.width - 16;
            
            // Process each paragraph
            const paragraphs = tempDiv.querySelectorAll('p');
            if (paragraphs.length > 0) {
              paragraphs.forEach(p => {
                const text = p.textContent || '';
                if (text.trim()) {
                  const words = text.trim().split(/\s+/);
                  let currentLineWidth = 0;
                  let paragraphLines = 1;
                  
                  words.forEach((word, index) => {
                    const wordWidth = context.measureText((index > 0 ? ' ' : '') + word).width;
                    if (currentLineWidth + wordWidth > maxWidth && currentLineWidth > 0) {
                      paragraphLines++;
                      currentLineWidth = context.measureText(word).width;
                    } else {
                      currentLineWidth += wordWidth;
                    }
                  });
                  
                  totalLines += paragraphLines;
                } else {
                  totalLines += 1; // Empty paragraph still takes a line
                }
              });
            } else {
              // No paragraphs, treat as single block
              const text = tempDiv.textContent || '';
              if (text.trim()) {
                const words = text.trim().split(/\s+/);
                let currentLineWidth = 0;
                let textLines = 1;
                
                words.forEach((word, index) => {
                  const wordWidth = context.measureText((index > 0 ? ' ' : '') + word).width;
                  if (currentLineWidth + wordWidth > maxWidth && currentLineWidth > 0) {
                    textLines++;
                    currentLineWidth = context.measureText(word).width;
                  } else {
                    currentLineWidth += wordWidth;
                  }
                });
                
                totalLines = textLines;
              }
            }
            
            return Array.from({ length: totalLines }, (_, i) => {
              const y = 8 + (i + 1) * fontSize * 2.5 - fontSize * 1.2;
              
              if (y >= element.height - 4) return null;
              
              const lineElement: CanvasElement = {
                id: `ruled-line-${element.id}-${i}`,
                type: 'line',
                x: 8,
                y: y,
                width: element.width - 16,
                height: 2,
                stroke: '#1f2937',
                strokeWidth: 1,
                roughness: 0.8
              };
              
              return (
                <RoughShape
                  key={i}
                  element={lineElement}
                  isSelected={false}
                  onSelect={() => {}}
                  onDragEnd={() => {}}
                />
              );
            }).filter(Boolean);
          })()}
        </Group>
      )}
      
      {/* Text content with clipping */}
      <Group
        clipX={0}
        clipY={0}
        clipWidth={element.width}
        clipHeight={element.height}
      >
        {element.text && (element.text.includes('<') && (element.text.includes('<strong>') || element.text.includes('<em>') || element.text.includes('<u>') || element.text.includes('color:') || element.text.includes('font-family:') || element.text.includes('ql-font-') || element.text.includes('data-ruled=') || element.text.includes('<h'))) ? (
          <>
            {formatRichText(element.text, fontSize, fontFamily, element.width - 8, element.text.includes('data-ruled="true"')).map((textPart, index) => (
              <Text
                key={index}
                text={textPart.text}
                x={4 + textPart.x}
                y={4 + textPart.y}
                fontSize={textPart.fontSize}
                fontFamily={textPart.fontFamily}
                fontStyle={textPart.fontStyle}
                fill={textPart.fill || element.fill || '#1f2937'}
                textDecoration={textPart.textDecoration}
              />
            ))}
          </>
        ) : (
          <Text
            ref={textRef}
            text={displayText}
            fontSize={fontSize}
            fontFamily={fontFamily}
            fill={element.fill || '#1f2937'}
            width={element.width - 8}
            x={4}
            y={4}
            align={align}
            verticalAlign="top"
            lineHeight={lineHeight}
            wrap="word"
            ellipsis={false}
            opacity={element.text ? 1 : 0.6}
            listening={false}
            name={element.text ? undefined : 'no-print'}
          />
        )}
      </Group>
      

    </Group>
  );
}