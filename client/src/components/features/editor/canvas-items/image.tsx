import { useState, useEffect } from 'react';
import { Rect, Image as KonvaImage, Group, Line, Path } from 'react-konva';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';
import { getThemeRenderer } from '../../../../utils/themes';
import type { CanvasElement } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';

export default function Image(props: CanvasItemProps) {
  const { element, zoom = 1 } = props;
  const { token } = useAuth();
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  const handleDoubleClick = () => {
    if (element.type === 'placeholder') {
      // Dispatch custom event to open image modal in canvas
      window.dispatchEvent(new CustomEvent('openImageModal', {
        detail: {
          elementId: element.id,
          position: {
            x: element.x,
            y: element.y
          }
        }
      }));
    }
  };

  // Load existing image when src changes
  useEffect(() => {
    if (element.type === 'image' && element.src) {
      // Check if this is an S3 URL that might have CORS issues
      const isS3Url = element.src.includes('s3.amazonaws.com') || element.src.includes('s3.us-east-1.amazonaws.com');
      
      // For S3 URLs, use the proxy endpoint to avoid CORS issues
      // Include token as query parameter for authentication
      let imageUrl = element.src;
      if (isS3Url && token) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        imageUrl = `${apiUrl}/images/proxy?url=${encodeURIComponent(element.src)}&token=${encodeURIComponent(token)}`;
      }
      
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setImage(img);
      img.onerror = (error) => {
        console.warn('Failed to load image with CORS, trying without:', error);
        // Fallback: try loading without CORS (only for non-S3 URLs)
        if (!isS3Url) {
          const fallbackImg = new window.Image();
          fallbackImg.onload = () => setImage(fallbackImg);
          fallbackImg.onerror = () => console.error('Failed to load image:', element.src);
          fallbackImg.src = element.src;
        } else {
          console.error('Failed to load S3 image through proxy:', element.src);
        }
      };
      img.src = imageUrl;
    } else {
      setImage(null);
    }
  }, [element.type, element.src, token]);

  return (
    <BaseCanvasItem {...props} onDoubleClick={handleDoubleClick}>
      {element.type === 'placeholder' ? (
        <>
          {/* Hellgrauer Hintergrund */}
          <Rect
            width={element.width}
            height={element.height}
            fill="#f3f4f6"
            stroke="#e5e7eb"
            strokeWidth={1}
            cornerRadius={element.cornerRadius || 4}
            listening={false}
          />
          
          {/* Image-Plus Icon in dunklerem Grau */}
          <Group
            x={element.width / 2}
            y={element.height / 2}
            listening={false}
          >
            {/* Bild-Rahmen (vereinfachtes Icon) */}
            <Rect
              x={-element.width * 0.15}
              y={-element.height * 0.15}
              width={element.width * 0.3}
              height={element.height * 0.3}
              fill="transparent"
              stroke="#9ca3af"
              strokeWidth={2}
              cornerRadius={2}
              listening={false}
            />
            {/* Plus-Zeichen */}
            <Line
              points={[0, -element.height * 0.08, 0, element.height * 0.08]}
              stroke="#9ca3af"
              strokeWidth={2}
              lineCap="round"
              listening={false}
            />
            <Line
              points={[-element.width * 0.08, 0, element.width * 0.08, 0]}
              stroke="#9ca3af"
              strokeWidth={2}
              lineCap="round"
              listening={false}
            />
          </Group>
        </>
      ) : (
        <>
          {/* Image with opacity */}
          {image && (
            <KonvaImage
              image={image}
              width={element.width}
              height={element.height}
              cornerRadius={element.cornerRadius || 0}
              opacity={element.imageOpacity !== undefined ? element.imageOpacity : 1}
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
          
          {/* Frame around image */}
          {image && (() => {
            const frameEnabled = element.frameEnabled !== undefined 
              ? element.frameEnabled 
              : (element.strokeWidth || 0) > 0;
            const strokeWidth = element.strokeWidth || 0;
            const stroke = element.stroke || '#1f2937';
            const strokeOpacity = element.strokeOpacity !== undefined ? element.strokeOpacity : 1;
            const frameTheme = element.frameTheme || element.theme || 'default';
            const cornerRadius = element.cornerRadius || 0;
            
            if (!frameEnabled || strokeWidth === 0) {
              return null;
            }
            
            // Use theme renderer for consistent frame rendering
            // Pass zoom to generatePath and getStrokeProps for proper scaling
            // Use strokeScaleEnabled={false} so zoom is handled manually (consistent with themed-shape.tsx)
            const themeRenderer = getThemeRenderer(frameTheme);
            if (themeRenderer && frameTheme !== 'default') {
              // Create a temporary element-like object for generatePath
              const frameElement = {
                type: 'rect' as const,
                id: element.id + '-frame',
                x: 0,
                y: 0,
                width: element.width,
                height: element.height,
                cornerRadius: cornerRadius,
                stroke: stroke,
                strokeWidth: strokeWidth,
                fill: 'transparent'
              } as CanvasElement;
              
              // Pass zoom to generatePath and getStrokeProps for proper scaling
              const pathData = themeRenderer.generatePath(frameElement, zoom);
              const strokeProps = themeRenderer.getStrokeProps(frameElement, zoom);
              
              if (pathData) {
                return (
                  <Path
                    data={pathData}
                    stroke={strokeProps.stroke || stroke}
                    strokeWidth={strokeProps.strokeWidth || strokeWidth}
                    opacity={strokeOpacity}
                    fill="transparent"
                    strokeScaleEnabled={false}
                    listening={false}
                    lineCap="round"
                    lineJoin="round"
                  />
                );
              }
            }
            
            // Fallback to simple Rect for default theme
            // Manually scale strokeWidth with zoom (consistent with themed-shape.tsx)
            return (
              <Rect
                width={element.width}
                height={element.height}
                fill="transparent"
                stroke={stroke}
                strokeWidth={strokeWidth * zoom}
                opacity={strokeOpacity}
                cornerRadius={cornerRadius}
                strokeScaleEnabled={false}
                listening={false}
              />
            );
          })()}
        </>
      )}
    </BaseCanvasItem>
  );
}