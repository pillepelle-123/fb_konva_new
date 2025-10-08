import { useRef, useState, useEffect } from 'react';
import { Text, Rect } from 'react-konva';
import Konva from 'konva';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import type { CanvasElement } from '../../../../context/editor-context';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';


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

export default function Textbox(props: CanvasItemProps) {
  const { element } = props;
  const { state, dispatch } = useEditor();
  const { user } = useAuth();
  const textRef = useRef<Konva.Text>(null);

  const [hasOverflow, setHasOverflow] = useState(false);

  const fontSize = element.fontSize || 16;
  const lineHeight = element.lineHeight || (element.text && element.text.includes('data-ruled="true"') ? 2.5 : 1.2);
  const align = element.align || 'left';
  const fontFamily = element.fontFamily || 'Arial, sans-serif';
  
  const getPlaceholderText = () => {
    if (element.textType === 'question') return 'Double-click to pose a question...';
    if (element.textType === 'answer') return 'Double-click to answer...';
    return 'Double-click to add text...';
  };

  // Process text to handle HTML content from Quill
  const getDisplayText = () => {
    if (!element.text) return getPlaceholderText();
    
    // Check if text contains HTML tags
    if (element.text.includes('<') && element.text.includes('>')) {
      // Extract plain text from HTML for simple display
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = element.text;
      return tempDiv.textContent || tempDiv.innerText || getPlaceholderText();
    }
    
    return element.text;
  };

  const displayText = getDisplayText();

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
    
    if (element.textType === 'question') {
      // Prevent authors from opening question manager - comprehensive check
      if (!user || user.role === 'author') {
        console.log('Blocking question manager access - user:', user, 'role:', user?.role);
        return;
      }
      console.log('User role:', user?.role, 'Opening question manager');
      // Open question selection dialog for question elements
      window.dispatchEvent(new CustomEvent('openQuestionModal', {
        detail: { elementId: element.id }
      }));
      return;
    }
    
    window.dispatchEvent(new CustomEvent('editText', {
      detail: { elementId: element.id }
    }));
  };



  const handleSelectQuestion = () => {
    // Prevent authors from opening question manager
    if (user?.role === 'author') {
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

  return (
    <>
      <BaseCanvasItem {...props} onDoubleClick={handleDoubleClick}>
        {/* Background rectangle */}
        <Rect
          width={element.width}
          height={element.height}
          fill="transparent"
          // stroke="transparent"
          // strokeWidth={element.textType === 'question' || element.textType === 'answer' ? 1 : 0}
          dash={element.textType === 'question' || element.textType === 'answer' ? [5, 5] : []}
          listening={false}
        />
        
        {/* Text content */}
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
                listening={false}
              />
            ))}
          </>
        ) : (
          <Text
            ref={textRef}
            x={4}
            y={4}
            width={element.width - 8}
            height={element.height - 8}
            text={displayText}
            fontSize={fontSize}
            fontFamily={fontFamily}
            fill={element.fill || (element.text ? '#1f2937' : '#9ca3af')}
            align={align}
            verticalAlign="top"
            wrap="word"
            lineHeight={lineHeight}
            listening={false}
            opacity={element.text ? 1 : 0.6}
            name={element.text ? '' : 'no-print'}
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
      </BaseCanvasItem>
      

    </>
  );
}