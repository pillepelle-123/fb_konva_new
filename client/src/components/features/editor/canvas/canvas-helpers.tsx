import React, { useCallback, useMemo } from 'react';
import ProfilePicture from '../../users/profile-picture';

// Canvas dimension calculations
export const getCanvasDimensions = (dimensions: any, orientation: string) => {
  const canvasWidth = orientation === 'landscape' ? dimensions.height : dimensions.width;
  const canvasHeight = orientation === 'landscape' ? dimensions.width : dimensions.height;
  const spreadGapCanvas = canvasWidth * 0.05;
  const spreadWidthCanvas = canvasWidth * 2 + spreadGapCanvas;

  return {
    canvasWidth,
    canvasHeight,
    spreadGapCanvas,
    spreadWidthCanvas
  };
};

// Page offset calculations
export const getPageOffsets = (
  partnerInfo: any,
  activePageIndex: number,
  canvasWidth: number,
  spreadGapCanvas: number
) => {
  const isActiveLeft = partnerInfo ? activePageIndex <= partnerInfo.index : true;
  const activePageOffsetX = partnerInfo && !isActiveLeft ? canvasWidth + spreadGapCanvas : 0;
  const previewPageOffsetX = partnerInfo ? (isActiveLeft ? canvasWidth + spreadGapCanvas : 0) : null;
  const pageOffsetY = 0;

  return {
    isActiveLeft,
    activePageOffsetX,
    previewPageOffsetX,
    pageOffsetY
  };
};

// Template IDs helper
export const getTemplateIdsForDefaults = (currentPage: any, currentBook: any, getActiveTemplateIds: any) => {
  const activeTemplateIds = getActiveTemplateIds(currentPage, currentBook);

  return {
    pageTheme: activeTemplateIds.pageTheme,
    bookTheme: activeTemplateIds.bookTheme,
    pageLayoutTemplateId: activeTemplateIds.pageLayoutTemplateId,
    bookLayoutTemplateId: activeTemplateIds.bookLayoutTemplateId,
    pageColorPaletteId: activeTemplateIds.pageColorPaletteId,
    bookColorPaletteId: activeTemplateIds.bookColorPaletteId
  };
};

// Clamp stage position utility
export const clampStagePosition = (
  pos: { x: number; y: number },
  zoom: number,
  containerSize: { width: number; height: number },
  spreadWidthCanvas: number,
  canvasHeight: number,
  scaleOverride?: number
) => {
  const appliedZoom = scaleOverride ?? zoom;
  const contentWidth = spreadWidthCanvas * appliedZoom;
  const contentHeight = canvasHeight * appliedZoom;

  const minX = -(contentWidth - containerSize.width);
  const maxX = 0;
  const minY = -(contentHeight - containerSize.height);
  const maxY = 0;

  return {
    x: Math.max(minX, Math.min(maxX, pos.x)),
    y: Math.max(minY, Math.min(maxY, pos.y))
  };
};

// Simple alert helper functions (without state dependencies)
export const showCoverRestrictionAlert = (
  setAlertMessage: (message: string | null) => void,
  setAlertPosition: (position: { x: number; y: number } | null) => void
) => (message: string) => {
  setAlertMessage(message);
  setAlertPosition({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  });

  setTimeout(() => {
    setAlertMessage(null);
    setAlertPosition(null);
  }, 3000);
};

export const showOutsidePageTooltip = (
  setOutsidePageTooltip: (tooltip: { x: number; y: number } | null) => void,
  setSuppressNextBackgroundClickSelect: (suppress: boolean) => void
) => (clientX: number, clientY: number) => {
  setOutsidePageTooltip({ x: clientX, y: clientY - 40 });
  setSuppressNextBackgroundClickSelect(true);
  // Auto-hide after a short delay so the user can quickly try again
  window.setTimeout(() => {
    setOutsidePageTooltip(null);
  }, 1800);
};

// Page badge helpers
export const buildPageBadgeMeta = (page?: any): any | null => {
  if (!page) return null;

  const pageIndex = page.pageNumber ?? 1;
  const pageType = page.pageType;

  if (pageType && ['front-cover', 'back-cover', 'inner-front', 'inner-back'].includes(pageType)) {
    return { label: PAGE_TYPE_LABELS[pageType] };
  }

  return { label: `Page ${pageIndex}` };
};

