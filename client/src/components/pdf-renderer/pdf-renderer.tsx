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
import { getGlobalThemeDefaults } from '../../utils/global-themes';
import { getThemeRenderer, generateLinePath, type Theme } from '../../utils/themes-client.ts';
import { renderThemedBorderKonvaWithFallback, createLinePath, createRectPath, createCirclePath } from '../../utils/themed-border.ts';
import { getCrop } from '../features/editor/canvas-items/image.tsx';
import type { PageBackground } from '../../context/editor-context.tsx';
import { FEATURE_FLAGS } from '../../utils/feature-flags';
import type { RichTextStyle } from '../../../../shared/types/text-layout';
import { buildFont as sharedBuildFont, getLineHeight as sharedGetLineHeight, measureText as sharedMeasureText, calculateTextX as sharedCalculateTextX, wrapText as sharedWrapText, getBaselineOffset as sharedGetBaselineOffset } from '../../../../shared/utils/text-layout';
import { createLayout as sharedCreateLayout, createBlockLayout as sharedCreateBlockLayout } from '../../../../shared/utils/qna-layout';
import { getFontFamilyByName } from '../../utils/font-families.ts';
import { hexToRgba } from '../../../../shared/utils/color-utils';

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
    console.log('[DEBUG z-order PDFRenderer] Original elements array:', elements.map((el, idx) => ({ idx, type: el.type, textType: el.textType, id: el.id })));
    
    // Sort elements respecting z-order (array order)
    const sorted = [...elements].sort((a, b) => {
      // For all elements: maintain array order (z-order)
      // This preserves the z-order set by MOVE_ELEMENT actions
      const indexA = elements.findIndex(el => el.id === a.id);
      const indexB = elements.findIndex(el => el.id === b.id);
      return indexA - indexB;
    });
    
    console.log('[DEBUG z-order PDFRenderer] Sorted elements array:', sorted.map((el, idx) => ({ idx, type: el.type, textType: el.textType, id: el.id })));
    
    return sorted;
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
    
    // Create a map of element IDs to their z-order index in the sorted array
    const elementIdToZOrder = new Map<string, number>();
    elements.forEach((el, idx) => {
      elementIdToZOrder.set(el.id, idx);
    });
    
    // Track image loading promises for final z-order fix
    const imagePromises: Promise<void>[] = [];
    
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
        // RE-ENABLED: use classic QnA rendering path for stability
        if (element.textType === 'qna') {
          // Get tool defaults for qna
          const currentPage = state.currentBook?.pages?.find(p => p.id === page.id) || page;
          const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
          const bookTheme = bookData?.themeId || bookData?.bookTheme;
          const pageLayoutTemplateId = currentPage?.layoutTemplateId;
          const bookLayoutTemplateId = bookData?.layoutTemplateId;
          const pageColorPaletteId = currentPage?.colorPaletteId;
          const bookColorPaletteId = bookData?.colorPaletteId;

          const activeTheme = pageTheme || bookTheme || 'default';
          const qnaDefaults = getGlobalThemeDefaults(activeTheme, 'qna');
          
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
            // Use backgroundOpacity (standardized property)
            const backgroundOpacity = element.backgroundOpacity ?? 
              (element as any).background?.opacity ??
              (element as any).background?.backgroundOpacity ??
              (element as any).questionSettings?.backgroundOpacity ??
              (element as any).answerSettings?.backgroundOpacity ??
              questionStyle.background?.opacity ?? 
              answerStyle.background?.opacity ?? 
              questionStyle.backgroundOpacity ?? 
              answerStyle.backgroundOpacity ?? 
              1;
            const cornerRadius = element.cornerRadius ?? qnaDefaults.cornerRadius ?? 0;
            
            // Debug: Log background rendering - show all opacity-related properties
            console.log('[DEBUG PDFRenderer] QnA Background rendered (first path):');
            console.log('  elementId:', element.id);
            console.log('  backgroundColor:', backgroundColor);
            console.log('  element.backgroundOpacity:', element.backgroundOpacity);
            console.log('  element.background.opacity:', (element as any).background?.opacity);
            console.log('  element.backgroundOpacity:', element.backgroundOpacity);
            console.log('  element.background.opacity:', (element as any).background?.opacity);
            console.log('  element.background.backgroundOpacity:', (element as any).background?.backgroundOpacity);
            console.log('  element.opacity:', element.opacity);
            const opacityKeys = Object.keys(element).filter(k => k.toLowerCase().includes('opacity'));
            const fillKeys = Object.keys(element).filter(k => k.toLowerCase().includes('fill'));
            console.log('  All element opacity keys:', opacityKeys);
            console.log('  All element fill keys:', fillKeys);
            // Log actual values for opacity and fill keys
            opacityKeys.forEach(key => {
              console.log(`  element.${key}:`, (element as any)[key]);
            });
            fillKeys.forEach(key => {
              console.log(`  element.${key}:`, (element as any)[key]);
            });
            // Log answerSettings and questionSettings
            console.log('  element.answerSettings:', (element as any).answerSettings);
            console.log('  element.questionSettings:', (element as any).questionSettings);
            console.log('  element.answerSettings?.backgroundOpacity:', (element as any).answerSettings?.backgroundOpacity);
            console.log('  element.questionSettings?.backgroundOpacity:', (element as any).questionSettings?.backgroundOpacity);
            console.log('  element.answerSettings?.backgroundOpacity:', (element as any).answerSettings?.backgroundOpacity);
            console.log('  element.questionSettings?.backgroundOpacity:', (element as any).questionSettings?.backgroundOpacity);
            console.log('  questionStyle.background?.opacity:', questionStyle.background?.opacity);
            console.log('  answerStyle.background?.opacity:', answerStyle.background?.opacity);
            console.log('  questionStyle.backgroundOpacity:', questionStyle.backgroundOpacity);
            console.log('  answerStyle.backgroundOpacity:', answerStyle.backgroundOpacity);
            console.log('  backgroundOpacity (final):', backgroundOpacity);
            console.log('  elementOpacity:', elementOpacity);
            console.log('  finalOpacity:', backgroundOpacity * elementOpacity);
            
            if (backgroundColor !== 'transparent' && backgroundColor) {
              const finalOpacity = backgroundOpacity * elementOpacity;
              
              // Apply opacity directly to fill color (RGBA) instead of using opacity property
              // This ensures opacity is preserved during PDF export
              let fillColor = backgroundColor;
              if (finalOpacity < 1 && backgroundColor.startsWith('#')) {
                fillColor = hexToRgba(backgroundColor, finalOpacity);
              } else if (finalOpacity < 1 && backgroundColor.startsWith('rgb')) {
                // Convert rgb to rgba
                const rgbMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (rgbMatch) {
                  fillColor = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${finalOpacity})`;
                }
              }
              
              const bgRect = new Konva.Rect({
                x: elementX,
                y: elementY,
                width: elementWidth,
                height: dynamicHeight,
                fill: fillColor,
                opacity: 1, // Set to 1 since opacity is now in fill color
                cornerRadius: cornerRadius,
                rotation: elementRotation,
                listening: false,
              });
              
              // Add background and position it after page background, but before other elements
              layer.add(bgRect);
              
              // Verify opacity is set correctly
              console.log('[DEBUG PDFRenderer] QnA Background opacity verification:', {
                elementId: element.id,
                finalOpacity: finalOpacity,
                fillColor: fillColor,
                originalBackgroundColor: backgroundColor,
                bgRectFill: bgRect.fill(),
                bgRectOpacity: bgRect.opacity()
              });
              
              // Store z-order on background rect
              const zOrderIndex = elementIdToZOrder.get(element.id);
              if (zOrderIndex !== undefined) {
                bgRect.setAttr('__zOrderIndex', zOrderIndex);
                bgRect.setAttr('__isQnaNode', true);
                bgRect.setAttr('__elementId', element.id);
                bgRect.setAttr('__nodeType', 'qna-background');
              }
              
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
          
          // Get layout variant (needed for ruled lines rendering)
          const layoutVariant = element.layoutVariant || 'inline';
          
          // Get paragraph spacing settings (needed for ruled lines rendering)
          const qParagraphSpacing = element.paragraphSpacing || questionStyle.paragraphSpacing || 'small';
          const aParagraphSpacing = element.paragraphSpacing || answerStyle.paragraphSpacing || 'small';
          
          // Calculate line heights based on paragraph spacing (needed for ruled lines rendering)
          const getLineHeightMultiplier = (spacing: string) => {
            switch (spacing) {
              case 'small': return 1.0;
              case 'medium': return 1.2;
              case 'large': return 1.5;
              default: return 1.0;
            }
          };
          
          // Calculate baseline alignment for question and answer text (needed for ruled lines rendering)
          const qFontSize = questionStyle.fontSize || 45;
          const aFontSize = answerStyle.fontSize || 50;
          const maxFontSize = Math.max(qFontSize, aFontSize);
          const effectivePadding = layoutVariant === 'inline' ? padding + (maxFontSize * 0.2) : padding;
          
          // For inline layout, use combined line height based on largest font
          const combinedLineHeight = layoutVariant === 'inline' ? 
            maxFontSize * Math.max(getLineHeightMultiplier(qParagraphSpacing), getLineHeightMultiplier(aParagraphSpacing)) :
            qFontSize * getLineHeightMultiplier(qParagraphSpacing);
          const aLineHeight = aFontSize * getLineHeightMultiplier(aParagraphSpacing);
          
          // Text baseline offset (needed for ruled lines rendering)
          const maxFontSizeUsed = Math.max(qFontSize, aFontSize);
          const maxLineHeightMultiplier = Math.max(getLineHeightMultiplier(qParagraphSpacing), getLineHeightMultiplier(aParagraphSpacing));
          const factor = aFontSize >= 50 ? aFontSize >= 96 ? aFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1;
          const textBaselineOffset = -(maxFontSizeUsed * maxLineHeightMultiplier * 0.15) + (maxFontSizeUsed * factor);
          
          // Render ruled lines if enabled (after background, before border and text - matching client-side order)
          const answerRuledLines = element.ruledLines ?? false;
          
          // Debug: Log ruled lines check (first path)
          console.log('[DEBUG PDFRenderer] Ruled lines check (first path):');
          console.log('  elementId:', element.id);
          console.log('  element.ruledLines:', element.ruledLines);
          console.log('  answerRuledLines:', answerRuledLines);
          
          if (answerRuledLines) {
            // Debug: Log starting ruled lines rendering
            console.log('[DEBUG PDFRenderer] Starting ruled lines rendering (first path):');
            console.log('  elementId:', element.id);
            console.log('  layoutVariant:', layoutVariant);
            const aTheme = element.ruledLinesTheme || 'rough';
            const aColor = element.ruledLinesColor || '#1f2937';
            const aWidth = element.ruledLinesWidth || 0.8;
            const aOpacity = element.ruledLinesOpacity ?? 1;
            // aFontSize, aLineHeight, effectivePadding, combinedLineHeight, textBaselineOffset are already defined above
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
                // Generate ruled line using shared theme engine (supports all themes: Candy, Zigzag, Glow, Wobbly, Rough, Default)
                const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly'];
                const theme = (supportedThemes.includes(aTheme as Theme) ? aTheme : 'default') as Theme;
                
                // Create a temporary element for theme-specific settings
                const tempElement: CanvasElement = {
                  ...element,
                  type: 'line' as const,
                  id: element.id + '-ruled-line-block',
                  x: 0,
                  y: 0,
                  width: Math.abs(endX - startX),
                  height: 0,
                  strokeWidth: aWidth,
                  stroke: aColor,
                  theme: theme as CanvasElement['theme']
                };
                
                // Use centralized border rendering with fallback
                const lineNode = renderThemedBorderKonvaWithFallback({
                  width: aWidth,
                  color: aColor,
                  opacity: aOpacity,
                  path: createLinePath(startX, lineY, endX, lineY),
                  theme: theme,
                  themeSettings: {
                    seed: seed + lineY,
                    roughness: theme === 'rough' ? 2 : 1,
                    // Pass through theme-specific settings from element
                    candyRandomness: tempElement.candyRandomness,
                    candyIntensity: tempElement.candyIntensity,
                    candySpacingMultiplier: tempElement.candySpacingMultiplier,
                    candyHoled: tempElement.candyHoled
                  },
                  strokeScaleEnabled: true,
                  listening: false
                }, () => {
                  // Fallback: use existing manual implementation
                  const pathData = generateLinePath({
                    x1: startX,
                    y1: lineY,
                    x2: endX,
                    y2: lineY,
                    strokeWidth: aWidth,
                    stroke: aColor,
                    theme: theme,
                    seed: seed + lineY,
                    roughness: theme === 'rough' ? 2 : 1,
                    element: tempElement
                  });
                  
                  if (pathData) {
                    const themeRenderer = getThemeRenderer(theme);
                    const strokeProps = themeRenderer.getStrokeProps(tempElement);
                    
                    const fallbackNode = new Konva.Path({
                      data: pathData,
                      stroke: strokeProps.stroke !== undefined && strokeProps.stroke !== 'transparent' ? strokeProps.stroke : aColor,
                      strokeWidth: strokeProps.strokeWidth !== undefined ? strokeProps.strokeWidth : aWidth,
                      fill: strokeProps.fill !== undefined ? strokeProps.fill : 'transparent',
                      opacity: aOpacity,
                      strokeScaleEnabled: true,
                      rotation: elementRotation,
                      listening: false,
                      visible: true,
                      lineCap: strokeProps.lineCap || 'round',
                      lineJoin: strokeProps.lineJoin || 'round',
                      shadowColor: strokeProps.shadowColor,
                      shadowBlur: strokeProps.shadowBlur,
                      shadowOpacity: strokeProps.shadowOpacity,
                      shadowOffsetX: strokeProps.shadowOffsetX,
                      shadowOffsetY: strokeProps.shadowOffsetY
                    });
                    return fallbackNode;
                  } else {
                    return new Konva.Line({
                      points: [startX, lineY, endX, lineY],
                      stroke: aColor,
                      strokeWidth: aWidth,
                      opacity: aOpacity,
                      rotation: elementRotation,
                      listening: false,
                      visible: true
                    });
                  }
                });
                
                // Set additional properties that are not in config
                if (lineNode) {
                  lineNode.rotation(elementRotation);
                  lineNode.visible(true);
                  // Ensure shadow properties are set (for Glow theme)
                  if (lineNode instanceof Konva.Path) {
                    const themeRenderer = getThemeRenderer(theme);
                    const strokeProps = themeRenderer.getStrokeProps(tempElement);
                    if (strokeProps.shadowColor) {
                      lineNode.shadowColor(strokeProps.shadowColor);
                      lineNode.shadowBlur(strokeProps.shadowBlur || 0);
                      lineNode.shadowOpacity(strokeProps.shadowOpacity || 0);
                      lineNode.shadowOffsetX(strokeProps.shadowOffsetX || 0);
                      lineNode.shadowOffsetY(strokeProps.shadowOffsetY || 0);
                    }
                  }
                }
                
                if (lineNode) {
                  layer.add(lineNode);
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
              // This matches the logic from textbox-qna.tsx
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
                      // Generate ruled line using shared theme engine (supports all themes)
                      const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                      const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly'];
                      const theme = (supportedThemes.includes(aTheme as Theme) ? aTheme : 'default') as Theme;
                      
                      const tempElement: CanvasElement = {
                        ...element,
                        type: 'line' as const,
                        id: element.id + '-ruled-line-inline-question',
                        x: 0,
                        y: 0,
                        width: Math.abs(endX - startX),
                        height: 0,
                        strokeWidth: aWidth,
                        stroke: aColor,
                        theme: theme as CanvasElement['theme']
                      };
                      
                      // Use centralized border rendering with fallback
                      const lineNode = renderThemedBorderKonvaWithFallback({
                        width: aWidth,
                        color: aColor,
                        opacity: aOpacity,
                        path: createLinePath(startX, lineY, endX, lineY),
                        theme: theme,
                        themeSettings: {
                          seed: seed + lineY,
                          roughness: theme === 'rough' ? 2 : 1,
                          candyRandomness: tempElement.candyRandomness,
                          candyIntensity: tempElement.candyIntensity,
                          candySpacingMultiplier: tempElement.candySpacingMultiplier,
                          candyHoled: tempElement.candyHoled
                        },
                        strokeScaleEnabled: true,
                        listening: false
                      }, () => {
                        // Fallback: use existing manual implementation
                        const pathData = generateLinePath({
                          x1: startX,
                          y1: lineY,
                          x2: endX,
                          y2: lineY,
                          strokeWidth: aWidth,
                          stroke: aColor,
                          theme: theme,
                          seed: seed + lineY,
                          roughness: theme === 'rough' ? 2 : 1,
                          element: tempElement
                        });
                        
                        if (pathData) {
                          const themeRenderer = getThemeRenderer(theme);
                          const strokeProps = themeRenderer.getStrokeProps(tempElement);
                          
                          return new Konva.Path({
                            data: pathData,
                            stroke: strokeProps.stroke !== undefined && strokeProps.stroke !== 'transparent' ? strokeProps.stroke : aColor,
                            strokeWidth: strokeProps.strokeWidth !== undefined ? strokeProps.strokeWidth : aWidth,
                            fill: strokeProps.fill !== undefined ? strokeProps.fill : 'transparent',
                            opacity: aOpacity,
                            strokeScaleEnabled: true,
                            rotation: elementRotation,
                            listening: false,
                            visible: true,
                            lineCap: strokeProps.lineCap || 'round',
                            lineJoin: strokeProps.lineJoin || 'round',
                            shadowColor: strokeProps.shadowColor,
                            shadowBlur: strokeProps.shadowBlur,
                            shadowOpacity: strokeProps.shadowOpacity,
                            shadowOffsetX: strokeProps.shadowOffsetX,
                            shadowOffsetY: strokeProps.shadowOffsetY
                          });
                        } else {
                          return new Konva.Line({
                            points: [startX, lineY, endX, lineY],
                            stroke: aColor,
                            strokeWidth: aWidth,
                            opacity: aOpacity,
                            rotation: elementRotation,
                            listening: false,
                            visible: true
                          });
                        }
                      });
                      
                      // Set additional properties
                      if (lineNode) {
                        lineNode.rotation(elementRotation);
                        lineNode.visible(true);
                        if (lineNode instanceof Konva.Path) {
                          const themeRenderer = getThemeRenderer(theme);
                          const strokeProps = themeRenderer.getStrokeProps(tempElement);
                          if (strokeProps.shadowColor) {
                            lineNode.shadowColor(strokeProps.shadowColor);
                            lineNode.shadowBlur(strokeProps.shadowBlur || 0);
                            lineNode.shadowOpacity(strokeProps.shadowOpacity || 0);
                            lineNode.shadowOffsetX(strokeProps.shadowOffsetX || 0);
                            lineNode.shadowOffsetY(strokeProps.shadowOffsetY || 0);
                          }
                        }
                        layer.add(lineNode);
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
                  
                  // Generate ruled line using shared theme engine (supports all themes)
                  const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                  const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly'];
                  const theme = (supportedThemes.includes(aTheme as Theme) ? aTheme : 'default') as Theme;
                  
                  const tempElement: CanvasElement = {
                    ...element,
                    type: 'line' as const,
                    id: element.id + '-ruled-line-inline-answer',
                    x: 0,
                    y: 0,
                    width: Math.abs(endX - startX),
                    height: 0,
                    strokeWidth: aWidth,
                    stroke: aColor,
                    theme: theme as CanvasElement['theme']
                  };
                  
                  // Use centralized border rendering with fallback
                  const lineNode = renderThemedBorderKonvaWithFallback({
                    width: aWidth,
                    color: aColor,
                    opacity: aOpacity,
                    path: createLinePath(startX, lineY, endX, lineY),
                    theme: theme,
                    themeSettings: {
                      seed: seed + lineY,
                      roughness: theme === 'rough' ? 2 : 1,
                      candyRandomness: tempElement.candyRandomness,
                      candyIntensity: tempElement.candyIntensity,
                      candySpacingMultiplier: tempElement.candySpacingMultiplier,
                      candyHoled: tempElement.candyHoled
                    },
                    strokeScaleEnabled: true,
                    listening: false
                  }, () => {
                    // Fallback: use existing manual implementation
                    const pathData = generateLinePath({
                      x1: startX,
                      y1: lineY,
                      x2: endX,
                      y2: lineY,
                      strokeWidth: aWidth,
                      stroke: aColor,
                      theme: theme,
                      seed: seed + lineY,
                      roughness: theme === 'rough' ? 2 : 1,
                      element: tempElement
                    });
                    
                    if (pathData) {
                      const themeRenderer = getThemeRenderer(theme);
                      const strokeProps = themeRenderer.getStrokeProps(tempElement);
                      
                      return new Konva.Path({
                        data: pathData,
                        stroke: strokeProps.stroke !== undefined && strokeProps.stroke !== 'transparent' ? strokeProps.stroke : aColor,
                        strokeWidth: strokeProps.strokeWidth !== undefined ? strokeProps.strokeWidth : aWidth,
                        fill: strokeProps.fill !== undefined ? strokeProps.fill : 'transparent',
                        opacity: aOpacity,
                        strokeScaleEnabled: true,
                        rotation: elementRotation,
                        listening: false,
                        visible: true,
                        lineCap: strokeProps.lineCap || 'round',
                        lineJoin: strokeProps.lineJoin || 'round',
                        shadowColor: strokeProps.shadowColor,
                        shadowBlur: strokeProps.shadowBlur,
                        shadowOpacity: strokeProps.shadowOpacity,
                        shadowOffsetX: strokeProps.shadowOffsetX,
                        shadowOffsetY: strokeProps.shadowOffsetY
                      });
                    } else {
                      return new Konva.Line({
                        points: [startX, lineY, endX, lineY],
                        stroke: aColor,
                        strokeWidth: aWidth,
                        opacity: aOpacity,
                        rotation: elementRotation,
                        listening: false,
                        visible: true
                      });
                    }
                  });
                  
                  // Set additional properties
                  if (lineNode) {
                    lineNode.rotation(elementRotation);
                    lineNode.visible(true);
                    if (lineNode instanceof Konva.Path) {
                      const themeRenderer = getThemeRenderer(theme);
                      const strokeProps = themeRenderer.getStrokeProps(tempElement);
                      if (strokeProps.shadowColor) {
                        lineNode.shadowColor(strokeProps.shadowColor);
                        lineNode.shadowBlur(strokeProps.shadowBlur || 0);
                        lineNode.shadowOpacity(strokeProps.shadowOpacity || 0);
                        lineNode.shadowOffsetX(strokeProps.shadowOffsetX || 0);
                        lineNode.shadowOffsetY(strokeProps.shadowOffsetY || 0);
                      }
                    }
                    layer.add(lineNode);
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
                  // Generate ruled line using shared theme engine (supports all themes)
                  const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                  const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly'];
                  const theme = (supportedThemes.includes(aTheme as Theme) ? aTheme : 'default') as Theme;
                  
                  const tempElement: CanvasElement = {
                    ...element,
                    type: 'line' as const,
                    id: element.id + '-ruled-line-single',
                    x: 0,
                    y: 0,
                    width: Math.abs(endX - startX),
                    height: 0,
                    strokeWidth: aWidth,
                    stroke: aColor,
                    theme: theme as CanvasElement['theme']
                  };
                  
                  // Use centralized border rendering with fallback
                  const lineNode = renderThemedBorderKonvaWithFallback({
                    width: aWidth,
                    color: aColor,
                    opacity: aOpacity,
                    path: createLinePath(startX, lineY, endX, lineY),
                    theme: theme,
                    themeSettings: {
                      seed: seed + lineY,
                      roughness: theme === 'rough' ? 2 : 1,
                      candyRandomness: tempElement.candyRandomness,
                      candyIntensity: tempElement.candyIntensity,
                      candySpacingMultiplier: tempElement.candySpacingMultiplier,
                      candyHoled: tempElement.candyHoled
                    },
                    strokeScaleEnabled: true,
                    listening: false
                  }, () => {
                    // Fallback: use existing manual implementation
                    const pathData = generateLinePath({
                      x1: startX,
                      y1: lineY,
                      x2: endX,
                      y2: lineY,
                      strokeWidth: aWidth,
                      stroke: aColor,
                      theme: theme,
                      seed: seed + lineY,
                      roughness: theme === 'rough' ? 2 : 1,
                      element: tempElement
                    });
                    
                    if (pathData) {
                      const themeRenderer = getThemeRenderer(theme);
                      const strokeProps = themeRenderer.getStrokeProps(tempElement);
                      
                      return new Konva.Path({
                        data: pathData,
                        stroke: strokeProps.stroke !== undefined && strokeProps.stroke !== 'transparent' ? strokeProps.stroke : aColor,
                        strokeWidth: strokeProps.strokeWidth !== undefined ? strokeProps.strokeWidth : aWidth,
                        fill: strokeProps.fill !== undefined ? strokeProps.fill : 'transparent',
                        opacity: aOpacity,
                        strokeScaleEnabled: true,
                        rotation: elementRotation,
                        listening: false,
                        visible: true,
                        lineCap: strokeProps.lineCap || 'round',
                        lineJoin: strokeProps.lineJoin || 'round',
                        shadowColor: strokeProps.shadowColor,
                        shadowBlur: strokeProps.shadowBlur,
                        shadowOpacity: strokeProps.shadowOpacity,
                        shadowOffsetX: strokeProps.shadowOffsetX,
                        shadowOffsetY: strokeProps.shadowOffsetY
                      });
                    } else {
                      return new Konva.Line({
                        points: [startX, lineY, endX, lineY],
                        stroke: aColor,
                        strokeWidth: aWidth,
                        opacity: aOpacity,
                        rotation: elementRotation,
                        listening: false,
                        visible: true
                      });
                    }
                  });
                  
                  // Set additional properties
                  if (lineNode) {
                    lineNode.rotation(elementRotation);
                    lineNode.visible(true);
                    if (lineNode instanceof Konva.Path) {
                      const themeRenderer = getThemeRenderer(theme);
                      const strokeProps = themeRenderer.getStrokeProps(tempElement);
                      if (strokeProps.shadowColor) {
                        lineNode.shadowColor(strokeProps.shadowColor);
                        lineNode.shadowBlur(strokeProps.shadowBlur || 0);
                        lineNode.shadowOpacity(strokeProps.shadowOpacity || 0);
                        lineNode.shadowOffsetX(strokeProps.shadowOffsetX || 0);
                        lineNode.shadowOffsetY(strokeProps.shadowOffsetY || 0);
                      }
                    }
                  
                  if (lineNode) {
                    layer.add(lineNode);
                    ruledLinesRenderedCount++;
                  }
                  
                  lineY += aLineHeight;
                }
              }
            }
            
            // Debug: Log total ruled lines rendered
            console.log('[DEBUG PDFRenderer] Total ruled lines rendered (first path):');
            console.log('  elementId:', element.id);
            console.log('  totalLinesCount:', ruledLinesRenderedCount);
          }
          
          // Render border if enabled
          const showBorder = element.borderEnabled ?? (questionStyle.border?.enabled || answerStyle.border?.enabled) ?? false;
          if (showBorder) {
            const borderColor = element.borderColor || questionStyle.border?.borderColor || answerStyle.border?.borderColor || '#000000';
            const borderWidth = element.borderWidth || questionStyle.borderWidth || answerStyle.borderWidth || 1;
            const borderOpacity = element.borderOpacity ?? questionStyle.borderOpacity ?? answerStyle.borderOpacity ?? 1;
            const cornerRadius = element.cornerRadius ?? qnaDefaults.cornerRadius ?? 0;
            const theme = element.borderTheme || questionStyle.borderTheme || answerStyle.borderTheme || 'default';
            
            // Create border element for theme-specific settings
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
              fill: 'transparent',
              theme: theme,
              roughness: theme === 'rough' ? 8 : undefined,
              // Pass through theme-specific settings
              candyRandomness: (element as any).candyRandomness,
              candyIntensity: (element as any).candyIntensity,
              candySpacingMultiplier: (element as any).candySpacingMultiplier,
              candyHoled: (element as any).candyHoled
              } as CanvasElement;
              
            // Use centralized border rendering with fallback
            const borderNode = renderThemedBorderKonvaWithFallback({
              width: borderWidth,
              color: borderColor,
              opacity: borderOpacity,
              path: createRectPath(0, 0, elementWidth, dynamicHeight),
              theme: theme,
              themeSettings: {
                roughness: theme === 'rough' ? 8 : undefined,
                candyRandomness: (borderElement as any).candyRandomness,
                candyIntensity: (borderElement as any).candyIntensity,
                candySpacingMultiplier: (borderElement as any).candySpacingMultiplier,
                candyHoled: (borderElement as any).candyHoled
              },
              cornerRadius: cornerRadius,
              strokeScaleEnabled: true,
              listening: false
            }, () => {
              // Fallback: use existing manual implementation
              const themeRenderer = getThemeRenderer(theme);
              if (themeRenderer && theme !== 'default') {
              const pathData = themeRenderer.generatePath(borderElement);
                const strokeProps = themeRenderer.getStrokeProps(borderElement);
              
              if (pathData) {
                  return new Konva.Path({
                  data: pathData,
                  x: elementX,
                  y: elementY,
                    stroke: strokeProps.stroke !== undefined ? strokeProps.stroke : borderColor,
                    strokeWidth: strokeProps.strokeWidth !== undefined ? strokeProps.strokeWidth : borderWidth,
                    fill: strokeProps.fill !== undefined ? strokeProps.fill : 'transparent',
                    opacity: (strokeProps.opacity !== undefined ? strokeProps.opacity : 1) * borderOpacity,
                    shadowColor: strokeProps.shadowColor,
                    shadowBlur: strokeProps.shadowBlur,
                    shadowOpacity: strokeProps.shadowOpacity,
                    shadowOffsetX: strokeProps.shadowOffsetX,
                    shadowOffsetY: strokeProps.shadowOffsetY,
                  strokeScaleEnabled: true,
                  rotation: elementRotation,
                  listening: false,
                    lineCap: strokeProps.lineCap || 'round',
                    lineJoin: strokeProps.lineJoin || 'round',
                  });
                }
              }
              // Fallback to default Rect
              const rectPath = `M ${elementX} ${elementY} L ${elementX + elementWidth} ${elementY} L ${elementX + elementWidth} ${elementY + dynamicHeight} L ${elementX} ${elementY + dynamicHeight} Z`;
              return new Konva.Path({
                data: rectPath,
                x: 0,
                y: 0,
                stroke: borderColor,
                strokeWidth: borderWidth,
                fill: 'transparent',
                opacity: borderOpacity,
                strokeScaleEnabled: true,
                rotation: elementRotation,
                listening: false,
                visible: true
              });
            });
            
            if (borderNode) {
              // Set position and rotation
              borderNode.x(elementX);
              borderNode.y(elementY);
              borderNode.rotation(elementRotation);
              borderNode.visible(true);
              
              // Ensure shadow properties are set (for Glow theme)
              if (borderNode instanceof Konva.Path) {
                const themeRenderer = getThemeRenderer(theme);
                const strokeProps = themeRenderer.getStrokeProps(borderElement);
                if (strokeProps.shadowColor) {
                  borderNode.shadowColor(strokeProps.shadowColor);
                  borderNode.shadowBlur(strokeProps.shadowBlur || 0);
                  borderNode.shadowOpacity(strokeProps.shadowOpacity || 0);
                  borderNode.shadowOffsetX(strokeProps.shadowOffsetX || 0);
                  borderNode.shadowOffsetY(strokeProps.shadowOffsetY || 0);
                }
              }
              
              layer.add(borderNode);
            }
          }
          
          // Get alignment settings (needed for text rendering)
          // Note: layoutVariant, effectivePadding, combinedLineHeight, textBaselineOffset, etc. are already defined above (before Ruled Lines block)
          const questionAlign = element.align || (element as any).format?.textAlign || questionStyle.align || 'left';
          const answerAlign = element.align || (element as any).format?.textAlign || answerStyle.align || 'left';
          
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
              console.log('[DEBUG PDFRenderer] Rendering question text (block layout):', {
                elementId: element.id,
                questionText: questionText.substring(0, 50),
                questionArea: questionArea,
                qFontColor,
                qFontOpacity,
                elementOpacity,
                finalOpacity: elementOpacity * qFontOpacity
              });
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
                    opacity: Math.max(0.01, elementOpacity * qFontOpacity),
                    align: questionAlign,
                    width: questionArea.width,
                    rotation: elementRotation,
                    listening: false,
                    visible: true
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
                  listening: false,
                  visible: true
                });
                
                layer.add(questionNode);
              }
            }
            
            // Render answer in its area
            if (answerText && answerText.trim() !== '') {
              console.log('[DEBUG PDFRenderer] Rendering answer text (block layout):', {
                elementId: element.id,
                answerText: answerText.substring(0, 50),
                answerArea: answerArea,
                aFontColor,
                aFontOpacity,
                elementOpacity,
                finalOpacity: elementOpacity * aFontOpacity
              });
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
                      listening: false,
                      visible: true
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
                    opacity: Math.max(0.01, elementOpacity * aFontOpacity),
                    align: answerAlign,
                    width: answerArea.width,
                    rotation: elementRotation,
                    listening: false,
                    visible: true
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
              console.log('[DEBUG PDFRenderer] Rendering question text (inline layout):', {
                elementId: element.id,
                questionText: questionText.substring(0, 50)
              });
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
                  listening: false,
                  visible: true
                });
                
                layer.add(questionNode);
              });
              
              // Render answer text with inline layout logic
              if (answerText && answerText.trim() !== '') {
                console.log('[DEBUG PDFRenderer] Rendering answer text (inline layout):', {
                  elementId: element.id,
                  answerText: answerText.substring(0, 50)
                });
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
                            opacity: Math.max(0.01, elementOpacity * answerFontOpacity),
                            align: 'left',
                            rotation: elementRotation,
                            listening: false,
                            visible: true
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
                            listening: false,
                            visible: true
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
                          listening: false,
                          visible: true
                        });
                        
                        layer.add(answerNode);
                      }
                    }
                  }
                });
              }
            } else if (answerText && answerText.trim() !== '') {
              // Only answer text, no question
              console.log('[DEBUG PDFRenderer] Rendering answer text only (inline layout):', {
                elementId: element.id,
                answerText: answerText.substring(0, 50)
              });
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
                opacity: Math.max(0.01, elementOpacity * answerFontOpacity),
                visible: true,
                listening: false
              });
              
              layer.add(answerNode);
            }
          }
          
          // QnA element fully handled by this block – skip remaining element rendering
          continue;
        }
        // Render QnA elements (standard QnA textbox - textbox-qna.tsx logic)
        // NEW shared-layout based QnA rendering path – temporarily disabled
        if (false && element.textType === 'qna') {
          // Get tool defaults for qna
          const currentPage = state.currentBook?.pages?.find(p => p.id === page.id) || page;
          const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
          const bookTheme = bookData?.themeId || bookData?.bookTheme;

          const activeTheme = pageTheme || bookTheme || 'default';
          const qnaDefaults = getGlobalThemeDefaults(activeTheme, 'qna');


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
              // Use backgroundOpacity (standardized property)
              const backgroundOpacity = (element as any).backgroundOpacity !== undefined 
                ? (element as any).backgroundOpacity 
                : (element as any).background?.opacity !== undefined
                  ? (element as any).background.opacity
                  : (element as any).background?.backgroundOpacity !== undefined
                    ? (element as any).background.backgroundOpacity
                    : (element as any).questionSettings?.backgroundOpacity !== undefined
                      ? (element as any).questionSettings.backgroundOpacity
                      : (element as any).answerSettings?.backgroundOpacity !== undefined
                        ? (element as any).answerSettings.backgroundOpacity
                        : questionStyle.background?.opacity ?? 
                          answerStyle.background?.opacity ?? 
                          questionStyle.backgroundOpacity ?? 
                          answerStyle.backgroundOpacity ?? 
                          1;
              const cornerRadius = (element as any).cornerRadius ?? qnaDefaults.cornerRadius ?? 0;
              const finalOpacity = backgroundOpacity * elementOpacity;
              
              // Apply opacity directly to fill color (RGBA) instead of using opacity property
              // This ensures opacity is preserved during PDF export
              let fillColor = backgroundColor;
              if (finalOpacity < 1 && backgroundColor.startsWith('#')) {
                fillColor = hexToRgba(backgroundColor, finalOpacity);
              } else if (finalOpacity < 1 && backgroundColor.startsWith('rgb')) {
                // Convert rgb to rgba
                const rgbMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (rgbMatch) {
                  fillColor = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${finalOpacity})`;
                }
              }
              
              bgRect = new Konva.Rect({
                x: elementX,
                y: elementY,
                width: elementWidth,
                height: contentHeight,
                fill: fillColor,
                opacity: 1, // Set to 1 since opacity is now in fill color
                cornerRadius: cornerRadius,
                rotation: elementRotation,
                listening: false,
              });
              
              // Add background and position it after page background, but before other elements
              layer.add(bgRect);
              
              // Verify opacity is set correctly
              console.log('[DEBUG PDFRenderer] QnA Background opacity verification (second path):', {
                elementId: element.id,
                finalOpacity: finalOpacity,
                fillColor: fillColor,
                originalBackgroundColor: backgroundColor,
                bgRectFill: bgRect.fill(),
                bgRectOpacity: bgRect.opacity()
              });
              
              // Store z-order on background rect
              const zOrderIndex = elementIdToZOrder.get(element.id);
              if (zOrderIndex !== undefined) {
                bgRect.setAttr('__zOrderIndex', zOrderIndex);
                bgRect.setAttr('__isQnaNode', true);
                bgRect.setAttr('__elementId', element.id);
                bgRect.setAttr('__nodeType', 'qna-background');
              }
              
              // Find all page background nodes (full canvas size at 0,0) and move bgRect after them
              const stage = layer.getStage();
              const stageWidth = stage ? stage.width() : width;
              const stageHeight = stage ? stage.height() : height;
              
              let lastPageBgIndex = -1;
              layer.getChildren().forEach((node, idx) => {
                if (node === bgRect) return; // Skip self
                // Skip QnA nodes - they should not be considered page backgrounds
                if (node.getAttr('__isQnaNode')) return;
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
              console.log('  element.fillOpacity:', (element as any).fillOpacity);
              console.log('  element.background.fillOpacity:', (element as any).background?.fillOpacity);
              console.log('  element.backgroundOpacity:', (element as any).backgroundOpacity);
              console.log('  element.background.opacity:', (element as any).background?.opacity);
              console.log('  element.background.backgroundOpacity:', (element as any).background?.backgroundOpacity);
              console.log('  element.opacity:', (element as any).opacity);
              // Log answerSettings and questionSettings
              console.log('  element.answerSettings:', (element as any).answerSettings);
              console.log('  element.questionSettings:', (element as any).questionSettings);
              console.log('  element.answerSettings?.fillOpacity:', (element as any).answerSettings?.fillOpacity);
              console.log('  element.questionSettings?.fillOpacity:', (element as any).questionSettings?.fillOpacity);
              console.log('  element.answerSettings?.background?.fillOpacity:', (element as any).answerSettings?.background?.fillOpacity);
              console.log('  element.questionSettings?.background?.fillOpacity:', (element as any).questionSettings?.background?.fillOpacity);
              console.log('  element.answerSettings?.backgroundOpacity:', (element as any).answerSettings?.backgroundOpacity);
              console.log('  element.questionSettings?.backgroundOpacity:', (element as any).questionSettings?.backgroundOpacity);
              console.log('  All element opacity keys:', Object.keys(element).filter(k => k.toLowerCase().includes('opacity')));
              console.log('  All element fill keys:', Object.keys(element).filter(k => k.toLowerCase().includes('fill')));
              console.log('  questionStyle.background?.opacity:', questionStyle.background?.opacity);
              console.log('  answerStyle.background?.opacity:', answerStyle.background?.opacity);
              console.log('  questionStyle.backgroundOpacity:', questionStyle.backgroundOpacity);
              console.log('  answerStyle.backgroundOpacity:', answerStyle.backgroundOpacity);
              console.log('  backgroundOpacity (final):', backgroundOpacity);
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
            const zOrderIndex = elementIdToZOrder.get(element.id);
            console.log(`[DEBUG PDFRenderer] Adding ${blockRuledLinesNodes.length} block ruled lines nodes for element ${element.id}, zOrderIndex: ${zOrderIndex}`);
            blockRuledLinesNodes.forEach((lineNode, idx) => {
              // Set z-order attributes for block ruled lines
              if (zOrderIndex !== undefined) {
                lineNode.setAttr('__zOrderIndex', zOrderIndex);
                lineNode.setAttr('__isQnaNode', true);
                lineNode.setAttr('__elementId', element.id);
                lineNode.setAttr('__nodeType', 'qna-line');
              }
              layer.add(lineNode);
              console.log(`[DEBUG PDFRenderer] Added block ruled line node ${idx} for element ${element.id} with zOrder: ${zOrderIndex}`);
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
              
              const lineY = elementY + linePos.y;
              
              // Use centralized border rendering with fallback
              const lineNode = renderThemedBorderKonvaWithFallback({
                width: ruledLinesWidth,
                color: ruledLinesColor,
                opacity: ruledLinesOpacity * elementOpacity,
                path: createLinePath(startX, lineY, endX, lineY),
                theme: theme,
                themeSettings: {
                  seed: seed + linePos.y,
                  roughness: theme === 'rough' ? 2 : 1,
                  candyRandomness: (tempElement as any).candyRandomness,
                  candyIntensity: (tempElement as any).candyIntensity,
                  candySpacingMultiplier: (tempElement as any).candySpacingMultiplier,
                  candyHoled: (tempElement as any).candyHoled
                },
                strokeScaleEnabled: true,
                listening: false
              }, () => {
                // Fallback: use existing manual implementation
              const pathData = generateLinePath({
                x1: startX,
                  y1: lineY,
                x2: endX,
                  y2: lineY,
                strokeWidth: ruledLinesWidth,
                stroke: ruledLinesColor,
                theme: theme,
                seed: seed + linePos.y,
                roughness: theme === 'rough' ? 2 : 1,
                element: tempElement
              });
              
              if (pathData) {
                const themeRenderer = getThemeRenderer(theme);
                const strokeProps = themeRenderer.getStrokeProps(tempElement);
                
                  return new Konva.Path({
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
                    lineJoin: strokeProps.lineJoin || 'round',
                    shadowColor: strokeProps.shadowColor,
                    shadowBlur: strokeProps.shadowBlur,
                    shadowOpacity: strokeProps.shadowOpacity,
                    shadowOffsetX: strokeProps.shadowOffsetX,
                    shadowOffsetY: strokeProps.shadowOffsetY
                });
              } else {
                  return new Konva.Line({
                    points: [startX, lineY, endX, lineY],
                  stroke: ruledLinesColor,
                  strokeWidth: ruledLinesWidth,
                  opacity: ruledLinesOpacity * elementOpacity,
                  rotation: elementRotation,
                  listening: false,
                  visible: true
                });
              }
              });
              
              // Set additional properties
              if (lineNode) {
                lineNode.rotation(elementRotation);
                lineNode.visible(true);
                if (lineNode instanceof Konva.Path) {
                  const themeRenderer = getThemeRenderer(theme);
                  const strokeProps = themeRenderer.getStrokeProps(tempElement);
                  if (strokeProps.shadowColor) {
                    lineNode.shadowColor(strokeProps.shadowColor);
                    lineNode.shadowBlur(strokeProps.shadowBlur || 0);
                    lineNode.shadowOpacity(strokeProps.shadowOpacity || 0);
                    lineNode.shadowOffsetX(strokeProps.shadowOffsetX || 0);
                    lineNode.shadowOffsetY(strokeProps.shadowOffsetY || 0);
                  }
                }
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
                  
                  // Use centralized border rendering with fallback
                  const lineNode = renderThemedBorderKonvaWithFallback({
                    width: ruledLinesWidth,
                    color: ruledLinesColor,
                    opacity: ruledLinesOpacity * elementOpacity,
                    path: createLinePath(absoluteStartX, absoluteLineY, absoluteEndX, absoluteLineY),
                    theme: theme,
                    themeSettings: {
                      seed: seed + nextLineY,
                      roughness: theme === 'rough' ? 2 : 1,
                      candyRandomness: (tempElement as any).candyRandomness,
                      candyIntensity: (tempElement as any).candyIntensity,
                      candySpacingMultiplier: (tempElement as any).candySpacingMultiplier,
                      candyHoled: (tempElement as any).candyHoled
                    },
                    strokeScaleEnabled: true,
                    listening: false
                  }, () => {
                    // Fallback: use existing manual implementation
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
                  
                  if (pathData) {
                    const themeRenderer = getThemeRenderer(theme);
                    const strokeProps = themeRenderer.getStrokeProps(tempElement);
                    
                      return new Konva.Path({
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
                        lineJoin: strokeProps.lineJoin || 'round',
                        shadowColor: strokeProps.shadowColor,
                        shadowBlur: strokeProps.shadowBlur,
                        shadowOpacity: strokeProps.shadowOpacity,
                        shadowOffsetX: strokeProps.shadowOffsetX,
                        shadowOffsetY: strokeProps.shadowOffsetY
                    });
                  } else {
                      return new Konva.Line({
                      points: [absoluteStartX, absoluteLineY, absoluteEndX, absoluteLineY],
                      stroke: ruledLinesColor,
                      strokeWidth: ruledLinesWidth,
                      opacity: ruledLinesOpacity * elementOpacity,
                      rotation: elementRotation,
                      listening: false,
                      visible: true
                    });
                  }
                  });
                  
                  // Set additional properties
                  if (lineNode) {
                    lineNode.rotation(elementRotation);
                    lineNode.visible(true);
                    if (lineNode instanceof Konva.Path) {
                      const themeRenderer = getThemeRenderer(theme);
                      const strokeProps = themeRenderer.getStrokeProps(tempElement);
                      if (strokeProps.shadowColor) {
                        lineNode.shadowColor(strokeProps.shadowColor);
                        lineNode.shadowBlur(strokeProps.shadowBlur || 0);
                        lineNode.shadowOpacity(strokeProps.shadowOpacity || 0);
                        lineNode.shadowOffsetX(strokeProps.shadowOffsetX || 0);
                        lineNode.shadowOffsetY(strokeProps.shadowOffsetY || 0);
                      }
                    }
                    ruledLinesNodes.push(lineNode);
                  }
                  
                  nextLineY += answerLineHeight;
                }
              }
            }
            
            // Add ruled lines nodes directly to layer with proper z-order attributes
            if (ruledLinesNodes.length > 0) {
              const zOrderIndex = elementIdToZOrder.get(element.id);
              console.log(`[DEBUG PDFRenderer] Adding ${ruledLinesNodes.length} ruled lines nodes for element ${element.id}, zOrderIndex: ${zOrderIndex}`);
              ruledLinesNodes.forEach((lineNode, index) => {
                // Set z-order attributes for ruled lines
                if (zOrderIndex !== undefined) {
                  lineNode.setAttr('__zOrderIndex', zOrderIndex);
                  lineNode.setAttr('__isQnaNode', true);
                  lineNode.setAttr('__elementId', element.id);
                  lineNode.setAttr('__nodeType', 'qna-line');
                }
                // Add directly to layer - they will be included in z-order sorting
                layer.add(lineNode);
                console.log(`[DEBUG PDFRenderer] Added ruled line node ${index} for element ${element.id} with zOrder: ${zOrderIndex}`);
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
            
            // Create border element for theme-specific settings
              const borderElement = {
                type: 'rect' as const,
                id: (element as any).id + '-border',
                x: 0,
                y: 0,
                width: elementWidth,
                height: contentHeight,
                cornerRadius: cornerRadius,
                stroke: borderColor,
              strokeWidth: borderWidth,
                fill: 'transparent',
              theme: borderTheme,
                roughness: borderTheme === 'rough' ? 8 : (borderTheme === 'sketchy' ? 2 : 1),
              // Pass through theme-specific settings
              candyRandomness: (element as any).candyRandomness,
              candyIntensity: (element as any).candyIntensity,
              candySpacingMultiplier: (element as any).candySpacingMultiplier,
              candyHoled: (element as any).candyHoled
              } as CanvasElement;
              
            // Use centralized border rendering with fallback
            const borderPath = renderThemedBorderKonvaWithFallback({
              width: borderWidth,
              color: borderColor,
              opacity: borderOpacity * elementOpacity,
              path: createRectPath(0, 0, elementWidth, contentHeight),
              theme: borderTheme,
              themeSettings: {
                roughness: borderTheme === 'rough' ? 8 : (borderTheme === 'sketchy' ? 2 : 1),
                candyRandomness: (borderElement as any).candyRandomness,
                candyIntensity: (borderElement as any).candyIntensity,
                candySpacingMultiplier: (borderElement as any).candySpacingMultiplier,
                candyHoled: (borderElement as any).candyHoled
              },
              cornerRadius: cornerRadius,
              strokeScaleEnabled: true,
              listening: false
            }, () => {
              // Fallback: use existing manual implementation
              const themeRenderer = getThemeRenderer(borderTheme);
              if (themeRenderer) {
              const pathData = themeRenderer.generatePath(borderElement);
              const strokeProps = themeRenderer.getStrokeProps(borderElement);
              
              if (pathData) {
                  return new Konva.Path({
                  data: pathData,
                  x: elementX,
                  y: elementY,
                  stroke: strokeProps.stroke || borderColor,
                    strokeWidth: strokeProps.strokeWidth || borderWidth,
                  fill: strokeProps.fill !== undefined ? strokeProps.fill : 'transparent',
                  opacity: borderOpacity * elementOpacity,
                  strokeScaleEnabled: true,
                  rotation: elementRotation,
                  listening: false,
                  lineCap: strokeProps.lineCap || 'round',
                  lineJoin: strokeProps.lineJoin || 'round',
                    shadowColor: strokeProps.shadowColor,
                    shadowBlur: strokeProps.shadowBlur,
                    shadowOpacity: strokeProps.shadowOpacity,
                    shadowOffsetX: strokeProps.shadowOffsetX,
                    shadowOffsetY: strokeProps.shadowOffsetY
                  });
                }
              }
              // Fallback to default Rect (as Path)
              const rectPath = `M ${elementX} ${elementY} L ${elementX + elementWidth} ${elementY} L ${elementX + elementWidth} ${elementY + contentHeight} L ${elementX} ${elementY + contentHeight} Z`;
              return new Konva.Path({
                data: rectPath,
                x: 0,
                y: 0,
                stroke: borderColor,
                strokeWidth: borderWidth,
                fill: 'transparent',
                opacity: borderOpacity * elementOpacity,
                strokeScaleEnabled: true,
                rotation: elementRotation,
                listening: false,
                visible: true
              });
            });
            
            if (borderPath) {
              // Set position and rotation
              borderPath.x(elementX);
              borderPath.y(elementY);
              borderPath.rotation(elementRotation);
              borderPath.visible(true);
              
              // Ensure shadow properties are set (for Glow theme)
              if (borderPath instanceof Konva.Path) {
                const themeRenderer = getThemeRenderer(borderTheme);
                const strokeProps = themeRenderer.getStrokeProps(borderElement);
                if (strokeProps.shadowColor) {
                  borderPath.shadowColor(strokeProps.shadowColor);
                  borderPath.shadowBlur(strokeProps.shadowBlur || 0);
                  borderPath.shadowOpacity(strokeProps.shadowOpacity || 0);
                  borderPath.shadowOffsetX(strokeProps.shadowOffsetX || 0);
                  borderPath.shadowOffsetY(strokeProps.shadowOffsetY || 0);
                }
              }

                // Set z-order attributes for border
                const borderZOrderIndex = elementIdToZOrder.get(element.id);
                if (borderZOrderIndex !== undefined) {
                  borderPath.setAttr('__zOrderIndex', borderZOrderIndex);
                  borderPath.setAttr('__isQnaNode', true);
                  borderPath.setAttr('__elementId', element.id);
                  borderPath.setAttr('__nodeType', 'qna-border');
                }

                layer.add(borderPath);

                // Insert border after ruled lines (or after background if no ruled lines)
                const totalRuledLinesCount = allRuledLinesNodes.length + ruledLinesNodes.length;
                const insertAfterIndex = bgRect ? layer.getChildren().indexOf(bgRect) + 1 + totalRuledLinesCount : layer.getChildren().length;
                const borderPathIndex = layer.getChildren().indexOf(borderPath);
                if (borderPathIndex !== -1 && borderPathIndex !== insertAfterIndex) {
                  layer.getChildren().splice(borderPathIndex, 1);
                  layer.getChildren().splice(insertAfterIndex, 0, borderPath);
                }
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
            // Store z-order on text shape
            const zOrderIndex = elementIdToZOrder.get(element.id);
            if (zOrderIndex !== undefined) {
              textShape.setAttr('__zOrderIndex', zOrderIndex);
              textShape.setAttr('__elementId', element.id);
              textShape.setAttr('__nodeType', 'qna-text');
            }
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

            const activeTheme = pageTheme || bookTheme || 'default';
            const freeTextDefaults = getGlobalThemeDefaults(activeTheme, 'free_text');
            
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
            // Store z-order on text node
            const zOrderIndex = elementIdToZOrder.get(element.id);
            if (zOrderIndex !== undefined) {
              textNode.setAttr('__zOrderIndex', zOrderIndex);
            }
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
            // Store z-order on text node
            const zOrderIndex = elementIdToZOrder.get(element.id);
            if (zOrderIndex !== undefined) {
              textNode.setAttr('__zOrderIndex', zOrderIndex);
            }
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
          
          // Create promise for this image - must resolve/reject in the same handlers we use for rendering
          let imageResolve: (() => void) | null = null;
          let imageReject: ((error: any) => void) | null = null;
          const imagePromise = new Promise<void>((resolve, reject) => {
            imageResolve = resolve;
            imageReject = reject;
          });
          imagePromises.push(imagePromise);
          
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
              
              // Get z-order index for this element
              const zOrderIndex = elementIdToZOrder.get(element.id);
              
              // Add image to layer
              layer.add(imageNode);
              
              // Store z-order on image node for final reordering
              if (zOrderIndex !== undefined) {
                imageNode.setAttr('__zOrderIndex', zOrderIndex);
                imageNode.setAttr('__elementId', element.id);
              }
              
              console.log('[PDFRenderer] Image node added to layer:', {
                elementId: element.id,
                layerChildrenCount: layer.getChildren().length,
                zOrderIndex: zOrderIndex
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
                try {
                  console.log('[PDFRenderer] Rendering frame for element:', element.id, element.type);
                  // Get color palette defaults for consistent frame coloring (same as QnA borders)
                  const currentPage = state.currentBook?.pages?.find(p => p.id === page.id) || page;
                  const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
                  const bookTheme = bookData?.themeId || bookData?.bookTheme;
                  const pageLayoutTemplateId = currentPage?.layoutTemplateId;
                  const bookLayoutTemplateId = bookData?.layoutTemplateId;
                  const pageColorPaletteId = currentPage?.colorPaletteId;
                  const bookColorPaletteId = bookData?.colorPaletteId;

                  let qnaDefaults;
                  try {
                    const activeTheme = pageTheme || bookTheme || 'default';
                    qnaDefaults = getGlobalThemeDefaults(activeTheme, 'qna');
                  } catch (error) {
                    console.warn('[PDFRenderer] Error getting tool defaults for frame, using fallback:', error);
                    qnaDefaults = { borderColor: '#1f2937' };
                  }

                  const stroke = element.stroke && element.stroke !== '#1f2937' ? element.stroke : qnaDefaults.borderColor || '#1f2937';
                const borderOpacity = element.borderOpacity !== undefined ? element.borderOpacity : 1;
                const frameTheme = element.frameTheme || element.theme || 'default';
                const cornerRadius = element.cornerRadius || 0;
                
                // Debug: Log frame rendering details
                console.log('[PDFRenderer] Frame rendering details:', {
                  elementId: element.id,
                  frameEnabled: frameEnabled,
                  strokeWidth: strokeWidth,
                  borderOpacity: borderOpacity,
                  elementOpacity: elementOpacity,
                  finalOpacity: borderOpacity * elementOpacity,
                  stroke: stroke,
                  frameTheme: frameTheme,
                  cornerRadius: cornerRadius
                });
                
                // Use centralized border rendering for frames
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
                  roughness: frameRoughness,
                  // Pass through theme-specific settings
                  candyRandomness: (element as any).candyRandomness,
                  candyIntensity: (element as any).candyIntensity,
                  candySpacingMultiplier: (element as any).candySpacingMultiplier,
                  candyHoled: (element as any).candyHoled
                    } as CanvasElement;
                    
                // Use centralized border rendering with fallback
                const frameNode = renderThemedBorderKonvaWithFallback({
                  width: strokeWidth,
                  color: stroke,
                  opacity: borderOpacity * elementOpacity,
                  path: createRectPath(0, 0, elementWidth, elementHeight),
                  theme: frameTheme,
                  themeSettings: {
                    roughness: frameRoughness,
                    candyRandomness: (frameElement as any).candyRandomness,
                    candyIntensity: (frameElement as any).candyIntensity,
                    candySpacingMultiplier: (frameElement as any).candySpacingMultiplier,
                    candyHoled: (frameElement as any).candyHoled
                  },
                  cornerRadius: cornerRadius,
                  strokeScaleEnabled: true,
                  listening: false
                }, () => {
                  // Fallback: use existing manual implementation
                  if (frameTheme !== 'default') {
                    const themeRenderer = getThemeRenderer(frameTheme);
                    if (themeRenderer) {
                    const pathData = themeRenderer.generatePath(frameElement);
                    const strokeProps = themeRenderer.getStrokeProps(frameElement);
                    
                    if (pathData) {
                        return new Konva.Path({
                        data: pathData,
                        x: elementX,
                        y: elementY,
                        rotation: elementRotation,
                        stroke: strokeProps.stroke || stroke,
                        strokeWidth: strokeProps.strokeWidth || strokeWidth,
                        opacity: borderOpacity * elementOpacity,
                        fill: 'transparent',
                        strokeScaleEnabled: true,
                        listening: false,
                        lineCap: 'round',
                        lineJoin: 'round',
                          visible: true,
                          shadowColor: strokeProps.shadowColor,
                          shadowBlur: strokeProps.shadowBlur,
                          shadowOpacity: strokeProps.shadowOpacity,
                          shadowOffsetX: strokeProps.shadowOffsetX,
                          shadowOffsetY: strokeProps.shadowOffsetY
                        });
                      }
                    }
                  }
                  // Fallback to default Rect (convert to Path for compatibility)
                  const rectPath = `M ${elementX} ${elementY} L ${elementX + elementWidth} ${elementY} L ${elementX + elementWidth} ${elementY + elementHeight} L ${elementX} ${elementY + elementHeight} Z`;
                  return new Konva.Path({
                    data: rectPath,
                    x: 0,
                    y: 0,
                    rotation: elementRotation,
                    fill: 'transparent',
                    stroke: stroke,
                    strokeWidth: strokeWidth,
                    opacity: borderOpacity * elementOpacity,
                    strokeScaleEnabled: true,
                    listening: false,
                    visible: true
                  });
                });
                
                if (frameNode) {
                  // Set position and rotation
                  frameNode.x(elementX);
                  frameNode.y(elementY);
                  frameNode.rotation(elementRotation);
                  frameNode.visible(true);
                  
                  // Ensure shadow properties are set (for Glow theme)
                  if (frameNode instanceof Konva.Path) {
                    const themeRenderer = getThemeRenderer(frameTheme);
                    const strokeProps = themeRenderer.getStrokeProps(frameElement);
                    if (strokeProps.shadowColor) {
                      frameNode.shadowColor(strokeProps.shadowColor);
                      frameNode.shadowBlur(strokeProps.shadowBlur || 0);
                      frameNode.shadowOpacity(strokeProps.shadowOpacity || 0);
                      frameNode.shadowOffsetX(strokeProps.shadowOffsetX || 0);
                      frameNode.shadowOffsetY(strokeProps.shadowOffsetY || 0);
                    }
                  }
                  
                  layer.add(frameNode);
                  
                  // Set z-order attributes
                  if (zOrderIndex !== undefined) {
                    frameNode.setAttr('__zOrderIndex', zOrderIndex);
                    frameNode.setAttr('__isFrame', true);
                    frameNode.setAttr('__parentImageId', element.id);
                    frameNode.setAttr('__elementId', element.id + '-frame');
                    frameNode.setAttr('__nodeType', 'frame');
                  }
                  
                  console.log('[PDFRenderer] Frame added to layer:', {
                    elementId: element.id,
                    frameTheme: frameTheme,
                    frameOpacity: borderOpacity * elementOpacity,
                    layerChildrenCount: layer.getChildren().length
                  });
                }
                } catch (frameError) {
                  console.error('[PDFRenderer] Error rendering frame for element:', element.id, frameError);
                  // Continue without frame - don't block image rendering
                }
              }
              
              layer.draw();
              stageRef.current?.draw();
              
              // Resolve the promise after image is added to layer
              if (imageResolve) {
                imageResolve();
              }
            } catch (error) {
              console.error('[PDFRenderer] Error creating image node:', error);
              // Log more details about the error
              if (error instanceof Error) {
                console.error('[PDFRenderer] Error details:', {
                  message: error.message,
                  stack: error.stack,
                  elementId: element.id,
                  elementType: element.type
                });
              } else {
                console.error('[PDFRenderer] Error object:', error);
              }
              // Reject the promise on error
              if (imageReject) {
                imageReject(error);
              }
            }
          };
          
          img.onerror = (error) => {
            // Reject the promise on error
            if (imageReject) {
              imageReject(error);
            }
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
          const fill = element.fill !== undefined ? element.fill : 'transparent';
          const stroke = element.stroke || '#000000';
          // For shapes (not line/brush), use borderWidth; for line, use strokeWidth
          const borderWidth = element.type === 'line'
            ? (element.strokeWidth || 0)
            : (element.borderWidth || element.strokeWidth || 0);
          const strokeWidth = borderWidth; // Use borderWidth for all shapes
          const theme = element.theme || element.borderTheme || 'default';
          
          // For rect elements, use backgroundOpacity if available, otherwise use elementOpacity
          // For other shapes, use elementOpacity
          const backgroundOpacity = element.type === 'rect' && (element as any).backgroundOpacity !== undefined
            ? (element as any).backgroundOpacity
            : elementOpacity;

          // For rect elements, use border opacity from borderOpacity if available
          const borderOpacity = (element as any).borderOpacity !== undefined
            ? (element as any).borderOpacity
            : 1;
          
          // Check if theme renderer should be used
          const themeRenderer = getThemeRenderer(theme);
          const hasBorder = borderWidth > 0;
          const hasFill = fill !== 'transparent' && fill !== undefined;
          const useTheme = themeRenderer && theme !== 'default' && (hasBorder || hasFill);

          console.log('[PDFRenderer] Shape analysis:', {
            elementId: element.id,
            theme,
            borderWidth,
            strokeWidth,
            fill,
            hasBorder,
            hasFill,
            useTheme,
            hasThemeRenderer: !!themeRenderer,
            elementType: element.type
          });

          console.log('[PDFRenderer] Shape rendering:', {
            elementId: element.id,
            elementType: element.type,
            theme,
            borderWidth,
            useTheme,
            hasThemeRenderer: !!themeRenderer
          });
          
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
              strokeWidth: element.type === 'line' ? borderWidth : borderWidth, // For line use strokeWidth, for shapes use borderWidth (mapped to strokeWidth for theme renderer)
              borderWidth: element.type === 'line' ? undefined : borderWidth, // Only set for shapes
              fill: fill !== 'transparent' ? fill : 'transparent',
              theme: theme,
              // For rough theme, ensure high roughness value like QnA borders
              roughness: theme === 'rough' ? 8 : element.roughness
            } as CanvasElement;

            const pathData = themeRenderer.generatePath(shapeElement);
            const strokeProps = themeRenderer.getStrokeProps(shapeElement);

            // Debug: Log theme rendering
            console.log('[PDFRenderer] Theme rendering:', {
              elementId: element.id,
              theme,
              useTheme,
              hasPathData: !!pathData,
              strokeProps
            });

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
              // Special handling for Candy and Wobbly themes - use borderElement exactly like textbox-qna.tsx
              if ((theme === 'candy' || theme === 'wobbly') && strokeProps.strokeWidth > 0) {
                // Get raw borderWidth value (not converted), exactly like textbox-qna.tsx does
                const borderWidth = element.borderWidth || element.strokeWidth || 1;
                
                // Create borderElement with the same type as the original element (not always 'rect')
                // This ensures circles are rendered as circles, not rectangles
                const borderElement = {
                  type: element.type as any, // Preserve original element type (circle, rect, etc.)
                  id: element.id + '-border',
                  x: 0,
                  y: 0,
                  width: elementWidth,
                  height: elementHeight,
                  cornerRadius: element.type === 'rect' ? (element.cornerRadius || 0) : 0,
                  stroke: stroke,
                  strokeWidth: borderWidth, // Use raw borderWidth value, not converted strokeProps.strokeWidth
                  fill: 'transparent',
                  roughness: theme === 'rough' ? 8 : undefined,
                  // Pass through theme-specific settings (e.g., for Candy theme)
                  candyRandomness: (element as any).candyRandomness,
                  candyIntensity: (element as any).candyIntensity,
                  candySpacingMultiplier: (element as any).candySpacingMultiplier,
                  candyHoled: (element as any).candyHoled
                } as CanvasElement;

                // Call generatePath and getStrokeProps WITHOUT zoom parameter, exactly like textbox-qna.tsx
                const borderPathData = themeRenderer.generatePath(borderElement);
                const borderStrokeProps = themeRenderer.getStrokeProps(borderElement);

                if (borderPathData) {
                  // Fill layer
                  let pathFill = strokeProps.fill !== undefined ? strokeProps.fill : (fill !== 'transparent' ? fill : undefined);
                  if (element.type === 'rect' && pathFill && backgroundOpacity < 1) {
                    if (pathFill.startsWith('#')) {
                      pathFill = hexToRgba(pathFill, backgroundOpacity);
                    } else if (pathFill.startsWith('rgb')) {
                      // Convert rgb to rgba
                      const rgbMatch = pathFill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                      if (rgbMatch) {
                        pathFill = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${backgroundOpacity})`;
                      }
                    }
                  }

                  if (pathFill && pathFill !== 'transparent') {
                    const fillPath = new Konva.Path({
                      data: pathData,
                      x: elementX,
                      y: elementY,
                      fill: pathFill,
                      stroke: 'transparent',
                      strokeWidth: 0,
                      opacity: element.type === 'rect' && backgroundOpacity < 1 ? 1 : elementOpacity,
                      strokeScaleEnabled: true,
                      rotation: elementRotation,
                      listening: false,
                      lineCap: 'round',
                      lineJoin: 'round',
                    });
                    layer.add(fillPath);
                    const themedZOrderIndex = elementIdToZOrder.get(element.id);
                    if (themedZOrderIndex !== undefined) {
                      fillPath.setAttr('__zOrderIndex', themedZOrderIndex);
                      fillPath.setAttr('__elementId', element.id);
                    }
                  }

                  // Border layer using centralized border rendering
                  let pathStroke = strokeProps.stroke || stroke;
                  if (element.type === 'rect' && pathStroke && borderOpacity < 1) {
                    if (pathStroke.startsWith('#')) {
                      pathStroke = hexToRgba(pathStroke, borderOpacity);
                    } else if (pathStroke.startsWith('rgb')) {
                      // Convert rgb to rgba
                      const rgbMatch = pathStroke.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                      if (rgbMatch) {
                        pathStroke = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${borderOpacity})`;
                      }
                    }
                  }

                  // Determine path type based on element type
                  let borderPathConfig;
                  if (element.type === 'circle') {
                    const circleRadius = Math.min(elementWidth, elementHeight) / 2;
                    borderPathConfig = createCirclePath(
                      elementWidth / 2,
                      elementHeight / 2,
                      circleRadius
                    );
                  } else {
                    borderPathConfig = createRectPath(0, 0, elementWidth, elementHeight);
                  }

                  const borderPath = renderThemedBorderKonvaWithFallback({
                    width: borderWidth,
                    color: pathStroke,
                    opacity: element.type === 'rect' && borderOpacity < 1 ? 1 : elementOpacity,
                    path: borderPathConfig,
                    theme: theme,
                    themeSettings: {
                      roughness: theme === 'rough' ? 8 : undefined,
                      candyRandomness: (borderElement as any).candyRandomness,
                      candyIntensity: (borderElement as any).candyIntensity,
                      candySpacingMultiplier: (borderElement as any).candySpacingMultiplier,
                      candyHoled: (borderElement as any).candyHoled
                    },
                    cornerRadius: element.type === 'rect' ? (element.cornerRadius || 0) : 0,
                    strokeScaleEnabled: true,
                    listening: false
                  }, () => {
                    // Fallback: use existing manual implementation
                    return new Konva.Path({
                    data: borderPathData,
                    x: elementX,
                    y: elementY,
                    stroke: pathStroke,
                    strokeWidth: borderStrokeProps.strokeWidth || borderWidth,
                    opacity: element.type === 'rect' && borderOpacity < 1 ? 1 : elementOpacity,
                    fill: borderStrokeProps.fill || 'transparent',
                    strokeScaleEnabled: true,
                    rotation: elementRotation,
                    listening: false,
                    lineCap: 'round',
                    lineJoin: 'round',
                      shadowColor: borderStrokeProps.shadowColor,
                      shadowBlur: borderStrokeProps.shadowBlur,
                      shadowOpacity: borderStrokeProps.shadowOpacity,
                      shadowOffsetX: borderStrokeProps.shadowOffsetX,
                      shadowOffsetY: borderStrokeProps.shadowOffsetY
                    });
                  });
                  
                  if (borderPath) {
                    // Set position and rotation
                    borderPath.x(elementX);
                    borderPath.y(elementY);
                    borderPath.rotation(elementRotation);
                    borderPath.visible(true);
                    
                    // Ensure shadow properties are set (for Glow theme)
                    if (borderPath instanceof Konva.Path) {
                      if (borderStrokeProps.shadowColor) {
                        borderPath.shadowColor(borderStrokeProps.shadowColor);
                        borderPath.shadowBlur(borderStrokeProps.shadowBlur || 0);
                        borderPath.shadowOpacity(borderStrokeProps.shadowOpacity || 0);
                        borderPath.shadowOffsetX(borderStrokeProps.shadowOffsetX || 0);
                        borderPath.shadowOffsetY(borderStrokeProps.shadowOffsetY || 0);
                      }
                    }
                    
                  layer.add(borderPath);
                  const themedZOrderIndex = elementIdToZOrder.get(element.id);
                  if (themedZOrderIndex !== undefined) {
                    borderPath.setAttr('__zOrderIndex', themedZOrderIndex + 0.1); // Border slightly above fill
                    borderPath.setAttr('__elementId', element.id);
                    }
                  }

                  console.log('[PDFRenderer] Created themed shape (Candy/Wobbly):', {
                    elementId: element.id,
                    theme,
                    hasFill: !!pathFill,
                    hasBorder: !!borderPathData,
                    strokeWidth: borderStrokeProps.strokeWidth || strokeProps.strokeWidth
                  });
                }
              } else {
                // Regular themed rendering for other themes else {
                // Regular themed rendering for other themes
                let pathFill = strokeProps.fill !== undefined ? strokeProps.fill : (fill !== 'transparent' ? fill : undefined);
                if (element.type === 'rect' && pathFill && backgroundOpacity < 1) {
                  if (pathFill.startsWith('#')) {
                    pathFill = hexToRgba(pathFill, backgroundOpacity);
                  } else if (pathFill.startsWith('rgb')) {
                    // Convert rgb to rgba
                    const rgbMatch = pathFill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                    if (rgbMatch) {
                      pathFill = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${backgroundOpacity})`;
                    }
                  }
                }

                // Apply border opacity for themed rect elements - use strokeProps for theme borders
                let pathStroke = strokeProps.strokeWidth > 0 ? strokeProps.stroke || stroke : undefined;
                if (element.type === 'rect' && pathStroke && borderOpacity < 1) {
                  if (pathStroke.startsWith('#')) {
                    pathStroke = hexToRgba(pathStroke, borderOpacity);
                  } else if (pathStroke.startsWith('rgb')) {
                    // Convert rgb to rgba
                    const rgbMatch = pathStroke.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                    if (rgbMatch) {
                      pathStroke = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${borderOpacity})`;
                    }
                  }
                }

                // For other themes, create combined fill + stroke path
                // Note: Fill is handled separately above, so we only need to handle stroke here
                // But since the pathData includes both fill and stroke, we create a single path
                const shapePath = new Konva.Path({
                  data: pathData,
                  x: elementX,
                  y: elementY,
                  fill: pathFill,
                  stroke: pathStroke,
                  strokeWidth: strokeProps.strokeWidth || strokeWidth, // Use strokeProps.strokeWidth for themed borders
                  opacity: element.type === 'rect' && (backgroundOpacity < 1 || borderOpacity < 1) ? 1 : (strokeProps.opacity !== undefined ? strokeProps.opacity : elementOpacity),
                  shadowColor: strokeProps.shadowColor,
                  shadowBlur: strokeProps.shadowBlur,
                  shadowOpacity: strokeProps.shadowOpacity,
                  shadowOffsetX: strokeProps.shadowOffsetX,
                  shadowOffsetY: strokeProps.shadowOffsetY,
                  strokeScaleEnabled: true,
                  rotation: elementRotation,
                  listening: false,
                  lineCap: strokeProps.lineCap || 'round',
                  lineJoin: strokeProps.lineJoin || 'round',
                });
                layer.add(shapePath);
              // Store z-order on themed shape node
              const themedZOrderIndex = elementIdToZOrder.get(element.id);

              console.log('[PDFRenderer] Created themed shape:', {
                elementId: element.id,
                theme,
                pathDataLength: pathData.length,
                strokeProps,
                hasFill: !!pathFill,
                hasStroke: !!pathStroke,
                pathFill,
                pathStroke,
                strokeWidth: strokeProps.strokeWidth || strokeWidth
              });
              if (themedZOrderIndex !== undefined) {
                shapePath.setAttr('__zOrderIndex', themedZOrderIndex);
                shapePath.setAttr('__elementId', element.id);
              }
            }
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
                // For rect elements, apply backgroundOpacity to fill color (RGBA) instead of using opacity property
                let rectFill = fill !== 'transparent' ? fill : undefined;
                if (element.type === 'rect' && rectFill && backgroundOpacity < 1) {
                  if (rectFill.startsWith('#')) {
                    rectFill = hexToRgba(rectFill, backgroundOpacity);
                  } else if (rectFill.startsWith('rgb')) {
                    // Convert rgb to rgba
                    const rgbMatch = rectFill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                    if (rgbMatch) {
                      rectFill = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${backgroundOpacity})`;
                    }
                  }
                }

                // For rect elements, apply borderOpacity to stroke color (RGBA)
                let rectStroke = borderWidth > 0 ? stroke : undefined;
                if (element.type === 'rect' && rectStroke && borderOpacity < 1) {
                  if (rectStroke.startsWith('#')) {
                    rectStroke = hexToRgba(rectStroke, borderOpacity);
                  } else if (rectStroke.startsWith('rgb')) {
                    // Convert rgb to rgba
                    const rgbMatch = rectStroke.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                    if (rgbMatch) {
                      rectStroke = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${borderOpacity})`;
                    }
                  }
                }

                shapeNode = new Konva.Rect({
                  x: elementX,
                  y: elementY,
                  width: elementWidth,
                  height: elementHeight,
                  fill: rectFill,
                  stroke: rectStroke,
                  strokeWidth: element.type === 'line' ? strokeWidth : borderWidth,
                  cornerRadius: element.cornerRadius || 0,
                  rotation: elementRotation,
                  opacity: (element.type === 'rect' && (backgroundOpacity < 1 || borderOpacity < 1)) ? 1 : elementOpacity, // Set to 1 if opacity is in colors
                  listening: false
                });
              }
              layer.add(shapeNode);
              // Store z-order on shape node
              const zOrderIndex = elementIdToZOrder.get(element.id);
              if (zOrderIndex !== undefined) {
                shapeNode.setAttr('__zOrderIndex', zOrderIndex);
                shapeNode.setAttr('__elementId', element.id);
              }
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
              // For rect elements, apply backgroundOpacity and borderOpacity to colors (RGBA) instead of using opacity property
              let rectFill = fill !== 'transparent' ? fill : undefined;
              if (element.type === 'rect' && rectFill && backgroundOpacity < 1) {
                if (rectFill.startsWith('#')) {
                  rectFill = hexToRgba(rectFill, backgroundOpacity);
                } else if (rectFill.startsWith('rgb')) {
                  // Convert rgb to rgba
                  const rgbMatch = rectFill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                  if (rgbMatch) {
                    rectFill = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${backgroundOpacity})`;
                  }
                }
              }

              // Apply border opacity for rect elements
              let rectStroke = strokeWidth > 0 ? stroke : undefined;
              if (element.type === 'rect' && rectStroke && borderOpacity < 1) {
                if (rectStroke.startsWith('#')) {
                  rectStroke = hexToRgba(rectStroke, borderOpacity);
                } else if (rectStroke.startsWith('rgb')) {
                  // Convert rgb to rgba
                  const rgbMatch = rectStroke.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                  if (rgbMatch) {
                    rectStroke = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${borderOpacity})`;
                  }
                }
              }

              shapeNode = new Konva.Rect({
                x: elementX,
                y: elementY,
                width: elementWidth,
                height: elementHeight,
                fill: rectFill,
                stroke: rectStroke,
                strokeWidth: strokeWidth,
                cornerRadius: element.cornerRadius || 0,
                rotation: elementRotation,
                opacity: element.type === 'rect' && (backgroundOpacity < 1 || borderOpacity < 1) ? 1 : elementOpacity, // Set to 1 if opacity is in colors
                listening: false
              });
            }
            
            layer.add(shapeNode);
            // Store z-order on shape node
            const zOrderIndex = elementIdToZOrder.get(element.id);
            if (zOrderIndex !== undefined) {
              shapeNode.setAttr('__zOrderIndex', zOrderIndex);
              shapeNode.setAttr('__elementId', element.id);
            }
          }
        }
      } catch (error) {
        console.error('[PDFRenderer] Error rendering element:', element.id, error);
      }
    }
    
    layer.draw();
    stageRef.current.draw();
    
    console.log('[PDFRenderer] Rendered to manual layer, layer has', layer.getChildren().length, 'children');
    
    // After all images are loaded (or failed), fix z-order
    // Use allSettled to ensure z-order fix runs even if some images fail
    if (imagePromises.length > 0) {
      Promise.allSettled(imagePromises).then(() => {
        console.log('[DEBUG z-order PDFRenderer] All images loaded (or failed), fixing z-order...');

        // Collect ALL elements (including background) with their z-order
        const allElements: Array<{ node: Konva.Node; zOrder: number; isFrame: boolean; originalIndex: number; isBackground: boolean; elementId?: string; nodeType?: string; originalOpacity?: number }> = [];
        const children = layer.getChildren();
        const stage = layer.getStage();
        const stageWidth = stage ? stage.width() : 2480;
        const stageHeight = stage ? stage.height() : 3508;
        
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          const zOrder = child.getAttr('__zOrderIndex');
          const isFrame = child.getAttr('__isFrame');
          const elementId = child.getAttr('__elementId');
          const nodeType = child.getAttr('__nodeType');

          // Debug: Log attributes for Path nodes (Ruled Lines)
          if (child.getClassName() === 'Path') {
            console.log(`[DEBUG z-order PDFRenderer] Found Path node at index ${i}:`, {
              zOrder: zOrder,
              elementId: elementId,
              nodeType: nodeType,
              isQnaNode: child.getAttr('__isQnaNode'),
              className: child.getClassName()
            });
          }

          // Store original opacity before reordering
          const originalOpacity = child.opacity();
          
          // Check if this is a page background (full canvas size at 0,0)
          // BUT exclude QnA nodes - they have __isQnaNode attribute
          let isBackground = false;
          const isQnaNode = child.getAttr('__isQnaNode');
          if (!isQnaNode && (child.getClassName() === 'Rect' || child.getClassName() === 'Image' || child.getClassName() === 'Shape')) {
            const nodeX = child.x ? child.x() : 0;
            const nodeY = child.y ? child.y() : 0;
            const nodeWidth = child.width ? child.width() : 0;
            const nodeHeight = child.height ? child.height() : 0;
            
            if (nodeX === 0 && nodeY === 0 && nodeWidth === stageWidth && nodeHeight === stageHeight) {
              isBackground = true;
            }
          }
          
          // If element has zOrderIndex, use it; otherwise infer from current position
          // Background elements should have zOrder -1 to be sorted first
          const elementZOrder = isBackground ? -1 : (zOrder !== undefined ? zOrder : (i - 1));
          
          allElements.push({
            node: child,
            zOrder: elementZOrder,
            isFrame: isFrame || false,
            originalIndex: i,
            isBackground: isBackground,
            elementId: elementId,
            nodeType: nodeType,
            originalOpacity: originalOpacity
          });
        }
        
        // Define node type order for QnA elements (within each element, maintain this order)
        // Text should appear above border and ruled lines
        const nodeTypeOrder: Record<string, number> = {
          'qna-background': 0,
          'qna-line': 1,
          'qna-border': 2,
          'qna-text': 3
        };
        
        // Debug: Log all elements before sorting
        console.log('[DEBUG z-order PDFRenderer] Elements before sorting:');
        allElements.forEach((el, idx) => {
          const elementId = el.elementId || el.node.getAttr('__elementId');
          const nodeType = el.nodeType || el.node.getAttr('__nodeType');
          const isQnaNode = el.node.getAttr('__isQnaNode');
          console.log(`[DEBUG z-order PDFRenderer]   [${idx}] ${el.node.getClassName()} - zOrder: ${el.zOrder}, elementId: ${elementId || 'undefined'}, nodeType: ${nodeType || 'undefined'}, isQnaNode: ${isQnaNode || false}, originalIndex: ${el.originalIndex}`);
        });
        
        // Sort all elements by z-order: backgrounds first (zOrder -1), then by zOrder
        // For elements with the same zOrder and elementId, maintain node type order
        allElements.sort((a, b) => {
          // Backgrounds always come first
          if (a.isBackground && !b.isBackground) return -1;
          if (!a.isBackground && b.isBackground) return 1;
          
          // Primary sort: by z-order
          if (a.zOrder !== b.zOrder) {
            return a.zOrder - b.zOrder;
          }
          
          // Same z-order: frames should come after images
          if (a.isFrame && !b.isFrame) return 1;
          if (!a.isFrame && b.isFrame) return -1;
          
          // If same z-order and same elementId, sort by node type (for QnA elements)
          if (a.elementId && b.elementId && a.elementId === b.elementId) {
            const aOrder = nodeTypeOrder[a.nodeType || ''] ?? 999;
            const bOrder = nodeTypeOrder[b.nodeType || ''] ?? 999;
            if (aOrder !== bOrder) {
              return aOrder - bOrder;
            }
            // If same node type, maintain original order
            return a.originalIndex - b.originalIndex;
          }
          
          // If same z-order but different elements, maintain original insertion order
          // This preserves the intended z-order from the elements array
          // DO NOT sort alphabetically by elementId - this breaks z-order!
          return a.originalIndex - b.originalIndex;
        });
        
        // Reposition all elements in correct z-order
        console.log('[DEBUG z-order PDFRenderer] Repositioning', allElements.length, 'elements...');
        console.log('[DEBUG z-order PDFRenderer] Layer children before reordering:', layer.getChildren().length);
        console.log('[DEBUG z-order PDFRenderer] Background elements:', allElements.filter(el => el.isBackground).length);
        
        // Instead of using moveTo() which can fail, remove all elements and re-add them in correct order
        // Remove all elements from layer
        layer.removeChildren();
        
        // Re-add all elements in sorted order
        allElements.forEach((el, i) => {
          try {
            layer.add(el.node);
            // Restore original opacity if it was stored
            if (el.originalOpacity !== undefined && el.originalOpacity !== null) {
              el.node.opacity(el.originalOpacity);
              // Verify opacity was set correctly
              const actualOpacity = el.node.opacity();
              if (Math.abs(actualOpacity - el.originalOpacity) > 0.001) {
                console.warn(`[DEBUG z-order PDFRenderer] Opacity mismatch for ${el.node.getClassName()} at position ${i}: expected ${el.originalOpacity}, got ${actualOpacity}`);
                // Force set opacity again
                el.node.opacity(el.originalOpacity);
              }
            }
            const finalOpacity = el.node.opacity();
            const elementId = el.elementId || el.node.getAttr('__elementId');
            const nodeType = el.nodeType || el.node.getAttr('__nodeType');
            const isQnaNode = el.node.getAttr('__isQnaNode');
            console.log(`[DEBUG z-order PDFRenderer] Added ${el.node.getClassName()} at position ${i} (zOrder: ${el.zOrder}, isBackground: ${el.isBackground}, originalIndex: ${el.originalIndex}, opacity: ${finalOpacity}, originalOpacity: ${el.originalOpacity}, elementId: ${elementId || 'undefined'}, nodeType: ${nodeType || 'undefined'}, isQnaNode: ${isQnaNode || false})`);
            
            // Special debug for QnA background rects
            if (el.node.getClassName() === 'Rect' && el.node.getAttr('__isQnaNode')) {
              const rectNode = el.node as Konva.Rect;
              const fillValue = rectNode.fill ? rectNode.fill() : 'N/A';
              console.log(`[DEBUG z-order PDFRenderer] QnA Background Rect at position ${i}:`, {
                elementId: el.node.getAttr('__elementId'),
                opacity: finalOpacity,
                originalOpacity: el.originalOpacity,
                fill: fillValue,
                fillType: typeof fillValue === 'string' ? (fillValue.startsWith('rgba') ? 'rgba' : fillValue.startsWith('rgb') ? 'rgb' : fillValue.startsWith('#') ? 'hex' : 'other') : 'N/A',
                fillHasAlpha: typeof fillValue === 'string' && fillValue.includes('rgba')
              });
            }
            
            // Special debug for QnA ruled lines (Path elements)
            if (el.node.getClassName() === 'Path' && el.node.getAttr('__isQnaNode') && el.node.getAttr('__nodeType') === 'qna-line') {
              console.log(`[DEBUG z-order PDFRenderer] QnA Ruled Line Path at position ${i}:`, {
                elementId: el.node.getAttr('__elementId'),
                nodeType: el.node.getAttr('__nodeType'),
                zOrderIndex: el.node.getAttr('__zOrderIndex'),
                zOrder: el.zOrder,
                originalIndex: el.originalIndex
              });
            }
          } catch (error) {
            console.error(`[DEBUG z-order PDFRenderer] Error adding element at position ${i}:`, error);
            if (error instanceof Error) {
              console.error(`[DEBUG z-order PDFRenderer] Error message: ${error.message}`);
              console.error(`[DEBUG z-order PDFRenderer] Error stack: ${error.stack}`);
            }
          }
        });
        
        console.log('[DEBUG z-order PDFRenderer] Layer children after reordering:', layer.getChildren().length);
        
        layer.draw();
        stageRef.current?.draw();
        console.log('[DEBUG z-order PDFRenderer] Z-order fix complete');
      }).catch((error) => {
        console.error('[DEBUG z-order PDFRenderer] Error waiting for images:', error);
      });
    }
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
