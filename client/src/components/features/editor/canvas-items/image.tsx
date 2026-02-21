import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Rect, Image as KonvaImage, Group, Line } from 'react-konva';
import Konva from 'konva';
import BaseCanvasItem from './base-canvas-item';
import type { CanvasItemProps } from './base-canvas-item';
import { getThemeRenderer } from '../../../../utils/themes-client';
import { renderThemedBorder, createRectPath } from '../../../../utils/themed-border';
import type { CanvasElement } from '../../../../context/editor-context';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { getAdaptiveImageUrl, type AdaptiveImageOptions } from '../../../../utils/image-resolution-utils';

// Feature Flag for Adaptive Image Resolution
const ADAPTIVE_IMAGE_RESOLUTION_ENABLED = process.env.NODE_ENV === 'development'
  ? localStorage.getItem('adaptive-image-resolution') !== 'false' // Default true in dev, can be disabled
  : true; // Always enabled in production

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

interface ImageProps extends CanvasItemProps {
  overlay?: ReactNode;
}

export default function Image(props: ImageProps) {
  const { element, zoom = 1, overlay, ...baseProps } = props;

  // Feature Flag for Adaptive Image Resolution (serve images at optimal resolution based on zoom)
  const ADAPTIVE_IMAGE_RESOLUTION_ENABLED = process.env.NODE_ENV === 'development'
    ? localStorage.getItem('adaptive-image-resolution') !== 'false' // Default true in dev, can be disabled
    : true; // Always enabled in production
  const { token } = useAuth();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<Konva.Image>(null);
  // State für die aktuelle Größe - genau wie in der React-Konva-Lösung
  const [size, setSize] = useState({ width: element.width || 150, height: element.height || 100 });
  // Ref to track if we're currently transforming to avoid frame size issues during resize
  const isTransformingRef = useRef(false);
  // State to track if we're currently transforming (for hiding frame)
  const [isTransforming, setIsTransforming] = useState(false);
  const [isImageHovered, setIsImageHovered] = useState(false);

  // Get color palette defaults for consistent frame coloring (same as QnA borders)
  const { state } = useEditor();
  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
  const pageLayoutTemplateId = currentPage?.layoutTemplateId;
  const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
  const pageColorPaletteId = currentPage?.colorPaletteId;
  const bookColorPaletteId = state.currentBook?.colorPaletteId;

  const qnaDefaults = useMemo(() => {
    const activeTheme = pageTheme || bookTheme || 'default';
    const effectivePaletteId = pageColorPaletteId || bookColorPaletteId;
    return getGlobalThemeDefaults(activeTheme, 'qna', effectivePaletteId);
  }, [
    pageTheme,
    bookTheme,
    pageColorPaletteId,
    bookColorPaletteId
  ]);

  const handleDoubleClick = () => {
    // Don't open modals in non-interactive mode (e.g., PDF export)
    if (props.interactive === false) return;
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
    } else if (element.type === 'sticker') {
      // Open sticker selector modal
      window.dispatchEvent(new CustomEvent('openStickerModal', {
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
    if ((element.type === 'image' || element.type === 'sticker') && element.src) {
      const src = element.src;
      const isProtectedImageUrl = src.includes('/api/images/file/');
      const isProtectedStickerUrl = src.includes('/api/stickers/');
      const isProtectedBgImageUrl = src.includes('/api/background-images/');
      const isProtectedUrl = isProtectedImageUrl || isProtectedStickerUrl || isProtectedBgImageUrl;

      const loadImage = (url: string) => {
        let imageUrl = url;
        imageUrl = getAdaptiveImageUrl(imageUrl, {
          zoom: zoom || 1,
          enabled: ADAPTIVE_IMAGE_RESOLUTION_ENABLED
        });
        const img = new window.Image();
        const isLocalUrl = url.startsWith('http://localhost') || url.startsWith('https://localhost') ||
                          url.startsWith('http://127.0.0.1') || url.startsWith('https://127.0.0.1') ||
                          (!url.startsWith('http://') && !url.startsWith('https://'));
        if (!isLocalUrl && !url.startsWith('/')) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => setImage(img);
        img.onerror = (error) => {
          console.warn('Failed to load image, trying fallback:', error);
          const fallbackImg = new window.Image();
          fallbackImg.onload = () => setImage(fallbackImg);
          fallbackImg.onerror = () => console.error('Failed to load image:', url);
          fallbackImg.src = url;
        };
        img.src = imageUrl;
      };

      if (isProtectedUrl && token) {
        fetch(src, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
          .then((res) => {
            if (!res.ok) throw new Error('Failed to fetch image');
            return res.blob();
          })
          .then((blob) => {
            const objectUrl = URL.createObjectURL(blob);
            const img = new window.Image();
            img.onload = () => {
              setImage(img);
              URL.revokeObjectURL(objectUrl);
            };
            img.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              loadImage(src);
            };
            img.src = objectUrl;
          })
          .catch(() => loadImage(src));
      } else {
        loadImage(src);
      }
    } else {
      setImage(null);
    }
  }, [element.type, element.src, token, zoom, ADAPTIVE_IMAGE_RESOLUTION_ENABLED]);

  // onTransform Handler direkt auf dem Image-Node - genau wie in der React-Konva-Lösung
  // Basierend auf: https://konvajs.org/docs/sandbox/Scale_Image_To_Fit.html
  const handleTransform = () => {
    if (!imageRef.current) return;
    
    isTransformingRef.current = true;
    const node = imageRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale to 1 and update width/height - genau wie in der Konva.js-Lösung
    node.scaleX(1);
    node.scaleY(1);
    setSize({
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
    });
  };

  // Crop wird über useMemo berechnet, genau wie in der React-Konva-Lösung
  const crop = useMemo(() => {
    if (!image) return null;
    const clipPosition: ClipPosition = (element.imageClipPosition as ClipPosition) || 'center-middle';
    return getCrop(image, size, clipPosition);
  }, [image, size, element.imageClipPosition]);

  const imageQuality = useMemo(() => {
    if (!image) return null;

    const displayWidth = size.width || element.width || 0;
    const displayHeight = size.height || element.height || 0;

    if (displayWidth <= 0 || displayHeight <= 0) return null;

    const scaleX = image.width / displayWidth;
    const scaleY = image.height / displayHeight;
    const scale = Math.min(scaleX, scaleY);
    const targetDpi = 300;
    const warningDpi = 200;
    const warningScale = warningDpi / targetDpi;
    const estimatedDpi = Math.round(targetDpi * scale);

    if (scale >= 1) {
      return {
        status: 'good' as const,
        color: '#22c55e',
        text: `Druckqualitaet ausreichend (ca. ${estimatedDpi} DPI)`
      };
    }

    if (scale >= warningScale) {
      return {
        status: 'warn' as const,
        color: '#f59e0b',
        text: `Druckqualitaet grenzwertig (ca. ${estimatedDpi} DPI)`
      };
    }

    return {
      status: 'bad' as const,
      color: '#ef4444',
      text: `Druckqualitaet zu niedrig (ca. ${estimatedDpi} DPI)`
    };
  }, [image, size.width, size.height, element.width, element.height]);

  // Update size when element dimensions change (but not during active transformation)
  // Also include rotation in dependencies to ensure frame updates correctly when rotation changes
  useEffect(() => {
    if (!isTransformingRef.current) {
      setSize({ width: element.width || 150, height: element.height || 100 });
    }
  }, [element.width, element.height, element.rotation]);

  // Calculate crop values for PDF export consistency
  // Note: crop values are calculated on-demand during book save, not stored persistently
  // This ensures they are always up-to-date with the current image and element dimensions
  
  // Listen for imageTransform event from canvas to update size during resize
  // This is needed because the Transformer is now on the Group, not the Image node
  useEffect(() => {
    const handleImageTransform = (e: CustomEvent) => {
      if (e.detail?.elementId === element.id) {
        isTransformingRef.current = true;
        setIsTransforming(true);
        // Update size state - this will trigger crop recalculation via useMemo
        // The size is calculated from Group scale in canvas.tsx
        // DO NOT modify Image node directly - let React-Konva handle it via width/height props
        setSize({
          width: e.detail.width,
          height: e.detail.height
        });
      }
    };
    
    // Listen for imageTransform event from canvas
    window.addEventListener('imageTransform', handleImageTransform as EventListener);
    
    return () => {
      window.removeEventListener('imageTransform', handleImageTransform as EventListener);
    };
  }, [element.id]);
  
  // Reset transformation flag after transform ends
  useEffect(() => {
    const handleTransformEnd = (e: CustomEvent) => {
      if (e.detail?.elementId === element.id) {
        // Small delay to ensure state updates are processed before resetting flag
        // This prevents race conditions between rotation and resize operations
        setTimeout(() => {
          isTransformingRef.current = false;
          setIsTransforming(false);
        }, 0);
      }
    };
    
    // Listen for transformEnd event from canvas
    window.addEventListener('transformEnd', handleTransformEnd as EventListener);
    
    return () => {
      window.removeEventListener('transformEnd', handleTransformEnd as EventListener);
    };
  }, [element.id]);

  const handleImageHoverEnd = () => {
    setIsImageHovered(false);
    window.dispatchEvent(new CustomEvent('imageQualityTooltipHide'));
  };

  return (
    <BaseCanvasItem
      {...baseProps}
      element={element}
      onDoubleClick={handleDoubleClick}
      onDragStart={(e) => {
        handleImageHoverEnd();
        baseProps.onDragStart?.(e);
      }}
      onMouseEnter={() => setIsImageHovered(true)}
      onMouseLeave={handleImageHoverEnd}
    >
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
              width={element.width || 150}
              height={element.height || 100}
              cornerRadius={element.cornerRadius || 0}
              opacity={element.imageOpacity !== undefined ? element.imageOpacity : 1}
              listening={false}
              onTransform={handleTransform}
              {...(crop ? {
                cropX: crop.cropX,
                cropY: crop.cropY,
                cropWidth: crop.cropWidth,
                cropHeight: crop.cropHeight,
              } : {})}
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
          {image && !isTransforming && (() => {
            const frameEnabled = element.type === 'sticker'
              ? false
              : (element.frameEnabled !== undefined
                ? element.frameEnabled
                : (element.strokeWidth || 0) > 0);
            const strokeWidth = element.strokeWidth || 0;
            const borderOpacity = element.borderOpacity !== undefined ? element.borderOpacity : 1;
            const frameTheme = element.frameTheme || element.theme || 'default';
            const cornerRadius = element.cornerRadius || 0;

            const stroke = element.borderColor || qnaDefaults.borderColor || '#1f2937';
            
            if (!frameEnabled || strokeWidth === 0) {
              return null;
            }
            
            // Get current frame dimensions - use size during transformation, element dimensions otherwise
            // This ensures the frame matches the image size exactly and rotates correctly
            const frameWidth = size.width;
            const frameHeight = size.height;
            
            const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
            
            const frameElement = renderThemedBorder({
              width: strokeWidth,
              color: stroke,
              opacity: borderOpacity,
              cornerRadius: cornerRadius,
              path: createRectPath(0, 0, frameWidth, frameHeight),
              theme: frameTheme as any,
              themeSettings: {
                roughness: frameTheme === 'rough' ? 8 : undefined,
                seed: seed
              },
              zoom: zoom,
              strokeScaleEnabled: true,
              listening: false
            });

            // Fallback to simple Rect for default theme or if theme rendering fails
            if (!frameElement) {
              return (
                <Rect
                  width={frameWidth}
                  height={frameHeight}
                  fill="transparent"
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  opacity={borderOpacity}
                  cornerRadius={cornerRadius}
                  strokeScaleEnabled={true}
                  listening={false}
                />
              );
            }

            return frameElement;
          })()}

          {image && imageQuality && element.type === 'image' && !isTransforming && !props.isDragging && isImageHovered && (() => {
            const CORNER_SIZE = 50;

            const handleQualityTooltip = (evt: Konva.KonvaEventObject<MouseEvent>) => {
              const groupNode = imageRef.current?.getParent();
              const stage = evt.target.getStage();
              if (!groupNode || !stage) return;

              const pointerPos = stage.getPointerPosition();
              if (!pointerPos) return;

              const imgWidth = size.width || element.width || 0;
              const transform = evt.target.getAbsoluteTransform().copy().invert();
              const localPos = transform.point(pointerPos);
              const isInCorner = localPos.x > imgWidth - CORNER_SIZE && localPos.y < CORNER_SIZE;

              const stageBox = stage.container().getBoundingClientRect();
              const topRightCanvas = groupNode.getAbsoluteTransform().point({ x: imgWidth, y: 0 });
              const screenX = stageBox.left + topRightCanvas.x;
              const screenY = stageBox.top + topRightCanvas.y;

              window.dispatchEvent(new CustomEvent('imageQualityTooltip', {
                detail: {
                  text: isInCorner ? imageQuality.text : undefined,
                  color: imageQuality.color,
                  screenX,
                  screenY
                }
              }));
            };

            const handleQualityTooltipHide = () => {
              window.dispatchEvent(new CustomEvent('imageQualityTooltipHide'));
            };

            const imgWidth = size.width || element.width || 0;
            const imgHeight = size.height || element.height || 0;

            return (
              <Group
                listening={true}
                onMouseEnter={handleQualityTooltip}
                onMouseMove={handleQualityTooltip}
                onMouseLeave={handleQualityTooltipHide}
              >
                <Rect
                  x={0}
                  y={0}
                  width={imgWidth}
                  height={imgHeight}
                  fill="transparent"
                  listening={true}
                />
              </Group>
            );
          })()}
        </>
      )}
      {overlay}
    </BaseCanvasItem>
  );
}
