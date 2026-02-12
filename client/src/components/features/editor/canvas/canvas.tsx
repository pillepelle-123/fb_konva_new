import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Layer, Rect, Group, Text } from 'react-konva';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';
import type { CanvasElement } from '../../../../context/editor-context';
import type { ColorPalette } from '../../../../types/template-types';
import CanvasItemComponent from '../canvas-items';
import { CanvasStage } from './canvas-stage';
import { CanvasTransformer } from './canvas-transformer';
import { SelectionRectangle } from './selection-rectangle';
import { PreviewLine, PreviewShape, PreviewTextbox, PreviewBrush, MaterializedBrush } from './preview-elements';
import { CanvasContainer } from './canvas-container';
import { SnapGuidelines } from './snap-guidelines';
import CanvasErrorBoundary from './CanvasErrorBoundary';
import { CanvasOverlayProvider, CanvasOverlayContainer, CanvasOverlayPortal } from './canvas-overlay';
import { CanvasBackground } from './CanvasBackground';
import { CanvasOverlays } from './CanvasOverlays';
import { PerformanceMonitor } from './PerformanceMonitor';
import { useCanvasDrawing } from './hooks/useCanvasDrawing';
import { useCanvasSelection } from './hooks/useCanvasSelection';
import { useCanvasZoomPan } from './hooks/useCanvasZoomPan';
import { useCanvasItemActions } from './hooks/useCanvasItemActions';
import { calculateQuestionStyle, calculateAnswerStyle, parseQuestionPayload, stripHtml } from '../canvas-items/textbox-qna-utils';

import { getActiveTemplateIds } from '../../../../utils/template-inheritance';
import { Tooltip } from '../../../ui/composites/tooltip';
import { Skeleton } from '../../../ui/primitives';
import { Lock, LockOpen } from 'lucide-react';
import { snapPosition, snapDimensions, type SnapGuideline } from '../../../../utils/snapping';

