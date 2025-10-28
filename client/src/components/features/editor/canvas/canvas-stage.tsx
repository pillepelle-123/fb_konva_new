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
  children
}, ref) => {
  return (
    <Stage
      ref={ref}
      width={width}
      height={height}
      scaleX={zoom}
      scaleY={zoom}
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
        cursor: activeTool === 'pan' ? 'grab' : (activeTool === 'select' ? 'default' : (activeTool === 'pipette' ? 'crosshair' : 'crosshair')),
        backgroundColor: '#F9FAFB' 
      }}
    >
      {children}
    </Stage>
  );
});

CanvasStage.displayName = 'CanvasStage';

export { CanvasStage };