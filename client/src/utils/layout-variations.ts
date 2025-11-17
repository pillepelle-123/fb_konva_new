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

  // Berechne Position für Rotation um den Mittelpunkt
  // Konva rotiert standardmäßig um den oberen linken Punkt, aber wir wollen um den Mittelpunkt rotieren
  // Beim Spiegeln müssen wir X und Y anpassen, um die visuelle Position zu korrigieren
  const calculateMirroredPosition = (
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    pageWidth: number
  ): { x: number; y: number } => {
    if (!rotation || rotation === 0) {
      // Keine Rotation: nur X spiegeln
      const centerX = x + width / 2;
      const mirroredCenterX = pageWidth - centerX;
      return {
        x: mirroredCenterX - width / 2,
        y: y
      };
    }

    const rotationRad = (rotation * Math.PI) / 180;
    
    // Mittelpunkt des Original-Elements
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // Gespiegelter Mittelpunkt (X gespiegelt, Y bleibt gleich)
    // Berechne die Position des oberen linken Punkts bei gespiegelter Rotation (-r) um den gespiegelten Mittelpunkt
    // Relativer Vektor vom Mittelpunkt zum oberen linken Punkt: (-width/2, -height/2)
    // Nach Rotation -r:
    // x' = -width/2 * cos(-r) + height/2 * sin(-r)
    // y' = -width/2 * sin(-r) - height/2 * cos(-r)
    const mirroredCenterX = pageWidth - centerX;
    const mirroredCenterY = centerY;
    
    // Berechne die Position des oberen linken Punkts bei gespiegelter Rotation (-r) um den gespiegelten Mittelpunkt
    const mirroredRotationRad = -rotationRad;
    const mirroredTopLeftX = mirroredCenterX - (width / 2) * Math.cos(mirroredRotationRad) + (height / 2) * Math.sin(mirroredRotationRad);
    const mirroredTopLeftY = mirroredCenterY - (width / 2) * Math.sin(mirroredRotationRad) - (height / 2) * Math.cos(mirroredRotationRad);
    
    // Zusätzliche X- und Y-Korrekturen: Konva rotiert um den oberen linken Punkt, nicht um den Mittelpunkt
    // Wir müssen die Differenz zwischen Rotation um Mittelpunkt und Rotation um oberen linken Punkt ausgleichen
    
    // Berechne die Position des oberen linken Punkts bei Original-Rotation um den Original-Mittelpunkt
    const originalTopLeftX = centerX - (width / 2) * Math.cos(rotationRad) + (height / 2) * Math.sin(rotationRad);
    const originalTopLeftY = centerY - (width / 2) * Math.sin(rotationRad) - (height / 2) * Math.cos(rotationRad);
    
    // Die Differenz zwischen der tatsächlichen Position (x, y) und der berechneten Position bei Rotation um Mittelpunkt
    // gibt uns die Korrektur, die wir für die gespiegelte Position benötigen
    const xOffsetFromCenter = x - originalTopLeftX;
    const yOffsetFromCenter = y - originalTopLeftY;
    
    // Für die gespiegelte Position müssen wir diese Korrektur anwenden
    // Aber da wir spiegeln, müssen wir das Vorzeichen der X-Korrektur umkehren
    const xCorrection = -xOffsetFromCenter;
    const yCorrection = yOffsetFromCenter;
    
    // Die gespiegelte Position ist die Position des oberen linken Punkts bei gespiegelter Rotation + Korrektur
    return {
      x: mirroredTopLeftX + xCorrection,
      y: mirroredTopLeftY + yCorrection
    };
  };

  return elements.map((element) => {
    const width = element.width ?? 0;
    const height = element.height ?? 0;
    const rotation = element.rotation ?? 0;
    
    // Berechne gespiegelte Position basierend auf Rotation um den Mittelpunkt
    const mirroredPos = calculateMirroredPosition(
      element.x,
      element.y,
      width,
      height,
      rotation,
      pageWidth
    );

    const mirroredElement: CanvasElement = {
      ...element,
      x: mirroredPos.x,
      y: mirroredPos.y,
      // Negiere Rotation beim Spiegeln: rotation 5 wird zu -5
      rotation: rotation !== undefined && rotation !== null && rotation !== 0 ? -rotation : rotation
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

