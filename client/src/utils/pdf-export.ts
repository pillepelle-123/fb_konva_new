import Konva from 'konva';
import { PDFDocument } from 'pdf-lib';
import type { Book, PageBackground } from '../context/editor-context';
import { PAGE_DIMENSIONS, CANVAS_DIMS, PATTERNS, createPatternTile } from './shared-rendering';

// Function to convert image URLs to base64 data URLs to avoid CORS issues
async function convertImagesToBase64(layer: Konva.Layer): Promise<void> {
  const imageNodes = layer.find<Konva.Image>('Image');

  const conversionPromises = imageNodes.map(async (imageNode) => {
    const imageElement = imageNode.image();
    if (imageElement && imageElement.src && !imageElement.src.startsWith('data:')) {
      try {
        let imageUrl = imageElement.src;

        // Check if this is already a proxy URL, extract the original URL
        let originalUrl = imageUrl;
        if (imageUrl.includes('/images/proxy?url=')) {
          try {
            const urlObj = new URL(imageUrl);
            const encodedUrl = urlObj.searchParams.get('url');
            if (encodedUrl) {
              originalUrl = decodeURIComponent(encodedUrl);
            }
          } catch (error) {
            console.warn('Failed to parse proxy URL:', error);
          }
        }

        // Check if this is an S3 URL that needs proxy
        const isS3Url = originalUrl.includes('s3.amazonaws.com') || originalUrl.includes('s3.us-east-1.amazonaws.com');

        // For S3 URLs, use the proxy endpoint to avoid CORS issues
        if (isS3Url) {
          // Get token from localStorage
          const token = localStorage.getItem('token') || '';
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          imageUrl = `${apiUrl}/images/proxy?url=${encodeURIComponent(originalUrl)}&token=${encodeURIComponent(token)}`;
        }

        // Fetch the image as blob and convert to base64
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        // Convert blob to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        // Create new image from base64
        const base64Image = new window.Image();
        base64Image.src = base64Data;

        await new Promise<void>((resolve, reject) => {
          base64Image.onload = () => {
            imageNode.image(base64Image);
            resolve();
          };
          base64Image.onerror = reject;
        });
      } catch (error) {
        console.warn('Failed to convert image to base64:', error);
        // Continue with original image if conversion fails
      }
    }
  });

  await Promise.all(conversionPromises);
}

export interface PDFExportOptions {
  quality: 'preview' | 'medium' | 'printing' | 'excellent';
  pageRange: 'all' | 'range' | 'current';
  startPage?: number;
  endPage?: number;
  currentPageIndex?: number;
  useCMYK?: boolean; // Optional: Export in CMYK for printing
  iccProfile?: 'iso-coated-v2' | 'fogra39'; // Optional: ICC profile to use (only when useCMYK is true)
}

