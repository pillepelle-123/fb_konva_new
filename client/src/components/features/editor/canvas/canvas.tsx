import { useRef, useEffect, useState, useCallback } from 'react';
import { Layer, Rect, Group, Text } from 'react-konva';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import type { CanvasElement } from '../../../../context/editor-context';
import CanvasItemComponent from '../canvas-items';
import { CanvasStage } from './canvas-stage';
import { CanvasTransformer } from './canvas-transformer';
import { SelectionRectangle } from './selection-rectangle';
import { PreviewLine, PreviewShape, PreviewTextbox, PreviewBrush } from './preview-elements';
import { CanvasContainer } from './canvas-container';
import ContextMenu from '../../../ui/overlays/context-menu';
import { Modal } from '../../../ui/overlays/modal';
import { Dialog, DialogContent } from '../../../ui/overlays/dialog';
import ImagesContent from '../../images/images-content';
import QuestionsManagerContent from '../../questions/questions-manager-content';
import TextEditorModal from '../text-editor-modal';

import { PATTERNS, createPatternDataUrl } from '../../../../utils/patterns';
import type { PageBackground } from '../../../../context/editor-context';

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

const createPatternTile = (pattern: any, color: string, size: number, strokeWidth: number = 1): HTMLCanvasElement => {
  const tileSize = 20 * size;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  
  if (pattern.id === 'dots') {
    ctx.beginPath();
    ctx.arc(tileSize/2, tileSize/2, tileSize * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (pattern.id === 'grid') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tileSize, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, tileSize);
    ctx.stroke();
  } else if (pattern.id === 'diagonal') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, tileSize);
    ctx.lineTo(tileSize, 0);
    ctx.stroke();
  } else if (pattern.id === 'cross') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, tileSize);
    ctx.lineTo(tileSize, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(tileSize, tileSize);
    ctx.stroke();
  } else if (pattern.id === 'waves') {
    ctx.lineWidth = strokeWidth * 2;
    ctx.beginPath();
    ctx.moveTo(0, tileSize/2);
    ctx.quadraticCurveTo(tileSize/4, 0, tileSize/2, tileSize/2);
    ctx.quadraticCurveTo(3*tileSize/4, tileSize, tileSize, tileSize/2);
    ctx.stroke();
  } else if (pattern.id === 'hexagon') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    const centerX = tileSize/2;
    const centerY = tileSize/2;
    const radius = tileSize * 0.3;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  
  return canvas;
};



