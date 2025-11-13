import { useEffect, useRef, useState } from 'react';
import { Badge } from '../../ui/composites/badge';
import { FileText } from 'lucide-react';
import ProfilePicture from '../users/profile-picture';
import { useEditor, getPagePreviewCacheId } from '../../../context/editor-context';
import { generatePagePreview } from '../../../utils/page-preview-generator';
import type { Page, Book } from '../../../context/editor-context';

interface PagePreviewProps {
  bookId?: number;
  pageId: number;
  pageNumber: number;
  assignedUser?: { name: string; id: number } | null;
  isActive?: boolean;
  page?: Page;
  book?: Book;
}

export default function PagePreview({ pageId, pageNumber, assignedUser, isActive, page: pageProp, book: bookProp }: PagePreviewProps) {
  const { state } = useEditor();
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const lastGeneratedCacheIdRef = useRef<number | null>(null);

  const bookData = bookProp ?? state.currentBook ?? null;
  const pageData = pageProp ?? bookData?.pages.find((p) => p.id === pageId) ?? null;
  const cacheId = getPagePreviewCacheId(pageData, pageNumber);
  const cachedPreview = cacheId != null ? state.pagePreviewCache[cacheId] : undefined;
  const previewUrl = cachedPreview?.dataUrl ?? localPreview;

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
    generatePagePreview({ page: pageData, book: bookData, previewWidth: 200, previewHeight: 280 })
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
  }, [cachedPreview?.dataUrl, pageData, bookData, cacheId]);

  const borderClass = isActive ? 'border-ring' : 'border-border';

  return (
    <div className={`w-16 h-20 bg-muted border-2 ${borderClass} rounded-lg flex items-center justify-center relative overflow-visible`}>
      {previewUrl ? (
        <img 
          src={previewUrl} 
          alt={`Page ${pageNumber} preview`}
          className="w-full h-full object-contain"
          style={{ backgroundColor: '#fff' }}
        />
      ) : (
        <FileText className="h-6 w-6 text-muted-foreground" />
      )}
      
      {/* Profile picture badge at top-right */}
      {assignedUser && (
        <div className="absolute -top-3 -right-2 w-8 h-8 rounded-full">
          <ProfilePicture 
            name={assignedUser.name} 
            size="sm" 
            userId={assignedUser.id}
            className="w-full h-full"
            variant="withColoredBorder"
          />
        </div>
      )}
      
      {/* Page number badge at bottom center */}
      <Badge 
        variant="secondary" 
        className="h-5 w-5 absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs border bg-white text-primary border-border p-1 flex items-center justify-center"
      >
        {pageNumber}
      </Badge>
    </div>
  );
}