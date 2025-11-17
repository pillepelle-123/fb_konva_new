import { useState, useEffect, useMemo, useRef } from 'react';
import { Rect, Image as KonvaImage, Group, Line, Path } from 'react-konva';
import Konva from 'konva';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';
import { getThemeRenderer } from '../../../../utils/themes';
import type { CanvasElement } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';

type ClipPosition = 
  | 'left-top' 
  | 'left-middle' 
  | 'left-bottom'
  | 'center-top' 
  | 'center-middle' 
  | 'center-bottom'
  | 'right-top' 
  | 'right-middle' 
  | 'right-bottom';

interface CropResult {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}

/**
 * Berechnet die Crop-Eigenschaften für ein Bild, damit es ohne Verzerrung in den verfügbaren Bereich passt.
 * Basierend auf: https://konvajs.org/docs/sandbox/Scale_Image_To_Fit.html
 */
export function getCrop(
  image: HTMLImageElement, 
  size: { width: number; height: number }, 
  clipPosition: ClipPosition = 'center-middle'
): CropResult {
  const width = size.width;
  const height = size.height;
  const aspectRatio = width / height;

  let newWidth: number;
  let newHeight: number;

  const imageRatio = image.width / image.height;

  if (aspectRatio >= imageRatio) {
    // Container ist breiter als das Bild (relativ)
    newWidth = image.width;
    newHeight = image.width / aspectRatio;
  } else {
    // Container ist höher als das Bild (relativ)
    newWidth = image.height * aspectRatio;
    newHeight = image.height;
  }

  let x = 0;
  let y = 0;

  switch (clipPosition) {
    case 'left-top':
      x = 0;
      y = 0;
      break;
    case 'left-middle':
      x = 0;
      y = (image.height - newHeight) / 2;
      break;
    case 'left-bottom':
      x = 0;
      y = image.height - newHeight;
      break;
    case 'center-top':
      x = (image.width - newWidth) / 2;
      y = 0;
      break;
    case 'center-middle':
      x = (image.width - newWidth) / 2;
      y = (image.height - newHeight) / 2;
      break;
    case 'center-bottom':
      x = (image.width - newWidth) / 2;
      y = image.height - newHeight;
      break;
    case 'right-top':
      x = image.width - newWidth;
      y = 0;
      break;
    case 'right-middle':
      x = image.width - newWidth;
      y = (image.height - newHeight) / 2;
      break;
    case 'right-bottom':
      x = image.width - newWidth;
      y = image.height - newHeight;
      break;
    default:
      x = (image.width - newWidth) / 2;
      y = (image.height - newHeight) / 2;
  }

  return {
    cropX: x,
    cropY: y,
    cropWidth: newWidth,
    cropHeight: newHeight,
  };
}

