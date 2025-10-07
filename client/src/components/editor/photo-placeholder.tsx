import { useRef, useState } from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { useAuth } from '../../context/auth-context';
import { useEditor } from '../../context/editor-context';
import type { CanvasElement } from '../../context/editor-context';
import { SelectionHoverRectangle } from './canvas/selection-hover-rectangle';

interface PhotoPlaceholderProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  isMovingGroup?: boolean;
}

export default function PhotoPlaceholder({ element, isSelected, onSelect, onDragEnd, isMovingGroup }: PhotoPlaceholderProps) {
  const { token } = useAuth();
  const { state, dispatch } = useEditor();
  const groupRef = useRef<Konva.Group>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    onSelect();
  };

  const handleDoubleClick = () => {
    // Only allow upload if it's a placeholder
    if (element.type === 'placeholder') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = handleFileUpload;
      input.click();
    }
  };

  const handleFileUpload = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        
        // Load the image
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setImage(img);
          
          // Update element to image type
          dispatch({
            type: 'UPDATE_ELEMENT',
            payload: {
              id: element.id,
              updates: {
                type: 'image',
                src: data.url
              }
            }
          });
        };
        img.src = data.url;
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Load existing image
  if (element.type === 'image' && element.src && !image) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.src = element.src;
  }

  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation || 0}
      scaleX={element.scaleX || 1}
      scaleY={element.scaleY || 1}
      draggable={state.activeTool === 'select' && !isMovingGroup}
      onClick={state.activeTool === 'select' ? handleClick : undefined}
      onTap={state.activeTool === 'select' ? handleClick : undefined}
      onDblClick={state.activeTool === 'select' ? handleDoubleClick : undefined}
      onDblTap={state.activeTool === 'select' ? handleDoubleClick : undefined}
      onDragEnd={onDragEnd}
      onMouseEnter={state.activeTool === 'select' ? () => setIsHovered(true) : undefined}
      onMouseLeave={state.activeTool === 'select' ? () => setIsHovered(false) : undefined}
    >
      {element.type === 'placeholder' ? (
        <>
          {/* Background rectangle - transparent like textbox */}
          <Rect
            width={element.width}
            height={element.height}
            fill="transparent"
            stroke={isSelected ? '#2563eb' : 'transparent'}
            strokeWidth={1}
            cornerRadius={4}
          />
          
          {/* Hover border - same as textbox */}
          {isHovered && state.activeTool === 'select' && (
            <SelectionHoverRectangle
              width={element.width}
              height={element.height}
              cornerRadius={8}
            />
          )}
          
          {/* Placeholder text - same styling as textbox */}
          <Text
            text={isUploading ? "Uploading..." : "Double-click to chose photo"}
            fontSize={66}
            // fontFamily="Arial, sans-serif"
            fill="#1f2937"
            width={element.width - 8}
            height={element.height - 8}
            x={4}
            y={4}
            align="center"
            verticalAlign="top"
            opacity={0.6}
            listening={false}
            name='no-print'
          />
        </>
      ) : (
        <>
          {image && (
            <KonvaImage
              image={image}
              width={element.width}
              height={element.height}
              stroke={isSelected ? '#2563eb' : 'transparent'}
              strokeWidth={isSelected ? 2 : 0}
            />
          )}
          {!image && (
            <Rect
              width={element.width}
              height={element.height}
              fill="#f3f4f6"
              stroke="#d1d5db"
              strokeWidth={1}
            />
          )}
        </>
      )}
    </Group>
  );
}