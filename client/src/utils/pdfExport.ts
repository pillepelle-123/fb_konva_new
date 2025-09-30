import jsPDF from 'jspdf';
import Konva from 'konva';
import type { Book } from '../context/EditorContext';

export interface PDFExportOptions {
  quality: 'preview' | 'medium' | 'printing';
  pageRange: 'all' | 'range';
  startPage?: number;
  endPage?: number;
}

const PAGE_DIMENSIONS = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
  Square: { width: 210, height: 210 }
};

export const exportBookToPDF = async (
  book: Book,
  options: PDFExportOptions,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<void> => {
  // Determine which pages to export
  let pagesToExport = book.pages;
  if (options.pageRange === 'range' && options.startPage && options.endPage) {
    const start = Math.max(1, options.startPage) - 1;
    const end = Math.min(book.pages.length, options.endPage);
    pagesToExport = book.pages.slice(start, end);
  }

  // Get PDF dimensions
  const dimensions = PAGE_DIMENSIONS[book.pageSize as keyof typeof PAGE_DIMENSIONS] || PAGE_DIMENSIONS.A4;
  const pdfWidth = book.orientation === 'landscape' ? dimensions.height : dimensions.width;
  const pdfHeight = book.orientation === 'landscape' ? dimensions.width : dimensions.height;
  
  // Fix TypeScript error by using proper jsPDF constructor
  const pdf = new jsPDF({
    orientation: (book.orientation === 'portrait' ? 'portrait' : 'landscape') as 'portrait' | 'landscape',
    unit: 'mm',
    format: [pdfWidth, pdfHeight],
    compress: true
  } as any);

  for (let i = 0; i < pagesToExport.length; i++) {
    if (signal?.aborted) {
      throw new DOMException('Export cancelled', 'AbortError');
    }
    
    const bookPage = pagesToExport[i];
    
    // Navigate to the page
    const pageIndex = book.pages.findIndex(p => p.id === bookPage.id);
    if (pageIndex !== -1) {
      const event = new CustomEvent('changePage', { detail: pageIndex });
      window.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Get the stage from window reference
    const stage = (window as any).konvaStage;
    if (!stage) {
      console.error('Konva stage not found');
      return;
    }

    // Create a temporary stage for PDF export with exact page dimensions
    const CANVAS_DIMS = {
      A4: { width: 2480, height: 3508 },
      A5: { width: 1748, height: 2480 },
      A3: { width: 3508, height: 4961 },
      Letter: { width: 2550, height: 3300 },
      Square: { width: 2480, height: 2480 }
    };
    
    const canvasDims = CANVAS_DIMS[book.pageSize as keyof typeof CANVAS_DIMS] || CANVAS_DIMS.A4;
    const canvasWidth = book.orientation === 'landscape' ? canvasDims.height : canvasDims.width;
    const canvasHeight = book.orientation === 'landscape' ? canvasDims.width : canvasDims.height;

    // Create temporary container
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    // Create temporary stage with exact page dimensions
    const tempStage = new Konva.Stage({
      container: tempContainer,
      width: canvasWidth,
      height: canvasHeight
    });

    // Clone the main layer to the temporary stage
    const mainLayer = stage.getLayers()[0];
    if (mainLayer) {
      const clonedLayer = mainLayer.clone();
      
      // Remove the page border (CanvasPageEditArea) from export
      const pageRect = clonedLayer.findOne('Rect');
      if (pageRect && !pageRect.id()) {
        pageRect.destroy();
      }
      
      tempStage.add(clonedLayer);
      
      // Find the page content group and adjust positioning
      const pageGroup = clonedLayer.findOne('Group');
      if (pageGroup) {
        pageGroup.x(0);
        pageGroup.y(0);
      }
      
      tempStage.draw();
    }

    // Export to data URL
    const dataURL = tempStage.toDataURL({
      mimeType: 'image/png',
      quality: 1.0,
      pixelRatio: options.quality === 'printing' ? 1.5 : options.quality === 'medium' ? 1 : 0.8
    });

    // Add page to PDF (add new page for subsequent pages)
    if (i > 0) {
      pdf.addPage([pdfWidth, pdfHeight], (book.orientation === 'portrait' ? 'portrait' : 'landscape') as 'portrait' | 'landscape');
    }

    // Add image to PDF
    pdf.addImage(dataURL, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Clean up temporary stage
    tempStage.destroy();
    document.body.removeChild(tempContainer);
    
    if (onProgress) {
      onProgress(((i + 1) / pagesToExport.length) * 100);
    }
  }
  
  // Save PDF
  pdf.save(`${book.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
};