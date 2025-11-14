import Konva from 'konva';
import type { Page, Book, CanvasElement } from '../context/editor-context';
import { resolveBackgroundImageUrl } from './background-image-utils';

interface GeneratePagePreviewOptions {
  page: Page;
  book: Book;
  previewWidth?: number;
  previewHeight?: number;
}

const PAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  A3: { width: 3508, height: 4961 },
  A4: { width: 2480, height: 3508 },
  A5: { width: 1748, height: 2480 },
  Letter: { width: 2550, height: 3300 },
  Square: { width: 2480, height: 2480 },
};

const PLACEHOLDER_FILL = '#e5e7eb';
const PLACEHOLDER_STROKE = '#9ca3af';

function getPageDimensions(pageSize: string, orientation: string): { width: number; height: number } {
  const dimensions = PAGE_DIMENSIONS[pageSize as keyof typeof PAGE_DIMENSIONS] || PAGE_DIMENSIONS.A4;
  if (orientation === 'landscape') {
    return { width: dimensions.height, height: dimensions.width };
  }
  return dimensions;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function drawBackground(layer: Konva.Layer, page: Page, book: Book, pageWidth: number, pageHeight: number) {
  const background = page.background;
  const backgroundTransform = page.backgroundTransform;
  const transformScale = backgroundTransform?.scale ?? 1;
  const transformOffsetX = (backgroundTransform?.offsetRatioX ?? 0) * pageWidth;
  const transformOffsetY = (backgroundTransform?.offsetRatioY ?? 0) * pageHeight;
  const mirrorBackground = Boolean(backgroundTransform?.mirror);
  if (!background) {
    layer.add(new Konva.Rect({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      fill: '#ffffff',
      listening: false,
    }));
    return;
  }

  if (background.type === 'color') {
    layer.add(new Konva.Rect({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      fill: background.value,
      opacity: background.opacity ?? 1,
      listening: false,
    }));
    return;
  }

  if (background.type === 'pattern') {
    const fillColor = background.patternForegroundColor || '#ffffff';
    const patternColor = background.patternBackgroundColor || '#d1d5db';

    layer.add(new Konva.Rect({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      fill: fillColor,
      opacity: background.opacity ?? 1,
      listening: false,
    }));

    const patternLayer = new Konva.Rect({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      fill: patternColor,
      opacity: background.patternBackgroundOpacity ?? 0.3,
      listening: false,
    });
    layer.add(patternLayer);
    return;
  }

  if (background.type === 'image') {
    const imageUrl = resolveBackgroundImageUrl(background);
    if (imageUrl) {
      return loadImage(imageUrl)
        .then((image) => {
          const bg = new Konva.Image({
            image,
            x: transformOffsetX,
            y: transformOffsetY,
            width: pageWidth,
            height: pageHeight,
            opacity: background.opacity ?? 1,
            listening: false,
            scaleX: mirrorBackground ? -transformScale : transformScale,
            scaleY: transformScale,
          });
          if (mirrorBackground) {
            bg.offsetX(pageWidth);
          }
          layer.add(bg);
        })
        .catch(() => {
          layer.add(new Konva.Rect({
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight,
            fill: '#ffffff',
            opacity: background.opacity ?? 1,
            listening: false,
          }));
        });
    }
  }

  layer.add(new Konva.Rect({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    fill: '#ffffff',
    opacity: background.opacity ?? 1,
    listening: false,
  }));
  return;
}

function drawShape(layer: Konva.Layer, element: CanvasElement) {
  switch (element.type) {
    case 'rect':
    case 'placeholder':
      layer.add(new Konva.Rect({
        x: element.x || 0,
        y: element.y || 0,
        width: element.width || 100,
        height: element.height || 100,
        fill: element.fill || PLACEHOLDER_FILL,
        stroke: element.stroke || PLACEHOLDER_STROKE,
        strokeWidth: element.strokeWidth || 2,
        rotation: element.rotation || 0,
        listening: false,
      }));
      break;
    case 'circle': {
      const radius = Math.min(element.width || 80, element.height || 80) / 2;
      layer.add(new Konva.Circle({
        x: (element.x || 0) + radius,
        y: (element.y || 0) + radius,
        radius,
        fill: element.fill || PLACEHOLDER_FILL,
        stroke: element.stroke || PLACEHOLDER_STROKE,
        strokeWidth: element.strokeWidth || 2,
        listening: false,
      }));
      break;
    }
    case 'line': {
      const points = element.points || [0, 0, (element.width || 100), 0];
      layer.add(new Konva.Line({
        x: element.x || 0,
        y: element.y || 0,
        points,
        stroke: element.stroke || '#111827',
        strokeWidth: element.strokeWidth || 2,
        listening: false,
      }));
      break;
    }
    default:
      layer.add(new Konva.Rect({
        x: element.x || 0,
        y: element.y || 0,
        width: element.width || 80,
        height: element.height || 80,
        fill: element.fill || PLACEHOLDER_FILL,
        stroke: element.stroke || PLACEHOLDER_STROKE,
        strokeWidth: element.strokeWidth || 1,
        rotation: element.rotation || 0,
        listening: false,
      }));
      break;
  }
}

function drawText(layer: Konva.Layer, element: CanvasElement) {
  const text = 'text' in element && element.text ? element.text : element.textPlaceholder ?? '';
  const textNode = new Konva.Text({
    x: element.x || 0,
    y: element.y || 0,
    width: element.width || undefined,
    height: element.height || undefined,
    text,
    fontSize: element.fontSize || 24,
    fontFamily: element.fontFamily || 'Inter, Arial, sans-serif',
    fill: element.fontColor || '#1f2937',
    align: element.align || 'left',
    listening: false,
  });
  layer.add(textNode);
}

function drawElement(layer: Konva.Layer, element: CanvasElement) {
  if (element.textType === 'qna_inline' || element.type === 'qna_inline') {
    drawQnaInlinePreview(layer, element);
    return;
  }

  switch (element.type) {
    case 'text':
    case 'question':
    case 'answer':
    case 'qna_inline':
    case 'free_text':
      drawText(layer, element);
      break;
    case 'image':
      layer.add(new Konva.Rect({
        x: element.x || 0,
        y: element.y || 0,
        width: element.width || 150,
        height: element.height || 120,
        fill: element.fill || PLACEHOLDER_FILL,
        stroke: element.stroke || PLACEHOLDER_STROKE,
        strokeWidth: element.strokeWidth || 2,
        listening: false,
      }));
      break;
    default:
      drawShape(layer, element);
      break;
  }
}

function drawQnaInlinePreview(layer: Konva.Layer, element: CanvasElement) {
  const x = element.x ?? 0;
  const y = element.y ?? 0;
  const width = Math.max(40, element.width ?? 200);
  const height = Math.max(40, element.height ?? 140);
  const padding = Math.max(4, Math.min(width, height) * 0.06);

  const baseFill = element.fill || 'rgba(191, 219, 254, 0.6)';
  const borderColor = element.stroke || 'rgba(59, 130, 246, 0.8)';

  const container = new Konva.Rect({
    x,
    y,
    width,
    height,
    fill: baseFill,
    stroke: borderColor,
    strokeWidth: element.strokeWidth ?? 2,
    cornerRadius: element.cornerRadius ?? 8,
    listening: false,
  });
  layer.add(container);

  const questionPosition = element.questionPosition || 'left';
  const questionWidthPercent = element.questionWidth ?? 35;
  const layoutVariant = element.layoutVariant || 'inline';

  let questionRect: { x: number; y: number; width: number; height: number } = {
    x: x + padding,
    y: y + padding,
    width: width * 0.35,
    height: height - padding * 2,
  };
  let answerRect: { x: number; y: number; width: number; height: number } = {
    x: x + padding * 1.5 + questionRect.width,
    y: y + padding,
    width: width - questionRect.width - padding * 2.5,
    height: height - padding * 2,
  };

  if (layoutVariant === 'block' || questionPosition === 'top' || questionPosition === 'bottom') {
    const questionHeight = Math.max(40, height * 0.28);
    if (questionPosition === 'bottom') {
      questionRect = {
        x: x + padding,
        y: y + height - questionHeight - padding,
        width: width - padding * 2,
        height: questionHeight,
      };
      answerRect = {
        x: x + padding,
        y: y + padding,
        width: width - padding * 2,
        height: height - questionHeight - padding * 2,
      };
    } else {
      // top
      questionRect = {
        x: x + padding,
        y: y + padding,
        width: width - padding * 2,
        height: questionHeight,
      };
      answerRect = {
        x: x + padding,
        y: y + padding + questionHeight + padding * 0.5,
        width: width - padding * 2,
        height: height - questionHeight - padding * 2.5,
      };
    }
  } else if (questionPosition === 'right') {
    const questionWidth = Math.max(40, (width * questionWidthPercent) / 100);
    questionRect = {
      x: x + width - questionWidth - padding,
      y: y + padding,
      width: questionWidth,
      height: height - padding * 2,
    };
    answerRect = {
      x: x + padding,
      y: y + padding,
      width: width - questionWidth - padding * 2,
      height: height - padding * 2,
    };
  } else {
    const questionWidth = Math.max(40, (width * questionWidthPercent) / 100);
    questionRect = {
      x: x + padding,
      y: y + padding,
      width: questionWidth,
      height: height - padding * 2,
    };
    answerRect = {
      x: questionRect.x + questionRect.width + padding * 0.5,
      y: y + padding,
      width: width - questionRect.width - padding * 1.5,
      height: height - padding * 2,
    };
  }

  const questionFill = element.questionSettings?.backgroundColor || 'rgba(59, 130, 246, 0.25)';
  const answerFill = element.answerSettings?.backgroundColor || 'rgba(16, 185, 129, 0.18)';

  layer.add(new Konva.Rect({
    ...questionRect,
    cornerRadius: 6,
    fill: questionFill,
    stroke: 'rgba(59, 130, 246, 0.35)',
    strokeWidth: 1,
    listening: false,
  }));

  layer.add(new Konva.Rect({
    ...answerRect,
    cornerRadius: 6,
    fill: answerFill,
    stroke: 'rgba(16, 185, 129, 0.3)',
    strokeWidth: 1,
    listening: false,
  }));

  // Add guidelines/ruled lines for answer area
  const lineColor = element.answerSettings?.ruledLines?.lineColor || 'rgba(59, 130, 246, 0.35)';
  const lineCount = Math.max(2, Math.floor((answerRect.height - padding) / Math.max(18, (answerRect.height - padding) / 5)));
  const step = (answerRect.height - padding) / (lineCount + 1);
  for (let i = 1; i <= lineCount; i++) {
    const lineY = answerRect.y + i * step;
    layer.add(new Konva.Line({
      points: [answerRect.x + padding * 0.5, lineY, answerRect.x + answerRect.width - padding * 0.5, lineY],
      stroke: lineColor,
      strokeWidth: 1,
      listening: false,
    }));
  }

  // Question label
  const questionLabel = new Konva.Text({
    text: 'Q',
    x: questionRect.x,
    y: questionRect.y,
    width: questionRect.width,
    height: questionRect.height,
    fontSize: Math.min(questionRect.width, questionRect.height) * 0.4,
    fontFamily: element.questionSettings?.fontFamily || 'Inter, Arial, sans-serif',
    fontStyle: 'bold',
    fill: element.questionSettings?.fontColor || '#1f2937',
    align: 'center',
    verticalAlign: 'middle',
    listening: false,
  });
  layer.add(questionLabel);

  const answerLabel = new Konva.Text({
    text: 'A',
    x: answerRect.x,
    y: answerRect.y,
    width: Math.min(answerRect.width, 60),
    height: Math.min(answerRect.height, 60),
    fontSize: Math.min(answerRect.width, answerRect.height) * 0.25,
    fontFamily: element.answerSettings?.fontFamily || 'Inter, Arial, sans-serif',
    fill: element.answerSettings?.fontColor || '#1f2937',
    align: 'left',
    listening: false,
  });
  layer.add(answerLabel);
}

export async function generatePagePreview({
  page,
  book,
  previewWidth = 200,
  previewHeight = 280,
}: GeneratePagePreviewOptions): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const { width: pageWidth, height: pageHeight } = getPageDimensions(book.pageSize || 'A4', book.orientation || 'portrait');
  const widthScale = previewWidth / pageWidth;
  const heightScale = previewHeight / pageHeight;
  const scale = Math.min(widthScale, heightScale, 1);
  const outputWidth = Math.max(1, Math.round(pageWidth * scale));
  const outputHeight = Math.max(1, Math.round(pageHeight * scale));
  const pixelRatio = Math.max(0.1, outputWidth / pageWidth);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.pointerEvents = 'none';
  container.style.opacity = '0';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${pageWidth}px`;
  container.style.height = `${pageHeight}px`;
  document.body.appendChild(container);

  const stage = new Konva.Stage({
    container,
    width: pageWidth,
    height: pageHeight,
    listening: false,
  });

  const layer = new Konva.Layer({ listening: false });
  stage.add(layer);

  const backgroundPromise = drawBackground(layer, page, book, pageWidth, pageHeight);
  if (backgroundPromise instanceof Promise) {
    await backgroundPromise.catch(() => undefined);
  }

  page.elements.forEach((element) => {
    if (element.type === 'qna_inline') {
      drawQnaInlinePreview(layer, element);
    } else {
      drawElement(layer, element);
    }
  });

  layer.draw();

  const previousScale = stage.scaleX();
  if (scale !== 1) {
    stage.scale({ x: scale, y: scale });
    stage.draw();
  }

  let dataUrl: string | null = null;
  try {
    dataUrl = stage.toDataURL({
      width: outputWidth,
      height: outputHeight,
      pixelRatio,
    });
  } catch (error) {
    console.error('Failed to generate page preview:', error);
  } finally {
    if (scale !== 1 && previousScale !== undefined) {
      stage.scale({ x: previousScale, y: previousScale });
    }
    stage.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  return dataUrl;
}