import { createPreviewImage, resolveBackgroundImageUrl } from '../../../../utils/background-image-utils';
import { getThemePaletteId, getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { BOOK_PAGE_DIMENSIONS, DEFAULT_BOOK_ORIENTATION, DEFAULT_BOOK_PAGE_SIZE, SAFETY_MARGIN_PX } from '../../../../constants/book-formats';
import { getConsistentColor } from '../../../../utils/consistent-color';
import { calculateContrastColor } from '../../../../utils/contrast-color';
import ProfilePicture from '../../users/profile-picture';

import {
  smoothPath,
  isPointWithinSelectedElements,
  getElementsInSelection
} from './canvas-utils';
import {
  createBadgeStyleWithoutProfile,
  createBadgeStyleWithProfile
} from './canvas-utils';
import { colorPalettes } from '../../../../data/templates/color-palettes';
import { getStickerById, loadStickerRegistry } from '../../../../data/templates/stickers';
import { toast } from 'sonner';


const CanvasPageEditArea = React.memo(function CanvasPageEditArea({ width, height, x = 0, y = 0 }: { width: number; height: number; x?: number; y?: number }) {
  return (
    <Rect
      id="canvas-page-edit-area"
      name="canvas-page-bounds"
      x={x}
      y={y}
      width={width}
      height={height}
      fill="white"
      stroke="#e5e7eb"
      strokeWidth={11}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
});


const CanvasPageContainer = React.memo(function CanvasPageContainer({ children, assignedUser }: { children: React.ReactNode; assignedUser?: { name: string } | null }) {
  const borderStyle = React.useMemo(() => assignedUser ? {
    borderTop: `5px solid #${getConsistentColor(assignedUser.name)}`,
    borderBottom: `5px solid #${getConsistentColor(assignedUser.name)}`
  } : {
    borderTop: `5px solid hsl(var(--muted))`,
    borderBottom: `5px solid hsl(var(--muted))`
  }, [assignedUser]);

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
});

const PAGE_TYPE_LABELS: Record<string, string> = {
  'front-cover': 'Front Cover',
  'back-cover': 'Back Cover',
  'inner-front': 'Inner Front',
  'inner-back': 'Inner Back',
  // 'first-page' and 'last-page' are regular content pages, not special
  // 'first-page': 'First Page',
  // 'last-page': 'Last Page'
};

type PageBadgeMeta = {
  label: string;
};



type BackgroundImageEntry = {
  full: HTMLImageElement;
  preview: HTMLImageElement;
};

const CREATION_TOOLS = new Set([
  'brush',
  'line',
  'rect',
  'circle',
  'triangle',
  'polygon',
  'heart',
  'star',
  'speech-bubble',
  'dog',
  'cat',
  'smiley',
  'text',
  'question',
  'answer',
  'qna',
  'free_text',
  'image',
  'sticker',
  'qr_code'
]);




export default function Canvas() {
  const {
    state,
    dispatch,
    getAnswerText,
    getQuestionAssignmentsForUser,
    undo,
    redo,
    canAccessEditor,
    canCreateElement,
    canEditElement,
    canDeleteElement,
    canCreateElementType,
    canDeleteElementType,
    canEditBookSettings,
    ensurePagesLoaded,
    isQuestionAvailableForUser,
    getQuestionText
  } = useEditor();
  const { token, user } = useAuth();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActivePageIndexRef = useRef<number | null>(null);
  const fitToViewRef = useRef<(() => void) | null>(null);
  const activePageIndexForTransformerRef = useRef<number>(state.activePageIndex);
  const justCompletedSelectionRef = useRef<boolean>(false);
  const isDraggingGroupRef = useRef<boolean>(false);
  const transformerBatchActiveRef = useRef(false);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [panelOffset, setPanelOffset] = useState(0);
  const canCreateElements = canCreateElement();
  const canEditElements = canEditElement();
  const canDeleteElements = canDeleteElement();
  const canCreateQna = canCreateElementType('qna');
  const canDeleteQna = canDeleteElementType('qna');
  const isCreationToolActive = CREATION_TOOLS.has(state.activeTool);

  // Clear transformer when page changes - prevents "setAttrs of undefined" error
  // when old page's nodes are removed and Transformer tries to update them
  if (activePageIndexForTransformerRef.current !== state.activePageIndex) {
    activePageIndexForTransformerRef.current = state.activePageIndex;
    if (transformerRef.current) {
      try {
        transformerRef.current.nodes([]);
      } catch {
        // Ignore - transformer might be in invalid state
      }
    }
  }

  const addElementIfAllowed = useCallback(
    (element: CanvasElement, options?: { skipHistory?: boolean }) => {
      if (!canCreateElements) return false;
      if (element.textType === 'qna' && !canCreateQna) return false;
      dispatch({ type: 'ADD_ELEMENT', payload: element, skipHistory: options?.skipHistory });
      return true;
    },
    [canCreateElements, canCreateQna, dispatch]
  );

  const deleteElementIfAllowed = useCallback(
    (elementId: string, options?: { skipHistory?: boolean }) => {
      if (!canDeleteElements) return false;
      // Clear transformer before delete to prevent "setAttrs of undefined" error
      // when the Konva node is removed and Transformer tries to update removed nodes
      if (transformerRef.current && state.selectedElementIds.includes(elementId)) {
        try {
          transformerRef.current.nodes([]);
        } catch {
          // Ignore - transformer might be in invalid state
        }
      }
      dispatch({ type: 'DELETE_ELEMENT', payload: elementId, skipHistory: options?.skipHistory });
      return true;
    },
    [canDeleteElements, dispatch, state.selectedElementIds]
  );

  // Partner page rendering optimization
  // Hide partner page during interactions and use Konva cache for better performance
  const partnerPageGroupRef = useRef<Konva.Group>(null);
  const [hidePartnerDuringInteraction, setHidePartnerDuringInteraction] = useState(false);
  const showPartnerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track zooming state for disabling interactions during zoom
  const isZoomingRef = useRef(false);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track panning state for disabling transformer updates
  const isInteractingRef = useRef(false);

  // Direct Panning Optimization: Store pending stage position to avoid state updates during panning
  const [pendingStagePos, setPendingStagePos] = useState<{x: number, y: number} | null>(null);

  // Feature Flag for Transformer Optimization (can be controlled via localStorage in dev)
  const TRANSFORMER_OPTIMIZATION_ENABLED = process.env.NODE_ENV === 'development'
    ? localStorage.getItem('transformer-optimization') !== 'false' // Default true in dev, can be disabled
    : true; // Always enabled in production

  // Feature Flag for Direct Stage Panning Optimization
  const DIRECT_PANNING_ENABLED = process.env.NODE_ENV === 'development'
    ? localStorage.getItem('direct-panning') !== 'false' // Default true in dev, can be disabled
    : true; // Always enabled in production

  // Feature Flag for Adaptive Pixel Ratio (dynamically adjust rendering resolution based on zoom)
  const ADAPTIVE_PIXEL_RATIO_ENABLED = true;

  // Feature Flag for Adaptive Image Resolution (load images at different resolutions based on zoom)
  const ADAPTIVE_IMAGE_RESOLUTION_ENABLED = process.env.NODE_ENV === 'development'
    ? localStorage.getItem('adaptive-image-resolution') !== 'false' // Default true in dev, can be disabled
    : true; // Always enabled in production

  // Debounced Canvas Updates for smoother performance
  const useDebouncedCanvasUpdate = () => {
    const timeoutRef = useRef<NodeJS.Timeout>();

    const debouncedBatchDraw = useCallback((stage: Konva.Stage | null, delay: number = 16) => {
      if (!stage) return;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new debounced update
      timeoutRef.current = setTimeout(() => {
        try {
          stage.batchDraw();
        } catch (error) {
          console.debug('Debounced canvas update error:', error);
        }
      }, delay);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return debouncedBatchDraw;
  };

  const debouncedBatchDraw = useDebouncedCanvasUpdate();

  const setStageCursor = useCallback((cursor: string | null) => {
    const stage = stageRef.current;
    if (!stage) return;
    const nextCursor = cursor ?? '';
    if (stage.container().style.cursor !== nextCursor) {
      stage.container().style.cursor = nextCursor;
    }
  }, []);

  // PERFORMANCE OPTIMIZATION: Throttle function for selection rectangle updates
  // Simple throttle implementation - limits function calls to once per delay period
  const throttle = useCallback(<T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): T => {
    let lastCallTime = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    let lastArgs: Parameters<T> | null = null;

    const throttled = ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;

      lastArgs = args;

      if (timeSinceLastCall >= delay) {
        // Enough time has passed, call immediately
        lastCallTime = now;
        func(...args);
      } else {
        // Schedule call for when delay period expires
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          lastCallTime = Date.now();
          if (lastArgs) {
            func(...lastArgs);
            lastArgs = null;
          }
          timeoutId = null;
        }, delay - timeSinceLastCall);
      }
    }) as T;

    return throttled;
  }, []);

  // Smart canvas update function - uses debouncing for non-critical updates
  const smartCanvasUpdate = useCallback((immediate: boolean = false) => {
    if (!stageRef.current) return;

    if (immediate) {
      // Immediate update for critical UI changes (selections, etc.)
      try {
        stageRef.current.batchDraw();
      } catch (error) {
        console.debug('Immediate canvas update error:', error);
      }
    } else {
      // Debounced update for smoother performance during interactions
      debouncedBatchDraw(stageRef.current);
    }
  }, [debouncedBatchDraw]);

  // Transformer optimization: Batched transformer updates for better performance
  const batchedTransformerUpdate = useCallback(() => {
    if (!transformerRef.current) return;

    if (TRANSFORMER_OPTIMIZATION_ENABLED) {
      // Optimized: Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        try {
          if (transformerRef.current) {
            transformerRef.current.forceUpdate();
            smartCanvasUpdate(true); // Immediate canvas update for transformer
          }
        } catch (error) {
          console.debug('Batched transformer update error:', error);
          // Fallback to legacy method
          legacyTransformerUpdate();
        }
      });
    } else {
      // Legacy method when optimization is disabled
      legacyTransformerUpdate();
    }
  }, [smartCanvasUpdate]);

  // Legacy transformer update (original implementation)
  const legacyTransformerUpdate = useCallback(() => {
    if (!transformerRef.current) return;

    try {
      transformerRef.current.forceUpdate();
      transformerRef.current.getLayer()?.batchDraw();
    } catch (error) {
      console.debug('Legacy transformer update error:', error);
    }
  }, []);

  // Use custom hooks for state management
  const drawingState = useCanvasDrawing();
  const selectionState = useCanvasSelection();
  const zoomPanState = useCanvasZoomPan();

  // Migration helpers - provide old state variable names for compatibility
  const {
    isDrawing, setIsDrawing, currentPath, setCurrentPath, brushStrokes, setBrushStrokes,
    isBrushMode, setIsBrushMode, isBrushModeRef,
    isDrawingLine, setIsDrawingLine, lineStart, setLineStart, previewLine, setPreviewLine,
    isDrawingShape, setIsDrawingShape, shapeStart, setShapeStart, previewShape, setPreviewShape,
    isDrawingTextbox, setIsDrawingTextbox, textboxStart, setTextboxStart, previewTextbox, setPreviewTextbox,
    showImageModal, setShowImageModal, pendingImagePosition, setPendingImagePosition, pendingImageElementId, setPendingImageElementId,
    showStickerModal, setShowStickerModal, pendingStickerPosition, setPendingStickerPosition, pendingStickerElementId, setPendingStickerElementId,
    showQrCodeModal, setShowQrCodeModal, pendingQrCodePosition, setPendingQrCodePosition
  } = drawingState;

  const {
    selectionRect, setSelectionRect, isSelecting, setIsSelecting, selectionStart, setSelectionStart,
    isMovingGroup, setIsMovingGroup, isMovingGroupRef, groupMoveStart, setGroupMoveStart, groupMoveStartRef, groupMoveInitialPositionsRef,
    lastClickTime, setLastClickTime, isDragging, setIsDragging,
    contextMenu, setContextMenu, clipboard, setClipboard, selectionModeState, setSelectionModeState
  } = selectionState;

  const {
    zoom, setZoom, registerSetZoom, stagePos, setStagePos,
    isPanning, setIsPanning, panStart, setPanStart, hasPanned, setHasPanned,
    hasManualZoom, setHasManualZoom, lastMousePos, setLastMousePos
  } = zoomPanState;

  // Sync pending stage position to state after panning ends
  useEffect(() => {
    if (!isPanning && pendingStagePos) {
      // Only update state if the position actually changed
      if (pendingStagePos.x !== stagePos.x || pendingStagePos.y !== stagePos.y) {
        setStagePos(pendingStagePos);
      }
      setPendingStagePos(null);
    }
  }, [isPanning, pendingStagePos, stagePos.x, stagePos.y, setStagePos]);

  // For backward compatibility
  const setZoomFromContext = setZoom;
  const [editingElement, setEditingElement] = useState<CanvasElement | null>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);

  // PERFORMANCE OPTIMIZATION: Throttled selection rectangle updates
  // Reduces update frequency from ~120fps to ~60fps during mouse move
  const throttledSetSelectionRect = useMemo(
    () => throttle((rect: typeof selectionRect) => {
      setSelectionRect(rect);
    }, 16), // ~60fps
    [] // throttle function is stable, no dependencies needed
  );
  
  // PERFORMANCE OPTIMIZATION: Throttled zoom updates
  // Reduces update frequency from ~120fps to ~15fps during zoom (wheel events)
  // This prevents excessive re-renders of all canvas elements during zoom
  // The throttle function automatically ensures the last zoom value is applied when zoom stops
  // Increased delay to 66ms (~15fps) for better performance - zoom visual feedback is less critical
  const throttledSetZoom = useMemo(
    () => throttle((newZoom: number, pointer?: { x: number; y: number }) => {
      setZoomFromContext(newZoom, pointer);
    }, 66), // ~15fps - zoom is less critical than selection, can be slower
    [setZoomFromContext] // setZoomFromContext is stable from useCanvasZoomPan
  );

  // PERFORMANCE OPTIMIZATION: Throttled stage position updates during panning
  // Reduces update frequency during mouse move events for better performance
  // Panning needs to be more responsive than zoom, so we use 16ms (~60fps)
  const throttledSetStagePos = useMemo(
    () => throttle((newPos: { x: number; y: number }) => {
      setStagePos(newPos);
    }, 16), // ~60fps - panning needs to be smooth but not as critical as selection
    [setStagePos] // setStagePos is stable from useCanvasZoomPan
  );
  
  const canManageQuestions = canEditBookSettings();

  // Prevent users without question permissions from opening question dialog
  useEffect(() => {
    if (showQuestionDialog && !canManageQuestions) {
      setShowQuestionDialog(false);
      setSelectedQuestionElementId(null);
    }
  }, [showQuestionDialog, canManageQuestions]);

  useEffect(() => {
    const handleQualityChange = (event: CustomEvent<{ mode?: 'preview' | 'full' }>) => {
      setBackgroundQuality(event.detail?.mode === 'full' ? 'full' : 'preview');
    };

    window.addEventListener('setBackgroundQuality', handleQualityChange as EventListener);
    return () => {
      window.removeEventListener('setBackgroundQuality', handleQualityChange as EventListener);
    };
  }, []);

  // Handle zoom events to disable interactions during zoom
  useEffect(() => {
    const handleZoomStart = () => {
      isZoomingRef.current = true;
      isInteractingRef.current = true;
      setHidePartnerDuringInteraction(true);
      
      // Clear existing timeouts
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
      if (showPartnerTimeoutRef.current) clearTimeout(showPartnerTimeoutRef.current);
      
      zoomTimeoutRef.current = setTimeout(() => {
        isZoomingRef.current = false;
        isInteractingRef.current = false;
        
        // Delay showing partner page to avoid re-renders during continuous zoom
        showPartnerTimeoutRef.current = setTimeout(() => {
          setHidePartnerDuringInteraction(false);
        }, 300);
      }, 200);
    };

    window.addEventListener('zoom-start', handleZoomStart);
    return () => {
      window.removeEventListener('zoom-start', handleZoomStart);
      if (showPartnerTimeoutRef.current) clearTimeout(showPartnerTimeoutRef.current);
    };
  }, []);

  // Alte Preview-Export-Logik entfernt - wird jetzt über Preview-Seiten gelöst
  const [selectedQuestionElementId, setSelectedQuestionElementId] = useState<string | null>(null);
  const [showQuestionSelectorModal, setShowQuestionSelectorModal] = useState(false);
  const [questionSelectorElementId, setQuestionSelectorElementId] = useState<string | null>(null);
  const editingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertPosition, setAlertPosition] = useState<{ x: number; y: number } | null>(null);

  const [outsidePageTooltip, setOutsidePageTooltip] = useState<{ x: number; y: number } | null>(null);
  // Verhindert, dass nach einem ungültigen Platzierungsversuch automatisch
  // auf das Auswahl-Tool zurückgeschaltet wird (siehe handleStageClick)
  const [suppressNextBackgroundClickSelect, setSuppressNextBackgroundClickSelect] = useState(false);
  const suppressNextBackgroundClickSelectRef = useRef(false);
  // Tooltip für die inaktive Seite eines Seitenpaares ("Click to enter this page.")
  const [inactivePageTooltip, setInactivePageTooltip] = useState<{ x: number; y: number } | null>(null);
  const [snapGuidelines, setSnapGuidelines] = useState<SnapGuideline[]>([]);
  const [hoveredSafetyMargin, setHoveredSafetyMargin] = useState<boolean>(false);
  const [safetyMarginTooltip, setSafetyMarginTooltip] = useState<{ x: number; y: number } | null>(null);
  const [imageQualityTooltip, setImageQualityTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [isManuallyHovering, setIsManuallyHovering] = useState<boolean>(false);
  // Track if actually transforming (not just selected)
  const isTransformingRef = useRef<boolean>(false);
  
  // Memoize panel offset calculation functions
  const panelOffsetFunctions = useMemo(() => {
    const findPanelElement = () => {
      // Find the tool settings panel - it's a Card with specific classes
      // Look for the panel in the editor layout (right side)
      const editorLayout = document.querySelector('.flex-1.flex.min-h-0');
      if (!editorLayout) return null;

      // The panel is the last child in the flex layout
      const children = Array.from(editorLayout.children);
      const panel = children[children.length - 1] as HTMLElement | null;

      // Verify it's the tool settings panel by checking for the Card classes
      if (panel && panel.classList.contains('border-t-0') && panel.classList.contains('border-b-0')) {
        return panel;
      }

      return null;
    };

    const updatePanelOffset = () => {
      const panel = findPanelElement();
      const container = containerRef.current;

      if (panel && container) {
        const panelRect = panel.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Calculate distance from right edge of container to right edge of panel
        // Then add panel width + spacing
        const distanceFromContainerRight = containerRect.right - panelRect.right;
        const spacing = 8; // 0.5rem spacing
        setPanelOffset(panelRect.width + distanceFromContainerRight + spacing);
      } else {
        // Fallback: use default panel widths
        // Expanded: 280px, Collapsed: 48px (w-12)
        // Use expanded width as default to ensure icon is always visible
        setPanelOffset(288); // 280px + 8px spacing
      }
    };

    return { findPanelElement, updatePanelOffset };
  }, []); // These functions don't depend on any changing values

  // Observe tool settings panel width to position lock icon correctly
  useEffect(() => {
    if (!state.settingsPanelVisible) {
      setPanelOffset(0);
      return;
    }

    const { updatePanelOffset } = panelOffsetFunctions;

    // Initial update with delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      updatePanelOffset();
    }, 100);

    // Observe panel for size changes
    const panel = panelOffsetFunctions.findPanelElement();
    let resizeObserver: ResizeObserver | null = null;

    if (panel) {
      resizeObserver = new ResizeObserver(() => {
        updatePanelOffset();
      });
      resizeObserver.observe(panel);
    }

    // Also observe window resize
    window.addEventListener('resize', updatePanelOffset);

    // Retry finding panel if not found initially
    const checkInterval = setInterval(() => {
      const panel = panelOffsetFunctions.findPanelElement();
      if (panel && !resizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          updatePanelOffset();
        });
        resizeObserver.observe(panel);
        updatePanelOffset();
      }
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(checkInterval);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', updatePanelOffset);
    };
  }, [state.settingsPanelVisible, panelOffsetFunctions]);

  // Update canvas container size when its bounding box changes
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const { width, height } = entry.contentRect;
          setContainerSize({ width, height });
        }
      });
      resizeObserver.observe(containerRef.current);
    } else {
      window.addEventListener('resize', updateSize);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', updateSize);
      }
    };
  }, []);

  // Background image cache for preloading
  // Memory optimization: Limit cache size to prevent excessive RAM usage
  const MAX_CACHE_ENTRIES = 20; // Maximum number of cached images
  const [backgroundImageCache, setBackgroundImageCache] = useState<Map<string, BackgroundImageEntry>>(new Map());
  const backgroundImageCacheRef = useRef<Map<string, BackgroundImageEntry>>(new Map());
  const loadingImagesRef = useRef<Set<string>>(new Set());
  const failedBackgroundUrlsRef = useRef<Set<string>>(new Set()); // Avoid retries and repeated errors
  const cacheAccessOrderRef = useRef<string[]>([]); // Track access order for LRU eviction
  const [backgroundQuality, setBackgroundQuality] = useState<'preview' | 'full'>('preview');
  
  // Snapping functionality
  const GUIDELINE_OFFSET = 15; // Increased for better snapping detection

  // PERFORMANCE OPTIMIZATION: Memoize currentPage only when the page reference actually changes
  // Don't recalculate when pages array reference changes but page content stays the same
  const currentPage = useMemo(
    () => state.currentBook?.pages[state.activePageIndex],
    // Use the page reference itself as dependency, not the pages array
    // This prevents recalculation when only one element changes
    [state.currentBook?.pages?.[state.activePageIndex], state.activePageIndex]
  );
  const selectedHasQna = Boolean(
    currentPage?.elements?.some((el) => state.selectedElementIds.includes(el.id) && el.textType === 'qna')
  );

  // Question selection handler
  const handleQuestionSelect = useCallback((questionId: string, questionText: string, questionPosition?: number, elementId?: string) => {
    // Use the provided elementId, or fall back to selectedQuestionElementId
    const targetElementId = elementId || selectedQuestionElementId;

    if (targetElementId) {
      const element = currentPage?.elements.find(el => el.id === targetElementId);

      if (element?.textType === 'qna') {
        // Calculate question order: use provided position, or count existing qna elements
        let order = questionPosition;
        if (order === undefined && currentPage) {
          const qnaElements = currentPage.elements.filter(
            el => el.textType === 'qna' && el.questionOrder !== undefined
          );
          order = qnaElements.length > 0
            ? Math.max(...qnaElements.map(el => el.questionOrder || 0)) + 1
            : 0;
        }

        // Update element with questionId and load question text
        dispatch({
          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
          payload: {
            id: targetElementId,
            updates: {
              questionId: questionId || undefined,
              text: questionText || '',
              formattedText: questionText || '',
              questionOrder: order
            }
          }
        });

        // Store question text in temp questions only if it doesn't exist yet
        if (questionId && questionText) {
          dispatch({
            type: 'UPDATE_TEMP_QUESTION',
            payload: { questionId, text: questionText }
          });
        }

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
            .filter(el => el.id !== targetElementId && el.questionId === questionId)
            .map(el => el.questionId);

          if (questionsOnPage.length > 0) {
            const element = currentPage.elements.find(el => el.id === targetElementId);
            if (element) {
              setAlertMessage('This question already exists on this page.');
              const alertX = (element.x + (element.width || 100) / 2);
              const alertY = element.y;
              setAlertPosition({ x: alertX, y: alertY });
              setTimeout(() => {
                setAlertMessage(null);
                setAlertPosition(null);
              }, 3000);
            }
            return;
          }
        }

        // Update element with questionId and load question text
        dispatch({
          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
          payload: {
            id: targetElementId,
            updates: {
              questionId: questionId || undefined,
              text: questionText || '',
              formattedText: questionText || '',
            }
          }
        });

        // Store question text in temp questions only if it doesn't exist yet
        if (questionId && questionText) {
          dispatch({
            type: 'UPDATE_TEMP_QUESTION',
            payload: { questionId, text: questionText }
          });
        }
      }
    }
    setShowQuestionDialog(false);
    // Reset selectedQuestionElementId after a delay to allow questionSelected event to process
    setTimeout(() => setSelectedQuestionElementId(null), 100);
  }, [selectedQuestionElementId, currentPage, state.pageAssignments, state.activePageIndex, user?.id, dispatch]);

  const partnerInfo = useMemo(() => {
    if (!state.currentBook) return null;
    const pages = state.currentBook.pages;
    const active = pages[state.activePageIndex];
    if (!active) return null;
    if (active.pagePairId) {
      const partnerIndex = pages.findIndex(
        (page, index) => page.pagePairId === active.pagePairId && index !== state.activePageIndex
      );
      if (partnerIndex !== -1) {
        return { page: pages[partnerIndex], index: partnerIndex };
      }
    } else {
      const inferredIndex = state.activePageIndex % 2 === 0 ? state.activePageIndex + 1 : state.activePageIndex - 1;
      if (inferredIndex >= 0 && inferredIndex < pages.length) {
        return { page: pages[inferredIndex], index: inferredIndex };
      }
    }
    return null;
  }, [state.currentBook, state.activePageIndex]);
  useEffect(() => {
    if (!state.currentBook) {
      return;
    }
    ensurePagesLoaded?.(state.activePageIndex, state.activePageIndex + 1);
    if (partnerInfo) {
      ensurePagesLoaded?.(partnerInfo.index, partnerInfo.index + 1);
    }
  }, [state.currentBook, state.activePageIndex, partnerInfo, ensurePagesLoaded]);
  const partnerPage = partnerInfo?.page ?? null;
  const hasPartnerPage = Boolean(partnerPage);
  const partnerPageIndex = partnerInfo?.index ?? -1;
  const totalPages = state.currentBook?.pages.length ?? 0;
  const activePageNumber = currentPage?.pageNumber ?? state.activePageIndex + 1;
  const isOwnerUser = Boolean(state.currentBook?.owner_id && user?.id === state.currentBook.owner_id);
  const isPublisherUser = isOwnerUser || state.userRole === 'publisher';
  const isCoverPage =
    currentPage?.pageType === 'back-cover' ||
    currentPage?.pageType === 'front-cover' ||
    activePageNumber === 1 ||
    activePageNumber === 2;
  const isReverseCoverPage =
    activePageNumber === 3 || (totalPages > 0 && activePageNumber === totalPages);
  const canEditCoverForUser = isPublisherUser && isCoverPage;
  // Only block rendering for reverse cover pages (page 3 or last page) if user is not a publisher
  // Do not block based on isPrintable flag for regular content pages
  const shouldBlockCanvasRendering =
    !canEditCoverForUser && isReverseCoverPage;
  const isPreviewTargetLocked = useCallback(
    (info?: { page: typeof currentPage; index: number }) => {
      if (!info || !info.page) return false;
      const targetPageNumber = info.page.pageNumber ?? info.index + 1;
      if (targetPageNumber === 3) return true;
      if (totalPages > 0 && targetPageNumber === totalPages) return true;
      return false;
    },
    [totalPages]
  );
  const previewTargetLocked = isPreviewTargetLocked(partnerInfo ?? undefined);
  const lockedPreviewPattern = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const size = 256;
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = size;
    patternCanvas.height = size;
    const ctx = patternCanvas.getContext('2d');
    if (!ctx) return null;
    ctx.strokeStyle = '#c7cdd6';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, size);
    ctx.lineTo(size * 0.75, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.25, size);
    ctx.lineTo(size * 1.25, 0);
    ctx.stroke();
    return patternCanvas;
  }, []);
  const getPaletteForPage = (page?: typeof currentPage) => {
    // Get page color palette (or book color palette if page.colorPaletteId is null)
    const pageColorPaletteId = page?.colorPaletteId ?? null;
    const bookColorPaletteId = state.currentBook?.colorPaletteId ?? null;

    // If book.colorPaletteId is null, use theme's default palette
    const bookThemeId = state.currentBook?.bookTheme || state.currentBook?.themeId || 'default';
    const bookThemePaletteId = !bookColorPaletteId ? getThemePaletteId(bookThemeId) : null;

    // Determine effective palette: page palette > book palette > theme's default palette
    const effectivePaletteId = pageColorPaletteId ?? bookColorPaletteId ?? bookThemePaletteId;

    if (effectivePaletteId === null) {
      return { paletteId: null as string | null, palette: null as ColorPalette | null };
    }

    const palette = colorPalettes.find((item) => item.id === effectivePaletteId) ?? null;
    return { paletteId: effectivePaletteId, palette };
  };

  // Phase 2.3: Determine if element should be interactive based on current tool
  // This optimizes performance by reducing event listeners on non-interactive elements
  const shouldElementBeInteractive = useCallback((element: CanvasElement): boolean => {
    // Always interactive in select mode (for selection, dragging, etc.)
    if (state.activeTool === 'select') {
      return true;
    }

    // In brush mode: Only shapes can be painted on
    if (state.activeTool === 'brush') {
      return ['rect', 'circle', 'line', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(element.type);
    }

    // In text mode: Only text elements are interactive
    if (state.activeTool === 'text') {
      return element.type === 'text';
    }

    // In image mode: Only image elements are interactive
    if (state.activeTool === 'image') {
      return element.type === 'image' || element.type === 'placeholder';
    }

    // In sticker mode: Only sticker elements are interactive
    if (state.activeTool === 'sticker') {
      return element.type === 'sticker';
    }

    // For any other tool mode: Elements are not interactive
    // This reduces event listener overhead when using specialized tools
    return false;
  }, [state.activeTool]);

  // Memoize safety margin colors - used frequently in rendering
  const safetyMarginColors = useMemo(() => {
    const activeColor = calculateContrastColor(currentPage, getPaletteForPage, 0.15);
    const partnerColor = partnerPage ? calculateContrastColor(partnerPage, getPaletteForPage, 0.15) : '#e5e7eb';

    return {
      active: activeColor,
      partner: partnerColor
    };
  }, [currentPage, partnerPage, state.currentBook?.colorPaletteId, state.currentBook?.bookTheme, getPaletteForPage]);

  const safetyMarginStrokeColor = safetyMarginColors.active;
  const partnerSafetyMarginStrokeColor = safetyMarginColors.partner;

  // Helper function to get template IDs for defaults (uses getActiveTemplateIds for proper inheritance)
  const getTemplateIdsForDefaults = useCallback(() => {
    const activeTemplateIds = getActiveTemplateIds(currentPage, state.currentBook);
    
    // Get theme IDs
    const pageTheme = activeTemplateIds.themeId;
    const bookTheme = state.currentBook?.bookTheme || state.currentBook?.themeId || 'default';
    
    // Get palette IDs with theme fallback
    const pageColorPaletteId = currentPage?.colorPaletteId ?? null;
    const bookColorPaletteId = state.currentBook?.colorPaletteId ?? null;
    const bookThemePaletteId = !bookColorPaletteId ? getThemePaletteId(bookTheme) : null;
    const effectiveBookColorPaletteId = bookColorPaletteId ?? bookThemePaletteId;
    
    return {
      pageTheme,
      bookTheme,
      pageColorPaletteId,
      bookColorPaletteId: effectiveBookColorPaletteId,
      pageLayoutTemplateId: currentPage?.layoutTemplateId ?? null,
      bookLayoutTemplateId: state.currentBook?.layoutTemplateId ?? null
    };
  }, [state.currentBook, state.activePageIndex]);

  const buildPageBadgeMeta = useCallback(
    (page?: typeof currentPage | null): PageBadgeMeta | null => {
      if (!page) return null;
      const pageIndex =
        state.currentBook?.pages?.findIndex((entry) => entry.id === page.id) ?? -1;
      const derivedPageNumber =
        page.pageNumber ?? (pageIndex >= 0 ? pageIndex + 1 : null);
      const numberLabel =
        derivedPageNumber && derivedPageNumber > 0
          ? `Page ${derivedPageNumber}`
          : null;
      // Only show special page labels for actual special pages (not first-page/last-page)
      const specialName =
        page.pageType && 
        page.pageType !== 'content' && 
        page.pageType !== 'first-page' && 
        page.pageType !== 'last-page'
          ? PAGE_TYPE_LABELS[page.pageType] ?? page.pageType
          : null;
      const labelSegments = [];
      if (numberLabel) {
        labelSegments.push(numberLabel);
      }
      if (specialName) {
        labelSegments.push(specialName);
      }
      const label = labelSegments.length ? labelSegments.join(' · ') : 'Page';
      return { label };
    },
    [state.currentBook?.pages]
  );
  const { paletteId: activePaletteId, palette: activePalette } = getPaletteForPage(currentPage);
  const activePageBadgeMeta = useMemo(
    () => buildPageBadgeMeta(currentPage),
    [buildPageBadgeMeta, currentPage]
  );
  const previewPageBadgeMeta = useMemo(
    () => buildPageBadgeMeta(partnerPage),
    [buildPageBadgeMeta, partnerPage]
  );
  // Memoize canvas dimensions and positioning - used in many places
  const canvasDimensions = useMemo(() => {
    const orientation = state.currentBook?.orientation || DEFAULT_BOOK_ORIENTATION;
    const pageSize = state.currentBook?.pageSize || DEFAULT_BOOK_PAGE_SIZE;
    const dimensions = BOOK_PAGE_DIMENSIONS[pageSize as keyof typeof BOOK_PAGE_DIMENSIONS];
    const canvasWidth = orientation === 'landscape' ? dimensions.height : dimensions.width;
    const canvasHeight = orientation === 'landscape' ? dimensions.width : dimensions.height;
    const spreadGapCanvas = hasPartnerPage ? canvasWidth * 0.05 : 0;
    const spreadWidthCanvas = hasPartnerPage ? canvasWidth * 2 + spreadGapCanvas : canvasWidth;
    const isActiveLeft = partnerInfo ? state.activePageIndex <= partnerInfo.index : true;
    const activePageOffsetX = partnerInfo && !isActiveLeft ? canvasWidth + spreadGapCanvas : 0;
    const previewPageOffsetX = partnerInfo ? (isActiveLeft ? canvasWidth + spreadGapCanvas : 0) : null;
    const pageOffsetY = 0;

    return {
      orientation,
      pageSize,
      canvasWidth,
      canvasHeight,
      spreadGapCanvas,
      spreadWidthCanvas,
      isActiveLeft,
      activePageOffsetX,
      previewPageOffsetX,
      pageOffsetY
    };
  }, [state.currentBook?.orientation, state.currentBook?.pageSize, hasPartnerPage, partnerInfo, state.activePageIndex]);

  // Extract for easier access
  const {
    canvasWidth,
    canvasHeight,
    spreadGapCanvas,
    spreadWidthCanvas,
    isActiveLeft,
    activePageOffsetX,
    previewPageOffsetX,
    pageOffsetY
  } = canvasDimensions;

  const isPointerOutsideActivePage = useCallback((pos: { x: number; y: number }) => {
    const x = (pos.x - stagePos.x) / zoom - activePageOffsetX;
    const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
    return x < 0 || y < 0 || x > canvasWidth || y > canvasHeight;
  }, [stagePos.x, stagePos.y, zoom, activePageOffsetX, pageOffsetY, canvasWidth, canvasHeight]);

  // PERFORMANCE OPTIMIZATION: Memoize elementsInSelection calculation
  // Calculate once per selectionRect change instead of for each element
  // This reduces complexity from O(n²) to O(n) during selection rectangle dragging
  const elementsInSelection = useMemo(() => {
    if (!selectionRect.visible || !currentPage) {
      return new Set<string>();
    }
    return new Set(getElementsInSelection(
      currentPage,
      selectionRect,
      activePageOffsetX,
      pageOffsetY
    ));
  }, [selectionRect, currentPage, activePageOffsetX, pageOffsetY]);

  // Adaptive Pixel Ratio - reduce rendering resolution at high zoom levels for better performance
  const adaptivePixelRatio = useMemo(() => {
    if (!ADAPTIVE_PIXEL_RATIO_ENABLED) return 1;

    // At zoom levels >= 200%, reduce pixel ratio to improve performance
    // At zoom levels >= 160%, reduce slightly for medium-high zoom
    // At zoom levels < 50%, slightly increase for sharper display on high-DPI screens
    if (zoom >= 2.0) return 0.75; // 25% reduction at high zoom
    if (zoom >= 1.6) return 0.85; // 15% reduction at medium-high zoom
    if (zoom < 0.5) return 1.25; // Slight increase for very low zoom
    return 1; // Standard ratio for normal zoom levels
  }, [zoom, ADAPTIVE_PIXEL_RATIO_ENABLED]);

  // Alert helper functions
  const showCoverRestrictionAlert = useCallback(
    (message: string) => {
      setAlertMessage(message);
      setAlertPosition({
        x: activePageOffsetX + canvasWidth / 2,
        y: pageOffsetY + 60
      });
      setTimeout(() => {
        setAlertMessage(null);
        setAlertPosition(null);
      }, 2500);
    },
    [activePageOffsetX, canvasWidth, pageOffsetY]
  );

  const showOutsidePageTooltip = useCallback(
    (clientX: number, clientY: number) => {
      suppressNextBackgroundClickSelectRef.current = true;
      setOutsidePageTooltip({ x: clientX, y: clientY - 40 });
      setSuppressNextBackgroundClickSelect(true);
      // Auto-hide after a short delay so the user can quickly try again
      window.setTimeout(() => {
        setOutsidePageTooltip(null);
      }, 1800);
    },
    []
  );

  useEffect(() => {
    const handleImageQualityTooltip = (event: CustomEvent<{ text: string; clientX: number; clientY: number }>) => {
      setImageQualityTooltip({
        x: event.detail.clientX,
        y: event.detail.clientY,
        text: event.detail.text
      });
    };

    const handleImageQualityTooltipHide = () => {
      setImageQualityTooltip(null);
    };

    window.addEventListener('imageQualityTooltip', handleImageQualityTooltip as EventListener);
    window.addEventListener('imageQualityTooltipHide', handleImageQualityTooltipHide);

    return () => {
      window.removeEventListener('imageQualityTooltip', handleImageQualityTooltip as EventListener);
      window.removeEventListener('imageQualityTooltipHide', handleImageQualityTooltipHide);
    };
  }, []);

  // Item actions hook
  const itemActions = useCanvasItemActions({
    state,
    clipboard,
    setClipboard,
    dispatch,
    getQuestionAssignmentsForUser,
    currentPage,
    isCoverPage,
    showCoverRestrictionAlert,
    setContextMenu,
    canCreateQna,
    canDeleteQna
  });

  const BADGE_VERTICAL_SCREEN_GAP = 32;
  const getBadgeScreenPosition = (offsetX: number | null) => {
      if (offsetX === null) return null;
    const centerScreenX = zoomPanState.stagePos.x + (offsetX + canvasWidth / 2) * zoomPanState.zoom;
    const pageTopScreenY = zoomPanState.stagePos.y + pageOffsetY * zoomPanState.zoom;
      return {
        x: centerScreenX,
        y: pageTopScreenY - BADGE_VERTICAL_SCREEN_GAP
      };
  };

  const previewLockBadgeScreen = useMemo(() => {
    if (!partnerPage || !previewTargetLocked || previewPageOffsetX === null) {
      return null;
    }
    const centerX = previewPageOffsetX + canvasWidth / 2;
    const centerY = pageOffsetY + canvasHeight / 2;
    return {
      x: stagePos.x + centerX * zoom,
      y: stagePos.y + centerY * zoom
    };
  }, [partnerPage, previewTargetLocked, previewPageOffsetX, canvasWidth, canvasHeight, pageOffsetY, stagePos.x, stagePos.y, zoom]);
  const renderBadgeSegments = useCallback(
    (meta: PageBadgeMeta, isActive: boolean, assignedUser?: { name: string; id?: number } | null) => (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
        <span style={{ fontWeight: 600 }}>{meta.label}</span>
        {assignedUser && (
          <ProfilePicture
            key={`profile-${assignedUser.id}-${assignedUser.name}`}
            name={assignedUser.name}
            size="sm"
            userId={assignedUser.id}
            editable={false}
            variant="default"
          />
        )}
      </div>
    ),
    [] // No dependencies needed as this is a pure render function
  );
  const switchToPartnerPage = useCallback(() => {
    if (!partnerInfo) return;
    const targetPageNumber = partnerInfo.page.pageNumber ?? partnerInfo.index + 1;
    if (targetPageNumber === 3 || (totalPages > 0 && targetPageNumber === totalPages)) {
      return;
    }
    dispatch({ type: 'SET_ACTIVE_PAGE', payload: partnerInfo.index });
  }, [dispatch, partnerInfo, totalPages]);

  const handlePreviewCanvasClick = useCallback(
    (evt?: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (evt?.evt instanceof MouseEvent && evt.evt.button !== 0) {
        return;
      }
      if (isCreationToolActive) {
        if (evt?.evt && typeof evt.evt.clientX === 'number' && typeof evt.evt.clientY === 'number') {
          showOutsidePageTooltip(evt.evt.clientX, evt.evt.clientY);
        }
        return;
      }
      switchToPartnerPage();
    },
    [isCreationToolActive, showOutsidePageTooltip, switchToPartnerPage]
  );

  const handlePreviewBadgeClick = useCallback(
    (evt?: React.MouseEvent<HTMLButtonElement>) => {
      if (evt && evt.button !== 0) {
        return;
      }
      switchToPartnerPage();
    },
    [switchToPartnerPage]
  );

  // Memoize page badge positions - expensive calculations used in rendering
  const pageBadgePositions = useMemo(() => {
    const activePos = getBadgeScreenPosition(activePageOffsetX);
    const previewPos = getBadgeScreenPosition(previewPageOffsetX);

    return {
      active: activePos,
      preview: previewPos
    };
  }, [getBadgeScreenPosition, activePageOffsetX, previewPageOffsetX]);

  const activePageBadgePosition = pageBadgePositions.active;
  const previewPageBadgePosition = pageBadgePositions.preview;

  // Memoize container size and spread dimensions for clampStagePosition
  const stageConstraints = useMemo(() => ({
    spreadWidthCanvas,
    canvasHeight,
    containerSize,
    isMiniPreview: state.isMiniPreview
  }), [spreadWidthCanvas, canvasHeight, containerSize.width, containerSize.height, state.isMiniPreview]);

  const clampStagePosition = useCallback((pos: { x: number; y: number }, scaleOverride?: number) => {
    const appliedZoom = scaleOverride ?? zoom;
    const contentWidth = stageConstraints.spreadWidthCanvas * appliedZoom;
    const contentHeight = stageConstraints.canvasHeight * appliedZoom;

    // For mini previews, always center and don't clamp to avoid cutting off pages
    if (stageConstraints.isMiniPreview) {
      return {
        x: (stageConstraints.containerSize.width - contentWidth) / 2,
        y: (stageConstraints.containerSize.height - contentHeight) / 2
      };
    }

    const marginX = Math.min(400, stageConstraints.containerSize.width);
    const marginY = Math.min(300, stageConstraints.containerSize.height);

    let clampedX = pos.x;
    let clampedY = pos.y;

    if (contentWidth + marginX * 2 <= stageConstraints.containerSize.width) {
      clampedX = (stageConstraints.containerSize.width - contentWidth) / 2;
    } else {
      const minX = stageConstraints.containerSize.width - contentWidth - marginX;
      const maxX = marginX;
      clampedX = Math.min(maxX, Math.max(minX, pos.x));
    }

    if (contentHeight + marginY * 2 <= stageConstraints.containerSize.height) {
      clampedY = (stageConstraints.containerSize.height - contentHeight) / 2;
    } else {
      const minY = stageConstraints.containerSize.height - contentHeight - marginY;
      const maxY = marginY;
      clampedY = Math.min(maxY, Math.max(minY, pos.y));
    }

    return { x: clampedX, y: clampedY };
  }, [stageConstraints, zoom]);

  // Local setZoom function that updates stage position for zoom-to-pointer behavior
  // Must be defined after clampStagePosition
  // This function is registered in ZoomContext and called after zoom state is updated
  const setZoomPosition = useCallback((newZoom: number, centerPoint?: { x: number; y: number }) => {
    const stage = stageRef.current;
    const clampedScale = Math.max(0.1, Math.min(3, newZoom));
    
    // If no center point provided, calculate center of active page
    let targetCenterPoint = centerPoint;
    if (!targetCenterPoint && stage) {
      // Calculate center of active page in screen coordinates
      const pageCenterX = activePageOffsetX + canvasWidth / 2;
      const pageCenterY = pageOffsetY + canvasHeight / 2;
      
      // Convert to screen coordinates
      targetCenterPoint = {
        x: stagePos.x + pageCenterX * zoom,
        y: stagePos.y + pageCenterY * zoom,
      };
    }
    
    if (stage && targetCenterPoint) {
      // Zoom to specific point (like mouse pointer or page center)
      const oldScale = zoom;
      const mousePointTo = {
        x: (targetCenterPoint.x - stagePos.x) / oldScale,
        y: (targetCenterPoint.y - stagePos.y) / oldScale,
      };
      
      const newPos = {
        x: targetCenterPoint.x - mousePointTo.x * clampedScale,
        y: targetCenterPoint.y - mousePointTo.y * clampedScale,
      };
      
      setHasManualZoom(true);
      setStagePos(clampStagePosition(newPos, clampedScale));
    }
  }, [zoom, stagePos, clampStagePosition, activePageOffsetX, canvasWidth, canvasHeight, pageOffsetY]);

  // Register setZoomPosition function in ZoomContext so it can be used by zoom-popover
  useEffect(() => {
    registerSetZoom(setZoomPosition);
  }, [registerSetZoom, setZoomPosition]);

  // Listen for drag attempts that would move elements outside the active page
  useEffect(() => {
    const handleOutsideAttempt = (event: Event) => {
      const custom = event as CustomEvent<{ clientX: number; clientY: number }>;
      if (custom.detail?.clientX != null && custom.detail?.clientY != null) {
        showOutsidePageTooltip(custom.detail.clientX, custom.detail.clientY);
      }
    };

    window.addEventListener('canvasOutsidePageAttempt', handleOutsideAttempt as EventListener);
    return () => {
      window.removeEventListener('canvasOutsidePageAttempt', handleOutsideAttempt as EventListener);
    };
  }, [showOutsidePageTooltip]);

  useEffect(() => {
    if (isDragging) return; // Don't update transformer during drag
    if (isInteractingRef.current) return; // Don't update transformer during zoom/pan
    
    if (transformerRef.current && stageRef.current) {
      const transformer = transformerRef.current;
      const stage = stageRef.current;
      
      if (state.selectedElementIds.length > 0) {
        const selectedNodes = state.selectedElementIds.map(id => {
          try {
            let node = stage.findOne(`#${id}`);
            if (!node) {
              const allNodes = stage.find('*');
              node = allNodes.find(n => n.id() === id);
            }
            
            // For image elements, select the Group directly (not the Image node)
            // This ensures rotation is applied to the Group, so the frame rotates with the image
            // For text elements, select the entire group
            if (node && node.getClassName() === 'Group') {
              const element = currentPage?.elements.find(el => el.id === id);
              if (element?.type === 'image') {
                // Select the Group directly for image elements (not the Image node)
                // This ensures rotation is applied to the Group, so the frame rotates with the image
                return node;
              } else if (element?.type === 'text') {
                return node; // Select the group itself for text elements
              }
            }
            
            return node;
          } catch {
            return null;
          }
        }).filter((node): node is Konva.Node => {
          // Verify node is valid and still attached to the stage
          if (!node) return false;
          try {
            // Check if node has a parent (is still in the scene graph)
            // Also verify that the node hasn't been destroyed by checking if it has an id
            const stage = node.getStage();
            const parent = node.getParent();
            const nodeId = node.id();
            return stage !== null && parent !== null && nodeId !== undefined;
          } catch {
            return false;
          }
        });
        
        if (selectedNodes.length > 0) {
          try {
            // Double-check all nodes are still valid before assigning to transformer
            const validNodes = selectedNodes.filter(node => {
              try {
                const stage = node.getStage();
                const parent = node.getParent();
                const nodeId = node.id();
                return stage !== null && parent !== null && nodeId !== undefined;
              } catch {
                return false;
              }
            });
            
            if (validNodes.length > 0) {
              transformer.nodes(validNodes);
              transformer.moveToTop();
              // Use batched transformer update for better performance
              batchedTransformerUpdate();
            } else {
              // All nodes are invalid - but don't clear during drag
              // Nodes might be temporarily unavailable during React re-renders
              if (!isDraggingGroupRef.current && !isMovingGroup && !isMovingGroupRef.current) {
                transformer.nodes([]);
                const layer = transformer.getLayer();
                if (layer) {
                  layer.batchDraw();
                }
              }
            }
          } catch (error) {
            // Silently handle transformer update errors (nodes may have been destroyed)
            console.debug('Transformer update error:', error);
            // Don't clear transformer during drag - nodes might be temporarily unavailable
            if (!isDraggingGroupRef.current && !isMovingGroup && !isMovingGroupRef.current) {
              try {
                transformer.nodes([]);
                transformer.getLayer()?.batchDraw();
              } catch {
                // Ignore cleanup errors
              }
            }
          }
        } else {
          // No valid nodes found - but don't clear immediately during drag
          // Nodes might be temporarily unavailable during React re-renders
          // Only clear if we're not dragging and nodes are still missing after a delay
          if (!isDraggingGroupRef.current && !isMovingGroup && !isMovingGroupRef.current) {
            try {
              transformer.nodes([]);
              const layer = transformer.getLayer();
              if (layer) {
                layer.batchDraw();
              }
            } catch {
              // Ignore cleanup errors
            }
          }
        }
      } else {
        try {
          transformer.nodes([]);
          const layer = transformer.getLayer();
          if (layer) {
            layer.batchDraw();
          }
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }, [state.selectedElementIds, isDragging, currentPage]);
  
  // Limit transformer dimensions for QnA elements to box dimensions only
  // This ensures the selection rectangle only shows the box, not the extended text
  useEffect(() => {
    if (transformerRef.current && state.selectedElementIds.length === 1 && currentPage) {
      const transformer = transformerRef.current;
      const elementId = state.selectedElementIds[0];
      const element = currentPage.elements.find(el => el.id === elementId);
      
      if (element && element.type === 'text' && element.textType === 'qna') {
        // Track if transformer is actively transforming
        let isTransforming = false;
        
        // Listen for transform events
        const handleTransformStart = () => {
          isTransforming = true;
        };
        
        const handleTransformEnd = () => {
          isTransforming = false;
        };
        
        // Delay to ensure transformer has updated
        const timeoutId = setTimeout(() => {
          if (!transformerRef.current) return;
          
          try {
            const nodes = transformer.nodes();
            if (nodes.length === 1) {
              const node = nodes[0];
              
              // Validate node is still valid
              if (!node) return;
              try {
                const stage = node.getStage();
                const parent = node.getParent();
                if (!stage || !parent) return;
              } catch {
                return; // Node is invalid
              }
              
              const boxWidth = element.width || 100;
              const boxHeight = element.height || 100;
              
              // Override the transformer's getClientRect to return box dimensions
              // This ensures the selection rectangle only shows the box
              if (node && node.getClassName() === 'Group') {
                const groupNode = node as Konva.Group;
                
                // Store original method if not already stored
                if (!(transformer as any).__originalGetClientRect) {
                  (transformer as any).__originalGetClientRect = transformer.getClientRect.bind(transformer);
                }
                
                const originalGetClientRect = (transformer as any).__originalGetClientRect;
                
                // Set up event listeners
                transformer.on('transformstart', handleTransformStart);
                transformer.on('transformend', handleTransformEnd);
                
                // Override getClientRect to return box dimensions
                transformer.getClientRect = function() {
                  try {
                    // During transform, use original method to allow resizing
                    if (isTransforming) {
                      return originalGetClientRect.call(this);
                    }
                    
                    // Validate node is still valid before accessing
                    const currentNodes = this.nodes();
                    if (currentNodes.length === 0) {
                      return originalGetClientRect.call(this);
                    }
                    
                    const currentNode = currentNodes[0];
                    if (!currentNode) {
                      return originalGetClientRect.call(this);
                    }
                    
                    // Check if node is still valid
                    try {
                      const stage = currentNode.getStage();
                      const parent = currentNode.getParent();
                      if (!stage || !parent) {
                        return originalGetClientRect.call(this);
                      }
                    } catch {
                      return originalGetClientRect.call(this);
                    }
                    
                    // Otherwise, limit to box dimensions for selection rectangle display
                    // Get absolute position and adjust for offset to get the visual top-left corner
                    const absPos = groupNode.getAbsolutePosition();
                    const offsetX = groupNode.offsetX() || 0;
                    const offsetY = groupNode.offsetY() || 0;
                    
                    return {
                      x: absPos.x - offsetX,
                      y: absPos.y - offsetY,
                      width: boxWidth,
                      height: boxHeight
                    };
                  } catch (error) {
                    // Fall back to original method on error
                    console.debug('getClientRect override error:', error);
                    return originalGetClientRect.call(this);
                  }
                };
                
                batchedTransformerUpdate();
              }
            }
          } catch (error) {
            // Ignore errors - transformer might not be ready
            console.debug('QnA transformer setup error:', error);
          }
        }, 100);
        
        return () => {
          clearTimeout(timeoutId);
          // Clean up event listeners
          const transformer = transformerRef.current;
          if (transformer) {
            try {
              transformer.off('transformstart', handleTransformStart);
              transformer.off('transformend', handleTransformEnd);
            } catch {
              // Ignore cleanup errors
            }
          }
        };
      } else {
        // Restore original getClientRect for non-QnA elements
        if ((transformer as any).__originalGetClientRect) {
          try {
            transformer.getClientRect = (transformer as any).__originalGetClientRect;
            delete (transformer as any).__originalGetClientRect;
            // Use batched transformer update for better performance
            batchedTransformerUpdate();
          } catch (error) {
            console.debug('Error restoring original getClientRect:', error);
          }
        }
      }
    }
  }, [state.selectedElementIds, currentPage, zoom]);
  
  // Force transformer update when element dimensions change
  useEffect(() => {
    if (transformerRef.current && state.selectedElementIds.length > 0) {
      const transformer = transformerRef.current;
      setTimeout(() => {
        if (!transformerRef.current) return;
        
        try {
          const nodes = transformer.nodes();
          // Filter out undefined or invalid nodes
          const validNodes = nodes.filter((node): node is Konva.Node => {
            if (!node) return false;
            try {
              // Check if node is still valid and not destroyed
              const stage = node.getStage();
              const parent = node.getParent();
              const nodeId = node.id();
              return stage !== null && parent !== null && nodeId !== undefined;
            } catch {
              return false;
            }
          });
          
          if (validNodes.length > 0 && validNodes.length === nodes.length) {
            batchedTransformerUpdate();
          } else if (validNodes.length !== nodes.length) {
            // Some nodes are invalid, update the transformer with only valid nodes
            if (validNodes.length > 0) {
              transformer.nodes(validNodes);
              batchedTransformerUpdate();
            } else {
              // All nodes are invalid - but don't clear during drag
              // Nodes might be temporarily unavailable during React re-renders
              if (!isDraggingGroupRef.current && !isMovingGroup && !isMovingGroupRef.current) {
                transformer.nodes([]);
                batchedTransformerUpdate();
              }
            }
          }
        } catch (error) {
          // Silently handle transformer update errors (nodes may have been destroyed)
          console.debug('Transformer update error:', error);
          // Don't clear transformer during drag - nodes might be temporarily unavailable
          if (!isDraggingGroupRef.current && !isMovingGroup && !isMovingGroupRef.current) {
            try {
              transformer.nodes([]);
              transformer.getLayer()?.batchDraw();
            } catch {
              // Ignore cleanup errors
            }
          }
        }
      }, 10);
    }
  }, [currentPage?.elements]); // React will handle deep comparison optimization

  // Selection rectangle is now only shown during drag-selection (isSelecting)
  // It is no longer shown for selected items - the Transformer handles that visualization
  // Hide selection rectangle when not selecting and elements are selected
  useEffect(() => {
    if (!isSelecting && state.selectedElementIds.length > 0) {
      // Hide selection rectangle when items are selected (Transformer shows selection instead)
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0, visible: false });
    } else if (!isSelecting && state.selectedElementIds.length === 0) {
      // Also hide when nothing is selected and not selecting
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0, visible: false });
    }
  }, [isSelecting, state.selectedElementIds.length]);

  // REMOVED: Effect that updated selection rectangle after zoom
  // Selection rectangle is now only for drag-selection, not for selected items
  // The Transformer handles visualization of selected items



  // Force transformer update after group movement ends
  useEffect(() => {
    if (!isMovingGroup && transformerRef.current && stageRef.current && state.selectedElementIds.length > 0) {
      const transformer = transformerRef.current;
      const stage = stageRef.current;
      
      // Small delay to ensure Konva nodes have updated positions
      const timer = setTimeout(() => {
        // Check if transformer and stage are still valid
        if (!transformerRef.current || !stageRef.current) return;
        
        const selectedNodes = state.selectedElementIds.map(id => {
          try {
            let node = stage.findOne(`#${id}`);
            if (!node) {
              const allNodes = stage.find('*');
              node = allNodes.find(n => n.id() === id);
            }
            
            // For image elements, select the Group directly (not the Image node)
            // This ensures rotation is applied to the Group, so the frame rotates with the image
            if (node && node.getClassName() === 'Group') {
              const element = currentPage?.elements.find(el => el.id === id);
              if (element?.type === 'image') {
                // Select the Group directly for image elements (not the Image node)
                // This ensures rotation is applied to the Group, so the frame rotates with the image
                return node;
              }
            }
            
            return node;
          } catch {
            return null;
          }
        }).filter(node => {
          if (!node) return false;
          try {
            const stage = node.getStage();
            const parent = node.getParent();
            const nodeId = node.id();
            return stage !== null && parent !== null && nodeId !== undefined;
          } catch {
            return false;
          }
        });
        
        if (selectedNodes.length > 0) {
          // Verify all nodes are valid before updating
          const validNodes = selectedNodes.filter((node): node is Konva.Node => {
            if (!node) return false;
            try {
              const stage = node.getStage();
              const parent = node.getParent();
              const nodeId = node.id();
              return stage !== null && parent !== null && nodeId !== undefined;
            } catch {
              return false;
            }
          });
          
          if (validNodes.length > 0 && transformerRef.current) {
            try {
              transformer.nodes(validNodes);
              batchedTransformerUpdate();
            } catch (error) {
              // Silently handle transformer update errors (nodes may have been destroyed)
              console.debug('Transformer update error:', error);
              // Clear transformer on error
              try {
                transformer.nodes([]);
                transformer.getLayer()?.batchDraw();
              } catch {
                // Ignore cleanup errors
              }
            }
          } else if (validNodes.length === 0) {
            // All nodes are invalid, clear transformer
            try {
              transformer.nodes([]);
              transformer.getLayer()?.batchDraw();
            } catch {
              // Ignore cleanup errors
            }
          }
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
    
    // For answer_only level, allow panning only with right-click (button 2)
    if (state.editorInteractionLevel === 'answer_only') {
      // Only allow panning with right-click for view-only mode
      if (e.evt.button === 2) {
        setIsPanning(true);
        setHasPanned(false);
        const pos = e.target.getStage()?.getPointerPosition();
        if (pos) {
          setPanStart({ x: pos.x - stagePos.x, y: pos.y - stagePos.y });
        }
      }
      return;
    }
    
    // Block all interactions for no_access level
    if (!canAccessEditor()) return;

    const isPanAction = e.evt.button === 2 || state.activeTool === 'pan';
    if (!canEditElements && !canCreateElements && !isPanAction) return;
    
    const lockElements = state.editorSettings?.editor?.lockElements;
    
    const currentTime = Date.now();
    const isDoubleClick = currentTime - lastClickTime < 300;
    setLastClickTime(currentTime);

    // Right-click drag for panning
    if (e.evt.button === 2) {
      setIsPanning(true);
      setHasPanned(false);
      isInteractingRef.current = true;
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setPanStart({ x: pos.x - stagePos.x, y: pos.y - stagePos.y });
      }
      return;
    }

    // Block adding new elements if elements are locked
    if (lockElements && ['brush', 'line', 'rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley', 'text', 'question', 'answer', 'qna', 'free_text', 'qr_code'].includes(state.activeTool)) {
      // Allow selection tool to work for selecting elements
      if (state.activeTool !== 'select') {
        return;
      }
    }

    // Only handle mouseDown for brush, select, and pan tools
    if (state.activeTool === 'pan') {
      setIsPanning(true);
      isInteractingRef.current = true;
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setPanStart({ x: pos.x - stagePos.x, y: pos.y - stagePos.y });
      }
    } else if (state.activeTool === 'brush') {
      if (!canCreateElements) return;
      drawingState.setIsDrawing(true);
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - zoomPanState.stagePos.x) / zoomPanState.zoom - activePageOffsetX;
        const y = (pos.y - zoomPanState.stagePos.y) / zoomPanState.zoom - pageOffsetY;
        // Only allow drawing inside the active page
        if (x < 0 || y < 0 || x > canvasWidth || y > canvasHeight) {
          showOutsidePageTooltip(e.evt.clientX, e.evt.clientY);
          setIsDrawing(false);
          return;
        }
        setCurrentPath([x, y]);
      }
    } else if (state.activeTool === 'line') {
      if (!canCreateElements) return;
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom - activePageOffsetX;
        const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
        const isBackgroundClick = e.target === e.target.getStage() || 
          (e.target.getClassName() === 'Rect' && !e.target.id());
        
        if (isBackgroundClick) {
          // Only allow starting lines inside the active page
          if (x < 0 || y < 0 || x > canvasWidth || y > canvasHeight) {
            showOutsidePageTooltip(e.evt.clientX, e.evt.clientY);
            return;
          }
          setIsDrawingLine(true);
          setLineStart({ x, y });
          setPreviewLine({ x1: x, y1: y, x2: x, y2: y });
        }
      }
    } else if (['rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(state.activeTool)) {
      if (!canCreateElements) return;
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom - activePageOffsetX;
        const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
        const isBackgroundClick = e.target === e.target.getStage() || 
          (e.target.getClassName() === 'Rect' && !e.target.id());
        
        if (isBackgroundClick) {
          // Only allow starting shapes inside the active page
          if (x < 0 || y < 0 || x > canvasWidth || y > canvasHeight) {
            showOutsidePageTooltip(e.evt.clientX, e.evt.clientY);
            return;
          }
          setIsDrawingShape(true);
          setShapeStart({ x, y });
          setPreviewShape({ x, y, width: 0, height: 0, type: state.activeTool });
        }
      }
    } else if (state.activeTool === 'text' || state.activeTool === 'question' || state.activeTool === 'answer' || state.activeTool === 'qna' || state.activeTool === 'free_text') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom - activePageOffsetX;
        const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
        const isBackgroundClick = e.target === e.target.getStage() || 
          (e.target.getClassName() === 'Rect' && !e.target.id());
        
        if (isBackgroundClick) {
          // Only allow starting text boxes inside the active page
          if (x < 0 || y < 0 || x > canvasWidth || y > canvasHeight) {
            showOutsidePageTooltip(e.evt.clientX, e.evt.clientY);
            return;
          }
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
      // A Rect without an ID could be a hit-area Rect inside a Group, so check parent
      let isBackgroundClick = e.target === e.target.getStage();
      if (!isBackgroundClick && e.target.getClassName() === 'Rect' && !e.target.id()) {
        // Check if this Rect is inside a Group (element) - if so, it's not a background click
        const parent = e.target.getParent();
        if (parent && parent.getClassName() === 'Group' && parent.id()) {
          // This Rect is inside a Group with an ID, so it's an element click
          isBackgroundClick = false;
        } else {
          // This Rect has no parent Group with ID, so it's a background Rect
          isBackgroundClick = true;
        }
      }
      
      // If clicking on an element (not background), check if we should start group move
      if (!isBackgroundClick) {
        // Check if multiple elements are selected - if so, start group move
        // This allows dragging any selected element to move the whole group
        if (state.selectedElementIds.length > 1 && e.evt.button === 0 && !state.editorSettings?.editor?.lockElements) {
          // Start group move if multiple elements are selected and elements are not locked
          const startPos = { x, y };
          setIsMovingGroup(true);
          isMovingGroupRef.current = true;
          isDraggingGroupRef.current = true;
          setGroupMoveStart(startPos);
          groupMoveStartRef.current = startPos;
          dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Move Elements' });
          // Return here to prevent base-canvas-item from starting individual drag
          // The group move will be handled by handleMouseMove
          return;
        } else {
          // For single element clicks or when lockElements is enabled, let the event propagate
          // to base-canvas-item so that selection can work
          // Don't handle element clicks here - let base-canvas-item handle them
          return;
        }
      }
      
      if (isBackgroundClick) {
        // Check if click is within selected elements bounds (transformer rectangle)
        // This allows dragging the group by clicking on empty space within the transformer
        if (state.selectedElementIds.length > 1 && !state.editorSettings?.editor?.lockElements) {
          const isWithinSelection = isPointWithinSelectedElements(
            x,
            y,
            currentPage,
            state.selectedElementIds,
            transformerRef,
            stagePos,
            zoom,
            activePageOffsetX,
            pageOffsetY
          );
          
          if (isWithinSelection) {
            // Check if we're clicking on an actual element (not empty space)
            const clickedElement = currentPage?.elements.find(el => {
              return state.selectedElementIds.includes(el.id) && 
                     x >= el.x && x <= el.x + (el.width || 100) &&
                     y >= el.y && y <= el.y + (el.height || 100);
            });
            
            // If clicking on empty space within transformer, start group move
            if (!clickedElement) {
              const startPos = { x, y };
              setIsMovingGroup(true);
              isMovingGroupRef.current = true;
              isDraggingGroupRef.current = true;
              setGroupMoveStart(startPos);
              groupMoveStartRef.current = startPos;
              dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Move Elements' });
              return;
            }
            // If clicking on an element, let base-canvas-item handle it (will start group move)
            return;
          }
        }
        
        // Check if double-click is within selected elements bounds
        if (isDoubleClick && state.selectedElementIds.length > 0) {
          const isWithinSelection = isPointWithinSelectedElements(
            x,
            y,
            currentPage,
            state.selectedElementIds,
            transformerRef,
            stagePos,
            zoom,
            activePageOffsetX,
            pageOffsetY
          );
          if (isWithinSelection) {
            // Don't start group move if clicking on a text element - let it handle double-click
            const clickedElement = currentPage?.elements.find(el => {
              return state.selectedElementIds.includes(el.id) && 
                     x >= el.x && x <= el.x + (el.width || 100) &&
                     y >= el.y && y <= el.y + (el.height || 100);
            });
            
            if (clickedElement?.type !== 'text' && !state.editorSettings?.editor?.lockElements) {
              setIsMovingGroup(true);
              isMovingGroupRef.current = true;
              isDraggingGroupRef.current = true;
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
      
      const x = (pos.x - stagePos.x) / zoom - activePageOffsetX;
      const y = (pos.y - stagePos.y) / zoom - pageOffsetY;

      if (!canCreateElements) return;
      
      // Check if clicked on background
      const isBackgroundClick = e.target === e.target.getStage() || 
        (e.target.getClassName() === 'Rect' && !e.target.id());
      
      if (isBackgroundClick) {
        let newElement: CanvasElement | null = null;
        
        if (state.activeTool === 'image') {
          // Only allow images to be placed starting inside the active page
          if (x < 0 || y < 0 || x > canvasWidth || y > canvasHeight) {
            showOutsidePageTooltip(e.evt.clientX, e.evt.clientY);
            return;
          }
          setPendingImagePosition({ x: x - 300, y: y - 200 });
          setShowImageModal(true);
          return;
        }
        
        if (state.activeTool === 'sticker') {
          // Only allow stickers to be placed starting inside the active page
          if (x < 0 || y < 0 || x > canvasWidth || y > canvasHeight) {
            showOutsidePageTooltip(e.evt.clientX, e.evt.clientY);
            return;
          }
          setPendingStickerPosition({ x: x - 300, y: y - 200 });
          setShowStickerModal(true);
          return;
        }

        if (state.activeTool === 'qr_code') {
          // Only allow QR codes to be placed starting inside the active page
          if (x < 0 || y < 0 || x > canvasWidth || y > canvasHeight) {
            showOutsidePageTooltip(e.evt.clientX, e.evt.clientY);
            return;
          }
          const defaultSize = 200;
          setPendingQrCodePosition({ x: x - defaultSize / 2, y: y - defaultSize / 2 });
          setShowQrCodeModal(true);
          return;
        }
        
        if (newElement) {
          if (addElementIfAllowed(newElement)) {
            dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
          }
        }
      }
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Track mouse position for paste functionality
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos && isCreationToolActive && !state.stylePainterActive) {
      setStageCursor(isPointerOutsideActivePage(pos) ? 'not-allowed' : null);
    }
    if (pos) {
      setLastMousePos({ x: pos.x, y: pos.y });
      
      // Check if mouse is over safety margin areas (outside the safe area)
      const stage = e.target.getStage();
      if (stage) {
        // Transform stage coordinates to page coordinates
        // Formula: (pos.x - stagePos.x) / zoom - pageOffset
        const pageX = (pos.x - stagePos.x) / zoom - activePageOffsetX;
        const pageY = (pos.y - stagePos.y) / zoom - pageOffsetY;
        
        // Check if mouse is in one of the 4 safety margin areas (outside safe area)
        const isInTopArea = pageY >= 0 && pageY < SAFETY_MARGIN_PX && pageX >= 0 && pageX <= canvasWidth;
        const isInBottomArea = pageY >= canvasHeight - SAFETY_MARGIN_PX && pageY <= canvasHeight && pageX >= 0 && pageX <= canvasWidth;
        const isInLeftArea = pageX >= 0 && pageX < SAFETY_MARGIN_PX && pageY >= SAFETY_MARGIN_PX && pageY <= canvasHeight - SAFETY_MARGIN_PX;
        const isInRightArea = pageX >= canvasWidth - SAFETY_MARGIN_PX && pageX <= canvasWidth && pageY >= SAFETY_MARGIN_PX && pageY <= canvasHeight - SAFETY_MARGIN_PX;
        
        // Check if snapped to safety margin
        const safetyMarginPositions = [
          activePageOffsetX + SAFETY_MARGIN_PX, // left
          activePageOffsetX + canvasWidth - SAFETY_MARGIN_PX, // right
          pageOffsetY + SAFETY_MARGIN_PX, // top
          pageOffsetY + canvasHeight - SAFETY_MARGIN_PX // bottom
        ];
        const isSnappedToSafetyMargin = snapGuidelines.some(guideline => {
          return safetyMarginPositions.some(pos => {
            return Math.abs(guideline.position - pos) < 1;
          });
        });

        // Check if any selected element is outside safety margin
        let hasElementOutsideSafetyMargin = false;
        if (currentPage && state.selectedElementIds.length > 0 && (isDragging || snapGuidelines.length > 0)) {
          const transformer = transformerRef.current;
          if (transformer) {
            const nodes = transformer.nodes();
            nodes.forEach(node => {
              const nodeX = node.x();
              const nodeY = node.y();
              const nodeWidth = (node.width() || 0) * (node.scaleX() || 1);
              const nodeHeight = (node.height() || 0) * (node.scaleY() || 1);
              
              const elementLeft = nodeX;
              const elementRight = nodeX + nodeWidth;
              const elementTop = nodeY;
              const elementBottom = nodeY + nodeHeight;
              
              const isOutsideLeft = elementLeft < SAFETY_MARGIN_PX;
              const safetyMarginRight = canvasWidth - SAFETY_MARGIN_PX;
              const isOutsideRight = elementRight >= safetyMarginRight;
              const isOutsideTop = elementTop < SAFETY_MARGIN_PX;
              const safetyMarginBottom = canvasHeight - SAFETY_MARGIN_PX;
              const isOutsideBottom = elementBottom >= safetyMarginBottom;
              
              if (isOutsideLeft || isOutsideRight || isOutsideTop || isOutsideBottom) {
                hasElementOutsideSafetyMargin = true;
              }
            });
          }
        }

        if (isInTopArea || isInBottomArea || isInLeftArea || isInRightArea) {
          setIsManuallyHovering(true);
          setHoveredSafetyMargin(true);
          if (e.evt && typeof e.evt.clientX === 'number' && typeof e.evt.clientY === 'number') {
            setSafetyMarginTooltip({ x: e.evt.clientX, y: e.evt.clientY - 24 });
          }
        } else {
          setIsManuallyHovering(false);
          if (!isSnappedToSafetyMargin && !hasElementOutsideSafetyMargin) {
            // Only clear if not snapped to safety margin and no element is outside
            setHoveredSafetyMargin(false);
            setSafetyMarginTooltip(null);
          }
        }
      }
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
          const newPos = clampStagePosition({
            x: pos.x - panStart.x,
            y: pos.y - panStart.y
          });

          if (DIRECT_PANNING_ENABLED && stageRef.current) {
            // Direct stage manipulation for better performance
            stageRef.current.x(newPos.x);
            stageRef.current.y(newPos.y);
            throttledSetStagePos(newPos);
            
            // Clear transform cache to prevent items from freezing after long pan sessions
            const layer = stageRef.current.findOne('Layer');
            if (layer) {
              layer.find('Group').forEach(node => node.clearCache());
            }
          } else {
            // Fallback to state updates
            throttledSetStagePos(newPos);
            
            // Clear transform cache to prevent items from freezing after long pan sessions
            if (stageRef.current) {
              const layer = stageRef.current.findOne('Layer');
              if (layer) {
                layer.find('Group').forEach(node => node.clearCache());
              }
            }
          }
        }
      }
      return;
    }
    
    if (isPanning) {
      setHidePartnerDuringInteraction(true);
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setHasPanned(true);
        const newPos = clampStagePosition({
          x: pos.x - panStart.x,
          y: pos.y - panStart.y
        });

        if (DIRECT_PANNING_ENABLED && stageRef.current) {
          // Direct stage manipulation for better performance
          stageRef.current.x(newPos.x);
          stageRef.current.y(newPos.y);
          throttledSetStagePos(newPos);
        } else {
          throttledSetStagePos(newPos);
        }
      }
    } else if (drawingState.isDrawing && state.activeTool === 'brush') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom - activePageOffsetX;
        const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
        setCurrentPath(prev => [...prev, x, y]);
      }
    } else if (isDrawingLine && lineStart) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom - activePageOffsetX;
        const y = (pos.y - stagePos.y) / zoom - pageOffsetY;
        setPreviewLine({ x1: lineStart.x, y1: lineStart.y, x2: x, y2: y });
      }
    } else if (isDrawingShape && shapeStart) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom - activePageOffsetX;
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
        const x = (pos.x - stagePos.x) / zoom - activePageOffsetX;
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
    } else if ((isMovingGroup || isMovingGroupRef.current) && (groupMoveStart || groupMoveStartRef.current)) {
      // Block group move if elements are locked
      if (state.editorSettings?.editor?.lockElements) {
        setIsMovingGroup(false);
        isMovingGroupRef.current = false;
        isDraggingGroupRef.current = false;
        setGroupMoveStart(null);
        groupMoveStartRef.current = null;
        // Clean up initial positions
        groupMoveInitialPositionsRef.current = null;
        return;
      }
      
      // Mark that we're dragging to prevent transformer updates
      isDraggingGroupRef.current = true;
      
      // Move entire selection
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        // Convert to page coordinates (same calculation as in handleMouseDown)
        const x = (pos.x - stagePos.x) / zoom;
        const y = (pos.y - stagePos.y) / zoom;
        const start = groupMoveStartRef.current || groupMoveStart;
        if (!start) return;
        
        const deltaX = x - start.x;
        const deltaY = y - start.y;
        
        // Update all selected elements - use absolute position calculation
        // Store initial positions on first move to avoid accumulation errors
        if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
          // Store initial element positions on first move
          if (!groupMoveInitialPositionsRef.current) {
            groupMoveInitialPositionsRef.current = {};
            state.selectedElementIds.forEach(elementId => {
              const element = currentPage?.elements.find(el => el.id === elementId);
              if (element) {
                groupMoveInitialPositionsRef.current![elementId] = { x: element.x, y: element.y };
              }
            });
          }

          // Update all selected elements based on initial positions + current delta
          state.selectedElementIds.forEach(elementId => {
            const initialPos = groupMoveInitialPositionsRef.current?.[elementId];
            if (initialPos) {
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: {
                  id: elementId,
                  updates: {
                    x: initialPos.x + deltaX,
                    y: initialPos.y + deltaY
                  }
                }
              });
            }
          });
        }
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
        

        // PERFORMANCE OPTIMIZATION: Use throttled update during mouse move
        throttledSetSelectionRect(newRect);
      }
    }
  };

  useEffect(() => {
    if (!isCreationToolActive) {
      setStageCursor(null);
    }
  }, [isCreationToolActive, setStageCursor]);


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
    // Always stop panning when mouse button is released, regardless of which button
    if (state.editorInteractionLevel === 'answer_only') {
      if (isPanning) {
        setIsPanning(false);
        setPanStart({ x: 0, y: 0 });
        setHasPanned(false);
      }
      return;
    }
    
    if (isPanning) {
      setIsPanning(false);
      setPanStart({ x: 0, y: 0 });
      isInteractingRef.current = false;
      
      // Delay showing partner page after panning ends
      if (showPartnerTimeoutRef.current) clearTimeout(showPartnerTimeoutRef.current);
      showPartnerTimeoutRef.current = setTimeout(() => {
        setHidePartnerDuringInteraction(false);
      }, 300);
      
      // Clear transform cache after panning ends
      requestAnimationFrame(() => {
        try {
          if (stageRef.current) {
            const layer = stageRef.current.findOne('Layer');
            if (layer) {
              layer.find('Group').forEach(node => node.clearCache());
            }
          }
        } catch (error) {
          console.debug('Cache clear error:', error);
        }
      });
    } else if (isDrawing && state.activeTool === 'brush' && currentPath.length > 2) {
      // Block adding brush strokes if elements are locked
      if (state.editorSettings?.editor?.lockElements) {
        setIsDrawing(false);
        setCurrentPath([]);
        return;
      }
      
      const smoothedPath = smoothPath(currentPath);
      
      if (!isBrushMode) {
        // Start brush mode on first stroke
        setIsBrushMode(true);
        isBrushModeRef.current = true;
        window.dispatchEvent(new CustomEvent('brushModeStart'));
      }
      
      // Capture current tool settings for this stroke
      const templateIds = getTemplateIdsForDefaults();
      const activeTheme = templateIds.pageTheme || templateIds.bookTheme || 'default';
      const effectivePaletteId = templateIds.pageColorPaletteId || templateIds.bookColorPaletteId;
      const brushDefaults = getGlobalThemeDefaults(activeTheme, 'brush', effectivePaletteId);
      const toolSettings = state.toolSettings?.brush || {};
      
      const strokeData = {
        points: smoothedPath,
        strokeColor: brushDefaults.stroke || '#1f2937',
        strokeWidth: brushDefaults.strokeWidth || 3
      };
      
      // Add stroke to collection with its settings
      setBrushStrokes(prev => [...prev, strokeData]);
      window.dispatchEvent(new CustomEvent('brushStrokeAdded', { detail: { points: smoothedPath } }));
      
      // Don't create element yet - wait for Done button
    } else if (isDrawingLine && lineStart && previewLine) {
      // Block adding line elements if elements are locked
      if (state.editorSettings?.editor?.lockElements) {
        setIsDrawingLine(false);
        setLineStart(null);
        setPreviewLine(null);
        return;
      }
      const width = previewLine.x2 - previewLine.x1;
      const height = previewLine.y2 - previewLine.y1;
      
      if (Math.abs(width) > 5 || Math.abs(height) > 5) {
        const templateIds = getTemplateIdsForDefaults();
        const activeTheme = templateIds.pageTheme || templateIds.bookTheme || 'default';
        const effectivePaletteId = templateIds.pageColorPaletteId || templateIds.bookColorPaletteId;
        const lineDefaults = getGlobalThemeDefaults(activeTheme, 'line', effectivePaletteId);
        const newElement: CanvasElement = {
          id: uuidv4(),
          type: 'line',
          x: previewLine.x1,
          y: previewLine.y1,
          width: width,
          height: height,
          ...lineDefaults // Apply ALL defaults
        };
        if (addElementIfAllowed(newElement)) {
          dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
        }
      }
      setIsDrawingLine(false);
      setLineStart(null);
      setPreviewLine(null);
    } else if (isDrawingShape && shapeStart && previewShape) {
      // Block adding shape elements if elements are locked
      if (state.editorSettings?.editor?.lockElements) {
        setIsDrawingShape(false);
        setShapeStart(null);
        setPreviewShape(null);
        return;
      }
      
      if (previewShape.width > 5 || previewShape.height > 5) {
        // Erlaube Formen außerhalb der Seite, solange sie die aktive Seite noch schneiden
        const shapeLeft = previewShape.x;
        const shapeRight = previewShape.x + previewShape.width;
        const shapeTop = previewShape.y;
        const shapeBottom = previewShape.y + previewShape.height;
        const overlapsActivePage =
          shapeLeft < canvasWidth &&
          shapeRight > 0 &&
          shapeTop < canvasHeight &&
          shapeBottom > 0;

        if (!overlapsActivePage) {
          showOutsidePageTooltip(e.evt.clientX, e.evt.clientY);
          setIsDrawingShape(false);
          setShapeStart(null);
          setPreviewShape(null);
          return;
        }
        const templateIds = getTemplateIdsForDefaults();
        const activeTheme = templateIds.pageTheme || templateIds.bookTheme || 'default';
        const effectivePaletteId = templateIds.pageColorPaletteId || templateIds.bookColorPaletteId;
        const shapeDefaults = getGlobalThemeDefaults(activeTheme, previewShape.type as any, effectivePaletteId);
        const newElement: CanvasElement = {
          id: uuidv4(),
          type: previewShape.type as any,
          x: previewShape.x,
          y: previewShape.y,
          width: previewShape.width,
          height: previewShape.height,
          ...shapeDefaults, // Apply ALL defaults
          polygonSides: previewShape.type === 'polygon' ? (state.toolSettings?.polygon?.polygonSides || shapeDefaults.polygonSides || 5) : shapeDefaults.polygonSides
        };
        if (addElementIfAllowed(newElement)) {
          dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
        }
      }
      setIsDrawingShape(false);
      setShapeStart(null);
      setPreviewShape(null);
    } else if (isDrawingTextbox && textboxStart && previewTextbox) {
      // Block adding text elements if elements are locked
      if (state.editorSettings?.editor?.lockElements) {
        setIsDrawingTextbox(false);
        setTextboxStart(null);
        setPreviewTextbox(null);
        return;
      }
      
      if (previewTextbox.width > 50 || previewTextbox.height > 20) {
        // Erlaube Textboxen außerhalb der Seite, solange sie die aktive Seite noch schneiden
        const boxLeft = previewTextbox.x;
        const boxRight = previewTextbox.x + previewTextbox.width;
        const boxTop = previewTextbox.y;
        const boxBottom = previewTextbox.y + previewTextbox.height;
        const overlapsActivePage =
          boxLeft < canvasWidth &&
          boxRight > 0 &&
          boxTop < canvasHeight &&
          boxBottom > 0;

        if (!overlapsActivePage) {
          showOutsidePageTooltip(e.evt.clientX, e.evt.clientY);
          setIsDrawingTextbox(false);
          setTextboxStart(null);
          setPreviewTextbox(null);
          return;
        }
        let newElement: CanvasElement;
        
        if (previewTextbox.type === 'text') {
          const templateIds = getTemplateIdsForDefaults();
          const activeTheme = templateIds.pageTheme || templateIds.bookTheme || 'default';
          const effectivePaletteId = templateIds.pageColorPaletteId || templateIds.bookColorPaletteId;
          const textDefaults = getGlobalThemeDefaults(activeTheme, 'text', effectivePaletteId);
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: previewTextbox.height,
            ...textDefaults, // Apply ALL defaults
            text: '',
            textType: 'text'
          };
        } else if (previewTextbox.type === 'question') {
          const templateIds = getTemplateIdsForDefaults();
          const activeTheme = templateIds.pageTheme || templateIds.bookTheme || 'default';
          const effectivePaletteId = templateIds.pageColorPaletteId || templateIds.bookColorPaletteId;
          const questionDefaults = getGlobalThemeDefaults(activeTheme, 'question', effectivePaletteId);
          const answerDefaults = getGlobalThemeDefaults(activeTheme, 'answer', effectivePaletteId);
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
            ...questionDefaults, // Apply ALL defaults
            text: '',
            textType: 'question'
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
            ...answerDefaults, // Apply ALL defaults
            text: '',
            textType: 'answer',
            questionElementId: questionElement.id,
            answerId: answerUUID
          };
          
          // Add question element first
          addElementIfAllowed(questionElement);
        } else if (previewTextbox.type === 'qna') {
          const templateIds = getTemplateIdsForDefaults();
          const activeTheme = templateIds.pageTheme || templateIds.bookTheme || 'default';
          const effectivePaletteId = templateIds.pageColorPaletteId || templateIds.bookColorPaletteId;
          const qnaDefaults = getGlobalThemeDefaults(activeTheme, 'qna', effectivePaletteId);

          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: previewTextbox.height,
            ...qnaDefaults, // Apply ALL defaults
            text: '',
            textType: 'qna',
            questionSettings: qnaDefaults.questionSettings,
            answerSettings: qnaDefaults.answerSettings
          };
        } else if (previewTextbox.type === 'free_text') {
          console.log('[Canvas] Creating free_text element');
          try {
            const templateIds = getTemplateIdsForDefaults();
            console.log('[Canvas] templateIds:', templateIds);
            const activeTheme = templateIds.pageTheme || templateIds.bookTheme || 'default';
            console.log('[Canvas] activeTheme:', activeTheme);
            const effectivePaletteId = templateIds.pageColorPaletteId || templateIds.bookColorPaletteId;
            console.log('[Canvas] effectivePaletteId:', effectivePaletteId);
            const freeTextDefaults = getGlobalThemeDefaults(activeTheme, 'free_text', effectivePaletteId);
            console.log('[Canvas] freeTextDefaults:', freeTextDefaults);
            newElement = {
              id: uuidv4(),
              type: 'text',
              x: previewTextbox.x,
              y: previewTextbox.y,
              width: previewTextbox.width,
              height: previewTextbox.height,
              ...freeTextDefaults,
              text: '',
              textType: 'free_text',
              textSettings: freeTextDefaults.textSettings || {}
            };
            console.log('[Canvas] Created free_text element:', newElement);
          } catch (error) {
            console.error('[Canvas] Error creating free_text element:', error);
          }
        } else {
          const templateIds = getTemplateIdsForDefaults();
          const activeTheme = templateIds.pageTheme || templateIds.bookTheme || 'default';
          const effectivePaletteId = templateIds.pageColorPaletteId || templateIds.bookColorPaletteId;
          const answerDefaults = getGlobalThemeDefaults(activeTheme, 'answer', effectivePaletteId);
          
          // Generate UUID for answer immediately
          const answerUUID = uuidv4();
          
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: previewTextbox.height,
            ...answerDefaults, // Apply ALL defaults
            text: '',
            textType: 'answer',
            answerId: answerUUID
          };
        }
        
        if (addElementIfAllowed(newElement)) {
          dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
        }
      }
      setIsDrawingTextbox(false);
      setTextboxStart(null);
      setPreviewTextbox(null);
    } else if (isMovingGroup || isMovingGroupRef.current) {
      // WICHTIG: Finales State-Update mit aktuellen Positionen VOR dem Cleanup
      if (groupMoveInitialPositionsRef.current && (groupMoveStart || groupMoveStartRef.current)) {
        const pos = e.target.getStage()?.getPointerPosition();
        if (pos) {
          const x = (pos.x - stagePos.x) / zoom;
          const y = (pos.y - stagePos.y) / zoom;
          const start = groupMoveStartRef.current || groupMoveStart;
          
          if (start) {
            const deltaX = x - start.x;
            const deltaY = y - start.y;
            
            // Finales Update aller Elemente mit den berechneten Positionen
            state.selectedElementIds.forEach(elementId => {
              const initialPos = groupMoveInitialPositionsRef.current?.[elementId];
              if (initialPos) {
                dispatch({
                  type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                  payload: {
                    id: elementId,
                    updates: {
                      x: initialPos.x + deltaX,
                      y: initialPos.y + deltaY
                    }
                  }
                });
              }
            });
          }
        }
      }
      
      setIsMovingGroup(false);
      isMovingGroupRef.current = false;
      isDraggingGroupRef.current = false;
      setGroupMoveStart(null);
      groupMoveStartRef.current = null;
      // Clean up initial positions
      groupMoveInitialPositionsRef.current = null;
      
      // Force transformer update after drag ends to ensure it's in sync
      if (transformerRef.current && state.selectedElementIds.length > 0) {
        setTimeout(() => {
          if (transformerRef.current && !isDraggingGroupRef.current) {
            try {
              const transformer = transformerRef.current;
              const stage = stageRef.current;
              if (stage) {
                const selectedNodes = state.selectedElementIds.map(id => {
                  try {
                    let node = stage.findOne(`#${id}`);
                    if (!node) {
                      const allNodes = stage.find('*');
                      node = allNodes.find(n => n.id() === id);
                    }
                    return node;
                  } catch {
                    return null;
                  }
                }).filter((node): node is Konva.Node => {
                  if (!node) return false;
                  try {
                    const stage = node.getStage();
                    const parent = node.getParent();
                    const nodeId = node.id();
                    return stage !== null && parent !== null && nodeId !== undefined;
                  } catch {
                    return false;
                  }
                });
                
                if (selectedNodes.length > 0) {
                  transformer.nodes(selectedNodes);
                  batchedTransformerUpdate();
                }
              }
            } catch (error) {
              console.debug('Error updating transformer after drag:', error);
            }
          }
        }, 50);
      }
    }
    
    // Complete selection rectangle if active
    // This must be checked AFTER all other conditions to ensure selection works
    // even when mouse is released on background (not over any element)
    if (isSelecting && selectionStart && currentPage) {      
      // CRITICAL: Calculate selection rectangle from current mouse position, not from state
      // This ensures we use the most up-to-date position even if throttledSetSelectionRect
      // hasn't updated the state yet
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      
      if (pos) {
        const x = (pos.x - stagePos.x) / zoom;
        const y = (pos.y - stagePos.y) / zoom;
        const width = x - selectionStart.x;
        const height = y - selectionStart.y;
        
        const finalRect = {
          x: width < 0 ? x : selectionStart.x,
          y: height < 0 ? y : selectionStart.y,
          width: Math.abs(width),
          height: Math.abs(height),
          visible: true
        };
                
        // Only select if rectangle is large enough
        if (finalRect.width >= 5 && finalRect.height >= 5) {
          const selectedIds = getElementsInSelection(
            currentPage,
            finalRect,
            activePageOffsetX,
            pageOffsetY
          );
                    
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
          // Mark that we just completed a selection to prevent handleStageClick from clearing it
          (window as any).__lastSelectionMouseUp = Date.now();
        } else {
          // Clear selection if rectangle is too small
          dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
        }
      } 
      
      // Final update is immediate (not throttled) to ensure correct state
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0, visible: false });
      setIsSelecting(false);
      setSelectionStart(null);
    } 
    setIsDrawing(false);
    setCurrentPath([]);
  };




  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    // For answer_only in mini preview, prevent context menu but don't start panning here
    // Panning should only be started in handleMouseDown to ensure proper cleanup in handleMouseUp
    if (state.editorInteractionLevel === 'answer_only' && state.isMiniPreview) {
      e.evt.preventDefault();
      // Don't start panning here - let handleMouseDown handle it
      // This ensures handleMouseUp can properly stop panning
      return;
    }
    
    e.evt.preventDefault();
    
    // Exit Style Painter mode on right-click anywhere
    if (state.stylePainterActive) {
      dispatch({ type: 'TOGGLE_STYLE_PAINTER' });
      return;
    }
    
    // Block context menu for restricted users
    if (!canEditElements) return;
    
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
    
    // Context menu only on active page – not on gray area or partner page
    if (isPointerOutsideActivePage(pos)) return;
    
    setContextMenu({ x: e.evt.pageX, y: e.evt.pageY, visible: true });
  };



  const handleCopyItems = () => {
    if (!currentPage) return;
    if (!canCreateQna && currentPage.elements.some(el => state.selectedElementIds.includes(el.id) && el.textType === 'qna')) {
      return;
    }
    
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
    if (!canCreateElements) return;
    if (!canCreateQna && clipboard.some((element) => element.textType === 'qna')) return;
    
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
          const alertX = (lastMousePos.x - stagePos.x) / zoom + activePageOffsetX;
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
    
    // Check if pasting on same page as source
    const currentPageId = state.currentBook?.pages[state.activePageIndex]?.id;
    const isPastingOnSamePage = clipboard.some(element => element.pageId === currentPageId);
    
    // Calculate offset based on top-left element to maintain relative positions
    const minX = Math.min(...clipboard.map(el => el.x));
    const minY = Math.min(...clipboard.map(el => el.y));
    
    // Calculate paste position based on whether it's same page or different page
    let x: number, y: number;
    if (isPastingOnSamePage) {
      // Same page: offset by 20px right and 20px down from original position
      x = minX + 150;
      y = minY + 150;
    } else {
      // Different page: use original position (top-left element position)
      x = minX;
      y = minY;
    }

    const filteredClipboard = clipboard;
    if (isCoverPage && filteredClipboard.length < clipboard.length) {
      showCoverRestrictionAlert('Q&A inline elements cannot be placed on cover pages.');
    }
    if (filteredClipboard.length === 0) {
      setContextMenu({ x: 0, y: 0, visible: false });
      return;
    }

    const pasteActionLabel = filteredClipboard.length > 1 ? 'Paste Elements' : 'Paste Element';
    dispatch({ type: 'SAVE_TO_HISTORY', payload: pasteActionLabel });
    
    // Create ID mapping for question-answer pairs
    const idMapping = new Map<string, string>();
    clipboard.forEach(element => {
      idMapping.set(element.id, uuidv4());
    });
    
    const newElementIds: string[] = [];
    
    filteredClipboard.forEach((element) => {
      const newId = idMapping.get(element.id)!;
      newElementIds.push(newId);

      let questionId = element.questionId;
      let shouldShowConflictToast = false;

      // Check if this is a qna element with a questionId being pasted
      if (element.textType === 'qna' && element.questionId) {
        // Check if the current page is assigned to a user
        const currentPageNumber = state.activePageIndex + 1;
        const assignedUser = state.pageAssignments[currentPageNumber];

        if (assignedUser) {
          // Check if this question is already assigned to this user
          const isAvailable = isQuestionAvailableForUser(element.questionId, assignedUser.id);
          if (!isAvailable) {
            // Question is already assigned to this user - clear questionId and show toast
            questionId = undefined;
            shouldShowConflictToast = true;

            // Show toast error similar to page-assignment-popover.tsx
            const questionText = getQuestionText(element.questionId) || 'Unknown question';
            setTimeout(() => {
              toast.error(
                `Cannot paste question "${questionText}" on page ${currentPageNumber}.\n\nThis question is already assigned to ${assignedUser.name} on another page.`,
                {
                  duration: 5000, // Show for 5 seconds to allow reading longer messages
                }
              );
            }, 100);
          }
        }
      }

      const pastedElement = {
        ...element,
        id: newId,
        x: x + (element.x - minX),
        y: y + (element.y - minY),
        pageId: state.currentBook?.pages[state.activePageIndex]?.id, // Track source page
        // Clear text for question, answer and qna elements when pasting
        text: (element.textType === 'question' || element.textType === 'answer' || element.textType === 'qna') ? '' : element.text,
        formattedText: (element.textType === 'question' || element.textType === 'answer' || element.textType === 'qna') ? '' : element.formattedText,
        // Clear question styling for pasted questions
        fontColor: element.textType === 'question' ? '#9ca3af' : (element.fontColor || element.fill),
        // Clear questionId for question elements and qna elements with conflicts
        questionId: (element.textType === 'question' || (element.textType === 'qna' && shouldShowConflictToast)) ? undefined : questionId,
        // Update questionElementId reference for answer elements
        questionElementId: element.questionElementId ? idMapping.get(element.questionElementId) : element.questionElementId
      };
      addElementIfAllowed(pastedElement, { skipHistory: true });
    });
    
    // Select the pasted elements
    setTimeout(() => {
      dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: newElementIds });
    }, 10);
    
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handleMoveToFront = () => {
    if (!canEditElements) return;
    if (state.selectedElementIds.length === 0) return;
    state.selectedElementIds.forEach(elementId => {
      dispatch({ type: 'MOVE_ELEMENT_TO_FRONT', payload: elementId });
    });
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handleMoveToBack = () => {
    if (!canEditElements) return;
    if (state.selectedElementIds.length === 0) return;
    state.selectedElementIds.forEach(elementId => {
      dispatch({ type: 'MOVE_ELEMENT_TO_BACK', payload: elementId });
    });
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handleMoveUp = () => {
    if (!canEditElements) return;
    if (state.selectedElementIds.length === 0) return;
    state.selectedElementIds.forEach(elementId => {
      dispatch({ type: 'MOVE_ELEMENT_UP', payload: elementId });
    });
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handleMoveDown = () => {
    if (!canEditElements) return;
    if (state.selectedElementIds.length === 0) return;
    state.selectedElementIds.forEach(elementId => {
      dispatch({ type: 'MOVE_ELEMENT_DOWN', payload: elementId });
    });
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handleGroup = () => {
    if (!canCreateElements || !canDeleteElements) return;
    if (!canCreateQna || !canDeleteQna) {
      if (currentPage?.elements.some(el => state.selectedElementIds.includes(el.id) && el.textType === 'qna')) {
        return;
      }
    }
    if (!currentPage || state.selectedElementIds.length < 2) return;

    dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Group Elements' });
    
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
      deleteElementIfAllowed(id, { skipHistory: true });
    });
    addElementIfAllowed(groupElement, { skipHistory: true });
    dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [groupId] });
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handleUngroup = () => {
    if (!canCreateElements || !canDeleteElements) return;
    if (!canCreateQna || !canDeleteQna) {
      if (currentPage?.elements.some(el => state.selectedElementIds.includes(el.id) && el.textType === 'qna')) {
        return;
      }
    }
    if (!currentPage || state.selectedElementIds.length !== 1) return;
    
    const groupElement = currentPage.elements.find(el => el.id === state.selectedElementIds[0]);
    if (!groupElement || (groupElement.type !== 'group' && groupElement.type !== 'brush-multicolor') || !groupElement.groupedElements) return;

    dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Ungroup Elements' });
    
    const newElementIds: string[] = [];
    groupElement.groupedElements.forEach(el => {
      const newElement = {
        ...el,
        x: groupElement.x + el.x,
        y: groupElement.y + el.y
      };
      newElementIds.push(newElement.id);
      addElementIfAllowed(newElement, { skipHistory: true });
    });
    
    deleteElementIfAllowed(groupElement.id, { skipHistory: true });
    dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: newElementIds });
    setContextMenu({ x: 0, y: 0, visible: false });
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    // Allow wheel events for answer_only (view-only mode) and full access
    if (state.editorInteractionLevel === 'no_access') {
      return;
    }
    
    // For mini previews with interactions, allow normal scrolling when no modifier keys
    // Only prevent default and handle canvas interactions when modifier keys are pressed
    if (state.isMiniPreview && !e.evt.ctrlKey && !e.evt.shiftKey) {
      // Allow normal scrolling in modal - don't prevent default
      return;
    }
    
    e.evt.preventDefault();
    
    if (e.evt.shiftKey) {
      // Horizontal scroll with Shift + mousewheel
      setHidePartnerDuringInteraction(true);
      // Set interacting flag for shift+wheel pan
      isInteractingRef.current = true;
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
      zoomTimeoutRef.current = setTimeout(() => {
        isInteractingRef.current = false;
        setHidePartnerDuringInteraction(false);
        
        // Clear transform cache after pan ends
        requestAnimationFrame(() => {
          try {
            if (stageRef.current) {
              const layer = stageRef.current.findOne('Layer');
              if (layer) {
                layer.find('Group').forEach(node => node.clearCache());
              }
            }
          } catch (error) {
            console.debug('Cache clear error:', error);
          }
        });
      }, 200);
      
      setStagePos(
        clampStagePosition({
          x: stagePos.x - e.evt.deltaY,
          y: stagePos.y
        }, zoom)
      );
    } else if (e.evt.ctrlKey) {
      // Zoom with Ctrl + mousewheel
      setHidePartnerDuringInteraction(true);
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

      // Set zooming state to disable interactions
      isZoomingRef.current = true;
      isInteractingRef.current = true;
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
      if (showPartnerTimeoutRef.current) clearTimeout(showPartnerTimeoutRef.current);
      
      zoomTimeoutRef.current = setTimeout(() => {
        isZoomingRef.current = false;
        isInteractingRef.current = false;
        
        // Delay showing partner page to avoid re-renders during continuous zoom
        showPartnerTimeoutRef.current = setTimeout(() => {
          setHidePartnerDuringInteraction(false);
        }, 300);
        
        // Clear transform cache after zoom ends
        requestAnimationFrame(() => {
          try {
            if (stageRef.current) {
              const layer = stageRef.current.findOne('Layer');
              if (layer) {
                layer.find('Group').forEach(node => node.clearCache());
              }
            }
          } catch (error) {
            console.debug('Cache clear error:', error);
          }
        });
      }, 200);

      // During zoom minimal mode, use direct zoom update for smooth experience
      // Element rendering is already disabled, so no performance concerns
      // Always use direct zoom during wheel events for smooth experience
      setZoom(newScale, pointer);
    } else {
      // Pan with two-finger touchpad (mousewheel without Ctrl)
      setHidePartnerDuringInteraction(true);
      // Set interacting flag for touchpad pan
      isInteractingRef.current = true;
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
      zoomTimeoutRef.current = setTimeout(() => {
        isInteractingRef.current = false;
        setHidePartnerDuringInteraction(false);
        
        // Clear transform cache after pan ends
        requestAnimationFrame(() => {
          try {
            if (stageRef.current) {
              const layer = stageRef.current.findOne('Layer');
              if (layer) {
                layer.find('Group').forEach(node => node.clearCache());
              }
            }
          } catch (error) {
            console.debug('Cache clear error:', error);
          }
        });
      }, 200);
      
      setStagePos(
        clampStagePosition({
          x: stagePos.x - e.evt.deltaX,
          y: stagePos.y - e.evt.deltaY
        }, zoom)
      );
    }
  };

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Nach einem ungültigen Platzierungsversuch (Outside-Page-Tooltip)
    // soll der aktuelle Modus erhalten bleiben und keine Selektion
    // / Werkzeug-Umschaltung stattfinden.
    if (suppressNextBackgroundClickSelectRef.current || suppressNextBackgroundClickSelect) {
      suppressNextBackgroundClickSelectRef.current = false;
      setSuppressNextBackgroundClickSelect(false);
      return;
    }

    // Bei Klick auf Canvas: Selector-Dialoge schließen und Änderungen verwerfen
    if (e.evt.button === 0) {
      window.dispatchEvent(new CustomEvent('editor:canvasClicked'));
    }

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
    // But complete the selection first if we're still selecting
    if (isSelecting) {
      // Complete selection rectangle if active
      if (selectionStart && currentPage && stageRef.current) {
        const pointerPos = stageRef.current.getPointerPosition();
        if (pointerPos) {
          const x = (pointerPos.x - stagePos.x) / zoom;
          const y = (pointerPos.y - stagePos.y) / zoom;
          const width = x - selectionStart.x;
          const height = y - selectionStart.y;
          
          const finalRect = {
            x: width < 0 ? x : selectionStart.x,
            y: height < 0 ? y : selectionStart.y,
            width: Math.abs(width),
            height: Math.abs(height),
            visible: true
          };
          
          if (finalRect.width >= 5 && finalRect.height >= 5) {
            const selectedIds = getElementsInSelection(
              currentPage,
              finalRect,
              activePageOffsetX,
              pageOffsetY
            );
            
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
            // Mark that we just completed a selection to prevent clearing it
            justCompletedSelectionRef.current = true;
            setTimeout(() => {
              justCompletedSelectionRef.current = false;
            }, 200);
          } else {
            dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
          }
        }
        
        setSelectionRect({ x: 0, y: 0, width: 0, height: 0, visible: false });
        setIsSelecting(false);
        setSelectionStart(null);
      }
      return;
    }
    
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
      // Don't clear selection if we're currently dragging a group
      // This prevents accidental deselection during drag operations
      if (isDraggingGroupRef.current || isMovingGroup || isMovingGroupRef.current) {
        return;
      }
      
      // Don't clear selection if we just completed a selection rectangle
      // This prevents handleStageClick from clearing the selection immediately after
      // handleGlobalSelectionMouseUp or handleMouseUp sets it
      if (!justCompletedSelectionRef.current) {
        // Clear selection for all tools when clicking background
        dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
      }
      
      // Don't switch away from pan tool or pipette tool
      if (state.activeTool !== 'select' && state.activeTool !== 'pan' && state.activeTool !== 'pipette') {
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      }
    }
  }, [state.activeTool, state.stylePainterActive, dispatch]);


  

  // Preload background images when page changes or background is updated
  useEffect(() => {
    const background = currentPage?.background;
    
    // Helper function to evict least recently used entries
    const evictOldEntries = () => {
      const accessOrder = cacheAccessOrderRef.current;
      const cache = backgroundImageCacheRef.current;
      
      // Remove entries until we're under the limit
      while (cache.size >= MAX_CACHE_ENTRIES && accessOrder.length > 0) {
        const oldestKey = accessOrder.shift();
        if (oldestKey && cache.has(oldestKey)) {
          const entry = cache.get(oldestKey);
          // Free image resources
          if (entry?.full) {
            entry.full.src = '';
          }
          if (entry?.preview && entry.preview !== entry.full) {
            entry.preview.src = '';
          }
          cache.delete(oldestKey);
        }
      }
    };

    // Function to preload a single image
    const preloadImage = (imageUrl: string) => {
      if (!imageUrl) return;
      if (failedBackgroundUrlsRef.current.has(imageUrl)) return; // Skip URLs that previously failed

      const cache = backgroundImageCacheRef.current;
      const accessOrder = cacheAccessOrderRef.current;

      // If already in cache, update access order (LRU)
      if (cache.has(imageUrl)) {
        // Move to end (most recently used)
        const index = accessOrder.indexOf(imageUrl);
        if (index > -1) {
          accessOrder.splice(index, 1);
        }
        accessOrder.push(imageUrl);
        return;
      }
      
      const loadingImages = loadingImagesRef.current;
      if (loadingImages.has(imageUrl)) return; // Already loading
      
      loadingImages.add(imageUrl);
      const isProtectedBgUrl = imageUrl.includes('/api/background-images/');
      
      const loadImageFromUrl = (url: string) => {
        const img = new window.Image();
        const isDataUrl = url.startsWith('data:');
        const isLocalUrl = url.startsWith('http://localhost') || url.startsWith('https://localhost') ||
                          url.startsWith('http://127.0.0.1') || url.startsWith('https://127.0.0.1') ||
                          (!url.startsWith('http://') && !url.startsWith('https://'));
        if (!isDataUrl && !isLocalUrl) {
          img.crossOrigin = 'anonymous';
        }
        const storeEntry = (entry: BackgroundImageEntry) => {
          evictOldEntries();
          cache.set(imageUrl, entry);
          accessOrder.push(imageUrl);
          loadingImages.delete(imageUrl);
          setBackgroundImageCache(new Map(cache));
        };
        img.onload = () => {
          const previewImage = createPreviewImage(img);
          if (previewImage === img || previewImage.complete) {
            storeEntry({ full: img, preview: previewImage });
          } else {
            previewImage.onload = () => storeEntry({ full: img, preview: previewImage });
            previewImage.onerror = () => storeEntry({ full: img, preview: img });
          }
        };
        img.onerror = () => {
          loadingImages.delete(imageUrl);
          failedBackgroundUrlsRef.current.add(imageUrl);
          if (!imageUrl.startsWith('data:')) {
            console.error(`[Background Cache] Failed to load background image: ${imageUrl}`, {
              complete: img.complete,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight
            });
          }
        };
        img.src = url;
      };
      
      if (isProtectedBgUrl && token) {
        fetch(imageUrl, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' })
          .then((res) => {
            if (!res.ok) throw new Error('Failed to fetch background image');
            return res.blob();
          })
          .then((blob) => {
            loadImageFromUrl(URL.createObjectURL(blob));
          })
          .catch((err) => {
            loadingImages.delete(imageUrl);
            console.error(`[Background Cache] Failed to fetch background image: ${imageUrl}`, err);
          });
      } else {
        loadImageFromUrl(imageUrl);
      }
    };
    
    // Preload current page background immediately
    if (background?.type === 'image') {
      const imageUrl =
        resolveBackgroundImageUrl(background, {
          paletteId: activePaletteId,
          paletteColors: activePalette?.colors
        }) || background.value;
      if (imageUrl) {
        preloadImage(imageUrl);
      }
    }
    
    // Also preload images from nearby pages for smooth transitions
    // Memory optimization: Only preload adjacent pages (±2) instead of all pages
    if (state.currentBook?.pages) {
      const activeIndex = state.activePageIndex;
      const preloadRange = 2; // Only preload 2 pages before and after current page
      
      state.currentBook.pages.forEach((page, index) => {
        // Prioritize current page and nearby pages
        const distance = Math.abs(index - activeIndex);
        if (distance <= preloadRange) {
          const pageBackground = page.background;
          if (pageBackground?.type === 'image') {
            const { paletteId, palette } = getPaletteForPage(page);
            const imageUrl =
              resolveBackgroundImageUrl(pageBackground, {
                paletteId,
                paletteColors: palette?.colors
              }) || pageBackground.value;
            if (imageUrl) {
              preloadImage(imageUrl);
            }
          }
        }
      });
    }
    // Use a serialized version of the background to detect changes
    // Also include palette dependencies to reload images when palette changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.activePageIndex, 
    state.currentBook?.pages, 
    currentPage?.background?.type, 
    currentPage?.background?.value, 
    activePaletteId,
    token,
    JSON.stringify(activePalette?.colors),
    JSON.stringify({
      templateId: (currentPage?.background as any)?.backgroundImageTemplateId,
      applyPalette: (currentPage?.background as any)?.applyPalette,
    }),
  ]);

  // Listen for cache invalidation events (e.g., when palette changes)
  useEffect(() => {
    const handleInvalidateCache = (event: CustomEvent<{ pageIndex?: number }>) => {
      const cache = backgroundImageCacheRef.current;
      const accessOrder = cacheAccessOrderRef.current;
      const loadingImages = loadingImagesRef.current;
      failedBackgroundUrlsRef.current.clear(); // Allow retry when palette/theme changes
      
      const targetPageIndex = event.detail?.pageIndex;
      
      if (targetPageIndex !== undefined && state.currentBook?.pages) {
        // Invalidate cache for specific page
        // When palette changes, the Base64 URL changes, so we need to invalidate
        // all Data URL entries that might belong to this page's background
        const page = state.currentBook.pages[targetPageIndex];
        if (page?.background?.type === 'image') {
          // Remove all Data URL entries (Base64 SVG images change when palette changes)
          // Also remove the specific URL if it exists
          const urlsToRemove: string[] = [];
          
          for (const [url] of cache) {
            // Remove all data URLs (they change when palette changes)
            // Also remove entries that match the current page's background template ID
            if (url.startsWith('data:') || 
                (page.background.backgroundImageTemplateId && url.includes(page.background.backgroundImageTemplateId))) {
              urlsToRemove.push(url);
            }
          }
          
          // Also try to get the current URL and remove it
          const { paletteId, palette } = getPaletteForPage(page);
          const currentImageUrl =
            resolveBackgroundImageUrl(page.background, {
              paletteId,
              paletteColors: palette?.colors
            }) || page.background.value;
          
          if (currentImageUrl && !urlsToRemove.includes(currentImageUrl)) {
            urlsToRemove.push(currentImageUrl);
          }
          
          // Remove all matching entries
          urlsToRemove.forEach(url => {
            const entry = cache.get(url);
            if (entry) {
              if (entry.full) entry.full.src = '';
              if (entry.preview && entry.preview !== entry.full) entry.preview.src = '';
              cache.delete(url);
            }
            const orderIndex = accessOrder.indexOf(url);
            if (orderIndex > -1) {
              accessOrder.splice(orderIndex, 1);
            }
            loadingImages.delete(url);
          });
          
          if (urlsToRemove.length > 0) {
            setBackgroundImageCache(new Map(cache));
          }
        }
      } else {
        // Invalidate all cache entries
        for (const [url, entry] of cache) {
          if (entry.full) entry.full.src = '';
          if (entry.preview && entry.preview !== entry.full) entry.preview.src = '';
        }
        cache.clear();
        accessOrder.length = 0;
        loadingImages.clear();
        setBackgroundImageCache(new Map());
      }
    };

    window.addEventListener('invalidateBackgroundImageCache', handleInvalidateCache as EventListener);
    return () => {
      window.removeEventListener('invalidateBackgroundImageCache', handleInvalidateCache as EventListener);
    };
  }, [state.currentBook?.pages]);

  // Phase 2.1: Automatic cache cleanup when page changes
  // Remove cache entries for pages outside the preload range (±2 pages) to free memory
  useEffect(() => {
    if (!state.currentBook?.pages) return;

    const activeIndex = state.activePageIndex;
    const preloadRange = 2; // Same range as used in preloading
    const cache = backgroundImageCacheRef.current;
    const accessOrder = cacheAccessOrderRef.current;
    const loadingImages = loadingImagesRef.current;

    // Collect all URLs that should be kept in cache (current page ± preloadRange)
    const urlsToKeep = new Set<string>();

    state.currentBook.pages.forEach((page, index) => {
      const distance = Math.abs(index - activeIndex);
      if (distance <= preloadRange) {
        const pageBackground = page.background;
        if (pageBackground?.type === 'image') {
          const { paletteId, palette } = getPaletteForPage(page);
          const imageUrl =
            resolveBackgroundImageUrl(pageBackground, {
              paletteId,
              paletteColors: palette?.colors
            }) || pageBackground.value;
          if (imageUrl) {
            urlsToKeep.add(imageUrl);
          }
        }
      }
    });

    // Remove cache entries that are not in the keep set and not currently loading
    const urlsToRemove: string[] = [];
    for (const [url] of cache) {
      if (!urlsToKeep.has(url) && !loadingImages.has(url)) {
        urlsToRemove.push(url);
      }
    }

    // Remove the entries and free resources
    urlsToRemove.forEach(url => {
      const entry = cache.get(url);
      if (entry) {
        // Free image resources
        if (entry.full) {
          entry.full.src = '';
        }
        if (entry.preview && entry.preview !== entry.full) {
          entry.preview.src = '';
        }
        cache.delete(url);
      }

      // Remove from access order
      const orderIndex = accessOrder.indexOf(url);
      if (orderIndex > -1) {
        accessOrder.splice(orderIndex, 1);
      }
    });

    // Update the state to trigger re-renders
    if (urlsToRemove.length > 0) {
      setBackgroundImageCache(new Map(cache));
    }
  }, [state.activePageIndex, state.currentBook?.pages]);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ x: 0, y: 0, visible: false });
    };
    
    const handlePageChange = (event: CustomEvent) => {
      dispatch({ type: 'SET_ACTIVE_PAGE', payload: event.detail });
    };
    
    const handleBrushDone = () => {
      if (!canCreateElements) {
        setBrushStrokes([]);
        setIsBrushMode(false);
        isBrushModeRef.current = false;
        window.dispatchEvent(new CustomEvent('brushModeEnd'));
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
        return;
      }
      if (brushStrokes.length > 0) {
        const templateIds = getTemplateIdsForDefaults();
        const activeTheme = templateIds.pageTheme || templateIds.bookTheme || 'default';
        const effectivePaletteId = templateIds.pageColorPaletteId || templateIds.bookColorPaletteId;
        const brushDefaults = getGlobalThemeDefaults(activeTheme, 'brush', effectivePaletteId);
        
        // Convert each stroke to individual brush elements for grouping
        const groupedBrushElements: CanvasElement[] = brushStrokes.map(strokeData => ({
          id: uuidv4(),
          type: 'brush' as const,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          points: strokeData.points,
          ...brushDefaults, // Apply ALL defaults
          stroke: strokeData.strokeColor || brushDefaults.stroke,
          strokeWidth: strokeData.strokeWidth || brushDefaults.strokeWidth
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
        addElementIfAllowed(newElement);
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
    
    const handleOpenImageModal = (event: CustomEvent<{ elementId: string; position: { x: number; y: number } }>) => {
      const { elementId, position } = event.detail;
      setPendingImageElementId(elementId);
      setPendingImagePosition(position);
      setShowImageModal(true);
    };
    
    const handleOpenStickerModal = (event: CustomEvent<{ elementId: string; position: { x: number; y: number } }>) => {
      const { elementId, position } = event.detail;
      setPendingStickerElementId(elementId);
      setPendingStickerPosition(position);
      setShowStickerModal(true);
    };
    
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('changePage', handlePageChange as EventListener);
    window.addEventListener('brushDone', handleBrushDone as EventListener);
    window.addEventListener('brushCancel', handleBrushCancel as EventListener);
    window.addEventListener('brushUndo', handleBrushUndo as EventListener);
    window.addEventListener('openImageModal', handleOpenImageModal as EventListener);
    window.addEventListener('openStickerModal', handleOpenStickerModal as EventListener);
    
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('changePage', handlePageChange as EventListener);
      window.removeEventListener('brushDone', handleBrushDone as EventListener);
      window.removeEventListener('brushCancel', handleBrushCancel as EventListener);
      window.removeEventListener('brushUndo', handleBrushUndo as EventListener);
      window.removeEventListener('openImageModal', handleOpenImageModal as EventListener);
      window.removeEventListener('openStickerModal', handleOpenStickerModal as EventListener);
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
        itemActions.handleDeleteItems();
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
          if (!canCreateElements) {
            return;
          }
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
                addElementIfAllowed(newElement);
              }
            }).catch(() => {});
          }
        } else if (e.key === 'x' && state.selectedElementIds.length > 0) {
          e.preventDefault();
          itemActions.handleCopyItems();
          itemActions.handleDeleteItems();
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
        } else if (e.key === 'd' && state.selectedElementIds.length > 0) {
          e.preventDefault();
          itemActions.handleDuplicateItems();
        } else if (e.key === 'a' && state.selectedElementIds.length > 0) {
          e.preventDefault();
          // Trigger auto-size for selected textbox elements
          state.selectedElementIds.forEach(elementId => {
            const element = currentPage?.elements.find(el => el.id === elementId);
            if (false) {
              window.dispatchEvent(new CustomEvent('triggerAutoSize', {
                detail: { elementId }
              }));
            }
          });
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
  }, [state.selectedElementIds, currentPage, clipboard, lastMousePos, stagePos, zoom, undo, redo, itemActions.handleDeleteItems, itemActions.handleCopyItems, itemActions.handlePasteItems]);
  
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
            
      // Use the selectedQuestionElementId which is set when opening the dialog
      if (selectedQuestionElementId) {
        const element = currentPage?.elements.find(el => el.id === selectedQuestionElementId);
                
        if (element && (element.textType === 'qna' || element.textType === 'question')) {
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
          // Get default font color from theme defaults as fallback
          const qnaDefaults = getGlobalThemeDefaults('default', 'qna', undefined);
          const fontColor = element.fontColor || element.fill || qnaDefaults.fontColor || '#000000';          
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
        }
      }
    };
    
    const handleOpenQuestionModal = (event: CustomEvent) => {
      if (!canManageQuestions) {
        return;
      }
      const element = currentPage?.elements.find(el => el.id === event.detail.elementId);
      if (element && (element.textType === 'question' || element.textType === 'qna')) {
        setSelectedQuestionElementId(element.id);
        setShowQuestionDialog(true);
      }
    };
    
    const handleOpenQuestionSelector = (event: CustomEvent) => {
      if (!canManageQuestions) {
        return;
      }
      const element = currentPage?.elements.find(el => el.id === event.detail.elementId);
      if (element && element.textType === 'qna') {
        setQuestionSelectorElementId(element.id);
        setShowQuestionSelectorModal(true);
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
      const alertX = (x + width / 2) * zoom + stagePos.x + activePageOffsetX;
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
    window.addEventListener('openQuestionDialog', handleOpenQuestionSelector as EventListener);
    window.addEventListener('findQuestionElement', handleFindQuestionElement as EventListener);
    window.addEventListener('questionSelected', handleQuestionSelected as EventListener);
    window.addEventListener('showAlert', handleShowAlert as EventListener);
    window.addEventListener('resetQuestion', handleResetQuestion as EventListener);
    return () => {
      window.removeEventListener('editText', handleTextEdit as EventListener);
      window.removeEventListener('openQuestionModal', handleOpenQuestionModal as EventListener);
      window.removeEventListener('openQuestionDialog', handleOpenQuestionSelector as EventListener);
      window.removeEventListener('findQuestionElement', handleFindQuestionElement as EventListener);
      window.removeEventListener('questionSelected', handleQuestionSelected as EventListener);
      window.removeEventListener('showAlert', handleShowAlert as EventListener);
      window.removeEventListener('resetQuestion', handleResetQuestion as EventListener);
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
    };
  }, [currentPage, editingElement, selectedQuestionElementId, user]);




  // Expose stage reference for PDF export
  useEffect(() => {
    if (stageRef.current) {
      (window as any).konvaStage = stageRef.current;
    }
  }, [stageRef.current]);

  // Check if any selected element is outside the safety margin
  useEffect(() => {
    // Check if elements are selected
    if (!currentPage || state.selectedElementIds.length === 0) {
      // If no elements selected, only clear if not manually hovering
      if (!isManuallyHovering) {
        setHoveredSafetyMargin(false);
        setSafetyMarginTooltip(null);
      }
      return;
    }

    const checkElementPosition = () => {
      let hasElementOutsideSafetyMargin = false;

      // Check selected elements
      if (currentPage && state.selectedElementIds.length > 0) {
        const transformer = transformerRef.current;
        
        if (transformer) {
          const nodes = transformer.nodes();
          nodes.forEach(node => {
            // Get element position in page coordinates
            const nodeX = node.x();
            const nodeY = node.y();
            
            // Get element dimensions - need to get from element state for Groups
            const elementId = node.id();
            const element = currentPage?.elements?.find(el => el.id === elementId);
            
            let nodeWidth = 0;
            let nodeHeight = 0;
            
            if (element) {
              // All elements are in Groups, calculate from element state and scale
              const groupNode = node as Konva.Group;
              const groupScaleX = groupNode.scaleX() || 1;
              const groupScaleY = groupNode.scaleY() || 1;
              // Use element width/height and multiply by current scale during resize
              nodeWidth = (element.width || 0) * groupScaleX;
              nodeHeight = (element.height || 0) * groupScaleY;
            } else {
              // Fallback: try to get from node directly
              nodeWidth = (node.width() || 0) * (node.scaleX() || 1);
              nodeHeight = (node.height() || 0) * (node.scaleY() || 1);
            }
            
            // Convert to page coordinates (relative to activePageOffsetX and pageOffsetY)
            // The node position is already in the Group coordinate system (which is offset by activePageOffsetX, pageOffsetY)
            // So we need to check if it's outside the safety margin
            const elementLeft = nodeX;
            const elementRight = nodeX + nodeWidth;
            const elementTop = nodeY;
            const elementBottom = nodeY + nodeHeight;
            
            // Check if element is outside safety margin
            // Left: element starts before the safety margin line
            const isOutsideLeft = elementLeft < SAFETY_MARGIN_PX;
            // Right: element ends after (or on) the safety margin line
            // The safety margin line is at canvasWidth - SAFETY_MARGIN_PX
            // So if elementRight is greater than or equal to this, it's outside
            const safetyMarginRight = canvasWidth - SAFETY_MARGIN_PX;
            const isOutsideRight = elementRight >= safetyMarginRight;
            // Top: element starts before the safety margin line
            const isOutsideTop = elementTop < SAFETY_MARGIN_PX;
            // Bottom: element ends after (or on) the safety margin line
            const safetyMarginBottom = canvasHeight - SAFETY_MARGIN_PX;
            const isOutsideBottom = elementBottom >= safetyMarginBottom;
            
            if (isOutsideLeft || isOutsideRight || isOutsideTop || isOutsideBottom) {
              hasElementOutsideSafetyMargin = true;
            }
          });
        } else {
          // Fallback: check elements from state
          state.selectedElementIds.forEach(elementId => {
            const element = currentPage.elements?.find(el => el.id === elementId);
            if (element) {
              const elementLeft = element.x || 0;
              const elementRight = (element.x || 0) + (element.width || 0);
              const elementTop = element.y || 0;
              const elementBottom = (element.y || 0) + (element.height || 0);
              
              const isOutsideLeft = elementLeft < SAFETY_MARGIN_PX;
              const safetyMarginRight = canvasWidth - SAFETY_MARGIN_PX;
              const isOutsideRight = elementRight >= safetyMarginRight;
              const isOutsideTop = elementTop < SAFETY_MARGIN_PX;
              const safetyMarginBottom = canvasHeight - SAFETY_MARGIN_PX;
              const isOutsideBottom = elementBottom >= safetyMarginBottom;
              
              if (isOutsideLeft || isOutsideRight || isOutsideTop || isOutsideBottom) {
                hasElementOutsideSafetyMargin = true;
              }
            }
          });
        }
      }

      // Also check if snapped to safety margin (element is at the edge)
      const safetyMarginPositions = [
        activePageOffsetX + SAFETY_MARGIN_PX, // left
        activePageOffsetX + canvasWidth - SAFETY_MARGIN_PX, // right
        pageOffsetY + SAFETY_MARGIN_PX, // top
        pageOffsetY + canvasHeight - SAFETY_MARGIN_PX // bottom
      ];

      const isSnappedToSafetyMargin = snapGuidelines.length > 0 && snapGuidelines.some(guideline => {
        return safetyMarginPositions.some(pos => {
          return Math.abs(guideline.position - pos) < 1;
        });
      });

      // Only show fill if manually hovering over safety margin area
      // Don't set hoveredSafetyMargin based on element position alone - only on mouse hover
      if (!isManuallyHovering) {
        // Clear if not manually hovering (mouse not over safety margin)
        setHoveredSafetyMargin(false);
        setSafetyMarginTooltip(null);
      }
      // If isManuallyHovering is true, hoveredSafetyMargin is already set by onMouseMove handler
    };

    // Check immediately
    checkElementPosition();

    // Set up interval to check continuously while elements are selected
    const interval = setInterval(() => {
      // Always check if elements are selected
      if (state.selectedElementIds.length > 0) {
        checkElementPosition();
      }
    }, 50); // Check every 50ms while elements are selected

    return () => clearInterval(interval);
  }, [snapGuidelines, isDragging, state.selectedElementIds, currentPage, activePageOffsetX, pageOffsetY, canvasWidth, canvasHeight, isManuallyHovering]);


  const handleSnapPosition = (node: Konva.Node, x: number, y: number, enableGridSnap: boolean = false) => {
    // Check if magnetic snapping is enabled (default to true if not set)
    const magneticSnapping = (state as any).magneticSnapping !== false;
    const result = snapPosition(
      node,
      x,
      y,
      enableGridSnap,
      magneticSnapping,
      currentPage!,
      canvasWidth,
      canvasHeight,
      activePageOffsetX,
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
    
    // Skip if container has no dimensions
    if (containerWidth <= 0 || containerHeight <= 0) return;
    
    // Get orientation to adjust padding and safety margins
    const orientation = state.currentBook?.orientation || 'portrait';
    const isLandscape = orientation === 'landscape';
    
    // For mini previews, use orientation-specific padding
    // Landscape needs more aggressive padding to prevent clipping
    // Portrait can use less padding to avoid over-zooming
    let minPadding: number;
    let safetyMargin: number;
    if (state.isMiniPreview) {
      if (isLandscape) {
        // Landscape: more padding and safety margin to prevent clipping
        minPadding = 60;
        safetyMargin = 0.85; // 15% reduction
      } else {
        // Portrait: less padding and smaller safety margin
        minPadding = 40;
        safetyMargin = 0.90; // 10% reduction
      }
    } else {
      minPadding = 10;
      safetyMargin = 1.0;
    }
    
    // Calculate spread dimensions (two pages side by side with gap)
    const spreadWidth = canvasWidth * (hasPartnerPage ? 2 : 1) + (hasPartnerPage ? canvasWidth * 0.05 : 0);
    
    // Calculate scale factors to fit required dimensions into container
    const scaleX = (containerWidth - minPadding * 2) / spreadWidth;
    const scaleY = (containerHeight - minPadding * 2) / canvasHeight;
    
    // For mini previews, allow zooming out below 1 to ensure everything fits with padding
    // For regular editor, limit to 1 (100%) to prevent zooming out too far
    let optimalZoom: number;
    if (state.isMiniPreview) {
      // No upper limit for mini previews - allow any zoom level to fit content
      // Use the smaller scale to ensure everything fits
      optimalZoom = Math.min(scaleX, scaleY);
      
      // Apply orientation-specific safety margin
      optimalZoom = optimalZoom * safetyMargin;
      
      // For landscape, do an additional check to ensure padding is sufficient
      if (isLandscape) {
        const testSpreadWidth = spreadWidth * optimalZoom;
        const testPageHeight = canvasHeight * optimalZoom;
        const testPaddingX = (containerWidth - testSpreadWidth) / 2;
        const testPaddingY = (containerHeight - testPageHeight) / 2;
        
        // If padding is still too small for landscape, recalculate with additional reduction
        if (testPaddingX < minPadding || testPaddingY < minPadding) {
          const safeScaleX = (containerWidth - minPadding * 2.5) / spreadWidth;
          const safeScaleY = (containerHeight - minPadding * 2.5) / canvasHeight;
          optimalZoom = Math.min(safeScaleX, safeScaleY) * 0.85; // Extra 15% safety margin for landscape
        }
      }
    } else {
      // Regular editor: limit to 100% max zoom
      optimalZoom = Math.min(scaleX, scaleY, 1);
    }
    
    // Ensure zoom is never negative or zero
    optimalZoom = Math.max(optimalZoom, 0.1);
    
    // For mini previews, ensure we don't zoom in too much - cap at 0.8 (80%) to allow closer view
    if (state.isMiniPreview) {
      optimalZoom = Math.min(optimalZoom, 0.8);
    }
    
    // Center the spread in the container
    const scaledSpreadWidth = spreadWidth * optimalZoom;
    const scaledPageHeight = canvasHeight * optimalZoom;
    
    const centerX = (containerWidth - scaledSpreadWidth) / 2;
    const centerY = (containerHeight - scaledPageHeight) / 2;
    
    setZoomFromContext(optimalZoom);
    setStagePos(clampStagePosition({ x: centerX, y: centerY }, optimalZoom));
  }, [canvasWidth, canvasHeight, clampStagePosition, hasPartnerPage, state.isMiniPreview, state.currentBook?.orientation, setZoomFromContext]);

  // Keep fitToViewRef up to date
  useEffect(() => {
    fitToViewRef.current = fitToView;
  }, [fitToView]);

  // Auto-fit when entering the canvas editor or when container size changes
  useEffect(() => {
    if (state.isMiniPreview) {
      // For mini previews, only fit to view initially or when dimensions change
      // Don't auto-fit if user has manually zoomed
      if (!hasManualZoom) {
        const timeoutId = setTimeout(() => {
          fitToView();
        }, 50);
        return () => clearTimeout(timeoutId);
      }
      return;
    }
    const hasInitialZoom = zoom !== 0.8; // 0.8 is the initial zoom value
    if (!hasInitialZoom) {
      fitToView();
    }
  }, [fitToView, state.isMiniPreview, zoom, canvasWidth, canvasHeight, hasPartnerPage, hasManualZoom]);

  // For mini previews, also react to container size changes (but only if user hasn't manually zoomed)
  useEffect(() => {
    if (state.isMiniPreview && containerSize.width > 0 && containerSize.height > 0 && !hasManualZoom) {
      const timeoutId = setTimeout(() => {
        fitToView();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [fitToView, state.isMiniPreview, containerSize.width, containerSize.height, hasManualZoom]);

  // Auto-fit when page changes (reset zoom to show both pages)
  useEffect(() => {
    // Skip in mini preview mode
    if (state.isMiniPreview) {
      previousActivePageIndexRef.current = state.activePageIndex;
      return;
    }
    
    const previousPageIndex = previousActivePageIndexRef.current;
    const currentPageIndex = state.activePageIndex;
    
    // Initialize ref on first render (skip auto-fit on initial load)
    if (previousPageIndex === null) {
      previousActivePageIndexRef.current = currentPageIndex;
      return;
    }
    
    // Only auto-fit if page actually changed
    if (previousPageIndex !== currentPageIndex) {
      // Page actually changed - reset zoom to show both pages
      setHasManualZoom(false);
      // Update ref immediately to prevent duplicate calls
      previousActivePageIndexRef.current = currentPageIndex;
      
      // Use a small timeout to ensure the page has fully loaded
      const timeoutId = setTimeout(() => {
        if (fitToViewRef.current) {
          fitToViewRef.current();
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [state.activePageIndex, state.isMiniPreview]);

  // Cache partner page group for better performance
  useEffect(() => {
    if (partnerPageGroupRef.current && partnerPage) {
      const group = partnerPageGroupRef.current;
      // Only cache if group has valid dimensions
      const width = group.width();
      const height = group.height();
      
      if (width > 0 && height > 0) {
        // Cache the group as bitmap for faster rendering
        group.cache();
      }
      
      return () => {
        // Clear cache when partner page changes
        try {
          group.clearCache();
        } catch {
          // Ignore errors if group was already destroyed
        }
      };
    }
  }, [partnerPage?.id, partnerPage?.elements?.length]);

  // Listen for fitToView trigger events (e.g., when modal opens)
  useEffect(() => {
    if (!state.isMiniPreview) return;
    
    const handleTriggerFitToView = () => {
      if (!hasManualZoom) {
        // Reset manual zoom flag when modal opens to allow auto-fit
        setHasManualZoom(false);
        setTimeout(() => {
          fitToView();
        }, 100);
      }
    };
    
    window.addEventListener('triggerFitToView', handleTriggerFitToView);
    return () => {
      window.removeEventListener('triggerFitToView', handleTriggerFitToView);
    };
  }, [state.isMiniPreview, hasManualZoom, fitToView]);

  // Global mouseup listener to stop panning when mouse is released outside canvas
  // This is especially important for right-click panning in answer_only mode
  useEffect(() => {
    if (state.editorInteractionLevel !== 'answer_only' || !state.isMiniPreview) return;
    
    const handleGlobalMouseUp = (e: MouseEvent) => {
      // Stop panning if it's active, regardless of where the mouse is released
      if (isPanning) {
        setIsPanning(false);
        setPanStart({ x: 0, y: 0 });
        setHasPanned(false);
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [state.editorInteractionLevel, state.isMiniPreview, isPanning]);

  // Global mouseup listener to complete selection rectangle when mouse is released
  // This ensures selection works even when mouse is released on background or over a canvas item
  // that might intercept the event and prevent it from reaching the Stage
  useEffect(() => {
    const handleGlobalSelectionMouseUp = (e: MouseEvent) => {
      // Only handle if we're currently selecting
      if (!isSelecting || !selectionStart || !currentPage || !stageRef.current) return;
      
      // CRITICAL: Calculate selection rectangle from current mouse position, not from state
      // This ensures we use the most up-to-date position even if throttledSetSelectionRect
      // hasn't updated the state yet
      const stage = stageRef.current;
      const pointerPos = stage.getPointerPosition();
      
      if (!pointerPos) {
        return;
      }
      
      // CRITICAL: Use the same coordinate calculation as in handleMouseMove
      // The selectionStart is already in page coordinates (not stage coordinates)
      const x = (pointerPos.x - stagePos.x) / zoom;
      const y = (pointerPos.y - stagePos.y) / zoom;
      const width = x - selectionStart.x;
      const height = y - selectionStart.y;
      
      
      const finalRect = {
        x: width < 0 ? x : selectionStart.x,
        y: height < 0 ? y : selectionStart.y,
        width: Math.abs(width),
        height: Math.abs(height),
        visible: true
      };
            
      // Only select if rectangle is large enough
      if (finalRect.width >= 5 && finalRect.height >= 5) {
        const selectedIds = getElementsInSelection(
          currentPage,
          finalRect,
          activePageOffsetX,
          pageOffsetY
        );
                
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
        // Mark that we just completed a selection to prevent handleStageClick from clearing it
        justCompletedSelectionRef.current = true;
        // Reset flag after a short delay to allow handleStageClick to see it
        setTimeout(() => {
          justCompletedSelectionRef.current = false;
        }, 200);
      } else {
        // Clear selection if rectangle is too small
        dispatch({ type: 'SET_SELECTED_ELEMENTS', payload: [] });
      }
      
      // Final update is immediate (not throttled) to ensure correct state
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0, visible: false });
      setIsSelecting(false);
      setSelectionStart(null);
    };
    
    // Use capture phase to ensure we catch the event before it's handled by other handlers
    window.addEventListener('mouseup', handleGlobalSelectionMouseUp, true);
    return () => {
      window.removeEventListener('mouseup', handleGlobalSelectionMouseUp, true);
    };
  }, [isSelecting, selectionStart, currentPage, activePageOffsetX, pageOffsetY, dispatch, stagePos, zoom]);

  const handleImageSelect = useCallback((imageId: number, imageUrl: string) => {
    if (pendingImageElementId && !canEditElements) return;
    if (!pendingImageElementId && !canCreateElements) return;
    if (!pendingImageElementId && !pendingImagePosition) return;
    
    const elementIdToUpdate = pendingImageElementId;
    const positionToUse = pendingImagePosition;
    
    const isProtectedImageUrl = imageUrl.includes('/api/images/file/');
    const loadImageUrl = async (url: string): Promise<string> => {
      if (isProtectedImageUrl && token) {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to load image');
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
      return url;
    };
    
    const processImage = (loadableUrl: string) => {
      const img = new window.Image();
      img.onload = () => {
        const maxWidth = 600;
        const aspectRatio = img.width / img.height;
        const width = maxWidth;
        const height = maxWidth / aspectRatio;
        if (loadableUrl !== imageUrl) URL.revokeObjectURL(loadableUrl);
        
        if (elementIdToUpdate) {
          const element = currentPage?.elements.find(el => el.id === elementIdToUpdate);
          if (element) {
            dispatch({
              type: 'UPDATE_ELEMENT',
              payload: {
                id: elementIdToUpdate,
                updates: {
                  type: 'image',
                  src: imageUrl,
                  width: element.width || width,
                  height: element.height || height
                }
              }
            });
          }
        } else if (positionToUse) {
          const newElement: CanvasElement = {
            id: uuidv4(),
            type: 'image',
            x: positionToUse.x,
            y: positionToUse.y,
            width,
            height,
            src: imageUrl,
            cornerRadius: 0
          };
          addElementIfAllowed(newElement);
        }
        
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
        setShowImageModal(false);
        setPendingImagePosition(null);
        setPendingImageElementId(null);
      };
      img.onerror = () => {
        if (loadableUrl !== imageUrl) URL.revokeObjectURL(loadableUrl);
        console.error('Failed to load image');
        setShowImageModal(false);
        setPendingImagePosition(null);
        setPendingImageElementId(null);
      };
      img.src = loadableUrl;
    };
    
    loadImageUrl(imageUrl).then(processImage).catch(() => {
      setShowImageModal(false);
      setPendingImagePosition(null);
      setPendingImageElementId(null);
    });
  }, [pendingImageElementId, currentPage, pendingImagePosition, canEditElements, canCreateElements, addElementIfAllowed, dispatch, token]);

  const handleImageModalClose = () => {
    setShowImageModal(false);
    setPendingImagePosition(null);
    setPendingImageElementId(null);
    dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
  };

  const handleStickerSelect = useCallback(async (selection: { stickerId: string; textEnabled: boolean; text: string }) => {
    if (!selection?.stickerId) return;
    if (pendingStickerElementId && !canEditElements) return;
    if (!pendingStickerElementId && !canCreateElements) return;
    
    // Load sticker registry if needed
    await loadStickerRegistry();
    
    const sticker = getStickerById(selection.stickerId);
    if (!sticker || !sticker.url) {
      console.error('Sticker not found or missing URL:', { stickerId: selection.stickerId, sticker });
      setShowStickerModal(false);
      setPendingStickerPosition(null);
      setPendingStickerElementId(null);
      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      return;
    }

    const loadStickerImageUrl = async (url: string): Promise<string> => {
      if (url.includes('/api/stickers/') && token) {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load sticker');
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
      return url;
    };

    const templateIds = getTemplateIdsForDefaults();
    const activeTheme = templateIds.pageTheme || templateIds.bookTheme || 'default';
    const stickerTextDefaults = getGlobalThemeDefaults(activeTheme, 'free_text', undefined);
    const hasStickerText = selection.textEnabled && selection.text.trim().length > 0;
    const stickerTextSettings = {
      fontSize: stickerTextDefaults?.textSettings?.fontSize ?? stickerTextDefaults?.fontSize ?? 50,
      fontFamily: stickerTextDefaults?.textSettings?.fontFamily ?? stickerTextDefaults?.fontFamily ?? 'Arial, sans-serif',
      fontBold: stickerTextDefaults?.textSettings?.fontBold ?? false,
      fontItalic: stickerTextDefaults?.textSettings?.fontItalic ?? false,
      fontColor: stickerTextDefaults?.textSettings?.fontColor ?? stickerTextDefaults?.fontColor ?? '#1f2937',
      fontOpacity: stickerTextDefaults?.textSettings?.fontOpacity ?? 1
    };
        
    // If we have a pending element ID, update the existing sticker element
    if (pendingStickerElementId) {
      loadStickerImageUrl(sticker.url).then((loadableUrl) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (loadableUrl !== sticker.url) URL.revokeObjectURL(loadableUrl);
          const element = currentPage?.elements.find(el => el.id === pendingStickerElementId);
          if (element) {
            const existingHasText = Boolean(element.stickerText && element.stickerText.trim().length > 0);
            const nextTextEnabled = element.stickerTextEnabled ?? existingHasText;
            const maxWidth = 300;
            const aspectRatio = img.width / img.height;
            const width = maxWidth;
            const height = maxWidth / aspectRatio;
            
            dispatch({
              type: 'UPDATE_ELEMENT',
              payload: {
                id: pendingStickerElementId,
                updates: {
                  src: sticker.url,
                  width: element.width || width,
                  height: element.height || height,
                  stickerId: sticker.id,
                  stickerFormat: sticker.format,
                  stickerFilePath: sticker.filePath,
                  stickerOriginalUrl: sticker.url,
                  stickerColor: undefined,
                  stickerTextEnabled: nextTextEnabled,
                  stickerText: element.stickerText,
                  stickerTextSettings: element.stickerTextSettings ?? stickerTextSettings,
                  stickerTextOffset: element.stickerTextOffset
                }
              }
            });
          }
          dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
          setShowStickerModal(false);
          setPendingStickerPosition(null);
          setPendingStickerElementId(null);
        };
        img.onerror = () => {
          if (loadableUrl !== sticker.url) URL.revokeObjectURL(loadableUrl);
          setShowStickerModal(false);
          setPendingStickerPosition(null);
          setPendingStickerElementId(null);
          dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
        };
        img.src = loadableUrl;
      }).catch(() => {
        setShowStickerModal(false);
        setPendingStickerPosition(null);
        setPendingStickerElementId(null);
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      });
      return;
    }
    
    // Otherwise, create a new element (existing behavior)
    if (!pendingStickerPosition) return;
    
    const tryLoadSticker = (url: string, useThumbnailAsSrc: boolean) => {
      loadStickerImageUrl(url).then((loadableUrl) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (loadableUrl !== url) URL.revokeObjectURL(loadableUrl);
          const maxWidth = 300;
          const aspectRatio = img.width / img.height;
          const width = maxWidth;
          const height = maxWidth / aspectRatio;
          
          const newElement: CanvasElement = {
            id: uuidv4(),
            type: 'sticker',
            x: pendingStickerPosition!.x,
            y: pendingStickerPosition!.y,
            width,
            height,
            imageOpacity: 1,
            src: useThumbnailAsSrc ? sticker.thumbnailUrl : sticker.url,
            stickerId: sticker.id,
            stickerFormat: sticker.format,
            stickerFilePath: sticker.filePath,
            stickerOriginalUrl: sticker.url,
            stickerTextEnabled: selection.textEnabled,
            stickerText: hasStickerText ? selection.text : undefined,
            stickerTextSettings: stickerTextSettings,
            stickerTextOffset: hasStickerText ? { x: 0, y: height + 8 } : undefined,
            cornerRadius: 0,
            imageClipPosition: 'center-middle'
          };
          
          if (addElementIfAllowed(newElement)) {
            dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
            setShowStickerModal(false);
            setPendingStickerPosition(null);
            setPendingStickerElementId(null);
          }
        };
        img.onerror = () => {
          if (loadableUrl !== url) URL.revokeObjectURL(loadableUrl);
          if (!useThumbnailAsSrc && sticker.thumbnailUrl && sticker.thumbnailUrl !== sticker.url) {
            tryLoadSticker(sticker.thumbnailUrl, true);
          } else {
            console.error('Failed to load sticker:', { url: sticker.url, thumbnailUrl: sticker.thumbnailUrl });
            setShowStickerModal(false);
            setPendingStickerPosition(null);
            dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
          }
        };
        img.src = loadableUrl;
      }).catch(() => {
        if (!useThumbnailAsSrc && sticker.thumbnailUrl && sticker.thumbnailUrl !== sticker.url) {
          tryLoadSticker(sticker.thumbnailUrl, true);
        } else {
          setShowStickerModal(false);
          setPendingStickerPosition(null);
          dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
        }
      });
    };
    tryLoadSticker(sticker.url, false);
  }, [pendingStickerElementId, currentPage, pendingStickerPosition, canEditElements, canCreateElements, addElementIfAllowed, dispatch, token]);

  const handleStickerModalClose = () => {
    setShowStickerModal(false);
    setPendingStickerPosition(null);
    setPendingStickerElementId(null);
    dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
  };

  const handleQrCodeModalClose = () => {
    setShowQrCodeModal(false);
    setPendingQrCodePosition(null);
    dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
  };

  const handleQrCodeCreate = (value: string) => {
    if (!pendingQrCodePosition) return;
    if (!canCreateElements) return;

    const templateIds = getTemplateIdsForDefaults();
    const activeTheme = templateIds.pageTheme || templateIds.bookTheme || 'default';
    const effectivePaletteId = templateIds.pageColorPaletteId || templateIds.bookColorPaletteId;
    const qrDefaults = getGlobalThemeDefaults(activeTheme, 'qr_code', effectivePaletteId);
    const size = 200;

    const newElement: CanvasElement = {
      id: uuidv4(),
      type: 'qr_code',
      x: pendingQrCodePosition.x,
      y: pendingQrCodePosition.y,
      width: size,
      height: size,
      qrValue: value,
      ...qrDefaults
    };

    if (addElementIfAllowed(newElement)) {
      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      setShowQrCodeModal(false);
      setPendingQrCodePosition(null);
    }
  };

  if (!currentPage || shouldBlockCanvasRendering) {
    const messageTitle = isReverseCoverPage
      ? 'This page cannot be edited'
      : 'This page is not printable';
    const messageBody = isReverseCoverPage
      ? 'This side of the cover is intentionally left blank so the spread lines up correctly.'
      : 'This side of the spread is intentionally left blank. Use the opposite page to add your content.';
    return (
      <CanvasPageContainer assignedUser={state.pageAssignments[state.activePageIndex + 1] || null}>
        <div className="flex flex-col items-center justify-center w-full h-full bg-muted/40 border border-dashed border-muted rounded-xl text-center px-8 py-10 space-y-3">
          <h2 className="text-xl font-semibold text-foreground">{messageTitle}</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {messageBody}
          </p>
        </div>
      </CanvasPageContainer>
    );
  }

  // Berechne State-Werte für QNA-Elemente
  // Serialisiere Element-Eigenschaften für Dependencies, damit Änderungen erkannt werden
  const qnaElementsSerialized = useMemo(() => {
    if (!currentPage?.elements) return '';
    return currentPage.elements
      .filter(el => el.type === 'text' && el.textType === 'qna')
      .map(el => {
        const qnaEl = el as any;
        return JSON.stringify({
          id: el.id,
          questionId: el.questionId,
          questionSettings: qnaEl.questionSettings,
          answerSettings: qnaEl.answerSettings,
          layoutVariant: qnaEl.layoutVariant,
          qnaIndividualSettings: qnaEl.qnaIndividualSettings,
          align: el.align,
          formatTextAlign: (el as any).format?.textAlign, // Wichtig für Style-Berechnung
          paragraphSpacing: el.paragraphSpacing,
          formattedText: el.formattedText,
          text: el.text,
          backgroundColor: el.backgroundColor,
          backgroundOpacity: el.backgroundOpacity,
          backgroundEnabled: qnaEl.backgroundEnabled,
          borderColor: el.borderColor,
          borderWidth: el.borderWidth,
          borderOpacity: el.borderOpacity,
          borderEnabled: qnaEl.borderEnabled,
          borderTheme: qnaEl.borderTheme,
          cornerRadius: el.cornerRadius,
          padding: el.padding,
          answerInNewRow: qnaEl.answerInNewRow,
          questionAnswerGap: qnaEl.questionAnswerGap,
          blockQuestionAnswerGap: qnaEl.blockQuestionAnswerGap,
          ruledLines: qnaEl.ruledLines,
          ruledLinesWidth: qnaEl.ruledLinesWidth,
          ruledLinesTheme: qnaEl.ruledLinesTheme,
          ruledLinesColor: qnaEl.ruledLinesColor,
          ruledLinesOpacity: qnaEl.ruledLinesOpacity,
          ruledLinesTarget: qnaEl.ruledLinesTarget,
          theme: el.theme // Wichtig für Theme-Berechnung
        });
      })
      .join('|');
  }, [currentPage?.elements]);
  
  const qnaElementData = useMemo(() => {
    const data = new Map<string, {
      questionText: string;
      answerText: string;
      questionStyle: ReturnType<typeof calculateQuestionStyle>;
      answerStyle: ReturnType<typeof calculateAnswerStyle>;
      assignedUser: { id: string } | null;
    }>();
    
    currentPage?.elements.forEach(element => {
      if (element.type === 'text' && element.textType === 'qna') {
        // Berechne questionText
        let questionText = 'Double-click to add a question...';
        if (element.questionId) {
          const questionData = state.tempQuestions[element.questionId];
          if (questionData) {
            questionText = parseQuestionPayload(questionData);
          } else {
            questionText = 'Question loading...';
          }
        }
        
        // Berechne assignedUser
        let assignedUser: { id: string } | null = null;
        const elementPageNumber = currentPage?.pageNumber ?? null;
        if (elementPageNumber !== null) {
          assignedUser = state.pageAssignments[elementPageNumber] || null;
        }
        
        // Berechne answerText
        let answerText = '';
        if (element.questionId) {
          if (assignedUser) {
            const answerEntry = state.tempAnswers[element.questionId]?.[assignedUser.id];
            answerText = answerEntry?.text || '';
          }
        } else {
          if (element.formattedText) {
            answerText = stripHtml(element.formattedText);
          } else if (element.text) {
            answerText = element.text;
          }
        }
        
        // Berechne Styles
        const questionStyle = calculateQuestionStyle(element, currentPage, state.currentBook || undefined);
        const answerStyle = calculateAnswerStyle(element, currentPage, state.currentBook || undefined);
        
        data.set(element.id, {
          questionText,
          answerText,
          questionStyle,
          answerStyle,
          assignedUser
        });
      }
    });
    
    return data;
  }, [
    qnaElementsSerialized,
    currentPage?.pageNumber,
    state.tempQuestions,
    state.tempAnswers,
    state.pageAssignments,
    state.currentBook
  ]);

  return (
    <CanvasOverlayProvider>
      <CanvasPageContainer assignedUser={state.pageAssignments[state.activePageIndex + 1] || null}>
        <CanvasContainer 
          ref={containerRef} 
          pageId={currentPage?.id} 
          activeTool={state.activeTool}
          stylePainterActive={state.stylePainterActive}
          isMiniPreview={state.isMiniPreview}
          editorInteractionLevel={state.editorInteractionLevel}
        >
        {/* Canvas Overlay Container - direkt im Canvas-Container, nicht als Portal */}
        <CanvasOverlayContainer />
        
        {/* Lock Elements Toggle Button - positioned left of tool settings panel */}
        {!state.isMiniPreview && (
          <div 
            className="absolute top-2 z-50 bg-background/90 backdrop-blur-sm border border-border rounded-md p-1.5 shadow-lg cursor-pointer hover:bg-background/95 transition-colors"
            style={{ 
              right: state.settingsPanelVisible && panelOffset > 0 
                ? `${panelOffset}px` 
                : '0.5rem' // If panel is hidden or offset not calculated, show at edge
            }}
            onClick={() => {
              const currentLockState = Boolean(state.editorSettings?.editor?.lockElements);
              dispatch({
                type: 'UPDATE_EDITOR_SETTINGS',
                payload: {
                  category: 'editor',
                  settings: { lockElements: !currentLockState }
                }
              });
            }}
          >
            <Tooltip 
              side="left" 
              content={
                state.editorSettings?.editor?.lockElements 
                  ? "Click to unlock elements (allow moving, resizing, rotating, and adding new elements)"
                  : "Click to lock elements (prevent moving, resizing, rotating, and adding new elements)"
              }
            >
              <div style={{ pointerEvents: 'auto' }}>
                {state.editorSettings?.editor?.lockElements ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <LockOpen className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </Tooltip>
          </div>
        )}

        <CanvasErrorBoundary>
          <CanvasStage
            ref={stageRef}
            width={containerSize.width}
            height={containerSize.height}
            zoom={zoom}
            stagePos={stagePos}
            activeTool={state.activeTool}
            pixelRatio={adaptivePixelRatio}
            onClick={handleStageClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
            onWheel={handleWheel}
            style={{
              cursor: state.isMiniPreview && state.editorInteractionLevel === 'answer_only'
                ? 'default'
                : (state.stylePainterActive ? 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkuMDYgMTEuOUwxMi4wNiA4LjlMMTUuMDYgMTEuOUwxMi4wNiAxNC45TDkuMDYgMTEuOVoiIGZpbGw9IiMwMDAiLz4KPHA+YXRoIGQ9Ik0xMi4wNiA4LjlMMTUuMDYgNS45TDE4LjA2IDguOUwxNS4wNiAxMS45TDEyLjA2IDguOVoiIGZpbGw9IiMwMDAiLz4KPC9zdmc+") 12 12, auto' : undefined)
            }}
          >
          <Layer>
            {/* Page boundary rectangle - always visible during zoom minimal mode */}
            <Rect
              x={activePageOffsetX}
              y={pageOffsetY}
              width={canvasWidth * zoom}
              height={canvasHeight * zoom}
              stroke="gray"
              strokeWidth={1}
              dash={[5, 5]}
              fill="transparent"
              listening={false}
            />



            {/* Page boundary */}
            <CanvasPageEditArea
              width={canvasWidth}
              height={canvasHeight}
              x={activePageOffsetX}
              y={pageOffsetY}
            />
            {partnerPage && previewPageOffsetX !== null && (
              <CanvasPageEditArea
                width={canvasWidth}
                height={canvasHeight}
                x={previewPageOffsetX}
                y={pageOffsetY}
              />
            )}
            {/* Background Layer */}
            <CanvasBackground
              page={currentPage}
              offsetX={activePageOffsetX}
              pageOffsetY={pageOffsetY}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              backgroundImageCache={backgroundImageCache}
              backgroundQuality={backgroundQuality}
              getPaletteForPage={getPaletteForPage}
              resolveBackgroundImageUrl={resolveBackgroundImageUrl}
            />
            {partnerPage && previewPageOffsetX !== null && (
              <CanvasBackground
                page={partnerPage}
                offsetX={previewPageOffsetX}
                pageOffsetY={pageOffsetY}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                backgroundImageCache={backgroundImageCache}
                backgroundQuality={backgroundQuality}
                getPaletteForPage={getPaletteForPage}
                resolveBackgroundImageUrl={resolveBackgroundImageUrl}
              />
            )}
            {/* Safety Margin Hover-Area - außerhalb der Safety-Margin (hinter Canvas Elements) */}
            <Group x={activePageOffsetX} y={pageOffsetY}>
              {/* Obere Area */}
              <Rect
                x={0}
                y={0}
                width={canvasWidth}
                height={SAFETY_MARGIN_PX}
                fill="transparent"
                listening={false}
                name="no-print"
              />
              {/* Untere Area */}
              <Rect
                x={0}
                y={canvasHeight - SAFETY_MARGIN_PX}
                width={canvasWidth}
                height={SAFETY_MARGIN_PX}
                fill="transparent"
                listening={false}
                name="no-print"
              />
              {/* Linke Area */}
              <Rect
                x={0}
                y={SAFETY_MARGIN_PX}
                width={SAFETY_MARGIN_PX}
                height={canvasHeight - 2 * SAFETY_MARGIN_PX}
                fill="transparent"
                listening={false}
                name="no-print"
              />
              {/* Rechte Area */}
              <Rect
                x={canvasWidth - SAFETY_MARGIN_PX}
                y={SAFETY_MARGIN_PX}
                width={SAFETY_MARGIN_PX}
                height={canvasHeight - 2 * SAFETY_MARGIN_PX}
                fill="transparent"
                listening={false}
                name="no-print"
              />
              {/* Hover-Füllung für alle 4 Bereiche */}
              {hoveredSafetyMargin && (
                <>
                  {/* Obere Füllung */}
                  <Rect
                    x={0}
                    y={0}
                    width={canvasWidth}
                    height={SAFETY_MARGIN_PX}
                    fill={safetyMarginStrokeColor}
                    opacity={1}
                    listening={false}
                    name="no-print"
                  />
                  {/* Untere Füllung */}
                  <Rect
                    x={0}
                    y={canvasHeight - SAFETY_MARGIN_PX}
                    width={canvasWidth}
                    height={SAFETY_MARGIN_PX}
                    fill={safetyMarginStrokeColor}
                    opacity={1}
                    listening={false}
                    name="no-print"
                  />
                  {/* Linke Füllung */}
                  <Rect
                    x={0}
                    y={SAFETY_MARGIN_PX}
                    width={SAFETY_MARGIN_PX}
                    height={canvasHeight - 2 * SAFETY_MARGIN_PX}
                    fill={safetyMarginStrokeColor}
                    opacity={1}
                    listening={false}
                    name="no-print"
                  />
                  {/* Rechte Füllung */}
                  <Rect
                    x={canvasWidth - SAFETY_MARGIN_PX}
                    y={SAFETY_MARGIN_PX}
                    width={SAFETY_MARGIN_PX}
                    height={canvasHeight - 2 * SAFETY_MARGIN_PX}
                    fill={safetyMarginStrokeColor}
                    opacity={1}
                    listening={false}
                    name="no-print"
                  />
                </>
              )}
            </Group>
            {/* Safety Margin Rectangle - visuelle Darstellung (vor Canvas Elements) */}
            <Rect
              x={activePageOffsetX + SAFETY_MARGIN_PX}
              y={pageOffsetY + SAFETY_MARGIN_PX}
              width={canvasWidth - 2 * SAFETY_MARGIN_PX}
              height={canvasHeight - 2 * SAFETY_MARGIN_PX}
              fill="transparent"
              stroke={safetyMarginStrokeColor}
              strokeWidth={2}
              dash={[6, 6]}
              cornerRadius={8}
              strokeScaleEnabled={false}
              listening={false}
              name="no-print"
            />
            {partnerPage && previewPageOffsetX !== null && (
              <Rect
                x={previewPageOffsetX + SAFETY_MARGIN_PX}
                y={pageOffsetY + SAFETY_MARGIN_PX}
                width={canvasWidth - 2 * SAFETY_MARGIN_PX}
                height={canvasHeight - 2 * SAFETY_MARGIN_PX}
                fill="transparent"
                stroke={partnerSafetyMarginStrokeColor}
                strokeWidth={2}
                dash={[6, 6]}
                cornerRadius={8}
                strokeScaleEnabled={false}
                listening={false}
                name="no-print"
              />
            )}
            
            {/* Canvas elements der aktiven Seite (keine Clips – dürfen auch über die Grenze zur Nachbar-Seite hinaus
                selektiert und verschoben werden). Die „Trennung“ wird erreicht, indem nur die Partner-/Preview-Seite
                geclippt wird. */}
            <Group
              x={activePageOffsetX}
              y={pageOffsetY}
            >
              {/* Canvas elements - render skeletons during zoom, normal elements otherwise */}
              {(() => {
                const elements = currentPage?.elements || [];

                const sorted = elements
                  .slice() // Create a copy to avoid mutating the original array
                  .sort((a, b) => {
                    // For all elements: maintain array order (z-order)
                    // This preserves the z-order set by MOVE_ELEMENT actions
                    const indexA = elements.findIndex(el => el.id === a.id);
                    const indexB = elements.findIndex(el => el.id === b.id);
                    return indexA - indexB;
                  });

                // In Konva, rendering order is determined by the order elements are added to the Layer,
                // not by zIndex. So we need to ensure elements are rendered in the sorted order.
                // The sorted array is already in the correct order, so we just need to render them in that order.
                return sorted.map((element, index) => {
                  // Normal rendering
                  return (
                    <Group
                      key={`${element.id}-${element.questionId || 'no-question'}-${index}`}
                      listening={true}
                    >
                  <CanvasItemComponent
                    element={element}
                    interactive={shouldElementBeInteractive(element)}
                    isSelected={state.selectedElementIds.includes(element.id)}
                    zoom={zoom}
                    hoveredElementId={state.hoveredElementId}
                    pageSide={isActiveLeft ? 'left' : 'right'}
                    activeTool={state.activeTool}
                    lockElements={state.editorSettings?.editor?.lockElements ?? false}
                    dispatch={dispatch}
                    isZoomingRef={isZoomingRef}
                    questionText={element.type === 'text' && element.textType === 'qna' ? qnaElementData.get(element.id)?.questionText : undefined}
                    answerText={element.type === 'text' && element.textType === 'qna' ? qnaElementData.get(element.id)?.answerText : undefined}
                    questionStyle={element.type === 'text' && element.textType === 'qna' ? qnaElementData.get(element.id)?.questionStyle : undefined}
                    answerStyle={element.type === 'text' && element.textType === 'qna' ? qnaElementData.get(element.id)?.answerStyle : undefined}
                    assignedUser={element.type === 'text' && element.textType === 'qna' ? qnaElementData.get(element.id)?.assignedUser : undefined}
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
                    
                    // Note: Selection is allowed even when lockElements is enabled
                    // Only dragging, resizing, rotating, and adding new elements are blocked
                    // Settings discard is handled automatically by useSettingsFormState's useLayoutEffect
                    
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
                    
                    // Block dragging if elements are locked
                    if (state.editorSettings?.editor?.lockElements) {
                      e.target.stopDrag();
                      return;
                    }
                    
                    // If multiple elements are selected, stop individual drag
                    // Group move is already started in handleMouseDown
                    if (state.selectedElementIds.length > 1) {
                      e.target.stopDrag();
                      return;
                    }
                    
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
                              // Use smart canvas update - immediate for selection changes
                              smartCanvasUpdate(true);
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
                    // Block position update if elements are locked
                    if (state.editorSettings?.editor?.lockElements) {
                      // Reset position to original
                      e.target.x(element.x);
                      e.target.y(element.y);
                      setSnapGuidelines([]);
                      setTimeout(() => setIsDragging(false), 10);
                      return;
                    }
                    
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
                  isWithinSelection={elementsInSelection.has(element.id)}
                />

                    </Group>
                  );
                });
              })()}

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
            {partnerPage && previewPageOffsetX !== null && !hidePartnerDuringInteraction && (
              <Group
                ref={partnerPageGroupRef}
                x={previewPageOffsetX}
                y={pageOffsetY}
                listening={false}
                name="no-print preview-page"
                opacity={0.3}
                // Wenn diese Seite nur als Vorschau angezeigt wird (Partnerseite),
                // clippen wir ihre Elemente auf ihre eigene Seitenfläche, damit
                // Überstände nicht in die aktive Seite "hineinragen".
                clipFunc={(ctx) => {
                  ctx.beginPath();
                  ctx.rect(0, 0, canvasWidth, canvasHeight);
                  ctx.closePath();
                }}
              >
                {(() => {
                  const elements = partnerPage.elements || [];
                  
                  // Apply same sorting logic as active page for consistency
                  const sorted = elements
                    .slice()
                    .sort((a, b) => {
                      // For all elements: maintain array order (z-order)
                      const indexA = elements.findIndex(el => el.id === a.id);
                      const indexB = elements.findIndex(el => el.id === b.id);
                      return indexA - indexB;
                    });
                  
                  return sorted;
                })().map((element, index) => {
                  // Normal rendering
                  return (
                    <Group key={`preview-${element.id}`}>
                      <CanvasItemComponent
                        element={element}
                        interactive={false}
                        isSelected={false}
                        zoom={zoom}
                        hoveredElementId={null}
                        pageSide={isActiveLeft ? 'right' : 'left'}
                      />
                    </Group>
                  );
                })}
              </Group>
            )}
            {partnerPage && previewPageOffsetX !== null && !state.isMiniPreview && (
               // Background for the preview page and inactive page of page pair
               <Rect
                 x={previewPageOffsetX-10}
                 y={pageOffsetY-10}
                 width={canvasWidth+20}
                 height={canvasHeight+20}
                 fill="rgba(255, 255, 255, 0.7)"
                 fillPatternImage={undefined}
                 fillPatternRepeat="repeat"
                 opacity={1}
                 onClick={handlePreviewCanvasClick}
                 onTap={handlePreviewCanvasClick}
                 listening={true}
                 onMouseEnter={(e) => {
                   const stage = e.target.getStage();
                   if (stage) {
                     stage.container().style.cursor = isCreationToolActive ? 'not-allowed' : 'pointer';
                   }
                   if (isCreationToolActive) {
                     setInactivePageTooltip(null);
                     return;
                   }
                   // Tooltip-Position oberhalb des Mauszeigers
                   if (e.evt && typeof e.evt.clientX === 'number' && typeof e.evt.clientY === 'number') {
                     setInactivePageTooltip({ x: e.evt.clientX, y: e.evt.clientY - 24 });
                   }
                 }}
                 onMouseMove={(e) => {
                   if (isCreationToolActive) {
                     setInactivePageTooltip(null);
                     return;
                   }
                   if (inactivePageTooltip && e.evt && typeof e.evt.clientX === 'number' && typeof e.evt.clientY === 'number') {
                     setInactivePageTooltip({ x: e.evt.clientX, y: e.evt.clientY - 24 });
                   }
                 }}
                 onMouseLeave={(e) => {
                   const stage = e.target.getStage();
                   if (stage) {
                     // Zurück auf Standardcursor des Stage (leer lässt CanvasStage entscheiden)
                     stage.container().style.cursor = '';
                   }
                   setInactivePageTooltip(null);
                 }}
               />
            )}
            
            {/* Selection rectangle - only show when dragging selection box (isSelecting) */}
            {isSelecting && (
              <SelectionRectangle
                x={selectionRect.x}
                y={selectionRect.y}
                width={selectionRect.width}
                height={selectionRect.height}
                visible={selectionRect.visible}
              />
            )}
            
            {/* Selection rectangle for grouped element */}
            {state.selectedGroupedElement && (() => {
              const groupElement = currentPage?.elements.find(el => el.id === state.selectedGroupedElement.groupId);
              const childElement = groupElement?.groupedElements?.find(el => el.id === state.selectedGroupedElement.elementId);
              if (groupElement && childElement) {
                return (
                  <SelectionRectangle
                    x={activePageOffsetX + groupElement.x + childElement.x}
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
              keepRatio={Boolean(
                state.selectedElementIds.length === 1 &&
                ['qr_code', 'sticker'].includes(currentPage?.elements.find(el => el.id === state.selectedElementIds[0])?.type || '')
              )}
              rotationSnaps={[0, 90, 180, 270]}
              rotationSnapTolerance={5}
              resizeEnabled={!(state.editorSettings?.editor?.lockElements)}
              rotateEnabled={!(state.editorSettings?.editor?.lockElements)}
              boundBoxFunc={(oldBox, newBox) => {
                // Check if any selected elements are text elements (qna, free_text)
                const hasTextElements = state.selectedElementIds.some(id => {
                  const element = currentPage?.elements.find(el => el.id === id);
                  return element && element.type === 'text' &&
                         (element.textType === 'qna' || element.textType === 'free_text');
                });

                // Prevent inversion: if size would decrease, revert to original
                // This prevents elements from "flipping over" when resizing past the opposite edge
                if (newBox.width < oldBox.width || newBox.height < oldBox.height) {
                  return oldBox; // Prevent inversion
                }

                // Use appropriate minimum sizes based on element type
                const minWidth = hasTextElements ? 50 : 5;
                const minHeight = hasTextElements ? 30 : 5;

                if (newBox.width < minWidth || newBox.height < minHeight) {
                  return oldBox;
                }
                return newBox;
              }}
              onDragStart={() => {
                if (!state.canvasBatchActive) {
                  dispatch({ type: 'START_CANVAS_BATCH', payload: { command: 'CANVAS_DRAG' } });
                  transformerBatchActiveRef.current = true;
                } else {
                  transformerBatchActiveRef.current = false;
                }
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
                  const currentX = (box.x - stagePos.x) / zoom - activePageOffsetX;
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
                
                // Check if elements are outside safety margin during drag
                let hasElementOutsideSafetyMargin = false;
                nodes.forEach(node => {
                  const nodeX = node.x();
                  const nodeY = node.y();
                  
                  // Get element dimensions - need to get from element state for Groups
                  const elementId = node.id();
                  const element = currentPage?.elements?.find(el => el.id === elementId);
                  
                  let nodeWidth = 0;
                  let nodeHeight = 0;
                  
                  if (element) {
                    // For Groups (image, sticker), calculate from element state and scale
                    if (node.getClassName() === 'Group') {
                      const groupNode = node as Konva.Group;
                      const groupScaleX = groupNode.scaleX() || 1;
                      const groupScaleY = groupNode.scaleY() || 1;
                      nodeWidth = (element.width || 0) * groupScaleX;
                      nodeHeight = (element.height || 0) * groupScaleY;
                    } else {
                      // For other elements, use node dimensions
                      nodeWidth = (node.width() || 0) * (node.scaleX() || 1);
                      nodeHeight = (node.height() || 0) * (node.scaleY() || 1);
                    }
                  } else {
                    // Fallback: try to get from node directly
                    nodeWidth = (node.width() || 0) * (node.scaleX() || 1);
                    nodeHeight = (node.height() || 0) * (node.scaleY() || 1);
                  }
                  
                  const elementLeft = nodeX;
                  const elementRight = nodeX + nodeWidth;
                  const elementTop = nodeY;
                  const elementBottom = nodeY + nodeHeight;
                  
                  const isOutsideLeft = elementLeft < SAFETY_MARGIN_PX;
                  const safetyMarginRight = canvasWidth - SAFETY_MARGIN_PX;
                  const isOutsideRight = elementRight >= safetyMarginRight;
                  const isOutsideTop = elementTop < SAFETY_MARGIN_PX;
                  const safetyMarginBottom = canvasHeight - SAFETY_MARGIN_PX;
                  const isOutsideBottom = elementBottom >= safetyMarginBottom;
                  
                  if (isOutsideLeft || isOutsideRight || isOutsideTop || isOutsideBottom) {
                    hasElementOutsideSafetyMargin = true;
                  }
                });
                
                // Only update hoveredSafetyMargin if manually hovering over safety margin
                // Don't set based on element position alone - only if mouse is over safety margin
                if (!isManuallyHovering) {
                  // Clear if not manually hovering (mouse not over safety margin)
                  setHoveredSafetyMargin(false);
                  setSafetyMarginTooltip(null);
                }
                // If isManuallyHovering is true, hoveredSafetyMargin is already set by onMouseMove handler
              }}
              onDragEnd={(e) => {
                setSnapGuidelines([]);
                if (!transformerBatchActiveRef.current) {
                  return;
                }

                const nodes = transformerRef.current?.nodes() || [];
                nodes.forEach(node => {
                  const elementId = node.id();
                  if (!elementId) return;

                  const element = currentPage?.elements.find(el => el.id === elementId);
                  if (!element) return;

                  // Offset-Korrektur wie in onTransformEnd
                  // Die Group wird mit x={element.x + offsetX} gerendert (siehe base-canvas-item.tsx)
                  // Beim Dragging gibt node.x() die "adjusted" Position zurück
                  // Wir müssen den Offset abziehen, um die tatsächliche Position zu erhalten
                  const elementWidth = element.width || 100;
                  const elementHeight = element.height || 100;
                  const offsetX = elementWidth / 2;
                  const offsetY = elementHeight / 2;
                  const actualX = node.x() - offsetX;
                  const actualY = node.y() - offsetY;

                  dispatch({
                    type: 'BATCH_UPDATE_ELEMENT',
                    payload: {
                      id: elementId,
                      updates: { x: actualX, y: actualY }
                    }
                  });
                });

                const actionLabel = nodes.length > 1 ? 'Move Elements' : 'Move Element';
                dispatch({ type: 'END_CANVAS_BATCH', payload: { actionName: actionLabel } });
                transformerBatchActiveRef.current = false;
              }}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) return oldBox;
                
                const transformer = transformerRef.current;
                // Check if magnetic snapping is enabled (default to true if not set)
                const magneticSnapping = (state as any).magneticSnapping !== false;
                if (!transformer || !currentPage || !magneticSnapping) return newBox;
                
                // Get the active anchor to determine which edges should snap
                const activeAnchor = transformer.getActiveAnchor();
                
                // Determine which edges are being resized based on the anchor
                const isResizingTop = activeAnchor?.includes('top') || false;
                const isResizingBottom = activeAnchor?.includes('bottom') || false;
                const isResizingLeft = activeAnchor?.includes('left') || false;
                const isResizingRight = activeAnchor?.includes('right') || false;
                
                // The boundBoxFunc receives newBox in Stage coordinates (absolute position on the Stage)
                // Convert to page coordinates for snapping calculation
                const oldPageY = (oldBox.y - stagePos.y) / zoom - pageOffsetY;
                const oldPageHeight = oldBox.height / zoom;
                
                const newPageX = (newBox.x - stagePos.x) / zoom - activePageOffsetX;
                const newPageY = (newBox.y - stagePos.y) / zoom - pageOffsetY;
                const newPageWidth = newBox.width / zoom;
                const newPageHeight = newBox.height / zoom;
                
                // Use snapDimensions function for dimension snapping
                const snapped = snapDimensions(
                  transformer,
                  newPageX,
                  newPageY,
                  newPageWidth,
                  newPageHeight,
                  currentPage,
                  canvasWidth,
                  canvasHeight,
                  activePageOffsetX,
                  pageOffsetY,
                  stageRef as React.RefObject<Konva.Stage>,
                  {
                    allowTopSnap: isResizingTop,
                    allowBottomSnap: isResizingBottom,
                    allowLeftSnap: isResizingLeft,
                    allowRightSnap: isResizingRight,
                    originalY: oldPageY,
                    originalHeight: oldPageHeight
                  }
                );
                
                // Update guidelines
                setSnapGuidelines(snapped.guidelines);
                
                // Convert snapped page coordinates back to Stage coordinates
                const snappedStageX = (snapped.x + activePageOffsetX) * zoom + stagePos.x;
                const snappedStageY = (snapped.y + pageOffsetY) * zoom + stagePos.y;
                const snappedStageWidth = snapped.width * zoom;
                const snappedStageHeight = snapped.height * zoom;
                
                // Always apply snapping if guidelines are present (indicating a snap was found)
                // This ensures magnetic snapping works the same way as when moving elements
                if (snapped.guidelines.length > 0) {
                  return {
                    ...newBox,
                    x: snappedStageX,
                    y: snappedStageY,
                    width: snappedStageWidth,
                    height: snappedStageHeight
                  };
                }
                
                return newBox;
              }}
              onTransformStart={() => {
                isTransformingRef.current = true;
                dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Transform Elements' });
                // Dispatch custom events for each selected element
                state.selectedElementIds.forEach(elementId => {
                  window.dispatchEvent(new CustomEvent('transformStart', {
                    detail: { elementId }
                  }));
                });
                
                // Store original position and dimensions for each transforming element
                const nodes = transformerRef.current?.nodes() || [];
                nodes.forEach(node => {
                  const elementId = node.id();
                  const element = currentPage?.elements.find(el => el.id === elementId);
                  if (element && (element.type === 'image' || element.type === 'sticker')) {
                    // Store original state for position recalculation at transformEnd
                    (node as any).__transformStartState = {
                      x: element.x || 0,
                      y: element.y || 0,
                      width: element.width || 150,
                      height: element.height || 100,
                      rotation: element.rotation || 0
                    };
                  }
                });
              }}
              onTransform={() => {
                // Handle image crop updates directly here for real-time updates
                // For image elements, transfer scale from Group to Image node during resize
                // This ensures the resize logic in image.tsx works correctly
                const transformer = transformerRef.current;
                if (transformer) {
                  const nodes = transformer.nodes();
                  nodes.forEach(node => {
                    // For image elements, the Transformer is on the Group, but resize should affect the Image node
                    if (node.getClassName() === 'Group') {
                      const groupNode = node as Konva.Group;
                      const elementId = groupNode.id();
                      const element = currentPage?.elements.find(el => el.id === elementId);
                      
                      if (element?.type === 'image' || element?.type === 'sticker') {
                        const imageNode = groupNode.findOne('Image') as Konva.Image;
                        if (imageNode) {
                          // For image and sticker elements, calculate effective size from Group scale
                          // DO NOT reset Group scale during transform - this causes conflicts with Transformer
                          // DO NOT modify Image node during transform - let React-Konva handle it via props
                          // Only update the size state so crop can be recalculated
                          const groupScaleX = groupNode.scaleX();
                          const groupScaleY = groupNode.scaleY();
                          
                          // Calculate effective dimensions based on element's stored size and Group scale
                          // The Transformer calculates scale relative to the element's stored size
                          const baseWidth = element.width || 150;
                          const baseHeight = element.height || 100;
                          const effectiveWidth = Math.max(5, baseWidth * groupScaleX);
                          const effectiveHeight = Math.max(5, baseHeight * groupScaleY);
                          
                          // Dispatch custom event with effective size so image.tsx can update crop
                          // The crop will be calculated based on effective size
                          // The visual size is controlled by Group scale, which React-Konva handles automatically
                          window.dispatchEvent(new CustomEvent('imageTransform', {
                            detail: {
                              elementId,
                              width: effectiveWidth,
                              height: effectiveHeight
                            }
                          }));
                        }
                      }
                    }
                  });
                  
                  // Dispatch custom events for components that might need them
                  state.selectedElementIds.forEach(elementId => {
                    window.dispatchEvent(new CustomEvent('transform', {
                      detail: { elementId }
                    }));
                  });
                  
                  // Check if elements are outside safety margin during transform
                  let hasElementOutsideSafetyMargin = false;
                  nodes.forEach(node => {
                    const nodeX = node.x();
                    const nodeY = node.y();
                    
                    // Get element dimensions - need to get from element state for Groups
                    const elementId = node.id();
                    const element = currentPage?.elements?.find(el => el.id === elementId);
                    
                    let nodeWidth = 0;
                    let nodeHeight = 0;
                    
                    if (element) {
                      // All elements are in Groups, calculate from element state and scale
                      const groupNode = node as Konva.Group;
                      const groupScaleX = groupNode.scaleX() || 1;
                      const groupScaleY = groupNode.scaleY() || 1;
                      // Use element width/height and multiply by current scale during resize
                      nodeWidth = (element.width || 0) * groupScaleX;
                      nodeHeight = (element.height || 0) * groupScaleY;
                    } else {
                      // Fallback: try to get from node directly
                      nodeWidth = (node.width() || 0) * (node.scaleX() || 1);
                      nodeHeight = (node.height() || 0) * (node.scaleY() || 1);
                    }
                    
                    const elementLeft = nodeX;
                    const elementRight = nodeX + nodeWidth;
                    const elementTop = nodeY;
                    const elementBottom = nodeY + nodeHeight;
                    
                    const isOutsideLeft = elementLeft < SAFETY_MARGIN_PX;
                    const safetyMarginRight = canvasWidth - SAFETY_MARGIN_PX;
                    const isOutsideRight = elementRight >= safetyMarginRight;
                    const isOutsideTop = elementTop < SAFETY_MARGIN_PX;
                    const safetyMarginBottom = canvasHeight - SAFETY_MARGIN_PX;
                    const isOutsideBottom = elementBottom >= safetyMarginBottom;
                    
                    if (isOutsideLeft || isOutsideRight || isOutsideTop || isOutsideBottom) {
                      hasElementOutsideSafetyMargin = true;
                    }
                  });
                  
                  // Only update hoveredSafetyMargin if actually transforming AND manually hovering
                  // Don't set based on element position alone - only if mouse is over safety margin
                  if (isTransformingRef.current && !isManuallyHovering) {
                    // Clear if not manually hovering (mouse not over safety margin)
                    setHoveredSafetyMargin(false);
                    setSafetyMarginTooltip(null);
                  }
                  // If isManuallyHovering is true, hoveredSafetyMargin is already set by onMouseMove handler
                } else {
                  state.selectedElementIds.forEach(elementId => {
                    window.dispatchEvent(new CustomEvent('transform', {
                      detail: { elementId }
                    }));
                  });
                  
                  // Only update hoveredSafetyMargin if actually transforming AND manually hovering
                  // Don't set based on element position alone - only if mouse is over safety margin
                  if (isTransformingRef.current && !isManuallyHovering) {
                    // Clear if not manually hovering (mouse not over safety margin)
                    setHoveredSafetyMargin(false);
                    setSafetyMarginTooltip(null);
                  }
                  // If isManuallyHovering is true, hoveredSafetyMargin is already set by onMouseMove handler
                }
              }}
              onTransformEnd={(e) => {
                isTransformingRef.current = false;
                // Clear snap guidelines when transform ends
                setSnapGuidelines([]);

                if (state.selectedElementIds.length > 0) {
                  const actionLabel = state.selectedElementIds.length > 1
                    ? 'Transform Elements'
                    : 'Transform Element';
                  dispatch({ type: 'SAVE_TO_HISTORY', payload: actionLabel });
                }
                
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
                  // For all elements, the Transformer is now on the Group (not the Image node)
                  // So node is always the Group
                  const groupNode = node;
                  const elementId = node.id();
                  
                  if (!elementId || !groupNode) return;
                  
                  const element = currentPage?.elements.find(el => el.id === elementId);
                  if (element) {
                    // Skip dimension updates for qna and free_text elements - they handle their own resize logic
                    // The textbox-qna.tsx and textbox-free-text.tsx components manage dimensions during transform
                    if (element.type === 'text' && (element.textType === 'qna' || element.textType === 'free_text')) {
                      // Only update position and rotation, not dimensions
                      // Dimensions are handled by textbox-qna.tsx's or textbox-free-text.tsx's handleTransformEnd
                      // Don't update position - let the component handle it
                      const updates: any = {
                        rotation: node.rotation()
                      };
                      
                      // Reset scale to 1 (dimensions are handled by textbox-qna.tsx or textbox-free-text.tsx)
                      node.scaleX(1);
                      node.scaleY(1);
                      
                      dispatch({
                        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                        payload: {
                          id: element.id,
                          updates
                        }
                      });
                      return; // Skip the rest of the logic for qna and free-text elements
                    }
                    
                    const updates: any = {};
                    
                    // For text, image, and sticker elements, convert scale to width/height changes
                    if (element.type === 'text' || element.type === 'image' || element.type === 'sticker') {
                      // For image and sticker elements, the Transformer is now on the Group, not the Image node
                      // We need to get size from Image node, but position and rotation from Group
                      if ((element.type === 'image' || element.type === 'sticker') && node.getClassName() === 'Group') {
                        const groupNode = node as Konva.Group;
                        const imageNode = groupNode.findOne('Image') as Konva.Image;
                        
                        if (imageNode) {
                          // Get original state stored at transformStart
                          const startState = (node as any).__transformStartState;
                          
                          // Calculate final dimensions from Group scale
                          const groupScaleX = groupNode.scaleX();
                          const groupScaleY = groupNode.scaleY();
                          const baseWidth = startState?.width || element.width || 150;
                          const baseHeight = startState?.height || element.height || 100;
                          const finalWidth = Math.max(20, baseWidth * groupScaleX);
                          const finalHeight = Math.max(20, baseHeight * groupScaleY);

                          // Get rotation from Group node
                          const groupRotation = groupNode.rotation();

                          // Get position from Group node
                          // The Transformer changes the Group position when using left/top resize handles
                          // IMPORTANT: Group is rendered at element.x + offsetX, so we must subtract offset
                          const offsetX = finalWidth / 2;
                          const offsetY = finalHeight / 2;
                          const groupX = groupNode.x();
                          const groupY = groupNode.y();

                          updates.width = finalWidth;
                          updates.height = finalHeight;
                          updates.rotation = typeof groupRotation === 'number' ? groupRotation : 0;
                          updates.x = groupX - offsetX;
                          updates.y = groupY - offsetY;

                          if (element.type === 'sticker') {
                            const hasStickerText = Boolean(element.stickerText && element.stickerText.trim().length > 0);
                            const textEnabled = element.stickerTextEnabled ?? hasStickerText;
                            if (textEnabled) {
                              const scaleRatio = baseWidth > 0 ? finalWidth / baseWidth : 1;
                              if (element.stickerTextSettings?.fontSize) {
                                updates.stickerTextSettings = {
                                  ...(element.stickerTextSettings || {}),
                                  fontSize: Math.max(1, element.stickerTextSettings.fontSize * scaleRatio)
                                };
                              }
                              if (element.stickerTextOffset) {
                                updates.stickerTextOffset = {
                                  x: element.stickerTextOffset.x * scaleRatio,
                                  y: element.stickerTextOffset.y * scaleRatio
                                };
                              }
                            }
                          }
                          
                          // Clean up stored state
                          delete (node as any).__transformStartState;

                          // Calculate and store crop values for PDF export consistency
                          // This ensures server and client use exactly the same crop values
                          if (imageNode.image()) {
                            // Inline crop calculation matching client-side image component
                            const img = imageNode.image();
                            const clipPosition = element.imageClipPosition || 'center-middle';
                            const width = finalWidth;
                            const height = finalHeight;
                            const aspectRatio = width / height;

                            let newWidth;
                            let newHeight;

                            const imageWidth = img.width || img.naturalWidth || 0;
                            const imageHeight = img.height || img.naturalHeight || 0;
                            const imageRatio = imageWidth / imageHeight;

                            if (aspectRatio >= imageRatio) {
                              newWidth = imageWidth;
                              newHeight = imageWidth / aspectRatio;
                            } else {
                              newWidth = imageHeight * aspectRatio;
                              newHeight = imageHeight;
                            }

                            let x = 0;
                            let y = 0;

                            switch (clipPosition) {
                              case 'left-top':
                                x = 0;
                                y = 0;
                                break;
                              case 'left-middle':
                                x = 0;
                                y = (imageHeight - newHeight) / 2;
                                break;
                              case 'left-bottom':
                                x = 0;
                                y = imageHeight - newHeight;
                                break;
                              case 'center-top':
                                x = (imageWidth - newWidth) / 2;
                                y = 0;
                                break;
                              case 'center-middle':
                                x = (imageWidth - newWidth) / 2;
                                y = (imageHeight - newHeight) / 2;
                                break;
                              case 'center-bottom':
                                x = (imageWidth - newWidth) / 2;
                                y = imageHeight - newHeight;
                                break;
                              case 'right-top':
                                x = imageWidth - newWidth;
                                y = 0;
                                break;
                              case 'right-middle':
                                x = imageWidth - newWidth;
                                y = (imageHeight - newHeight) / 2;
                                break;
                              case 'right-bottom':
                                x = imageWidth - newWidth;
                                y = imageHeight - newHeight;
                                break;
                              default:
                                x = (imageWidth - newWidth) / 2;
                                y = (imageHeight - newHeight) / 2;
                            }

                            updates.cropX = x;
                            updates.cropY = y;
                            updates.cropWidth = newWidth;
                            updates.cropHeight = newHeight;
                          }

                          // Reset scale to 1 on Group (scale was converted to width/height)
                          groupNode.scaleX(1);
                          groupNode.scaleY(1);
                          // Also ensure Image node scale is 1 (should already be 1, but be safe)
                          imageNode.scaleX(1);
                          imageNode.scaleY(1);
                        } else {
                          // Fallback: use Group node if Image node not found
                          const scaleX = groupNode.scaleX();
                          const scaleY = groupNode.scaleY();
                          
                          updates.width = Math.max(20, (element.width || 150) * scaleX);
                          updates.height = Math.max(20, (element.height || 100) * scaleY);
                          // Convert from adjusted position (with offset) back to original position (without offset)
                          const offsetX = groupNode.offsetX() || 0;
                          const offsetY = groupNode.offsetY() || 0;
                          updates.x = groupNode.x() - offsetX;
                          updates.y = groupNode.y() - offsetY;
                          updates.rotation = typeof groupNode.rotation() === 'number' ? groupNode.rotation() : 0;
                          
                          groupNode.scaleX(1);
                          groupNode.scaleY(1);
                        }
                    } else {
                      // For text elements (except qna and free-text which are handled above), use Group node
                      const scaleX = node.scaleX();
                      const scaleY = node.scaleY();
                      
                      const newWidth = Math.max(50, (element.width || 150) * scaleX);
                      const newHeight = Math.max(20, (element.height || 50) * scaleY);
                      
                      // Node position includes offset, so we need to subtract it
                      const offsetX = newWidth / 2;
                      const offsetY = newHeight / 2;
                      
                      // Get mouse position at release
                      const stage = stageRef.current;
                      const mousePos = stage?.getPointerPosition();
                      const mousePageX = mousePos ? (mousePos.x - stagePos.x) / zoom - activePageOffsetX : null;
                      const mousePageY = mousePos ? (mousePos.y - stagePos.y) / zoom - pageOffsetY : null;
                      
                      const correctedX = node.x() - offsetX;
                      const correctedY = node.y() - offsetY;
                      const leftEdgeX = correctedX;
                      const leftEdgeY = correctedY + newHeight / 2;
                      
                      console.log('[Transformer - Text Element]', {
                        elementId: element.id.substring(0, 8),
                        oldSize: { w: (element.width || 150).toFixed(1), h: (element.height || 50).toFixed(1) },
                        newSize: { w: newWidth.toFixed(1), h: newHeight.toFixed(1) },
                        scale: { x: scaleX.toFixed(3), y: scaleY.toFixed(3) },
                        nodePos: { x: node.x().toFixed(1), y: node.y().toFixed(1) },
                        offset: { x: offsetX.toFixed(1), y: offsetY.toFixed(1) },
                        corrected: { x: correctedX.toFixed(1), y: correctedY.toFixed(1) },
                        mouse: mousePageX !== null ? { x: mousePageX.toFixed(1), y: (mousePageY || 0).toFixed(1) } : 'unknown',
                        leftEdge: { x: leftEdgeX.toFixed(1), y: leftEdgeY.toFixed(1) },
                        mismatch: mousePageX !== null ? { x: (mousePageX - leftEdgeX).toFixed(1) } : 'unknown'
                      });
                      
                      updates.width = newWidth;
                      updates.height = newHeight;
                      updates.x = correctedX;
                      updates.y = correctedY;
                      updates.rotation = node.rotation();
                      
                      // Reset scale to 1
                      node.scaleX(1);
                      node.scaleY(1);
                      }
                    } else {
                      // For shapes and other elements, preserve scaleX and scaleY
                      // Always save scaleX/scaleY explicitly, even if they're 1, to ensure they're persisted
                      const nodeScaleX = node.scaleX();
                      const nodeScaleY = node.scaleY();
                      const nodeRotation = node.rotation();
                      
                      // Convert from adjusted position (with offset) back to original position (without offset)
                      const offsetX = node.offsetX() || 0;
                      const offsetY = node.offsetY() || 0;
                      updates.x = node.x() - offsetX;
                      updates.y = node.y() - offsetY;
                      updates.scaleX = typeof nodeScaleX === 'number' ? nodeScaleX : 1;
                      updates.scaleY = typeof nodeScaleY === 'number' ? nodeScaleY : 1;
                      updates.rotation = typeof nodeRotation === 'number' ? nodeRotation : 0;
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
        </CanvasErrorBoundary>
        {!state.isMiniPreview && activePageBadgeMeta && activePageBadgePosition && (
          <CanvasOverlayPortal>
            <div
              className="absolute"
              style={{
                left: activePageBadgePosition.x,
                top: activePageBadgePosition.y,
                transform: 'translate(-50%, -100%)',
                pointerEvents: 'none',
                minWidth: 0,
                width: 'max-content'
              }}
            >
              {state.pageAssignments[activePageNumber] ? (
                <div style={createBadgeStyleWithProfile(true, false, state.pageAssignments[activePageNumber])}>
                  {renderBadgeSegments(activePageBadgeMeta, true, state.pageAssignments[activePageNumber])}
                </div>
              ) : (
                <div style={createBadgeStyleWithoutProfile(true, false)}>
                  {renderBadgeSegments(activePageBadgeMeta, true, null)}
                </div>
              )}
            </div>
          </CanvasOverlayPortal>
        )}

        {safetyMarginTooltip && (
          <Tooltip
            content="Safety Margin"
            side="top"
            forceVisible={true}
            screenPosition={safetyMarginTooltip}
          >
            <div />
          </Tooltip>
        )}
        
        </CanvasContainer>
      </CanvasPageContainer>


      {/* Canvas UI Overlays */}
      <CanvasOverlays
        // Context Menu
        contextMenu={contextMenu}
          onDuplicate={itemActions.handleDuplicateItems} 
          onDelete={itemActions.handleDeleteItems}
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
          canGroup={state.selectedElementIds.length >= 2 && (!selectedHasQna || (canCreateQna && canDeleteQna))}
          canUngroup={(state.selectedElementIds.length === 1 && currentPage?.elements.find(el => el.id === state.selectedElementIds[0])?.type === 'group') || (state.selectedElementIds.length === 1 && currentPage?.elements.find(el => el.id === state.selectedElementIds[0])?.type === 'brush-multicolor') ? (!selectedHasQna || (canCreateQna && canDeleteQna)) : false}
          canCopy={!selectedHasQna || canCreateQna}
          canDuplicate={!selectedHasQna || canCreateQna}
          canDelete={!selectedHasQna || canDeleteQna}

        // Image Modal
        showImageModal={showImageModal}
        onImageModalClose={handleImageModalClose}
          token={token || ''}
          onImageSelect={handleImageSelect}

        // Sticker Modal
        showStickerModal={showStickerModal}
        onStickerModalClose={handleStickerModalClose}
          onStickerSelect={handleStickerSelect}

        // Question Dialog
        showQuestionDialog={showQuestionDialog}
        onQuestionDialogClose={() => setShowQuestionDialog(false)}
        onQuestionSelect={handleQuestionSelect}
        selectedQuestionElementId={selectedQuestionElementId}
        canManageQuestions={canManageQuestions}

        // Question Selector Modal
        showQuestionSelectorModal={showQuestionSelectorModal}
        onQuestionSelectorModalClose={() => setShowQuestionSelectorModal(false)}
        questionSelectorElementId={questionSelectorElementId}

        // QR Code Modal
        showQrCodeModal={showQrCodeModal}
        onQrCodeModalClose={handleQrCodeModalClose}
        onQrCodeCreate={handleQrCodeCreate}

        // Alert
        alertMessage={alertMessage}
        alertPosition={alertPosition}

        // Tooltips
        inactivePageTooltip={inactivePageTooltip}
        outsidePageTooltip={outsidePageTooltip}
        imageQualityTooltip={imageQualityTooltip}
      />

      <PerformanceMonitor stageRef={stageRef} />

    </CanvasOverlayProvider>
  );
}
// Re-export components for external use
export { CanvasContainer } from './canvas-container';
export { CanvasStage } from './canvas-stage';
export { CanvasTransformer } from './canvas-transformer';
export { SelectionRectangle } from './selection-rectangle';
export { PreviewLine, PreviewShape, PreviewTextbox, PreviewBrush } from './preview-elements';
export { SnapGuidelines } from './snap-guidelines';
