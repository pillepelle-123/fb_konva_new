import { forwardRef } from 'react';
import { Stage } from 'react-konva';
import Konva from 'konva';

interface CanvasStageProps {
  width: number;
  height: number;
  zoom: number;
  stagePos: { x: number; y: number };
  activeTool: string;
  pixelRatio?: number; // Adaptive pixel ratio for performance optimization
  onClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseMove?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseUp?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  onWheel?: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  interactive?: boolean; // If false, disables all interactions (for PDF export)
}

const CanvasStage = forwardRef<Konva.Stage, CanvasStageProps>(({
  width,
  height,
  zoom,
  stagePos,
  activeTool,
  pixelRatio = 1,
  onClick,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onContextMenu,
  onWheel,
  children,
  style,
  interactive = true // Default to interactive mode
}, ref) => {
  // Guard: Konva Stage wirft Fehler bei width/height <= 0 oder NaN
  const isValidSize = typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0 && !Number.isNaN(width) && !Number.isNaN(height);
  if (!isValidSize) {
    return (
      <div style={{ width: Math.max(1, width || 1), height: Math.max(1, height || 1), display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <span className="text-muted-foreground text-sm">Canvas wird geladen…</span>
      </div>
    );
  }

  // Use provided cursor style if available, otherwise use default logic
  const defaultCursor = interactive 
    ? (activeTool === 'pan' ? 'grab' : (activeTool === 'select' ? 'default' : (activeTool === 'pipette' ? 'crosshair' : 'crosshair')))
    : 'default';
  const cursor = style?.cursor || defaultCursor;
  
  return (
    <Stage
      ref={ref}
      width={width}
      height={height}
      scaleX={zoom}
      scaleY={zoom}
      pixelRatio={pixelRatio}
      onClick={interactive ? onClick : undefined}
      onTap={interactive ? onClick : undefined}
      onMouseDown={interactive ? onMouseDown : undefined}
      onMouseMove={interactive ? onMouseMove : undefined}
      onMouseUp={interactive ? onMouseUp : undefined}
      onTouchStart={interactive ? onMouseDown : undefined}
      onTouchMove={interactive ? onMouseMove : undefined}
      onTouchEnd={interactive ? onMouseUp : undefined}
      onContextMenu={interactive ? onContextMenu : undefined}
      onWheel={interactive ? onWheel : undefined}
      x={stagePos.x}
      y={stagePos.y}
      style={{ 
        cursor,
        backgroundColor: '#F9FAFB',
        ...style
      }}
    >
      {children}
    </Stage>
  );
});

CanvasStage.displayName = 'CanvasStage';

export { CanvasStage };