import { useRef, useState } from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { useAuth } from '../../context/AuthContext';
import { useEditor } from '../../context/EditorContext';
import type { CanvasElement } from '../../context/EditorContext';

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
      draggable={state.activeTool === 'select' && isSelected && !isMovingGroup}
      onClick={handleClick}
      onTap={handleClick}
      onDblClick={handleDoubleClick}
      onDblTap={handleDoubleClick}
      onDragEnd={onDragEnd}
    >
      {element.type === 'placeholder' ? (
        <>
          <Rect
            width={element.width}
            height={element.height}
            fill="#f3f4f6"
            stroke={isSelected ? '#2563eb' : '#d1d5db'}
            strokeWidth={isSelected ? 2 : 1}
            dash={[5, 5]}
          />
          <Text
            text={isUploading ? "Uploading..." : "📷\nClick to upload"}
            fontSize={36}
            fill="#6b7280"
            width={element.width}
            height={element.height}
            align="center"
            verticalAlign="middle"
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