import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Group, Shape } from 'react-konva';
import Konva from 'konva';
import { useEditor } from '../../context/editor-context.tsx';
import type { Page, Book, CanvasElement } from '../../context/editor-context.tsx';
import CanvasItemComponent from '../features/editor/canvas-items/index.tsx';
import { resolveBackgroundImageUrl } from '../../utils/background-image-utils.ts';
import { useAuth } from './pdf-export-auth-provider';
import { getPalettePartColor } from '../../data/templates/color-palettes.ts';
import { colorPalettes } from '../../data/templates/color-palettes.ts';
import { PATTERNS } from '../../utils/patterns.ts';
import { getToolDefaults } from '../../utils/tool-defaults.ts';
import { getThemeRenderer, renderThemedLine, generateLinePath, type Theme } from '../../utils/themes.ts';
import { getCrop } from '../features/editor/canvas-items/image.tsx';
import type { PageBackground } from '../../context/editor-context.tsx';
import { FEATURE_FLAGS } from '../../utils/feature-flags';
import type { RichTextStyle } from '../../../../shared/types/text-layout';
import { buildFont as sharedBuildFont, getLineHeight as sharedGetLineHeight, measureText as sharedMeasureText, calculateTextX as sharedCalculateTextX, wrapText as sharedWrapText, getBaselineOffset as sharedGetBaselineOffset } from '../../../../shared/utils/text-layout';
import { createLayout as sharedCreateLayout, createBlockLayout as sharedCreateBlockLayout } from '../../../../shared/utils/qna-layout';
import { getFontFamilyByName } from '../../utils/font-families.ts';

interface PDFRendererProps {
  page: Page;
  bookData: Book;
  width: number;
  height: number;
  scale?: number;
  onRenderComplete?: () => void;
}

