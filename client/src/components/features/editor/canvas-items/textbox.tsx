import { useRef, useState, useEffect } from 'react';
import { Text, Rect, Path, Group } from 'react-konva';
import Konva from 'konva';
import rough from 'roughjs';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import type { CanvasElement } from '../../../../context/editor-context';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';
import ThemedShape from './themed-shape';


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

  const fontSize = element.fontSize || 16;
  
  // Calculate lineHeight based on paragraph spacing and ruled lines
  const getLineHeight = () => {
    const spacing = element.paragraphSpacing || 'medium';
    
    if (element.ruledLines || (element.text && element.text.includes('data-ruled="true"'))) {
      const ruledSpacingMap = {
        small: 2.5,
        medium: 3.0,
        large: 3.5
      };
      return ruledSpacingMap[spacing as keyof typeof ruledSpacingMap];
    }
    
    const spacingMap = {
      small: 1.2,
      medium: 1.5,
      large: 2.0
    };
    
    return element.lineHeight || spacingMap[spacing as keyof typeof spacingMap];
  };
  
  // Generate rough-style ruled lines using rough.js
  const generateRuledLines = () => {
    if (!element.ruledLines) return [];
    
    const lines = [];
    const padding = element.padding || 4;
    const lineSpacing = fontSize * lineHeight;
    const numLines = Math.floor((element.height - (padding * 2)) / lineSpacing);
    const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rc = rough.svg(svg);
    
    for (let i = 0; i < numLines; i++) {
      const y = padding + (i + 1) * lineSpacing - fontSize * 0.3;
      
      try {
        const roughLine = rc.line(padding, y, element.width - padding, y, {
          roughness: 2,
          strokeWidth: 0.8,
          stroke: '#1f2937',
          seed: seed + i
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
              key={i}
              data={combinedPath.trim()}
              stroke="#1f2937"
              strokeWidth={2}
              listening={false}
            />
          );
        }
      } catch (error) {
        lines.push(
          <Path
            key={i}
            data={`M ${padding} ${y} L ${element.width - padding} ${y}`}
            stroke="#1f2937"
            strokeWidth={2}
            listening={false}
          />
        );
      }
    }
    
    return lines;
  };
  
  const lineHeight = getLineHeight();
  const align = element.align || 'left';
  const fontFamily = element.fontFamily || 'Arial, sans-serif';
  
  const getPlaceholderText = () => {
    if (element.textType === 'question') return 'Double-click to pose a question...';
    if (element.textType === 'answer') return 'Double-click to answer...';
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
          const tempText = getAnswerText(questionElement.questionId);
          if (tempText) textToUse = tempText;
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
    
    window.dispatchEvent(new CustomEvent('editText', {
      detail: { elementId: element.id }
    }));
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
  const borderElement = element.borderWidth && element.borderWidth > 0 ? {
    ...element,
    id: `${element.id}-border`,
    type: 'rect' as const,
    x: 0,
    y: 0,
    stroke: element.borderColor || '#000000',
    strokeWidth: element.borderWidth,
    fill: 'transparent',
    roughness: element.theme === 'rough' ? 3 : element.roughness
  } : null;

  return (
    <BaseCanvasItem {...props} onDoubleClick={handleDoubleClick}>
      <Group>
        {/* Themed border using ThemedShape component */}
        {borderElement && (
          <Group listening={false}>
            <ThemedShape
              element={borderElement}
              isSelected={false}
              isDragging={false}
              zoom={1}
              onSelect={() => {}}
              onTransform={() => {}}
            />
          </Group>
        )}
        
        {/* Background rectangle */}
        <Rect
          width={element.width}
          height={element.height}
          fill={element.backgroundColor || "transparent"}
          opacity={element.backgroundOpacity || 1}
          stroke={!element.borderWidth && (element.textType === 'question' || element.textType === 'answer') ? "transparent" : "transparent"}
          strokeWidth={!element.borderWidth && (element.textType === 'question' || element.textType === 'answer') ? 1 : 0}
          dash={!element.borderWidth && (element.textType === 'question' || element.textType === 'answer') ? [5, 5] : []}
          cornerRadius={element.cornerRadius || 0}
          listening={false}
        />
        
        {/* Ruled lines */}
        {generateRuledLines()}
        
        {/* Text content */}
        {(() => {
          const padding = element.padding || 4;
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
                  fill={textPart.fill || element.fill || '#1f2937'}
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
              fill={element.fill || (element.text ? '#1f2937' : '#9ca3af')}
              align={align}
              verticalAlign="top"
              wrap="word"
              lineHeight={lineHeight}
              listening={false}
              opacity={(element.formattedText || element.text) ? 1 : 0.6}
              name={(element.formattedText || element.text) ? '' : 'no-print'}
            />
          );
        })()}
        
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