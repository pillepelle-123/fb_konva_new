import { useState } from 'react';
import { Rect, Text, Image as KonvaImage } from 'react-konva';
import { useAuth } from '../../../../context/auth-context';
import { useEditor } from '../../../../context/editor-context';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';

export default function Photo(props: CanvasItemProps) {
  const { element } = props;
  const { token } = useAuth();
  const { dispatch } = useEditor();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
    <BaseCanvasItem {...props} onDoubleClick={handleDoubleClick}>
      {element.type === 'placeholder' ? (
        <>
          {/* Background rectangle - transparent like textbox */}
          <Rect
            width={element.width}
            height={element.height}
            fill="transparent"
            stroke="transparent"
            strokeWidth={1}
            cornerRadius={4}
            listening={false}
          />
          

          
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
              listening={false}
            />
          )}
          {!image && (
            <Rect
              width={element.width}
              height={element.height}
              fill="#f3f4f6"
              stroke="#d1d5db"
              strokeWidth={1}
              listening={false}
            />
          )}
        </>
      )}
    </BaseCanvasItem>
  );
}