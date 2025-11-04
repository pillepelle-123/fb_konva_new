import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/overlays/dialog';
import { Button } from '../../../ui/primitives/button';
import { Check, X, RefreshCw } from 'lucide-react';
import Konva from 'konva';
import { exportCanvasAsImage } from '../../../../utils/canvas-export';

interface CanvasPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToPage: () => void;
  onApplyToBook: () => void;
  previewType: 'layout' | 'theme' | 'palette';
  isBookLevel?: boolean;
}

export function CanvasPreviewDialog({
  isOpen,
  onClose,
  onApplyToPage,
  onApplyToBook,
  previewType,
  isBookLevel = false
}: CanvasPreviewDialogProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Export canvas when dialog opens
  useEffect(() => {
    if (isOpen) {
      exportCanvas();
    } else {
      // Cleanup: Clear preview when dialog closes
      setPreviewImage(null);
      setError(null);
    }
  }, [isOpen]);

  const exportCanvas = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get stage from window (set by Canvas component)
      const stage = (window as any).konvaStage as Konva.Stage | null;
      
      if (!stage) {
        setError('Canvas nicht gefunden. Bitte versuche es erneut.');
        setIsLoading(false);
        return;
      }

      // Export with reduced resolution (25%) and JPEG quality (75%)
      // This gives us ~600KB instead of ~7MB for a full A4 page
      const dataURL = await exportCanvasAsImage(stage, 0.25, 0.75);
      
      if (dataURL) {
        setPreviewImage(dataURL);
      } else {
        setError('Export fehlgeschlagen. Bitte versuche es erneut.');
      }
    } catch (err) {
      console.error('Error exporting canvas preview:', err);
      setError('Fehler beim Exportieren des Previews.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    exportCanvas();
  };

  const handleApplyToPage = () => {
    onApplyToPage();
    onClose();
  };

  const handleApplyToBook = () => {
    onApplyToBook();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Preview: {previewType === 'layout' ? 'Layout' : previewType === 'theme' ? 'Theme' : 'Farbschema'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {/* Preview Image */}
          <div className="flex-1 min-h-0 bg-gray-50 rounded-lg border border-gray-200 overflow-auto flex items-center justify-center p-4">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2 text-gray-500">
                <RefreshCw className="h-8 w-8 animate-spin" />
                <p className="text-sm">Preview wird generiert...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 text-red-500">
                <p className="text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Erneut versuchen
                </Button>
              </div>
            ) : previewImage ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={previewImage}
                  alt="Canvas Preview"
                  className="max-w-full max-h-[60vh] object-contain shadow-lg rounded"
                  style={{ imageRendering: 'auto' }}
                />
                <p className="text-xs text-gray-500">
                  Preview - Qualität und Auflösung reduziert für bessere Performance
                </p>
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 shrink-0">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Preview aktualisieren"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-1" />
                Abbrechen
              </Button>
              {!isBookLevel && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApplyToPage}
                  disabled={isLoading || !previewImage}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Auf Seite anwenden
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={isBookLevel ? handleApplyToBook : handleApplyToPage}
                disabled={isLoading || !previewImage}
              >
                <Check className="h-4 w-4 mr-1" />
                {isBookLevel ? 'Auf Buch anwenden' : 'Auf Seite anwenden'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