export const getBadgeScreenPosition = (
  offsetX: number | null,
  stagePos: { x: number; y: number },
  zoom: number,
  canvasWidth: number
) => {
  if (offsetX === null) return null;

  const centerScreenX = stagePos.x + (offsetX + canvasWidth / 2) * zoom;
  const centerScreenY = stagePos.y + 20;

  return {
    x: centerScreenX,
    y: centerScreenY
  };
};

export const renderBadgeSegments = (
  meta: any,
  isActive: boolean,
  assignedUser?: { name: string; id?: number } | null
) => (
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
);

// Zoom and positioning helpers
export const setZoomPosition = (
  newZoom: number,
  stageRef: React.RefObject<any>,
  setZoomFromContext: (zoom: number, pointer?: { x: number; y: number }) => void,
  centerPoint?: { x: number; y: number }
) => {
  const stage = stageRef.current;
  const clampedScale = Math.max(0.1, Math.min(3, newZoom));

  if (centerPoint && stage) {
    setZoomFromContext(clampedScale, centerPoint);
  } else {
    setZoomFromContext(clampedScale);
  }
};

// Fit to view helper
export const fitToView = (
  containerRef: React.RefObject<HTMLDivElement>,
  canvasWidth: number,
  canvasHeight: number,
  setZoomFromContext: (zoom: number, pointer?: { x: number; y: number }) => void,
  setStagePos: (pos: { x: number; y: number }) => void
) => {
  if (!containerRef.current) return;

  const containerRect = containerRef.current.getBoundingClientRect();
  const containerWidth = containerRect.width;
  const containerHeight = containerRect.height;

  const scaleX = containerWidth / canvasWidth;
  const scaleY = containerHeight / canvasHeight;
  const optimalZoom = Math.min(scaleX, scaleY) * 0.9; // 10% margin

  setZoomFromContext(optimalZoom);

  // Center the canvas
  const centeredX = (containerWidth - canvasWidth * optimalZoom) / 2;
  const centeredY = (containerHeight - canvasHeight * optimalZoom) / 2;
  setStagePos({ x: centeredX, y: centeredY });
};

// Partner page helpers
export const createPartnerPageHelpers = (
  partnerInfo: any,
  totalPages: number
) => {
  const isPreviewTargetLocked = useCallback(
    (info?: { page: any; index: number }) => {
      if (!info || !info.page) return false;
      const targetPageNumber = info.page.pageNumber ?? info.index + 1;
      return targetPageNumber === 3 || (totalPages > 0 && targetPageNumber === totalPages);
    },
    [totalPages]
  );

  const switchToPartnerPage = useCallback(() => {
    if (!partnerInfo) return;
    const targetPageNumber = partnerInfo.page.pageNumber ?? partnerInfo.index + 1;
    // This would dispatch the page change - simplified for extraction
    return targetPageNumber;
  }, [partnerInfo]);

  return {
    isPreviewTargetLocked,
    switchToPartnerPage
  };
};

// Preview event handlers
export const createPreviewEventHandlers = (
  partnerInfo: any,
  isPreviewTargetLocked: (info?: any) => boolean
) => {
  const handlePreviewCanvasClick = useCallback(
    (evt?: any) => {
      if (evt?.evt instanceof MouseEvent && evt.evt.button !== 0) {
        return;
      }

      if (!partnerInfo || isPreviewTargetLocked(partnerInfo)) {
        return;
      }

      // Dispatch page change to partner page
      const targetPageNumber = partnerInfo.page.pageNumber ?? partnerInfo.index + 1;
      return targetPageNumber;
    },
    [partnerInfo, isPreviewTargetLocked]
  );

  const handlePreviewBadgeClick = useCallback(
    (evt?: React.MouseEvent<HTMLButtonElement>) => {
      if (evt && evt.button !== 0) {
        return;
      }

      if (!partnerInfo || isPreviewTargetLocked(partnerInfo)) {
        return;
      }

      // Dispatch page change to partner page
      const targetPageNumber = partnerInfo.page.pageNumber ?? partnerInfo.index + 1;
      return targetPageNumber;
    },
    [partnerInfo, isPreviewTargetLocked]
  );

  return {
    handlePreviewCanvasClick,
    handlePreviewBadgeClick
  };
};

// Constants
const PAGE_TYPE_LABELS: Record<string, string> = {
  'front-cover': 'Front Cover',
  'back-cover': 'Back Cover',
  'inner-front': 'Inner Front',
  'inner-back': 'Inner Back'
};

