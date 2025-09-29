import { useRef, useState, useEffect } from 'react';
import { Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { useEditor } from '../../context/EditorContext';
import type { CanvasElement } from '../../context/EditorContext';

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
    
    // Create HTML overlay for editing
    const stage = groupRef.current?.getStage();
    if (!stage) return;

    const stageBox = stage.container().getBoundingClientRect();
    const groupPos = groupRef.current?.getAbsolutePosition();
    if (!groupPos) return;

    const overlay = document.createElement('div');
    overlay.contentEditable = 'true';
    overlay.innerHTML = element.text || '';
    overlay.style.position = 'absolute';
    overlay.style.left = `${stageBox.left + groupPos.x * scale}px`;
    overlay.style.top = `${stageBox.top + groupPos.y * scale}px`;
    overlay.style.width = `${element.width * scale}px`;
    overlay.style.height = `${element.height * scale}px`;
    overlay.style.fontSize = `${fontSize * scale}px`;
    overlay.style.fontFamily = fontFamily;
    overlay.style.lineHeight = lineHeight.toString();
    overlay.style.textAlign = align;
    overlay.style.color = element.fill || '#000';
    overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    overlay.style.border = '2px solid #2563eb';
    overlay.style.borderRadius = '4px';
    overlay.style.padding = '4px';
    overlay.style.outline = 'none';
    overlay.style.overflow = 'hidden';
    overlay.style.zIndex = '1000';

    document.body.appendChild(overlay);
    overlay.focus();

    const handleBlur = () => {
      const newText = overlay.innerText;
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          id: element.id,
          updates: { text: newText }
        }
      });
      document.body.removeChild(overlay);
      setIsEditing(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.body.removeChild(overlay);
        setIsEditing(false);
      }
    };

    overlay.addEventListener('blur', handleBlur);
    overlay.addEventListener('keydown', handleKeyDown);
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
      
      {/* Text content */}
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