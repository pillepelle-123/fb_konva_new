import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/overlays/dialog';
import { Button } from '../../../ui/primitives/button';
import { Check, X, RefreshCw } from 'lucide-react';

interface PreviewImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  previewImage: string | null;
  onApplyToPage: () => void;
  onApplyToBook: () => void;
  onCancel: () => void;
  previewType: 'layout' | 'theme' | 'palette';
  isBookLevel: boolean;
  onRefreshPreview?: () => Promise<string | null>;
  isLoading?: boolean;
}

export function PreviewImageDialog({
  isOpen,
  onClose,
  previewImage,
  onApplyToPage,
  onApplyToBook,
  onCancel,
  previewType,
  isBookLevel,
  onRefreshPreview,
  isLoading = false
}: PreviewImageDialogProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefreshPreview) return;
    setIsRefreshing(true);
    try {
      await onRefreshPreview();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  const handleApplyToPage = () => {
    onApplyToPage();
    onClose();
  };

  const handleApplyToBook = () => {
    onApplyToBook();
    onClose();
  };

  if (!isOpen) return null;

  const previewTypeLabel = {
    layout: 'Layout',
    theme: 'Theme',
    palette: 'Color Palette'
  }[previewType];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{previewTypeLabel} Preview</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Preview Info */}
          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
            <p>Preview mit reduzierter Auflösung und Qualität für bessere Performance.</p>
            {onRefreshPreview && (
              <p className="mt-1">Hinweis: Änderungen am Canvas werden nicht automatisch aktualisiert. Klicke auf "Preview aktualisieren" für ein neues Preview.</p>
            )}
          </div>

          {/* Preview Image */}
          <div className="flex-1 min-h-0 flex items-center justify-center bg-gray-100 rounded-lg overflow-auto">
            {isLoading || isRefreshing ? (
              <div className="flex flex-col items-center gap-2 text-gray-500">
                <RefreshCw className="h-8 w-8 animate-spin" />
                <p>Generiere Preview...</p>
              </div>
            ) : previewImage ? (
              <img
                src={previewImage}
                alt={`${previewTypeLabel} Preview`}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-gray-500 text-center">
                <p>Kein Preview verfügbar</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 shrink-0 pt-2 border-t">
            <div className="flex gap-2">
              {onRefreshPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing || isLoading}
                  className="px-3 h-8"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Preview aktualisieren
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="px-3 h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              {!isBookLevel && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApplyToPage}
                  disabled={!previewImage || isLoading}
                  className="px-3 h-8"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Apply to Page
                </Button>
              )}
              {isBookLevel && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApplyToBook}
                  disabled={!previewImage || isLoading}
                  className="px-3 h-8"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Apply to Book
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}