export default function Image(props: CanvasItemProps) {
  const { element, zoom = 1 } = props;
  const { token } = useAuth();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<Konva.Image>(null);
  const [transformSize, setTransformSize] = useState<{ width: number; height: number } | null>(null);
  const isTransformingRef = useRef(false);

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

  // Höre auf Transform-Events, um die Crop-Eigenschaften während der Transformation dynamisch zu aktualisieren
  useEffect(() => {
    const handleTransformStart = (e: CustomEvent) => {
      if (e.detail.elementId === element.id) {
        isTransformingRef.current = true;
      }
    };
    
    const handleTransform = (e: CustomEvent) => {
      if (e.detail.elementId === element.id && image && imageRef.current) {
        // Use size from event detail if available, otherwise calculate from node
        let currentWidth: number;
        let currentHeight: number;
        
        if (e.detail.width !== undefined && e.detail.height !== undefined) {
          currentWidth = e.detail.width;
          currentHeight = e.detail.height;
        } else {
          const node = imageRef.current;
          currentWidth = node.width() * node.scaleX();
          currentHeight = node.height() * node.scaleY();
        }
        
        setTransformSize({ width: currentWidth, height: currentHeight });
        
        // Aktualisiere die Crop-Eigenschaften direkt auf dem Node für nahtlose Transformation
        // Das Bild behält seine ursprüngliche Größe, aber die Crop-Eigenschaften werden basierend
        // auf der skalierten Größe berechnet
        const node = imageRef.current;
        const clipPosition: ClipPosition = (element.imageClipPosition as ClipPosition) || 'center-middle';
        const crop = getCrop(image, { width: currentWidth, height: currentHeight }, clipPosition);
        
        // Setze die Crop-Eigenschaften direkt auf dem Node
        node.cropX(crop.cropX);
        node.cropY(crop.cropY);
        node.cropWidth(crop.cropWidth);
        node.cropHeight(crop.cropHeight);
        
        // Force redraw
        node.getLayer()?.batchDraw();
      }
    };
    
    const handleTransformEnd = (e: CustomEvent) => {
      if (e.detail.elementId === element.id) {
        isTransformingRef.current = false;
        setTransformSize(null);
      }
    };
    
    window.addEventListener('transformStart', handleTransformStart as EventListener);
    window.addEventListener('transform', handleTransform as EventListener);
    window.addEventListener('transformEnd', handleTransformEnd as EventListener);
    
    return () => {
      window.removeEventListener('transformStart', handleTransformStart as EventListener);
      window.removeEventListener('transform', handleTransform as EventListener);
      window.removeEventListener('transformEnd', handleTransformEnd as EventListener);
    };
  }, [element.id, image, element.imageClipPosition]);

  // Berechne die Crop-Eigenschaften für das Bild, damit es ohne Verzerrung skaliert wird
  // Verwende transformSize während der Transformation, sonst element.width/height
  const cropProps = useMemo(() => {
    if (!image || element.type !== 'image') {
      return null;
    }

    const clipPosition: ClipPosition = (element.imageClipPosition as ClipPosition) || 'center-middle';
    const size = transformSize || { width: element.width, height: element.height };
    return getCrop(
      image,
      size,
      clipPosition
    );
  }, [image, element.width, element.height, element.type, element.imageClipPosition, transformSize]);

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
          {/* Image with opacity and crop for proper scaling */}
          {image && (
            <KonvaImage
              ref={imageRef}
              image={image}
              width={element.width}
              height={element.height}
              cornerRadius={element.cornerRadius || 0}
              opacity={element.imageOpacity !== undefined ? element.imageOpacity : 1}
              listening={false}
              {...(cropProps ? {
                cropX: cropProps.cropX,
                cropY: cropProps.cropY,
                cropWidth: cropProps.cropWidth,
                cropHeight: cropProps.cropHeight,
              } : {})}
              onTransform={() => {
                // Wichtig: Reset scale und aktualisiere width/height während der Transformation
                // Basierend auf: https://konvajs.org/docs/sandbox/Scale_Image_To_Fit.html
                if (imageRef.current && image) {
                  const node = imageRef.current;
                  const scaleX = node.scaleX();
                  const scaleY = node.scaleY();
                  
                  // Reset scale to 1 and update width/height based on scaled size
                  const newWidth = Math.max(5, node.width() * scaleX);
                  const newHeight = Math.max(5, node.height() * scaleY);
                  
                  node.setAttrs({
                    scaleX: 1,
                    scaleY: 1,
                    width: newWidth,
                    height: newHeight,
                  });
                  
                  // Apply crop with new size
                  const clipPosition: ClipPosition = (element.imageClipPosition as ClipPosition) || 'center-middle';
                  const crop = getCrop(image, { width: newWidth, height: newHeight }, clipPosition);
                  
                  node.setAttrs({
                    cropX: crop.cropX,
                    cropY: crop.cropY,
                    cropWidth: crop.cropWidth,
                    cropHeight: crop.cropHeight,
                  });
                }
              }}
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