import { useRef, useState, useEffect } from 'react';
import { Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { useEditor } from '../../context/EditorContext';
import type { CanvasElement } from '../../context/EditorContext';

// Rich text formatting function based on Konva demo
function formatRichText(text: string, fontSize: number, fontFamily: string, maxWidth: number) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  
  const lineHeight = fontSize * 1.2;
  const textParts: any[] = [];
  
  // Normalize HTML: convert line breaks to \n while preserving all formatting tags
  const normalizedText = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>\s*<div>/gi, '\n')
    .replace(/^<div>/gi, '')
    .replace(/<\/div>$/gi, '')
    .replace(/<div>/gi, '\n')
    .replace(/<\/div>/gi, '');
    
  const tokens = normalizedText.split(/(<\/?[biu]>|<font[^>]*>|<\/font>|\n)/g).filter(token => token.length > 0);
  
  let currentX = 0;
  let currentY = 0;
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let currentColor = '#000000';
  
  tokens.forEach(token => {
    if (token === '<b>') {
      isBold = true;
    } else if (token === '</b>') {
      isBold = false;
    } else if (token === '<i>') {
      isItalic = true;
    } else if (token === '</i>') {
      isItalic = false;
    } else if (token === '<u>') {
      isUnderline = true;
    } else if (token === '</u>') {
      isUnderline = false;
    } else if (token.startsWith('<font')) {
      // Extract color from font tag
      const colorMatch = token.match(/color=["']([^"']*)["']/i);
      if (colorMatch) {
        currentColor = colorMatch[1];
      }
    } else if (token === '</font>') {
      currentColor = '#000000'; // Reset to default
    } else if (token === '\n') {
      // Line break
      currentX = 0;
      currentY += lineHeight;
    } else if (token && !token.startsWith('<')) {
      // Text content
      const words = token.split(' ');
      
      words.forEach((word, index) => {
        if (index > 0) word = ' ' + word; // Add space back
        
        // Set font for measurement
        const fontStyle = `${isBold ? 'bold ' : ''}${isItalic ? 'italic ' : ''}${fontSize}px ${fontFamily}`;
        context.font = fontStyle;
        
        const wordWidth = context.measureText(word).width;
        
        // Check if word fits on current line
        if (currentX + wordWidth > maxWidth && currentX > 0) {
          currentX = 0;
          currentY += lineHeight;
        }
        
        textParts.push({
          text: word,
          x: currentX,
          y: currentY,
          fontSize,
          fontFamily,
          fontStyle: `${isBold ? 'bold' : ''}${isItalic ? ' italic' : ''}`.trim() || 'normal',
          textDecoration: isUnderline ? 'underline' : '',
          fill: currentColor
        });
        
        currentX += wordWidth;
      });
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

  // Check for text overflow
  useEffect(() => {
    if (textRef.current) {
      const textHeight = textRef.current.height();
      const boxHeight = element.height;
      setHasOverflow(textHeight > boxHeight);
    }
  }, [element.text, element.height, fontSize, lineHeight]);

  const handleDoubleClick = () => {
    if (state.activeTool !== 'select') return;
    
    // Check permissions for editing
    if (element.textType === 'question' && state.currentBook?.owner_id !== state.user?.id) {
      return; // Only admins can edit questions
    }
    
    setIsEditing(true);
    
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
    container.style.minWidth = '400px';
    container.style.maxWidth = '600px';
    container.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.gap = '8px';
    toolbar.style.marginBottom = '12px';
    toolbar.style.padding = '8px';
    toolbar.style.backgroundColor = '#f5f5f5';
    toolbar.style.borderRadius = '4px';
    
    // Text style dropdown
    const styleSelect = document.createElement('select');
    styleSelect.style.padding = '4px 8px';
    styleSelect.style.border = '1px solid #ccc';
    styleSelect.style.borderRadius = '4px';
    styleSelect.innerHTML = `
      <option value="normal">Normal</option>
      <option value="h1">Heading 1</option>
      <option value="h2">Heading 2</option>
      <option value="h3">Heading 3</option>
    `;
    styleSelect.onchange = () => {
      const value = styleSelect.value;
      if (value === 'h1') {
        document.execCommand('fontSize', false, '7');
        document.execCommand('bold');
      } else if (value === 'h2') {
        document.execCommand('fontSize', false, '5');
        document.execCommand('bold');
      } else if (value === 'h3') {
        document.execCommand('fontSize', false, '4');
        document.execCommand('bold');
      } else {
        document.execCommand('fontSize', false, '3');
      }
      overlay.focus();
    };
    
    // Bold button
    const boldBtn = document.createElement('button');
    boldBtn.innerHTML = '<b>B</b>';
    boldBtn.style.border = '1px solid #ccc';
    boldBtn.style.padding = '4px 8px';
    boldBtn.style.cursor = 'pointer';
    boldBtn.style.borderRadius = '4px';
    boldBtn.onmousedown = (e) => {
      e.preventDefault();
      document.execCommand('bold');
    };
    
    // Italic button
    const italicBtn = document.createElement('button');
    italicBtn.innerHTML = '<i>I</i>';
    italicBtn.style.border = '1px solid #ccc';
    italicBtn.style.padding = '4px 8px';
    italicBtn.style.cursor = 'pointer';
    italicBtn.style.borderRadius = '4px';
    italicBtn.onmousedown = (e) => {
      e.preventDefault();
      document.execCommand('italic');
    };
    
    // Underline button
    const underlineBtn = document.createElement('button');
    underlineBtn.innerHTML = '<u>U</u>';
    underlineBtn.style.border = '1px solid #ccc';
    underlineBtn.style.padding = '4px 8px';
    underlineBtn.style.cursor = 'pointer';
    underlineBtn.style.borderRadius = '4px';
    underlineBtn.onmousedown = (e) => {
      e.preventDefault();
      document.execCommand('underline');
    };
    
    // Color picker
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.value = '#000000';
    colorPicker.style.width = '32px';
    colorPicker.style.height = '32px';
    colorPicker.style.border = '1px solid #ccc';
    colorPicker.style.borderRadius = '4px';
    colorPicker.style.cursor = 'pointer';
    colorPicker.onchange = () => {
      document.execCommand('foreColor', false, colorPicker.value);
      overlay.focus();
    };
    
    // Hex color input
    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.placeholder = '#000000';
    hexInput.style.width = '70px';
    hexInput.style.padding = '4px';
    hexInput.style.border = '1px solid #ccc';
    hexInput.style.borderRadius = '4px';
    hexInput.style.fontSize = '12px';
    hexInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const color = hexInput.value;
        if (/^#[0-9A-F]{6}$/i.test(color)) {
          document.execCommand('foreColor', false, color);
          colorPicker.value = color;
        }
        overlay.focus();
      }
    };
    
    toolbar.appendChild(styleSelect);
    toolbar.appendChild(boldBtn);
    toolbar.appendChild(italicBtn);
    toolbar.appendChild(underlineBtn);
    toolbar.appendChild(colorPicker);
    toolbar.appendChild(hexInput);

    // Create text editor
    const overlay = document.createElement('div');
    overlay.contentEditable = 'true';
    // Convert multiple spaces to &nbsp; for proper display in editor
    const editorText = (element.text || '').replace(/ {2,}/g, (match) => {
      return match.replace(/ /g, '&nbsp;');
    });
    overlay.innerHTML = editorText;
    overlay.style.border = '1px solid #ccc';
    overlay.style.borderRadius = '4px';
    overlay.style.padding = '12px';
    overlay.style.minHeight = '150px';
    overlay.style.fontSize = '16px';
    overlay.style.fontFamily = fontFamily;
    overlay.style.lineHeight = '1.4';
    overlay.style.outline = 'none';
    overlay.style.backgroundColor = 'white';

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
      const cleanedText = cleanupHTML(overlay.innerHTML);
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          id: element.id,
          updates: { text: cleanedText }
        }
      });
      document.body.removeChild(modal);
      setIsEditing(false);
    };

    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(saveBtn);

    container.appendChild(toolbar);
    container.appendChild(overlay);
    container.appendChild(buttonContainer);
    modal.appendChild(container);
    
    document.body.appendChild(modal);
    overlay.focus();

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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        setIsEditing(false);
      }
    };

    modal.addEventListener('keydown', handleKeyDown);
  };

  const handleClick = () => {
    if (state.activeTool === 'select') {
      onSelect();
    }
  };

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      draggable={state.activeTool === 'select' && !isEditing && isSelected && !isMovingGroup}
      onClick={handleClick}
      onTap={handleClick}
      onDblClick={handleDoubleClick}
      onDblTap={handleDoubleClick}
      onDragEnd={onDragEnd}
    >
      {/* Background rectangle */}
      <Rect
        width={element.width}
        height={element.height}
        fill="rgba(255, 255, 255, 0.8)"
        stroke={hasOverflow ? '#dc2626' : (isSelected ? '#2563eb' : '#d1d5db')}
        strokeWidth={hasOverflow ? 2 : 1}
        dash={hasOverflow ? [5, 5] : []}
        cornerRadius={4}
      />
      
      {/* Rich text content */}
      {element.text && (element.text.includes('<b>') || element.text.includes('<i>') || element.text.includes('<u>') || element.text.includes('<font')) ? (
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
          height={element.height - 8}
          x={4}
          y={4}
          align={align}
          verticalAlign="top"
          lineHeight={lineHeight}
          wrap="word"
          ellipsis={false}
          opacity={element.text ? 1 : 0.6}
        />
      )}
      
      {/* Overflow warning icon */}
      {hasOverflow && (
        <Text
          text="⚠️"
          fontSize={12}
          x={element.width - 20}
          y={4}
          fill="#dc2626"
        />
      )}
    </Group>
  );
}