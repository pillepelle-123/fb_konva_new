import { useState, useCallback } from 'react';

/**
 * Hook zum Exportieren des Canvas als Preview-Bild
 * Nutzt einen Event-Mechanismus, um mit dem Canvas zu kommunizieren
 * @param previewData - Optional: Preview-Daten (Elements + Background) für temporäres Stage
 */
export function useCanvasExport(previewData?: {
  elements: any[];
  background: any;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const [isExporting, setIsExporting] = useState(false);

  const exportCanvas = useCallback(async (): Promise<string | null> => {
    setIsExporting(true);
    try {
      return new Promise<string | null>((resolve) => {
        // Dispatch Event, um Canvas zum Exportieren aufzufordern
        const event = new CustomEvent('exportCanvasForPreview', {
          detail: {
            callback: (dataURL: string | null) => {
              setIsExporting(false);
              resolve(dataURL);
            },
            previewData // Übergebe Preview-Daten, falls vorhanden
          }
        });
        window.dispatchEvent(event);

        // Timeout fallback
        setTimeout(() => {
          setIsExporting(false);
          resolve(null);
        }, 5000);
      });
    } catch (error) {
      console.error('Error exporting canvas:', error);
      setIsExporting(false);
      return null;
    }
  }, [previewData]);

  return { exportCanvas, isExporting };
}

