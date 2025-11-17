import { forwardRef } from 'react';
import { Stage } from 'react-konva';
import Konva from 'konva';

interface CanvasStageProps {
  width: number;
  height: number;
  zoom: number;
  stagePos: { x: number; y: number };
  activeTool: string;
  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseUp: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onContextMenu: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const CanvasStage = forwardRef<Konva.Stage, CanvasStageProps>(({
  width,
  height,
  zoom,
  stagePos,
  activeTool,
  onClick,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onContextMenu,
  onWheel,
  children,
  style
}, ref) => {
  // Use provided cursor style if available, otherwise use default logic
  const defaultCursor = activeTool === 'pan' ? 'grab' : (activeTool === 'select' ? 'default' : (activeTool === 'pipette' ? 'crosshair' : 'crosshair'));
  const cursor = style?.cursor || defaultCursor;
  
  return (
    <Stage
      ref={ref}
      width={width}
      height={height}
      scaleX={zoom}
      scaleY={zoom}
      pixelRatio={1}
      onClick={onClick}
      onTap={onClick}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onTouchStart={onMouseDown}
      onTouchMove={onMouseMove}
      onTouchEnd={onMouseUp}
      onContextMenu={onContextMenu}
      onWheel={onWheel}
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