// Helper function to resolve font family using getFontFamilyByName
// Extracts font name from font family string and resolves it properly
// IMPORTANT: If fontFamilyRaw is already a full CSS string (contains comma), use it directly
// Only use getFontFamilyByName if it's just a font name without fallback
const resolveFontFamily = (fontFamilyRaw: string | undefined, isBold: boolean, isItalic: boolean): string => {
  if (!fontFamilyRaw) {
    return 'Arial, sans-serif';
  }

  // Remove outer quotes but keep internal structure
  let cleaned = fontFamilyRaw.replace(/^['"]|['"]$/g, '').trim();

  // If it's already a full CSS font family string (contains comma), use it directly
  // This matches client-side behavior where fontFamily is stored as full CSS string
  if (cleaned.includes(',')) {
    // Already a full CSS font family string - use it directly (like client does)
    // Ensure font names with spaces are properly quoted for CSS
    const parts = cleaned.split(',').map(part => part.trim());
    if (parts.length > 0) {
      let fontName = parts[0];
      // Remove any existing quotes first (might be malformed like "Mynerve')
      fontName = fontName.replace(/^['"]|['"]$/g, '');
      // If font name contains spaces, quote it
      if (fontName.includes(' ')) {
        parts[0] = `'${fontName}'`;
      } else {
        parts[0] = fontName;
      }
      cleaned = parts.join(', ');
    }
    return cleaned;
  }

  // Otherwise, treat it as a font name and resolve it using getFontFamilyByName
  // This handles cases where only the font name is stored (e.g., "Bauhaus 93")
  try {
    const resolved = getFontFamilyByName(cleaned, isBold, isItalic);
    // Additional fallback: If the resolved font family doesn't match what we expect,
    // try to construct it manually for known Google Fonts
    if (resolved === 'Arial, sans-serif' && cleaned.includes(' ')) {
      // For Google Fonts with spaces, ensure proper quoting
      return `'${cleaned}', cursive`;
    }
    return resolved;
  } catch (error) {
    // Enhanced fallback for Google Fonts
    if (cleaned.includes(' ')) {
      // Likely a Google Font with spaces - quote it properly
      return `'${cleaned}', cursive`;
    }
    // Fallback to cleaned string if getFontFamilyByName fails
    return cleaned || 'Arial, sans-serif';
  }
};

// Helper function to create pattern tile (same as in canvas.tsx)
const createPatternTile = (pattern: typeof PATTERNS[0], color: string, size: number, strokeWidth: number = 1): HTMLCanvasElement => {
  const tileSize = 20 * size;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  
  if (pattern.id === 'dots') {
    ctx.beginPath();
    ctx.arc(tileSize/2, tileSize/2, tileSize * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (pattern.id === 'grid') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tileSize, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, tileSize);
    ctx.stroke();
  } else if (pattern.id === 'diagonal') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, tileSize);
    ctx.lineTo(tileSize, 0);
    ctx.stroke();
  } else if (pattern.id === 'cross') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, tileSize);
    ctx.lineTo(tileSize, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(tileSize, tileSize);
    ctx.stroke();
  } else if (pattern.id === 'waves') {
    ctx.lineWidth = strokeWidth * 2;
    ctx.beginPath();
    ctx.moveTo(0, tileSize/2);
    ctx.quadraticCurveTo(tileSize/4, 0, tileSize/2, tileSize/2);
    ctx.quadraticCurveTo(3*tileSize/4, tileSize, tileSize, tileSize/2);
    ctx.stroke();
  } else if (pattern.id === 'hexagon') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    const centerX = tileSize/2;
    const centerY = tileSize/2;
    const radius = tileSize * 0.3;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  
  return canvas;
};

export function PDFRenderer({
  page,
  bookData,
  width,
  height,
  scale = 1,
  onRenderComplete,
}: PDFRendererProps) {
  // Access editor context - this should work with PDFExportEditorProvider
  const { state } = useEditor();
  // Access auth context to get token for proxy requests
  const { token } = useAuth();
  
  const stageRef = useRef<Konva.Stage>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [patternImage, setPatternImage] = useState<HTMLCanvasElement | null>(null);

  // Expose stage ref globally for Puppeteer screenshot access
  useEffect(() => {
    if (stageRef.current) {
      (window as any).konvaStage = stageRef.current;
    }
    
    return () => {
      if ((window as any).konvaStage === stageRef.current) {
        delete (window as any).konvaStage;
      }
    };
  }, [stageRef.current]);

  // Get palette for page
  const pagePaletteId = page.colorPaletteId || bookData.colorPaletteId;
  const palette = pagePaletteId ? colorPalettes.find(p => p.id === pagePaletteId) : null;
  const normalizedPalette = palette || undefined;
  const palettePatternStroke =
    getPalettePartColor(normalizedPalette, 'pagePatternForeground', 'primary', '#666666') || '#666666';
  const palettePatternFill =
    getPalettePartColor(normalizedPalette, 'pagePatternBackground', 'background', 'transparent') || 'transparent';

  // Helper function to resolve image URL through proxy if it's an S3 URL
  const resolveImageUrlWithProxy = useCallback((imageUrl: string | undefined): string | undefined => {
    if (!imageUrl) return imageUrl;
    
    // Check if this is an S3 URL that might have CORS issues
    const isS3Url = imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('s3.us-east-1.amazonaws.com');
    
    // For S3 URLs, use the proxy endpoint to avoid CORS issues
    if (isS3Url && token) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      return `${apiUrl}/images/proxy?url=${encodeURIComponent(imageUrl)}&token=${encodeURIComponent(token)}`;
    }
    
    // Return original URL if not S3 or no token available
    return imageUrl;
  }, [token]);

  // Load background image if needed
  useEffect(() => {
    const background = page.background;
    if (background?.type === 'image') {
      let imageUrl = resolveBackgroundImageUrl(background, {
        paletteId: pagePaletteId || undefined,
        paletteColors: palette?.colors,
      });

      // Resolve S3 URLs through proxy if token is available
      imageUrl = resolveImageUrlWithProxy(imageUrl);

      if (imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setBackgroundImage(img);
          setImagesLoaded(prev => new Set(prev).add(imageUrl));
        };
        img.onerror = () => {
          console.error('[PDFRenderer] Failed to load background image:', imageUrl);
          setBackgroundImage(null);
        };
        img.src = imageUrl;
      } else {
        setBackgroundImage(null);
      }
    } else {
      setBackgroundImage(null);
    }
  }, [page.background, pagePaletteId, palette, resolveImageUrlWithProxy]);

  // Load pattern tile if needed
  useEffect(() => {
    const background = page.background;
    if (background?.type === 'pattern') {
      const pattern = PATTERNS.find(p => p.id === background.value);
      if (pattern) {
        const patternColor = background.patternBackgroundColor || palettePatternStroke;
        const patternScale = Math.pow(1.5, (background.patternSize || 1) - 1);
        const patternTile = createPatternTile(pattern, patternColor, patternScale, background.patternStrokeWidth || 1);
        setPatternImage(patternTile);
      } else {
        setPatternImage(null);
      }
    } else {
      setPatternImage(null);
    }
  }, [page.background, palettePatternStroke]);

  // Notify when rendering is complete (called after stage is ready)
  useEffect(() => {
    if (!stageRef.current || !onRenderComplete) return;
    
    // Wait for stage to be fully rendered
    const checkComplete = () => {
      if (stageRef.current) {
        const layers = stageRef.current.getLayers();
        if (layers.length > 0) {
          // Force a draw to ensure everything is rendered
          layers.forEach(layer => layer.draw());
          stageRef.current.draw();
          
          // Small delay to ensure all images are loaded and rendered
          setTimeout(() => {
            if (onRenderComplete) {
              onRenderComplete();
            }
          }, 500);
        }
      }
    };
    
    // Check immediately and also after a short delay
    checkComplete();
    const timeoutId = setTimeout(checkComplete, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [stageRef.current, onRenderComplete]);

  // Render page background
  const renderBackground = () => {
    const background: PageBackground | undefined = page.background;
    const backgroundTransform = page.backgroundTransform;
    const transformScale = backgroundTransform?.scale ?? 1;
    const transformOffsetX = (backgroundTransform?.offsetRatioX ?? 0) * width;
    const transformOffsetY = (backgroundTransform?.offsetRatioY ?? 0) * height;
    const mirrorBackground = Boolean(backgroundTransform?.mirror);

    if (!background) {
      return (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="#ffffff"
          listening={false}
        />
      );
    }

    const opacity = background.opacity ?? 1;

    if (background.type === 'color') {
      return (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={background.value || '#ffffff'}
          opacity={opacity}
          listening={false}
        />
      );
    }

    if (background.type === 'pattern') {
      const pattern = PATTERNS.find(p => p.id === background.value);
      if (pattern && patternImage) {
        const spaceColor = background.patternForegroundColor || palettePatternFill;
        const patternOpacity = background.patternBackgroundOpacity ?? 1;

      return (
          <Group listening={false}>
            {spaceColor !== 'transparent' && (
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
                fill={spaceColor}
            opacity={opacity}
            listening={false}
          />
            )}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
              fillPatternImage={patternImage}
              fillPatternRepeat="repeat"
              fillPatternScaleX={mirrorBackground ? -transformScale : transformScale}
              fillPatternScaleY={transformScale}
              fillPatternOffsetX={mirrorBackground ? transformOffsetX - width * transformScale : transformOffsetX}
              fillPatternOffsetY={transformOffsetY}
            opacity={patternOpacity}
            listening={false}
          />
          </Group>
      );
      }
    }

    if (background.type === 'image' && backgroundImage) {
      const hasBackgroundColor = (background as any).backgroundColorEnabled && (background as any).backgroundColor;
      const paletteBackgroundColor = getPalettePartColor(normalizedPalette, 'pageBackground', 'background', '#ffffff') || '#ffffff';
      const baseBackgroundColor = hasBackgroundColor
        ? (background as any).backgroundColor || paletteBackgroundColor
        : paletteBackgroundColor;

      // Calculate scaling based on image size mode
      let fillPatternScaleX = 1;
      let fillPatternScaleY = 1;
      let fillPatternOffsetX = 0;
      let fillPatternOffsetY = 0;
      let fillPatternRepeat: 'repeat' | 'no-repeat' = 'no-repeat';

      const imageWidth = backgroundImage.naturalWidth || backgroundImage.width || 1;
      const imageHeight = backgroundImage.naturalHeight || backgroundImage.height || 1;

      if (background.imageSize === 'cover') {
        const scaleX = width / imageWidth;
        const scaleY = height / imageHeight;
        const scale = Math.max(scaleX, scaleY);
        fillPatternScaleX = fillPatternScaleY = scale;
      } else if (background.imageSize === 'contain') {
        const scaleX = width / imageWidth;
        const scaleY = height / imageHeight;
        const widthPercent = background.imageContainWidthPercent ?? 100;
        const widthRatio = Math.max(0.1, Math.min(2, widthPercent / 100));
        const desiredScale = Math.max(0.01, (width * widthRatio) / imageWidth);
        const scale = desiredScale;
        
        if (background.imageRepeat) {
          fillPatternScaleX = fillPatternScaleY = scale;
          fillPatternRepeat = 'repeat';
        } else {
          // For contain mode without repeat, use direct Image element
          const scaledImageWidth = imageWidth * scale;
          const scaledImageHeight = imageHeight * scale;
          const position = background.imagePosition || 'top-left';

          const horizontalSpace = width - scaledImageWidth;
          const verticalSpace = height - scaledImageHeight;

          const isRight = position.endsWith('right');
          const isBottom = position.startsWith('bottom');

          const imageX = isRight ? horizontalSpace : 0;
          const imageY = isBottom ? verticalSpace : 0;

          const finalWidth = scaledImageWidth * transformScale;
          const finalHeight = scaledImageHeight * transformScale;
          
      return (
            <Group listening={false}>
              <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill={baseBackgroundColor}
                opacity={opacity}
                listening={false}
              />
        <KonvaImage
          image={backgroundImage}
                x={mirrorBackground ? imageX + finalWidth + transformOffsetX : imageX + transformOffsetX}
                y={imageY + transformOffsetY}
                width={finalWidth}
                height={finalHeight}
                opacity={opacity}
                listening={false}
                scaleX={mirrorBackground ? -1 : 1}
                scaleY={1}
              />
            </Group>
          );
        }
      } else if (background.imageSize === 'stretch') {
        fillPatternScaleX = width / imageWidth;
        fillPatternScaleY = height / imageHeight;
      }
      
      // Apply transform adjustments for pattern fill
      fillPatternScaleX *= transformScale;
      fillPatternScaleY *= transformScale;
      fillPatternOffsetX += transformOffsetX;
      fillPatternOffsetY += transformOffsetY;
      if (mirrorBackground) {
        fillPatternScaleX = -fillPatternScaleX;
        fillPatternOffsetX -= width * transformScale;
      }
      
      return (
        <Group listening={false}>
          <Rect
            x={0}
            y={0}
          width={width}
          height={height}
            fill={baseBackgroundColor}
          opacity={opacity}
          listening={false}
        />
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fillPatternImage={backgroundImage}
            fillPatternScaleX={fillPatternScaleX}
            fillPatternScaleY={fillPatternScaleY}
            fillPatternOffsetX={fillPatternOffsetX}
            fillPatternOffsetY={fillPatternOffsetY}
            fillPatternRepeat={fillPatternRepeat}
            opacity={opacity}
            listening={false}
          />
        </Group>
      );
    }

    // Fallback
    return (
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#ffffff"
        opacity={opacity}
        listening={false}
      />
    );
  };

  // Sort elements by z-index if available
  const sortedElements = useMemo(() => {
    const elements = page.elements || [];
    return [...elements].sort((a, b) => {
      const aZ = (a as any).zIndex ?? 0;
      const bZ = (b as any).zIndex ?? 0;
      return aZ - bZ;
    });
  }, [page.elements]);

  // No-op event handlers for non-interactive mode
  const noOp = () => {};

  // Log rendering info for debugging
  useEffect(() => {
    console.log('[PDFRenderer] Component mounted, rendering with:', {
      width,
      height,
      scale,
      elementsCount: sortedElements.length,
      hasBackground: !!page.background,
      stageRef: !!stageRef.current,
    });
  }, [width, height, scale, sortedElements.length, page.background]);

  // Ensure stage is exposed globally after mount
  useEffect(() => {
    if (stageRef.current) {
      (window as any).konvaStage = stageRef.current;
      const layers = stageRef.current.getLayers();
      console.log('[PDFRenderer] Stage exposed globally, layers:', layers.length);
      
      // If no layers after a delay, log warning
      setTimeout(() => {
        const currentLayers = stageRef.current?.getLayers() || [];
        if (currentLayers.length === 0) {
          console.warn('[PDFRenderer] WARNING: Stage has no layers after mount delay');
        }
      }, 1000);
    }
  }, [stageRef.current]);

  // Separate layers (background below, content above)
  const bgLayerRef = useRef<Konva.Layer | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const [layerReady, setLayerReady] = useState(false);

  useEffect(() => {
    if (stageRef.current) {
      if (!bgLayerRef.current) {
        const bgLayer = new Konva.Layer();
        stageRef.current.add(bgLayer);
        bgLayerRef.current = bgLayer;
      }
      if (!layerRef.current) {
        const layer = new Konva.Layer();
        stageRef.current.add(layer);
        layerRef.current = layer;
      }

      // Ensure stacking: background at bottom, content above
      bgLayerRef.current?.moveToBottom();
      layerRef.current?.moveToTop();

      console.log('[PDFRenderer] Manually created layers, stage now has', stageRef.current.getLayers().length, 'layers');

      (window as any).konvaStage = stageRef.current;
      setLayerReady(true);
    }
    
    return () => {
      if (layerRef.current) {
        layerRef.current.destroy();
        layerRef.current = null;
      }
      if (bgLayerRef.current) {
        bgLayerRef.current.destroy();
        bgLayerRef.current = null;
      }
      setLayerReady(false);
    };
  }, [stageRef.current]);

  // Render content to manually created layer
  useEffect(() => {
    if (!layerRef.current || !bgLayerRef.current || !layerReady || !stageRef.current) return;
    
    const bgLayer = bgLayerRef.current;
    const layer = layerRef.current;
    
    // Clear existing content
    bgLayer.destroyChildren();
    layer.destroyChildren();
    
    console.log('[PDFRenderer] Rendering to manual layer');
    
    // Render background using Konva directly
    const background: PageBackground | undefined = page.background;
    const backgroundTransform = page.backgroundTransform;
    const transformScale = backgroundTransform?.scale ?? 1;
    const transformOffsetX = (backgroundTransform?.offsetRatioX ?? 0) * width;
    const transformOffsetY = (backgroundTransform?.offsetRatioY ?? 0) * height;
    const mirrorBackground = Boolean(backgroundTransform?.mirror);
    
    if (!background) {
      const bgRect = new Konva.Rect({
        x: 0,
        y: 0,
        width: width,
        height: height,
        fill: '#ffffff',
        listening: false,
      });
      bgLayer.add(bgRect);
    } else {
      const opacity = background.opacity ?? 1;
      
      if (background.type === 'color') {
        const bgColor = background.value || '#ffffff';
        const bgRect = new Konva.Rect({
          x: 0,
          y: 0,
          width: width,
          height: height,
          fill: bgColor,
          opacity: opacity,
          listening: false,
        });
        bgLayer.add(bgRect);
        
        // Debug: Log background rendering
        console.log('[DEBUG PDFRenderer] Background rendered:', {
          type: 'color',
          color: bgColor,
          opacity: opacity,
          width: width,
          height: height,
          layerIndex: layer.getZIndex(),
          childrenCount: layer.getChildren().length
        });
      } else if (background.type === 'pattern' && patternImage) {
        const pattern = PATTERNS.find(p => p.id === background.value);
        if (pattern) {
          const spaceColor = background.patternForegroundColor || palettePatternFill;
          const patternOpacity = background.patternBackgroundOpacity ?? 1;
          
          if (spaceColor !== 'transparent') {
            const bgRect1 = new Konva.Rect({
              x: 0,
              y: 0,
              width: width,
              height: height,
              fill: spaceColor,
              opacity: opacity,
              listening: false,
            });
            bgLayer.add(bgRect1);
          }
        
        const bgRect2 = new Konva.Rect({
          x: 0,
          y: 0,
          width: width,
          height: height,
            fillPatternImage: patternImage,
            fillPatternRepeat: 'repeat',
            fillPatternScaleX: mirrorBackground ? -transformScale : transformScale,
            fillPatternScaleY: transformScale,
            fillPatternOffsetX: mirrorBackground ? transformOffsetX - width * transformScale : transformOffsetX,
            fillPatternOffsetY: transformOffsetY,
          opacity: patternOpacity,
          listening: false,
        });
        bgLayer.add(bgRect2);
        }
      } else if (background.type === 'image' && backgroundImage) {
        const hasBackgroundColor = (background as any).backgroundColorEnabled && (background as any).backgroundColor;
        const paletteBackgroundColor = getPalettePartColor(normalizedPalette, 'pageBackground', 'background', '#ffffff') || '#ffffff';
        const baseBackgroundColor = hasBackgroundColor
          ? (background as any).backgroundColor || paletteBackgroundColor
          : paletteBackgroundColor;

        // Calculate scaling based on image size mode
        let fillPatternScaleX = 1;
        let fillPatternScaleY = 1;
        let fillPatternOffsetX = 0;
        let fillPatternOffsetY = 0;
        let fillPatternRepeat: 'repeat' | 'no-repeat' = 'no-repeat';
        let useDirectImage = false; // Flag to track if we use direct Image instead of pattern fill

        const imageWidth = backgroundImage.naturalWidth || backgroundImage.width || 1;
        const imageHeight = backgroundImage.naturalHeight || backgroundImage.height || 1;

        if (background.imageSize === 'cover') {
          const scaleX = width / imageWidth;
          const scaleY = height / imageHeight;
          const scale = Math.max(scaleX, scaleY);
          fillPatternScaleX = fillPatternScaleY = scale;
        } else if (background.imageSize === 'contain') {
          const scaleX = width / imageWidth;
          const scaleY = height / imageHeight;
          const widthPercent = background.imageContainWidthPercent ?? 100;
          const widthRatio = Math.max(0.1, Math.min(2, widthPercent / 100));
          const desiredScale = Math.max(0.01, (width * widthRatio) / imageWidth);
          const scale = desiredScale;
          
          if (background.imageRepeat) {
            fillPatternScaleX = fillPatternScaleY = scale;
            fillPatternRepeat = 'repeat';
          } else {
            // For contain mode without repeat, use direct Image element (match client canvas)
            // This matches client canvas behavior - no pattern fill should be created
            useDirectImage = true;
            const scaledImageWidth = imageWidth * scale;
            const scaledImageHeight = imageHeight * scale;
            const position = background.imagePosition || 'top-left';

            const horizontalSpace = width - scaledImageWidth;
            const verticalSpace = height - scaledImageHeight;

            const isRight = position.endsWith('right');
            const isBottom = position.startsWith('bottom');

            const imageX = isRight ? horizontalSpace : 0;
            const imageY = isBottom ? verticalSpace : 0;

            const finalWidth = scaledImageWidth * transformScale;
            const finalHeight = scaledImageHeight * transformScale;
            
            const bgRect = new Konva.Rect({
              x: 0,
              y: 0,
              width: width,
              height: height,
              fill: baseBackgroundColor,
              opacity: opacity,
              listening: false,
            });
            bgLayer.add(bgRect);
            
            const bgImage = new Konva.Image({
              image: backgroundImage,
              x: mirrorBackground ? imageX + finalWidth + transformOffsetX : imageX + transformOffsetX,
              y: imageY + transformOffsetY,
              width: finalWidth,
              height: finalHeight,
              opacity: opacity,
              listening: false,
              scaleX: mirrorBackground ? -1 : 1,
              scaleY: 1,
            });
            bgLayer.add(bgImage);
          }
        } else if (background.imageSize === 'stretch') {
          fillPatternScaleX = width / imageWidth;
          fillPatternScaleY = height / imageHeight;
        }
        
        // Only create pattern fill if we didn't use direct Image (contain without repeat)
        if (!useDirectImage) {
          // Apply transform adjustments for pattern fill
          fillPatternScaleX *= transformScale;
          fillPatternScaleY *= transformScale;
          fillPatternOffsetX += transformOffsetX;
          fillPatternOffsetY += transformOffsetY;
          if (mirrorBackground) {
            fillPatternScaleX = -fillPatternScaleX;
            fillPatternOffsetX -= width * transformScale;
          }
          
          const bgRect = new Konva.Rect({
            x: 0,
            y: 0,
            width: width,
            height: height,
            fill: baseBackgroundColor,
            opacity: opacity,
            listening: false,
          });
          bgLayer.add(bgRect);
          
          const bgImage = new Konva.Rect({
            x: 0,
            y: 0,
            width: width,
            height: height,
            fillPatternImage: backgroundImage,
            fillPatternScaleX: fillPatternScaleX,
            fillPatternScaleY: fillPatternScaleY,
            fillPatternOffsetX: fillPatternOffsetX,
            fillPatternOffsetY: fillPatternOffsetY,
            fillPatternRepeat: fillPatternRepeat,
            opacity: opacity,
            listening: false,
          });
          bgLayer.add(bgImage);
        }
      } else {
        // Fallback
        const bgRect = new Konva.Rect({
          x: 0,
          y: 0,
          width: width,
          height: height,
          fill: '#ffffff',
          opacity: opacity,
          listening: false,
        });
        bgLayer.add(bgRect);
      }
    }
    
    // Render page elements
    const elements = sortedElements;
    console.log('[PDFRenderer] Rendering', elements.length, 'elements');
    
    for (const element of elements) {
      try {
        // Skip brush-multicolor elements (they are rendered as groups)
        if (element.type === 'brush-multicolor') {
          continue;
        }
        
        // Note: placeholder elements are now rendered (see image rendering section below)
        
        // Ensure element position is correctly set
        const elementX = typeof element.x === 'number' ? element.x : 0;
        const elementY = typeof element.y === 'number' ? element.y : 0;
        const elementWidth = typeof element.width === 'number' ? element.width : 100;
        const elementHeight = typeof element.height === 'number' ? element.height : 100;
        const elementRotation = typeof element.rotation === 'number' ? element.rotation : 0;
        const elementOpacity = typeof element.opacity === 'number' ? element.opacity : 1;
        
        // Render QnA elements (standard QnA textbox - textbox-qna.tsx logic)
        // qna_inline is deprecated and treated as qna
        // NOTE: First block removed - using second block with sharedCreateLayout instead
        if (false && (element.textType === 'qna' || element.textType === 'qna2' || element.textType === 'qna_inline')) {
          // Get tool defaults for qna
          const currentPage = state.currentBook?.pages?.find(p => p.id === page.id) || page;
          const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
          const bookTheme = bookData?.themeId || bookData?.bookTheme;
          const pageLayoutTemplateId = currentPage?.layoutTemplateId;
          const bookLayoutTemplateId = bookData?.layoutTemplateId;
          const pageColorPaletteId = currentPage?.colorPaletteId;
          const bookColorPaletteId = bookData?.colorPaletteId;
          
          const qnaDefaults = getToolDefaults(
            'qna',
            pageTheme,
            bookTheme,
            element,
            undefined,
            pageLayoutTemplateId,
            bookLayoutTemplateId,
            pageColorPaletteId,
            bookColorPaletteId
          );
          
          const individualSettings = element.qnaIndividualSettings ?? false;
          const questionStyle = {
            ...qnaDefaults.questionSettings,
            ...element.questionSettings,
          };
          const answerStyle = {
            ...qnaDefaults.answerSettings,
            ...element.answerSettings,
          };
          
          // When individualSettings is false, use answer font properties for question
          if (!individualSettings) {
            questionStyle.fontSize = answerStyle.fontSize ?? questionStyle.fontSize;
            questionStyle.fontFamily = answerStyle.fontFamily ?? questionStyle.fontFamily;
            questionStyle.fontColor = answerStyle.fontColor ?? questionStyle.fontColor;
            questionStyle.fontOpacity = answerStyle.fontOpacity ?? questionStyle.fontOpacity ?? 1;
          }
          
          const padding = element.padding || questionStyle.padding || answerStyle.padding || 4;
          const textWidth = elementWidth - (padding * 2);
          
          // Get question text
          let questionText = '';
          if (element.questionId) {
            const questionData = state.tempQuestions?.[element.questionId];
            if (questionData) {
              try {
                const parsed = JSON.parse(questionData);
                questionText = parsed?.text || questionData;
              } catch {
                questionText = questionData;
              }
            }
          } else if ((element as any).questionText) {
            // Support direct questionText property (for server-side rendering)
            questionText = (element as any).questionText;
          }
          
          // Get answer text - support multiple properties
          let answerText = (element as any).answerText || element.formattedText || element.text || '';
          if (answerText.includes('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = answerText;
            answerText = tempDiv.textContent || tempDiv.innerText || '';
          }
          
          // Debug: Log QnA Inline text extraction
          console.log('[DEBUG PDFRenderer] QnA Inline text extraction:', {
            elementId: element.id,
            pageNumber: page.pageNumber,
            hasQuestionId: !!element.questionId,
            questionTextFromProperty: (element as any).questionText,
            questionText: questionText,
            answerTextFromProperty: (element as any).answerText,
            answerTextFromText: element.text,
            answerText: answerText,
            willSkip: !questionText && !answerText
          });
          
          // Calculate dynamic height based on content
          const calculateHeight = () => {
            if (!questionText && !answerText) {
              console.warn('[DEBUG PDFRenderer] ⚠️ Skipping QnA Inline - no text:', {
                elementId: element.id,
                pageNumber: page.pageNumber
              });
              return elementHeight;
            }
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            let totalHeight = padding * 2;
            
            if (questionText) {
              const qFontSize = questionStyle.fontSize || 45;
              const qFontBold = questionStyle.fontBold ?? false;
              const qFontItalic = questionStyle.fontItalic ?? false;
              const qFontFamily = resolveFontFamily(questionStyle.fontFamily, qFontBold, qFontItalic);
              context.font = `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic ' : ''}${qFontSize}px ${qFontFamily}`;
              
              const words = questionText.split(' ');
              let lines = 1;
              let currentWidth = 0;
              
              for (const word of words) {
                const wordWidth = context.measureText(word + ' ').width;
                if (currentWidth + wordWidth > textWidth && currentWidth > 0) {
                  lines++;
                  currentWidth = wordWidth;
                } else {
                  currentWidth += wordWidth;
                }
              }
              
              const qLineHeight = qFontSize * 1.2;
              totalHeight += lines * qLineHeight;
            }
            
            if (answerText) {
              const aFontSize = answerStyle.fontSize || 50;
              const aFontBold = answerStyle.fontBold ?? false;
              const aFontItalic = answerStyle.fontItalic ?? false;
              const aFontFamily = resolveFontFamily(answerStyle.fontFamily, aFontBold, aFontItalic);
              context.font = `${aFontBold ? 'bold ' : ''}${aFontItalic ? 'italic ' : ''}${aFontSize}px ${aFontFamily}`;
              
              const answerLines = answerText.split('\n');
              for (const line of answerLines) {
                if (!line.trim()) {
                  totalHeight += aFontSize * 1.2;
                  continue;
                }
                const words = line.split(' ');
                let lineCount = 1;
                let currentWidth = 0;
                
                for (const word of words) {
                  const wordWidth = context.measureText(word + ' ').width;
                  if (currentWidth + wordWidth > textWidth && currentWidth > 0) {
                    lineCount++;
                    currentWidth = wordWidth;
                  } else {
                    currentWidth += wordWidth;
                  }
                }
                totalHeight += lineCount * (aFontSize * 1.2);
              }
            }
            
            return Math.max(totalHeight, elementHeight);
          };
          
          const dynamicHeight = calculateHeight();
          
          // Render background if enabled
          const showBackground = element.backgroundEnabled ?? (questionStyle.background?.enabled || answerStyle.background?.enabled) ?? false;
          
          // Debug: Log background check (first path)
          console.log('[DEBUG PDFRenderer] QnA Background check (first path):');
          console.log('  elementId:', element.id);
          console.log('  element.backgroundEnabled:', element.backgroundEnabled);
          console.log('  questionStyle.background?.enabled:', questionStyle.background?.enabled);
          console.log('  answerStyle.background?.enabled:', answerStyle.background?.enabled);
          console.log('  showBackground:', showBackground);
          
          if (showBackground) {
            const backgroundColor = element.backgroundColor || questionStyle.background?.backgroundColor || answerStyle.background?.backgroundColor || 'transparent';
            const backgroundOpacity = element.backgroundOpacity ?? questionStyle.backgroundOpacity ?? answerStyle.backgroundOpacity ?? 1;
            const cornerRadius = element.cornerRadius ?? qnaDefaults.cornerRadius ?? 0;
            
            // Debug: Log background rendering
            console.log('[DEBUG PDFRenderer] QnA Background rendered (first path):');
            console.log('  elementId:', element.id);
            console.log('  backgroundColor:', backgroundColor);
            console.log('  backgroundOpacity:', backgroundOpacity);
            console.log('  elementOpacity:', elementOpacity);
            console.log('  finalOpacity:', backgroundOpacity * elementOpacity);
            
            if (backgroundColor !== 'transparent' && backgroundColor) {
              const bgRect = new Konva.Rect({
                x: elementX,
                y: elementY,
                width: elementWidth,
                height: dynamicHeight,
                fill: backgroundColor,
                opacity: backgroundOpacity * elementOpacity,
                cornerRadius: cornerRadius,
                rotation: elementRotation,
                listening: false,
              });
              
              // Add background and position it after page background, but before other elements
              layer.add(bgRect);
              
              // Find all page background nodes (full canvas size at 0,0) and move bgRect after them
              const stage = layer.getStage();
              const stageWidth = stage ? stage.width() : width;
              const stageHeight = stage ? stage.height() : height;
              
              let lastPageBgIndex = -1;
              layer.getChildren().forEach((node, idx) => {
                if (node === bgRect) return; // Skip self
                if (node.getClassName() !== 'Rect' && node.getClassName() !== 'Image') return;
                const nodeX = node.x ? node.x() : 0;
                const nodeY = node.y ? node.y() : 0;
                const nodeWidth = node.width ? node.width() : 0;
                const nodeHeight = node.height ? node.height() : 0;
                if (nodeX === 0 && nodeY === 0 && nodeWidth === stageWidth && nodeHeight === stageHeight) {
                  lastPageBgIndex = Math.max(lastPageBgIndex, idx);
                }
              });
              
              // Move bgRect to position right after last page background node
              if (lastPageBgIndex !== -1) {
                const bgRectIndex = layer.getChildren().indexOf(bgRect);
                if (bgRectIndex !== -1 && bgRectIndex !== lastPageBgIndex + 1) {
                  layer.getChildren().splice(bgRectIndex, 1);
                  layer.getChildren().splice(lastPageBgIndex + 1, 0, bgRect);
                }
              }
            }
          }
          
          // Render border if enabled
          const showBorder = element.borderEnabled ?? (questionStyle.border?.enabled || answerStyle.border?.enabled) ?? false;
          if (showBorder) {
            const borderColor = element.borderColor || questionStyle.border?.borderColor || answerStyle.border?.borderColor || '#000000';
            const borderWidth = element.borderWidth || questionStyle.borderWidth || answerStyle.borderWidth || 1;
            const borderOpacity = element.borderOpacity ?? questionStyle.borderOpacity ?? answerStyle.borderOpacity ?? 1;
            const cornerRadius = element.cornerRadius ?? qnaDefaults.cornerRadius ?? 0;
            const theme = element.borderTheme || questionStyle.borderTheme || answerStyle.borderTheme || 'default';
            
            const themeRenderer = getThemeRenderer(theme);
            if (themeRenderer && theme !== 'default') {
              // generatePath expects element with x:0, y:0 (relative coordinates)
              // The path will be positioned using x and y properties on the Path node
              const borderElement = {
                type: 'rect' as const,
                id: element.id + '-border',
                x: 0,
                y: 0,
                width: elementWidth,
                height: dynamicHeight,
                cornerRadius: cornerRadius,
                stroke: borderColor,
                strokeWidth: borderWidth,
                fill: 'transparent'
              } as CanvasElement;
              
              const pathData = themeRenderer.generatePath(borderElement);
              
              if (pathData) {
                const borderPath = new Konva.Path({
                  data: pathData,
                  x: elementX,
                  y: elementY,
                  stroke: borderColor,
                  strokeWidth: borderWidth,
                  opacity: borderOpacity,
                  fill: 'transparent',
                  strokeScaleEnabled: true,
                  rotation: elementRotation,
                  listening: false,
                  lineCap: 'round',
                  lineJoin: 'round',
                });
                layer.add(borderPath);
              } else {
                // Fallback to Rect
                const borderRect = new Konva.Rect({
                  x: elementX,
                  y: elementY,
                  width: elementWidth,
                  height: dynamicHeight,
                  fill: 'transparent',
                  stroke: borderColor,
                  strokeWidth: borderWidth,
                  opacity: borderOpacity,
                  cornerRadius: cornerRadius,
                  strokeScaleEnabled: true,
                  rotation: elementRotation,
                  listening: false,
                });
                layer.add(borderRect);
              }
            } else {
              // Default border
              const borderRect = new Konva.Rect({
                x: elementX,
                y: elementY,
                width: elementWidth,
                height: dynamicHeight,
                fill: 'transparent',
                stroke: borderColor,
                strokeWidth: borderWidth,
                opacity: borderOpacity,
                cornerRadius: cornerRadius,
                strokeScaleEnabled: true,
                rotation: elementRotation,
                listening: false,
              });
              layer.add(borderRect);
            }
          }
          
          // Get layout variant
          const layoutVariant = element.layoutVariant || 'inline';
          
          // Calculate baseline alignment for question and answer text
          const qFontSize = questionStyle.fontSize || 45;
          const aFontSize = answerStyle.fontSize || 50;
          const maxFontSize = Math.max(qFontSize, aFontSize);
          const effectivePadding = layoutVariant === 'inline' ? padding + (maxFontSize * 0.2) : padding;
          
          // Get paragraph spacing settings
          const qParagraphSpacing = element.paragraphSpacing || questionStyle.paragraphSpacing || 'small';
          const aParagraphSpacing = element.paragraphSpacing || answerStyle.paragraphSpacing || 'small';
          
          // Calculate line heights based on paragraph spacing
          const getLineHeightMultiplier = (spacing: string) => {
            switch (spacing) {
              case 'small': return 1.0;
              case 'medium': return 1.2;
              case 'large': return 1.5;
              default: return 1.0;
            }
          };
          
          // For inline layout, use combined line height based on largest font
          const combinedLineHeight = layoutVariant === 'inline' ? 
            maxFontSize * Math.max(getLineHeightMultiplier(qParagraphSpacing), getLineHeightMultiplier(aParagraphSpacing)) :
            qFontSize * getLineHeightMultiplier(qParagraphSpacing);
          const aLineHeight = aFontSize * getLineHeightMultiplier(aParagraphSpacing);
          
          // Text baseline offset
          const maxFontSizeUsed = Math.max(qFontSize, aFontSize);
          const maxLineHeightMultiplier = Math.max(getLineHeightMultiplier(qParagraphSpacing), getLineHeightMultiplier(aParagraphSpacing));
          const factor = aFontSize >= 50 ? aFontSize >= 96 ? aFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1;
          const textBaselineOffset = -(maxFontSizeUsed * maxLineHeightMultiplier * 0.15) + (maxFontSizeUsed * factor);
          
          // Get alignment settings
          const questionAlign = element.align || element.format?.textAlign || questionStyle.align || 'left';
          const answerAlign = element.align || element.format?.textAlign || answerStyle.align || 'left';
          
          if (layoutVariant === 'block') {
            // Block layout: question and answer in separate areas
            const questionPosition = element.questionPosition || 'left';
            const qFontSize = questionStyle.fontSize || 45;
            const aFontSize = answerStyle.fontSize || 50;
            const qLineHeight = qFontSize * getLineHeightMultiplier(qParagraphSpacing);
            const aLineHeight = aFontSize * getLineHeightMultiplier(aParagraphSpacing);
            
            const qFontBold = questionStyle.fontBold ?? false;
            const qFontItalic = questionStyle.fontItalic ?? false;
            const qFontFamily = resolveFontFamily(questionStyle.fontFamily, qFontBold, qFontItalic);
            const qFontColor = questionStyle.fontColor || '#666666';
            const qFontOpacity = questionStyle.fontOpacity ?? 1;
            
            const aFontBold = answerStyle.fontBold ?? false;
            const aFontItalic = answerStyle.fontItalic ?? false;
            const aFontFamily = resolveFontFamily(answerStyle.fontFamily, aFontBold, aFontItalic);
            const aFontColor = answerStyle.fontColor || '#1f2937';
            const aFontOpacity = answerStyle.fontOpacity ?? 1;
            
            let questionArea = { x: elementX + padding, y: elementY + padding, width: textWidth, height: dynamicHeight - padding * 2 };
            let answerArea = { x: elementX + padding, y: elementY + padding, width: textWidth, height: dynamicHeight - padding * 2 };
            
            // Calculate dynamic question area size based on text content
            let questionWidth = 0;
            let questionHeight = 0;
            
            if (questionText && questionText.trim() !== '') {
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d')!;
              const qFontFamilyClean = qFontFamily.includes('Mynerve') ? 'Mynerve, cursive' : qFontFamily;
              context.font = `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic ' : ''}${qFontSize}px ${qFontFamilyClean}`;
              
              // Calculate required width and height for question text
              const words = questionText.split(' ');
              let maxLineWidth = 0;
              let currentLineWidth = 0;
              let lineCount = 1;
              
              for (const word of words) {
                const wordWidth = context.measureText(word + ' ').width;
                if (currentLineWidth + wordWidth > elementWidth * 0.6 && currentLineWidth > 0) {
                  maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
                  currentLineWidth = wordWidth;
                  lineCount++;
                } else {
                  currentLineWidth += wordWidth;
                }
              }
              maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
              
              questionWidth = Math.min(maxLineWidth + padding * 2, elementWidth * 0.6);
              questionHeight = lineCount * qLineHeight + padding * 2;
            }
            
            // Calculate areas based on position
            if (questionPosition === 'left' || questionPosition === 'right') {
              const questionWidthPercent = element.questionWidth || 40;
              const finalQuestionWidth = (elementWidth * questionWidthPercent) / 100;
              const answerWidth = elementWidth - finalQuestionWidth - padding * 3;
              
              if (questionPosition === 'left') {
                questionArea = { x: elementX + padding, y: elementY + padding, width: finalQuestionWidth, height: dynamicHeight - padding * 2 };
                answerArea = { x: elementX + finalQuestionWidth + padding * 2, y: elementY + padding, width: answerWidth, height: dynamicHeight - padding * 2 };
              } else {
                answerArea = { x: elementX + padding, y: elementY + padding, width: answerWidth, height: dynamicHeight - padding * 2 };
                questionArea = { x: elementX + answerWidth + padding * 2, y: elementY + padding, width: finalQuestionWidth, height: dynamicHeight - padding * 2 };
              }
            } else {
              const finalQuestionHeight = Math.max(questionHeight, qFontSize + padding * 2);
              const answerHeight = dynamicHeight - finalQuestionHeight - padding * 3;
              
              if (questionPosition === 'top') {
                questionArea = { x: elementX + padding, y: elementY + padding, width: textWidth, height: finalQuestionHeight };
                answerArea = { x: elementX + padding, y: elementY + finalQuestionHeight + padding * 2, width: textWidth, height: answerHeight };
              } else {
                answerArea = { x: elementX + padding, y: elementY + padding, width: textWidth, height: answerHeight };
                questionArea = { x: elementX + padding, y: elementY + answerHeight + padding * 2, width: textWidth, height: finalQuestionHeight };
              }
            }
            
            // Render question in its area
            if (questionText && questionText.trim() !== '') {
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d')!;
              const qFontFamilyClean = qFontFamily.includes('Mynerve') ? 'Mynerve, cursive' : qFontFamily;
              context.font = `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic ' : ''}${qFontSize}px ${qFontFamilyClean}`;
              
              const words = questionText.split(' ');
              let currentLine = '';
              let currentY = questionArea.y;
              
              words.forEach((word) => {
                const testLine = currentLine ? currentLine + ' ' + word : word;
                const testWidth = context.measureText(testLine).width;
                
                if (testWidth > questionArea.width && currentLine) {
                  const questionNode = new Konva.Text({
                    x: questionArea.x,
                    y: currentY,
                    text: currentLine,
                    fontSize: qFontSize,
                    fontFamily: qFontFamilyClean,
                    fontStyle: qFontItalic ? 'italic' : 'normal',
                    fontWeight: qFontBold ? 'bold' : 'normal',
                    fill: qFontColor,
                    opacity: elementOpacity * qFontOpacity,
                    align: questionAlign,
                    width: questionArea.width,
                    rotation: elementRotation,
                    listening: false
                  });
                  
                  layer.add(questionNode);
                  currentLine = word;
                  currentY += qLineHeight;
                } else {
                  currentLine = testLine;
                }
              });
              
              if (currentLine) {
                const questionNode = new Konva.Text({
                  x: questionArea.x,
                  y: currentY,
                  text: currentLine,
                  fontSize: qFontSize,
                  fontFamily: qFontFamilyClean,
                  fontStyle: qFontItalic ? 'italic' : 'normal',
                  fontWeight: qFontBold ? 'bold' : 'normal',
                  fill: qFontColor,
                  opacity: elementOpacity * qFontOpacity,
                  align: questionAlign,
                  width: questionArea.width,
                  rotation: elementRotation,
                  listening: false
                });
                
                layer.add(questionNode);
              }
            }
            
            // Render answer in its area
            if (answerText && answerText.trim() !== '') {
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d')!;
              const aFontFamilyClean = aFontFamily.includes('Mynerve') ? 'Mynerve, cursive' : aFontFamily;
              context.font = `${aFontBold ? 'bold ' : ''}${aFontItalic ? 'italic ' : ''}${aFontSize}px ${aFontFamilyClean}`;
              
              const lines = answerText.split('\n');
              // Match Editor logic exactly: use currentY that increments after each line
              // PST: Layout = Block: Adjust Y position for subsequent ruled lines, before it was >> let currentY = answerArea.y + aFontSize * 0.2;
              let currentY = answerArea.y;
              
              lines.forEach((line) => {
                if (!line.trim()) {
                  currentY += aLineHeight;
                  return;
                }
                
                const words = line.split(' ');
                let currentLine = '';
                
                words.forEach((word) => {
                  const testLine = currentLine ? currentLine + ' ' + word : word;
                  const testWidth = context.measureText(testLine).width;
                  
                  if (testWidth > answerArea.width && currentLine) {
                    const answerNode = new Konva.Text({
                      x: answerArea.x,
                      y: currentY,
                      text: currentLine,
                      fontSize: aFontSize,
                      fontFamily: aFontFamilyClean,
                      fontStyle: aFontItalic ? 'italic' : 'normal',
                      fontWeight: aFontBold ? 'bold' : 'normal',
                      fill: aFontColor,
                      opacity: elementOpacity * aFontOpacity,
                      align: answerAlign,
                      width: answerArea.width,
                      rotation: elementRotation,
                      listening: false
                    });
                    
                    layer.add(answerNode);
                    currentLine = word;
                    currentY += aLineHeight;
                  } else {
                    currentLine = testLine;
                  }
                });
                
                if (currentLine) {
                  const answerNode = new Konva.Text({
                    x: answerArea.x,
                    y: currentY,
                    text: currentLine,
                    fontSize: aFontSize,
                    fontFamily: aFontFamilyClean,
                    fontStyle: aFontItalic ? 'italic' : 'normal',
                    fontWeight: aFontBold ? 'bold' : 'normal',
                    fill: aFontColor,
                    opacity: elementOpacity * aFontOpacity,
                    align: answerAlign,
                    width: answerArea.width,
                    rotation: elementRotation,
                    listening: false
                  });
                  
                  layer.add(answerNode);
                  currentY += aLineHeight;
                }
              });
            }
          } else {
            // Inline layout: question and answer can appear on same line
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            
            // Render question text first
            if (questionText && questionText.trim() !== '') {
              const questionFontSize = questionStyle.fontSize || 45;
              const questionFontBold = questionStyle.fontBold ?? false;
              const questionFontItalic = questionStyle.fontItalic ?? false;
              const questionFontFamily = resolveFontFamily(questionStyle.fontFamily, questionFontBold, questionFontItalic);
              const questionFontColor = questionStyle.fontColor || '#666666';
              const questionFontOpacity = questionStyle.fontOpacity ?? 1;
              
              context.font = `${questionFontBold ? 'bold ' : ''}${questionFontItalic ? 'italic ' : ''}${questionFontSize}px ${questionFontFamily}`;
              
              // Build question lines
              const questionWords = questionText.split(' ');
              const questionLines: string[] = [];
              let currentLine = '';
              let currentLineWidth = 0;
              
              for (const word of questionWords) {
                const wordWithSpace = currentLine ? ' ' + word : word;
                const wordWidth = context.measureText(wordWithSpace).width;
                
                if (currentLineWidth + wordWidth <= textWidth) {
                  currentLine += wordWithSpace;
                  currentLineWidth += wordWidth;
                } else {
                  if (currentLine) questionLines.push(currentLine);
                  currentLine = word;
                  currentLineWidth = context.measureText(word).width;
                }
              }
              if (currentLine) questionLines.push(currentLine);
              
              // Calculate where question ends for answer positioning (needed for alignment)
              const lastQuestionLine = questionLines[questionLines.length - 1] || '';
              const questionTextWidth = context.measureText(lastQuestionLine).width;
              
              // Check if answer can fit on same line (needed for alignment calculation)
              const gapForCheck = Math.max(10, qFontSize * 0.5);
              const availableWidthAfterQuestion = textWidth - questionTextWidth - gapForCheck;
              let canFitOnSameLineForAlignment = false;
              
              if (availableWidthAfterQuestion > 0 && answerText) {
                const firstAnswerLine = answerText.split('\n')[0] || '';
                const firstAnswerWord = firstAnswerLine.split(' ')[0] || '';
                if (firstAnswerWord) {
                  const firstWordWidth = context.measureText(firstAnswerWord).width;
                  canFitOnSameLineForAlignment = firstWordWidth <= availableWidthAfterQuestion;
                } else {
                  canFitOnSameLineForAlignment = true;
                }
              }
              
              // Calculate combined width and startX for alignment (if answer fits on same line)
              let questionStartX = elementX + padding;
              if (canFitOnSameLineForAlignment && answerText) {
                const qContext = document.createElement('canvas').getContext('2d')!;
                const qFontFamilyClean = questionFontFamily.includes('Mynerve') ? 'Mynerve, cursive' : questionFontFamily;
                qContext.font = `${questionFontBold ? 'bold ' : ''}${questionFontItalic ? 'italic' : ''}${qFontSize}px ${qFontFamilyClean}`;
                const qWidth = qContext.measureText(lastQuestionLine).width;
                const gap = Math.max(10, qFontSize * 0.5);
                const firstAnswerLine = answerText.split('\n')[0] || '';
                const firstAnswerWord = firstAnswerLine.split(' ')[0] || '';
                const aWidth = firstAnswerWord ? context.measureText(firstAnswerWord).width : 0;
                const combinedWidth = qWidth + gap + aWidth;
                
                if (answerAlign === 'center') {
                  questionStartX = elementX + (elementWidth - combinedWidth) / 2;
                } else if (answerAlign === 'right') {
                  questionStartX = elementX + elementWidth - padding - combinedWidth;
                }
              }
              
              // Render all question lines with shared baseline alignment
              const number = qFontSize - aFontSize;
              questionLines.forEach((line, index) => {
                const sharedBaseline = effectivePadding + (index * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.8) - (number / 7);
                const questionY = sharedBaseline - (qFontSize * 0.8);
                
                // For the last question line, use questionStartX if answer fits on same line and alignment is not left
                // Otherwise, use normal padding
                const questionX = (index === questionLines.length - 1 && canFitOnSameLineForAlignment && answerAlign !== 'left') 
                  ? questionStartX 
                  : elementX + padding;
                
                // Debug: Log font metrics for first few question lines
                if (index < 3) {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    const weightStr = questionFontBold ? 'bold ' : '';
                    const styleStr = questionFontItalic ? 'italic ' : '';
                    const testFont = `${weightStr}${styleStr}${questionFontSize}px ${questionFontFamily}`;
                    ctx.font = testFont;
                    ctx.textBaseline = 'alphabetic';
                    const metrics = ctx.measureText('M');
                    const actualBoundingBoxAscent = metrics.actualBoundingBoxAscent;
                    const actualBoundingBoxDescent = metrics.actualBoundingBoxDescent;
                    const width = metrics.width;
                    console.log('[CLIENT PDFRenderer] Question font metrics:', JSON.stringify({
                      lineIndex: index,
                      text: line ? line.substring(0, 30) : '(empty)',
                      font: testFont,
                      fontSize: questionFontSize,
                      fontFamily: questionFontFamily,
                      fontWeight: questionFontBold ? 'bold' : 'normal',
                      fontStyle: questionFontItalic ? 'italic' : 'normal',
                      actualBoundingBoxAscent: actualBoundingBoxAscent !== undefined ? actualBoundingBoxAscent : null,
                      actualBoundingBoxDescent: actualBoundingBoxDescent !== undefined ? actualBoundingBoxDescent : null,
                      width: width,
                      baselineY: sharedBaseline,
                      topY: questionY,
                      x: questionX,
                      y: elementY + questionY
                    }, null, 2));
                  }
                }
                
                const questionNode = new Konva.Text({
                  x: questionX,
                  y: elementY + questionY,
                  text: line,
                  fontSize: questionFontSize,
                  fontFamily: questionFontFamily,
                  fontStyle: questionFontItalic ? 'italic' : 'normal',
                  fontWeight: questionFontBold ? 'bold' : 'normal',
                  fill: questionFontColor,
                  opacity: elementOpacity * questionFontOpacity,
                  align: questionAlign,
                  width: textWidth,
                  rotation: elementRotation,
                  listening: false
                });
                
                layer.add(questionNode);
              });
              
              // Render answer text with inline layout logic
              if (answerText && answerText.trim() !== '') {
                const answerFontSize = answerStyle.fontSize || 50;
                const answerFontBold = answerStyle.fontBold ?? false;
                const answerFontItalic = answerStyle.fontItalic ?? false;
                const answerFontFamily = resolveFontFamily(answerStyle.fontFamily, answerFontBold, answerFontItalic);
                const answerFontColor = answerStyle.fontColor || '#1f2937';
                const answerFontOpacity = answerStyle.fontOpacity ?? 1;
                
                context.font = `${answerFontBold ? 'bold ' : ''}${answerFontItalic ? 'italic ' : ''}${answerFontSize}px ${answerFontFamily}`;
                
                // Check if there's enough space after the question to render answer on the same line
                // Dynamic gap based on font size (same as Editor)
                const gap = Math.max(10, qFontSize * 0.5);
                const availableWidthAfterQuestion = textWidth - questionTextWidth - gap;
                let canFitOnSameLine = false;
                
                if (availableWidthAfterQuestion > 0) {
                  const firstAnswerLine = answerText.split('\n')[0] || '';
                  const firstAnswerWord = firstAnswerLine.split(' ')[0] || '';
                  if (firstAnswerWord) {
                    const firstWordWidth = context.measureText(firstAnswerWord).width;
                    canFitOnSameLine = firstWordWidth <= availableWidthAfterQuestion;
                  } else {
                    canFitOnSameLine = true;
                  }
                }
                
                // Handle line breaks in answer text
                const userLines = answerText.split('\n');
                let isFirstLine = canFitOnSameLine;
                let totalAnswerLineCount = 0;
                
                userLines.forEach((line) => {
                  if (!line.trim() && !isFirstLine) {
                    totalAnswerLineCount++;
                    return;
                  }
                  
                  const words = line.split(' ');
                  let wordIndex = 0;
                  let firstLineSegmentCount = 0;
                  
                  // Safety limit to prevent infinite loops with malformed data
                  const maxWords = Math.min(words.length, 10000);
                  let outerIterationCount = 0;
                  
                  while (wordIndex < words.length && outerIterationCount < maxWords) {
                    let lineText = '';
                    let lineWidth = 0;
                    let availableWidth = textWidth;
                    
                    // For first line only, start after question (if there's space)
                    if (isFirstLine && canFitOnSameLine) {
                      availableWidth = textWidth - questionTextWidth - gap;
                    }
                    
                    // Safety check: ensure availableWidth is valid
                    if (availableWidth <= 0 || !isFinite(availableWidth)) {
                      availableWidth = Math.max(textWidth, 100); // Fallback to reasonable width
                    }
                    
                    // Build line with as many words as fit
                    let innerIterationCount = 0;
                    const maxInnerIterations = 1000;
                    while (wordIndex < words.length && innerIterationCount < maxInnerIterations) {
                      const word = words[wordIndex];
                      if (!word || word.length === 0) {
                        wordIndex++;
                        innerIterationCount++;
                        continue;
                      }
                      const wordWithSpace = lineText ? ' ' + word : word;
                      const wordWidth = context.measureText(wordWithSpace).width;
                      
                      // Safety check: ensure wordWidth is valid
                      if (!isFinite(wordWidth) || wordWidth === Infinity || isNaN(wordWidth)) {
                        wordIndex++;
                        innerIterationCount++;
                        continue;
                      }
                      
                      if (lineWidth + wordWidth <= availableWidth) {
                        lineText += wordWithSpace;
                        lineWidth += wordWidth;
                        wordIndex++;
                        innerIterationCount++;
                      } else {
                        break;
                      }
                    }
                    
                    // Safety: break if we're stuck
                    if (innerIterationCount >= maxInnerIterations) {
                      break;
                    }
                    
                    // Safety: prevent infinite loops
                    if (outerIterationCount >= maxWords) {
                      break;
                    }
                    outerIterationCount++;
                    
                    if (lineText) {
                      if (isFirstLine) {
                        firstLineSegmentCount++;
                        if (firstLineSegmentCount === 1) {
                          // First segment on same line as question
                          // Calculate combined width for alignment
                          const lastQuestionLine = questionLines[questionLines.length - 1] || '';
                          
                          // Use question font context for accurate measurement
                          const qContext = document.createElement('canvas').getContext('2d')!;
                          const qFontFamilyClean = questionFontFamily.includes('Mynerve') ? 'Mynerve, cursive' : questionFontFamily;
                          qContext.font = `${questionFontBold ? 'bold ' : ''}${questionFontItalic ? 'italic ' : ''}${qFontSize}px ${qFontFamilyClean}`;
                          const qWidth = qContext.measureText(lastQuestionLine).width;
                          
                          const gap = Math.max(10, qFontSize * 0.5); // Dynamic gap based on font size
                          const aWidth = context.measureText(lineText).width;
                          const combinedWidth = qWidth + gap + aWidth;
                          
                          // Calculate startX based on answerAlign
                          let startX = elementX + padding;
                          if (answerAlign === 'center') {
                            startX = elementX + (elementWidth - combinedWidth) / 2;
                          } else if (answerAlign === 'right') {
                            startX = elementX + elementWidth - padding - combinedWidth;
                          }
                          
                          // Calculate shared baseline for both question and answer text
                          const number = qFontSize - aFontSize;
                          const sharedBaseline = effectivePadding + ((questionLines.length - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.8) - (number / 7);
                          const answerY = sharedBaseline - (aFontSize * 0.8);
                          
                          // Debug: Log font metrics for first answer text node
                          if (firstLineSegmentCount === 1) {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              const weightStr = answerFontBold ? 'bold ' : '';
                              const styleStr = answerFontItalic ? 'italic ' : '';
                              const testFont = `${weightStr}${styleStr}${answerFontSize}px ${answerFontFamily}`;
                              ctx.font = testFont;
                              ctx.textBaseline = 'alphabetic';
                              const metrics = ctx.measureText('M');
                              const actualBoundingBoxAscent = metrics.actualBoundingBoxAscent;
                              const actualBoundingBoxDescent = metrics.actualBoundingBoxDescent;
                              const width = metrics.width;
                              console.log('[CLIENT PDFRenderer] Answer font metrics (first segment):', JSON.stringify({
                                segmentIndex: firstLineSegmentCount,
                                text: lineText ? lineText.substring(0, 30) : '(empty)',
                                font: testFont,
                                fontSize: answerFontSize,
                                fontFamily: answerFontFamily,
                                fontWeight: answerFontBold ? 'bold' : 'normal',
                                fontStyle: answerFontItalic ? 'italic' : 'normal',
                                actualBoundingBoxAscent: actualBoundingBoxAscent !== undefined ? actualBoundingBoxAscent : null,
                                actualBoundingBoxDescent: actualBoundingBoxDescent !== undefined ? actualBoundingBoxDescent : null,
                                width: width,
                                baselineY: sharedBaseline,
                                topY: answerY,
                                x: startX + qWidth + gap,
                                y: elementY + answerY
                              }, null, 2));
                            }
                          }
                          
                          // Render answer after question with shared baseline alignment
                          const answerNode = new Konva.Text({
                            x: startX + qWidth + gap,
                            y: elementY + answerY,
                            text: lineText,
                            fontSize: answerFontSize,
                            fontFamily: answerFontFamily,
                            fontStyle: answerFontItalic ? 'italic' : 'normal',
                            fontWeight: answerFontBold ? 'bold' : 'normal',
                            fill: answerFontColor,
                            opacity: elementOpacity * answerFontOpacity,
                            align: 'left',
                            rotation: elementRotation,
                            listening: false
                          });
                          
                          layer.add(answerNode);
                          isFirstLine = false;
                        } else {
                          // Wrapped segments of first line
                          const combinedLineBaseline = effectivePadding + ((questionLines.length - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.6);
                          const answerBaselineOffsetLocal = -(aFontSize * getLineHeightMultiplier(aParagraphSpacing) * 0.15) + (aFontSize * (aFontSize >= 50 ? aFontSize >= 96 ? aFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1));
                          totalAnswerLineCount = firstLineSegmentCount - 1;
                          const answerLineIndex = totalAnswerLineCount - 1;
                          const answerBaseline = combinedLineBaseline + (answerLineIndex * aLineHeight) + answerBaselineOffsetLocal + (aFontSize * 0.6);
                          const answerY = answerBaseline - (aFontSize * 0.8);
                          
                          const answerNode = new Konva.Text({
                            x: elementX + padding,
                            y: elementY + answerY,
                            text: lineText,
                            fontSize: answerFontSize,
                            fontFamily: answerFontFamily,
                            fontStyle: answerFontItalic ? 'italic' : 'normal',
                            fontWeight: answerFontBold ? 'bold' : 'normal',
                            fill: answerFontColor,
                            opacity: elementOpacity * answerFontOpacity,
                            align: answerAlign,
                            width: textWidth,
                            rotation: elementRotation,
                            listening: false
                          });
                          
                          layer.add(answerNode);
                        }
                      } else {
                        // Answer-only lines (after first line)
                        const combinedLineBaseline = effectivePadding + ((questionLines.length - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.6);
                        const answerBaselineOffsetLocal = -(aFontSize * getLineHeightMultiplier(aParagraphSpacing) * 0.15) + (aFontSize * (aFontSize >= 50 ? aFontSize >= 96 ? aFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1));
                        totalAnswerLineCount++;
                        const answerBaseline = combinedLineBaseline + (totalAnswerLineCount * aLineHeight) + answerBaselineOffsetLocal + (aFontSize * 0.6);
                        const answerY = answerBaseline - (aFontSize * 0.8);
                        
                        const answerNode = new Konva.Text({
                          x: elementX + padding,
                          y: elementY + answerY,
                          text: lineText,
                          fontSize: answerFontSize,
                          fontFamily: answerFontFamily,
                          fontStyle: answerFontItalic ? 'italic' : 'normal',
                          fontWeight: answerFontBold ? 'bold' : 'normal',
                          fill: answerFontColor,
                          opacity: elementOpacity * answerFontOpacity,
                          align: answerAlign,
                          width: textWidth,
                          rotation: elementRotation,
                          listening: false
                        });
                        
                        layer.add(answerNode);
                      }
                    }
                  }
                });
              }
            } else if (answerText && answerText.trim() !== '') {
              // Only answer text, no question
              const answerFontSize = answerStyle.fontSize || 50;
              const answerFontBold = answerStyle.fontBold ?? false;
              const answerFontItalic = answerStyle.fontItalic ?? false;
              const answerFontFamily = resolveFontFamily(answerStyle.fontFamily, answerFontBold, answerFontItalic);
              const answerFontColor = answerStyle.fontColor || '#1f2937';
              const answerFontOpacity = answerStyle.fontOpacity ?? 1;
              
              const answerNode = new Konva.Text({
                x: elementX + padding,
                y: elementY + effectivePadding,
                text: answerText,
                fontSize: answerFontSize,
                fontFamily: answerFontFamily,
                fontStyle: answerFontItalic ? 'italic' : 'normal',
                fontWeight: answerFontBold ? 'bold' : 'normal',
                fill: answerFontColor,
                width: textWidth,
                align: answerAlign,
                verticalAlign: 'top',
                wrap: 'word',
                rotation: elementRotation,
                opacity: elementOpacity * answerFontOpacity,
                visible: true,
                listening: false
              });
              
              layer.add(answerNode);
            }
          }
          
          // Render ruled lines if enabled
          const answerRuledLines = element.ruledLines ?? false;
          
          // Debug: Log ruled lines check (first path)
          console.log('[DEBUG PDFRenderer] Ruled lines check (first path):');
          console.log('  elementId:', element.id);
          console.log('  element.ruledLines:', element.ruledLines);
          console.log('  answerRuledLines:', answerRuledLines);
          console.log('  layoutVariant:', layoutVariant);
          console.log('  hasQuestionText:', !!questionText);
          console.log('  hasAnswerText:', !!answerText);
          
          if (answerRuledLines) {
            // Debug: Log starting ruled lines rendering
            console.log('[DEBUG PDFRenderer] Starting ruled lines rendering (first path):');
            console.log('  elementId:', element.id);
            console.log('  layoutVariant:', layoutVariant);
            const aTheme = element.ruledLinesTheme || 'rough';
            const aColor = element.ruledLinesColor || '#1f2937';
            const aWidth = element.ruledLinesWidth || 0.8;
            const aOpacity = element.ruledLinesOpacity ?? 1;
            const aFontSize = answerStyle.fontSize || 50;
            const aSpacing = answerStyle.paragraphSpacing || element.paragraphSpacing || 'small';
            
            const aLineHeight = aFontSize * getLineHeightMultiplier(aSpacing);
            const startX = elementX + padding;
            const endX = elementX + elementWidth - padding;
            
            // Track how many lines are rendered
            let ruledLinesRenderedCount = 0;
            
            if (layoutVariant === 'block') {
              // Block layout: ruled lines in answer area
              const questionPosition = element.questionPosition || 'left';
              let answerArea = { x: elementX + padding, y: elementY + padding, width: textWidth, height: dynamicHeight - padding * 2 };
              
              // Calculate answer area based on question position (same logic as text rendering)
              if (questionPosition === 'left' || questionPosition === 'right') {
                const questionWidthPercent = element.questionWidth || 40;
                const finalQuestionWidth = (elementWidth * questionWidthPercent) / 100;
                const answerWidth = elementWidth - finalQuestionWidth - padding * 3;
                
                if (questionPosition === 'left') {
                  answerArea = { x: elementX + finalQuestionWidth + padding * 2, y: elementY + padding, width: answerWidth, height: dynamicHeight - padding * 2 };
                } else {
                  answerArea = { x: elementX + padding, y: elementY + padding, width: answerWidth, height: dynamicHeight - padding * 2 };
                }
              } else {
                // Calculate question height
                let questionHeight = 0;
                if (questionText && questionText.trim() !== '') {
                  const qFontSize = questionStyle.fontSize || 45;
                  const qLineHeight = qFontSize * getLineHeightMultiplier(qParagraphSpacing);
                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d')!;
                  const qFontBold = questionStyle.fontBold ?? false;
                  const qFontItalic = questionStyle.fontItalic ?? false;
                  const qFontFamily = resolveFontFamily(questionStyle.fontFamily, qFontBold, qFontItalic);
                  context.font = `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic ' : ''}${qFontSize}px ${qFontFamily}`;
                  
                  const words = questionText.split(' ');
                  let lineCount = 1;
                  let currentLineWidth = 0;
                  
                  for (const word of words) {
                    const wordWidth = context.measureText(word + ' ').width;
                    if (currentLineWidth + wordWidth > textWidth && currentLineWidth > 0) {
                      lineCount++;
                      currentLineWidth = wordWidth;
                    } else {
                      currentLineWidth += wordWidth;
                    }
                  }
                  
                  questionHeight = lineCount * qLineHeight + padding * 2;
                }
                
                const finalQuestionHeight = Math.max(questionHeight, (questionStyle.fontSize || 45) + padding * 2);
                const answerHeight = dynamicHeight - finalQuestionHeight - padding * 3;
                
                if (questionPosition === 'top') {
                  answerArea = { x: elementX + padding, y: elementY + finalQuestionHeight + padding * 2, width: textWidth, height: answerHeight };
                } else {
                  answerArea = { x: elementX + padding, y: elementY + padding, width: textWidth, height: answerHeight };
                }
              }
              
              // Generate lines aligned with text baselines in answer area
              const textBaselineY = answerArea.y + aFontSize * 0.8; // Text baseline position
              let lineY = textBaselineY + aFontSize * 0.2; // Position lines slightly below text baseline
              const endY = answerArea.y + answerArea.height;
              const startX = answerArea.x;
              const endX = answerArea.x + answerArea.width;
              
              while (lineY < endY) {
                // Use rough.js for rough/wobbly themes if available
                if ((aTheme === 'rough' || aTheme === 'wobbly') && typeof (window as any).rough !== 'undefined') {
                  try {
                    const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    const rc = (window as any).rough.svg(svg);
                    const roughness = aTheme === 'wobbly' ? 3 : 2;
                    
                    const roughLine = rc.line(startX, lineY, endX, lineY, {
                      roughness: roughness,
                      strokeWidth: aWidth,
                      stroke: aColor,
                      seed: seed + lineY
                    });
                    
                    const paths = roughLine.querySelectorAll('path');
                    let combinedPath = '';
                    paths.forEach((path: SVGPathElement) => {
                      const d = path.getAttribute('d');
                      if (d) combinedPath += d + ' ';
                    });
                    
                    if (combinedPath) {
                      const linePath = new Konva.Path({
                        data: combinedPath.trim(),
                        stroke: aColor,
                        strokeWidth: aWidth,
                        opacity: aOpacity,
                        strokeScaleEnabled: true,
                        rotation: elementRotation,
                        listening: false,
                      });
                      layer.add(linePath);
                      ruledLinesRenderedCount++;
                    } else {
                      // Fallback to straight line
                      const line = new Konva.Line({
                        points: [startX, lineY, endX, lineY],
                        stroke: aColor,
                        strokeWidth: aWidth,
                        opacity: aOpacity,
                        strokeScaleEnabled: true,
                        rotation: elementRotation,
                        listening: false,
                      });
                      layer.add(line);
                      ruledLinesRenderedCount++;
                    }
                  } catch (error) {
                    console.warn('[PDFRenderer] Error generating rough ruled line:', error);
                    // Fallback to straight line
                    const line = new Konva.Line({
                      points: [startX, lineY, endX, lineY],
                      stroke: aColor,
                      strokeWidth: aWidth,
                      opacity: aOpacity,
                      strokeScaleEnabled: true,
                      rotation: elementRotation,
                      listening: false,
                    });
                    layer.add(line);
                    ruledLinesRenderedCount++;
                  }
                } else {
                  // Default straight line
                  const line = new Konva.Line({
                    points: [startX, lineY, endX, lineY],
                    stroke: aColor,
                    strokeWidth: aWidth,
                    opacity: aOpacity,
                    strokeScaleEnabled: true,
                    rotation: elementRotation,
                    listening: false,
                  });
                  layer.add(line);
                  ruledLinesRenderedCount++;
                }
                lineY += aLineHeight;
              }
              
              // Debug: Log block layout ruled lines count
              console.log('[DEBUG PDFRenderer] Block layout ruled lines rendered:');
              console.log('  elementId:', element.id);
              console.log('  linesCount:', ruledLinesRenderedCount);
            } else {
              // Inline layout: position ruled lines based on actual text layout
              // This matches the logic from textbox-qna-inline.tsx
              if (questionText && answerText) {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                const questionFontSize = questionStyle.fontSize || 45;
                const questionFontBold = questionStyle.fontBold ?? false;
                const questionFontItalic = questionStyle.fontItalic ?? false;
                const questionFontFamily = resolveFontFamily(questionStyle.fontFamily, questionFontBold, questionFontItalic);
                context.font = `${questionFontBold ? 'bold ' : ''}${questionFontItalic ? 'italic ' : ''}${questionFontSize}px ${questionFontFamily}`;
                
                // Calculate question lines
                const questionWords = questionText.split(' ');
                let questionLineCount = 1;
                let currentLineWidth = 0;
                
                for (const word of questionWords) {
                  const wordWidth = context.measureText(word + ' ').width;
                  if (currentLineWidth + wordWidth > textWidth && currentLineWidth > 0) {
                    questionLineCount++;
                    currentLineWidth = wordWidth;
                  } else {
                    currentLineWidth += wordWidth;
                  }
                }
                
                const lastQuestionLine = questionText.split(' ').reduce((acc, word) => {
                  const testLine = acc ? acc + ' ' + word : word;
                  const testWidth = context.measureText(testLine).width;
                  if (testWidth > textWidth && acc) {
                    return word;
                  }
                  return testLine;
                }, '');
                const lastQuestionLineWidth = context.measureText(lastQuestionLine).width;
                const gap = 40;
                const availableWidthAfterQuestion = textWidth - lastQuestionLineWidth - gap;
                
                // Check if answer fits on same line
                const answerFontBold = answerStyle.fontBold ?? false;
                const answerFontItalic = answerStyle.fontItalic ?? false;
                const answerFontFamily = resolveFontFamily(answerStyle.fontFamily, answerFontBold, answerFontItalic);
                const answerContext = document.createElement('canvas').getContext('2d')!;
                answerContext.font = `${answerFontBold ? 'bold ' : ''}${answerFontItalic ? 'italic ' : ''}${aFontSize}px ${answerFontFamily}`;
                const firstAnswerLine = answerText.split('\n')[0] || '';
                const firstAnswerWord = firstAnswerLine.split(' ')[0] || '';
                const canFitOnSameLine = firstAnswerWord && availableWidthAfterQuestion > 0 && answerContext.measureText(firstAnswerWord).width <= availableWidthAfterQuestion;
                
                // Generate ruled lines based on layout
                const combinedLineBaseline = effectivePadding + ((questionLineCount - 1) * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.6);
                const answerBaselineOffset = -(aFontSize * getLineHeightMultiplier(aParagraphSpacing) * 0.15) + (aFontSize * (aFontSize >= 50 ? aFontSize >= 96 ? aFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1));
                
                // Generate lines for question lines if needed
                if (questionLineCount > 1 || !canFitOnSameLine) {
                  const maxQuestionLineIndex = (questionLineCount > 1 && canFitOnSameLine) 
                    ? questionLineCount - 1
                    : questionLineCount;
                  
                  for (let questionLineIndex = 0; questionLineIndex < maxQuestionLineIndex; questionLineIndex++) {
                    const questionLineBaseline = effectivePadding + (questionLineIndex * combinedLineHeight) + textBaselineOffset + (maxFontSize * 0.6);
                    const baseline = questionLineBaseline + answerBaselineOffset + (aFontSize * 0.6);
                    const lineY = elementY + baseline + (aFontSize * 0.15);
                    
                    if (isFinite(lineY) && !isNaN(lineY) && lineY < elementY + dynamicHeight - padding - 10) {
                      // Generate ruled line
                      if ((aTheme === 'rough' || aTheme === 'wobbly') && typeof (window as any).rough !== 'undefined') {
                        try {
                          const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                          const rc = (window as any).rough.svg(svg);
                          const roughness = aTheme === 'wobbly' ? 3 : 2;
                          
                          const roughLine = rc.line(startX, lineY, endX, lineY, {
                            roughness: roughness,
                            strokeWidth: aWidth,
                            stroke: aColor,
                            seed: seed + lineY
                          });
                          
                          const paths = roughLine.querySelectorAll('path');
                          let combinedPath = '';
                          paths.forEach((path: SVGPathElement) => {
                            const d = path.getAttribute('d');
                            if (d) combinedPath += d + ' ';
                          });
                          
                          if (combinedPath) {
                            const linePath = new Konva.Path({
                              data: combinedPath.trim(),
                              stroke: aColor,
                              strokeWidth: aWidth,
                              opacity: aOpacity,
                              strokeScaleEnabled: true,
                              rotation: elementRotation,
                              listening: false,
                            });
                            layer.add(linePath);
                            ruledLinesRenderedCount++;
                          } else {
                            const line = new Konva.Line({
                              points: [startX, lineY, endX, lineY],
                              stroke: aColor,
                              strokeWidth: aWidth,
                              opacity: aOpacity,
                              strokeScaleEnabled: true,
                              rotation: elementRotation,
                              listening: false,
                            });
                            layer.add(line);
                            ruledLinesRenderedCount++;
                          }
                        } catch (error) {
                          const line = new Konva.Line({
                            points: [startX, lineY, endX, lineY],
                            stroke: aColor,
                            strokeWidth: aWidth,
                            opacity: aOpacity,
                            strokeScaleEnabled: true,
                            rotation: elementRotation,
                            listening: false,
                          });
                          layer.add(line);
                          ruledLinesRenderedCount++;
                        }
                      } else {
                        const line = new Konva.Line({
                          points: [startX, lineY, endX, lineY],
                          stroke: aColor,
                          strokeWidth: aWidth,
                          opacity: aOpacity,
                          strokeScaleEnabled: true,
                          rotation: elementRotation,
                          listening: false,
                        });
                        layer.add(line);
                        ruledLinesRenderedCount++;
                      }
                    }
                  }
                }
                
                // Generate lines for answer lines
                let answerLineIndex = canFitOnSameLine ? 0 : 1;
                const endY = elementY + dynamicHeight - padding;
                
                console.log('[DEBUG PDFRenderer] Inline layout - starting answer lines generation:');
                console.log('  elementId:', element.id);
                console.log('  canFitOnSameLine:', canFitOnSameLine);
                console.log('  answerLineIndex start:', answerLineIndex);
                console.log('  aLineHeight:', aLineHeight);
                console.log('  endY:', endY);
                console.log('  combinedLineBaseline:', combinedLineBaseline);
                
                while (answerLineIndex < 1000) { // Safety limit
                  const answerBaseline = combinedLineBaseline + (answerLineIndex * aLineHeight) + answerBaselineOffset + (aFontSize * 0.6);
                  const lineY = elementY + answerBaseline + (aFontSize * 0.15);
                  
                  if (!isFinite(lineY) || lineY === Infinity || isNaN(lineY) || lineY >= endY) break;
                  
                  // Generate ruled line
                  if ((aTheme === 'rough' || aTheme === 'wobbly') && typeof (window as any).rough !== 'undefined') {
                    try {
                      const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                      const rc = (window as any).rough.svg(svg);
                      const roughness = aTheme === 'wobbly' ? 3 : 2;
                      
                      const roughLine = rc.line(startX, lineY, endX, lineY, {
                        roughness: roughness,
                        strokeWidth: aWidth,
                        stroke: aColor,
                        seed: seed + lineY
                      });
                      
                      const paths = roughLine.querySelectorAll('path');
                      let combinedPath = '';
                      paths.forEach((path: SVGPathElement) => {
                        const d = path.getAttribute('d');
                        if (d) combinedPath += d + ' ';
                      });
                      
                      if (combinedPath) {
                        const linePath = new Konva.Path({
                          data: combinedPath.trim(),
                          stroke: aColor,
                          strokeWidth: aWidth,
                          opacity: aOpacity,
                          strokeScaleEnabled: true,
                          rotation: elementRotation,
                          listening: false,
                        });
                        layer.add(linePath);
                        ruledLinesRenderedCount++;
                      } else {
                        const line = new Konva.Line({
                          points: [startX, lineY, endX, lineY],
                          stroke: aColor,
                          strokeWidth: aWidth,
                          opacity: aOpacity,
                          strokeScaleEnabled: true,
                          rotation: elementRotation,
                          listening: false,
                        });
                        layer.add(line);
                        ruledLinesRenderedCount++;
                      }
                    } catch (error) {
                      const line = new Konva.Line({
                        points: [startX, lineY, endX, lineY],
                        stroke: aColor,
                        strokeWidth: aWidth,
                        opacity: aOpacity,
                        strokeScaleEnabled: true,
                        rotation: elementRotation,
                        listening: false,
                      });
                      layer.add(line);
                      ruledLinesRenderedCount++;
                    }
                  } else {
                    const line = new Konva.Line({
                      points: [startX, lineY, endX, lineY],
                      stroke: aColor,
                      strokeWidth: aWidth,
                      opacity: aOpacity,
                      strokeScaleEnabled: true,
                      rotation: elementRotation,
                      listening: false,
                    });
                    layer.add(line);
                    ruledLinesRenderedCount++;
                  }
                  answerLineIndex++;
                }
                
                // Debug: Log inline layout ruled lines count
                console.log('[DEBUG PDFRenderer] Inline layout ruled lines rendered:');
                console.log('  elementId:', element.id);
                console.log('  linesCount:', ruledLinesRenderedCount);
                console.log('  questionLineCount:', questionLineCount);
                console.log('  canFitOnSameLine:', canFitOnSameLine);
              } else {
                // Only one type of text - generate simple lines
                const activeFontSize = answerText ? aFontSize : (questionStyle.fontSize || 45);
                let lineY = elementY + effectivePadding + (activeFontSize * 0.8) + 4;
                const endY = elementY + dynamicHeight - padding;
                
                while (lineY < endY) {
                  // Generate ruled line
                  if ((aTheme === 'rough' || aTheme === 'wobbly') && typeof (window as any).rough !== 'undefined') {
                    try {
                      const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                      const rc = (window as any).rough.svg(svg);
                      const roughness = aTheme === 'wobbly' ? 3 : 2;
                      
                      const roughLine = rc.line(startX, lineY, endX, lineY, {
                        roughness: roughness,
                        strokeWidth: aWidth,
                        stroke: aColor,
                        seed: seed + lineY
                      });
                      
                      const paths = roughLine.querySelectorAll('path');
                      let combinedPath = '';
                      paths.forEach((path: SVGPathElement) => {
                        const d = path.getAttribute('d');
                        if (d) combinedPath += d + ' ';
                      });
                      
                      if (combinedPath) {
                        const linePath = new Konva.Path({
                          data: combinedPath.trim(),
                          stroke: aColor,
                          strokeWidth: aWidth,
                          opacity: aOpacity,
                          strokeScaleEnabled: true,
                          rotation: elementRotation,
                          listening: false,
                        });
                        layer.add(linePath);
                      } else {
                        const line = new Konva.Line({
                          points: [startX, lineY, endX, lineY],
                          stroke: aColor,
                          strokeWidth: aWidth,
                          opacity: aOpacity,
                          strokeScaleEnabled: true,
                          rotation: elementRotation,
                          listening: false,
                        });
                        layer.add(line);
                      }
                    } catch (error) {
                      const line = new Konva.Line({
                        points: [startX, lineY, endX, lineY],
                        stroke: aColor,
                        strokeWidth: aWidth,
                        opacity: aOpacity,
                        strokeScaleEnabled: true,
                        rotation: elementRotation,
                        listening: false,
                      });
                      layer.add(line);
                    }
                  } else {
                    const line = new Konva.Line({
                      points: [startX, lineY, endX, lineY],
                      stroke: aColor,
                      strokeWidth: aWidth,
                      opacity: aOpacity,
                      strokeScaleEnabled: true,
                      rotation: elementRotation,
                      listening: false,
                    });
                    layer.add(line);
                  }
                  lineY += aLineHeight;
                  ruledLinesRenderedCount++;
                }
              }
            }
            
            // Debug: Log total ruled lines count
            console.log('[DEBUG PDFRenderer] Total ruled lines rendered (first path):');
            console.log('  elementId:', element.id);
            console.log('  totalLinesCount:', ruledLinesRenderedCount);
          }
        }
        // Render QnA elements (standard QnA textbox - textbox-qna.tsx logic)
        // qna_inline is deprecated and treated as qna
        if (element.textType === 'qna' || element.textType === 'qna2' || element.textType === 'qna_inline') {
          // Get tool defaults for qna
          const currentPage = state.currentBook?.pages?.find(p => p.id === page.id) || page;
          const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
          const bookTheme = bookData?.themeId || bookData?.bookTheme;
          const pageLayoutTemplateId = currentPage?.layoutTemplateId;
          const bookLayoutTemplateId = bookData?.layoutTemplateId;
          const pageColorPaletteId = currentPage?.colorPaletteId;
          const bookColorPaletteId = bookData?.colorPaletteId;

          const qnaDefaults = getToolDefaults(
            'qna',
            pageTheme,
            bookTheme,
            element,
            undefined,
            pageLayoutTemplateId,
            bookLayoutTemplateId,
            pageColorPaletteId,
            bookColorPaletteId
          );


          // Match client-side style extraction from textbox-qna.tsx
          const questionSettings = (element as any).questionSettings || {};
          const answerSettings = (element as any).answerSettings || {};
          const format = (element as any).format || {};
          
          // Determine alignment based on layout variant and individual settings (matching textbox-qna.tsx logic)
          const layoutVariant = (element as any).layoutVariant || 'inline';
          const individualSettings = (element as any).qnaIndividualSettings ?? false;
          
          // For question style align: if inline OR (block without individual settings), use shared align
          // Otherwise use individual question align
          let questionAlign: 'left' | 'center' | 'right' | 'justify' = 'left';
          if (layoutVariant === 'inline' || (layoutVariant === 'block' && !individualSettings)) {
            // Shared align: check element.align, element.format?.textAlign, questionSettings.align, answerSettings.align
            questionAlign = (element.align || format.textAlign || questionSettings.align || answerSettings.align || 'left') as 'left' | 'center' | 'right' | 'justify';
          } else {
            // Individual align: use questionSettings.align
            questionAlign = (questionSettings.align || element.align || format.textAlign || 'left') as 'left' | 'center' | 'right' | 'justify';
          }
          
          // For answer style align: if inline OR (block without individual settings), use shared align
          // Otherwise use individual answer align
          let answerAlign: 'left' | 'center' | 'right' | 'justify' = 'left';
          if (layoutVariant === 'inline' || (layoutVariant === 'block' && !individualSettings)) {
            // Shared align: check element.align, element.format?.textAlign, questionSettings.align, answerSettings.align
            answerAlign = (element.align || format.textAlign || questionSettings.align || answerSettings.align || 'left') as 'left' | 'center' | 'right' | 'justify';
          } else {
            // Individual align: use answerSettings.align
            answerAlign = (answerSettings.align || element.align || format.textAlign || 'left') as 'left' | 'center' | 'right' | 'justify';
          }
          
          const questionStyle = {
            fontSize: questionSettings.fontSize || qnaDefaults.questionSettings?.fontSize || qnaDefaults.fontSize || 42,
            fontFamily: resolveFontFamily(questionSettings.fontFamily || qnaDefaults.questionSettings?.fontFamily || qnaDefaults.fontFamily, questionSettings.fontBold ?? false, questionSettings.fontItalic ?? false),
            fontBold: questionSettings.fontBold ?? qnaDefaults.questionSettings?.fontBold ?? false,
            fontItalic: questionSettings.fontItalic ?? qnaDefaults.questionSettings?.fontItalic ?? false,
            fontColor: questionSettings.fontColor || qnaDefaults.questionSettings?.fontColor || '#666666',
            fontOpacity: questionSettings.fontOpacity ?? qnaDefaults.questionSettings?.fontOpacity ?? 1,
            paragraphSpacing: questionSettings.paragraphSpacing || qnaDefaults.questionSettings?.paragraphSpacing || (element as any).paragraphSpacing || 'small',
            align: questionAlign
          };
          
          const answerStyle = {
            fontSize: answerSettings.fontSize || qnaDefaults.answerSettings?.fontSize || qnaDefaults.fontSize || 48,
            fontFamily: resolveFontFamily(answerSettings.fontFamily || qnaDefaults.answerSettings?.fontFamily || qnaDefaults.fontFamily, answerSettings.fontBold ?? false, answerSettings.fontItalic ?? false),
            fontBold: answerSettings.fontBold ?? qnaDefaults.answerSettings?.fontBold ?? false,
            fontItalic: answerSettings.fontItalic ?? qnaDefaults.answerSettings?.fontItalic ?? false,
            fontColor: answerSettings.fontColor || qnaDefaults.answerSettings?.fontColor || '#1f2937',
            fontOpacity: answerSettings.fontOpacity ?? qnaDefaults.answerSettings?.fontOpacity ?? 1,
            paragraphSpacing: answerSettings.paragraphSpacing || qnaDefaults.answerSettings?.paragraphSpacing || (element as any).paragraphSpacing || 'medium',
            align: answerAlign
          };
          
          // When individualSettings is false, use answer font properties for question as well
          const effectiveQuestionStyle = individualSettings ? questionStyle : { ...questionStyle, ...answerStyle };
          
          const padding = element.padding ?? qnaDefaults.padding ?? 8;
          
          // Get question text
          let questionText = '';
          if (element.questionId) {
            const questionData = state.tempQuestions?.[element.questionId];
            if (questionData) {
              try {
                const parsed = JSON.parse(questionData);
                questionText = parsed?.text || questionData;
              } catch {
                questionText = questionData;
              }
            }
          }
          
          // Get answer text - match client-side logic exactly
          let answerText = element.text || element.formattedText || '';
          if (answerText && answerText.includes('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = answerText;
            answerText = tempDiv.textContent || tempDiv.innerText || '';
          }
          const sanitizedAnswer = answerText || '';
          const answerContent = sanitizedAnswer || 'Antwort hinzufügen...';
          
          // Use shared functions with feature flag fallback
          const LINE_HEIGHT: Record<string, number> = {
            small: 1,
            medium: 1.2,
            large: 1.5
          };
          
          const buildFont = FEATURE_FLAGS.USE_SHARED_TEXT_LAYOUT ? sharedBuildFont : (style: RichTextStyle) => {
            const weight = style.fontBold ? 'bold ' : '';
            const italic = style.fontItalic ? 'italic ' : '';
            return `${weight}${italic}${style.fontSize}px ${style.fontFamily}`;
          };
          
          const getLineHeight = FEATURE_FLAGS.USE_SHARED_TEXT_LAYOUT ? sharedGetLineHeight : (style: RichTextStyle) => {
            const spacing: 'small' | 'medium' | 'large' = style.paragraphSpacing || 'medium';
            return style.fontSize * (LINE_HEIGHT[spacing] || 1.2);
          };
          
          const measureText = FEATURE_FLAGS.USE_SHARED_TEXT_LAYOUT ? sharedMeasureText : (text: string, style: RichTextStyle, ctx: CanvasRenderingContext2D | null) => {
            if (!ctx) {
              return text.length * (style.fontSize * 0.6);
            }
            ctx.save();
            ctx.font = buildFont(style);
            const width = ctx.measureText(text).width;
            ctx.restore();
            return width;
          };
          
          const wrapText = FEATURE_FLAGS.USE_SHARED_TEXT_LAYOUT ? sharedWrapText : (text: string, style: RichTextStyle, maxWidth: number, ctx: CanvasRenderingContext2D | null) => {
            const lines: { text: string; width: number }[] = [];
            if (!text) return lines;
            const paragraphs = text.split('\n');
            paragraphs.forEach((paragraph, paragraphIdx) => {
              const words = paragraph.split(' ').filter(Boolean);
              if (words.length === 0) {
                lines.push({ text: '', width: 0 });
              } else {
                let currentLine = words[0];
                for (let i = 1; i < words.length; i += 1) {
                  const word = words[i];
                  const testLine = `${currentLine} ${word}`;
                  const testWidth = measureText(testLine, style, ctx);
                  if (testWidth > maxWidth && currentLine) {
                    lines.push({ text: currentLine, width: measureText(currentLine, style, ctx) });
                    currentLine = word;
                  } else {
                    currentLine = testLine;
                  }
                }
                lines.push({ text: currentLine, width: measureText(currentLine, style, ctx) });
              }
              if (paragraphIdx < paragraphs.length - 1) {
                lines.push({ text: '', width: 0 });
              }
            });
            return lines;
          };
          
          // Extract layout settings from element (layoutVariant already defined above)
          const questionPosition = (element as any).questionPosition || 'left';
          const questionWidth = (element as any).questionWidth ?? 40;
          const ruledLinesTarget = (element as any).ruledLinesTarget || 'answer';
          const blockQuestionAnswerGap = (element as any).blockQuestionAnswerGap ?? 10;
          const answerInNewRow = (element as any).answerInNewRow ?? false;
          // IMPORTANT: Match client-side logic exactly - use questionAnswerGap directly, no Horizontal/Vertical variants
          // Client uses: const questionAnswerGap = qnaElement.questionAnswerGap ?? 0;
          const questionAnswerGap = (element as any).questionAnswerGap ?? 0;
          
          // Helper function to calculate text X position based on alignment
          const calculateTextX = FEATURE_FLAGS.USE_SHARED_TEXT_LAYOUT ? sharedCalculateTextX : (text: string, style: RichTextStyle, startX: number, availableWidth: number, ctx: CanvasRenderingContext2D | null): number => {
            const align = style.align || 'left';
            const textWidth = measureText(text, style, ctx);
            
            switch (align) {
              case 'center':
                return startX + (availableWidth - textWidth) / 2;
              case 'right':
                return startX + availableWidth - textWidth;
              case 'justify':
                return startX;
              case 'left':
              default:
                return startX;
            }
          };
          
          // Create layout using sharedCreateLayout (same as textbox-qna.tsx)
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // NOTE: Font loading is handled by pdf-renderer-service.js before rendering
          // The fonts should already be loaded when this code executes
          // If fonts are not loaded, the measurement will use fallback metrics
          
          // Use sharedCreateLayout to get runs and linePositions (matching textbox-qna.tsx)
          const layout = sharedCreateLayout({
            questionText: questionText || '',
            answerText: answerContent,
            questionStyle: effectiveQuestionStyle,
            answerStyle: answerStyle,
            width: elementWidth,
            height: elementHeight,
            padding: padding,
            ctx: ctx,
            layoutVariant: layoutVariant,
            questionPosition: questionPosition,
            questionWidth: questionWidth,
            ruledLinesTarget: ruledLinesTarget,
            blockQuestionAnswerGap: blockQuestionAnswerGap,
            answerInNewRow: answerInNewRow,
            questionAnswerGap: questionAnswerGap
          });
          
          const runs = layout.runs;
          const linePositions = layout.linePositions;
          const contentHeight = layout.contentHeight;
          let blockRuledLinesNodes: Array<Konva.Path | Konva.Line> = [];
          
          // Block layout uses different logic for ruled lines
          if (layoutVariant === 'block') {
            // Get question and answer areas from layout (if available)
            const questionArea = layout.questionArea || { x: padding, y: padding, width: elementWidth - padding * 2, height: elementHeight - padding * 2 };
            const answerArea = layout.answerArea || { x: padding, y: padding, width: elementWidth - padding * 2, height: elementHeight - padding * 2 };
            
            // Collect ruled lines nodes for block layout (will be inserted after background)
            blockRuledLinesNodes = [];
            const ruledLines = (element as any).ruledLines ?? false;
            if (ruledLines && linePositions.length > 0) {
              const ruledLinesWidth = (element as any).ruledLinesWidth ?? 0.8;
              const ruledLinesTheme = (element as any).ruledLinesTheme || 'rough';
              const ruledLinesColor = (element as any).ruledLinesColor || '#1f2937';
              const ruledLinesOpacity = (element as any).ruledLinesOpacity ?? 1;
              const targetArea = ruledLinesTarget === 'question' ? questionArea : answerArea;
              
              // Filter line positions by target (question or answer)
              const targetLinePositions = linePositions.filter((linePos) => {
                if (!linePos.style) return false;
                // Compare style properties to identify target lines
                const targetStyle = ruledLinesTarget === 'question' ? questionStyle : answerStyle;
                // Use fontSize as primary identifier (most reliable)
                const styleMatches = linePos.style.fontSize === targetStyle.fontSize;
                // Also check fontFamily if available
                const familyMatches = !linePos.style.fontFamily || !targetStyle.fontFamily || 
                                     linePos.style.fontFamily === targetStyle.fontFamily;
                return styleMatches && familyMatches;
              });
              
              targetLinePositions.forEach((linePos) => {
                // Check if line is within the target area (vertically)
                if (linePos.y >= targetArea.y && linePos.y <= targetArea.y + targetArea.height) {
                  // Use the target area's x position and width, not the full width
                  // This ensures lines are only drawn within the question or answer block
                  const startX = elementX + targetArea.x;
                  const endX = elementX + targetArea.x + targetArea.width;
                  
                  // Generate ruled line using generateLinePath (matching client-side behavior)
                  const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                  const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly'];
                  const theme = (supportedThemes.includes(ruledLinesTheme as Theme) ? ruledLinesTheme : 'default') as Theme;
                  
                  // Create a temporary element for theme-specific settings
                  const tempElement: CanvasElement = {
                    ...element,
                    type: 'line',
                    id: element.id + '-ruled-line',
                    x: 0,
                    y: 0,
                    width: Math.abs(endX - startX),
                    height: 0,
                    strokeWidth: ruledLinesWidth,
                    stroke: ruledLinesColor,
                    theme: theme as CanvasElement['theme']
                  };
                  
                  // Generate path using generateLinePath (same as renderThemedLine uses internally)
                  const pathData = generateLinePath({
                    x1: startX,
                    y1: elementY + linePos.y,
                    x2: endX,
                    y2: elementY + linePos.y,
                    strokeWidth: ruledLinesWidth,
                    stroke: ruledLinesColor,
                    theme: theme,
                    seed: seed + linePos.y,
                    roughness: theme === 'rough' ? 2 : 1,
                    element: tempElement
                  });
                  
                  let lineNode: Konva.Path | Konva.Line | null = null;
                  if (pathData) {
                    // Get stroke props from theme renderer (important for candy theme which uses fill instead of stroke)
                    const themeRenderer = getThemeRenderer(theme);
                    const strokeProps = themeRenderer.getStrokeProps(tempElement);
                    
                    lineNode = new Konva.Path({
                      data: pathData,
                      stroke: strokeProps.stroke !== undefined && strokeProps.stroke !== 'transparent' ? strokeProps.stroke : ruledLinesColor,
                      strokeWidth: strokeProps.strokeWidth !== undefined ? strokeProps.strokeWidth : ruledLinesWidth,
                      fill: strokeProps.fill !== undefined ? strokeProps.fill : 'transparent',
                      opacity: ruledLinesOpacity * elementOpacity,
                      strokeScaleEnabled: true,
                      rotation: elementRotation,
                      listening: false,
                      visible: true,
                      lineCap: strokeProps.lineCap || 'round',
                      lineJoin: strokeProps.lineJoin || 'round'
                    });
                  } else {
                    // Fallback to simple line if path generation fails
                    lineNode = new Konva.Line({
                      points: [startX, elementY + linePos.y, endX, elementY + linePos.y],
                      stroke: ruledLinesColor,
                      strokeWidth: ruledLinesWidth,
                      opacity: ruledLinesOpacity * elementOpacity,
                      rotation: elementRotation,
                      listening: false,
                      visible: true
                    });
                  }
                  
                  if (lineNode) {
                    blockRuledLinesNodes.push(lineNode);
                  }
                }
              });
              
              // Generate additional ruled lines to fill the rest of the target area (matching client-side logic)
              // This only applies to answer lines (ruledLinesTarget === 'answer')
              if (ruledLinesTarget === 'answer' && targetLinePositions.length > 0) {
                const answerLineHeight = sharedGetLineHeight(answerStyle);
                const lastLinePosition = targetLinePositions[targetLinePositions.length - 1];
                let nextLineY = lastLinePosition.y + lastLinePosition.lineHeight;
                
                // Determine start and end X positions and bottom Y (all relative to element)
                // targetArea coordinates are already relative to element (x, y are relative to element origin)
                const relativeStartX = targetArea.x;
                const relativeEndX = targetArea.x + targetArea.width;
                const relativeBottomY = targetArea.y + targetArea.height;
                
                // Generate additional lines until we reach the bottom
                // nextLineY is relative to element (0 = top of element)
                while (nextLineY <= relativeBottomY) {
                  // Generate ruled line
                  // Convert relative coordinates to absolute for rendering
                  const absoluteStartX = elementX + relativeStartX;
                  const absoluteEndX = elementX + relativeEndX;
                  const absoluteLineY = elementY + nextLineY;
                  
                  // Generate ruled line using generateLinePath (matching client-side behavior)
                  const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                  const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly'];
                  const theme = (supportedThemes.includes(ruledLinesTheme as Theme) ? ruledLinesTheme : 'default') as Theme;
                  
                  // Create a temporary element for theme-specific settings
                  const tempElement: CanvasElement = {
                    ...element,
                    type: 'line' as const,
                    id: element.id + '-ruled-line-extra',
                    x: 0,
                    y: 0,
                    width: Math.abs(absoluteEndX - absoluteStartX),
                    height: 0,
                    strokeWidth: ruledLinesWidth,
                    stroke: ruledLinesColor,
                    theme: theme as CanvasElement['theme']
                  };
                  
                  // Generate path using generateLinePath (same as renderThemedLine uses internally)
                  const pathData = generateLinePath({
                    x1: absoluteStartX,
                    y1: absoluteLineY,
                    x2: absoluteEndX,
                    y2: absoluteLineY,
                    strokeWidth: ruledLinesWidth,
                    stroke: ruledLinesColor,
                    theme: theme,
                    seed: seed + nextLineY,
                    roughness: theme === 'rough' ? 2 : 1,
                    element: tempElement
                  });
                  
                  let lineNode: Konva.Path | Konva.Line | null = null;
                  if (pathData) {
                    // Get stroke props from theme renderer (important for candy theme which uses fill instead of stroke)
                    const themeRenderer = getThemeRenderer(theme);
                    const strokeProps = themeRenderer.getStrokeProps(tempElement);
                    
                    lineNode = new Konva.Path({
                      data: pathData,
                      stroke: strokeProps.stroke !== undefined && strokeProps.stroke !== 'transparent' ? strokeProps.stroke : ruledLinesColor,
                      strokeWidth: strokeProps.strokeWidth !== undefined ? strokeProps.strokeWidth : ruledLinesWidth,
                      fill: strokeProps.fill !== undefined ? strokeProps.fill : 'transparent',
                      opacity: ruledLinesOpacity * elementOpacity,
                      strokeScaleEnabled: true,
                      rotation: elementRotation,
                      listening: false,
                      visible: true,
                      lineCap: strokeProps.lineCap || 'round',
                      lineJoin: strokeProps.lineJoin || 'round'
                    });
                  } else {
                    // Fallback to simple line if path generation fails
                    lineNode = new Konva.Line({
                      points: [absoluteStartX, absoluteLineY, absoluteEndX, absoluteLineY],
                      stroke: ruledLinesColor,
                      strokeWidth: ruledLinesWidth,
                      opacity: ruledLinesOpacity * elementOpacity,
                      rotation: elementRotation,
                      listening: false,
                      visible: true
                    });
                  }
                  
                  if (lineNode) {
                    blockRuledLinesNodes.push(lineNode);
                  }
                  
                  nextLineY += answerLineHeight;
                }
              }
            }
          }
          // Inline layout - runs and linePositions are already created by sharedCreateLayout
          // No manual creation needed - sharedCreateLayout handles everything
          
          // Render background if enabled
          // Match client-side logic: check backgroundEnabled first, then fallback to style settings
          const showBackground = (element as any).backgroundEnabled ?? 
            (questionStyle.background?.enabled || answerStyle.background?.enabled) ?? false;
          
          // Debug: Log background check
          console.log('[DEBUG PDFRenderer] QnA Background check:');
          console.log('  elementId:', element.id);
          console.log('  element.backgroundEnabled:', (element as any).backgroundEnabled);
          console.log('  questionStyle.background?.enabled:', questionStyle.background?.enabled);
          console.log('  answerStyle.background?.enabled:', answerStyle.background?.enabled);
          console.log('  showBackground:', showBackground);
          
          let bgRect: Konva.Rect | null = null;
          if (showBackground) {
            // Get backgroundColor from element, questionStyle, or answerStyle
            const backgroundColor = (element as any).backgroundColor || 
              questionStyle.background?.backgroundColor || 
              answerStyle.background?.backgroundColor || 
              'transparent';
            // Don't render if backgroundColor is transparent or empty
            if (backgroundColor !== 'transparent' && backgroundColor) {
              const backgroundOpacity = (element as any).backgroundOpacity !== undefined 
                ? (element as any).backgroundOpacity 
                : questionStyle.backgroundOpacity ?? answerStyle.backgroundOpacity ?? 1;
              const cornerRadius = (element as any).cornerRadius ?? qnaDefaults.cornerRadius ?? 0;
              
              bgRect = new Konva.Rect({
                x: elementX,
                y: elementY,
                width: elementWidth,
                height: contentHeight,
                fill: backgroundColor,
                opacity: backgroundOpacity * elementOpacity,
                cornerRadius: cornerRadius,
                rotation: elementRotation,
                listening: false,
              });
              
              // Add background and position it after page background, but before other elements
              layer.add(bgRect);
              
              // Find all page background nodes (full canvas size at 0,0) and move bgRect after them
              const stage = layer.getStage();
              const stageWidth = stage ? stage.width() : width;
              const stageHeight = stage ? stage.height() : height;
              
              let lastPageBgIndex = -1;
              layer.getChildren().forEach((node, idx) => {
                if (node === bgRect) return; // Skip self
                if (node.getClassName() !== 'Rect' && node.getClassName() !== 'Image') return;
                const nodeX = node.x ? node.x() : 0;
                const nodeY = node.y ? node.y() : 0;
                const nodeWidth = node.width ? node.width() : 0;
                const nodeHeight = node.height ? node.height() : 0;
                if (nodeX === 0 && nodeY === 0 && nodeWidth === stageWidth && nodeHeight === stageHeight) {
                  lastPageBgIndex = Math.max(lastPageBgIndex, idx);
                }
              });
              
              // Move bgRect to position right after last page background node
              if (lastPageBgIndex !== -1) {
                const bgRectIndex = layer.getChildren().indexOf(bgRect);
                if (bgRectIndex !== -1 && bgRectIndex !== lastPageBgIndex + 1) {
                  layer.getChildren().splice(bgRectIndex, 1);
                  layer.getChildren().splice(lastPageBgIndex + 1, 0, bgRect);
                }
              }
              
              // Debug: Log background rendering - Log values directly
              console.log('[DEBUG PDFRenderer] QnA Background rendered:');
              console.log('  elementId:', element.id);
              console.log('  backgroundColor:', backgroundColor);
              console.log('  backgroundOpacity:', backgroundOpacity);
              console.log('  elementOpacity:', elementOpacity);
              console.log('  finalOpacity:', backgroundOpacity * elementOpacity);
              console.log('  showBackground:', showBackground);
              console.log('  bgRectIndex:', layer.getChildren().indexOf(bgRect));
              console.log('  lastPageBgIndex:', lastPageBgIndex);
            }
          }
          
          // Collect all ruled lines nodes (block and inline) for z-index management
          let allRuledLinesNodes: Array<Konva.Path | Konva.Line> = [];
          
          // Insert block layout ruled lines after background (if they exist)
          if (layoutVariant === 'block' && blockRuledLinesNodes && blockRuledLinesNodes.length > 0) {
            allRuledLinesNodes = [...blockRuledLinesNodes];
            const insertIndex = bgRect ? layer.getChildren().indexOf(bgRect) + 1 : layer.getChildren().length;
            blockRuledLinesNodes.forEach((lineNode, idx) => {
              layer.add(lineNode);
              const currentIndex = layer.getChildren().indexOf(lineNode);
              if (currentIndex !== insertIndex + idx) {
                layer.getChildren().splice(currentIndex, 1);
                layer.getChildren().splice(insertIndex + idx, 0, lineNode);
              }
            });
          }
          
          // Render ruled lines if enabled (after background, before border and text)
          // Note: For block layout, ruled lines are already rendered above (within the block layout section)
          // This section only handles inline layout
          const ruledLines = (element as any).ruledLines ?? false;
          const ruledLinesNodes: Array<Konva.Path | Konva.Line> = [];
          
          // Debug logging for ruled lines - Log values directly
          console.log('[DEBUG PDFRenderer] Ruled lines check:');
          console.log('  elementId:', element.id);
          console.log('  ruledLines:', ruledLines);
          console.log('  layoutVariant:', layoutVariant);
          console.log('  hasLinePositions:', !!linePositions);
          console.log('  linePositionsCount:', linePositions ? linePositions.length : 0);
          console.log('  elementHeight:', elementHeight);
          console.log('  elementWidth:', elementWidth);
          
          if (ruledLines && linePositions && linePositions.length > 0 && layoutVariant !== 'block') {
            const ruledLinesWidth = (element as any).ruledLinesWidth ?? 0.8;
            const ruledLinesTheme = (element as any).ruledLinesTheme || 'rough';
            const ruledLinesColor = (element as any).ruledLinesColor || '#1f2937';
            const ruledLinesOpacity = (element as any).ruledLinesOpacity ?? 1;
            
            linePositions.forEach((linePos) => {
              // For inline layout, use full width with padding
              // Only generate lines that are within the box dimensions (0 <= y <= elementHeight)
              // Match client-side logic: if (linePos.y >= 0 && linePos.y <= boxHeight)
              if (linePos.y < 0 || linePos.y > elementHeight) {
                console.log('[PDFRenderer] Skipping ruled line (out of bounds):', {
                  linePosY: linePos.y,
                  elementHeight: elementHeight,
                  condition: linePos.y < 0 || linePos.y > elementHeight
                });
                return;
              }
              
              const startX = elementX + padding;
              const endX = elementX + elementWidth - padding;
              
              console.log('[PDFRenderer] Rendering ruled line (inline):', {
                linePosY: linePos.y,
                elementHeight: elementHeight,
                startX: startX,
                endX: endX,
                elementX: elementX,
                elementY: elementY,
                padding: padding,
                absoluteY: elementY + linePos.y
              });
              
              // Generate ruled line using generateLinePath (matching client-side behavior)
              const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
              const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly'];
              const theme = (supportedThemes.includes(ruledLinesTheme as Theme) ? ruledLinesTheme : 'default') as Theme;
              
              // Create a temporary element for theme-specific settings
              const tempElement: CanvasElement = {
                ...element,
                type: 'line',
                id: element.id + '-ruled-line',
                x: 0,
                y: 0,
                width: Math.abs(endX - startX),
                height: 0,
                strokeWidth: ruledLinesWidth,
                stroke: ruledLinesColor,
                theme: theme as CanvasElement['theme']
              };
              
              // Generate path using generateLinePath (same as renderThemedLine uses internally)
              const pathData = generateLinePath({
                x1: startX,
                y1: elementY + linePos.y,
                x2: endX,
                y2: elementY + linePos.y,
                strokeWidth: ruledLinesWidth,
                stroke: ruledLinesColor,
                theme: theme,
                seed: seed + linePos.y,
                roughness: theme === 'rough' ? 2 : 1,
                element: tempElement
              });
              
              let lineNode: Konva.Path | Konva.Line | null = null;
              if (pathData) {
                // Get stroke props from theme renderer (important for candy theme which uses fill instead of stroke)
                const themeRenderer = getThemeRenderer(theme);
                const strokeProps = themeRenderer.getStrokeProps(tempElement);
                
                lineNode = new Konva.Path({
                  data: pathData,
                  stroke: strokeProps.stroke !== undefined && strokeProps.stroke !== 'transparent' ? strokeProps.stroke : ruledLinesColor,
                  strokeWidth: strokeProps.strokeWidth !== undefined ? strokeProps.strokeWidth : ruledLinesWidth,
                  fill: strokeProps.fill !== undefined ? strokeProps.fill : 'transparent',
                  opacity: ruledLinesOpacity * elementOpacity,
                  strokeScaleEnabled: true,
                  rotation: elementRotation,
                  listening: false,
                  visible: true,
                  lineCap: strokeProps.lineCap || 'round',
                  lineJoin: strokeProps.lineJoin || 'round'
                });
              } else {
                // Fallback to simple line if path generation fails
                lineNode = new Konva.Line({
                  points: [startX, elementY + linePos.y, endX, elementY + linePos.y],
                  stroke: ruledLinesColor,
                  strokeWidth: ruledLinesWidth,
                  opacity: ruledLinesOpacity * elementOpacity,
                  rotation: elementRotation,
                  listening: false,
                  visible: true
                });
              }
              
              if (lineNode) {
                ruledLinesNodes.push(lineNode);
              }
            });
            
            // Generate additional ruled lines to fill the rest of the textbox (matching client-side logic)
            // This only applies to answer lines (ruledLinesTarget === 'answer')
            if (ruledLinesTarget === 'answer' && linePositions && linePositions.length > 0) {
              // Filter line positions by target (answer)
              // For inline layout, we need to filter by style properties
              const targetLinePositions = linePositions.filter((linePos) => {
                if (!linePos.style) return false;
                // Compare style properties to identify answer lines
                // Use fontSize as primary identifier (most reliable)
                const styleMatches = linePos.style.fontSize === answerStyle.fontSize;
                // Also check fontFamily if available
                const familyMatches = !linePos.style.fontFamily || !answerStyle.fontFamily || 
                                     linePos.style.fontFamily === answerStyle.fontFamily;
                return styleMatches && familyMatches;
              });
              
              if (targetLinePositions.length > 0) {
                const answerLineHeight = sharedGetLineHeight(answerStyle);
                const lastLinePosition = targetLinePositions[targetLinePositions.length - 1];
                let nextLineY = lastLinePosition.y + lastLinePosition.lineHeight;
                
                // Determine start and end X positions and bottom Y (all relative to element)
                const relativeStartX = padding;
                const relativeEndX = elementWidth - padding;
                const relativeBottomY = elementHeight - padding;
                
                // Generate additional lines until we reach the bottom
                // nextLineY is relative to element (0 = top of element)
                while (nextLineY <= relativeBottomY) {
                  // Generate ruled line
                  // Convert relative coordinates to absolute for rendering
                  const absoluteStartX = elementX + relativeStartX;
                  const absoluteEndX = elementX + relativeEndX;
                  const absoluteLineY = elementY + nextLineY;
                  
                  // Generate ruled line using generateLinePath (matching client-side behavior)
                  const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                  const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly'];
                  const theme = (supportedThemes.includes(ruledLinesTheme as Theme) ? ruledLinesTheme : 'default') as Theme;
                  
                  // Create a temporary element for theme-specific settings
                  const tempElement: CanvasElement = {
                    ...element,
                    type: 'line' as const,
                    id: element.id + '-ruled-line-extra',
                    x: 0,
                    y: 0,
                    width: Math.abs(absoluteEndX - absoluteStartX),
                    height: 0,
                    strokeWidth: ruledLinesWidth,
                    stroke: ruledLinesColor,
                    theme: theme as CanvasElement['theme']
                  };
                  
                  // Generate path using generateLinePath (same as renderThemedLine uses internally)
                  const pathData = generateLinePath({
                    x1: absoluteStartX,
                    y1: absoluteLineY,
                    x2: absoluteEndX,
                    y2: absoluteLineY,
                    strokeWidth: ruledLinesWidth,
                    stroke: ruledLinesColor,
                    theme: theme,
                    seed: seed + nextLineY,
                    roughness: theme === 'rough' ? 2 : 1,
                    element: tempElement
                  });
                  
                  let lineNode: Konva.Path | Konva.Line | null = null;
                  if (pathData) {
                    // Get stroke props from theme renderer (important for candy theme which uses fill instead of stroke)
                    const themeRenderer = getThemeRenderer(theme);
                    const strokeProps = themeRenderer.getStrokeProps(tempElement);
                    
                    lineNode = new Konva.Path({
                      data: pathData,
                      stroke: strokeProps.stroke !== undefined && strokeProps.stroke !== 'transparent' ? strokeProps.stroke : ruledLinesColor,
                      strokeWidth: strokeProps.strokeWidth !== undefined ? strokeProps.strokeWidth : ruledLinesWidth,
                      fill: strokeProps.fill !== undefined ? strokeProps.fill : 'transparent',
                      opacity: ruledLinesOpacity * elementOpacity,
                      strokeScaleEnabled: true,
                      rotation: elementRotation,
                      listening: false,
                      visible: true,
                      lineCap: strokeProps.lineCap || 'round',
                      lineJoin: strokeProps.lineJoin || 'round'
                    });
                  } else {
                    // Fallback to simple line if path generation fails
                    lineNode = new Konva.Line({
                      points: [absoluteStartX, absoluteLineY, absoluteEndX, absoluteLineY],
                      stroke: ruledLinesColor,
                      strokeWidth: ruledLinesWidth,
                      opacity: ruledLinesOpacity * elementOpacity,
                      rotation: elementRotation,
                      listening: false,
                      visible: true
                    });
                  }
                  
                  if (lineNode) {
                    ruledLinesNodes.push(lineNode);
                  }
                  
                  nextLineY += answerLineHeight;
                }
              }
            }
            
            // Insert all ruled lines after background
            if (ruledLinesNodes.length > 0) {
              const insertIndex = bgRect ? layer.getChildren().indexOf(bgRect) + 1 : layer.getChildren().length;
              ruledLinesNodes.forEach((lineNode, idx) => {
                layer.add(lineNode);
                const currentIndex = layer.getChildren().indexOf(lineNode);
                if (currentIndex !== insertIndex + idx) {
                  layer.getChildren().splice(currentIndex, 1);
                  layer.getChildren().splice(insertIndex + idx, 0, lineNode);
                }
              });
            }
          }
          
          // Render border if enabled
          const showBorder = (element as any).borderEnabled && (element as any).borderColor && (element as any).borderWidth !== undefined;
          if (showBorder) {
            const borderColor = (element as any).borderColor || qnaDefaults.borderColor || '#000000';
            const borderWidth = (element as any).borderWidth || 1;
            const borderOpacity = (element as any).borderOpacity !== undefined ? (element as any).borderOpacity : 1;
            const cornerRadius = (element as any).cornerRadius ?? qnaDefaults.cornerRadius ?? 0;
            // Match client-side logic: Check element.borderTheme first, then fallback to element.theme, then 'default'
            // This matches textbox-qna.tsx line 2025: const themeValue = qnaElement.borderTheme || element.theme || 'default';
            const borderThemeRaw = (element as any).borderTheme || 
                                  element.theme ||
                                  (element as any).questionSettings?.borderTheme || 
                                  (element as any).answerSettings?.borderTheme || 
                                  'default';
            // Map 'sketchy' to 'rough' if needed (matching textbox-qna.tsx)
            const borderThemeRawMapped = borderThemeRaw === 'sketchy' ? 'rough' : borderThemeRaw;
            const borderTheme = borderThemeRawMapped as 'default' | 'rough' | 'glow' | 'candy' | 'zigzag' | 'wobbly'; // Use the selected theme directly (don't map 'default' to 'rough')
            
            const themeRenderer = getThemeRenderer(borderTheme);

            // Use themeRenderer directly - 'default' is now a valid theme that renders straight lines
            if (themeRenderer) {
              // Create a temporary element-like object for generatePath
              // Set roughness to 8 for 'rough' theme to match client-side rendering
              // IMPORTANT: For 'candy' theme, increase strokeWidth server-side to make circles larger
              // This compensates for rendering differences between client and server
              // Also reduce spacing between circles by using a spacing multiplier
              const adjustedBorderWidth = borderTheme === 'candy' ? borderWidth * 1.45 : borderWidth;
              
              const borderElement = {
                type: 'rect' as const,
                id: (element as any).id + '-border',
                x: 0,
                y: 0,
                width: elementWidth,
                height: contentHeight,
                cornerRadius: cornerRadius,
                stroke: borderColor,
                strokeWidth: adjustedBorderWidth,
                fill: 'transparent',
                roughness: borderTheme === 'rough' ? 8 : (borderTheme === 'sketchy' ? 2 : 1),
                theme: borderTheme,
                // Add spacing multiplier for candy theme to reduce gaps between circles
                // This is only used server-side, client-side spacing remains unchanged
                candySpacingMultiplier: borderTheme === 'candy' ? 0.7 : undefined
              } as CanvasElement;
              
              const pathData = themeRenderer.generatePath(borderElement);
              
              // Get stroke props from theme renderer (important for candy theme which uses fill instead of stroke)
              const strokeProps = themeRenderer.getStrokeProps(borderElement);
              
              if (pathData) {
                // For candy theme, use adjusted borderWidth for strokeWidth to match larger circles
                // Candy theme uses fill instead of stroke, so strokeWidth doesn't affect rendering
                // but we keep it consistent for potential future changes
                const pathStrokeWidth = borderTheme === 'candy' ? adjustedBorderWidth : (strokeProps.strokeWidth || borderWidth);
                
                const borderPath = new Konva.Path({
                  data: pathData,
                  x: elementX,
                  y: elementY,
                  stroke: strokeProps.stroke || borderColor,
                  strokeWidth: pathStrokeWidth,
                  fill: strokeProps.fill !== undefined ? strokeProps.fill : 'transparent',
                  opacity: borderOpacity * elementOpacity,
                  strokeScaleEnabled: true,
                  rotation: elementRotation,
                  listening: false,
                  lineCap: strokeProps.lineCap || 'round',
                  lineJoin: strokeProps.lineJoin || 'round',
                });
                layer.add(borderPath);
                
                // Insert border after ruled lines (or after background if no ruled lines)
                const totalRuledLinesCount = allRuledLinesNodes.length + ruledLinesNodes.length;
                const insertAfterIndex = bgRect ? layer.getChildren().indexOf(bgRect) + 1 + totalRuledLinesCount : layer.getChildren().length;
                const borderPathIndex = layer.getChildren().indexOf(borderPath);
                if (borderPathIndex !== -1 && borderPathIndex !== insertAfterIndex) {
                  layer.getChildren().splice(borderPathIndex, 1);
                  layer.getChildren().splice(insertAfterIndex, 0, borderPath);
                }
              } else {
                // Fallback to Rect if path generation fails
                const borderRect = new Konva.Rect({
                  x: elementX,
                  y: elementY,
                  width: elementWidth,
                  height: contentHeight,
                  fill: 'transparent',
                  stroke: borderColor,
                  strokeWidth: borderWidth,
                  opacity: borderOpacity * elementOpacity,
                  cornerRadius: cornerRadius,
                  rotation: elementRotation,
                  listening: false,
                });
                layer.add(borderRect);
                
                // Insert border after ruled lines (or after background if no ruled lines)
                const totalRuledLinesCount = allRuledLinesNodes.length + ruledLinesNodes.length;
                const insertAfterIndex = bgRect ? layer.getChildren().indexOf(bgRect) + 1 + totalRuledLinesCount : layer.getChildren().length;
                const borderRectIndex = layer.getChildren().indexOf(borderRect);
                if (borderRectIndex !== -1 && borderRectIndex !== insertAfterIndex) {
                  layer.getChildren().splice(borderRectIndex, 1);
                  layer.getChildren().splice(insertAfterIndex, 0, borderRect);
                }
              }
            } else {
              // Default: simple rect border
              const borderRect = new Konva.Rect({
                x: elementX,
                y: elementY,
                width: elementWidth,
                height: contentHeight,
                fill: 'transparent',
                stroke: borderColor,
                strokeWidth: borderWidth,
                opacity: borderOpacity * elementOpacity,
                cornerRadius: cornerRadius,
                rotation: elementRotation,
                listening: false,
              });
              layer.add(borderRect);
              
              // Insert border after ruled lines (or after background if no ruled lines)
              const totalRuledLinesCount = allRuledLinesNodes.length + ruledLinesNodes.length;
              const insertAfterIndex = bgRect ? layer.getChildren().indexOf(bgRect) + 1 + totalRuledLinesCount : layer.getChildren().length;
              const borderRectIndex = layer.getChildren().indexOf(borderRect);
              if (borderRectIndex !== -1 && borderRectIndex !== insertAfterIndex) {
                layer.getChildren().splice(borderRectIndex, 1);
                layer.getChildren().splice(insertAfterIndex, 0, borderRect);
              }
            }
          }
          
          // Render text runs using a single Konva.Shape (matching textbox-qna.tsx RichTextShape behavior)
          // IMPORTANT: Client uses a SINGLE Shape for ALL runs, not one Shape per run
          // The Shape is positioned at (elementX, elementY), then all runs are drawn within it
          if (runs.length > 0) {
            const textShape = new Konva.Shape({
              x: elementX,
              y: elementY,
              sceneFunc: (ctx, shape) => {
                ctx.save();
                // Use 'alphabetic' baseline for proper text alignment (matching client)
                ctx.textBaseline = 'alphabetic';
                // Draw all runs within this single shape (like client-side RichTextShape)
                runs.forEach((run) => {
                  const style = run.style;
                  // Build font string with bold/italic support (like client)
                  const fontString = sharedBuildFont(style);
                  const textColor = style.fontColor || '#000000';
                  const textOpacity = (style.fontOpacity !== undefined ? style.fontOpacity : 1) * elementOpacity;
                  
                  ctx.font = fontString;
                  ctx.fillStyle = textColor;
                  ctx.globalAlpha = textOpacity;
                  // Y position is already the baseline position (from sharedCreateLayout)
                  ctx.fillText(run.text || '', run.x, run.y);
                });
                ctx.restore();
                ctx.fillStrokeShape(shape);
              },
              width: elementWidth,
              height: contentHeight,
              rotation: elementRotation,
              listening: false,
              visible: true
            });
            
            layer.add(textShape);
          }
        }
        // Render free_text elements
        else if (element.textType === 'free_text') {
          let textContent = element.formattedText || element.text || '';
          
          if (textContent.includes('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = textContent;
            textContent = tempDiv.textContent || tempDiv.innerText || '';
          }
          
          if (textContent && textContent.trim() !== '') {
            // Get tool defaults for free_text
            const currentPage = state.currentBook?.pages?.find(p => p.id === page.id) || page;
            const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
            const bookTheme = bookData?.themeId || bookData?.bookTheme;
            const pageLayoutTemplateId = currentPage?.layoutTemplateId;
            const bookLayoutTemplateId = bookData?.layoutTemplateId;
            const pageColorPaletteId = currentPage?.colorPaletteId;
            const bookColorPaletteId = bookData?.colorPaletteId;
            
            const freeTextDefaults = getToolDefaults(
              'free_text',
              pageTheme,
              bookTheme,
              element,
              undefined,
              pageLayoutTemplateId,
              bookLayoutTemplateId,
              pageColorPaletteId,
              bookColorPaletteId
            );
            
            const textStyle = {
              ...freeTextDefaults.textSettings,
              ...element.textSettings,
            };
            
            const fontSize = textStyle.fontSize || freeTextDefaults.fontSize || 50;
            const fontBold = textStyle.fontBold ?? false;
            const fontItalic = textStyle.fontItalic ?? false;
            const fontFamily = resolveFontFamily(textStyle.fontFamily || freeTextDefaults.fontFamily, fontBold, fontItalic);
            const fontColor = textStyle.fontColor || '#000000';
            const fontOpacity = textStyle.fontOpacity ?? 1;
            const padding = textStyle.padding || element.padding || 4;
            
            const textNode = new Konva.Text({
              x: elementX + padding,
              y: elementY + padding,
              text: textContent,
              fontSize: fontSize,
              fontFamily: fontFamily,
              fontStyle: fontItalic ? 'italic' : 'normal',
              fontWeight: fontBold ? 'bold' : 'normal',
              fill: fontColor,
              width: elementWidth - (padding * 2),
              height: elementHeight - (padding * 2),
              align: textStyle.align || element.align || 'left',
              verticalAlign: 'top',
              wrap: 'word',
              rotation: elementRotation,
              opacity: elementOpacity * fontOpacity,
              visible: true,
              listening: false
            });
            
            layer.add(textNode);
          }
        }
        // Render regular text elements
        else if (element.type === 'text') {
          let textContent = element.formattedText || element.text || '';
          
          if (textContent.includes('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = textContent;
            textContent = tempDiv.textContent || tempDiv.innerText || '';
          }
          
          if (textContent && textContent.trim() !== '') {
            // Use element properties with better defaults
            const fontSize = element.fontSize || element.font?.fontSize || 50;
            const fontColor = element.fontColor || element.font?.fontColor || '#000000';
            const fontBold = element.font?.fontBold ?? false;
            const fontItalic = element.font?.fontItalic ?? false;
            const fontFamilyRaw = element.fontFamily || element.font?.fontFamily || 'Arial, sans-serif';
            const fontFamily = resolveFontFamily(fontFamilyRaw, fontBold, fontItalic);
            const fontWeight = element.fontWeight || element.font?.fontWeight || (fontBold ? 'bold' : 'normal');
            const fontStyle = element.fontStyle || element.font?.fontStyle || (fontItalic ? 'italic' : 'normal');
            
            const textNode = new Konva.Text({
              x: elementX,
              y: elementY,
              text: textContent,
              fontSize: fontSize,
              fontFamily: fontFamily,
              fontStyle: fontStyle,
              fontWeight: fontWeight,
              fill: fontColor,
              width: elementWidth,
              height: elementHeight,
              align: element.align || 'left',
              verticalAlign: element.verticalAlign || 'top',
              wrap: 'word',
              rotation: elementRotation,
              opacity: elementOpacity,
              visible: true,
              listening: false
            });
            
            layer.add(textNode);
          }
        }
        // Render image elements (including stickers and placeholders)
        else if (element.type === 'image' || element.type === 'sticker' || element.type === 'placeholder') {
          console.log('[PDFRenderer] Rendering image element:', {
            elementId: element.id,
            elementType: element.type,
            hasSrc: !!element.src,
            src: element.src,
            x: elementX,
            y: elementY,
            width: elementWidth,
            height: elementHeight
          });
          
          // Handle placeholder: render placeholder UI
          if (element.type === 'placeholder') {
            const placeholderGroup = new Konva.Group({
              x: elementX,
              y: elementY,
              rotation: elementRotation,
              opacity: elementOpacity,
              listening: false
            });
            
            // Background rectangle
            const bgRect = new Konva.Rect({
              width: elementWidth,
              height: elementHeight,
              fill: '#f3f4f6',
              stroke: '#e5e7eb',
              strokeWidth: 1,
              cornerRadius: element.cornerRadius || 4,
              listening: false
            });
            placeholderGroup.add(bgRect);
            
            // Image-plus icon (simplified)
            const iconSize = Math.min(elementWidth, elementHeight) * 0.3;
            const iconGroup = new Konva.Group({
              x: elementWidth / 2,
              y: elementHeight / 2,
              listening: false
            });
            
            // Image frame icon
            const iconRect = new Konva.Rect({
              x: -iconSize / 2,
              y: -iconSize / 2,
              width: iconSize,
              height: iconSize,
              fill: 'transparent',
              stroke: '#9ca3af',
              strokeWidth: 2,
              cornerRadius: 2,
              listening: false
            });
            iconGroup.add(iconRect);
            
            // Plus icon
            const lineThickness = Math.max(1, iconSize * 0.1);
            const plusSize = iconSize * 0.4;
            iconGroup.add(new Konva.Line({
              points: [0, -plusSize, 0, plusSize],
              stroke: '#9ca3af',
              strokeWidth: lineThickness,
              lineCap: 'round',
              listening: false
            }));
            iconGroup.add(new Konva.Line({
              points: [-plusSize, 0, plusSize, 0],
              stroke: '#9ca3af',
              strokeWidth: lineThickness,
              lineCap: 'round',
              listening: false
            }));
            
            placeholderGroup.add(iconGroup);
            layer.add(placeholderGroup);
            continue;
          }
          
          // Handle actual images and stickers
          // Stickers might have 'url' property instead of 'src', check both
          const imageSrc = (element as any).src || (element as any).url;
          if (!imageSrc) {
            console.warn('[PDFRenderer] Image/Sticker element missing src/url:', {
              elementId: element.id,
              elementType: element.type,
              hasSrc: !!(element as any).src,
              hasUrl: !!(element as any).url,
              elementKeys: Object.keys(element)
            });
            continue;
          }
          
          // Resolve image URL with proxy if needed (for S3 URLs)
          let imageUrl = imageSrc;
          const isS3Url = imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('s3.us-east-1.amazonaws.com');
          if (isS3Url && token) {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            imageUrl = `${apiUrl}/images/proxy?url=${encodeURIComponent(imageUrl)}&token=${encodeURIComponent(token)}`;
          }
          
          console.log('[PDFRenderer] Loading image:', {
            elementId: element.id,
            elementType: element.type,
            originalSrc: imageSrc,
            resolvedUrl: imageUrl,
            isS3Url: isS3Url,
            hasToken: !!token
          });
          
          // Load image asynchronously
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            console.log('[PDFRenderer] Image loaded successfully:', {
              elementId: element.id,
              imageWidth: img.width,
              imageHeight: img.height,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight
            });
            try {
              // Calculate crop if needed
              let cropProps = {};
              if (element.imageClipPosition) {
                try {
                  const crop = getCrop(img, { width: elementWidth, height: elementHeight }, element.imageClipPosition as any);
                  if (crop) {
                    cropProps = {
                      cropX: crop.cropX,
                      cropY: crop.cropY,
                      cropWidth: crop.cropWidth,
                      cropHeight: crop.cropHeight
                    };
                  }
                } catch (error) {
                  console.warn('[PDFRenderer] Error calculating crop:', error);
                }
              }
              
              // Create image node
              const imageNode = new Konva.Image({
                x: elementX,
                y: elementY,
                image: img,
                width: elementWidth,
                height: elementHeight,
                rotation: elementRotation,
                opacity: (element.imageOpacity !== undefined ? element.imageOpacity : 1) * elementOpacity,
                cornerRadius: element.cornerRadius || 0,
                listening: false,
                ...cropProps
              });
              layer.add(imageNode);
              console.log('[PDFRenderer] Image node added to layer:', {
                elementId: element.id,
                layerChildrenCount: layer.getChildren().length
              });
              
              // Render frame if enabled (stickers never get frames)
              console.log('[PDFRenderer] Frame check for element:', {
                elementId: element.id,
                elementType: element.type,
                hasFrameEnabled: element.frameEnabled !== undefined,
                frameEnabled: element.frameEnabled,
                strokeWidth: element.strokeWidth,
                willShowFrame: element.type !== 'sticker' && (element.frameEnabled !== undefined ? element.frameEnabled : (element.strokeWidth || 0) > 0)
              });

              const frameEnabled = element.type === 'sticker'
                ? false
                : (element.frameEnabled !== undefined
                  ? element.frameEnabled
                  : (element.strokeWidth || 0) > 0);
              const strokeWidth = element.strokeWidth || 0;

              if (frameEnabled && strokeWidth > 0) {
                console.log('[PDFRenderer] Rendering frame for element:', element.id, element.type);
                // Get color palette defaults for consistent frame coloring (same as QnA borders)
                const currentPage = state.currentBook?.pages?.find(p => p.id === page.id) || page;
                const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
                const bookTheme = bookData?.themeId || bookData?.bookTheme;
                const pageLayoutTemplateId = currentPage?.layoutTemplateId;
                const bookLayoutTemplateId = bookData?.layoutTemplateId;
                const pageColorPaletteId = currentPage?.colorPaletteId;
                const bookColorPaletteId = bookData?.colorPaletteId;

                const qnaDefaults = getToolDefaults(
                  'qna',
                  pageTheme,
                  bookTheme,
                  element,
                  undefined, // toolSettings not needed for defaults
                  pageLayoutTemplateId,
                  bookLayoutTemplateId,
                  pageColorPaletteId,
                  bookColorPaletteId
                );

                const stroke = element.stroke && element.stroke !== '#1f2937' ? element.stroke : qnaDefaults.borderColor || '#1f2937';
                const strokeOpacity = element.strokeOpacity !== undefined ? element.strokeOpacity : 1;
                const frameTheme = element.frameTheme || element.theme || 'default';
                const cornerRadius = element.cornerRadius || 0;
                
                // Use theme renderer for themed frames
                if (frameTheme !== 'default') {
                  const themeRenderer = getThemeRenderer(frameTheme);
                  if (themeRenderer) {
                    const frameRoughness = frameTheme === 'rough' ? 8 : (frameTheme === 'sketchy' ? 2 : (frameTheme === 'wobbly' ? 3 : undefined));
                    const frameElement = {
                      type: 'rect' as const,
                      id: element.id + '-frame',
                      x: 0,
                      y: 0,
                      width: elementWidth,
                      height: elementHeight,
                      cornerRadius: cornerRadius,
                      stroke: stroke,
                      strokeWidth: strokeWidth,
                      fill: 'transparent',
                      theme: frameTheme,
                      // Set roughness for rough theme to match client-side rendering
                      roughness: frameRoughness
                    } as CanvasElement;
                    
                    const pathData = themeRenderer.generatePath(frameElement);
                    const strokeProps = themeRenderer.getStrokeProps(frameElement);
                    
                    if (pathData) {
                      const frameNode = new Konva.Path({
                        data: pathData,
                        x: elementX,
                        y: elementY,
                        rotation: elementRotation,
                        stroke: strokeProps.stroke || stroke,
                        strokeWidth: strokeProps.strokeWidth || strokeWidth,
                        opacity: strokeOpacity * elementOpacity,
                        fill: 'transparent',
                        strokeScaleEnabled: true,
                        listening: false,
                        lineCap: 'round',
                        lineJoin: 'round'
                      });
                      layer.add(frameNode);
                    }
                  }
                } else {
                  // Default frame (simple rect)
                  const frameNode = new Konva.Rect({
                    x: elementX,
                    y: elementY,
                    width: elementWidth,
                    height: elementHeight,
                    rotation: elementRotation,
                    fill: 'transparent',
                    stroke: stroke,
                    strokeWidth: strokeWidth,
                    opacity: strokeOpacity * elementOpacity,
                    cornerRadius: cornerRadius,
                    strokeScaleEnabled: true,
                    listening: false
                  });
                  layer.add(frameNode);
                }
              }
              
              layer.draw();
              stageRef.current?.draw();
            } catch (error) {
              console.error('[PDFRenderer] Error creating image node:', error);
            }
          };
          
          img.onerror = (error) => {
            console.warn('[PDFRenderer] Failed to load image:', {
              elementId: element.id,
              elementType: element.type,
              originalSrc: imageSrc,
              resolvedUrl: imageUrl,
              error: error
            });
            // Optionally render a placeholder rectangle for failed images
            const errorRect = new Konva.Rect({
              x: elementX,
              y: elementY,
              width: elementWidth,
              height: elementHeight,
              fill: '#f3f4f6',
              stroke: '#d1d5db',
              strokeWidth: 1,
              listening: false
            });
            layer.add(errorRect);
            layer.draw();
            stageRef.current?.draw();
          };
          
          img.src = imageUrl;
        }
        // Render shape elements (rect, circle, etc.)
        else if (['rect', 'circle', 'line', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(element.type)) {
          const fill = element.fill !== undefined ? element.fill : (element.fillColor || 'transparent');
          const stroke = element.stroke || element.strokeColor || '#000000';
          const strokeWidth = element.strokeWidth || 0;
          const theme = element.theme || element.borderTheme || 'default';
          
          // Check if theme renderer should be used
          const themeRenderer = getThemeRenderer(theme);
          const useTheme = themeRenderer && theme !== 'default' && strokeWidth > 0;
          
          if (useTheme) {
            // Use theme renderer for themed borders
            const shapeElement = {
              type: element.type as any,
              id: element.id,
              x: 0,
              y: 0,
              width: elementWidth,
              height: elementHeight,
              cornerRadius: element.cornerRadius || 0,
              stroke: stroke,
              strokeWidth: strokeWidth,
              fill: fill !== 'transparent' ? fill : 'transparent',
              theme: theme
            } as CanvasElement;
            
            const pathData = themeRenderer.generatePath(shapeElement);
            
            // Debug: Log circle dimensions - ALWAYS log for circles, regardless of theme
            if (element.type === 'circle') {
              const circleRadius = Math.min(elementWidth, elementHeight) / 2;
              console.log('[DEBUG PDFRenderer] Circle rendered:');
              console.log('  elementId:', element.id);
              console.log('  elementWidth:', elementWidth);
              console.log('  elementHeight:', elementHeight);
              console.log('  radius:', circleRadius, '(calculated: Math.min(' + elementWidth + ', ' + elementHeight + ') / 2 = ' + circleRadius + ')');
              console.log('  centerX:', elementX + elementWidth / 2);
              console.log('  centerY:', elementY + elementHeight / 2);
              console.log('  strokeWidth:', strokeWidth);
              console.log('  useTheme:', useTheme);
              console.log('  theme:', theme);
              console.log('  hasPathData:', !!pathData);
            }
            
            if (pathData) {
              const shapePath = new Konva.Path({
                data: pathData,
                x: elementX,
                y: elementY,
                fill: fill !== 'transparent' ? fill : undefined,
                stroke: stroke,
                strokeWidth: strokeWidth,
                opacity: elementOpacity,
                strokeScaleEnabled: true,
                rotation: elementRotation,
                listening: false,
                lineCap: 'round',
                lineJoin: 'round',
              });
              layer.add(shapePath);
            } else {
              // Fallback to regular shape
              let shapeNode;
              if (element.type === 'circle') {
                const circleRadius = Math.min(elementWidth, elementHeight) / 2;
                shapeNode = new Konva.Circle({
                  x: elementX + elementWidth / 2,
                  y: elementY + elementHeight / 2,
                  radius: circleRadius,
                  fill: fill !== 'transparent' ? fill : undefined,
                  stroke: strokeWidth > 0 ? stroke : undefined,
                  strokeWidth: strokeWidth,
                  rotation: elementRotation,
                  opacity: elementOpacity,
                  listening: false
                });
              } else if (element.type === 'line') {
                shapeNode = new Konva.Line({
                  points: element.points || [elementX, elementY, elementX + elementWidth, elementY + elementHeight],
                  stroke: stroke,
                  strokeWidth: strokeWidth,
                  rotation: elementRotation,
                  opacity: elementOpacity,
                  listening: false
                });
              } else {
                shapeNode = new Konva.Rect({
                  x: elementX,
                  y: elementY,
                  width: elementWidth,
                  height: elementHeight,
                  fill: fill !== 'transparent' ? fill : undefined,
                  stroke: strokeWidth > 0 ? stroke : undefined,
                  strokeWidth: strokeWidth,
                  cornerRadius: element.cornerRadius || 0,
                  rotation: elementRotation,
                  opacity: elementOpacity,
                  listening: false
                });
              }
              layer.add(shapeNode);
            }
          } else {
            // Default rendering without theme
            let shapeNode;
            if (element.type === 'circle') {
              const circleRadius = Math.min(elementWidth, elementHeight) / 2;
              
              // Debug: Log circle dimensions - ALWAYS log for circles
              console.log('[DEBUG PDFRenderer] Circle rendered (no theme):');
              console.log('  elementId:', element.id);
              console.log('  elementWidth:', elementWidth);
              console.log('  elementHeight:', elementHeight);
              console.log('  radius:', circleRadius, '(calculated: Math.min(' + elementWidth + ', ' + elementHeight + ') / 2 = ' + circleRadius + ')');
              console.log('  centerX:', elementX + elementWidth / 2);
              console.log('  centerY:', elementY + elementHeight / 2);
              console.log('  strokeWidth:', strokeWidth);
              console.log('  useTheme: false');
              
              shapeNode = new Konva.Circle({
                x: elementX + elementWidth / 2,
                y: elementY + elementHeight / 2,
                radius: circleRadius,
                fill: fill !== 'transparent' ? fill : undefined,
                stroke: strokeWidth > 0 ? stroke : undefined,
                strokeWidth: strokeWidth,
                rotation: elementRotation,
                opacity: elementOpacity,
                listening: false
              });
            } else if (element.type === 'line') {
              shapeNode = new Konva.Line({
                points: element.points || [elementX, elementY, elementX + elementWidth, elementY + elementHeight],
                stroke: stroke,
                strokeWidth: strokeWidth,
                rotation: elementRotation,
                opacity: elementOpacity,
                listening: false
              });
            } else {
              // Default to Rect for other shapes
              shapeNode = new Konva.Rect({
                x: elementX,
                y: elementY,
                width: elementWidth,
                height: elementHeight,
                fill: fill !== 'transparent' ? fill : undefined,
                stroke: strokeWidth > 0 ? stroke : undefined,
                strokeWidth: strokeWidth,
                cornerRadius: element.cornerRadius || 0,
                rotation: elementRotation,
                opacity: elementOpacity,
                listening: false
              });
            }
            
            layer.add(shapeNode);
          }
        }
      } catch (error) {
        console.error('[PDFRenderer] Error rendering element:', element.id, error);
      }
    }
    
    layer.draw();
    stageRef.current.draw();
    
    console.log('[PDFRenderer] Rendered to manual layer, layer has', layer.getChildren().length, 'children');
  }, [layerReady, width, height, backgroundImage, patternImage, page.background, page.backgroundTransform, pagePaletteId, palette, normalizedPalette, palettePatternFill, sortedElements]);

  console.log('[PDFRenderer] About to render Stage');

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={scale}
      scaleY={scale}
      pixelRatio={1}
      onClick={noOp}
      onTap={noOp}
      onMouseDown={noOp}
      onMouseMove={noOp}
      onMouseUp={noOp}
      onTouchStart={noOp}
      onTouchMove={noOp}
      onTouchEnd={noOp}
      onContextMenu={noOp}
      onWheel={noOp}
      style={{
        cursor: 'default',
        backgroundColor: '#F9FAFB',
      }}
    >
      {/* Empty Layer component for react-konva compatibility */}
      <Layer />
    </Stage>
  );
}
