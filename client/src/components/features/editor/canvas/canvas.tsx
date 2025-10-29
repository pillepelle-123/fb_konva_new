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
import { PreviewLine, PreviewShape, PreviewTextbox, PreviewBrush, MaterializedBrush } from './preview-elements';
import { CanvasContainer } from './canvas-container';
import { SnapGuidelines } from './snap-guidelines';
import ContextMenu from '../../../ui/overlays/context-menu';
import { Modal } from '../../../ui/overlays/modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/overlays/dialog';
import ImagesContent from '../../images/images-content';
import QuestionsManagerDialog from '../questions-manager-dialog';

import { getToolDefaults, TOOL_DEFAULTS } from '../../../../utils/tool-defaults';
import { Alert, AlertDescription } from '../../../ui/composites/alert';
import { snapPosition, type SnapGuideline } from '../../../../utils/snapping';

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

function getConsistentColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '3b82f6', '8b5cf6', 'ef4444', '10b981', 'f59e0b', 'ec4899', '06b6d4', 'f97316',
    'f87171', 'fb7185', 'f472b6', 'e879f9', 'c084fc', 'a78bfa', '8b5cf6', '7c3aed',
    '6366f1', '4f46e5', '3b82f6', '2563eb', '0ea5e9', '0891b2', '0e7490', '0f766e',
    '059669', '047857', '065f46', '166534', '15803d', '16a34a', '22c55e', '4ade80',
    '65a30d', '84cc16', 'a3e635', 'bef264', 'eab308', 'f59e0b', 'f97316', 'ea580c',
    'dc2626', 'b91c1c', '991b1b', '7f1d1d', '78716c', '57534e', '44403c', '292524'
  ];
  return colors[Math.abs(hash) % colors.length];
}

