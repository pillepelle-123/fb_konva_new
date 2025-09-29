import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Transformer, Line } from 'react-konva';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { useEditor } from '../../context/EditorContext';
import type { CanvasElement } from '../../context/EditorContext';
import CustomTextbox from './CustomTextbox';
import RoughShape from './RoughShape';
import PhotoPlaceholder from './PhotoPlaceholder';
import RoughBrush from './RoughBrush';

const PAGE_DIMENSIONS = {
  A4: { width: 595, height: 842 },
  A5: { width: 420, height: 595 },
  A3: { width: 842, height: 1191 },
  Letter: { width: 612, height: 792 },
  Square: { width: 600, height: 600 }
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

  const handleClick = () => {
    if (state.activeTool === 'select') {
      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] });
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
        onDragStart={onDragStart}
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

  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const pageSize = state.currentBook?.pageSize || 'A4';
  const orientation = state.currentBook?.orientation || 'portrait';
  
  const dimensions = PAGE_DIMENSIONS[pageSize as keyof typeof PAGE_DIMENSIONS];
  const canvasWidth = orientation === 'landscape' ? dimensions.height : dimensions.width;
  const canvasHeight = orientation === 'landscape' ? dimensions.width : dimensions.height;

  // Scale down for display
  const scale = 0.8;
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

    // Only handle mouseDown for brush and select tools
    if (state.activeTool === 'brush') {
      setIsDrawing(true);
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = pos.x / scale;
        const y = pos.y / scale;
        setCurrentPath([x, y]);
      }
    } else if (state.activeTool === 'select') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      
      const x = pos.x / scale;
      const y = pos.y / scale;
      
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
      
      const x = pos.x / scale;
      const y = pos.y / scale;
      
      // Check if clicked on background
      const isBackgroundClick = e.target === e.target.getStage() || 
        (e.target.getClassName() === 'Rect' && !e.target.id());
      
      if (isBackgroundClick) {
        let newElement: CanvasElement | null = null;
        
        if (state.activeTool === 'rect') {
          newElement = {
            id: uuidv4(),
            type: 'rect',
            x: x - 50,
            y: y - 25,
            width: 100,
            height: 50,
            fill: 'transparent',
            stroke: '#1f2937',
            roughness: 1,
            strokeWidth: 2
          };
        } else if (state.activeTool === 'circle') {
          newElement = {
            id: uuidv4(),
            type: 'circle',
            x: x - 40,
            y: y - 40,
            width: 80,
            height: 80,
            fill: 'transparent',
            stroke: '#1f2937',
            roughness: 1,
            strokeWidth: 2
          };
        } else if (state.activeTool === 'line') {
          newElement = {
            id: uuidv4(),
            type: 'line',
            x: x - 50,
            y: y - 5,
            width: 100,
            height: 10,
            stroke: '#1f2937',
            roughness: 1,
            strokeWidth: 2
          };
        } else if (state.activeTool === 'photo') {
          newElement = {
            id: uuidv4(),
            type: 'placeholder',
            x: x - 75,
            y: y - 50,
            width: 150,
            height: 100,
            fill: '#f3f4f6',
            stroke: '#d1d5db'
          };
        } else if (state.activeTool === 'text') {
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: x - 75,
            y: y - 25,
            width: 150,
            height: 50,
            fill: '#1f2937',
            text: '',
            fontSize: 16,
            lineHeight: 1.2,
            align: 'left',
            fontFamily: 'Arial, sans-serif',
            textType: 'regular'
          };
        } else if (state.activeTool === 'question') {
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: x - 100,
            y: y - 30,
            width: 200,
            height: 60,
            fill: '#7c2d12',
            text: '',
            fontSize: 16,
            lineHeight: 1.2,
            align: 'left',
            fontFamily: 'Arial, sans-serif',
            textType: 'question'
          };
        } else if (state.activeTool === 'answer') {
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: x - 100,
            y: y - 30,
            width: 200,
            height: 60,
            fill: '#1e40af',
            text: '',
            fontSize: 16,
            lineHeight: 1.2,
            align: 'left',
            fontFamily: 'Arial, sans-serif',
            textType: 'answer'
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
    if (isDrawing && state.activeTool === 'brush') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = pos.x / scale;
        const y = pos.y / scale;
        setCurrentPath(prev => [...prev, x, y]);
      }
    } else if (isMovingGroup && groupMoveStart) {
      // Move entire selection
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = pos.x / scale;
        const y = pos.y / scale;
        const deltaX = x - groupMoveStart.x;
        const deltaY = y - groupMoveStart.y;
        
        // Update all selected elements
        state.selectedElementIds.forEach(elementId => {
          const element = currentPage?.elements.find(el => el.id === elementId);
          if (element) {
            dispatch({
              type: 'UPDATE_ELEMENT',
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
        const x = pos.x / scale;
        const y = pos.y / scale;
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
    
    // Apply multiple smoothing passes for better curves
    for (let pass = 0; pass < 3; pass++) {
      const newSmoothed: number[] = [];
      newSmoothed.push(smoothed[0], smoothed[1]); // Keep first point
      
      for (let i = 2; i < smoothed.length - 2; i += 2) {
        const x0 = smoothed[i - 2];
        const y0 = smoothed[i - 1];
        const x1 = smoothed[i];
        const y1 = smoothed[i + 1];
        const x2 = smoothed[i + 2];
        const y2 = smoothed[i + 3];
        
        // Stronger smoothing with more weight on neighbors
        const smoothX = (x0 + 4 * x1 + x2) / 6;
        const smoothY = (y0 + 4 * y1 + y2) / 6;
        
        newSmoothed.push(smoothX, smoothY);
      }
      
      newSmoothed.push(smoothed[smoothed.length - 2], smoothed[smoothed.length - 1]); // Keep last point
      smoothed = newSmoothed;
    }
    
    return smoothed;
  };

  const handleMouseUp = () => {
    if (isDrawing && state.activeTool === 'brush' && currentPath.length > 2) {
      const smoothedPath = smoothPath(currentPath);
      const newElement: CanvasElement = {
        id: uuidv4(),
        type: 'roughPath',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        points: smoothedPath,
        stroke: '#1f2937',
        roughness: 1,
        strokeWidth: 2
      };
      dispatch({ type: 'ADD_ELEMENT', payload: newElement });
      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
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
    
    return state.selectedElementIds.some(elementId => {
      const element = currentPage.elements.find(el => el.id === elementId);
      if (!element) return false;
      
      const scaleX = element.scaleX || 1;
      const scaleY = element.scaleY || 1;
      
      const bounds = {
        x: element.x,
        y: element.y,
        width: (element.width || 100) * scaleX,
        height: (element.height || 100) * scaleY
      };
      
      // Calculate bounds for different element types
      if (element.type === 'roughPath' && element.points) {
        let minX = element.points[0], maxX = element.points[0];
        let minY = element.points[1], maxY = element.points[1];
        
        for (let i = 2; i < element.points.length; i += 2) {
          minX = Math.min(minX, element.points[i]);
          maxX = Math.max(maxX, element.points[i]);
          minY = Math.min(minY, element.points[i + 1]);
          maxY = Math.max(maxY, element.points[i + 1]);
        }
        
        bounds.x = minX - 10;
        bounds.y = minY - 10;
        bounds.width = (maxX - minX + 20) * scaleX;
        bounds.height = (maxY - minY + 20) * scaleY;
      } else if (element.type === 'text') {
        bounds.width = (element.width || 150) * scaleX;
        bounds.height = (element.height || 50) * scaleY;
      } else if (element.type === 'placeholder' || element.type === 'image') {
        bounds.width = (element.width || 150) * scaleX;
        bounds.height = (element.height || 100) * scaleY;
      }
      
      return (
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      );
    });
  };

  const getElementsInSelection = () => {
    if (!currentPage || selectionRect.width < 5 || selectionRect.height < 5) {
      return [];
    }
    
    const selectedIds: string[] = [];
    
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
        
        elementBounds.x = minX - 10;
        elementBounds.y = minY - 10;
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
        selectionRect.x < elementBounds.x + elementBounds.width &&
        selectionRect.x + selectionRect.width > elementBounds.x &&
        selectionRect.y < elementBounds.y + elementBounds.height &&
        selectionRect.y + selectionRect.height > elementBounds.y
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
    
    const x = pos.x / scale;
    const y = pos.y / scale;
    
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

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Hide context menu on any click
    setContextMenu({ x: 0, y: 0, visible: false });
    
    // Don't clear selection if we just completed a selection rectangle
    if (isSelecting) return;
    
    // Only handle select tool clicks here
    if (state.activeTool === 'select') {
      const isBackgroundClick = e.target === e.target.getStage() || 
        (e.target.getClassName() === 'Rect' && !e.target.id());
      
      if (isBackgroundClick) {
        dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '600px',
      backgroundColor: '#f9fafb',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        padding: '1rem'
      }}>
        <Stage
          ref={stageRef}
          width={displayWidth}
          height={displayHeight}
          scaleX={scale}
          scaleY={scale}
          onClick={handleStageClick}
          onTap={handleStageClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
        >
          <Layer>
            {/* Page boundary */}
            <Rect
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              fill="white"
              stroke="#e5e7eb"
              strokeWidth={2}
            />
            
            {/* Canvas elements */}
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
              />
            )}
            
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
              boundBoxFunc={(oldBox, newBox) => {
                // Limit resize
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox;
                }
                return newBox;
              }}
              onTransformEnd={(e) => {
                const node = e.target;
                const element = currentPage?.elements.find(el => el.id === node.id());
                if (element) {
                  dispatch({
                    type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                    payload: {
                      id: element.id,
                      updates: {
                        x: node.x(),
                        y: node.y(),
                        scaleX: node.scaleX(),
                        scaleY: node.scaleY(),
                        rotation: node.rotation()
                      }
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
    </div>
  );
}