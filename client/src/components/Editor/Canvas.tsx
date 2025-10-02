import { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Transformer, Line, Group } from 'react-konva';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { useEditor } from '../../context/EditorContext';
import type { CanvasElement } from '../../context/EditorContext';
import CustomTextbox from './CustomTextbox';
import RoughShape from './RoughShape';
import PhotoPlaceholder from './PhotoPlaceholder';
import RoughBrush from './RoughBrush';

function CanvasPageEditArea({ width, height, x = 0, y = 0 }: { width: number; height: number; x?: number; y?: number }) {
  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="white"
      stroke="#e5e7eb"
      strokeWidth={11}
    />
  );
}

function CanvasPageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      backgroundColor: 'hsl(var(--muted))',
      padding: '2rem'
    }}>
      {children}
    </div>
  );
}

const PAGE_DIMENSIONS = {
  A4: { width: 2480, height: 3508 },
  A5: { width: 1748, height: 2480 },
  A3: { width: 3508, height: 4961 },
  Letter: { width: 2550, height: 3300 },
  Square: { width: 2480, height: 2480 }
};

function CanvasElementComponent({ element, isMovingGroup, onDragStart, onDragEnd }: { 
  element: CanvasElement; 
  isMovingGroup: boolean;
  onDragStart: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}) {
  const { state, dispatch } = useEditor();
  const shapeRef = useRef<any>(null);
  const isSelected = state.selectedElementIds.includes(element.id);

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (state.activeTool === 'select') {
      if (e.evt.button === 0) {
        // Only handle left-click for selection
        dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] });
      } else if (e.evt.button === 2 && isSelected) {
        // Right-click on selected item - don't change selection
        return;
      }
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    dispatch({
      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
      payload: {
        id: element.id,
        updates: { x: e.target.x(), y: e.target.y() }
      }
    });
    onDragEnd(e);
  };

  if (element.type === 'text') {
    return (
      <CustomTextbox
        element={element}
        isSelected={isSelected}
        onSelect={() => dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] })}
        onDragEnd={handleDragEnd}
        scale={0.8}
        isMovingGroup={isMovingGroup}
      />
    );
  }

  if (element.type === 'placeholder' || element.type === 'image') {
    return (
      <PhotoPlaceholder
        element={element}
        isSelected={isSelected}
        onSelect={() => dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] })}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
        isMovingGroup={isMovingGroup}
      />
    );
  }

  if (element.type === 'roughPath') {
    return (
      <RoughBrush
        element={element}
        isSelected={isSelected}
        onSelect={() => dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] })}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
        isMovingGroup={isMovingGroup}
      />
    );
  }

  if (['line', 'circle', 'rect'].includes(element.type)) {
    return (
      <RoughShape
        element={element}
        isSelected={isSelected}
        onSelect={() => dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] })}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
        isMovingGroup={isMovingGroup}
      />
    );
  }

  return (
    <Rect
      ref={shapeRef}
      id={element.id}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      fill={element.fill}
      stroke={element.stroke}
      strokeWidth={isSelected ? 2 : 1}
      draggable={state.activeTool === 'select' && isSelected}
      onClick={handleClick}
      onTap={handleClick}
      onDragStart={onDragStart}
      onDragEnd={handleDragEnd}
    />
  );
}