export const exportBookToPDF = async (
  book: Book,
  options: PDFExportOptions,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
  userRole?: 'author' | 'publisher' | null
): Promise<void> => {
  window.dispatchEvent(new CustomEvent('setBackgroundQuality', { detail: { mode: 'full' } }));
  await new Promise((resolve) => setTimeout(resolve, 100));
  try {
    // Restrict printing quality for authors
    if (userRole === 'author' && options.quality === 'printing') {
      throw new Error('Authors cannot export in printing quality');
    }
    
    // Determine which pages to export
    let pagesToExport = book.pages;
    if (options.pageRange === 'range' && options.startPage && options.endPage) {
      const start = Math.max(1, options.startPage) - 1;
      const end = Math.min(book.pages.length, options.endPage);
      pagesToExport = book.pages.slice(start, end);
    } else if (options.pageRange === 'current' && options.currentPageIndex !== undefined) {
      pagesToExport = [book.pages[options.currentPageIndex]];
    }

    // Get PDF dimensions in mm
    const dimensions = PAGE_DIMENSIONS[book.pageSize as keyof typeof PAGE_DIMENSIONS] || PAGE_DIMENSIONS.A4;
    const pdfWidth = book.orientation === 'landscape' ? dimensions.height : dimensions.width;
    const pdfHeight = book.orientation === 'landscape' ? dimensions.width : dimensions.height;
    
    // Convert mm to points for pdf-lib (1 point = 0.352778 mm)
    const widthPt = pdfWidth / 0.352778;
    const heightPt = pdfHeight / 0.352778;
    
    // Create PDF document with pdf-lib (same as server-side)
    const pdfDoc = await PDFDocument.create();
    
    // Set metadata
    pdfDoc.setTitle(book.name);
    pdfDoc.setSubject(`PDF Export - ${book.name}`);
    pdfDoc.setCreator('FB Konva Editor');
    pdfDoc.setProducer('FB Konva Editor');
    
    // Get canvas dimensions
    const canvasDims = CANVAS_DIMS[book.pageSize as keyof typeof CANVAS_DIMS] || CANVAS_DIMS.A4;
    const canvasWidth = book.orientation === 'landscape' ? canvasDims.height : canvasDims.width;
    const canvasHeight = book.orientation === 'landscape' ? canvasDims.width : canvasDims.height;

    console.log(`PDF Export: Creating PDF with dimensions ${pdfWidth} x ${pdfHeight} mm (${widthPt.toFixed(2)} x ${heightPt.toFixed(2)} pt)`);

    for (let i = 0; i < pagesToExport.length; i++) {
      if (signal?.aborted) {
        throw new DOMException('Export cancelled', 'AbortError');
      }
      
      const bookPage = pagesToExport[i];
      
      // Navigate to the page
      const pageIndex = book.pages.findIndex((p) => String(p.id) === String(bookPage.id));
      if (pageIndex !== -1) {
        const event = new CustomEvent('changePage', { detail: pageIndex });
        window.dispatchEvent(event);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Get the stage from window reference
      const stage = (window as Window & { konvaStage?: Konva.Stage }).konvaStage;
      if (!stage) {
        console.error('Konva stage not found');
        return;
      }

      // Create a temporary stage for PDF export with exact page dimensions
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.top = '-9999px';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);

      const tempStage = new Konva.Stage({
        container: tempContainer,
        width: canvasWidth,
        height: canvasHeight
      });

      // Clone the main layer to the temporary stage
      const mainLayer = stage.getLayers()[0];
      if (mainLayer) {
        const clonedLayer = mainLayer.clone();

        // Detect page offsets using the CanvasPageEditArea rectangle
        let pageRect = clonedLayer.findOne('#canvas-page-edit-area') as Konva.Rect | null;
        const allRects = clonedLayer.find<Konva.Rect>('Rect');
        if (!pageRect) {
          pageRect = allRects.find((rectNode: Konva.Rect) => {
            return (
              !rectNode.id() &&
              rectNode.stroke() === '#e5e7eb' &&
              rectNode.strokeWidth() === 11
            );
          }) ?? null;
        }

        let pageOffsetX = 0;
        let pageOffsetY = 0;
        let pageContentWidth: number = canvasWidth;
        let pageContentHeight: number = canvasHeight;

        if (pageRect) {
          pageOffsetX = pageRect.x();
          pageOffsetY = pageRect.y();
          pageContentWidth = pageRect.width();
          pageContentHeight = pageRect.height();
          pageRect.destroy();
        }

        // Remove elements with no-print name
        const noPrintElements = clonedLayer.find('.no-print');
        noPrintElements.forEach((element: Konva.Node) => element.destroy());

        const placeholderGroups = clonedLayer.find('.placeholder-element');
        placeholderGroups.forEach((node: Konva.Node) => node.destroy());

        // Resize export stage to actual page dimensions and shift layer so page starts at (0,0)
        tempStage.size({ width: pageContentWidth, height: pageContentHeight });
        clonedLayer.position({
          x: -pageOffsetX,
          y: -pageOffsetY
        });
        tempStage.add(clonedLayer);
        
        // Fix pattern fills for PDF export - pattern fills don't clone correctly
        // Check if current page has pattern background
        const currentPage = bookPage;
        if (currentPage?.background?.type === 'pattern') {
          const background = currentPage.background as PageBackground;
          const pattern = PATTERNS.find(p => p.id === background.value);
          
          if (pattern) {
            // Find all Rects with fillPatternImage (pattern backgrounds)
            const patternRects = clonedLayer.find<Konva.Rect>('Rect').filter((rect: Konva.Rect) => {
              const fillPatternImage = (rect as Konva.Rect & { fillPatternImage?: () => HTMLImageElement | HTMLCanvasElement }).fillPatternImage?.();
              return fillPatternImage && !rect.listening();
            });
            
            patternRects.forEach((rect: Konva.Rect) => {
              // Recreate pattern tile for PDF export
              const patternColor = background.patternBackgroundColor || '#666';
              const patternScale = Math.pow(1.5, (background.patternSize || 1) - 1);
              const patternTile = createPatternTile(pattern, patternColor, patternScale, background.patternStrokeWidth || 1);
              
              // Set the pattern tile on the rect
              (rect as Konva.Rect & { fillPatternImage: (img: HTMLImageElement | HTMLCanvasElement) => void; fillPatternRepeat: (repeat: string) => void }).fillPatternImage(patternTile);
              (rect as Konva.Rect & { fillPatternImage: (img: HTMLImageElement | HTMLCanvasElement) => void; fillPatternRepeat: (repeat: string) => void }).fillPatternRepeat('repeat');
              
              // Ensure rect dimensions match page dimensions exactly
              rect.width(pageContentWidth);
              rect.height(pageContentHeight);
              rect.x(0);
              rect.y(0);
            });
          }
        }
        
        tempStage.draw();

        // Convert all images to base64 to avoid CORS issues with toDataURL()
        await convertImagesToBase64(clonedLayer);

        // Export to data URL
        const dataURL = tempStage.toDataURL({
          mimeType: 'image/png',
          quality: 1.0,
          pixelRatio: 1
        });

        // Convert data URL to Uint8Array for pdf-lib
        const response = await fetch(dataURL);
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Embed PNG image in PDF
        const imageEmbed = await pdfDoc.embedPng(uint8Array);

        // Add page with correct dimensions (in points)
        const pdfPage = pdfDoc.addPage([widthPt, heightPt]);

        // Draw image to fill the entire page
        pdfPage.drawImage(imageEmbed, {
          x: 0,
          y: 0,
          width: widthPt,
          height: heightPt,
        });

        // Clean up temporary stage
        tempStage.destroy();
        document.body.removeChild(tempContainer);
      } else {
        // If no main layer found, skip this page
        console.warn('No main layer found for page, skipping PDF export for this page');
        continue;
      }
      
      if (onProgress) {
        onProgress(((i + 1) / pagesToExport.length) * 100);
      }
    }
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${book.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } finally {
    window.dispatchEvent(new CustomEvent('setBackgroundQuality', { detail: { mode: 'preview' } }));
  }
};
