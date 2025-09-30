import { useRef, useState, useEffect } from 'react';
import { Group, Rect, Text, Circle, Path } from 'react-konva';
import Konva from 'konva';
import { useEditor } from '../../context/EditorContext';
import type { CanvasElement } from '../../context/EditorContext';

// Rich text formatting function for Quill HTML output
function formatRichText(text: string, fontSize: number, fontFamily: string, maxWidth: number) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  
  const lineHeight = fontSize * 1.2;
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
      styles.bold = true;
      styles.fontSize = fontSize * 1.8;
    }
    if (element.tagName === 'H2') {
      styles.bold = true;
      styles.fontSize = fontSize * 1.5;
    }
    if (element.tagName === 'H3') {
      styles.bold = true;
      styles.fontSize = fontSize * 1.2;
    }
    
    // Check for color in style attribute
    const styleAttr = element.getAttribute('style');
    if (styleAttr && styleAttr.includes('color:')) {
      const colorMatch = styleAttr.match(/color:\s*([^;]+)/i);
      if (colorMatch) {
        styles.color = colorMatch[1].trim();
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
        currentY += (styles.fontSize || fontSize) * 1.2;
      }
      
      textParts.push({
        text: word,
        x: currentX,
        y: currentY,
        fontSize: currentFontSize,
        fontFamily,
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
  const lineHeight = element.lineHeight || 1.2;
  const align = element.align || 'left';
  const fontFamily = element.fontFamily || 'Arial, sans-serif';
  
  const getPlaceholderText = () => {
    if (element.textType === 'question') return 'Click to edit question...';
    if (element.textType === 'answer') return 'Double-click to answer...';
    return 'Double click to edit';
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
      // Create modal overlay
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

      // Create editor container
      const container = document.createElement('div');
      container.style.backgroundColor = 'white';
      container.style.borderRadius = '8px';
      container.style.padding = '20px';
      container.style.minWidth = '500px';
      container.style.maxWidth = '700px';
      container.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';

      // Create Quill editor container
      const editorContainer = document.createElement('div');
      editorContainer.style.minHeight = '200px';
      editorContainer.style.marginBottom = '12px';

      // Create buttons
      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.justifyContent = 'flex-end';
      buttonContainer.style.gap = '8px';
      buttonContainer.style.marginTop = '12px';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.padding = '8px 16px';
      cancelBtn.style.border = '1px solid #ccc';
      cancelBtn.style.borderRadius = '4px';
      cancelBtn.style.cursor = 'pointer';
      cancelBtn.onclick = () => {
        document.body.removeChild(modal);
        setIsEditing(false);
      };

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.style.padding = '8px 16px';
      saveBtn.style.border = 'none';
      saveBtn.style.borderRadius = '4px';
      saveBtn.style.backgroundColor = '#2563eb';
      saveBtn.style.color = 'white';
      saveBtn.style.cursor = 'pointer';
      saveBtn.onclick = () => {
        let htmlContent = quill.root.innerHTML;
        
        // Clean up Quill's automatic <p> wrapping for simple text
        if (htmlContent.startsWith('<p>') && htmlContent.endsWith('</p>') && !htmlContent.includes('</p><p>')) {
          htmlContent = htmlContent.slice(3, -4); // Remove <p> and </p>
        }
        
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            id: element.id,
            updates: { text: htmlContent }
          }
        });
        document.body.removeChild(modal);
        setIsEditing(false);
      };

      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(saveBtn);

      container.appendChild(editorContainer);
      container.appendChild(buttonContainer);
      modal.appendChild(container);
      
      document.body.appendChild(modal);
      
      // Initialize Quill after DOM is attached
      const userColors = [
        '#000000', '#e60000', '#ff9900', '#ffff00', '#008a00', '#0066cc', 
        '#9933ff', '#ffffff', '#facccc', '#ffebcc', '#ffffcc', '#cce8cc', 
        '#cce0f5', '#ebd6ff', '#bbbbbb', '#f06666', '#ffc266', '#ffff66', 
        '#66b966', '#66a3e0', '#c285ff', '#888888', '#a10000', '#b26b00', 
        '#b2b200', '#006100', '#0047b2', '#6b24b2', '#444444', '#5c0000'
      ];
      
      const quill = new window.Quill(editorContainer, {
        theme: 'snow',
        modules: {
          toolbar: {
            container: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline'],
              [{ 'color': userColors }],
              ['clean']
            ]
          }
        }
      });
      
      // Set initial content
      if (element.text) {
        quill.root.innerHTML = element.text;
      }
      
      quill.focus();
      
      // Handle escape key
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          document.body.removeChild(modal);
          setIsEditing(false);
        }
      };
      
      modal.addEventListener('keydown', handleKeyDown);
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
    >
      {/* Background rectangle - this defines the selection bounds */}
      <Rect
        width={element.width}
        height={element.height}
        fill="rgba(255, 255, 255, 0.8)"
        stroke={isSelected ? '#2563eb' : '#d1d5db'}
        strokeWidth={1}
        cornerRadius={4}
        name="selectableRect"
      />
      
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
      
      {/* Text content with clipping */}
      <Group
        clipX={0}
        clipY={0}
        clipWidth={element.width}
        clipHeight={element.height}
      >
        {element.text && (element.text.includes('<') && (element.text.includes('<strong>') || element.text.includes('<em>') || element.text.includes('<u>') || element.text.includes('color:') || element.text.includes('<h'))) ? (
          <>
            {formatRichText(element.text, fontSize, fontFamily, element.width - 8).map((textPart, index) => (
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
          />
        )}
      </Group>
      

    </Group>
  );
}