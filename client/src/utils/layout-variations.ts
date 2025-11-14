import type { CanvasElement } from '../context/editor-context';

export type LayoutVariation = 'normal' | 'mirrored' | 'randomized';

export interface RandomLayoutOptions {
  seed: number;
  pageWidth: number;
  pageHeight: number;
  maxOffsetRatio?: number;
  maxScaleDelta?: number;
  enableRotation?: boolean;
}

export function createSeededRNG(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export function applyMirroredLayout(elements: CanvasElement[], pageWidth: number): CanvasElement[] {
  if (!pageWidth) return elements.map((element) => ({ ...element }));

  return elements.map((element) => {
    const width = element.width ?? 0;
    const mirroredX = pageWidth - (element.x + width);

    const mirroredElement: CanvasElement = {
      ...element,
      x: mirroredX
    };

    if ('textAlign' in mirroredElement && mirroredElement.textAlign) {
      mirroredElement.textAlign =
        mirroredElement.textAlign === 'left'
          ? 'right'
          : mirroredElement.textAlign === 'right'
            ? 'left'
            : mirroredElement.textAlign;
    }

    return mirroredElement;
  });
}

export function applyRandomLayout(elements: CanvasElement[], options: RandomLayoutOptions): CanvasElement[] {
  const rng = createSeededRNG(options.seed);
  const maxOffsetRatio = options.maxOffsetRatio ?? 0.08;
  const maxScaleDelta = options.maxScaleDelta ?? 0.12;
  const enableRotation = options.enableRotation ?? true;

  return elements.map((element, index) => {
    const offsetMultiplier = 1 + (rng() - 0.5) * 0.3; // Add slight variance per element
    const offsetX = (rng() - 0.5) * options.pageWidth * maxOffsetRatio * offsetMultiplier;
    const offsetY = (rng() - 0.5) * options.pageHeight * maxOffsetRatio * offsetMultiplier;

    const scaleJitter = 1 + (rng() - 0.5) * maxScaleDelta;
    const rotationJitter = enableRotation ? (rng() - 0.5) * 6 : 0;

    const newWidth =
      typeof element.width === 'number' ? Math.max(40, element.width * scaleJitter) : element.width;
    const newHeight =
      typeof element.height === 'number' ? Math.max(40, element.height * scaleJitter) : element.height;
    const maxX = typeof newWidth === 'number' ? Math.max(0, options.pageWidth - newWidth) : options.pageWidth;
    const maxY =
      typeof newHeight === 'number' ? Math.max(0, options.pageHeight - newHeight) : options.pageHeight;

    const randomizedElement: CanvasElement = {
      ...element,
      x: Math.max(0, Math.min(maxX, element.x + offsetX)),
      y: Math.max(0, Math.min(maxY, element.y + offsetY)),
      width: newWidth,
      height: newHeight,
      rotation: element.rotation ? element.rotation + rotationJitter : rotationJitter
    };

    // Provide deterministic jiggle for inline Q&A pairs by linking question/answer indexes
    if (element.questionElementId || element.textType === 'question' || element.textType === 'answer') {
      randomizedElement.rotation = element.rotation ?? 0;
    }

    // Slight random opacity variations for shapes to avoid uniform look
    if (typeof element.opacity === 'number') {
      randomizedElement.opacity = Math.min(1, Math.max(0.7, element.opacity + (rng() - 0.5) * 0.1));
    }

    return randomizedElement;
  });
}

