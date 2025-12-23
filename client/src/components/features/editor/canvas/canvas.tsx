import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Layer, Rect, Group } from 'react-konva';
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
import { CanvasOverlayProvider, CanvasOverlayContainer, CanvasOverlayPortal } from './canvas-overlay';
import { CanvasBackground } from './CanvasBackground';
import { CanvasOverlays } from './CanvasOverlays';
import { useCanvasDrawing } from './hooks/useCanvasDrawing';
import { useCanvasSelection } from './hooks/useCanvasSelection';
import { useCanvasZoomPan } from './hooks/useCanvasZoomPan';
import { useCanvasItemActions } from './hooks/useCanvasItemActions';

import { getActiveTemplateIds } from '../../../../utils/template-inheritance';
import { Tooltip } from '../../../ui/composites/tooltip';
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
import { getToolDefaults } from '../../../../utils/tool-defaults';
import { getStickerById, loadStickerRegistry } from '../../../../data/templates/stickers';


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




export default function Canvas() {
  const { state, dispatch, getAnswerText, getQuestionAssignmentsForUser, undo, redo, canAccessEditor, canEditCanvas, ensurePagesLoaded } = useEditor();
  const { token, user } = useAuth();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [panelOffset, setPanelOffset] = useState(0);

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
    showStickerModal, setShowStickerModal, pendingStickerPosition, setPendingStickerPosition, pendingStickerElementId, setPendingStickerElementId
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

  // For backward compatibility
  const setZoomFromContext = setZoom;
  const [editingElement, setEditingElement] = useState<CanvasElement | null>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  
  // Prevent authors from opening question dialog
  useEffect(() => {
    if (showQuestionDialog && user?.role === 'author') {
      setShowQuestionDialog(false);
      setSelectedQuestionElementId(null);
    }
  }, [showQuestionDialog, user]);

  useEffect(() => {
    const handleQualityChange = (event: CustomEvent<{ mode?: 'preview' | 'full' }>) => {
      setBackgroundQuality(event.detail?.mode === 'full' ? 'full' : 'preview');
    };

    window.addEventListener('setBackgroundQuality', handleQualityChange as EventListener);
    return () => {
      window.removeEventListener('setBackgroundQuality', handleQualityChange as EventListener);
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
  // Tooltip für die inaktive Seite eines Seitenpaares ("Click to enter this page.")
  const [inactivePageTooltip, setInactivePageTooltip] = useState<{ x: number; y: number } | null>(null);
  const [snapGuidelines, setSnapGuidelines] = useState<SnapGuideline[]>([]);
  const [hoveredSafetyMargin, setHoveredSafetyMargin] = useState<boolean>(false);
  const [safetyMarginTooltip, setSafetyMarginTooltip] = useState<{ x: number; y: number } | null>(null);
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
  const [backgroundImageCache, setBackgroundImageCache] = useState<Map<string, BackgroundImageEntry>>(new Map());
  const backgroundImageCacheRef = useRef<Map<string, BackgroundImageEntry>>(new Map());
  const loadingImagesRef = useRef<Set<string>>(new Set());
  const [backgroundQuality, setBackgroundQuality] = useState<'preview' | 'full'>('preview');
  
  // Snapping functionality
  const GUIDELINE_OFFSET = 15; // Increased for better snapping detection

  const currentPage = useMemo(
    () => state.currentBook?.pages[state.activePageIndex],
    [state.currentBook?.pages, state.activePageIndex]
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
      setOutsidePageTooltip({ x: clientX, y: clientY - 40 });
      setSuppressNextBackgroundClickSelect(true);
      // Auto-hide after a short delay so the user can quickly try again
      window.setTimeout(() => {
        setOutsidePageTooltip(null);
      }, 1800);
    },
    []
  );

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
    setContextMenu
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
      switchToPartnerPage();
    },
    [switchToPartnerPage]
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
              transformer.forceUpdate();
              transformer.moveToTop();
              const layer = transformer.getLayer();
              if (layer) {
                layer.batchDraw();
              }
            } else {
              // All nodes are invalid, clear transformer
              transformer.nodes([]);
              const layer = transformer.getLayer();
              if (layer) {
                layer.batchDraw();
              }
            }
          } catch (error) {
            // Silently handle transformer update errors (nodes may have been destroyed)
            console.debug('Transformer update error:', error);
            // Clear selection if update fails
            try {
              transformer.nodes([]);
              transformer.getLayer()?.batchDraw();
            } catch {
              // Ignore cleanup errors
            }
          }
        } else {
          // No valid nodes found, clear selection
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
                  // During transform, use original method to allow resizing
                  if (isTransforming) {
                    return originalGetClientRect.call(this);
                  }
                  
                  // Otherwise, limit to box dimensions for selection rectangle display
                  const absPos = groupNode.getAbsolutePosition();
                  
                  return {
                    x: absPos.x,
                    y: absPos.y,
                    width: boxWidth,
                    height: boxHeight
                  };
                };
                
                transformer.forceUpdate();
                transformer.getLayer()?.batchDraw();
              }
            }
          } catch {
            // Ignore errors
          }
        }, 100);
        
        return () => {
          clearTimeout(timeoutId);
          // Clean up event listeners
          const transformer = transformerRef.current;
          if (transformer) {
            transformer.off('transformstart', handleTransformStart);
            transformer.off('transformend', handleTransformEnd);
          }
        };
      } else {
        // Restore original getClientRect for non-QnA elements
        if ((transformer as any).__originalGetClientRect) {
          transformer.getClientRect = (transformer as any).__originalGetClientRect;
          delete (transformer as any).__originalGetClientRect;
          transformer.forceUpdate();
          transformer.getLayer()?.batchDraw();
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
            transformer.forceUpdate();
            const layer = transformer.getLayer();
            if (layer) {
              layer.batchDraw();
            }
          } else if (validNodes.length !== nodes.length) {
            // Some nodes are invalid, update the transformer with only valid nodes
            if (validNodes.length > 0) {
              transformer.nodes(validNodes);
            } else {
              // All nodes are invalid, clear transformer
              transformer.nodes([]);
            }
            const layer = transformer.getLayer();
            if (layer) {
              layer.batchDraw();
            }
          }
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
      }, 10);
    }
  }, [currentPage?.elements]); // React will handle deep comparison optimization

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
              transformer.forceUpdate();
              const layer = transformer.getLayer();
              if (layer) {
                layer.batchDraw();
              }
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
    
    // Block canvas editing for non-full-edit levels
    if (!canEditCanvas()) return;
    
    const lockElements = state.editorSettings?.editor?.lockElements;
    
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

    // Block adding new elements if elements are locked
    if (lockElements && ['brush', 'line', 'rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley', 'text', 'question', 'answer', 'qna', 'free_text'].includes(state.activeTool)) {
      // Allow selection tool to work for selecting elements
      if (state.activeTool !== 'select') {
        return;
      }
    }

    // Only handle mouseDown for brush, select, and pan tools
    if (state.activeTool === 'pan') {
      setIsPanning(true);
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setPanStart({ x: pos.x - stagePos.x, y: pos.y - stagePos.y });
      }
    } else if (state.activeTool === 'brush') {
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
          setStagePos(
            clampStagePosition({
              x: pos.x - panStart.x,
              y: pos.y - panStart.y
            })
          );
        }
      }
      return;
    }
    
    if (isPanning) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setHasPanned(true);
        setStagePos(
          clampStagePosition({
            x: pos.x - panStart.x,
            y: pos.y - panStart.y
          })
        );

        // Force transformer update during panning to prevent selection rectangle delay
        if (transformerRef.current) {
          transformerRef.current.forceUpdate();
          transformerRef.current.getLayer()?.batchDraw();
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
        setGroupMoveStart(null);
        groupMoveStartRef.current = null;
        // Clean up initial positions
        groupMoveInitialPositionsRef.current = null;
        return;
      }
      
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
        

        setSelectionRect(newRect);
      }
    }
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
      const brushDefaults = getToolDefaults(
        'brush',
        templateIds.pageTheme,
        templateIds.bookTheme,
        undefined,
        state.toolSettings?.brush,
        templateIds.pageLayoutTemplateId,
        templateIds.bookLayoutTemplateId,
        templateIds.pageColorPaletteId,
        templateIds.bookColorPaletteId
      );
      const toolSettings = state.toolSettings?.brush || {};
      
      const strokeData = {
        points: smoothedPath,
        strokeColor: brushDefaults.stroke || toolSettings.strokeColor || '#1f2937',
        strokeWidth: brushDefaults.strokeWidth || toolSettings.strokeWidth || 3
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
        const lineDefaults = getToolDefaults(
          'line',
          templateIds.pageTheme,
          templateIds.bookTheme,
          undefined,
          state.toolSettings?.line,
          templateIds.pageLayoutTemplateId,
          templateIds.bookLayoutTemplateId,
          templateIds.pageColorPaletteId,
          templateIds.bookColorPaletteId
        );
        const toolSettings = state.toolSettings?.line || {};
        const newElement: CanvasElement = {
          id: uuidv4(),
          type: 'line',
          x: previewLine.x1,
          y: previewLine.y1,
          width: width,
          height: height,
          ...lineDefaults, // Apply ALL defaults
          stroke: lineDefaults.stroke || toolSettings.strokeColor || lineDefaults.stroke,
          strokeWidth: lineDefaults.strokeWidth || toolSettings.strokeWidth || lineDefaults.strokeWidth
        };
        dispatch({ type: 'ADD_ELEMENT', payload: newElement });
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
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
        const shapeDefaults = getToolDefaults(
          previewShape.type as any,
          templateIds.pageTheme,
          templateIds.bookTheme,
          undefined,
          state.toolSettings?.[previewShape.type],
          templateIds.pageLayoutTemplateId,
          templateIds.bookLayoutTemplateId,
          templateIds.pageColorPaletteId,
          templateIds.bookColorPaletteId
        );
        const toolSettings = state.toolSettings?.[previewShape.type] || {};
        const newElement: CanvasElement = {
          id: uuidv4(),
          type: previewShape.type as any,
          x: previewShape.x,
          y: previewShape.y,
          width: previewShape.width,
          height: previewShape.height,
          ...shapeDefaults, // Apply ALL defaults
          fill: shapeDefaults.fill !== undefined && shapeDefaults.fill !== 'transparent'
            ? shapeDefaults.fill
            : (toolSettings.fillColor !== undefined ? toolSettings.fillColor : shapeDefaults.fill || 'transparent'),
          stroke: shapeDefaults.stroke || toolSettings.strokeColor || shapeDefaults.stroke,
          strokeWidth: shapeDefaults.strokeWidth || toolSettings.strokeWidth || shapeDefaults.strokeWidth,
          polygonSides: previewShape.type === 'polygon' ? (state.toolSettings?.polygon?.polygonSides || shapeDefaults.polygonSides || 5) : shapeDefaults.polygonSides
        };
        dispatch({ type: 'ADD_ELEMENT', payload: newElement });
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
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
          const textDefaults = getToolDefaults(
            'text',
            templateIds.pageTheme,
            templateIds.bookTheme,
            undefined,
            state.toolSettings?.text,
            templateIds.pageLayoutTemplateId,
            templateIds.bookLayoutTemplateId,
            templateIds.pageColorPaletteId,
            templateIds.bookColorPaletteId
          );
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
          const questionDefaults = getToolDefaults(
            'question',
            templateIds.pageTheme,
            templateIds.bookTheme,
            undefined,
            state.toolSettings?.question,
            templateIds.pageLayoutTemplateId,
            templateIds.bookLayoutTemplateId,
            templateIds.pageColorPaletteId,
            templateIds.bookColorPaletteId
          );
          const answerDefaults = getToolDefaults(
            'answer',
            templateIds.pageTheme,
            templateIds.bookTheme,
            undefined,
            state.toolSettings?.answer,
            templateIds.pageLayoutTemplateId,
            templateIds.bookLayoutTemplateId,
            templateIds.pageColorPaletteId,
            templateIds.bookColorPaletteId
          );
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
          dispatch({ type: 'ADD_ELEMENT', payload: questionElement });
        } else if (previewTextbox.type === 'qna') {
          const templateIds = getTemplateIdsForDefaults();
          const qnaDefaults = getToolDefaults(
            'qna',
            templateIds.pageTheme,
            templateIds.bookTheme,
            undefined,
            state.toolSettings?.qna,
            templateIds.pageLayoutTemplateId,
            templateIds.bookLayoutTemplateId,
            templateIds.pageColorPaletteId,
            templateIds.bookColorPaletteId
          );
          
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
          const templateIds = getTemplateIdsForDefaults();
          const freeTextDefaults = getToolDefaults(
            'free_text',
            templateIds.pageTheme,
            templateIds.bookTheme,
            undefined,
            state.toolSettings?.free_text,
            templateIds.pageLayoutTemplateId,
            templateIds.bookLayoutTemplateId,
            templateIds.pageColorPaletteId,
            templateIds.bookColorPaletteId
          );
          newElement = {
            id: uuidv4(),
            type: 'text',
            x: previewTextbox.x,
            y: previewTextbox.y,
            width: previewTextbox.width,
            height: previewTextbox.height,
            ...freeTextDefaults, // Apply ALL defaults
            text: '',
            textType: 'free_text'
          };
        } else {
          const templateIds = getTemplateIdsForDefaults();
          const answerDefaults = getToolDefaults(
            'answer',
            templateIds.pageTheme,
            templateIds.bookTheme,
            undefined,
            state.toolSettings?.answer,
            templateIds.pageLayoutTemplateId,
            templateIds.bookLayoutTemplateId,
            templateIds.pageColorPaletteId,
            templateIds.bookColorPaletteId
          );
          
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
        
        dispatch({ type: 'ADD_ELEMENT', payload: newElement });
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      }
      setIsDrawingTextbox(false);
      setTextboxStart(null);
      setPreviewTextbox(null);
    } else if (isMovingGroup || isMovingGroupRef.current) {
      setIsMovingGroup(false);
      isMovingGroupRef.current = false;
      setGroupMoveStart(null);
      groupMoveStartRef.current = null;
      // Clean up initial positions
      groupMoveInitialPositionsRef.current = null;
    } else if (isSelecting) {
      const selectedIds = getElementsInSelection(
        currentPage,
        selectionRect,
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
    
    const x = (lastMousePos.x - stagePos.x) / zoom - activePageOffsetX;
    const y = (lastMousePos.y - stagePos.y) / zoom - pageOffsetY;

    const filteredClipboard = clipboard;
    if (isCoverPage && filteredClipboard.length < clipboard.length) {
      showCoverRestrictionAlert('Q&A inline elements cannot be placed on cover pages.');
    }
    if (filteredClipboard.length === 0) {
      setContextMenu({ x: 0, y: 0, visible: false });
      return;
    }
    
    // Create ID mapping for question-answer pairs
    const idMapping = new Map<string, string>();
    clipboard.forEach(element => {
      idMapping.set(element.id, uuidv4());
    });
    
    // Calculate offset based on top-left element to maintain relative positions
    const minX = Math.min(...clipboard.map(el => el.x));
    const minY = Math.min(...clipboard.map(el => el.y));
    
    const newElementIds: string[] = [];
    
    filteredClipboard.forEach((element) => {
      const newId = idMapping.get(element.id)!;
      newElementIds.push(newId);
      const pastedElement = {
        ...element,
        id: newId,
        x: x + (element.x - minX),
        y: y + (element.y - minY),
        pageId: state.currentBook?.pages[state.activePageIndex]?.id, // Track source page
        // Clear text for question and answer when pasting
        text: (element.textType === 'question' || element.textType === 'answer') ? '' : element.text,
        formattedText: (element.textType === 'question' || element.textType === 'answer') ? '' : element.formattedText,
        // Clear question styling for pasted questions
        fontColor: element.textType === 'question' ? '#9ca3af' : (element.fontColor || element.fill),
        // Clear questionId for question elements to reset question assignment
        questionId: (element.textType === 'question') ? undefined : element.questionId,
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
      setStagePos(
        clampStagePosition({
          x: stagePos.x - e.evt.deltaY,
          y: stagePos.y
        }, zoom)
      );

      // Force transformer update during panning to prevent selection rectangle delay
      if (transformerRef.current) {
        transformerRef.current.forceUpdate();
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else if (e.evt.ctrlKey) {
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
      setZoomFromContext(newScale, pointer);
    } else {
      // Pan with two-finger touchpad (mousewheel without Ctrl)
      setStagePos(
        clampStagePosition({
          x: stagePos.x - e.evt.deltaX,
          y: stagePos.y - e.evt.deltaY
        }, zoom)
      );

      // Force transformer update during panning to prevent selection rectangle delay
      if (transformerRef.current) {
        transformerRef.current.forceUpdate();
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
  };

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Nach einem ungültigen Platzierungsversuch (Outside-Page-Tooltip)
    // soll der aktuelle Modus erhalten bleiben und keine Selektion
    // / Werkzeug-Umschaltung stattfinden.
    if (suppressNextBackgroundClickSelect) {
      setSuppressNextBackgroundClickSelect(false);
      return;
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
  }, [state.activeTool, state.stylePainterActive, dispatch]);


  

  // Preload background images when page changes or background is updated
  useEffect(() => {
    const background = currentPage?.background;
    const cache = backgroundImageCacheRef.current;
    
    // Function to preload a single image
    const preloadImage = (imageUrl: string, _isCurrentPage: boolean = false) => {
      if (!imageUrl || cache.has(imageUrl)) return;
      
      const loadingImages = loadingImagesRef.current;
      if (loadingImages.has(imageUrl)) return; // Already loading
      
      loadingImages.add(imageUrl);
      // Image not in cache, preload it
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      
      const storeEntry = (entry: BackgroundImageEntry) => {
        cache.set(imageUrl, entry);
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
        console.error(`Failed to load background image: ${imageUrl}`, {
          src: img.src,
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        });
      };
      
      img.src = imageUrl;
    };
    
    // Preload current page background immediately
    if (background?.type === 'image') {
      const imageUrl =
        resolveBackgroundImageUrl(background, {
          paletteId: activePaletteId,
          paletteColors: activePalette?.colors
        }) || background.value;
      if (imageUrl) {
        preloadImage(imageUrl, true);
      }
    }
    
    // Also preload images from all other pages for smooth transitions
    if (state.currentBook?.pages) {
      state.currentBook.pages.forEach((page, index) => {
        const pageBackground = page.background;
        if (pageBackground?.type === 'image') {
          const { paletteId, palette } = getPaletteForPage(page);
          const imageUrl =
            resolveBackgroundImageUrl(pageBackground, {
              paletteId,
              paletteColors: palette?.colors
            }) || pageBackground.value;
          if (imageUrl) {
            preloadImage(imageUrl, index === state.activePageIndex);
          }
        }
      });
    }
    // Use a serialized version of the background to detect changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.activePageIndex, 
    state.currentBook?.pages, 
    currentPage?.background?.type, 
    currentPage?.background?.value, 
    JSON.stringify({
      templateId: (currentPage?.background as any)?.backgroundImageTemplateId,
      applyPalette: (currentPage?.background as any)?.applyPalette,
    }),
  ]);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ x: 0, y: 0, visible: false });
    };
    
    const handlePageChange = (event: CustomEvent) => {
      dispatch({ type: 'SET_ACTIVE_PAGE', payload: event.detail });
    };
    
    const handleBrushDone = () => {
      if (brushStrokes.length > 0) {
        const templateIds = getTemplateIdsForDefaults();
        const brushDefaults = getToolDefaults(
          'brush',
          templateIds.pageTheme,
          templateIds.bookTheme,
          undefined,
          state.toolSettings?.brush,
          templateIds.pageLayoutTemplateId,
          templateIds.bookLayoutTemplateId,
          templateIds.pageColorPaletteId,
          templateIds.bookColorPaletteId
        );
        
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
        } else if (e.key === 'p') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('showPDFExport'));
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
          const qnaDefaults = getGlobalThemeDefaults('default', 'qna');
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
      // Prevent authors from opening question manager
      if (!user || user.role === 'author') {
        return;
      }
      const element = currentPage?.elements.find(el => el.id === event.detail.elementId);
      if (element && (element.textType === 'question' || element.textType === 'qna')) {
        setSelectedQuestionElementId(element.id);
        setShowQuestionDialog(true);
      }
    };
    
    const handleOpenQuestionSelector = (event: CustomEvent) => {
      // Prevent authors from opening question selector
      if (!user || user.role === 'author') {
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

  const handleImageSelect = useCallback((imageId: number, imageUrl: string) => {
    // If we have a pending element ID, update the existing placeholder element
    if (pendingImageElementId) {
      // Load image to get original dimensions
      const img = new window.Image();
      img.onload = () => {
        const element = currentPage?.elements.find(el => el.id === pendingImageElementId);
        if (element) {
          const maxWidth = 600;
          const aspectRatio = img.width / img.height;
          const width = maxWidth;
          const height = maxWidth / aspectRatio;
          
          dispatch({
            type: 'UPDATE_ELEMENT',
            payload: {
              id: pendingImageElementId,
              updates: {
                type: 'image',
                src: imageUrl,
                width: element.width || width,
                height: element.height || height
              }
            }
          });
        }
      };
      img.src = imageUrl;
      
      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      setShowImageModal(false);
      setPendingImagePosition(null);
      setPendingImageElementId(null);
      return;
    }
    
    // Otherwise, create a new element (existing behavior)
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
    setPendingImageElementId(null);
  }, [pendingImageElementId, currentPage, pendingImagePosition, dispatch]);

  const handleImageModalClose = () => {
    setShowImageModal(false);
    setPendingImagePosition(null);
    setPendingImageElementId(null);
    dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
  };

  const handleStickerSelect = useCallback(async (stickerId: string | null) => {
    if (!stickerId) return;
    
    // Load sticker registry if needed
    await loadStickerRegistry();
    
    const sticker = getStickerById(stickerId);
    if (!sticker || !sticker.url) {
      console.error('Sticker not found or missing URL:', { stickerId, sticker });
      setShowStickerModal(false);
      setPendingStickerPosition(null);
      setPendingStickerElementId(null);
      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      return;
    }
    
    console.log('Loading sticker:', { id: sticker.id, url: sticker.url, thumbnailUrl: sticker.thumbnailUrl });
    
    // If we have a pending element ID, update the existing sticker element
    if (pendingStickerElementId) {
      // Load sticker image to get original dimensions
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const element = currentPage?.elements.find(el => el.id === pendingStickerElementId);
        if (element) {
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
                stickerColor: undefined
              }
            }
          });
        }
      };
      img.src = sticker.url;
      
      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      setShowStickerModal(false);
      setPendingStickerPosition(null);
      setPendingStickerElementId(null);
      return;
    }
    
    // Otherwise, create a new element (existing behavior)
    if (!pendingStickerPosition) return;
    
    // Load sticker image to get dimensions
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      console.log('Sticker image loaded successfully:', { width: img.width, height: img.height, url: sticker.url });
      const maxWidth = 300;
      const aspectRatio = img.width / img.height;
      const width = maxWidth;
      const height = maxWidth / aspectRatio;
      
      const newElement: CanvasElement = {
        id: uuidv4(),
        type: 'sticker',
        x: pendingStickerPosition.x,
        y: pendingStickerPosition.y,
        width,
        height,
        imageOpacity: 1,
        src: sticker.url,
        stickerId: sticker.id,
        stickerFormat: sticker.format,
        stickerFilePath: sticker.filePath,
        stickerOriginalUrl: sticker.url,
        cornerRadius: 0,
        imageClipPosition: 'center-middle' // Enable crop behavior for stickers, same as images
      };
      
      dispatch({ type: 'ADD_ELEMENT', payload: newElement });
      dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      setShowStickerModal(false);
      setPendingStickerPosition(null);
      setPendingStickerElementId(null);
    };
    img.onerror = (error) => {
      console.error('Failed to load sticker image:', { 
        url: sticker.url, 
        thumbnailUrl: sticker.thumbnailUrl,
        error,
        sticker 
      });
      // Try using thumbnailUrl as fallback
      if (sticker.thumbnailUrl && sticker.thumbnailUrl !== sticker.url) {
        console.log('Trying thumbnailUrl as fallback:', sticker.thumbnailUrl);
        const fallbackImg = new window.Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = () => {
          const maxWidth = 300;
          const aspectRatio = fallbackImg.width / fallbackImg.height;
          const width = maxWidth;
          const height = maxWidth / aspectRatio;
          
          const newElement: CanvasElement = {
            id: uuidv4(),
            type: 'sticker',
            x: pendingStickerPosition.x,
            y: pendingStickerPosition.y,
            width,
            height,
            imageOpacity: 1,
            src: sticker.thumbnailUrl,
            stickerId: sticker.id,
            stickerFormat: sticker.format,
            stickerFilePath: sticker.filePath,
            stickerOriginalUrl: sticker.url,
            cornerRadius: 0
          };
          
          dispatch({ type: 'ADD_ELEMENT', payload: newElement });
          dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
          setShowStickerModal(false);
          setPendingStickerPosition(null);
        };
        fallbackImg.onerror = () => {
          console.error('Failed to load sticker thumbnail as well:', sticker.thumbnailUrl);
          setShowStickerModal(false);
          setPendingStickerPosition(null);
          dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
        };
        fallbackImg.src = sticker.thumbnailUrl;
      } else {
        setShowStickerModal(false);
        setPendingStickerPosition(null);
        dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      }
    };
    img.src = sticker.url;
  }, [pendingStickerElementId, currentPage, pendingStickerPosition, dispatch]);

  const handleStickerModalClose = () => {
    setShowStickerModal(false);
    setPendingStickerPosition(null);
    setPendingStickerElementId(null);
    dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
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
          style={{ 
            cursor: state.isMiniPreview && state.editorInteractionLevel === 'answer_only' 
              ? 'default' 
              : (state.stylePainterActive ? 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkuMDYgMTEuOUwxMi4wNiA4LjlMMTUuMDYgMTEuOUwxMi4wNiAxNC45TDkuMDYgMTEuOVoiIGZpbGw9IiMwMDAiLz4KPHA+YXRoIGQ9Ik0xMi4wNiA4LjlMMTUuMDYgNS45TDE4LjA2IDguOUwxNS4wNiAxMS45TDEyLjA2IDguOVoiIGZpbGw9IiMwMDAiLz4KPC9zdmc+") 12 12, auto' : undefined)
          }}
        >
          <Layer>
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
                return sorted;
              })().map((element, index) => {
                // Don't use zIndex - Konva renders in the order elements are added to the Layer
                // The sorted array ensures correct rendering order
                
                return (
                <Group 
                  key={`${element.id}-${element.questionId || 'no-question'}-${index}`}
                  listening={true}
                >
                  <CanvasItemComponent
                    element={element}
                    isSelected={state.selectedElementIds.includes(element.id)}
                    zoom={zoom}
                    hoveredElementId={state.hoveredElementId}
                    pageSide={isActiveLeft ? 'left' : 'right'}
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
                  isWithinSelection={selectionRect.visible && getElementsInSelection(
                    currentPage,
                    selectionRect,
                    activePageOffsetX,
                    pageOffsetY
                  ).includes(element.id)}
                />

                </Group>
                );
              })}
            
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
            {partnerPage && previewPageOffsetX !== null && (
              <Group
                x={previewPageOffsetX}
                y={pageOffsetY}
                listening={false}
                name="no-print preview-page"
                opacity={1}
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
                })().map(element => (
                  <Group key={`preview-${element.id}`}>
                    <CanvasItemComponent
                      element={element}
                      isSelected={false}
                      zoom={zoom}
                      hoveredElementId={null}
                      pageSide={isActiveLeft ? 'right' : 'left'}
                    />
                  </Group>
                ))}
              </Group>
            )}
            {partnerPage && previewPageOffsetX !== null && !state.isMiniPreview && (
               // Background for the preview page and inactive page of page pair
               <Rect
                 x={previewPageOffsetX-10}
                 y={pageOffsetY-10}
                 width={canvasWidth+20}
                 height={canvasHeight+20}
                 fill="rgba(255, 255, 255, 0.9)"
                 fillPatternImage={undefined}
                 fillPatternRepeat="repeat"
                 opacity={1}
                 onClick={handlePreviewCanvasClick}
                 onTap={handlePreviewCanvasClick}
                 listening={true}
                 onMouseEnter={(e) => {
                   const stage = e.target.getStage();
                   if (stage) {
                     stage.container().style.cursor = 'pointer';
                   }
                   // Tooltip-Position oberhalb des Mauszeigers
                   if (e.evt && typeof e.evt.clientX === 'number' && typeof e.evt.clientY === 'number') {
                     setInactivePageTooltip({ x: e.evt.clientX, y: e.evt.clientY - 24 });
                   }
                 }}
                 onMouseMove={(e) => {
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
              keepRatio={false}
              rotationSnaps={[0, 90, 180, 270]}
              rotationSnapTolerance={5}
              resizeEnabled={!(state.editorSettings?.editor?.lockElements)}
              rotateEnabled={!(state.editorSettings?.editor?.lockElements)}
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
                      const updates: any = {
                        x: node.x(),
                        y: node.y(),
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
                          // For image elements, scale was converted to size during onTransform
                          // Get the final size from the size state (via element.width/height which should be updated)
                          // But during transformEnd, element.width/height might not be updated yet,
                          // so we need to calculate from Group scale
                          const groupScaleX = groupNode.scaleX();
                          const groupScaleY = groupNode.scaleY();
                          const baseWidth = element.width || 150;
                          const baseHeight = element.height || 100;
                          
                          // Calculate final dimensions from Group scale
                          const finalWidth = Math.max(20, baseWidth * groupScaleX);
                          const finalHeight = Math.max(20, baseHeight * groupScaleY);
                          
                          // Get rotation from Group node (Transformer is on Group now)
                          const groupRotation = groupNode.rotation();
                          
                          updates.width = finalWidth;
                          updates.height = finalHeight;
                          updates.x = groupNode.x();
                          updates.y = groupNode.y();
                          // Always save rotation, even if it's 0 - explicitly set to ensure it's saved
                          updates.rotation = typeof groupRotation === 'number' ? groupRotation : 0;
                          
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
                          updates.x = groupNode.x();
                          updates.y = groupNode.y();
                          updates.rotation = typeof groupNode.rotation() === 'number' ? groupNode.rotation() : 0;
                          
                          groupNode.scaleX(1);
                          groupNode.scaleY(1);
                        }
                    } else {
                      // For text elements (except qna and free-text which are handled above), use Group node
                      const scaleX = node.scaleX();
                      const scaleY = node.scaleY();
                      
                        updates.width = Math.max(50, (element.width || 150) * scaleX);
                        updates.height = Math.max(20, (element.height || 50) * scaleY);
                      updates.x = node.x();
                      updates.y = node.y();
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
                      
                      updates.x = node.x();
                      updates.y = node.y();
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
        {!state.isMiniPreview && previewPageBadgeMeta && previewPageBadgePosition && (
          <CanvasOverlayPortal>
            <div
              className="absolute"
              style={{
                left: previewPageBadgePosition.x,
                top: previewPageBadgePosition.y,
                transform: 'translate(-50%, -100%)',
                pointerEvents: previewTargetLocked ? 'none' : 'auto',
                minWidth: 0,
                width: 'max-content'
              }}
            >
              {partnerPage?.pageNumber && state.pageAssignments[partnerPage.pageNumber] ? (
                <Tooltip side="top" content="Click to enter this page.">
                  <button
                    type="button"
                    onClick={previewTargetLocked ? undefined : handlePreviewBadgeClick}
                    disabled={previewTargetLocked}
                    style={createBadgeStyleWithProfile(false, previewTargetLocked, state.pageAssignments[partnerPage.pageNumber])}
                  >
                    {renderBadgeSegments(previewPageBadgeMeta, false, state.pageAssignments[partnerPage.pageNumber])}
                  </button>
                </Tooltip>
              ) : (
                <Tooltip side="top" content="Click to enter this page.">
                  <button
                    type="button"
                    onClick={previewTargetLocked ? undefined : handlePreviewBadgeClick}
                    disabled={previewTargetLocked}
                    style={createBadgeStyleWithoutProfile(false, previewTargetLocked)}
                  >
                    {renderBadgeSegments(previewPageBadgeMeta, false, null)}
                  </button>
                </Tooltip>
              )}
            </div>
          </CanvasOverlayPortal>
        )}
        {!state.isMiniPreview && previewLockBadgeScreen && (
          <CanvasOverlayPortal>
            <div
              className="pointer-events-none absolute flex items-center justify-center"
              style={{
                width: 120,
                height: 40,
                left: previewLockBadgeScreen.x - 60,
                top: previewLockBadgeScreen.y - 20,
                borderRadius: 44,
                backgroundColor: '#ffffff',
                border: '1px solid #E5E7EB',
                boxShadow: '0 20px 45px rgba(15,23,42,0.08)',
              }}
            >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#64748b',
              }}
            >
              Not editable
            </span>
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
          canGroup={state.selectedElementIds.length >= 2}
          canUngroup={state.selectedElementIds.length === 1 && currentPage?.elements.find(el => el.id === state.selectedElementIds[0])?.type === 'group' || (state.selectedElementIds.length === 1 && currentPage?.elements.find(el => el.id === state.selectedElementIds[0])?.type === 'brush-multicolor')}

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
        userRole={user?.role || ''}

        // Question Selector Modal
        showQuestionSelectorModal={showQuestionSelectorModal}
        onQuestionSelectorModalClose={() => setShowQuestionSelectorModal(false)}
        questionSelectorElementId={questionSelectorElementId}

        // Alert
        alertMessage={alertMessage}
        alertPosition={alertPosition}

        // Tooltips
        inactivePageTooltip={inactivePageTooltip}
        outsidePageTooltip={outsidePageTooltip}
      />
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
