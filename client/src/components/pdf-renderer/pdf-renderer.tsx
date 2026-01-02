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

// Helper function to apply opacity to color
// Converts hex/rgb colors to rgba with specified opacity
const applyOpacityToColor = (color: string, opacity: number): string => {
  // Clamp opacity to valid range
  const clampedOpacity = Math.max(0, Math.min(1, opacity));
  
  // If opacity is 1, return original color
  if (clampedOpacity === 1) {
    return color;
  }
  
  // Handle hex colors
  if (color.startsWith('#')) {
    return hexToRgba(color, clampedOpacity);
  }
  
  // Handle rgb colors
  if (color.startsWith('rgb(')) {
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${clampedOpacity})`;
    }
  }
  
  // Handle rgba colors (replace existing alpha)
  if (color.startsWith('rgba(')) {
    const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (rgbaMatch) {
      return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${clampedOpacity})`;
    }
  }
  
  // For other color formats, return as-is (named colors, etc.)
  return color;
};

// Helper function to standardize opacity calculation for QnA elements
// This simplifies the complex opacity fallback chain and ensures consistent behavior
const getStandardizedOpacity = (element: any, property: 'background' | 'border' | 'ruledLines' | 'font', defaultOpacity: number = 1): number => {
  // Direct property check first (most specific)
  const directProperty = `${property}Opacity`;
  if (element[directProperty] !== undefined && typeof element[directProperty] === 'number') {
    return Math.max(0, Math.min(1, element[directProperty]));
  }
  
  // Check nested background object
  if (property === 'background' && element.background) {
    if (element.background.opacity !== undefined && typeof element.background.opacity === 'number') {
      return Math.max(0, Math.min(1, element.background.opacity));
    }
    if (element.background.backgroundOpacity !== undefined && typeof element.background.backgroundOpacity === 'number') {
      return Math.max(0, Math.min(1, element.background.backgroundOpacity));
    }
  }
  
  // Check question/answer settings
  if (element.questionSettings && element.questionSettings[directProperty] !== undefined) {
    return Math.max(0, Math.min(1, element.questionSettings[directProperty]));
  }
  if (element.answerSettings && element.answerSettings[directProperty] !== undefined) {
    return Math.max(0, Math.min(1, element.answerSettings[directProperty]));
  }
  
  // Return default
  return defaultOpacity;
};

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

  useEffect(() => {
    // mark this run as PDF export so shared layout adjusts ruled-line offset
    if (typeof window !== 'undefined') {
      (window as any).__PDF_EXPORT__ = true;
    }
    // ...existing code...
  }, []);

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
    // console.log('[DEBUG z-order PDFRenderer] Original elements array:', elements.map((el, idx) => ({ idx, type: el.type, textType: el.textType, id: el.id })));
    
    // Sort elements respecting z-order (array order)
    const sorted = [...elements].sort((a, b) => {
      // For all elements: maintain array order (z-order)
      // This preserves the z-order set by MOVE_ELEMENT actions
      const indexA = elements.findIndex(el => el.id === a.id);
      const indexB = elements.findIndex(el => el.id === b.id);
      return indexA - indexB;
    });
    
    // console.log('[DEBUG z-order PDFRenderer] Sorted elements array:', sorted.map((el, idx) => ({ idx, type: el.type, textType: el.textType, id: el.id })));
    
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
    
    // Debug PDF export environment detection
    console.log('[PDF Debug] Environment detection:', {
      __PDF_EXPORT__: (window as any).__PDF_EXPORT__,
      pathname: window.location.pathname,
      search: window.location.search,
      userAgent: navigator.userAgent.includes('HeadlessChrome'),
      windowDefined: typeof window !== 'undefined'
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
        
        // Render QnA elements using shared layout (matches textbox-qna.tsx exactly)
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
          const effectivePaletteId = pageColorPaletteId || bookColorPaletteId;
          const qnaDefaults = getGlobalThemeDefaults(activeTheme, 'qna', effectivePaletteId);
          
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
            questionText = (element as any).questionText;
          }
          
          // Get answer text
          let answerText = (element as any).answerText || element.formattedText || element.text || '';
          if (answerText.includes('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = answerText;
            answerText = tempDiv.textContent || tempDiv.innerText || '';
          }
          
          // Use shared layout (same as textbox-qna.tsx)
          const layoutVariant = element.layoutVariant || 'inline';
          const questionPosition = element.questionPosition || 'left';
          const questionWidth = element.questionWidth ?? 40;
          const ruledLinesTarget = element.ruledLinesTarget || 'answer';
          const blockQuestionAnswerGap = element.blockQuestionAnswerGap ?? 10;
          const answerInNewRow = element.answerInNewRow ?? false;
          const questionAnswerGap = element.questionAnswerGap ?? 0;
          
          // Create layout using shared functions (matches textbox-qna.tsx)
          const canvas = document.createElement('canvas');
          canvas.width = 100; // Set reasonable size for proper font loading
          canvas.height = 100;
          const ctx = canvas.getContext('2d');

          // DEBUG: Log font loading context
          if (ctx) {
            console.log('[PDF Layout] Canvas context created:', {
              canvasWidth: canvas.width,
              canvasHeight: canvas.height,
              contextAvailable: !!ctx
            });
          }
          
          const layout = sharedCreateLayout({
            questionText: questionText || '',
            answerText: answerText || '',
            questionStyle: {
              fontSize: questionStyle.fontSize || 45,
              fontFamily: resolveFontFamily(questionStyle.fontFamily, questionStyle.fontBold ?? false, questionStyle.fontItalic ?? false),
              fontBold: questionStyle.fontBold ?? false,
              fontItalic: questionStyle.fontItalic ?? false,
              fontColor: questionStyle.fontColor || '#666666',
              fontOpacity: questionStyle.fontOpacity ?? 1,
              paragraphSpacing: questionStyle.paragraphSpacing || 'small',
              align: element.align || 'left'
            },
            answerStyle: {
              fontSize: answerStyle.fontSize || 50,
              fontFamily: resolveFontFamily(answerStyle.fontFamily, answerStyle.fontBold ?? false, answerStyle.fontItalic ?? false),
              fontBold: answerStyle.fontBold ?? false,
              fontItalic: answerStyle.fontItalic ?? false,
              fontColor: answerStyle.fontColor || '#1f2937',
              fontOpacity: answerStyle.fontOpacity ?? 1,
              paragraphSpacing: answerStyle.paragraphSpacing || 'medium',
              align: element.align || 'left'
            },
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
          // console.log('[DEBUG PDFRenderer] QnA Background check (first path):');
          // console.log('  elementId:', element.id);
          // console.log('  element.backgroundEnabled:', element.backgroundEnabled);
          // console.log('  questionStyle.background?.enabled:', questionStyle.background?.enabled);
          // console.log('  answerStyle.background?.enabled:', answerStyle.background?.enabled);
          // console.log('  showBackground:', showBackground);
          
          if (showBackground) {
            const backgroundColor = element.backgroundColor || questionStyle.background?.backgroundColor || answerStyle.background?.backgroundColor || 'transparent';
            // Use standardized opacity calculation
            const backgroundOpacity = getStandardizedOpacity(element, 'background', 1);
            const cornerRadius = element.cornerRadius ?? qnaDefaults.cornerRadius ?? 0;
            
            // Debug: Log simplified background rendering info
            // console.log('[DEBUG PDFRenderer] QnA Background rendered (simplified):');
            // console.log('  elementId:', element.id);
            // console.log('  backgroundColor:', backgroundColor);
            // console.log('  backgroundOpacity (standardized):', backgroundOpacity);
            // console.log('  elementOpacity:', elementOpacity);
            // console.log('  finalOpacity:', backgroundOpacity * elementOpacity);
            
            if (backgroundColor !== 'transparent' && backgroundColor) {
              const finalOpacity = backgroundOpacity * elementOpacity;
              
              // Apply opacity directly to fill color using the utility function
              const fillColor = applyOpacityToColor(backgroundColor, finalOpacity);
              
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
              // console.log('[DEBUG PDFRenderer] QnA Background opacity verification:', {
              //   elementId: element.id,
              //   originalColor: backgroundColor,
              //   finalOpacity: finalOpacity,
              //   appliedColor: fillColor,
              //   konvaOpacity: bgRect.opacity()
              // });
              
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
          
          // Layout variant already defined above
          
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
          
          // Track how many lines are rendered (defined outside if block for debug logging)
          let ruledLinesRenderedCount = 0;
          
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
            const aOpacity = getStandardizedOpacity(element, 'ruledLines', 0.6);
            // aFontSize, aLineHeight, effectivePadding, combinedLineHeight, textBaselineOffset are already defined above
            const startX = elementX + padding;
            const endX = elementX + elementWidth - padding;
            
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
              
              // Block layout: use linePositions from layout (same as app) instead of extracting from runs
              // This ensures ruled lines are rendered for empty lines too
              // RULED_LINE_BASELINE_OFFSET für PDF Export (muss mit shared/utils/qna-layout.ts übereinstimmen)
              const RULED_LINE_BASELINE_OFFSET = -20;
              // Zusätzlicher Offset vom oberen Rand der Textbox (in Pixeln)
              // Erhöht den Abstand aller Ruled Lines vom oberen Rand, ohne den Text zu verschieben
              const RULED_LINE_TOP_OFFSET = 28; // <-- HIER EINSTELLEN (z.B. 10, 15, 20, etc.)

              const targetStyle = ruledLinesTarget === 'question' ? questionStyle : answerStyle;

              // Use linePositions from layout instead of extracting from runs
              // This ensures ruled lines for empty lines are included (unlike runs which only contain text)
              const baselineYPositions = new Set<number>();
              linePositions.forEach((linePos) => {
                // Filter by style to match ruledLinesTarget
                if (linePos.style.fontSize === targetStyle.fontSize) {
                  // Convert absolute line position back to relative baseline position
                  // linePos.y includes RULED_LINE_BASELINE_OFFSET, so we need to subtract it
                  const baselineY = linePos.y - RULED_LINE_BASELINE_OFFSET;
                  baselineYPositions.add(baselineY);
                }
              });
              
              const startX = answerArea.x;
              const endX = answerArea.x + answerArea.width;
              
              // Render lines at each baseline position
              Array.from(baselineYPositions).sort((a, b) => a - b).forEach((baselineY) => {
                // Calculate line Y position: elementY + baselineY + offset + top offset
                const lineY = elementY + baselineY + RULED_LINE_BASELINE_OFFSET + RULED_LINE_TOP_OFFSET;
                
                // Check if line is within the target area (vertically)
                if (lineY >= answerArea.y && lineY <= answerArea.y + answerArea.height) {
                  // Generate ruled line using shared theme engine
                const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly', 'dashed'];
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
                
                  layer.add(lineNode);
                  ruledLinesRenderedCount++;
                }
                }
              });
              
              // Generate additional ruled lines to fill the rest of the target area (matching client-side logic)
              // This only applies to answer lines (ruledLinesTarget === 'answer')
              if (ruledLinesTarget === 'answer' && baselineYPositions.size > 0) {
                const answerLineHeight = sharedGetLineHeight(answerStyle);
                const sortedBaselines = Array.from(baselineYPositions).sort((a, b) => a - b);
                const lastBaselineY = sortedBaselines[sortedBaselines.length - 1];
                // Calculate next line position: last baseline + line height + offset + top offset
                let nextLineY = elementY + lastBaselineY + answerLineHeight + RULED_LINE_BASELINE_OFFSET + RULED_LINE_TOP_OFFSET;
                
                // Determine start and end X positions and bottom Y (all relative to element)
                const relativeStartX = answerArea.x - elementX;
                const relativeEndX = answerArea.x + answerArea.width - elementX;
                const relativeBottomY = answerArea.y + answerArea.height - elementY;
                
                // Generate additional lines until we reach the bottom
                // nextLineY is absolute (elementY + relative position)
                while (nextLineY <= elementY + relativeBottomY) {
                  // Generate ruled line
                  const absoluteStartX = answerArea.x;
                  const absoluteEndX = answerArea.x + answerArea.width;
                  const absoluteLineY = nextLineY;
                  
                  // Generate ruled line using shared theme engine
                      const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                      const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly', 'dashed'];
                      const theme = (supportedThemes.includes(aTheme as Theme) ? aTheme : 'default') as Theme;
                      
                  // Create a temporary element for theme-specific settings
                      const tempElement: CanvasElement = {
                        ...element,
                        type: 'line' as const,
                    id: element.id + '-ruled-line-extra',
                        x: 0,
                        y: 0,
                    width: Math.abs(absoluteEndX - absoluteStartX),
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
                    path: createLinePath(absoluteStartX, absoluteLineY, absoluteEndX, absoluteLineY),
                        theme: theme,
                        themeSettings: {
                      seed: seed + absoluteLineY,
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
                      x1: absoluteStartX,
                      y1: absoluteLineY,
                      x2: absoluteEndX,
                      y2: absoluteLineY,
                          strokeWidth: aWidth,
                          stroke: aColor,
                          theme: theme,
                      seed: seed + absoluteLineY,
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
                        points: [absoluteStartX, absoluteLineY, absoluteEndX, absoluteLineY],
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
                  
                  nextLineY += answerLineHeight;
                }
              }
              
              // Debug: Log block layout ruled lines count
              console.log('[DEBUG PDFRenderer] Block layout ruled lines rendered:');
              console.log('  elementId:', element.id);
              console.log('  linesCount:', ruledLinesRenderedCount);
            } else {
              // Inline layout: use linePositions from layout (same as app) instead of extracting from runs
              // This ensures ruled lines are rendered for empty lines too
              // RULED_LINE_BASELINE_OFFSET für PDF Export (muss mit shared/utils/qna-layout.ts übereinstimmen)
                  const RULED_LINE_BASELINE_OFFSET = -20;
              // Zusätzlicher Offset vom oberen Rand der Textbox (in Pixeln)
              // Erhöht den Abstand aller Ruled Lines vom oberen Rand, ohne den Text zu verschieben
              const RULED_LINE_TOP_OFFSET = 28; // <-- HIER EINSTELLEN (z.B. 10, 15, 20, etc.)

              // Use linePositions from layout instead of extracting from runs
              // This ensures ruled lines for empty lines are included (unlike runs which only contain text)
              const baselineYPositions = new Set<number>();
              linePositions.forEach((linePos) => {
                // Convert absolute line position back to relative baseline position
                // linePos.y includes RULED_LINE_BASELINE_OFFSET, so we need to subtract it
                const baselineY = linePos.y - RULED_LINE_BASELINE_OFFSET;
                baselineYPositions.add(baselineY);
              });
              
              // Render lines at each baseline position
              Array.from(baselineYPositions).sort((a, b) => a - b).forEach((baselineY) => {
                // Only generate lines that are within the box dimensions (0 <= baselineY <= elementHeight)
                // This ensures ruled lines only appear inside the visible border area
                if (baselineY >= 0 && baselineY <= elementHeight) {
                  // Calculate line Y position: elementY + baselineY + offset + top offset
                  const lineY = elementY + baselineY + RULED_LINE_BASELINE_OFFSET + RULED_LINE_TOP_OFFSET;
                  
                  // Generate ruled line using shared theme engine
                  const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                  const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly', 'dashed'];
                  const theme = (supportedThemes.includes(aTheme as Theme) ? aTheme : 'default') as Theme;
                  
                  const tempElement: CanvasElement = {
                    ...element,
                    type: 'line' as const,
                    id: element.id + '-ruled-line-inline',
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

                    // Set z-order attributes for inline layout ruled lines
                    const zOrderIndex = elementIdToZOrder.get(element.id);
                    if (zOrderIndex !== undefined) {
                      lineNode.setAttr('__zOrderIndex', zOrderIndex);
                      lineNode.setAttr('__isQnaNode', true);
                      lineNode.setAttr('__elementId', element.id);
                      lineNode.setAttr('__nodeType', 'qna-line');
                    }

                    layer.add(lineNode);
                    ruledLinesRenderedCount++;
                  }
                }
              });
              
              // Generate additional ruled lines to fill the rest of the textbox (matching client-side logic)
              // This only applies to answer lines (ruledLinesTarget === 'answer')
              if (ruledLinesTarget === 'answer' && baselineYPositions.size > 0) {
                // Filter baselines by answer style
                const answerBaselineYPositions = new Set<number>();
                runs.forEach((run) => {
                  if (run.style.fontSize === answerStyle.fontSize) {
                    answerBaselineYPositions.add(run.y);
                  }
                });
                
                if (answerBaselineYPositions.size > 0) {
                  const answerLineHeight = sharedGetLineHeight(answerStyle);
                  const sortedAnswerBaselines = Array.from(answerBaselineYPositions).sort((a, b) => a - b);
                  const lastBaselineY = sortedAnswerBaselines[sortedAnswerBaselines.length - 1];
                  // Calculate next line position: last baseline + line height + offset + top offset
                  let nextLineY = elementY + lastBaselineY + answerLineHeight + RULED_LINE_BASELINE_OFFSET + RULED_LINE_TOP_OFFSET;
                  
                  // Determine start and end X positions and bottom Y (all relative to element)
                  const relativeStartX = padding;
                  const relativeEndX = elementWidth - padding;
                  const relativeBottomY = elementHeight - padding;
                  
                  // Generate additional lines until we reach the bottom
                  // nextLineY is absolute (elementY + relative position)
                  while (nextLineY <= elementY + relativeBottomY) {
                    // Generate ruled line
                    // Convert relative coordinates to absolute for rendering
                    const absoluteStartX = elementX + relativeStartX;
                    const absoluteEndX = elementX + relativeEndX;
                    const absoluteLineY = nextLineY;
                    
                    // Generate ruled line using shared theme engine
                  const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                  const supportedThemes: Theme[] = ['default', 'rough', 'glow', 'candy', 'zigzag', 'wobbly', 'dashed'];
                  const theme = (supportedThemes.includes(aTheme as Theme) ? aTheme : 'default') as Theme;
                  
                    // Create a temporary element for theme-specific settings
                  const tempElement: CanvasElement = {
                    ...element,
                    type: 'line' as const,
                      id: element.id + '-ruled-line-extra',
                    x: 0,
                    y: 0,
                      width: Math.abs(absoluteEndX - absoluteStartX),
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
                      path: createLinePath(absoluteStartX, absoluteLineY, absoluteEndX, absoluteLineY),
                    theme: theme,
                    themeSettings: {
                        seed: seed + absoluteLineY,
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
                        x1: absoluteStartX,
                        y1: absoluteLineY,
                        x2: absoluteEndX,
                        y2: absoluteLineY,
                      strokeWidth: aWidth,
                      stroke: aColor,
                      theme: theme,
                        seed: seed + absoluteLineY,
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
                          points: [absoluteStartX, absoluteLineY, absoluteEndX, absoluteLineY],
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

                      // Set z-order attributes
                    const zOrderIndex = elementIdToZOrder.get(element.id);
                    if (zOrderIndex !== undefined) {
                      lineNode.setAttr('__zOrderIndex', zOrderIndex);
                      lineNode.setAttr('__isQnaNode', true);
                      lineNode.setAttr('__elementId', element.id);
                      lineNode.setAttr('__nodeType', 'qna-line');
                    }

                    layer.add(lineNode);
                    ruledLinesRenderedCount++;
                  }
                  
                    nextLineY += answerLineHeight;
                  }
                }
              }
              
              // Debug: Log inline layout ruled lines count
              console.log('[DEBUG PDFRenderer] Inline layout ruled lines rendered:');
              console.log('  elementId:', element.id);
              console.log('  linesCount:', ruledLinesRenderedCount);
            }
            
            // Debug: Log total ruled lines rendered
            console.log('[DEBUG PDFRenderer] Total ruled lines rendered (first path):');
            console.log('  elementId:', element.id);
            console.log('  totalLinesCount:', ruledLinesRenderedCount);
          }
          
          // Render text using shared layout runs (matches textbox-qna.tsx RichTextShape)
          if (runs.length > 0) {
            const textShape = new Konva.Shape({
              x: elementX,
              y: elementY,
              sceneFunc: (ctx, shape) => {
                ctx.save();
                ctx.textBaseline = 'alphabetic';
                runs.forEach((run) => {
                  const style = run.style;
                  const fontString = sharedBuildFont(style);
                  const textColor = style.fontColor || '#000000';
                  const textOpacity = (style.fontOpacity !== undefined ? style.fontOpacity : 1) * elementOpacity;
                  
                  ctx.font = fontString;
                  ctx.fillStyle = textColor;
                  ctx.globalAlpha = textOpacity;
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
            const zOrderIndex = elementIdToZOrder.get(element.id);
            if (zOrderIndex !== undefined) {
              textShape.setAttr('__zOrderIndex', zOrderIndex);
              textShape.setAttr('__elementId', element.id);
              textShape.setAttr('__nodeType', 'qna-text');
            }
          }
          
          // Render border if enabled (after background, ruled lines, and text - matching client-side order)
          const borderTheme = element.borderTheme || qnaDefaults.borderTheme || 'default';
          const borderColor = element.borderColor || qnaDefaults.borderColor || '#1f2937';
          const borderWidth = element.borderWidth || qnaDefaults.borderWidth || 0;
          const borderOpacity = getStandardizedOpacity(element, 'border', 1);
          const cornerRadius = element.cornerRadius ?? qnaDefaults.cornerRadius ?? 0;
          
          if (borderWidth > 0) {
            const themeRenderer = getThemeRenderer(borderTheme);
            const useTheme = themeRenderer && borderTheme !== 'default';
            
            if (useTheme) {
              // Use themed border rendering
              const borderElement = {
                type: 'rect' as any,
                id: element.id + '-border',
                x: 0,
                y: 0,
                width: elementWidth,
                height: dynamicHeight,
                cornerRadius: cornerRadius,
                stroke: borderColor,
              strokeWidth: borderWidth,
                fill: 'transparent',
                roughness: borderTheme === 'rough' ? 8 : undefined,
              candyRandomness: (element as any).candyRandomness,
              candyIntensity: (element as any).candyIntensity,
              candySpacingMultiplier: (element as any).candySpacingMultiplier,
              candyHoled: (element as any).candyHoled
              } as CanvasElement;
              
              const borderPathData = themeRenderer.generatePath(borderElement);
              const borderStrokeProps = themeRenderer.getStrokeProps(borderElement);
              
              if (borderPathData) {
                let pathStroke = borderStrokeProps.stroke || borderColor;
                if (pathStroke && borderOpacity < 1) {
                  if (pathStroke.startsWith('#')) {
                    pathStroke = hexToRgba(pathStroke, borderOpacity);
                  } else if (pathStroke.startsWith('rgb')) {
                    const rgbMatch = pathStroke.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                    if (rgbMatch) {
                      pathStroke = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${borderOpacity})`;
                    }
                  }
                }
                
                const borderPathConfig = createRectPath(0, 0, elementWidth, dynamicHeight);
            const borderPath = renderThemedBorderKonvaWithFallback({
              width: borderWidth,
                  color: pathStroke,
                  opacity: borderOpacity < 1 ? 1 : elementOpacity,
                  path: borderPathConfig,
              theme: borderTheme,
              themeSettings: {
                    roughness: borderTheme === 'rough' ? 8 : undefined,
                candyRandomness: (borderElement as any).candyRandomness,
                candyIntensity: (borderElement as any).candyIntensity,
                candySpacingMultiplier: (borderElement as any).candySpacingMultiplier,
                candyHoled: (borderElement as any).candyHoled
              },
              cornerRadius: cornerRadius,
              strokeScaleEnabled: true,
              listening: false
            }, () => {
                  return new Konva.Path({
                    data: borderPathData,
                  x: elementX,
                  y: elementY,
                    stroke: pathStroke,
                    strokeWidth: borderStrokeProps.strokeWidth || borderWidth,
                    opacity: borderOpacity < 1 ? 1 : elementOpacity,
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
              borderPath.x(elementX);
              borderPath.y(elementY);
              borderPath.rotation(elementRotation);
              borderPath.visible(true);
              
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
                const borderZOrderIndex = elementIdToZOrder.get(element.id);
                if (borderZOrderIndex !== undefined) {
                  borderPath.setAttr('__zOrderIndex', borderZOrderIndex);
                  borderPath.setAttr('__elementId', element.id);
                    borderPath.setAttr('__isQnaNode', true);
                  borderPath.setAttr('__nodeType', 'qna-border');
                }
                }
              }
            } else {
              // Default border rendering without theme
              let rectStroke = borderColor;
              if (rectStroke && borderOpacity < 1) {
                if (rectStroke.startsWith('#')) {
                  rectStroke = hexToRgba(rectStroke, borderOpacity);
                } else if (rectStroke.startsWith('rgb')) {
                  const rgbMatch = rectStroke.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                  if (rgbMatch) {
                    rectStroke = `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${borderOpacity})`;
                  }
                }
              }
              
              const borderRect = new Konva.Rect({
              x: elementX,
              y: elementY,
              width: elementWidth,
                height: dynamicHeight,
                fill: 'transparent',
                stroke: rectStroke,
                strokeWidth: borderWidth,
                cornerRadius: cornerRadius,
              rotation: elementRotation,
                opacity: borderOpacity < 1 ? 1 : elementOpacity,
                listening: false
              });
              
              layer.add(borderRect);
              const borderZOrderIndex = elementIdToZOrder.get(element.id);
              if (borderZOrderIndex !== undefined) {
                borderRect.setAttr('__zOrderIndex', borderZOrderIndex);
                borderRect.setAttr('__elementId', element.id);
                borderRect.setAttr('__isQnaNode', true);
                borderRect.setAttr('__nodeType', 'qna-border');
              }
            }
          }
          
          // QnA element fully handled - skip remaining rendering
          continue;
        }
        // Render QnA elements (standard QnA textbox - textbox-qna.tsx logic)
        // NOTE: A large disabled code block was removed here to fix parsing errors
        // The disabled block contained an alternative QnA rendering path that was not being used
        // If needed in the future, it can be restored from git history
        // The active QnA rendering path is above (starting around line 933)
        
        // Render free_text elements
        if (element.textType === 'free_text') {
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
            const freeTextDefaults = getGlobalThemeDefaults(activeTheme, 'free_text', undefined);
            
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
          // Debug: Log all crop properties for image elements
          console.log('DEBUG: [PDFRenderer] Element crop properties for', element.id, ':', {
            cropX: element.cropX,
            cropY: element.cropY,
            cropWidth: element.cropWidth,
            cropHeight: element.cropHeight,
            hasCropX: element.cropX !== undefined,
            hasCropY: element.cropY !== undefined,
            hasCropWidth: element.cropWidth !== undefined,
            hasCropHeight: element.cropHeight !== undefined,
            imageClipPosition: element.imageClipPosition
          });

          // console.log('[PDFRenderer] Rendering image element:', {
          //   elementId: element.id,
          //   elementType: element.type,
          //   hasSrc: !!element.src,
          //   src: element.src,
          //   x: elementX,
          //   y: elementY,
          //   width: elementWidth,
          //   height: elementHeight
          // });
          
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
          
          // console.log('[PDFRenderer]< Loading image:', {
          //   elementId: element.id,
          //   elementType: element.type,
          //   originalSrc: imageSrc,
          //   resolvedUrl: imageUrl,
          //   isS3Url: isS3Url,
          //   hasToken: !!token
          // });
          
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
              // Use stored crop values from database if available, otherwise calculate
              let cropProps = {};
              if (element.cropX !== undefined && element.cropY !== undefined &&
                  element.cropWidth !== undefined && element.cropHeight !== undefined) {
                // Use stored crop values from database
                cropProps = {
                  cropX: element.cropX,
                  cropY: element.cropY,
                  cropWidth: element.cropWidth,
                  cropHeight: element.cropHeight
                };

                console.log('✅ [PDFRenderer] Using stored crop values for image:', element.id, {
                  elementSize: { width: elementWidth, height: elementHeight },
                  imageSize: { width: img.width, height: img.height },
                  storedCrop: cropProps
                });
              } else if (element.imageClipPosition) {
                // Fallback: calculate crop values if not stored
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

                  console.log('⚠️ [PDFRenderer] Calculated crop for image (fallback):', element.id, {
                    elementSize: { width: elementWidth, height: elementHeight },
                    imageSize: { width: img.width, height: img.height },
                    calculatedCrop: cropProps
                  });
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
                    const effectivePaletteId = pageColorPaletteId || bookColorPaletteId;
                    qnaDefaults = getGlobalThemeDefaults(activeTheme, 'qna', effectivePaletteId);
                  } catch (error) {
                    console.warn('[PDFRenderer] Error getting tool defaults for frame, using fallback:', error);
                    qnaDefaults = { borderColor: '#1f2937' };
                  }

                  const stroke = element.borderColor || qnaDefaults.borderColor || '#1f2937';
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
            // console.log('[PDFRenderer] Theme rendering:', {
            //   elementId: element.id,
            //   theme,
            //   useTheme,
            //   hasPathData: !!pathData,
            //   strokeProps
            // });

            // Debug: Log circle dimensions - ALWAYS log for circles, regardless of theme
            // if (element.type === 'circle') {
            //   const circleRadius = Math.min(elementWidth, elementHeight) / 2;
            //   console.log('[DEBUG PDFRenderer] Circle rendered:');
            //   console.log('  elementId:', element.id);
            //   console.log('  elementWidth:', elementWidth);
            //   console.log('  elementHeight:', elementHeight);
            //   console.log('  radius:', circleRadius, '(calculated: Math.min(' + elementWidth + ', ' + elementHeight + ') / 2 = ' + circleRadius + ')');
            //   console.log('  centerX:', elementX + elementWidth / 2);
            //   console.log('  centerY:', elementY + elementHeight / 2);
            //   console.log('  strokeWidth:', strokeWidth);
            //   console.log('  useTheme:', useTheme);
            //   console.log('  theme:', theme);
            //   console.log('  hasPathData:', !!pathData);
            // }
            
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
                  // Set z-order attributes for ALL borders
                  const borderZOrderIndex = elementIdToZOrder.get(element.id);
                  if (borderZOrderIndex !== undefined) {
                    borderPath.setAttr('__zOrderIndex', borderZOrderIndex);
                    borderPath.setAttr('__elementId', element.id);
                    borderPath.setAttr('__isQnaNode', element.textType === 'qna');
                    borderPath.setAttr('__nodeType', element.textType === 'qna' ? 'qna-border' : undefined);
                  }
                  }

                  // console.log('[PDFRenderer] Created themed shape (Candy/Wobbly):', {
                  //   elementId: element.id,
                  //   theme,
                  //   hasFill: !!pathFill,
                  //   hasBorder: !!borderPathData,
                  //   strokeWidth: borderStrokeProps.strokeWidth || strokeProps.strokeWidth
                  // });
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

              // console.log('[PDFRenderer] Created themed shape:', {
              //   elementId: element.id,
              //   theme,
              //   pathDataLength: pathData.length,
              //   strokeProps,
              //   hasFill: !!pathFill,
              //   hasStroke: !!pathStroke,
              //   pathFill,
              //   pathStroke,
              //   strokeWidth: strokeProps.strokeWidth || strokeWidth
              // });
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
              // console.log('[DEBUG PDFRenderer] Circle rendered (no theme):');
              // console.log('  elementId:', element.id);
              // console.log('  elementWidth:', elementWidth);
              // console.log('  elementHeight:', elementHeight);
              // console.log('  radius:', circleRadius, '(calculated: Math.min(' + elementWidth + ', ' + elementHeight + ') / 2 = ' + circleRadius + ')');
              // console.log('  centerX:', elementX + elementWidth / 2);
              // console.log('  centerY:', elementY + elementHeight / 2);
              // console.log('  strokeWidth:', strokeWidth);
              // console.log('  useTheme: false');
              
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
    
    // console.log('[PDFRenderer] Rendered to manual layer, layer has', layer.getChildren().length, 'children');
    
    // After all images are loaded (or failed), fix z-order
    // Use allSettled to ensure z-order fix runs even if some images fail
    if (imagePromises.length > 0) {
      Promise.allSettled(imagePromises).then(() => {
        // console.log('[DEBUG z-order PDFRenderer] All images loaded (or failed), fixing z-order...');

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
          // if (child.getClassName() === 'Path') {
          //   console.log(`[DEBUG z-order PDFRenderer] Found Path node at index ${i}:`, {
          //     zOrder: zOrder,
          //     elementId: elementId,
          //     nodeType: nodeType,
          //     isQnaNode: child.getAttr('__isQnaNode'),
          //     className: child.getClassName()
          //   });
          // }

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
          
          // Determine zOrder: Backgrounds first, then QnA nodes by elementId, then by zOrderIndex, then by position
          let elementZOrder;
          if (isBackground) {
            elementZOrder = -1; // Backgrounds always first
          } else if (isQnaNode && elementId) {
            // QnA nodes get zOrder from their elementId (all parts of a QnA element have same zOrder)
            elementZOrder = elementIdToZOrder.get(elementId) ?? 0;
          } else if (zOrder !== undefined) {
            elementZOrder = zOrder; // Use existing zOrderIndex
        } else {
          // Fallback: for elements with elementId undefined (likely client-side rendered elements), give them the highest zOrder
          elementZOrder = elementId ? (i - 1) : Math.max(...Array.from(elementIdToZOrder.values()));
        }
          
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
        // console.log('[DEBUG z-order PDFRenderer] Elements before sorting:');
        // allElements.forEach((el, idx) => {
        //   const elementId = el.elementId || el.node.getAttr('__elementId');
        //   const nodeType = el.nodeType || el.node.getAttr('__nodeType');
        //   const isQnaNode = el.node.getAttr('__isQnaNode');
        //   console.log(`[DEBUG z-order PDFRenderer]   [${idx}] ${el.node.getClassName()} - zOrder: ${el.zOrder}, elementId: ${elementId || 'undefined'}, nodeType: ${nodeType || 'undefined'}, isQnaNode: ${isQnaNode || false}, originalIndex: ${el.originalIndex}`);
        // });
        
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
        // console.log('[DEBUG z-order PDFRenderer] Repositioning', allElements.length, 'elements...');
        // console.log('[DEBUG z-order PDFRenderer] Layer children before reordering:', layer.getChildren().length);
        // console.log('[DEBUG z-order PDFRenderer] Background elements:', allElements.filter(el => el.isBackground).length);
        
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
            // console.log(`[DEBUG z-order PDFRenderer] Added ${el.node.getClassName()} at position ${i} (zOrder: ${el.zOrder}, isBackground: ${el.isBackground}, originalIndex: ${el.originalIndex}, opacity: ${finalOpacity}, originalOpacity: ${el.originalOpacity}, elementId: ${elementId || 'undefined'}, nodeType: ${nodeType || 'undefined'}, isQnaNode: ${isQnaNode || false})`);
            
            // Special debug for QnA background rects
            if (el.node.getClassName() === 'Rect' && el.node.getAttr('__isQnaNode')) {
              const rectNode = el.node as Konva.Rect;
              const fillValue = rectNode.fill ? rectNode.fill() : 'N/A';
              // console.log(`[DEBUG z-order PDFRenderer] QnA Background Rect at position ${i}:`, {
              //   elementId: el.node.getAttr('__elementId'),
              //   opacity: finalOpacity,
              //   originalOpacity: el.originalOpacity,
              //   fill: fillValue,
              //   fillType: typeof fillValue === 'string' ? (fillValue.startsWith('rgba') ? 'rgba' : fillValue.startsWith('rgb') ? 'rgb' : fillValue.startsWith('#') ? 'hex' : 'other') : 'N/A',
              //   fillHasAlpha: typeof fillValue === 'string' && fillValue.includes('rgba')
              // });
            }
            
            // Special debug for QnA ruled lines (Path elements)
            if (el.node.getClassName() === 'Path' && el.node.getAttr('__isQnaNode') && el.node.getAttr('__nodeType') === 'qna-line') {
              // console.log(`[DEBUG z-order PDFRenderer] QnA Ruled Line Path at position ${i}:`, {
              //   elementId: el.node.getAttr('__elementId'),
              //   nodeType: el.node.getAttr('__nodeType'),
              //   zOrderIndex: el.node.getAttr('__zOrderIndex'),
              //   zOrder: el.zOrder,
              //   originalIndex: el.originalIndex
              // });
            }
          } catch (error) {
            console.error(`[DEBUG z-order PDFRenderer] Error adding element at position ${i}:`, error);
            if (error instanceof Error) {
              console.error(`[DEBUG z-order PDFRenderer] Error message: ${error.message}`);
              console.error(`[DEBUG z-order PDFRenderer] Error stack: ${error.stack}`);
            }
          }
        });
        
        // console.log('[DEBUG z-order PDFRenderer] Layer children after reordering:', layer.getChildren().length);
        
        layer.draw();
        stageRef.current?.draw();
        // console.log('[DEBUG z-order PDFRenderer] Z-order fix complete');
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
