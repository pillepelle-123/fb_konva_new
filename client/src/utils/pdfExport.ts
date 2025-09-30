import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Book } from '../context/EditorContext';

export interface PDFExportOptions {
  quality: 'preview' | 'medium' | 'printing';
  pageRange: 'all' | 'range';
  startPage?: number;
  endPage?: number;
}

const getQualitySettings = (quality: string) => {
  switch (quality) {
    case 'preview':
      return { scale: 1, quality: 0.7 };
    case 'medium':
      return { scale: 2, quality: 0.85 };
    case 'printing':
      return { scale: 3, quality: 1.0 };
    default:
      return { scale: 2, quality: 0.85 };
  }
};

export const exportBookToPDF = async (
  book: Book,
  options: PDFExportOptions,
  onProgress?: (progress: number) => void
): Promise<void> => {
  const { scale, quality } = getQualitySettings(options.quality);
  
  // Determine which pages to export
  let pagesToExport = book.pages;
  if (options.pageRange === 'range' && options.startPage && options.endPage) {
    const start = Math.max(1, options.startPage) - 1;
    const end = Math.min(book.pages.length, options.endPage);
    pagesToExport = book.pages.slice(start, end);
  }

  // Create PDF with standard dimensions
  const orientation = book.orientation === 'landscape' ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'pt',
    format: book.pageSize.toLowerCase() === 'a4' ? 'a4' : 'letter'
  });

  let isFirstPage = true;

  // Store current page to restore later
  const currentPageIndex = document.querySelector('[data-page-id]')?.getAttribute('data-page-id');
  
  for (let i = 0; i < pagesToExport.length; i++) {
    const page = pagesToExport[i];
    
    // Navigate to the page if it's not currently visible
    const pageIndex = book.pages.findIndex(p => p.id === page.id);
    if (pageIndex !== -1) {
      // Trigger page change event
      const event = new CustomEvent('changePage', { detail: pageIndex });
      window.dispatchEvent(event);
      
      // Wait for page to render
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Find the Konva stage canvas (the actual drawing area)
    const konvaCanvas = document.querySelector('.konvajs-content canvas') as HTMLCanvasElement;
    if (!konvaCanvas) {
      console.warn(`Canvas not found for page ${page.pageNumber}`);
      continue;
    }

    try {
      // Create a new canvas with just the page content
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d')!;
      
      // Set canvas size to match the page dimensions
      tempCanvas.width = konvaCanvas.width;
      tempCanvas.height = konvaCanvas.height;
      
      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw the Konva canvas content
      ctx.drawImage(konvaCanvas, 0, 0);
      
      const imgData = tempCanvas.toDataURL('image/jpeg', quality);
      
      if (!isFirstPage) {
        pdf.addPage();
      }
      
      // Get PDF page dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Fill PDF page exactly
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      isFirstPage = false;
      
      // Update progress
      if (onProgress) {
        onProgress(((i + 1) / pagesToExport.length) * 100);
      }
    } catch (error) {
      console.error(`Error capturing page ${page.pageNumber}:`, error);
    }
  }

  // Save the PDF
  const fileName = `${book.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
  pdf.save(fileName);
};