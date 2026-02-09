import { useState, useRef } from 'react';

export interface BrushStroke {
  points: number[];
  strokeColor: string;
  strokeWidth: number;
}

export function useCanvasDrawing() {
  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<number[]>([]);
  const [brushStrokes, setBrushStrokes] = useState<BrushStroke[]>([]);
  const [isBrushMode, setIsBrushMode] = useState(false);
  const isBrushModeRef = useRef(false);

  // Line drawing states
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [previewLine, setPreviewLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Shape drawing states
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [previewShape, setPreviewShape] = useState<{ x: number; y: number; width: number; height: number; type: string } | null>(null);

  // Text drawing states
  const [isDrawingTextbox, setIsDrawingTextbox] = useState(false);
  const [textboxStart, setTextboxStart] = useState<{ x: number; y: number } | null>(null);
  const [previewTextbox, setPreviewTextbox] = useState<{ x: number; y: number; width: number; height: number; type: string } | null>(null);

  // Modal states
  const [showImageModal, setShowImageModal] = useState(false);
  const [pendingImagePosition, setPendingImagePosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingImageElementId, setPendingImageElementId] = useState<string | null>(null);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [pendingStickerPosition, setPendingStickerPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingStickerElementId, setPendingStickerElementId] = useState<string | null>(null);
  const [showQrCodeModal, setShowQrCodeModal] = useState(false);
  const [pendingQrCodePosition, setPendingQrCodePosition] = useState<{ x: number; y: number } | null>(null);

  // Utility functions
  const clearDrawingStates = () => {
    setIsDrawing(false);
    setCurrentPath([]);
  };

  const clearLineStates = () => {
    setIsDrawingLine(false);
    setLineStart(null);
    setPreviewLine(null);
  };

  const clearShapeStates = () => {
    setIsDrawingShape(false);
    setShapeStart(null);
    setPreviewShape(null);
  };

  const clearTextboxStates = () => {
    setIsDrawingTextbox(false);
    setTextboxStart(null);
    setPreviewTextbox(null);
  };

  return {
    // Drawing states
    isDrawing,
    setIsDrawing,
    currentPath,
    setCurrentPath,
    brushStrokes,
    setBrushStrokes,
    isBrushMode,
    setIsBrushMode,
    isBrushModeRef,

    // Line states
    isDrawingLine,
    setIsDrawingLine,
    lineStart,
    setLineStart,
    previewLine,
    setPreviewLine,

    // Shape states
    isDrawingShape,
    setIsDrawingShape,
    shapeStart,
    setShapeStart,
    previewShape,
    setPreviewShape,

    // Textbox states
    isDrawingTextbox,
    setIsDrawingTextbox,
    textboxStart,
    setTextboxStart,
    previewTextbox,
    setPreviewTextbox,

    // Modal states
    showImageModal,
    setShowImageModal,
    pendingImagePosition,
    setPendingImagePosition,
    pendingImageElementId,
    setPendingImageElementId,
    showStickerModal,
    setShowStickerModal,
    pendingStickerPosition,
    setPendingStickerPosition,
    pendingStickerElementId,
    setPendingStickerElementId,
    showQrCodeModal,
    setShowQrCodeModal,
    pendingQrCodePosition,
    setPendingQrCodePosition,

    // Utility functions
    clearDrawingStates,
    clearLineStates,
    clearShapeStates,
    clearTextboxStates,
  };
}
