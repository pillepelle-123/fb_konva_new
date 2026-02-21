import { useEditor } from '../../../context/editor-context';
import { useAuth } from '../../../context/auth-context';
import { Button } from '../../ui/primitives/button';
import { X } from 'lucide-react';
import { exportPageJsonToWindow } from '../../../utils/page-json-exporter';
import { cn } from '../../../lib/utils';

interface AdminInfoPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AdminInfoPanel({ open, onClose }: AdminInfoPanelProps) {
  const { user } = useAuth();
  const { state } = useEditor();

  if (user?.role !== 'admin') {
    return null;
  }

  if (!open) {
    return null;
  }

  const currentBook = state.currentBook;
  const currentPage = currentBook?.pages[state.activePageIndex];
  const bookId = currentBook?.id ?? '—';
  const pageId = currentPage?.id ?? currentPage?.database_id ?? '—';
  const userId = user?.id ?? '—';

  const handleExportPageJson = () => {
    if (!currentPage) return;
    exportPageJsonToWindow(currentPage, `Page JSON – Book ${bookId} – Page ${pageId}`);
  };

  return (
    <div
      className={cn(
        'fixed bottom-10 left-4 z-[1001]',
        'bg-black/80 rounded-xl text-white',
        'min-w-[220px] max-w-[320px]',
        'shadow-lg',
        'pointer-events-auto'
      )}
      style={{ isolation: 'isolate' }}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-white/95">Admin Info</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/10 -mr-1 -mt-0.5"
            onClick={onClose}
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1.5 text-sm text-white/90 mb-3">
          <div className="flex justify-between gap-4">
            <span className="text-white/70">book_id</span>
            <span className="font-mono text-xs truncate max-w-[140px]" title={String(bookId)}>
              {String(bookId)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-white/70">page_id</span>
            <span className="font-mono text-xs truncate max-w-[140px]" title={String(pageId)}>
              {String(pageId)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-white/70">user_id</span>
            <span className="font-mono text-xs truncate max-w-[140px]" title={String(userId)}>
              {String(userId)}
            </span>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="w-full h-8 text-xs bg-white/15 hover:bg-white/25 text-white border-0"
          onClick={handleExportPageJson}
          disabled={!currentPage}
        >
          Export Page JSON
        </Button>
      </div>
    </div>
  );
}