export default function Canvas() {
  const { state, dispatch } = useEditor();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<number[]>([]);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  }>({ x: 0, y: 0, width: 0, height: 0, visible: false });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [isMovingGroup, setIsMovingGroup] = useState(false);
  const [groupMoveStart, setGroupMoveStart] = useState<{ x: number; y: number } | null>(null);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [zoom, setZoom] = useState(0.8);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [previewLine, setPreviewLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [previewShape, setPreviewShape] = useState<{ x: number; y: number; width: number; height: number; type: string } | null>(null);
  const [isDrawingTextbox, setIsDrawingTextbox] = useState(false);
  const [textboxStart, setTextboxStart] = useState<{ x: number; y: number } | null>(null);
  const [previewTextbox, setPreviewTextbox] = useState<{ x: number; y: number; width: number; height: number; type: string } | null>(null);

  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const pageSize = state.currentBook?.pageSize || 'A4';
  const orientation = state.currentBook?.orientation || 'portrait';
  
  const dimensions = PAGE_DIMENSIONS[pageSize as keyof typeof PAGE_DIMENSIONS];
  const canvasWidth = orientation === 'landscape' ? dimensions.height : dimensions.width;
  const canvasHeight = orientation === 'landscape' ? dimensions.width : dimensions.height;

  // Scale for display with zoom
  const scale = zoom;
  const displayWidth = canvasWidth * scale;
  const displayHeight = canvasHeight * scale;

  useEffect(() => {
    if (isDragging) return; // Don't update transformer during drag
    
    if (transformerRef.current && stageRef.current) {
      const transformer = transformerRef.current;
      const stage = stageRef.current;
      
      if (state.selectedElementIds.length > 0) {
        const selectedNodes = state.selectedElementIds.map(id => {
          let node = stage.findOne(`#${id}`);
          if (!node) {
            const allNodes = stage.find('*');
            node = allNodes.find(n => n.id() === id);
          }
          
          // For text elements, select the entire group
          if (node && node.getClassName() === 'Group') {
            const element = currentPage?.elements.find(el => el.id === id);
            if (element?.type === 'text') {
              return node; // Select the group itself for text elements
            }
          }
          
          return node;
        }).filter(Boolean);
        
        transformer.nodes(selectedNodes);
        transformer.getLayer()?.batchDraw();
      } else {
        transformer.nodes([]);
        transformer.getLayer()?.batchDraw();
      }
    }
  }, [state.selectedElementIds, isDragging]);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const currentTime = Date.now();
    const isDoubleClick = currentTime - lastClickTime < 300;
    setLastClickTime(currentTime);

    // Right-click drag for panning
    if (e.evt.button === 2) {
      setIsPanning(true);
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setPanStart({ x: pos.x - stagePos.x, y: pos.y - stagePos.y });
      }
      return;
    }

    // Only handle mouseDown for brush, select, and pan tools
    if (state.activeTool === 'pan') {
      setIsPanning(true);
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setPanStart({ x: pos.x - stagePos.x, y: pos.y - stagePos.y });
      }
    } else if (state.activeTool === 'brush') {
      setIsDrawing(true);
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom - pageOffsetX;
        const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
        setCurrentPath([x, y]);
      }
    } else if (state.activeTool === 'line') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom - pageOffsetX;
        const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
        const isBackgroundClick = e.target === e.target.getStage() || 
          (e.target.getClassName() === 'Rect' && !e.target.id());
        
        if (isBackgroundClick) {
          setIsDrawingLine(true);
          setLineStart({ x, y });
          setPreviewLine({ x1: x, y1: y, x2: x, y2: y });
        }
      }
    } else if (state.activeTool === 'rect' || state.activeTool === 'circle') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom - pageOffsetX;
        const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
        const isBackgroundClick = e.target === e.target.getStage() || 
          (e.target.getClassName() === 'Rect' && !e.target.id());
        
        if (isBackgroundClick) {
          setIsDrawingShape(true);
          setShapeStart({ x, y });
          setPreviewShape({ x, y, width: 0, height: 0, type: state.activeTool });
        }
      }
    } else if (state.activeTool === 'text' || state.activeTool === 'question' || state.activeTool === 'answer') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom - pageOffsetX;
        const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
        const isBackgroundClick = e.target === e.target.getStage() || 
          (e.target.getClassName() === 'Rect' && !e.target.id());
        
        if (isBackgroundClick) {
          setIsDrawingTextbox(true);
          setTextboxStart({ x, y });
          setPreviewTextbox({ x, y, width: 0, height: 0, type: state.activeTool });
        }
      }
    } else if (state.activeTool === 'select') {
      // Only handle background clicks for selection rectangle
      const isBackgroundClick = e.target === e.target.getStage() || 
        (e.target.getClassName() === 'Rect' && !e.target.id());
      
      if (!isBackgroundClick) return;
      
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      
      const x = (pos.x - stagePos.x) / zoom;
      const y = (pos.y - stagePos.y) / zoom;
      
      // Check if double-click is within selected elements bounds
      if (isDoubleClick && state.selectedElementIds.length > 0) {
        const isWithinSelection = isPointWithinSelectedElements(x, y);
        if (isWithinSelection) {
          setIsMovingGroup(true);
          setGroupMoveStart({ x, y });
          return;
        }
      }
      
      setIsSelecting(true);
      setSelectionStart({ x, y });
      setSelectionRect({ x, y, width: 0, height: 0, visible: true });
    } else {
      // Handle element creation for other tools
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      
      const x = (pos.x - stagePos.x) / zoom - pageOffsetX;
      const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
      
      // Check if clicked on background
      const isBackgroundClick = e.target === e.target.getStage() || 
        (e.target.getClassName() === 'Rect' && !e.target.id());
      
      if (isBackgroundClick) {
        let newElement: CanvasElement | null = null;
        
        if (state.activeTool === 'photo') {
          newElement = {
            id: uuidv4(),
            type: 'placeholder',
            x: x - 300,
            y: y - 200,
            width: 600,
            height: 400,
            fill: '#f3f4f6',
            stroke: '#d1d5db'
          };
        }
        
        if (newElement) {
          dispatch({ type: 'ADD_ELEMENT', payload: newElement });
          dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
        }
      }
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setStagePos({
          x: pos.x - panStart.x,
          y: pos.y - panStart.y
        });
      }
    } else if (isDrawing && state.activeTool === 'brush') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom - pageOffsetX;
        const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
        setCurrentPath(prev => [...prev, x, y]);
      }
    } else if (isDrawingLine && lineStart) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom - pageOffsetX;
        const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
        setPreviewLine({ x1: lineStart.x, y1: lineStart.y, x2: x, y2: y });
      }
    } else if (isDrawingShape && shapeStart) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom - pageOffsetX;
        const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
        const width = x - shapeStart.x;
        const height = y - shapeStart.y;
        setPreviewShape({ 
          x: Math.min(shapeStart.x, x), 
          y: Math.min(shapeStart.y, y), 
          width: Math.abs(width), 
          height: Math.abs(height), 
          type: previewShape?.type || 'rect' 
        });
      }
    } else if (isDrawingTextbox && textboxStart) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom - pageOffsetX;
        const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
        const width = x - textboxStart.x;
        const height = y - textboxStart.y;
        setPreviewTextbox({ 
          x: Math.min(textboxStart.x, x), 
          y: Math.min(textboxStart.y, y), 
          width: Math.abs(width), 
          height: Math.abs(height), 
          type: previewTextbox?.type || 'text' 
        });
      }
    } else if (isMovingGroup && groupMoveStart) {
      // Move entire selection
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom;
        const y = (pos.y - stagePos.y) / zoom;
        const deltaX = x - groupMoveStart.x;
        const deltaY = y - groupMoveStart.y;
        
        // Update all selected elements
        state.selectedElementIds.forEach(elementId => {
          const element = currentPage?.elements.find(el => el.id === elementId);
          if (element) {
            dispatch({
              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
              payload: {
                id: elementId,
                updates: {
                  x: element.x + deltaX,
                  y: element.y + deltaY
                }
              }
            });
          }
        });
        
        setGroupMoveStart({ x, y });
      }
    } else if (isSelecting && selectionStart) {
      // Update selection rectangle
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom;
        const y = (pos.y - stagePos.y) / zoom;
        const width = x - selectionStart.x;
        const height = y - selectionStart.y;
        
        const newRect = {
          x: width < 0 ? x : selectionStart.x,
          y: height < 0 ? y : selectionStart.y,
          width: Math.abs(width),
          height: Math.abs(height),
          visible: true
        };
        

        setSelectionRect(newRect);
      }
    }
  };

  const smoothPath = (points: number[]) => {
    if (points.length < 6) return points;
    
    let smoothed = [...points];
    
    // Apply multiple smoothing passes for more natural brush curves
    for (let pass = 0; pass < 5; pass++) {
      const newSmoothed: number[] = [];
      newSmoothed.push(smoothed[0], smoothed[1]); // Keep first point
      
      for (let i = 2; i < smoothed.length - 2; i += 2) {
        const x0 = smoothed[i - 2];
        const y0 = smoothed[i - 1];
        const x1 = smoothed[i];
        const y1 = smoothed[i + 1];
        const x2 = smoothed[i + 2];
        const y2 = smoothed[i + 3];
        
        // Enhanced smoothing with weighted averaging for natural brush feel
        const smoothX = (x0 + 6 * x1 + x2) / 8;
        const smoothY = (y0 + 6 * y1 + y2) / 8;
        
        newSmoothed.push(smoothX, smoothY);
      }
      
      newSmoothed.push(smoothed[smoothed.length - 2], smoothed[smoothed.length - 1]); // Keep last point
      smoothed = newSmoothed;
    }
    
    return smoothed;
  };

  /* Brush */
  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart({ x: 0, y: 0 });
    } else if (isDrawing && state.activeTool === 'brush' && currentPath.length > 2) {
      const smoothedPath = smoothPath(currentPath);
      // Points are already relative to Group position
      const adjustedPoints = smoothedPath;
      const newElement: CanvasElement = {
        id: uuidv4(),
        type: 'roughPath',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        points: adjustedPoints,
        stroke: '#1f2937',
        roughness: 1,
        strokeWidth: 3
      };
      dispatch({ type: 'ADD_ELEMENT', payload: newElement });
      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
    } else if (isDrawingLine && lineStart && previewLine) {
      const width = previewLine.x2 - previewLine.x1;
      const height = previewLine.y2 - previewLine.y1;
      
      if (Math.abs(width) > 5 || Math.abs(height) > 5) {
        const newElement: CanvasElement = {
          id: uuidv4(),
          type: 'line',
          x: previewLine.x1,
          y: previewLine.y1,
          width: width,
          height: height,
          stroke: '#1f2937',
          roughness: 3,
          strokeWidth: 2
        };
        dispatch({ type: 'ADD_ELEMENT', payload: newElement });
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      }
      setIsDrawingLine(false);
      setLineStart(null);
      setPreviewLine(null);
    } else if (isDrawingShape && shapeStart && previewShape) {
      if (previewShape.width > 5 || previewShape.height > 5) {
        const newElement: CanvasElement = {
          id: uuidv4(),
          type: previewShape.type as 'rect' | 'circle',
          x: previewShape.x,
          y: previewShape.y,
          width: previewShape.width,
          height: previewShape.height,
          fill: 'transparent',
          stroke: '#1f2937',
          roughness: 3,
          strokeWidth: 2
        };
        dispatch({ type: 'ADD_ELEMENT', payload: newElement });
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      }
      setIsDrawingShape(false);
      setShapeStart(null);
      setPreviewShape(null);
    } else if (isDrawingTextbox && textboxStart && previewTextbox) {
      if (previewTextbox.width > 50 || previewTextbox.height > 20) {
        let newElement: CanvasElement;
        
        if (previewTextbox.type === 'text') {
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: previewTextbox.height,
            fill: '#1f2937',
            text: '',
            fontSize: 64,
            lineHeight: 1.2,
            align: 'left',
            fontFamily: 'Arial, sans-serif',
            textType: 'regular'
          };
        } else if (previewTextbox.type === 'question') {
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: previewTextbox.height,
            text: '',
            fontSize: 64,
            lineHeight: 1.2,
            align: 'left',
            fontFamily: 'Arial, sans-serif',
            textType: 'question'
          };
        } else {
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: previewTextbox.height,
            text: '',
            fontSize: 64,
            lineHeight: 1.2,
            align: 'left',
            fontFamily: 'Arial, sans-serif',
            textType: 'answer'
          };
        }
        
        dispatch({ type: 'ADD_ELEMENT', payload: newElement });
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      }
      setIsDrawingTextbox(false);
      setTextboxStart(null);
      setPreviewTextbox(null);
    } else if (isMovingGroup) {
      setIsMovingGroup(false);
      setGroupMoveStart(null);
    } else if (isSelecting) {
      const selectedIds = getElementsInSelection();
      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: selectedIds });
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0, visible: false });
      setIsSelecting(false);
      setSelectionStart(null);
    }
    setIsDrawing(false);
    setCurrentPath([]);
  };

  const isPointWithinSelectedElements = (x: number, y: number) => {
    if (!currentPage || state.selectedElementIds.length === 0) return false;
    
    // For multi-selection, check if point is within transformer bounds
    if (state.selectedElementIds.length > 1 && transformerRef.current) {
      const transformer = transformerRef.current;
      const box = transformer.getClientRect();
      // Convert transformer bounds to page coordinates
      const pageX = (box.x - stagePos.x) / zoom - pageOffsetX;
      const pageY = (box.y - stagePos.y) / zoom - pageOffsetY;
      const pageWidth = box.width / zoom;
      const pageHeight = box.height / zoom;
      return (
        x >= pageX &&
        x <= pageX + pageWidth &&
        y >= pageY &&
        y <= pageY + pageHeight
      );
    }
    
    // For single selection, use transformer bounds if available
    if (transformerRef.current && transformerRef.current.nodes().length > 0) {
      const transformer = transformerRef.current;
      const box = transformer.getClientRect();
      const pageX = (box.x - stagePos.x) / zoom - pageOffsetX;
      const pageY = (box.y - stagePos.y) / zoom - pageOffsetY;
      const pageWidth = box.width / zoom;
      const pageHeight = box.height / zoom;
      return (
        x >= pageX &&
        x <= pageX + pageWidth &&
        y >= pageY &&
        y <= pageY + pageHeight
      );
    }
    
    return false;
  };

  const getElementsInSelection = () => {
    if (!currentPage || selectionRect.width < 5 || selectionRect.height < 5) {
      return [];
    }
    
    const selectedIds: string[] = [];
    
    // Adjust selection rectangle for page offset
    const adjustedSelectionRect = {
      x: selectionRect.x - pageOffsetX,
      y: selectionRect.y - pageOffsetY,
      width: selectionRect.width,
      height: selectionRect.height
    };
    
    currentPage.elements.forEach(element => {
      // Check if element intersects with selection rectangle
      const elementBounds = {
        x: element.x,
        y: element.y,
        width: element.width || 100,
        height: element.height || 100
      };
      
      // Calculate bounds for ALL toolbar element types
      if (element.type === 'roughPath' && element.points) {
        // Brush strokes - calculate from points
        let minX = element.points[0], maxX = element.points[0];
        let minY = element.points[1], maxY = element.points[1];
        
        for (let i = 2; i < element.points.length; i += 2) {
          minX = Math.min(minX, element.points[i]);
          maxX = Math.max(maxX, element.points[i]);
          minY = Math.min(minY, element.points[i + 1]);
          maxY = Math.max(maxY, element.points[i + 1]);
        }
        
        elementBounds.x = element.x + minX - 10;
        elementBounds.y = element.y + minY - 10;
        elementBounds.width = maxX - minX + 20;
        elementBounds.height = maxY - minY + 20;
      } else if (element.type === 'text') {
        // Text, Question, Answer textboxes
        elementBounds.width = element.width || 150;
        elementBounds.height = element.height || 50;
      } else if (element.type === 'placeholder' || element.type === 'image') {
        // Photo placeholders and uploaded images
        elementBounds.width = element.width || 150;
        elementBounds.height = element.height || 100;
      } else if (element.type === 'line') {
        // Line shapes
        elementBounds.width = element.width || 100;
        elementBounds.height = element.height || 10;
      } else if (element.type === 'circle') {
        // Circle shapes
        elementBounds.width = element.width || 80;
        elementBounds.height = element.height || 80;
      } else if (element.type === 'rect') {
        // Rectangle shapes
        elementBounds.width = element.width || 100;
        elementBounds.height = element.height || 50;
      } else {
        // Fallback for any other element types
        elementBounds.width = element.width || 100;
        elementBounds.height = element.height || 100;
      }
      
      const intersects = (
        adjustedSelectionRect.x < elementBounds.x + elementBounds.width &&
        adjustedSelectionRect.x + adjustedSelectionRect.width > elementBounds.x &&
        adjustedSelectionRect.y < elementBounds.y + elementBounds.height &&
        adjustedSelectionRect.y + adjustedSelectionRect.height > elementBounds.y
      );
      
      if (intersects) {
        selectedIds.push(element.id);
      }
    });
    

    return selectedIds;
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    
    const x = (pos.x - stagePos.x) / zoom - pageOffsetX;
    const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
    
    // Check if right-click is on selected elements
    if (state.selectedElementIds.length > 0 && isPointWithinSelectedElements(x, y)) {
      // Use page coordinates for proper positioning
      setContextMenu({ x: e.evt.pageX, y: e.evt.pageY, visible: true });
    } else {
      setContextMenu({ x: 0, y: 0, visible: false });
    }
  };

  const handleDuplicateItems = () => {
    if (!currentPage) return;
    
    state.selectedElementIds.forEach(elementId => {
      const element = currentPage.elements.find(el => el.id === elementId);
      if (element) {
        const duplicatedElement = {
          ...element,
          id: uuidv4(),
          x: element.x + 20,
          y: element.y + 20
        };
        dispatch({ type: 'ADD_ELEMENT', payload: duplicatedElement });
      }
    });
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handleDeleteItems = () => {
    state.selectedElementIds.forEach(elementId => {
      dispatch({ type: 'DELETE_ELEMENT', payload: elementId });
    });
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    if (e.evt.ctrlKey) {
      // Zoom with Ctrl + mousewheel
      const stage = stageRef.current;
      if (!stage) return;
      
      const scaleBy = 1.1;
      const oldScale = zoom;
      const pointer = stage.getPointerPosition();
      
      if (!pointer) return;
      
      const mousePointTo = {
        x: (pointer.x - stagePos.x) / oldScale,
        y: (pointer.y - stagePos.y) / oldScale,
      };
      
      const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
      const clampedScale = Math.max(0.1, Math.min(3, newScale));
      
      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      };
      
      setZoom(clampedScale);
      setStagePos(newPos);
    } else {
      // Pan with two-finger touchpad (mousewheel without Ctrl)
      setStagePos({
        x: stagePos.x - e.evt.deltaX,
        y: stagePos.y - e.evt.deltaY
      });
    }
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Hide context menu on left click only
    if (e.evt.button !== 2) {
      setContextMenu({ x: 0, y: 0, visible: false });
    }
    
    // Don't clear selection if we just completed a selection rectangle
    if (isSelecting) return;
    
    // Don't clear selection on right-click
    if (e.evt.button === 2) return;
    
    // Only handle select tool clicks here
    if (state.activeTool === 'select') {
      const isBackgroundClick = e.target === e.target.getStage() || 
        (e.target.getClassName() === 'Rect' && !e.target.id());
      
      if (isBackgroundClick) {
        dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
      }
    }
  };

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    
    const handleClickOutside = () => {
      setContextMenu({ x: 0, y: 0, visible: false });
    };
    
    const handlePageChange = (event: CustomEvent) => {
      dispatch({ type: 'SET_ACTIVE_PAGE', payload: event.detail });
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('changePage', handlePageChange as EventListener);
    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('changePage', handlePageChange as EventListener);
    };
  }, []);

  // Expose stage reference for PDF export
  useEffect(() => {
    if (stageRef.current) {
      (window as any).konvaStage = stageRef.current;
    }
  }, [stageRef.current]);

  const containerPadding = 40;
  const availableWidth = containerSize.width - containerPadding * 2;
  const availableHeight = containerSize.height - containerPadding * 2;
  
  const pageAspectRatio = canvasWidth / canvasHeight;
  const containerAspectRatio = availableWidth / availableHeight;
  
  let pageDisplayWidth, pageDisplayHeight, pageOffsetX, pageOffsetY;
  
  if (pageAspectRatio > containerAspectRatio) {
    pageDisplayWidth = availableWidth;
    pageDisplayHeight = availableWidth / pageAspectRatio;
    pageOffsetX = containerPadding;
    pageOffsetY = containerPadding + (availableHeight - pageDisplayHeight) / 2;
  } else {
    pageDisplayWidth = availableHeight * pageAspectRatio;
    pageDisplayHeight = availableHeight;
    pageOffsetX = containerPadding + (availableWidth - pageDisplayWidth) / 2;
    pageOffsetY = containerPadding;
  }
  
  const pageScale = pageDisplayWidth / canvasWidth;

  // Auto-fit function to show entire CanvasPageEditArea
  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // Calculate zoom to fit the entire page with some padding
    const padding = 40;
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;
    
    const scaleX = availableWidth / canvasWidth;
    const scaleY = availableHeight / canvasHeight;
    const optimalZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
    
    // Center the page in the container
    const scaledPageWidth = canvasWidth * optimalZoom;
    const scaledPageHeight = canvasHeight * optimalZoom;
    
    const centerX = (containerWidth - scaledPageWidth) / 2;
    const centerY = (containerHeight - scaledPageHeight) / 2;
    
    setZoom(optimalZoom);
    setStagePos({ x: centerX, y: centerY });
  }, [canvasWidth, canvasHeight]);

  // Auto-fit when entering the canvas editor or when container size changes
  useEffect(() => {
    fitToView();
  }, [fitToView, containerSize]);

  return (
    <CanvasPageContainer>
      <div 
        ref={containerRef}
        data-page-id={currentPage?.id}
        style={{
          backgroundColor: 'white',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          borderRadius: '14px',
          padding: '.5rem',
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F9FAFB',
        }}>
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          scaleX={zoom}
          scaleY={zoom}
          onClick={handleStageClick}
          onTap={handleStageClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          onContextMenu={handleContextMenu}
          onWheel={handleWheel}
          x={stagePos.x}
          y={stagePos.y}
          style={{ 
            cursor: state.activeTool === 'pan' ? 'grab' : 'default',
            backgroundColor: '#F9FAFB' 
          }}
        >
          <Layer>
            {/* Page boundary */}
            <CanvasPageEditArea width={canvasWidth} height={canvasHeight} x={pageOffsetX} y={pageOffsetY} />
            
            {/* Canvas elements */}
            <Group x={pageOffsetX} y={pageOffsetY}>
              {currentPage?.elements.map(element => (
                <CanvasElementComponent
                  key={element.id}
                  element={element}
                  isMovingGroup={isMovingGroup}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={() => setTimeout(() => setIsDragging(false), 10)}
                />
              ))}
              
              {/* Brush preview line */}
              {isDrawing && currentPath.length > 2 && (
                <Line
                  points={currentPath}
                  stroke="#1f2937"
                  strokeWidth={2}
                  lineCap="round"
                  lineJoin="round"
                  listening={false}
                  opacity={0.7}
                  dash={[18, 18]}
                />
              )}
              
              {/* Line preview */}
              {previewLine && (
                <Line
                  points={[previewLine.x1, previewLine.y1, previewLine.x2, previewLine.y2]}
                  stroke="#1f2937"
                  strokeWidth={2}
                  lineCap="round"
                  listening={false}
                  opacity={0.7}
                  dash={[18, 18]}
                />
              )}
              
              {/* Shape preview */}
              {previewShape && (
                previewShape.type === 'rect' ? (
                  <Rect
                    x={previewShape.x}
                    y={previewShape.y}
                    width={previewShape.width}
                    height={previewShape.height}
                    stroke="#1f2937"
                    strokeWidth={2}
                    fill="transparent"
                    listening={false}
                    opacity={0.7}
                    dash={[18, 18]}
                  />
                ) : (
                  <Circle
                    x={previewShape.x + previewShape.width / 2}
                    y={previewShape.y + previewShape.height / 2}
                    radius={Math.min(previewShape.width, previewShape.height) / 2}
                    stroke="#1f2937"
                    strokeWidth={2}
                    fill="transparent"
                    listening={false}
                    opacity={0.7}
                    dash={[18, 18]}
                  />
                )
              )}
              
              {/* Textbox preview */}
              {previewTextbox && (
                <Rect
                  x={previewTextbox.x}
                  y={previewTextbox.y}
                  width={previewTextbox.width}
                  height={previewTextbox.height}
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="rgba(37, 99, 235, 0.1)"
                  listening={false}
                  opacity={0.7}
                  dash={[18, 18]}
                />
              )}
            </Group>
            
            {/* Selection rectangle */}
            {selectionRect.visible && (
              <Rect
                x={selectionRect.x}
                y={selectionRect.y}
                width={selectionRect.width}
                height={selectionRect.height}
                fill="rgba(37, 99, 235, 0.1)"
                stroke="#2563eb"
                strokeWidth={1}
                dash={[5, 5]}
                listening={false}
              />
            )}
            
            {/* Transformer for selected elements */}
            <Transformer
              ref={transformerRef}
              keepRatio={false}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'middle-left', 'middle-right', 'bottom-center']}
              boundBoxFunc={(oldBox, newBox) => {
                // Limit resize
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
              onDragEnd={(e) => {
                // Update positions after drag
                const nodes = transformerRef.current?.nodes() || [];
                nodes.forEach(node => {
                  const elementId = node.id();
                  if (elementId) {
                    dispatch({
                      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                      payload: {
                        id: elementId,
                        updates: { x: node.x(), y: node.y() }
                      }
                    });
                  }
                });
              }}
              onTransformEnd={(e) => {
                const node = e.target;
                const elementId = node.id();
                
                const element = currentPage?.elements.find(el => el.id === elementId);
                if (element) {
                  const updates: any = {};
                  
                  // For text elements, convert scale to width/height changes
                  if (element.type === 'text') {
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    
                    // Calculate new dimensions
                    updates.width = Math.max(50, (element.width || 150) * scaleX);
                    updates.height = Math.max(20, (element.height || 50) * scaleY);
                    
                    // For position, use node position directly
                    updates.x = node.x();
                    updates.y = node.y();
                    
                    updates.rotation = node.rotation();
                    
                    // Reset scale to 1 for text elements
                    node.scaleX(1);
                    node.scaleY(1);
                  } else {
                    // For other elements, keep scale behavior
                    updates.x = node.x();
                    updates.y = node.y();
                    updates.scaleX = node.scaleX();
                    updates.scaleY = node.scaleY();
                    updates.rotation = node.rotation();
                  }
                  
                  dispatch({
                    type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                    payload: {
                      id: element.id,
                      updates
                    }
                  });
                }
              }}
            />
          </Layer>
        </Stage>
        
        {/* Context Menu */}
        {contextMenu.visible && (
          <div
            style={{
              position: 'absolute',
              left: contextMenu.x,
              top: contextMenu.y,
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              minWidth: '120px'
            }}
          >
            <button
              onClick={handleDuplicateItems}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Duplicate {state.selectedElementIds.length > 1 ? 'Items' : 'Item'}
            </button>
            <button
              onClick={handleDeleteItems}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#dc2626'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Delete {state.selectedElementIds.length > 1 ? 'Items' : 'Item'}
            </button>
          </div>
        )}
      </div>
    </CanvasPageContainer>
  );
}