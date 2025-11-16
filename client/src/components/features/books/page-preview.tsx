import { useEffect, useRef, useState } from 'react';
import { Badge } from '../../ui/composites/badge';
import { FileText } from 'lucide-react';
import ProfilePicture from '../users/profile-picture';
import { useEditor, getPagePreviewCacheId } from '../../../context/editor-context';
import { generatePagePreview } from '../../../utils/page-preview-generator';
import type { Page, Book } from '../../../context/editor-context';
import { getLayoutVariationLabel, getBackgroundVariationLabel } from '../../../utils/layout-variation-labels';

const PAGE_LABELS: Record<string, string> = {
  'front-cover': 'Front Cover',
  'back-cover': 'Back Cover',
  'inner-front': 'Inner Front',
  'inner-back': 'Inner Back',
  // 'first-page' and 'last-page' are regular content pages, not special
  // 'first-page': 'First Page',
  // 'last-page': 'Last Page'
};

type PagePreviewVariant = 'default' | 'compact';

interface PagePreviewProps {
  bookId?: number;
  pageId: number;
  pageNumber: number;
  assignedUser?: { name: string; id: number } | null;
  isActive?: boolean;
  page?: Page;
  book?: Book;
  variant?: PagePreviewVariant;
}

export default function PagePreview({
  pageId,
  pageNumber,
  assignedUser,
  isActive,
  page: pageProp,
  book: bookProp,
  variant = 'default'
}: PagePreviewProps) {
  const { state } = useEditor();
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const lastGeneratedCacheIdRef = useRef<number | null>(null);

  const bookData = bookProp ?? state.currentBook ?? null;
  const pageData = pageProp ?? bookData?.pages.find((p) => p.id === pageId) ?? null;
  const cacheId = getPagePreviewCacheId(pageData, pageNumber);
  const cachedPreview = cacheId != null ? state.pagePreviewCache[cacheId] : undefined;
  const previewUrl = cachedPreview?.dataUrl ?? localPreview;
  const specialLabel = pageData?.pageType ? PAGE_LABELS[pageData.pageType] : null;
  const isPrintable = pageData?.isPrintable !== false;
  const layoutVariationLabel = getLayoutVariationLabel(pageData?.layoutVariation);
  const backgroundVariationLabel = getBackgroundVariationLabel(pageData?.backgroundVariation);
  const isCompact = variant === 'compact';
  const previewWidth = isCompact ? 140 : 200;
  const previewHeight = isCompact ? 190 : 280;
  const containerClasses = isCompact ? 'w-14 h-18' : 'w-16 h-20';
  const specialLabelClass = isCompact ? 'text-[8px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';
  const iconSizeClass = isCompact ? 'h-5 w-5' : 'h-6 w-6';
  const profileBadgeSize = isCompact ? 'w-6 h-6 -top-2.5 -right-2' : 'w-8 h-8 -top-3 -right-2';
  const pageNumberBadgeClass = isCompact ? 'h-4 w-4 text-[10px] -bottom-1.5' : 'h-5 w-5 text-xs -bottom-2';

  useEffect(() => {
    if (cachedPreview?.dataUrl) {
      setLocalPreview(null);
      lastGeneratedCacheIdRef.current = null;
      return;
    }

    if (pageData?.isPlaceholder) {
      setLocalPreview(null);
      lastGeneratedCacheIdRef.current = null;
      return;
    }

    if (!pageData || !bookData || cacheId == null) {
      setLocalPreview(null);
      lastGeneratedCacheIdRef.current = null;
      return;
    }

    if (lastGeneratedCacheIdRef.current === cacheId) {
      return;
    }

    let cancelled = false;
    generatePagePreview({
      page: pageData,
      book: bookData,
      previewWidth,
      previewHeight
    })
      .then((dataUrl) => {
        if (!cancelled) {
          lastGeneratedCacheIdRef.current = cacheId;
          setLocalPreview(dataUrl ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          lastGeneratedCacheIdRef.current = cacheId;
          setLocalPreview(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cachedPreview?.dataUrl, pageData, bookData, cacheId, previewWidth, previewHeight]);

  const borderClass = isActive ? 'border-ring' : 'border-border';

  return (
    <div
      className={`${containerClasses} bg-muted border-2 ${borderClass} rounded-lg flex items-center justify-center relative overflow-visible`}
    >
      {specialLabel && (
        <span
          className={`absolute -top-2 left-0 bg-blue-500 text-white rounded-full shadow ${specialLabelClass}`}
        >
          {specialLabel}
        </span>
      )}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={`Page ${pageNumber} preview`}
          className="w-full h-full object-contain"
          style={{ backgroundColor: '#fff' }}
        />
      ) : (
        <FileText className={`${iconSizeClass} text-muted-foreground`} />
      )}
      {!isPrintable && (
        <div className="absolute inset-0 bg-black/60 rounded-lg text-[10px] text-white flex items-center justify-center text-center px-1">
          Not printable
        </div>
      )}
      {!isCompact && (layoutVariationLabel || backgroundVariationLabel) && (
        <div className="absolute bottom-1 left-1 right-1 flex flex-col items-start gap-1 pointer-events-none">
          {layoutVariationLabel && (
            <span className="text-[8px] px-1 py-px rounded bg-white/90 text-blue-800 border border-blue-200 shadow-sm">
              {layoutVariationLabel}
            </span>
          )}
          {backgroundVariationLabel && (
            <span className="text-[8px] px-1 py-px rounded bg-white/90 text-purple-800 border border-purple-200 shadow-sm">
              {backgroundVariationLabel}
            </span>
          )}
        </div>
      )}
      
      {/* Profile picture badge at top-right */}
      {assignedUser && (
        <div className={`absolute ${profileBadgeSize} rounded-full`}>
          <ProfilePicture
            name={assignedUser.name}
            size={isCompact ? 'xs' : 'sm'}
            userId={assignedUser.id}
            className="w-full h-full"
            variant="withColoredBorder"
          />
        </div>
      )}
      
      {/* Page number badge at bottom center */}
      <Badge 
        variant="secondary" 
        className={`${pageNumberBadgeClass} absolute left-1/2 transform -translate-x-1/2 border bg-white text-primary border-border p-1 flex items-center justify-center`}
      >
        {pageNumber}
      </Badge>
    </div>
  );
}