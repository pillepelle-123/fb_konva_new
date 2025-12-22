import { useState } from 'react';
import { useZoom } from '../zoom-context';

export function useCanvasZoomPan() {
  // Use ZoomContext for zoom state management
  const { zoom, setZoom: setZoomFromContext, registerSetZoom } = useZoom();

  // Stage position for panning
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // Panning states
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hasPanned, setHasPanned] = useState(false);

  // Zoom states
  const [hasManualZoom, setHasManualZoom] = useState(false);

  // Mouse position tracking
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Utility functions
  const startPanning = (pos: { x: number; y: number }) => {
    setIsPanning(true);
    setHasPanned(false);
    setPanStart({ x: pos.x - stagePos.x, y: pos.y - stagePos.y });
  };

  const stopPanning = () => {
    setIsPanning(false);
    setPanStart({ x: 0, y: 0 });
  };

  const updateStagePosition = (newPos: { x: number; y: number }) => {
    setStagePos(newPos);
  };

  const setZoom = (newZoom: number, pointer?: { x: number; y: number }) => {
    setZoomFromContext(newZoom, pointer);
    setHasManualZoom(true);
  };

  return {
    // Zoom state from context
    zoom,
    setZoom,
    registerSetZoom,

    // Stage position
    stagePos,
    setStagePos,

    // Panning states
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    hasPanned,
    setHasPanned,

    // Zoom states
    hasManualZoom,
    setHasManualZoom,

    // Mouse position
    lastMousePos,
    setLastMousePos,

    // Utility functions
    startPanning,
    stopPanning,
    updateStagePosition,
  };
}