function CanvasPageContainer({ children, assignedUser }: { children: React.ReactNode; assignedUser?: { name: string } | null }) {
  const borderStyle = assignedUser ? {
    borderTop: `5px solid #${getConsistentColor(assignedUser.name)}`,
    borderBottom: `5px solid #${getConsistentColor(assignedUser.name)}`
  } : {
    borderTop: `5px solid hsl(var(--muted))`,
    borderBottom: `5px solid hsl(var(--muted))`    
  };
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      backgroundColor: 'hsl(var(--muted))',
      // padding: '2rem
      ...borderStyle
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
  const { state, dispatch, getAnswerText, getQuestionAssignmentsForUser, undo, redo, canAccessEditor, canEditCanvas } = useEditor();
  const { token, user } = useAuth();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<number[]>([]);
  const [brushStrokes, setBrushStrokes] = useState<Array<{ points: number[]; strokeColor: string; strokeWidth: number }>>([]);
  const [isBrushMode, setIsBrushMode] = useState(false);
  const isBrushModeRef = useRef(false);
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
      setShowQuestionDialog(false);
      setSelectedQuestionElementId(null);
    }
  }, [showQuestionDialog, user]);
  const [selectedQuestionElementId, setSelectedQuestionElementId] = useState<string | null>(null);
  const [selectionModeState, setSelectionModeState] = useState<Map<string, number>>(new Map());
  const editingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [clipboard, setClipboard] = useState<CanvasElement[]>([]);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertPosition, setAlertPosition] = useState<{ x: number; y: number } | null>(null);
  const [snapGuidelines, setSnapGuidelines] = useState<SnapGuideline[]>([]);
  
  // Snapping functionality
  const GUIDELINE_OFFSET = 15; // Increased for better snapping detection

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
        transformer.forceUpdate();
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
        if (transformer && transformer.nodes().length > 0) {
          transformer.forceUpdate();
          transformer.getLayer()?.batchDraw();
        }
      }, 10);
    }
  }, [currentPage?.elements.map(el => `${el.id}-${el.width}-${el.height}`).join(',')]);

  // Force transformer update after group movement ends
  useEffect(() => {
    if (!isMovingGroup && transformerRef.current && stageRef.current && state.selectedElementIds.length > 0) {
      const transformer = transformerRef.current;
      const stage = stageRef.current;
      
      // Small delay to ensure Konva nodes have updated positions
      const timer = setTimeout(() => {
        const selectedNodes = state.selectedElementIds.map(id => {
          let node = stage.findOne(`#${id}`);
          if (!node) {
            const allNodes = stage.find('*');
            node = allNodes.find(n => n.id() === id);
          }
          return node;
        }).filter(node => node && node.getStage());
        
        if (selectedNodes.length > 0) {
          transformer.nodes(selectedNodes);
          transformer.forceUpdate();
          transformer.getLayer()?.batchDraw();
        }
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [isMovingGroup, state.selectedElementIds]);

  // Reset selection mode state when no elements are selected
  useEffect(() => {
    if (state.selectedElementIds.length === 0) {
      setSelectionModeState(new Map());
    }
  }, [state.selectedElementIds.length]);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Deactivate style painter on any click
    if (state.stylePainterActive && e.evt.button === 0) {
      dispatch({ type: 'TOGGLE_STYLE_PAINTER' });
    }
    
    // Block all interactions for no_access level
    if (!canAccessEditor()) return;
    
    // For answer_only level, only allow panning
    if (state.editorInteractionLevel === 'answer_only') {
      if (e.evt.button === 2 || state.activeTool === 'pan') {
        setIsPanning(true);
        setHasPanned(false);
        const pos = e.target.getStage()?.getPointerPosition();
        if (pos) {
          setPanStart({ x: pos.x - stagePos.x, y: pos.y - stagePos.y });
        }
      }
      return;
    }
    
    // Block canvas editing for non-full-edit levels
    if (!canEditCanvas()) return;
    
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
    } else if (['rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(state.activeTool)) {
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
    } else if (state.activeTool === 'text' || state.activeTool === 'question' || state.activeTool === 'answer' || state.activeTool === 'qna' || state.activeTool === 'qna2' || state.activeTool === 'qna_inline') {
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
    
    // Block all mouse move interactions for no_access users
    if (state.editorInteractionLevel === 'no_access') {
      return;
    }
    
    // For answer_only users, only allow panning
    if (state.editorInteractionLevel === 'answer_only') {
      if (isPanning) {
        const pos = e.target.getStage()?.getPointerPosition();
        if (pos) {
          setHasPanned(true);
          setStagePos({
            x: pos.x - panStart.x,
            y: pos.y - panStart.y
          });
        }
      }
      return;
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
    // Block all mouse up interactions for no_access users except panning
    if (state.editorInteractionLevel === 'no_access') {
      if (isPanning) {
        setIsPanning(false);
        setPanStart({ x: 0, y: 0 });
      }
      return;
    }
    
    // For answer_only users, only allow panning
    if (state.editorInteractionLevel === 'answer_only') {
      if (isPanning) {
        setIsPanning(false);
        setPanStart({ x: 0, y: 0 });
      }
      return;
    }
    
    if (isPanning) {
      setIsPanning(false);
      setPanStart({ x: 0, y: 0 });
    } else if (isDrawing && state.activeTool === 'brush' && currentPath.length > 2) {
      const smoothedPath = smoothPath(currentPath);
      
      if (!isBrushMode) {
        // Start brush mode on first stroke
        setIsBrushMode(true);
        isBrushModeRef.current = true;
        window.dispatchEvent(new CustomEvent('brushModeStart'));
      }
      
      // Capture current tool settings for this stroke
      const currentPage = state.currentBook?.pages[state.activePageIndex];
      const pageTheme = currentPage?.background?.pageTheme;
      const bookTheme = state.currentBook?.bookTheme;
      const brushDefaults = getToolDefaults('brush', pageTheme, bookTheme);
      const toolSettings = state.toolSettings?.brush || {};
      
      const strokeData = {
        points: smoothedPath,
        strokeColor: toolSettings.strokeColor || brushDefaults.stroke,
        strokeWidth: toolSettings.strokeWidth || brushDefaults.strokeWidth
      };
      
      // Add stroke to collection with its settings
      setBrushStrokes(prev => [...prev, strokeData]);
      window.dispatchEvent(new CustomEvent('brushStrokeAdded', { detail: { points: smoothedPath } }));
      
      // Don't create element yet - wait for Done button
    } else if (isDrawingLine && lineStart && previewLine) {
      const width = previewLine.x2 - previewLine.x1;
      const height = previewLine.y2 - previewLine.y1;
      
      if (Math.abs(width) > 5 || Math.abs(height) > 5) {
        const currentPage = state.currentBook?.pages[state.activePageIndex];
        const pageTheme = currentPage?.background?.pageTheme;
        const bookTheme = state.currentBook?.bookTheme;
        const lineDefaults = getToolDefaults('line', pageTheme, bookTheme);
        const toolSettings = state.toolSettings?.line || {};
        const newElement: CanvasElement = {
          id: uuidv4(),
          type: 'line',
          x: previewLine.x1,
          y: previewLine.y1,
          width: width,
          height: height,
          stroke: toolSettings.strokeColor || lineDefaults.stroke,
          roughness: 3,
          strokeWidth: toolSettings.strokeWidth || lineDefaults.strokeWidth,
          theme: lineDefaults.theme
        };
        dispatch({ type: 'ADD_ELEMENT', payload: newElement });
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      }
      setIsDrawingLine(false);
      setLineStart(null);
      setPreviewLine(null);
    } else if (isDrawingShape && shapeStart && previewShape) {
      if (previewShape.width > 5 || previewShape.height > 5) {
        const currentPage = state.currentBook?.pages[state.activePageIndex];
        const pageTheme = currentPage?.background?.pageTheme;
        const bookTheme = state.currentBook?.bookTheme;
        const shapeDefaults = getToolDefaults(previewShape.type as any, pageTheme, bookTheme);
        const toolSettings = state.toolSettings?.[previewShape.type] || {};
        const newElement: CanvasElement = {
          id: uuidv4(),
          type: previewShape.type as any,
          x: previewShape.x,
          y: previewShape.y,
          width: previewShape.width,
          height: previewShape.height,
          fill: toolSettings.fillColor !== undefined ? toolSettings.fillColor : (shapeDefaults.fill || 'transparent'),
          stroke: toolSettings.strokeColor || shapeDefaults.stroke,
          roughness: 3,
          strokeWidth: toolSettings.strokeWidth || shapeDefaults.strokeWidth,
          cornerRadius: shapeDefaults.cornerRadius || 0,
          theme: shapeDefaults.theme,
          polygonSides: previewShape.type === 'polygon' ? (state.toolSettings?.polygon?.polygonSides || 5) : undefined
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
          const currentPage = state.currentBook?.pages[state.activePageIndex];
          const pageTheme = currentPage?.background?.pageTheme;
          const bookTheme = state.currentBook?.bookTheme;
          const textDefaults = getToolDefaults('text', pageTheme, bookTheme);
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: previewTextbox.height,
            fontColor: textDefaults.fontColor,
            text: '',
            fontSize: textDefaults.fontSize,
            align: textDefaults.align,
            fontFamily: textDefaults.fontFamily,
            textType: 'text',
            paragraphSpacing: textDefaults.paragraphSpacing,
            cornerRadius: textDefaults.cornerRadius
          };
        } else if (previewTextbox.type === 'question') {
          const currentPage = state.currentBook?.pages[state.activePageIndex];
          const pageTheme = currentPage?.background?.pageTheme;
          const bookTheme = state.currentBook?.bookTheme;
          const questionDefaults = getToolDefaults('question', pageTheme, bookTheme);
          const answerDefaults = getToolDefaults('answer', pageTheme, bookTheme);
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
            fontSize: questionDefaults.fontSize,
            align: questionDefaults.align,
            fontFamily: questionDefaults.fontFamily,
            textType: 'question',
            fontColor: '#9ca3af',
            cornerRadius: questionDefaults.cornerRadius
          };
          
          // Generate UUID for answer immediately
          const answerUUID = uuidv4();
          
          // Create answer textbox (editable)
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y + questionHeight + 10,
            width: previewTextbox.width,
            height: answerHeight,
            text: '',
            fontSize: answerDefaults.fontSize,
            align: answerDefaults.align,
            fontFamily: answerDefaults.fontFamily,
            textType: 'answer',
            questionElementId: questionElement.id,
            answerId: answerUUID,
            paragraphSpacing: answerDefaults.paragraphSpacing,
            cornerRadius: answerDefaults.cornerRadius
          };
          
          // Add question element first
          dispatch({ type: 'ADD_ELEMENT', payload: questionElement });
        } else if (previewTextbox.type === 'qna') {
          const currentPage = state.currentBook?.pages[state.activePageIndex];
          const pageTheme = currentPage?.background?.pageTheme;
          const bookTheme = state.currentBook?.bookTheme;
          const qnaDefaults = getToolDefaults('qna', pageTheme, bookTheme);
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: previewTextbox.height,
            text: '',
            fontSize: qnaDefaults.fontSize,
            align: qnaDefaults.align,
            fontFamily: qnaDefaults.fontFamily,
            textType: 'qna',
            paragraphSpacing: qnaDefaults.paragraphSpacing,
            cornerRadius: qnaDefaults.cornerRadius
          };
        } else if (previewTextbox.type === 'qna2') {
          const currentPage = state.currentBook?.pages[state.activePageIndex];
          const pageTheme = currentPage?.background?.pageTheme;
          const bookTheme = state.currentBook?.bookTheme;
          const qna2Defaults = getToolDefaults('qna2', pageTheme, bookTheme);
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: previewTextbox.height,
            text: '',
            fontSize: qna2Defaults.fontSize,
            align: qna2Defaults.align,
            fontFamily: qna2Defaults.fontFamily,
            textStyle: 'qna2',
            paragraphSpacing: qna2Defaults.paragraphSpacing,
            cornerRadius: qna2Defaults.cornerRadius,
            questionSettings: qna2Defaults.questionSettings,
            answerSettings: qna2Defaults.answerSettings
          };
        } else if (previewTextbox.type === 'qna_inline') {
          const currentPage = state.currentBook?.pages[state.activePageIndex];
          const pageTheme = currentPage?.background?.pageTheme;
          const bookTheme = state.currentBook?.bookTheme;
          const qnaInlineDefaults = getToolDefaults('qna_inline', pageTheme, bookTheme);
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: previewTextbox.height,
            text: '',
            fontSize: qnaInlineDefaults.fontSize,
            align: qnaInlineDefaults.align,
            fontFamily: qnaInlineDefaults.fontFamily,
            textType: 'qna_inline',
            paragraphSpacing: qnaInlineDefaults.paragraphSpacing,
            cornerRadius: qnaInlineDefaults.cornerRadius,
            questionSettings: qnaInlineDefaults.questionSettings,
            answerSettings: qnaInlineDefaults.answerSettings
          };
        } else {
          const currentPage = state.currentBook?.pages[state.activePageIndex];
          const pageTheme = currentPage?.background?.pageTheme;
          const bookTheme = state.currentBook?.bookTheme;
          const answerDefaults = getToolDefaults('answer', pageTheme, bookTheme);
          
          // Generate UUID for answer immediately
          const answerUUID = uuidv4();
          
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: previewTextbox.height,
            text: '',
            fontSize: answerDefaults.fontSize,
            align: answerDefaults.align,
            fontFamily: answerDefaults.fontFamily,
            textType: 'answer',
            answerId: answerUUID,
            paragraphSpacing: answerDefaults.paragraphSpacing,
            cornerRadius: answerDefaults.cornerRadius
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
      
      // Add linked question-answer pairs
      const finalSelectedIds = new Set(selectedIds);
      selectedIds.forEach(elementId => {
        const element = currentPage?.elements.find(el => el.id === elementId);
        if (element?.textType === 'question') {
          const answerElement = currentPage?.elements.find(el => el.questionElementId === elementId);
          if (answerElement) finalSelectedIds.add(answerElement.id);
        } else if (element?.textType === 'answer' && element.questionElementId) {
          finalSelectedIds.add(element.questionElementId);
        }
      });
      
      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: Array.from(finalSelectedIds) });
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
      if ((element.type === 'brush-multicolor' || element.type === 'group') && element.groupedElements) {
        // For groups and brush-multicolor, calculate bounds from grouped elements
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        element.groupedElements.forEach(groupedEl => {
          if (groupedEl.type === 'brush' && groupedEl.points) {
            for (let i = 0; i < groupedEl.points.length; i += 2) {
              minX = Math.min(minX, groupedEl.x + groupedEl.points[i]);
              maxX = Math.max(maxX, groupedEl.x + groupedEl.points[i]);
              minY = Math.min(minY, groupedEl.y + groupedEl.points[i + 1]);
              maxY = Math.max(maxY, groupedEl.y + groupedEl.points[i + 1]);
            }
          } else {
            minX = Math.min(minX, groupedEl.x);
            maxX = Math.max(maxX, groupedEl.x + (groupedEl.width || 100));
            minY = Math.min(minY, groupedEl.y);
            maxY = Math.max(maxY, groupedEl.y + (groupedEl.height || 100));
          }
        });
        
        elementBounds.x = element.x + minX;
        elementBounds.y = element.y + minY;
        elementBounds.width = maxX - minX;
        elementBounds.height = maxY - minY;
      } else if (element.type === 'brush' && element.points) {
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
    
    // Exit Style Painter mode on right-click anywhere
    if (state.stylePainterActive) {
      dispatch({ type: 'TOGGLE_STYLE_PAINTER' });
      return;
    }
    
    // Block context menu for restricted users
    if (!canEditCanvas() || state.editorInteractionLevel === 'answer_only') return;
    
    // Don't show context menu if we just finished panning
    if (hasPanned) {
      setHasPanned(false);
      return;
    }
    
    // Prevent context menu when only one element of a question-answer pair is selected
    if (state.selectedElementIds.length === 1 && currentPage) {
      const selectedElement = currentPage.elements.find(el => el.id === state.selectedElementIds[0]);
      if (selectedElement && (selectedElement.textType === 'question' || selectedElement.textType === 'answer')) {
        let linkedElement: CanvasElement | undefined;
        if (selectedElement.textType === 'question') {
          linkedElement = currentPage.elements.find(el => el.questionElementId === selectedElement.id);
        } else if (selectedElement.questionElementId) {
          linkedElement = currentPage.elements.find(el => el.id === selectedElement.questionElementId);
        }
        
        if (linkedElement) {
          return; // Don't show context menu for single element of a pair
        }
      }
    }
    
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    
    setContextMenu({ x: e.evt.pageX, y: e.evt.pageY, visible: true });
  };

  const handleDuplicateItems = () => {
    if (!currentPage) return;
    
    // Create ID mapping for question-answer pairs
    const idMapping = new Map<string, string>();
    state.selectedElementIds.forEach(elementId => {
      idMapping.set(elementId, uuidv4());
    });
    
    const newElementIds: string[] = [];
    
    state.selectedElementIds.forEach(elementId => {
      const element = currentPage.elements.find(el => el.id === elementId);
      if (element) {
        const newId = idMapping.get(elementId)!;
        newElementIds.push(newId);
        const duplicatedElement = {
          ...element,
          id: newId,
          x: element.x + 20,
          y: element.y + 20,
          // Clear text for question-answer pairs and qna_inline
          text: (element.textType === 'question' || element.textType === 'answer' || element.textType === 'qna_inline') ? '' : element.text,
          formattedText: (element.textType === 'question' || element.textType === 'answer' || element.textType === 'qna_inline') ? '' : element.formattedText,
          // Clear question styling for duplicated questions
          fontColor: element.textType === 'question' ? '#9ca3af' : (element.fontColor || element.fill),
          // Clear questionId for qna_inline to reset question assignment
          questionId: (element.textType === 'question' || element.textType === 'qna_inline') ? undefined : element.questionId,
          // Update questionElementId reference for answer elements
          questionElementId: element.questionElementId ? idMapping.get(element.questionElementId) : element.questionElementId
        };
        dispatch({ type: 'ADD_ELEMENT', payload: duplicatedElement });
      }
    });
    
    // Select the duplicated elements
    setTimeout(() => {
      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: newElementIds });
    }, 10);
    
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
    
    let elementsToInclude = new Set(state.selectedElementIds);
    
    // For question-answer pairs, always include both elements
    state.selectedElementIds.forEach(elementId => {
      const element = currentPage.elements.find(el => el.id === elementId);
      if (element?.textType === 'question') {
        const answerElement = currentPage.elements.find(el => el.questionElementId === elementId);
        if (answerElement) elementsToInclude.add(answerElement.id);
      } else if (element?.textType === 'answer' && element.questionElementId) {
        elementsToInclude.add(element.questionElementId);
      }
    });
    
    const copiedElements = Array.from(elementsToInclude).map(elementId => {
      const element = currentPage.elements.find(el => el.id === elementId);
      return element ? { ...element, pageId: currentPage.id } : null; // Track source page
    }).filter(Boolean) as CanvasElement[];
    
    setClipboard(copiedElements);
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handlePasteItems = () => {
    if (clipboard.length === 0) return;
    
    // Check if clipboard contains question or answer elements
    const hasQuestionAnswer = clipboard.some(element => 
      element.textType === 'question' || element.textType === 'answer'
    );
    
    if (hasQuestionAnswer) {
      // Check if pasting on same page where it was copied
      const currentPageId = state.currentBook?.pages[state.activePageIndex]?.id;
      if (clipboard.some(element => element.pageId === currentPageId)) {
        setContextMenu({ x: 0, y: 0, visible: false });
        return; // Prevent pasting on same page
      }
      
      // Check "one question per user" rule
      const currentPageNumber = state.activePageIndex + 1;
      const assignedUser = state.pageAssignments[currentPageNumber];
      
      if (assignedUser) {
        const questionElements = clipboard.filter(el => el.textType === 'question' && el.questionId);
        const userQuestions = getQuestionAssignmentsForUser(assignedUser.id);
        
        const hasConflict = questionElements.some(el => userQuestions.has(el.questionId));
        if (hasConflict) {
          // Show conflict dialog
          setAlertMessage('This user already has one of these questions assigned.');
          const alertX = (lastMousePos.x - stagePos.x) / zoom + pageOffsetX;
          const alertY = (lastMousePos.y - stagePos.y) / zoom + pageOffsetY;
          setAlertPosition({ x: alertX, y: alertY });
          
          setTimeout(() => {
            setAlertMessage(null);
            setAlertPosition(null);
          }, 3000);
          
          setContextMenu({ x: 0, y: 0, visible: false });
          return;
        }
      }
    }
    
    const x = (lastMousePos.x - stagePos.x) / zoom - pageOffsetX;
    const y = (lastMousePos.y - stagePos.y) / zoom - pageOffsetY;
    
    // Create ID mapping for question-answer pairs
    const idMapping = new Map<string, string>();
    clipboard.forEach(element => {
      idMapping.set(element.id, uuidv4());
    });
    
    // Calculate offset based on top-left element to maintain relative positions
    const minX = Math.min(...clipboard.map(el => el.x));
    const minY = Math.min(...clipboard.map(el => el.y));
    
    const newElementIds: string[] = [];
    
    clipboard.forEach((element) => {
      const newId = idMapping.get(element.id)!;
      newElementIds.push(newId);
      const pastedElement = {
        ...element,
        id: newId,
        x: x + (element.x - minX),
        y: y + (element.y - minY),
        pageId: state.currentBook?.pages[state.activePageIndex]?.id, // Track source page
        // Clear text for question, answer, and qna_inline when pasting
        text: (element.textType === 'question' || element.textType === 'answer' || element.textType === 'qna_inline') ? '' : element.text,
        formattedText: (element.textType === 'question' || element.textType === 'answer' || element.textType === 'qna_inline') ? '' : element.formattedText,
        // Clear question styling for pasted questions
        fontColor: element.textType === 'question' ? '#9ca3af' : (element.fontColor || element.fill),
        // Clear questionId for qna_inline to reset question assignment
        questionId: (element.textType === 'question' || element.textType === 'qna_inline') ? undefined : element.questionId,
        // Update questionElementId reference for answer elements
        questionElementId: element.questionElementId ? idMapping.get(element.questionElementId) : element.questionElementId
      };
      dispatch({ type: 'ADD_ELEMENT', payload: pastedElement });
    });
    
    // Select the pasted elements
    setTimeout(() => {
      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: newElementIds });
    }, 10);
    
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

  const handleGroup = () => {
    if (!currentPage || state.selectedElementIds.length < 2) return;
    
    const groupId = uuidv4();
    const selectedElements = state.selectedElementIds
      .map(id => currentPage.elements.find(el => el.id === id))
      .filter(Boolean) as CanvasElement[];
    
    // Create group element
    const minX = Math.min(...selectedElements.map(el => el.x));
    const minY = Math.min(...selectedElements.map(el => el.y));
    const maxX = Math.max(...selectedElements.map(el => el.x + (el.width || 100)));
    const maxY = Math.max(...selectedElements.map(el => el.y + (el.height || 100)));
    
    const groupElement: CanvasElement = {
      id: groupId,
      type: 'group',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      groupedElements: selectedElements.map(el => ({
        ...el,
        x: el.x - minX,
        y: el.y - minY
      }))
    };
    
    // Remove individual elements and add group
    state.selectedElementIds.forEach(id => {
      dispatch({ type: 'DELETE_ELEMENT', payload: id });
    });
    dispatch({ type: 'ADD_ELEMENT', payload: groupElement });
    dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [groupId] });
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handleUngroup = () => {
    if (!currentPage || state.selectedElementIds.length !== 1) return;
    
    const groupElement = currentPage.elements.find(el => el.id === state.selectedElementIds[0]);
    if (!groupElement || (groupElement.type !== 'group' && groupElement.type !== 'brush-multicolor') || !groupElement.groupedElements) return;
    
    const newElementIds: string[] = [];
    groupElement.groupedElements.forEach(el => {
      const newElement = {
        ...el,
        x: groupElement.x + el.x,
        y: groupElement.y + el.y
      };
      newElementIds.push(newElement.id);
      dispatch({ type: 'ADD_ELEMENT', payload: newElement });
    });
    
    dispatch({ type: 'DELETE_ELEMENT', payload: groupElement.id });
    dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: newElementIds });
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
    
    // Handle pipette tool
    if (state.activeTool === 'pipette' && e.evt.button === 0) {
      const stage = stageRef.current;
      if (!stage) return;
      
      const pos = stage.getPointerPosition();
      if (!pos) return;
      
      // Get pixel color at click position
      try {
        const canvas = stage.toCanvas();
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const pixelData = ctx.getImageData(pos.x, pos.y, 1, 1).data;
          const r = pixelData[0];
          const g = pixelData[1];
          const b = pixelData[2];
          const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
          
          // Update pipette color in tool settings
          dispatch({
            type: 'UPDATE_TOOL_SETTINGS',
            payload: { tool: 'pipette', settings: { pipetteColor: hex } }
          });
        }
      } catch (error) {
        console.error('Failed to pick color:', error);
      }
      return;
    }
    
    // Don't clear selection if we just completed a selection rectangle
    if (isSelecting) return;
    
    // Don't clear selection on right-click
    if (e.evt.button === 2) return;
    
    // Don't handle click if in brush mode
    if (isBrushMode || isBrushModeRef.current) return;
    
    // If style painter is active, deactivate it on any click that's not on an element
    if (state.stylePainterActive && e.evt.button === 0) {
      const clickedOnElement = e.target !== e.target.getStage() && 
        (e.target.getClassName() !== 'Rect' || e.target.id());
      
      if (!clickedOnElement) {
        dispatch({ type: 'TOGGLE_STYLE_PAINTER' });
        return;
      }
    }
    
    const isBackgroundClick = e.target === e.target.getStage() || 
      (e.target.getClassName() === 'Rect' && !e.target.id());
    
    if (isBackgroundClick) {
      // Clear selection for all tools when clicking background
      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
      
      // Don't switch away from pan tool or pipette tool
      if (state.activeTool !== 'select' && state.activeTool !== 'pan' && state.activeTool !== 'pipette') {
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
      let fillPatternOffsetX = 0;
      let fillPatternOffsetY = 0;
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
          fillPatternOffsetX={fillPatternOffsetX}
          fillPatternOffsetY={fillPatternOffsetY}
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
    
    const handleBrushDone = () => {
      if (brushStrokes.length > 0) {
        const currentPage = state.currentBook?.pages[state.activePageIndex];
        const pageTheme = currentPage?.background?.pageTheme;
        const bookTheme = state.currentBook?.bookTheme;
        const brushDefaults = getToolDefaults('brush', pageTheme, bookTheme);
        
        // Convert each stroke to individual brush elements for grouping
        const groupedBrushElements: CanvasElement[] = brushStrokes.map(strokeData => ({
          id: uuidv4(),
          type: 'brush' as const,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          points: strokeData.points,
          stroke: strokeData.strokeColor,
          strokeWidth: strokeData.strokeWidth,
          theme: brushDefaults.theme
        }));
        
        // Create brush-multicolor group element
        const newElement: CanvasElement = {
          id: uuidv4(),
          type: 'brush-multicolor',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          groupedElements: groupedBrushElements,
          theme: brushDefaults.theme
        };
        dispatch({ type: 'ADD_ELEMENT', payload: newElement });
      }
      
      setBrushStrokes([]);
      setIsBrushMode(false);
      isBrushModeRef.current = false;
      window.dispatchEvent(new CustomEvent('brushModeEnd'));
      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
    };
    
    const handleBrushCancel = () => {
      setBrushStrokes([]);
      setIsBrushMode(false);
      isBrushModeRef.current = false;
      window.dispatchEvent(new CustomEvent('brushModeEnd'));
    };
    
    const handleBrushUndo = () => {
      if (brushStrokes.length > 0) {
        setBrushStrokes(prev => prev.slice(0, -1));
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('changePage', handlePageChange as EventListener);
    window.addEventListener('brushDone', handleBrushDone as EventListener);
    window.addEventListener('brushCancel', handleBrushCancel as EventListener);
    window.addEventListener('brushUndo', handleBrushUndo as EventListener);
    
    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('changePage', handlePageChange as EventListener);
      window.removeEventListener('brushDone', handleBrushDone as EventListener);
      window.removeEventListener('brushCancel', handleBrushCancel as EventListener);
      window.removeEventListener('brushUndo', handleBrushUndo as EventListener);
    };
  }, [brushStrokes, state.currentBook, state.activePageIndex, state.toolSettings]);
  
  // Separate useEffect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Block shortcuts for restricted users
      if (!canAccessEditor()) {
        return;
      }
      
      // For answer_only users, block all shortcuts except arrow keys for navigation
      if (state.editorInteractionLevel === 'answer_only' && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        return;
      }
      
      if (e.key === 'Delete' && state.selectedElementIds.length > 0) {
        e.preventDefault();
        handleDeleteItems();
      // Arrow keys are now handled in the repeat handler
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Deactivate style painter on ESC key
        if (state.stylePainterActive) {
          dispatch({ type: 'TOGGLE_STYLE_PAINTER' });
        }
      } else if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' && state.selectedElementIds.length > 0) {
          e.preventDefault();
          handleCopyItems();
        } else if (e.key === 'v') {
          e.preventDefault();
          if (clipboard.length > 0) {
            handlePasteItems();
          } else {
            // Handle text paste
            navigator.clipboard.readText().then(text => {
              if (text.trim()) {
                const x = (lastMousePos.x - stagePos.x) / zoom;
                const y = (lastMousePos.y - stagePos.y) / zoom;
                const newElement = {
                  id: uuidv4(),
                  type: 'text' as const,
                  x,
                  y,
                  width: 200,
                  height: 50,
                  text,
                  fontSize: 16,
                  fontFamily: 'Arial, sans-serif',
                  fontColor: '#1f2937',
                  textType: 'text' as const
                };
                dispatch({ type: 'ADD_ELEMENT', payload: newElement });
              }
            }).catch(() => {});
          }
        } else if (e.key === 'x' && state.selectedElementIds.length > 0) {
          e.preventDefault();
          handleCopyItems();
          handleDeleteItems();
        } else if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        } else if (e.key === 's') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('saveBook'));
        // } else if (e.key === 'w') {
        //   e.preventDefault();
        //   window.dispatchEvent(new CustomEvent('closeBook'));
        } else if (e.key === 'p') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('showPDFExport'));
        } else if (e.key === 'd' && state.selectedElementIds.length > 0) {
          e.preventDefault();
          handleDuplicateItems();
        }
      }
    };
    
    let keyRepeatInterval: NodeJS.Timeout | null = null;
    const pressedKeys = new Set<string>();
    
    const handleKeyDownWithRepeat = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Handle arrow keys with smooth repeat
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && state.selectedElementIds.length > 0) {
        e.preventDefault();
        
        if (!pressedKeys.has(e.key)) {
          pressedKeys.add(e.key);
          
          const moveElements = () => {
            const deltaX = pressedKeys.has('ArrowLeft') ? -1 : pressedKeys.has('ArrowRight') ? 1 : 0;
            const deltaY = pressedKeys.has('ArrowUp') ? -1 : pressedKeys.has('ArrowDown') ? 1 : 0;
            
            if (deltaX !== 0 || deltaY !== 0) {
              state.selectedElementIds.forEach(elementId => {
                const element = currentPage?.elements.find(el => el.id === elementId);
                if (element) {
                  dispatch({
                    type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                    payload: {
                      id: elementId,
                      updates: { x: element.x + deltaX, y: element.y + deltaY }
                    }
                  });
                }
              });
            }
          };
          
          moveElements(); // Initial move
          keyRepeatInterval = setInterval(moveElements, 16); // ~60fps
        }
        return;
      }
      
      // Handle other shortcuts normally
      handleKeyDown(e);
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        pressedKeys.delete(e.key);
        if (pressedKeys.size === 0 && keyRepeatInterval) {
          clearInterval(keyRepeatInterval);
          keyRepeatInterval = null;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDownWithRepeat);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDownWithRepeat);
      window.removeEventListener('keyup', handleKeyUp);
      if (keyRepeatInterval) {
        clearInterval(keyRepeatInterval);
      }
    };
  }, [state.selectedElementIds, currentPage, clipboard, lastMousePos, stagePos, zoom, undo, redo, handleDeleteItems, handleCopyItems, handlePasteItems]);
  
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
    
    const handleQuestionSelected = (event: CustomEvent) => {
      const { questionId, questionText } = event.detail;
      // console.log('handleQuestionSelected called:', { questionId, questionText, selectedQuestionElementId });
            
      // Use the selectedQuestionElementId which is set when opening the dialog
      if (selectedQuestionElementId) {
        const element = currentPage?.elements.find(el => el.id === selectedQuestionElementId);
        // console.log('Found element:', element);
                
        if (element && (element.textType === 'qna' || element.textType === 'question' || element.textType === 'qna2' || element.textType === 'qna_inline')) {
          // Validate: Check if question already exists on this page (excluding current element)
          if (questionId && currentPage) {
            const questionsOnPage = currentPage.elements
              .filter(el => el.id !== selectedQuestionElementId && el.questionId === questionId)
              .map(el => el.questionId);
            
            if (questionsOnPage.length > 0) {
              setAlertMessage('This question already exists on this page.');
              const alertX = (element.x + (element.width || 100) / 2);
              const alertY = (element.y + (element.height || 50) + 10);
              setAlertPosition({ x: alertX, y: alertY });
              
              setTimeout(() => {
                setAlertMessage(null);
                setAlertPosition(null);
              }, 3000);
              return;
            }
          }
          const fontColor = element.fontColor || element.fill || TOOL_DEFAULTS.qna.fontColor;          
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: selectedQuestionElementId,
              updates: { 
                questionId: questionId || undefined,
                fontColor: fontColor
              }
            }
          });
          // console.log('Updated element with questionId:', questionId);
        }
      }
    };
    
    const handleOpenQuestionModal = (event: CustomEvent) => {
      // Prevent authors from opening question manager
      if (!user || user.role === 'author') {
        return;
      }
      const element = currentPage?.elements.find(el => el.id === event.detail.elementId);
      // console.log('handleOpenQuestionModal - element found:', element);
      if (element && (element.textType === 'question' || element.textType === 'qna' || element.textType === 'qna2' || element.textType === 'qna_inline')) {
        // console.log('Setting selectedQuestionElementId:', element.id);
        setSelectedQuestionElementId(element.id);
        setShowQuestionDialog(true);
      }
    };
    
    const handleFindQuestionElement = (event: CustomEvent) => {
      const { questionElementId, callback } = event.detail;
      const questionElement = currentPage?.elements.find(el => el.id === questionElementId);
      callback(questionElement);
    };
    

    
    const handleShowAlert = (event: CustomEvent) => {
      const { message, x, y, width, height } = event.detail;
      setAlertMessage(message);
      
      // Calculate alert position relative to textbox
      const alertX = (x + width / 2) * zoom + stagePos.x + pageOffsetX;
      const alertY = (y + height + 10) * zoom + stagePos.y + pageOffsetY;
      setAlertPosition({ x: alertX, y: alertY });
      
      setTimeout(() => {
        setAlertMessage(null);
        setAlertPosition(null);
      }, 3000);
    };
    
    const handleResetQuestion = (event: CustomEvent) => {
      const { clearAnswer } = event.detail;
      
      if (clearAnswer && selectedQuestionElementId) {
        const element = currentPage?.elements.find(el => el.id === selectedQuestionElementId);
        
        if (element && element.questionId) {
          // DON'T clear answer from tempAnswers - keep it so it reappears when question is re-selected
          // The answer should remain in tempAnswers for future use
          // Only the UI display is cleared by removing the questionId from the element
        }
      }
    };
    
    window.addEventListener('editText', handleTextEdit as EventListener);
    window.addEventListener('openQuestionModal', handleOpenQuestionModal as EventListener);
    window.addEventListener('findQuestionElement', handleFindQuestionElement as EventListener);
    window.addEventListener('questionSelected', handleQuestionSelected as EventListener);
    window.addEventListener('showAlert', handleShowAlert as EventListener);
    window.addEventListener('resetQuestion', handleResetQuestion as EventListener);
    return () => {
      window.removeEventListener('editText', handleTextEdit as EventListener);
      window.removeEventListener('openQuestionModal', handleOpenQuestionModal as EventListener);
      window.removeEventListener('findQuestionElement', handleFindQuestionElement as EventListener);
      window.removeEventListener('questionSelected', handleQuestionSelected as EventListener);
      window.removeEventListener('showAlert', handleShowAlert as EventListener);
      window.removeEventListener('resetQuestion', handleResetQuestion as EventListener);
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
    };
  }, [currentPage, editingElement, selectedQuestionElementId]);

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

  const handleSnapPosition = (node: Konva.Node, x: number, y: number, enableGridSnap: boolean = false) => {
    const result = snapPosition(
      node,
      x,
      y,
      enableGridSnap,
      state.magneticSnapping,
      currentPage!,
      canvasWidth,
      canvasHeight,
      pageOffsetX,
      pageOffsetY,
      stageRef
    );
    
    setSnapGuidelines(result.guidelines);
    return { x: result.x, y: result.y };
  };

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
      <CanvasPageContainer assignedUser={state.pageAssignments[state.activePageIndex + 1] || null}>
        <CanvasContainer 
          ref={containerRef} 
          pageId={currentPage?.id} 
          activeTool={state.activeTool}
          stylePainterActive={state.stylePainterActive}
        >
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
          style={{ cursor: state.stylePainterActive ? 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkuMDYgMTEuOUwxMi4wNiA4LjlMMTUuMDYgMTEuOUwxMi4wNiAxNC45TDkuMDYgMTEuOVoiIGZpbGw9IiMwMDAiLz4KPHA+YXRoIGQ9Ik0xMi4wNiA4LjlMMTUuMDYgNS45TDE4LjA2IDguOUwxNS4wNiAxMS45TDEyLjA2IDguOVoiIGZpbGw9IiMwMDAiLz4KPC9zdmc+") 12 12, auto' : undefined }}
        >
          <Layer>
            {/* Page boundary */}
            <CanvasPageEditArea width={canvasWidth} height={canvasHeight} x={pageOffsetX} y={pageOffsetY} />
            
            {/* Background Layer */}
            {renderBackground()}
            
            {/* Canvas elements */}
            <Group x={pageOffsetX} y={pageOffsetY}>
              {currentPage?.elements.map(element => (
                <Group key={`${element.id}-${element.questionId || 'no-question'}`}>
                  <CanvasItemComponent
                    element={element}
                    isSelected={state.selectedElementIds.includes(element.id)}
                    zoom={zoom}
                    hoveredElementId={state.hoveredElementId}
                    onSelect={(e) => {
                    // Handle style painter click
                    if (state.stylePainterActive && e?.evt?.button === 0) {
                      dispatch({ type: 'APPLY_COPIED_STYLE', payload: element.id });
                      return;
                    }
                    
                    // Block all selection for answer_only users except double-click on answer textboxes
                    if (state.editorInteractionLevel === 'answer_only') {
                      // Only allow double-click on answer textboxes
                      if (element.textType === 'answer' && e?.evt?.detail === 2) {
                        // Allow double-click to edit answer
                        window.dispatchEvent(new CustomEvent('editText', {
                          detail: { elementId: element.id }
                        }));
                      }
                      return;
                    }
                    
                    // Block all selection for no_access users
                    if (state.editorInteractionLevel === 'no_access') {
                      return;
                    }
                    
                    // Handle Ctrl+click for multi-selection and deselection
                    if (e?.evt?.ctrlKey || e?.evt?.metaKey) {
                      const isSelected = state.selectedElementIds.includes(element.id);
                      if (isSelected) {
                        // Deselect: Remove from selection
                        dispatch({ 
                          type: 'SET_SELECTED_ELEMENTS', 
                          payload: state.selectedElementIds.filter(id => id !== element.id) 
                        });
                      } else {
                        // Select: Add to selection
                        dispatch({ 
                          type: 'SET_SELECTED_ELEMENTS', 
                          payload: [...state.selectedElementIds, element.id] 
                        });
                      }
                      return;
                    }
                    
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
                      // For question-answer pairs, select both elements
                      if (element.textType === 'question' || element.textType === 'answer') {
                        let linkedElement: CanvasElement | undefined;
                        if (element.textType === 'question') {
                          linkedElement = currentPage?.elements.find(el => el.questionElementId === element.id);
                        } else if (element.questionElementId) {
                          linkedElement = currentPage?.elements.find(el => el.id === element.questionElementId);
                        }
                        
                        if (linkedElement) {
                          dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id, linkedElement.id] });
                        } else {
                          dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] });
                        }
                      } else {
                        // Regular element selection
                        dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] });
                      }
                    }
                  }}
                  isMovingGroup={isMovingGroup}

                  onDragStart={(e) => {
                    // Block dragging for answer_only and no_access users
                    if (state.editorInteractionLevel === 'answer_only' || state.editorInteractionLevel === 'no_access') {
                      e.target.stopDrag();
                      return;
                    }
                    
                    dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Move Element' });
                    
                    // For question-answer pairs, check if elements are already selected
                    if (element.textType === 'question' || element.textType === 'answer') {
                      let linkedElement: CanvasElement | undefined;
                      if (element.textType === 'question') {
                        linkedElement = currentPage?.elements.find(el => el.questionElementId === element.id);
                      } else if (element.questionElementId) {
                        linkedElement = currentPage?.elements.find(el => el.id === element.questionElementId);
                      }
                      
                      if (linkedElement) {
                        // Only auto-select both if neither is currently selected
                        const elementSelected = state.selectedElementIds.includes(element.id);
                        const linkedSelected = state.selectedElementIds.includes(linkedElement.id);
                        
                        if (!elementSelected && !linkedSelected) {
                          // Neither selected - select both
                          dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id, linkedElement.id] });
                          setTimeout(() => {
                            if (transformerRef.current) {
                              transformerRef.current.forceUpdate();
                              transformerRef.current.getLayer()?.batchDraw();
                            }
                          }, 0);
                        } else if (elementSelected && !linkedSelected) {
                          // Only this element selected - keep single selection
                          dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] });
                        } else if (!elementSelected && linkedSelected) {
                          // Only linked element selected - keep single selection
                          dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [linkedElement.id] });
                        }
                        // If both already selected, keep current selection
                      } else {
                        dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] });
                      }
                    } else if (!state.selectedElementIds.includes(element.id)) {
                      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [element.id] });
                    }
                    setIsDragging(true);
                  }}
                  onDragMove={(e) => {
                    const currentX = e.target.x();
                    const currentY = e.target.y();
                    const snapped = handleSnapPosition(e.target, currentX, currentY, true); // Enable grid snapping
                    
                    if (snapped.x !== currentX || snapped.y !== currentY) {
                      e.target.x(snapped.x);
                      e.target.y(snapped.y);
                    }
                  }}
                  onDragEnd={(e) => {
                    // Clear guidelines when drag ends
                    setSnapGuidelines([]);
                    
                    // Update position of linked element only if both elements are selected
                    if (element.textType === 'question' || element.textType === 'answer') {
                      let linkedElement: CanvasElement | undefined;
                      if (element.textType === 'question') {
                        linkedElement = currentPage?.elements.find(el => el.questionElementId === element.id);
                      } else if (element.questionElementId) {
                        linkedElement = currentPage?.elements.find(el => el.id === element.questionElementId);
                      }
                      
                      // Only move linked element if both are currently selected
                      if (linkedElement && state.selectedElementIds.includes(linkedElement.id)) {
                        const deltaX = e.target.x() - element.x;
                        const deltaY = e.target.y() - element.y;
                        
                        dispatch({
                          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                          payload: {
                            id: linkedElement.id,
                            updates: {
                              x: linkedElement.x + deltaX,
                              y: linkedElement.y + deltaY
                            }
                          }
                        });
                      }
                    }
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
              
              {/* Show all accumulated brush strokes with their individual settings */}
              {brushStrokes.map((strokeData, index) => (
                <MaterializedBrush 
                  key={`brush-stroke-${index}`} 
                  points={strokeData.points}
                  stroke={strokeData.strokeColor}
                  strokeWidth={strokeData.strokeWidth}
                />
              ))}
              
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
            
            {/* Selection rectangle for grouped element */}
            {state.selectedGroupedElement && (() => {
              const groupElement = currentPage?.elements.find(el => el.id === state.selectedGroupedElement.groupId);
              const childElement = groupElement?.groupedElements?.find(el => el.id === state.selectedGroupedElement.elementId);
              if (groupElement && childElement) {
                return (
                  <SelectionRectangle
                    x={pageOffsetX + groupElement.x + childElement.x}
                    y={pageOffsetY + groupElement.y + childElement.y}
                    width={childElement.width || 100}
                    height={childElement.height || 100}
                    visible={true}
                  />
                );
              }
              return null;
            })()}
            
            {/* Snap guidelines */}
            <SnapGuidelines guidelines={snapGuidelines} />
            
            {/* Transformer for selected elements */}
            <CanvasTransformer
              key={state.selectedElementIds.length === 1 ? `${state.selectedElementIds[0]}-${currentPage?.elements.find(el => el.id === state.selectedElementIds[0])?.width}-${currentPage?.elements.find(el => el.id === state.selectedElementIds[0])?.height}` : 'multi'}
              ref={transformerRef}
              keepRatio={state.selectedElementIds.length === 1 && currentPage?.elements.find(el => el.id === state.selectedElementIds[0])?.type === 'image'}
              rotationSnaps={[0, 90, 180, 270]}
              rotationSnapTolerance={5}
              onDragStart={() => {
                dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Move Elements' });
              }}
              onDragMove={(e) => {
                const transformer = transformerRef.current;
                if (!transformer) return;
                
                const nodes = transformer.nodes();
                if (nodes.length === 0) return;
                
                if (nodes.length === 1) {
                  // Single element snapping
                  const node = nodes[0];
                  const currentX = node.x();
                  const currentY = node.y();
                  const snapped = handleSnapPosition(node, currentX, currentY, true);
                  
                  if (snapped.x !== currentX || snapped.y !== currentY) {
                    node.x(snapped.x);
                    node.y(snapped.y);
                  }
                } else {
                  // Multi-selection snapping using transformer as the node
                  const box = transformer.getClientRect();
                  const currentX = (box.x - stagePos.x) / zoom - pageOffsetX;
                  const currentY = (box.y - stagePos.y) / zoom - pageOffsetY;
                  
                  const snapped = handleSnapPosition(transformer, currentX, currentY, false);
                  
                  if (snapped.x !== currentX || snapped.y !== currentY) {
                    const deltaX = snapped.x - currentX;
                    const deltaY = snapped.y - currentY;
                    
                    // Apply delta to all selected nodes
                    nodes.forEach(node => {
                      node.x(node.x() + deltaX);
                      node.y(node.y() + deltaY);
                    });
                  }
                }
              }}
              onDragEnd={(e) => {
                setSnapGuidelines([]);
                
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
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) return oldBox;
                
                const transformer = transformerRef.current;
                if (!transformer) return newBox;
                
                const activeAnchor = transformer.getActiveAnchor();
                if (!activeAnchor) return newBox;
                
                const SNAP_THRESHOLD = 15;
                
                currentPage?.elements.forEach(otherElement => {
                  const node = transformer.nodes()[0];
                  if (!node || otherElement.id === node.id()) return;
                  
                  const otherBox = {
                    x: (otherElement.x + pageOffsetX),
                    y: (otherElement.y + pageOffsetY),
                    width: otherElement.width || 100,
                    height: otherElement.height || 100
                  };
                  
                  if (activeAnchor.includes('right') || activeAnchor === 'middle-right') {
                    const rightEdge = newBox.x + newBox.width;
                    if (Math.abs(rightEdge - otherBox.x) < SNAP_THRESHOLD) {
                      newBox.width = otherBox.x - newBox.x;
                    }
                    if (Math.abs(rightEdge - (otherBox.x + otherBox.width)) < SNAP_THRESHOLD) {
                      newBox.width = (otherBox.x + otherBox.width) - newBox.x;
                    }
                  }
                  
                  if (activeAnchor.includes('bottom') || activeAnchor === 'bottom-center') {
                    const bottomEdge = newBox.y + newBox.height;
                    if (Math.abs(bottomEdge - otherBox.y) < SNAP_THRESHOLD) {
                      newBox.height = otherBox.y - newBox.y;
                    }
                    if (Math.abs(bottomEdge - (otherBox.y + otherBox.height)) < SNAP_THRESHOLD) {
                      newBox.height = (otherBox.y + otherBox.height) - newBox.y;
                    }
                  }
                  
                  if (activeAnchor.includes('left') || activeAnchor === 'middle-left') {
                    if (Math.abs(newBox.x - otherBox.x) < SNAP_THRESHOLD) {
                      const diff = otherBox.x - newBox.x;
                      newBox.x = otherBox.x;
                      newBox.width = newBox.width - diff;
                    }
                    if (Math.abs(newBox.x - (otherBox.x + otherBox.width)) < SNAP_THRESHOLD) {
                      const diff = (otherBox.x + otherBox.width) - newBox.x;
                      newBox.x = otherBox.x + otherBox.width;
                      newBox.width = newBox.width - diff;
                    }
                  }
                  
                  if (activeAnchor.includes('top') || activeAnchor === 'top-center') {
                    if (Math.abs(newBox.y - otherBox.y) < SNAP_THRESHOLD) {
                      const diff = otherBox.y - newBox.y;
                      newBox.y = otherBox.y;
                      newBox.height = newBox.height - diff;
                    }
                    if (Math.abs(newBox.y - (otherBox.y + otherBox.height)) < SNAP_THRESHOLD) {
                      const diff = (otherBox.y + otherBox.height) - newBox.y;
                      newBox.y = otherBox.y + otherBox.height;
                      newBox.height = newBox.height - diff;
                    }
                  }
                });
                
                return newBox;
              }}
              rotationSnaps={[0, 90, 180, 270]}
              rotationSnapTolerance={5}
              onTransformStart={() => {
                dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Transform Elements' });
                // Dispatch custom events for each selected element
                state.selectedElementIds.forEach(elementId => {
                  window.dispatchEvent(new CustomEvent('transformStart', {
                    detail: { elementId }
                  }));
                });
              }}
              onTransformEnd={(e) => {
                // Dispatch custom events for each selected element
                state.selectedElementIds.forEach(elementId => {
                  window.dispatchEvent(new CustomEvent('transformEnd', {
                    detail: { elementId }
                  }));
                });
                
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
          onPaste={(() => {
            if (clipboard.length === 0) return undefined;
            const hasQuestionAnswer = clipboard.some(element => 
              element.textType === 'question' || element.textType === 'answer'
            );
            if (hasQuestionAnswer) {
              const currentPageId = state.currentBook?.pages[state.activePageIndex]?.id;
              if (clipboard.some(element => element.pageId === currentPageId)) {
                return undefined; // Hide paste option for same page
              }
              const currentPageNumber = state.activePageIndex + 1;
              const assignedUser = state.pageAssignments[currentPageNumber];
              if (assignedUser) {
                const questionElements = clipboard.filter(el => el.textType === 'question' && el.questionId);
                const userQuestions = getQuestionAssignmentsForUser(assignedUser.id);
                const hasConflict = questionElements.some(el => userQuestions.has(el.questionId));
                if (hasConflict) return undefined; // Hide paste option for conflicts
              }
            }
            return handlePasteItems;
          })()}
          onMoveToFront={handleMoveToFront}
          onMoveToBack={handleMoveToBack}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onGroup={handleGroup}
          onUngroup={handleUngroup}
          hasSelection={state.selectedElementIds.length > 0}
          hasClipboard={clipboard.length > 0}
          canGroup={state.selectedElementIds.length >= 2}
          canUngroup={state.selectedElementIds.length === 1 && currentPage?.elements.find(el => el.id === state.selectedElementIds[0])?.type === 'group' || (state.selectedElementIds.length === 1 && currentPage?.elements.find(el => el.id === state.selectedElementIds[0])?.type === 'brush-multicolor')}
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
      

      
      {showQuestionDialog && state.currentBook && token && user?.role !== 'author' && (
        <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Select Question</DialogTitle>
            </DialogHeader>
            <QuestionsManagerDialog
              bookId={state.currentBook.id}
              bookName={state.currentBook.name}
              mode="select"
              token={token}
              onQuestionSelect={(questionId, questionText) => {
                if (selectedQuestionElementId) {
                  const element = currentPage?.elements.find(el => el.id === selectedQuestionElementId);
                  
                  if (element?.textType === 'qna' || element?.textType === 'qna2' || element?.textType === 'qna_inline') {
                    // console.log('Updating QnA/QnA2 element with questionId:', questionId);
                    // For QnA elements, update the element with questionId and load existing answer
                    const updates = questionId === '' 
                      ? { questionId: undefined }
                      : { questionId: questionId };
                    
                    dispatch({
                      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                      payload: {
                        id: selectedQuestionElementId,
                        updates
                      }
                    });
                    
                    // If questionId is provided, check for existing answer in tempAnswers
                    if (questionId && questionId !== '') {
                      const assignedUser = state.pageAssignments[state.activePageIndex + 1];
                      const userIdToCheck = assignedUser?.id || user?.id;
                      
                      if (userIdToCheck) {
                        const existingAnswer = getAnswerText(questionId, userIdToCheck);
                        if (existingAnswer) {
                          // Answer exists in tempAnswers, no need to do anything
                          // The textbox will automatically display it via getDisplayText()
                        }
                      }
                    }
                  } else {
                    // For regular question elements
                    // Validate: Check if question already exists on this page
                    if (questionId && questionId !== '' && currentPage) {
                      const questionsOnPage = currentPage.elements
                        .filter(el => el.id !== selectedQuestionElementId && el.questionId === questionId)
                        .map(el => el.questionId);
                      
                      if (questionsOnPage.length > 0) {
                        const element = currentPage.elements.find(el => el.id === selectedQuestionElementId);
                        if (element) {
                          setAlertMessage('This question already exists on this page.');
                          const alertX = (element.x + (element.width || 100) / 2);
                          const alertY = (element.y + (element.height || 50) + 10);
                          setAlertPosition({ x: alertX, y: alertY });
                          
                          setTimeout(() => {
                            setAlertMessage(null);
                            setAlertPosition(null);
                          }, 3000);
                          return;
                        }
                      }
                    }
                    
                    const updates = questionId === '' 
                      ? { text: '', fontColor: '#9ca3af', questionId: undefined }
                      : { text: questionText, fontColor: '#1f2937', questionId: questionId };
                    dispatch({
                      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                      payload: {
                        id: selectedQuestionElementId,
                        updates
                      }
                    });
                    
                    const currentPageForAnswer = state.currentBook?.pages[state.activePageIndex];
                    if (currentPageForAnswer) {
                      const answerElement = currentPageForAnswer.elements.find(el => 
                        el.textType === 'answer' && el.questionElementId === selectedQuestionElementId
                      );
                      if (answerElement) {
                        if (questionId === '' || questionId === 0) {
                          // If resetting question, clear answer text
                          dispatch({
                            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                            payload: {
                              id: answerElement.id,
                              updates: { text: '', formattedText: '', questionId: undefined }
                            }
                          });
                        } else {
                          // Load existing answer for the new question
                          const assignedUser = state.pageAssignments[state.activePageIndex + 1];
                          const userIdToCheck = assignedUser?.id || user?.id;
                          
                          if (userIdToCheck) {
                            const existingAnswer = getAnswerText(questionId, userIdToCheck);
                            
                            dispatch({
                              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                              payload: {
                                id: answerElement.id,
                                updates: { 
                                  text: existingAnswer || '', 
                                  formattedText: existingAnswer || '',
                                  questionId: questionId
                                }
                              }
                            });
                            
                            // Update temp answers to ensure consistency
                            if (existingAnswer) {
                              dispatch({
                                type: 'UPDATE_TEMP_ANSWER',
                                payload: {
                                  questionId: questionId,
                                  text: existingAnswer,
                                  userId: userIdToCheck
                                }
                              });
                            }
                          }
                        }
                      }
                    }
                  }
                }
                setShowQuestionDialog(false);
                // Reset selectedQuestionElementId after a delay to allow questionSelected event to process
                setTimeout(() => setSelectedQuestionElementId(null), 100);
              }}
              onClose={() => {
                setShowQuestionDialog(false);
                setTimeout(() => setSelectedQuestionElementId(null), 100);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
      </CanvasPageContainer>
      
      {/* Alert notification */}
      {alertMessage && alertPosition && (
        <div 
          className="fixed z-50 w-64"
          style={{
            left: `${alertPosition.x - 128}px`,
            top: `${alertPosition.y}px`
          }}
        >
          <Alert>{alertMessage}</Alert>
        </div>
      )}
    </>
  );
}
// Re-export components for external use
export { CanvasContainer } from './canvas-container';
export { CanvasStage } from './canvas-stage';
export { CanvasTransformer } from './canvas-transformer';
export { SelectionRectangle } from './selection-rectangle';
export { PreviewLine, PreviewShape, PreviewTextbox, PreviewBrush } from './preview-elements';
export { SnapGuidelines } from './snap-guidelines';