export default function Canvas() {
  const { state, dispatch } = useEditor();
  const { token, user } = useAuth();
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

  const [zoom, setZoom] = useState(0.8);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hasPanned, setHasPanned] = useState(false);
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [previewLine, setPreviewLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [previewShape, setPreviewShape] = useState<{ x: number; y: number; width: number; height: number; type: string } | null>(null);
  const [isDrawingTextbox, setIsDrawingTextbox] = useState(false);
  const [textboxStart, setTextboxStart] = useState<{ x: number; y: number } | null>(null);
  const [previewTextbox, setPreviewTextbox] = useState<{ x: number; y: number; width: number; height: number; type: string } | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [pendingImagePosition, setPendingImagePosition] = useState<{ x: number; y: number } | null>(null);
  const [editingElement, setEditingElement] = useState<CanvasElement | null>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  
  // Prevent authors from opening question dialog
  useEffect(() => {
    if (showQuestionDialog && user?.role === 'author') {
      console.log('Canvas: Author detected, closing question dialog');
      setShowQuestionDialog(false);
      setSelectedQuestionElementId(null);
    }
  }, [showQuestionDialog, user]);
  const [selectedQuestionElementId, setSelectedQuestionElementId] = useState<string | null>(null);
  const [selectionModeState, setSelectionModeState] = useState<Map<string, number>>(new Map());
  const editingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [clipboard, setClipboard] = useState<CanvasElement[]>([]);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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
        }).filter(node => node && node.getStage());
        
        transformer.nodes(selectedNodes);
        transformer.moveToTop();
        transformer.getLayer()?.batchDraw();
      } else {
        transformer.nodes([]);
        transformer.getLayer()?.batchDraw();
      }
    }
  }, [state.selectedElementIds, isDragging, currentPage]);
  
  // Force transformer update when element dimensions change
  useEffect(() => {
    if (transformerRef.current && state.selectedElementIds.length > 0) {
      const transformer = transformerRef.current;
      setTimeout(() => {
        transformer.forceUpdate();
        transformer.getLayer()?.batchDraw();
      }, 10);
    }
  }, [currentPage?.elements.map(el => `${el.id}-${el.width}-${el.height}`).join(',')]);

  // Reset selection mode state when no elements are selected
  useEffect(() => {
    if (state.selectedElementIds.length === 0) {
      setSelectionModeState(new Map());
    }
  }, [state.selectedElementIds.length]);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const currentTime = Date.now();
    const isDoubleClick = currentTime - lastClickTime < 300;
    setLastClickTime(currentTime);

    // Right-click drag for panning
    if (e.evt.button === 2) {
      setIsPanning(true);
      setHasPanned(false);
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
    } else if (['rect', 'circle', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(state.activeTool)) {
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
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      
      const x = (pos.x - stagePos.x) / zoom;
      const y = (pos.y - stagePos.y) / zoom;
      
      // Check if clicking on background (stage or page boundary)
      const isBackgroundClick = e.target === e.target.getStage() || 
        (e.target.getClassName() === 'Rect' && !e.target.id());
      
      if (isBackgroundClick) {
        // Check if double-click is within selected elements bounds
        if (isDoubleClick && state.selectedElementIds.length > 0) {
          const isWithinSelection = isPointWithinSelectedElements(x, y);
          if (isWithinSelection) {
            // Don't start group move if clicking on a text element - let it handle double-click
            const clickedElement = currentPage?.elements.find(el => {
              return state.selectedElementIds.includes(el.id) && 
                     x >= el.x && x <= el.x + (el.width || 100) &&
                     y >= el.y && y <= el.y + (el.height || 100);
            });
            
            if (clickedElement?.type !== 'text') {
              setIsMovingGroup(true);
              setGroupMoveStart({ x, y });
            }
            return;
          }
        }
        
        // Start selection rectangle for background clicks
        setIsSelecting(true);
        setSelectionStart({ x, y });
        setSelectionRect({ x, y, width: 0, height: 0, visible: true });
      }
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
        
        if (state.activeTool === 'image') {
          setPendingImagePosition({ x: x - 300, y: y - 200 });
          setShowImageModal(true);
          return;
        }
        
        if (newElement) {
          dispatch({ type: 'ADD_ELEMENT', payload: newElement });
          dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
        }
      }
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Track mouse position for paste functionality
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) {
      setLastMousePos({ x: pos.x, y: pos.y });
    }
    if (isPanning) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setHasPanned(true);
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
      const brushSettings = state.toolSettings.brush || {};
      // Points are already relative to Group position
      const adjustedPoints = smoothedPath;
      const newElement: CanvasElement = {
        id: uuidv4(),
        type: 'brush',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        points: adjustedPoints,
        stroke: brushSettings.stroke || '#1f2937',
        roughness: 1,
        strokeWidth: brushSettings.strokeWidth || 3,
        theme: brushSettings.theme || 'rough'
      };
      dispatch({ type: 'ADD_ELEMENT', payload: newElement });
      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
    } else if (isDrawingLine && lineStart && previewLine) {
      const width = previewLine.x2 - previewLine.x1;
      const height = previewLine.y2 - previewLine.y1;
      
      if (Math.abs(width) > 5 || Math.abs(height) > 5) {
        const lineSettings = state.toolSettings.line || {};
        const newElement: CanvasElement = {
          id: uuidv4(),
          type: 'line',
          x: previewLine.x1,
          y: previewLine.y1,
          width: width,
          height: height,
          stroke: lineSettings.stroke || '#1f2937',
          roughness: 3,
          strokeWidth: lineSettings.strokeWidth || 2,
          theme: lineSettings.theme || 'rough'
        };
        dispatch({ type: 'ADD_ELEMENT', payload: newElement });
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      }
      setIsDrawingLine(false);
      setLineStart(null);
      setPreviewLine(null);
    } else if (isDrawingShape && shapeStart && previewShape) {
      if (previewShape.width > 5 || previewShape.height > 5) {
        const shapeSettings = state.toolSettings[previewShape.type] || {};
        const newElement: CanvasElement = {
          id: uuidv4(),
          type: previewShape.type as any,
          x: previewShape.x,
          y: previewShape.y,
          width: previewShape.width,
          height: previewShape.height,
          fill: shapeSettings.fill || 'transparent',
          stroke: shapeSettings.stroke || '#1f2937',
          roughness: 3,
          strokeWidth: shapeSettings.strokeWidth || 2,
          cornerRadius: shapeSettings.cornerRadius || 0,
          theme: shapeSettings.theme || 'rough'
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
          const textSettings = state.toolSettings.text || {};
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: previewTextbox.height,
            fill: textSettings.fill || '#1f2937',
            text: '',
            fontSize: textSettings.fontSize || 64,
            align: textSettings.align || 'left',
            fontFamily: textSettings.fontFamily || 'Arial, sans-serif',
            textType: 'text',
            paragraphSpacing: textSettings.paragraphSpacing || 'medium',
            cornerRadius: textSettings.cornerRadius || 0
          };
        } else if (previewTextbox.type === 'question') {
          const questionSettings = state.toolSettings.question || {};
          const questionHeight = Math.max(40, previewTextbox.height * 0.3);
          const answerHeight = previewTextbox.height - questionHeight - 10;
          
          // Create question text element (non-editable)
          const questionElement: CanvasElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: questionHeight,
            text: '',
            fontSize: questionSettings.fontSize || 64,
            align: questionSettings.align || 'left',
            fontFamily: questionSettings.fontFamily || 'Arial, sans-serif',
            textType: 'question',
            fill: '#9ca3af',
            cornerRadius: questionSettings.cornerRadius || 0
          };
          
          // Create answer textbox (editable)
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y + questionHeight + 10,
            width: previewTextbox.width,
            height: answerHeight,
            text: '',
            fontSize: questionSettings.fontSize || 64,
            align: questionSettings.align || 'left',
            fontFamily: questionSettings.fontFamily || 'Arial, sans-serif',
            textType: 'answer',
            questionElementId: questionElement.id,
            paragraphSpacing: questionSettings.paragraphSpacing || 'medium',
            cornerRadius: questionSettings.cornerRadius || 0
          };
          
          // Add question element first
          dispatch({ type: 'ADD_ELEMENT', payload: questionElement });
        } else {
          const answerSettings = state.toolSettings.answer || {};
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: previewTextbox.height,
            text: '',
            fontSize: answerSettings.fontSize || 64,
            align: answerSettings.align || 'left',
            fontFamily: answerSettings.fontFamily || 'Arial, sans-serif',
            textType: 'answer',
            paragraphSpacing: answerSettings.paragraphSpacing || 'medium',
            cornerRadius: answerSettings.cornerRadius || 0
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
      if (element.type === 'brush' && element.points) {
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
        // Image placeholders and uploaded images
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

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    
    // Don't show context menu if we just finished panning
    if (hasPanned) {
      setHasPanned(false);
      return;
    }
    
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    
    setContextMenu({ x: e.evt.pageX, y: e.evt.pageY, visible: true });
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

  const handleCopyItems = () => {
    if (!currentPage) return;
    
    const copiedElements = state.selectedElementIds.map(elementId => {
      const element = currentPage.elements.find(el => el.id === elementId);
      return element;
    }).filter(Boolean) as CanvasElement[];
    
    setClipboard(copiedElements);
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handlePasteItems = () => {
    if (clipboard.length === 0) return;
    
    const x = (lastMousePos.x - stagePos.x) / zoom - pageOffsetX;
    const y = (lastMousePos.y - stagePos.y) / zoom - pageOffsetY;
    
    clipboard.forEach((element, index) => {
      const pastedElement = {
        ...element,
        id: uuidv4(),
        x: x + (index * 20),
        y: y + (index * 20)
      };
      dispatch({ type: 'ADD_ELEMENT', payload: pastedElement });
    });
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handleMoveToFront = () => {
    if (state.selectedElementIds.length === 0) return;
    state.selectedElementIds.forEach(elementId => {
      dispatch({ type: 'MOVE_ELEMENT_TO_FRONT', payload: elementId });
    });
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handleMoveToBack = () => {
    if (state.selectedElementIds.length === 0) return;
    state.selectedElementIds.forEach(elementId => {
      dispatch({ type: 'MOVE_ELEMENT_TO_BACK', payload: elementId });
    });
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handleMoveUp = () => {
    if (state.selectedElementIds.length === 0) return;
    state.selectedElementIds.forEach(elementId => {
      dispatch({ type: 'MOVE_ELEMENT_UP', payload: elementId });
    });
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handleMoveDown = () => {
    if (state.selectedElementIds.length === 0) return;
    state.selectedElementIds.forEach(elementId => {
      dispatch({ type: 'MOVE_ELEMENT_DOWN', payload: elementId });
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
    if (e.evt.button !== 2) {
      setContextMenu({ x: 0, y: 0, visible: false });
    }
    
    // Don't clear selection if we just completed a selection rectangle
    if (isSelecting) return;
    
    // Don't clear selection on right-click
    if (e.evt.button === 2) return;
    
    const isBackgroundClick = e.target === e.target.getStage() || 
      (e.target.getClassName() === 'Rect' && !e.target.id());
    
    if (isBackgroundClick) {
      // Clear selection for all tools when clicking background
      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
      
      // Switch to select tool if not already selected (for background settings)
      if (state.activeTool !== 'select') {
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      }
    }
  };

  const renderBackground = () => {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const background = currentPage?.background;
    
    if (!background) return null;

    const opacity = background.opacity || 1;
    
    if (background.type === 'color') {
      return (
        <Rect
          x={pageOffsetX}
          y={pageOffsetY}
          width={canvasWidth}
          height={canvasHeight}
          fill={background.value}
          opacity={opacity}
          listening={false}
        />
      );
    }
    
    if (background.type === 'pattern') {
      const pattern = PATTERNS.find(p => p.id === background.value);
      if (pattern) {
        const foregroundColor = background.patternForegroundColor || '#666';
        const backgroundColor = background.patternBackgroundColor || 'transparent';
        const patternScale = Math.pow(1.5, (background.patternSize || 1) - 1);
        
        const patternTile = createPatternTile(pattern, foregroundColor, patternScale, background.patternStrokeWidth || 1);
        
        return (
          <Group>
            {backgroundColor !== 'transparent' && (
              <Rect
                x={pageOffsetX}
                y={pageOffsetY}
                width={canvasWidth}
                height={canvasHeight}
                fill={backgroundColor}
                opacity={(background.patternBackgroundOpacity || 1) * opacity}
                listening={false}
              />
            )}
            <Rect
              x={pageOffsetX}
              y={pageOffsetY}
              width={canvasWidth}
              height={canvasHeight}
              fillPatternImage={patternTile}
              fillPatternRepeat="repeat"
              opacity={opacity}
              listening={false}
            />
          </Group>
        );
      }
    }
    
    if (background.type === 'image' && background.value) {
      const bgImage = new window.Image();
      bgImage.src = background.value;
      bgImage.crossOrigin = 'anonymous';
      
      let fillPatternScaleX = 1;
      let fillPatternScaleY = 1;
      let fillPatternRepeat = 'no-repeat';
      
      if (background.imageSize === 'cover') {
        const scaleX = canvasWidth / (bgImage.width || 1);
        const scaleY = canvasHeight / (bgImage.height || 1);
        const scale = Math.max(scaleX, scaleY);
        fillPatternScaleX = fillPatternScaleY = scale;
      } else if (background.imageSize === 'contain') {
        const scaleX = canvasWidth / (bgImage.width || 1);
        const scaleY = canvasHeight / (bgImage.height || 1);
        const scale = Math.min(scaleX, scaleY);
        fillPatternScaleX = fillPatternScaleY = scale;
        if (background.imageRepeat) {
          fillPatternRepeat = 'repeat';
        }
      } else if (background.imageSize === 'stretch') {
        fillPatternScaleX = canvasWidth / (bgImage.width || 1);
        fillPatternScaleY = canvasHeight / (bgImage.height || 1);
      }
      
      return (
        <Rect
          x={pageOffsetX}
          y={pageOffsetY}
          width={canvasWidth}
          height={canvasHeight}
          fillPatternImage={bgImage}
          fillPatternScaleX={fillPatternScaleX}
          fillPatternScaleY={fillPatternScaleY}
          fillPatternRepeat={fillPatternRepeat}
          opacity={opacity}
          listening={false}
        />
      );
    }
    
    return null;
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
  
  useEffect(() => {
    const handleTextEdit = (event: CustomEvent) => {
      // Clear any existing timeout
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
      
      // Debounce to prevent multiple modals
      editingTimeoutRef.current = setTimeout(() => {
        const element = currentPage?.elements.find(el => el.id === event.detail.elementId);
        if (element && !editingElement) {
          setEditingElement(element);
        }
      }, 50);
    };
    
    const handleOpenQuestionModal = (event: CustomEvent) => {
      // Prevent authors from opening question manager - comprehensive check
      console.log('Canvas handleOpenQuestionModal - User:', user, 'Role:', user?.role);
      if (!user || user.role === 'author') {
        console.log('Canvas: Blocking question manager - user:', user, 'role:', user?.role);
        return;
      }
      const element = currentPage?.elements.find(el => el.id === event.detail.elementId);
      if (element && element.textType === 'question') {
        console.log('Canvas: Opening question dialog for element:', element.id);
        setSelectedQuestionElementId(element.id);
        setShowQuestionDialog(true);
      }
    };
    
    const handleFindQuestionElement = (event: CustomEvent) => {
      const { questionElementId, callback } = event.detail;
      const questionElement = currentPage?.elements.find(el => el.id === questionElementId);
      callback(questionElement);
    };
    
    const handleUpdateAnswerId = (event: CustomEvent) => {
      const { elementId, answerId } = event.detail;
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: {
          id: elementId,
          updates: { answerId }
        }
      });
    };
    
    window.addEventListener('editText', handleTextEdit as EventListener);
    window.addEventListener('openQuestionModal', handleOpenQuestionModal as EventListener);
    window.addEventListener('findQuestionElement', handleFindQuestionElement as EventListener);
    window.addEventListener('updateAnswerId', handleUpdateAnswerId as EventListener);
    return () => {
      window.removeEventListener('editText', handleTextEdit as EventListener);
      window.removeEventListener('openQuestionModal', handleOpenQuestionModal as EventListener);
      window.removeEventListener('findQuestionElement', handleFindQuestionElement as EventListener);
      window.removeEventListener('updateAnswerId', handleUpdateAnswerId as EventListener);
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
    };
  }, [currentPage, editingElement]);

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

  const handleImageSelect = (imageId: number, imageUrl: string) => {
    if (!pendingImagePosition) return;
    
    // Load image to get original dimensions
    const img = new window.Image();
    img.onload = () => {
      const maxWidth = 600;
      const aspectRatio = img.width / img.height;
      const width = maxWidth;
      const height = maxWidth / aspectRatio;
      
      const newElement: CanvasElement = {
        id: uuidv4(),
        type: 'image',
        x: pendingImagePosition.x,
        y: pendingImagePosition.y,
        width,
        height,
        src: imageUrl,
        cornerRadius: 0
      };
      
      dispatch({ type: 'ADD_ELEMENT', payload: newElement });
    };
    img.src = imageUrl;
    
    dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
    setShowImageModal(false);
    setPendingImagePosition(null);
  };

  const handleImageModalClose = () => {
    setShowImageModal(false);
    setPendingImagePosition(null);
    dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
  };

  return (
    <>
      <CanvasPageContainer>
        <CanvasContainer ref={containerRef} pageId={currentPage?.id} activeTool={state.activeTool}>
        <CanvasStage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          zoom={zoom}
          stagePos={stagePos}
          activeTool={state.activeTool}
          onClick={handleStageClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
          onWheel={handleWheel}
        >
          <Layer>
            {/* Page boundary */}
            <CanvasPageEditArea width={canvasWidth} height={canvasHeight} x={pageOffsetX} y={pageOffsetY} />
            
            {/* Background Layer */}
            {renderBackground()}
            
            {/* Canvas elements */}
            <Group x={pageOffsetX} y={pageOffsetY}>
              {currentPage?.elements.map(element => (
                <Group key={element.id}>
                  <CanvasItemComponent
                    element={element}
                    isSelected={state.selectedElementIds.includes(element.id)}
                    zoom={zoom}
                    onSelect={() => {
                    if (element.textType === 'question' || element.textType === 'answer') {
                      const currentTime = Date.now();
                      const timeSinceLastClick = currentTime - lastClickTime;
                      
                      // Find linked element
                      let linkedElement: CanvasElement | undefined;
                      if (element.textType === 'question') {
                        linkedElement = currentPage?.elements.find(el => el.questionElementId === element.id);
                      } else if (element.questionElementId) {
                        linkedElement = currentPage?.elements.find(el => el.id === element.questionElementId);
                      }
                      
                      if (!linkedElement) {
                        dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] });
                        setLastClickTime(currentTime);
                        return;
                      }
                      
                      const pairKey = `${Math.min(element.x, linkedElement.x)}-${Math.min(element.y, linkedElement.y)}`;
                      
                      // Check if elements overlap at click position
                      const elementsOverlap = (
                        Math.abs(element.x - linkedElement.x) < 50 && 
                        Math.abs(element.y - linkedElement.y) < 50
                      );
                      
                      let nextMode;
                      
                      const currentMode = selectionModeState.get(pairKey) ?? -1;
                      const maxModes = elementsOverlap ? 3 : 2;
                      nextMode = (currentMode + 1) % maxModes;
                      
                      setSelectionModeState(prev => {
                        const newMap = new Map(prev);
                        newMap.set(pairKey, nextMode);
                        return newMap;
                      });
                      

                      
                      let elementsToSelect: string[] = [];
                      
                      if (nextMode === 0) {
                        // Group selection (always first)
                        elementsToSelect = [element.id, linkedElement.id];
                      } else if (nextMode === 1) {
                        // First element selection
                        elementsToSelect = [element.id];
                      } else if (nextMode === 2 && elementsOverlap) {
                        // Second element selection (only when overlapping)
                        elementsToSelect = [linkedElement.id];
                      }
                      
                      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: elementsToSelect });
                      
                      if (elementsToSelect.length === 2) {
                        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
                      }
                      
                      setLastClickTime(currentTime);
                    } else {
                      // Regular element selection
                      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] });
                    }
                  }}
                  isMovingGroup={isMovingGroup}

                  onDragStart={() => {
                    dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Move Element' });
                    if (!state.selectedElementIds.includes(element.id)) {
                      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] });
                    }
                    setIsDragging(true);
                  }}
                  onDragEnd={() => {
                    setTimeout(() => setIsDragging(false), 10);
                  }}
                  isWithinSelection={selectionRect.visible && getElementsInSelection().includes(element.id)}
                />

                </Group>
              ))}
            
              {/* Preview elements */}
              {isDrawing && currentPath.length > 2 && (
                <PreviewBrush points={currentPath} />
              )}
              
              {previewLine && (
                <PreviewLine
                  x1={previewLine.x1}
                  y1={previewLine.y1}
                  x2={previewLine.x2}
                  y2={previewLine.y2}
                />
              )}
              
              {previewShape && (
                <PreviewShape
                  x={previewShape.x}
                  y={previewShape.y}
                  width={previewShape.width}
                  height={previewShape.height}
                  type={previewShape.type}
                />
              )}
              
              {previewTextbox && (
                <PreviewTextbox
                  x={previewTextbox.x}
                  y={previewTextbox.y}
                  width={previewTextbox.width}
                  height={previewTextbox.height}
                />
              )}
            </Group>
            
            {/* Selection rectangle */}
            <SelectionRectangle
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              visible={selectionRect.visible}
            />
            
            {/* Transformer for selected elements */}
            <CanvasTransformer
              key={state.selectedElementIds.length === 1 ? `${state.selectedElementIds[0]}-${currentPage?.elements.find(el => el.id === state.selectedElementIds[0])?.width}-${currentPage?.elements.find(el => el.id === state.selectedElementIds[0])?.height}` : 'multi'}
              ref={transformerRef}
              keepRatio={state.selectedElementIds.length === 1 && currentPage?.elements.find(el => el.id === state.selectedElementIds[0])?.type === 'image'}
              onDragStart={() => {
                dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Move Elements' });
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
              onTransformStart={() => {
                dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Transform Elements' });
              }}
              onTransformEnd={(e) => {
                // Store current selection to preserve it
                const currentSelection = [...state.selectedElementIds];
                
                // Handle all selected nodes, not just the target
                const nodes = transformerRef.current?.nodes() || [];
                nodes.forEach(node => {
                  const elementId = node.id();
                  const element = currentPage?.elements.find(el => el.id === elementId);
                  if (element) {
                    const updates: any = {};
                    
                    // For text and image elements, convert scale to width/height changes
                    if (element.type === 'text' || element.type === 'image') {
                      const scaleX = node.scaleX();
                      const scaleY = node.scaleY();
                      
                      updates.width = Math.max(element.type === 'text' ? 50 : 20, (element.width || 150) * scaleX);
                      updates.height = Math.max(element.type === 'text' ? 20 : 20, (element.height || 50) * scaleY);
                      updates.x = node.x();
                      updates.y = node.y();
                      updates.rotation = node.rotation();
                      
                      // Reset scale to 1
                      node.scaleX(1);
                      node.scaleY(1);
                    } else {
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
                });
                
                // Restore selection after a brief delay to ensure updates are processed
                setTimeout(() => {
                  dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: currentSelection });
                }, 10);
              }}
            />
          </Layer>
        </CanvasStage>
        
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          visible={contextMenu.visible}
          onDuplicate={handleDuplicateItems}
          onDelete={handleDeleteItems}
          onCopy={handleCopyItems}
          onPaste={handlePasteItems}
          onMoveToFront={handleMoveToFront}
          onMoveToBack={handleMoveToBack}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          hasSelection={state.selectedElementIds.length > 0}
          hasClipboard={clipboard.length > 0}
        />
      </CanvasContainer>
      
      <Modal
        isOpen={showImageModal}
        onClose={handleImageModalClose}
        title="Select Image"
      >
        <ImagesContent
          token={token || ''}
          mode="select"
          onImageSelect={handleImageSelect}
          onImageUpload={(imageUrl) => handleImageSelect(0, imageUrl)}
          onClose={handleImageModalClose}
        />
      </Modal>
      
      {editingElement && (
        <TextEditorModal
          key={editingElement.id}
          element={editingElement}
          onSave={(content, formattedContent) => {
            dispatch({
              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
              payload: {
                id: editingElement.id,
                updates: { 
                  text: content,
                  formattedText: formattedContent 
                }
              }
            });
            setEditingElement(null);
          }}
          onClose={() => {
            // Clear any pending timeouts
            if (editingTimeoutRef.current) {
              clearTimeout(editingTimeoutRef.current);
            }
            setEditingElement(null);
          }}
          onSelectQuestion={editingElement.textType === 'question' ? () => {} : undefined}
          bookId={state.currentBook?.id}
          bookName={state.currentBook?.name}
          token={token}
        />
      )}
      
      {showQuestionDialog && state.currentBook && token && user?.role !== 'author' && (
        <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <QuestionsManagerContent
              bookId={state.currentBook.id}
              bookName={state.currentBook.name}
              mode="select"
              token={token}
              onQuestionSelect={(questionId, questionText) => {
                if (selectedQuestionElementId) {
                  const updates = questionId === 0 
                    ? { text: '', fill: '#9ca3af', questionId: undefined }
                    : { text: questionText, fill: '#1f2937', questionId: questionId };
                  dispatch({
                    type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                    payload: {
                      id: selectedQuestionElementId,
                      updates
                    }
                  });
                }
                setShowQuestionDialog(false);
                setSelectedQuestionElementId(null);
              }}
              onClose={() => {
                setShowQuestionDialog(false);
                setSelectedQuestionElementId(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
      </CanvasPageContainer>
    </>
  );
}
// Re-export components for external use
export { CanvasContainer } from './canvas-container';
export { CanvasStage } from './canvas-stage';
export { CanvasTransformer } from './canvas-transformer';
export { SelectionRectangle } from './selection-rectangle';
export { PreviewLine, PreviewShape, PreviewTextbox, PreviewBrush } from './preview-elements';
