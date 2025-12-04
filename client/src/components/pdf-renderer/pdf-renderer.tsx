import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Group } from 'react-konva';
import Konva from 'konva';
import { useEditor } from '../../context/editor-context.tsx';
import type { Page, Book, CanvasElement } from '../../context/editor-context.tsx';
import CanvasItemComponent from '../features/editor/canvas-items/index.tsx';
import { resolveBackgroundImageUrl } from '../../utils/background-image-utils.ts';
import { getPalettePartColor } from '../../data/templates/color-palettes.ts';
import { colorPalettes } from '../../data/templates/color-palettes.ts';
import { PATTERNS } from '../../utils/patterns.ts';
import { getToolDefaults } from '../../utils/tool-defaults.ts';
import { getThemeRenderer } from '../../utils/themes.ts';
import type { PageBackground } from '../../context/editor-context.tsx';

interface PDFRendererProps {
  page: Page;
  bookData: Book;
  width: number;
  height: number;
  scale?: number;
  onRenderComplete?: () => void;
}

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

  // Load background image if needed
  useEffect(() => {
    const background = page.background;
    if (background?.type === 'image') {
      const imageUrl = resolveBackgroundImageUrl(background, {
        paletteId: pagePaletteId || undefined,
        paletteColors: palette?.colors,
      });

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
  }, [page.background, pagePaletteId, palette]);

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

  // Create layer manually (workaround for react-konva Layer not mounting in Puppeteer)
  const layerRef = useRef<Konva.Layer | null>(null);
  const [layerReady, setLayerReady] = useState(false);

  useEffect(() => {
    if (stageRef.current && !layerRef.current) {
      // Create layer manually
      const layer = new Konva.Layer();
      stageRef.current.add(layer);
      layerRef.current = layer;
      
      console.log('[PDFRenderer] Manually created layer, stage now has', stageRef.current.getLayers().length, 'layers');
      
      // Set stage globally
      (window as any).konvaStage = stageRef.current;
      
      // Mark layer as ready
      setLayerReady(true);
    }
    
    return () => {
      if (layerRef.current && stageRef.current) {
        layerRef.current.destroy();
        layerRef.current = null;
        setLayerReady(false);
      }
    };
  }, [stageRef.current]);

  // Render content to manually created layer
  useEffect(() => {
    if (!layerRef.current || !layerReady || !stageRef.current) return;
    
    const layer = layerRef.current;
    
    // Clear existing content
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
      layer.add(bgRect);
    } else {
      const opacity = background.opacity ?? 1;
      
      if (background.type === 'color') {
        const bgRect = new Konva.Rect({
          x: 0,
          y: 0,
          width: width,
          height: height,
          fill: background.value || '#ffffff',
          opacity: opacity,
          listening: false,
        });
        layer.add(bgRect);
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
        layer.add(bgRect1);
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
        layer.add(bgRect2);
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
            
            const bgRect = new Konva.Rect({
              x: 0,
              y: 0,
          width: width,
          height: height,
              fill: baseBackgroundColor,
              opacity: opacity,
              listening: false,
            });
            layer.add(bgRect);
            
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
            layer.add(bgImage);
            
            layer.draw();
            stageRef.current.draw();
            return;
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
        
        const bgRect = new Konva.Rect({
          x: 0,
          y: 0,
          width: width,
          height: height,
          fill: baseBackgroundColor,
          opacity: opacity,
          listening: false,
        });
        layer.add(bgRect);
        
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
        layer.add(bgImage);
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
        layer.add(bgRect);
      }
    }
    
    // Render page elements
    const elements = sortedElements;
    console.log('[PDFRenderer] Rendering', elements.length, 'elements');
    
    for (const element of elements) {
      try {
        // Skip placeholder elements
        if (element.type === 'placeholder') {
          continue;
        }
        
        // Skip brush-multicolor elements (they are rendered as groups)
        if (element.type === 'brush-multicolor') {
          continue;
        }
        
        // Ensure element position is correctly set
        const elementX = typeof element.x === 'number' ? element.x : 0;
        const elementY = typeof element.y === 'number' ? element.y : 0;
        const elementWidth = typeof element.width === 'number' ? element.width : 100;
        const elementHeight = typeof element.height === 'number' ? element.height : 100;
        const elementRotation = typeof element.rotation === 'number' ? element.rotation : 0;
        const elementOpacity = typeof element.opacity === 'number' ? element.opacity : 1;
        
        // Render QnA Inline elements with proper formatting
        if (element.textType === 'qna_inline') {
          // Get tool defaults for qna_inline
          const currentPage = state.currentBook?.pages?.find(p => p.id === page.id) || page;
          const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
          const bookTheme = bookData?.themeId || bookData?.bookTheme;
          const pageLayoutTemplateId = currentPage?.layoutTemplateId;
          const bookLayoutTemplateId = bookData?.layoutTemplateId;
          const pageColorPaletteId = currentPage?.colorPaletteId;
          const bookColorPaletteId = bookData?.colorPaletteId;
          
          const qnaDefaults = getToolDefaults(
            'qna_inline',
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
          }
          
          // Get answer text
          let answerText = element.formattedText || element.text || '';
          if (answerText.includes('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = answerText;
            answerText = tempDiv.textContent || tempDiv.innerText || '';
          }
          
          // Calculate dynamic height based on content
          const calculateHeight = () => {
            if (!questionText && !answerText) return elementHeight;
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            let totalHeight = padding * 2;
            
            if (questionText) {
              const qFontSize = questionStyle.fontSize || 45;
              const qFontFamily = (questionStyle.fontFamily || 'Arial, sans-serif').replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
              const qFontBold = questionStyle.fontBold ?? false;
              const qFontItalic = questionStyle.fontItalic ?? false;
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
              const aFontFamily = (answerStyle.fontFamily || 'Arial, sans-serif').replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
              const aFontBold = answerStyle.fontBold ?? false;
              const aFontItalic = answerStyle.fontItalic ?? false;
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
          if (showBackground) {
            const backgroundColor = element.backgroundColor || questionStyle.background?.backgroundColor || answerStyle.background?.backgroundColor || 'transparent';
            const backgroundOpacity = element.backgroundOpacity ?? questionStyle.backgroundOpacity ?? answerStyle.backgroundOpacity ?? 1;
            const cornerRadius = element.cornerRadius ?? qnaDefaults.cornerRadius ?? 0;
            
            const bgRect = new Konva.Rect({
              x: elementX,
              y: elementY,
              width: elementWidth,
              height: dynamicHeight,
              fill: backgroundColor,
              opacity: backgroundOpacity,
              cornerRadius: cornerRadius,
              rotation: elementRotation,
              listening: false,
            });
            layer.add(bgRect);
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
            
            const qFontFamily = (questionStyle.fontFamily || 'Arial, sans-serif').replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
            const qFontColor = questionStyle.fontColor || '#666666';
            const qFontOpacity = questionStyle.fontOpacity ?? 1;
            const qFontBold = questionStyle.fontBold ?? false;
            const qFontItalic = questionStyle.fontItalic ?? false;
            
            const aFontFamily = (answerStyle.fontFamily || 'Arial, sans-serif').replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
            const aFontColor = answerStyle.fontColor || '#1f2937';
            const aFontOpacity = answerStyle.fontOpacity ?? 1;
            const aFontBold = answerStyle.fontBold ?? false;
            const aFontItalic = answerStyle.fontItalic ?? false;
            
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
                    fontStyle: `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic' : ''}`.trim() || 'normal',
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
                  fontStyle: `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic' : ''}`.trim() || 'normal',
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
                      fontStyle: `${aFontBold ? 'bold ' : ''}${aFontItalic ? 'italic' : ''}`.trim() || 'normal',
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
                    fontStyle: `${aFontBold ? 'bold ' : ''}${aFontItalic ? 'italic' : ''}`.trim() || 'normal',
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
              let questionFontFamily = (questionStyle.fontFamily || 'Arial, sans-serif').replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
              if (questionFontFamily.includes('Mynerve')) {
                questionFontFamily = 'Mynerve, cursive';
              }
              const questionFontColor = questionStyle.fontColor || '#666666';
              const questionFontOpacity = questionStyle.fontOpacity ?? 1;
              const questionFontBold = questionStyle.fontBold ?? false;
              const questionFontItalic = questionStyle.fontItalic ?? false;
              
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
                
                const questionNode = new Konva.Text({
                  x: questionX,
                  y: elementY + questionY,
                  text: line,
                  fontSize: questionFontSize,
                  fontFamily: questionFontFamily,
                  fontStyle: `${questionFontBold ? 'bold ' : ''}${questionFontItalic ? 'italic' : ''}`.trim() || 'normal',
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
                let answerFontFamily = (answerStyle.fontFamily || 'Arial, sans-serif').replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
                if (answerFontFamily.includes('Mynerve')) {
                  answerFontFamily = 'Mynerve, cursive';
                }
                const answerFontColor = answerStyle.fontColor || '#1f2937';
                const answerFontOpacity = answerStyle.fontOpacity ?? 1;
                const answerFontBold = answerStyle.fontBold ?? false;
                const answerFontItalic = answerStyle.fontItalic ?? false;
                
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
                          
                          // Render answer after question with shared baseline alignment
                          const answerNode = new Konva.Text({
                            x: startX + qWidth + gap,
                            y: elementY + answerY,
                            text: lineText,
                            fontSize: answerFontSize,
                            fontFamily: answerFontFamily,
                            fontStyle: `${answerFontBold ? 'bold ' : ''}${answerFontItalic ? 'italic' : ''}`.trim() || 'normal',
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
                          const answerBaselineOffset = -(aFontSize * getLineHeightMultiplier(aParagraphSpacing) * 0.15) + (aFontSize * (aFontSize >= 50 ? aFontSize >= 96 ? aFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1));
                          totalAnswerLineCount = firstLineSegmentCount - 1;
                          const answerLineIndex = totalAnswerLineCount - 1;
                          const answerBaseline = combinedLineBaseline + (answerLineIndex * aLineHeight) + answerBaselineOffset + (aFontSize * 0.6);
                          const answerY = answerBaseline - (aFontSize * 0.8);
                          
                          const answerNode = new Konva.Text({
                            x: elementX + padding,
                            y: elementY + answerY,
                            text: lineText,
                            fontSize: answerFontSize,
                            fontFamily: answerFontFamily,
                            fontStyle: `${answerFontBold ? 'bold ' : ''}${answerFontItalic ? 'italic' : ''}`.trim() || 'normal',
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
                        const answerBaselineOffset = -(aFontSize * getLineHeightMultiplier(aParagraphSpacing) * 0.15) + (aFontSize * (aFontSize >= 50 ? aFontSize >= 96 ? aFontSize >= 145 ? -0.07 : 0.01 : 0.07  : 0.1));
                        totalAnswerLineCount++;
                        const answerBaseline = combinedLineBaseline + (totalAnswerLineCount * aLineHeight) + answerBaselineOffset + (aFontSize * 0.6);
                        const answerY = answerBaseline - (aFontSize * 0.8);
                        
                        const answerNode = new Konva.Text({
                          x: elementX + padding,
                          y: elementY + answerY,
                          text: lineText,
                          fontSize: answerFontSize,
                          fontFamily: answerFontFamily,
                          fontStyle: `${answerFontBold ? 'bold ' : ''}${answerFontItalic ? 'italic' : ''}`.trim() || 'normal',
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
              let answerFontFamily = (answerStyle.fontFamily || 'Arial, sans-serif').replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
              if (answerFontFamily.includes('Mynerve')) {
                answerFontFamily = 'Mynerve, cursive';
              }
              const answerFontColor = answerStyle.fontColor || '#1f2937';
              const answerFontOpacity = answerStyle.fontOpacity ?? 1;
              const answerFontBold = answerStyle.fontBold ?? false;
              const answerFontItalic = answerStyle.fontItalic ?? false;
              
              const answerNode = new Konva.Text({
                x: elementX + padding,
                y: elementY + effectivePadding,
                text: answerText,
                fontSize: answerFontSize,
                fontFamily: answerFontFamily,
                fontStyle: `${answerFontBold ? 'bold ' : ''}${answerFontItalic ? 'italic' : ''}`.trim() || 'normal',
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
          if (answerRuledLines) {
            const aTheme = element.ruledLinesTheme || 'rough';
            const aColor = element.ruledLinesColor || '#1f2937';
            const aWidth = element.ruledLinesWidth || 0.8;
            const aOpacity = element.ruledLinesOpacity ?? 1;
            const aFontSize = answerStyle.fontSize || 50;
            const aSpacing = answerStyle.paragraphSpacing || element.paragraphSpacing || 'small';
            
            const aLineHeight = aFontSize * getLineHeightMultiplier(aSpacing);
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
                  const qFontFamily = (questionStyle.fontFamily || 'Arial, sans-serif').replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
                  const qFontBold = questionStyle.fontBold ?? false;
                  const qFontItalic = questionStyle.fontItalic ?? false;
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
                }
                lineY += aLineHeight;
              }
            } else {
              // Inline layout: position ruled lines based on actual text layout
              // This matches the logic from textbox-qna-inline.tsx
              if (questionText && answerText) {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d')!;
                const questionFontSize = questionStyle.fontSize || 45;
                let questionFontFamily = (questionStyle.fontFamily || 'Arial, sans-serif').replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
                if (questionFontFamily.includes('Mynerve')) {
                  questionFontFamily = 'Mynerve, cursive';
                }
                const questionFontBold = questionStyle.fontBold ?? false;
                const questionFontItalic = questionStyle.fontItalic ?? false;
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
                let answerFontFamily = (answerStyle.fontFamily || 'Arial, sans-serif').replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
                if (answerFontFamily.includes('Mynerve')) {
                  answerFontFamily = 'Mynerve, cursive';
                }
                const answerFontBold = answerStyle.fontBold ?? false;
                const answerFontItalic = answerStyle.fontItalic ?? false;
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
                    }
                  }
                }
                
                // Generate lines for answer lines
                let answerLineIndex = canFitOnSameLine ? 0 : 1;
                const endY = elementY + dynamicHeight - padding;
                
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
                  answerLineIndex++;
                }
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
                }
              }
            }
          }
        }
        // Render QnA elements (standard QnA textbox - textbox-qna.tsx logic)
        else if (element.textType === 'qna' || element.textType === 'qna2') {
          // Get tool defaults for qna (use qna_inline defaults as base)
          const currentPage = state.currentBook?.pages?.find(p => p.id === page.id) || page;
          const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
          const bookTheme = bookData?.themeId || bookData?.bookTheme;
          const pageLayoutTemplateId = currentPage?.layoutTemplateId;
          const bookLayoutTemplateId = bookData?.layoutTemplateId;
          const pageColorPaletteId = currentPage?.colorPaletteId;
          const bookColorPaletteId = bookData?.colorPaletteId;
          
          const qnaDefaults = getToolDefaults(
            'qna_inline',
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
            fontFamily: questionSettings.fontFamily || qnaDefaults.questionSettings?.fontFamily || qnaDefaults.fontFamily || 'Arial, sans-serif',
            fontBold: questionSettings.fontBold ?? qnaDefaults.questionSettings?.fontBold ?? false,
            fontItalic: questionSettings.fontItalic ?? qnaDefaults.questionSettings?.fontItalic ?? false,
            fontColor: questionSettings.fontColor || qnaDefaults.questionSettings?.fontColor || '#666666',
            fontOpacity: questionSettings.fontOpacity ?? qnaDefaults.questionSettings?.fontOpacity ?? 1,
            paragraphSpacing: questionSettings.paragraphSpacing || qnaDefaults.questionSettings?.paragraphSpacing || (element as any).paragraphSpacing || 'small',
            align: questionAlign
          };
          
          const answerStyle = {
            fontSize: answerSettings.fontSize || qnaDefaults.answerSettings?.fontSize || qnaDefaults.fontSize || 48,
            fontFamily: answerSettings.fontFamily || qnaDefaults.answerSettings?.fontFamily || qnaDefaults.fontFamily || 'Arial, sans-serif',
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
          
          // Helper functions from textbox-qna.tsx
          const LINE_HEIGHT: Record<string, number> = {
            small: 1,
            medium: 1.2,
            large: 1.5
          };
          
          function buildFont(style: typeof questionStyle) {
            const weight = style.fontBold ? 'bold ' : '';
            const italic = style.fontItalic ? 'italic ' : '';
            return `${weight}${italic}${style.fontSize}px ${style.fontFamily}`;
          }
          
          function getLineHeight(style: typeof questionStyle) {
            const spacing = style.paragraphSpacing || 'medium';
            return style.fontSize * (LINE_HEIGHT[spacing] || 1.2);
          }
          
          function measureText(text: string, style: typeof questionStyle, ctx: CanvasRenderingContext2D | null) {
            if (!ctx) {
              return text.length * (style.fontSize * 0.6);
            }
            ctx.save();
            ctx.font = buildFont(style);
            const width = ctx.measureText(text).width;
            ctx.restore();
            return width;
          }
          
          function wrapText(text: string, style: typeof questionStyle, maxWidth: number, ctx: CanvasRenderingContext2D | null) {
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
          }
          
          // Extract layout settings from element (layoutVariant already defined above)
          const questionPosition = (element as any).questionPosition || 'left';
          const questionWidth = (element as any).questionWidth ?? 40;
          const ruledLinesTarget = (element as any).ruledLinesTarget || 'answer';
          const blockQuestionAnswerGap = (element as any).blockQuestionAnswerGap ?? 10;
          
          // Helper function to calculate text X position based on alignment
          function calculateTextX(text: string, style: typeof questionStyle, startX: number, availableWidth: number, ctx: CanvasRenderingContext2D | null): number {
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
          }
          
          // Create layout using createLayout logic from textbox-qna.tsx
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const runs: Array<{ text: string; x: number; y: number; style: typeof questionStyle }> = [];
          let contentHeight = elementHeight;
          let linePositions: Array<{ y: number; lineHeight: number; style: typeof questionStyle }> = [];
          let blockRuledLinesNodes: Array<Konva.Path | Konva.Line> = [];
          
          // Block layout uses different logic
          if (layoutVariant === 'block') {
            // Calculate line heights
            const questionLineHeight = getLineHeight(effectiveQuestionStyle);
            const answerLineHeight = getLineHeight(answerStyle);
            
            // Baseline offsets
            const questionBaselineOffset = effectiveQuestionStyle.fontSize * 0.8;
            const answerBaselineOffset = answerStyle.fontSize * 0.8;
            
            // Calculate question and answer areas based on position
            let questionArea = { x: padding, y: padding, width: elementWidth - padding * 2, height: elementHeight - padding * 2 };
            let answerArea = { x: padding, y: padding, width: elementWidth - padding * 2, height: elementHeight - padding * 2 };
            
            // Calculate question dimensions
            let calculatedQuestionHeight = 0;
            
            if (questionText && ctx) {
              const questionLines = wrapText(questionText, effectiveQuestionStyle, elementWidth - padding * 2, ctx);
              calculatedQuestionHeight = questionLines.length * questionLineHeight + padding * 2;
            }
            
            // Calculate areas based on position
            if (questionPosition === 'left' || questionPosition === 'right') {
              const finalQuestionWidth = (elementWidth * questionWidth) / 100;
              const gap = blockQuestionAnswerGap;
              const answerWidth = elementWidth - finalQuestionWidth - padding * 2 - gap;
              
              if (questionPosition === 'left') {
                questionArea = { x: padding, y: padding, width: finalQuestionWidth, height: elementHeight - padding * 2 };
                answerArea = { x: finalQuestionWidth + padding + gap, y: padding, width: answerWidth, height: elementHeight - padding * 2 };
              } else {
                answerArea = { x: padding, y: padding, width: answerWidth, height: elementHeight - padding * 2 };
                questionArea = { x: answerWidth + padding + gap, y: padding, width: finalQuestionWidth, height: elementHeight - padding * 2 };
              }
            } else {
              const finalQuestionHeight = Math.max(calculatedQuestionHeight, effectiveQuestionStyle.fontSize + padding * 2);
              const gap = blockQuestionAnswerGap;
              const answerHeight = elementHeight - finalQuestionHeight - padding * 2 - gap;
              
              if (questionPosition === 'top') {
                questionArea = { x: padding, y: padding, width: elementWidth - padding * 2, height: finalQuestionHeight };
                answerArea = { x: padding, y: finalQuestionHeight + padding + gap, width: elementWidth - padding * 2, height: answerHeight };
              } else {
                answerArea = { x: padding, y: padding, width: elementWidth - padding * 2, height: answerHeight };
                questionArea = { x: padding, y: answerHeight + padding + gap, width: elementWidth - padding * 2, height: finalQuestionHeight };
              }
            }
            
            // Track line positions for ruled lines
            linePositions = [];
            
            // Render question text in question area (first, like in client)
            if (questionText) {
              const questionLines = wrapText(questionText, effectiveQuestionStyle, questionArea.width, ctx);
              let cursorY = questionArea.y;
              
              questionLines.forEach((line) => {
                if (line.text) {
                  const baselineY = cursorY + questionBaselineOffset;
                  // Use calculateTextX to respect text alignment
                  const textX = calculateTextX(line.text, effectiveQuestionStyle, questionArea.x, questionArea.width, ctx);
                  runs.push({
                    text: line.text,
                    x: textX,
                    y: baselineY,
                    style: effectiveQuestionStyle
                  });
                  // Track line position for ruled lines
                  if (ruledLinesTarget === 'question') {
                    linePositions.push({
                      y: baselineY + effectiveQuestionStyle.fontSize * 0.15,
                      lineHeight: questionLineHeight,
                      style: effectiveQuestionStyle
                    });
                  }
                } else {
                  // Track empty line position for ruled lines
                  if (ruledLinesTarget === 'question') {
                    const baselineY = cursorY + questionBaselineOffset;
                    linePositions.push({
                      y: baselineY + effectiveQuestionStyle.fontSize * 0.15,
                      lineHeight: questionLineHeight,
                      style: effectiveQuestionStyle
                    });
                  }
                }
                cursorY += questionLineHeight;
              });
            }
            
            // Render answer text in answer area (after question)
            if (answerContent) {
              const answerLines = wrapText(answerContent, answerStyle, answerArea.width, ctx);
              let cursorY = answerArea.y;
              
              answerLines.forEach((line) => {
                if (line.text) {
                  const baselineY = cursorY + answerBaselineOffset;
                  const textX = calculateTextX(line.text, answerStyle, answerArea.x, answerArea.width, ctx);
                  runs.push({
                    text: line.text,
                    x: textX,
                    y: baselineY,
                    style: answerStyle
                  });
                  // Track line position for ruled lines
                  if (ruledLinesTarget === 'answer') {
                    linePositions.push({
                      y: baselineY + answerStyle.fontSize * 0.15,
                      lineHeight: answerLineHeight,
                      style: answerStyle
                    });
                  }
                } else {
                  // Track empty line position for ruled lines
                  if (ruledLinesTarget === 'answer') {
                    const baselineY = cursorY + answerBaselineOffset;
                    linePositions.push({
                      y: baselineY + answerStyle.fontSize * 0.15,
                      lineHeight: answerLineHeight,
                      style: answerStyle
                    });
                  }
                }
                cursorY += answerLineHeight;
              });
            }
            
            contentHeight = elementHeight;
            
            // Collect ruled lines nodes for block layout (will be inserted after background)
            blockRuledLinesNodes = [];
            const ruledLines = (element as any).ruledLines ?? false;
            if (ruledLines && linePositions.length > 0) {
              const ruledLinesWidth = (element as any).ruledLinesWidth ?? 0.8;
              const ruledLinesTheme = (element as any).ruledLinesTheme || 'rough';
              const ruledLinesColor = (element as any).ruledLinesColor || '#1f2937';
              const ruledLinesOpacity = (element as any).ruledLinesOpacity ?? 1;
              const targetArea = ruledLinesTarget === 'question' ? questionArea : answerArea;
              
              linePositions.forEach((linePos) => {
                // Check if line is within the target area (vertically)
                if (linePos.y >= targetArea.y && linePos.y <= targetArea.y + targetArea.height) {
                  // Use the target area's x position and width, not the full width
                  // This ensures lines are only drawn within the question or answer block
                  const startX = elementX + targetArea.x;
                  const endX = elementX + targetArea.x + targetArea.width;
                  
                  // Generate ruled line
                  let lineNode: Konva.Path | Konva.Line | null = null;
                  if (ruledLinesTheme === 'rough' && (window as any).rough) {
                    try {
                      const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                      const rc = (window as any).rough.svg(svg);
                      
                      const roughLine = rc.line(startX, elementY + linePos.y, endX, elementY + linePos.y, {
                        roughness: 2,
                        strokeWidth: ruledLinesWidth,
                        stroke: ruledLinesColor,
                        seed: seed + linePos.y
                      });
                      
                      const paths = roughLine.querySelectorAll('path');
                      let combinedPath = '';
                      paths.forEach((path: SVGPathElement) => {
                        const d = path.getAttribute('d');
                        if (d) combinedPath += d + ' ';
                      });
                      
                      if (combinedPath) {
                        lineNode = new Konva.Path({
                          data: combinedPath.trim(),
                          stroke: ruledLinesColor,
                          strokeWidth: ruledLinesWidth,
                          opacity: ruledLinesOpacity * elementOpacity,
                          strokeScaleEnabled: true,
                          rotation: elementRotation,
                          listening: false,
                          visible: true
                        });
                      }
                    } catch (err) {
                      // Fallback to simple line if rough.js fails
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
                  } else {
                    // Default: simple line
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
            }
          } else {
            // Inline layout (existing logic)
            const availableWidth = Math.max(10, elementWidth - padding * 2);
            const questionLineHeight = getLineHeight(effectiveQuestionStyle);
            const answerLineHeight = getLineHeight(answerStyle);
            
            // Baseline offsets
            const questionBaselineOffset = effectiveQuestionStyle.fontSize * 0.8;
            const answerBaselineOffset = answerStyle.fontSize * 0.8;
            
            let cursorY = padding;
            const questionLines = wrapText(questionText || '', effectiveQuestionStyle, availableWidth, ctx);
            const linePositionsInline: Array<{ y: number; lineHeight: number; style: typeof questionStyle }> = [];
            
            questionLines.forEach((line) => {
              if (line.text) {
                const baselineY = cursorY + questionBaselineOffset;
                const textX = calculateTextX(line.text, effectiveQuestionStyle, padding, availableWidth, ctx);
                runs.push({
                  text: line.text,
                  x: textX,
                  y: baselineY,
                  style: effectiveQuestionStyle
                });
                // Track line position for ruled lines
                linePositionsInline.push({
                  y: baselineY + effectiveQuestionStyle.fontSize * 0.15,
                  lineHeight: questionLineHeight,
                  style: effectiveQuestionStyle
                });
              } else {
                // Track empty line position for ruled lines
                const baselineY = cursorY + questionBaselineOffset;
                linePositionsInline.push({
                  y: baselineY + effectiveQuestionStyle.fontSize * 0.15,
                  lineHeight: questionLineHeight,
                  style: effectiveQuestionStyle
                });
              }
              cursorY += questionLineHeight;
            });
            
            const lastQuestionLineWidth = questionLines.length ? questionLines[questionLines.length - 1].width : 0;
            const lastQuestionLineY = questionLines.length ? cursorY - questionLineHeight : padding;
            
            const answerLines = wrapText(answerContent, answerStyle, availableWidth, ctx);
            const inlineGap = Math.min(32, answerStyle.fontSize * 0.5);
            contentHeight = cursorY;
            
            let startAtSameLine = false;
            let remainingAnswerLines = answerLines;
            
            if (questionLines.length > 0 && answerLines.length > 0) {
              const inlineAvailable = availableWidth - lastQuestionLineWidth - inlineGap;
              const firstAnswerLineWidth = measureText(answerLines[0].text, answerStyle, ctx);
              // Allow answer to start on same line if there's enough space (with some tolerance)
              if (inlineAvailable >= firstAnswerLineWidth) {
                startAtSameLine = true;
                const baselineY = lastQuestionLineY + answerBaselineOffset;
                runs.push({
                  text: answerLines[0].text,
                  x: padding + lastQuestionLineWidth + inlineGap,
                  y: baselineY,
                  style: answerStyle
                });
                // Track line position for combined line
                linePositionsInline.push({
                  y: baselineY + answerStyle.fontSize * 0.15,
                  lineHeight: Math.max(questionLineHeight, answerLineHeight),
                  style: answerStyle
                });
                remainingAnswerLines = answerLines.slice(1);
              }
            }
            
            let answerCursorY = startAtSameLine ? cursorY : cursorY + (questionLines.length ? answerLineHeight * 0.2 : 0);
            
            remainingAnswerLines.forEach((line) => {
              if (line.text) {
                const baselineY = answerCursorY + answerBaselineOffset;
                const textX = calculateTextX(line.text, answerStyle, padding, availableWidth, ctx);
                runs.push({
                  text: line.text,
                  x: textX,
                  y: baselineY,
                  style: answerStyle
                });
                // Track line position for ruled lines
                linePositionsInline.push({
                  y: baselineY + answerStyle.fontSize * 0.15,
                  lineHeight: answerLineHeight,
                  style: answerStyle
                });
              } else {
                // Track empty line position for ruled lines
                const baselineY = answerCursorY + answerBaselineOffset;
                linePositionsInline.push({
                  y: baselineY + answerStyle.fontSize * 0.15,
                  lineHeight: answerLineHeight,
                  style: answerStyle
                });
              }
              answerCursorY += answerLineHeight;
            });
            
            contentHeight = Math.max(contentHeight, answerCursorY, elementHeight);
            
            // Store linePositions for ruled lines rendering
            const linePositions = linePositionsInline;
          }
          
          // Render background if enabled
          const showBackground = (element as any).backgroundEnabled && (element as any).backgroundColor;
          let bgRect: Konva.Rect | null = null;
          if (showBackground) {
            const backgroundColor = (element as any).backgroundColor || 'transparent';
            const backgroundOpacity = (element as any).backgroundOpacity !== undefined ? (element as any).backgroundOpacity : 1;
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
            layer.add(bgRect);
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
          if (ruledLines && linePositions && linePositions.length > 0 && layoutVariant !== 'block') {
            const ruledLinesWidth = (element as any).ruledLinesWidth ?? 0.8;
            const ruledLinesTheme = (element as any).ruledLinesTheme || 'rough';
            const ruledLinesColor = (element as any).ruledLinesColor || '#1f2937';
            const ruledLinesOpacity = (element as any).ruledLinesOpacity ?? 1;
            
            linePositions.forEach((linePos) => {
              // For inline layout, use full width with padding
              // Only generate lines that are within the box dimensions
              if (linePos.y < 0 || linePos.y > elementHeight) {
                return;
              }
              
              const startX = elementX + padding;
              const endX = elementX + elementWidth - padding;
              
              // Generate ruled line
              let lineNode: Konva.Path | Konva.Line | null = null;
              if (ruledLinesTheme === 'rough' && (window as any).rough) {
                try {
                  const seed = parseInt(element.id.replace(/[^0-9]/g, '').slice(0, 8), 10) || 1;
                  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                  const rc = (window as any).rough.svg(svg);
                  
                  const roughLine = rc.line(startX, elementY + linePos.y, endX, elementY + linePos.y, {
                    roughness: 2,
                    strokeWidth: ruledLinesWidth,
                    stroke: ruledLinesColor,
                    seed: seed + linePos.y
                  });
                  
                  const paths = roughLine.querySelectorAll('path');
                  let combinedPath = '';
                  paths.forEach((path: SVGPathElement) => {
                    const d = path.getAttribute('d');
                    if (d) combinedPath += d + ' ';
                  });
                  
                  if (combinedPath) {
                    lineNode = new Konva.Path({
                      data: combinedPath.trim(),
                      stroke: ruledLinesColor,
                      strokeWidth: ruledLinesWidth,
                      opacity: ruledLinesOpacity * elementOpacity,
                      strokeScaleEnabled: true,
                      rotation: elementRotation,
                      listening: false,
                      visible: true
                    });
                  }
                } catch (err) {
                  // Fallback to simple line if rough.js fails
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
              } else {
                // Default: simple line
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
            const borderColor = (element as any).borderColor || '#000000';
            const borderWidth = (element as any).borderWidth || 1;
            const borderOpacity = (element as any).borderOpacity !== undefined ? (element as any).borderOpacity : 1;
            const cornerRadius = (element as any).cornerRadius ?? qnaDefaults.cornerRadius ?? 0;
            
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
          
          // Render text runs using Konva.Text nodes (matching textbox-qna.tsx RichTextShape behavior)
          runs.forEach((run) => {
            const style = run.style;
            const fontFamily = (style.fontFamily || 'Arial, sans-serif').replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
            const fontStyle = style.fontItalic ? 'italic' : 'normal';
            const fontWeight = style.fontBold ? 'bold' : 'normal';
            
            // Build font string to ensure proper font loading
            const fontString = `${fontWeight} ${fontStyle} ${style.fontSize}px ${fontFamily}`;
            
            // Convert baseline Y position to top Y position for Konva.Text
            // Client uses textBaseline = 'alphabetic' with baseline Y position
            // Server uses verticalAlign = 'top', so we need to subtract baseline offset
            const baselineOffset = style.fontSize * 0.8;
            const topY = run.y - baselineOffset;
            
            const textNode = new Konva.Text({
              x: elementX + run.x,
              y: elementY + topY,
              text: run.text,
              fontSize: style.fontSize,
              fontFamily: fontFamily,
              fontStyle: fontStyle,
              fontWeight: fontWeight,
              fill: style.fontColor || '#000000',
              opacity: (style.fontOpacity !== undefined ? style.fontOpacity : 1) * elementOpacity,
              align: style.align || 'left',
              verticalAlign: 'top',
              rotation: elementRotation,
              listening: false,
              visible: true
            });
            
            // Set font explicitly using setAttr to ensure it's applied
            textNode.setAttr('font', fontString);
            
            layer.add(textNode);
          });
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
            const fontFamily = (textStyle.fontFamily || freeTextDefaults.fontFamily || 'Arial, sans-serif').replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
            const fontColor = textStyle.fontColor || '#000000';
            const fontOpacity = textStyle.fontOpacity ?? 1;
            const fontBold = textStyle.fontBold ?? false;
            const fontItalic = textStyle.fontItalic ?? false;
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
            let fontFamilyRaw = element.fontFamily || element.font?.fontFamily || 'Arial, sans-serif';
            const fontFamily = fontFamilyRaw.replace(/^['"]|['"]$/g, '').replace(/['"]/g, '');
            const fontWeight = element.fontWeight || element.font?.fontWeight || (element.font?.fontBold ? 'bold' : 'normal');
            const fontStyle = element.fontStyle || element.font?.fontStyle || (element.font?.fontItalic ? 'italic' : 'normal');
            
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
        // Render image elements
        else if (element.type === 'image' && element.src) {
          // Load image asynchronously
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const imageNode = new Konva.Image({
              x: elementX,
              y: elementY,
              image: img,
              width: elementWidth,
              height: elementHeight,
              rotation: elementRotation,
              opacity: elementOpacity,
              listening: false
            });
            layer.add(imageNode);
            layer.draw();
            stageRef.current?.draw();
          };
          img.onerror = () => {
            console.warn('[PDFRenderer] Failed to load image:', element.src);
          };
          img.src = element.src;
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
                shapeNode = new Konva.Circle({
                  x: elementX + elementWidth / 2,
                  y: elementY + elementHeight / 2,
                  radius: Math.min(elementWidth, elementHeight) / 2,
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
              shapeNode = new Konva.Circle({
                x: elementX + elementWidth / 2,
                y: elementY + elementHeight / 2,
                radius: Math.min(elementWidth, elementHeight) / 2,
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
