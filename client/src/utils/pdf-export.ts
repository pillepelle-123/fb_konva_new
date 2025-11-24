import jsPDF from 'jspdf';
import Konva from 'konva';
import type { Book } from '../context/EditorContext';
import { PATTERNS } from '../utils/patterns';
import type { PageBackground } from '../context/editor-context';

export interface PDFExportOptions {
  quality: 'preview' | 'medium' | 'printing';
  pageRange: 'all' | 'range' | 'current';
  startPage?: number;
  endPage?: number;
  currentPageIndex?: number;
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

      // Detect page offsets using the CanvasPageEditArea rectangle
      let pageRect = clonedLayer.findOne('#canvas-page-edit-area') as Konva.Rect | null;
      const allRects = clonedLayer.find<Konva.Rect>('Rect');
      if (!pageRect) {
        pageRect = allRects.find((rectNode) => {
          return (
            !rectNode.id() &&
            rectNode.stroke() === '#e5e7eb' &&
            rectNode.strokeWidth() === 11
          );
        }) ?? null;
      }

      let pageOffsetX = 0;
      let pageOffsetY = 0;
      let pageContentWidth = canvasWidth;
      let pageContentHeight = canvasHeight;

      if (pageRect) {
        pageOffsetX = pageRect.x();
        pageOffsetY = pageRect.y();
        pageContentWidth = pageRect.width();
        pageContentHeight = pageRect.height();
        pageRect.destroy();
      }

      // Remove elements with no-print name
      const noPrintElements = clonedLayer.find('.no-print');
      noPrintElements.forEach(element => element.destroy());

      const placeholderGroups = clonedLayer.find('.placeholder-element');
      placeholderGroups.forEach(node => node.destroy());

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
          const patternRects = clonedLayer.find('Rect').filter(rect => {
            const fillPatternImage = (rect as any).fillPatternImage();
            return fillPatternImage && !rect.listening();
          });
          
          patternRects.forEach(rect => {
            // Recreate pattern tile for PDF export
            const patternColor = background.patternBackgroundColor || '#666';
            const patternScale = Math.pow(1.5, (background.patternSize || 1) - 1);
            const patternTile = createPatternTile(pattern, patternColor, patternScale, background.patternStrokeWidth || 1);
            
            // Set the pattern tile on the rect
            (rect as any).fillPatternImage(patternTile);
            (rect as any).fillPatternRepeat('repeat');
            
            // Ensure rect dimensions match page dimensions exactly
            rect.width(pageContentWidth);
            rect.height(pageContentHeight);
            rect.x(0);
            rect.y(0);
          });
        }
      }
      
      // Calculate stroke width compensation so exported PDF matches on-screen appearance.
      // jsPDF scales the rendered PNG to fit the PDF width, which thins strokes.
      // Compensation factor = stageWidthPx / pdfWidthPx, where pdfWidthPx = pdfWidth(mm) * scaleFactor.
      const pdfScaleFactor = (pdf as any)?.internal?.scaleFactor ?? 1;
      const pdfWidthPx = pdfWidth * pdfScaleFactor;
      const strokeScaleCompensation = pdfWidthPx > 0 ? pageContentWidth / pdfWidthPx : 1;
      
      if (strokeScaleCompensation !== 1) {
        // Find all elements recursively to ensure we catch nested elements
        const allElements = tempStage.find('Path, Line, Rect, Circle, Ellipse, Ring, Arc, RegularPolygon, Star, Shape') as Konva.Shape[];
        console.log(`[PDF Export] Found ${allElements.length} elements with stroke, compensation factor: ${strokeScaleCompensation}`);
        
        // Count elements by type for debugging
        const elementCounts: Record<string, number> = {};
        allElements.forEach(el => {
          const type = el.getClassName();
          elementCounts[type] = (elementCounts[type] || 0) + 1;
        });
        console.log(`[PDF Export] Element counts by type:`, elementCounts);
        allElements.forEach((element, index) => {
          const className = element.getClassName();
          const currentStrokeWidth = element.strokeWidth();
          
          // Log ALL Path elements to see what we're missing
          if (className === 'Path') {
            console.log(`[PDF Export] Path element ${index}: strokeWidth=${currentStrokeWidth}, strokeScaleEnabled=${element.strokeScaleEnabled ? element.strokeScaleEnabled() : 'N/A'}`);
          }
          
          if (currentStrokeWidth) {
            const originalStrokeWidth = currentStrokeWidth;
            
            // Check if this is a ruled line
            // Ruled lines are Path elements with:
            // - strokeScaleEnabled=true (they scale with zoom)
            // - strokeWidth <= 1.5 (very thin lines)
            // - horizontal line pattern (M x y L x2 y with same Y)
            // - in Groups that contain Text elements (qna_inline textboxes)
            let isRuledLine = false;
            
            if (className === 'Path') {
              const pathElement = element as Konva.Path;
              const hasStrokeScaleEnabled = element.strokeScaleEnabled ? element.strokeScaleEnabled() : false;
              
              // Ruled lines have strokeScaleEnabled=true and very small strokeWidth
              // Shapes/Lines have strokeScaleEnabled=false and larger strokeWidth
              if (hasStrokeScaleEnabled && originalStrokeWidth <= 1.5) {
                const data = pathElement.data();
                
                // Check if this is a horizontal line (ruled line pattern: M x y L x2 y)
                // Ruled lines have the pattern where start and end Y coordinates are the same
                if (typeof data === 'string' && data.includes('M') && data.includes('L')) {
                  const match = data.match(/M\s+([\d.]+)\s+([\d.]+)\s+L\s+([\d.]+)\s+([\d.]+)/);
                  if (match) {
                    const startY = parseFloat(match[2]);
                    const endY = parseFloat(match[4]);
                    // If Y coordinates are the same (or very close), it's a horizontal line (ruled line)
                    if (Math.abs(startY - endY) < 0.1) {
                      isRuledLine = true;
                    }
                  }
                }
                
                // Also check parent structure: ruled lines are in Groups that contain Text elements
                if (!isRuledLine) {
                  const parent = element.getParent();
                  // Check if any ancestor group contains Text elements (qna_inline structure)
                  let currentParent: any = parent;
                  while (currentParent) {
                    if (currentParent.findOne && currentParent.findOne('Text')) {
                      isRuledLine = true;
                      break;
                    }
                    currentParent = currentParent.getParent();
                  }
                }
              }
            }
            
            // Don't scale ruled lines, but log them for debugging
            if (isRuledLine) {
              if (className === 'Path') {
                console.log(`[PDF Export] Ruled line skipped: Path element ${index}, strokeWidth=${originalStrokeWidth.toFixed(2)}`);
              }
              return;
            }
            
            // Check element type to determine compensation
            const isRect = className === 'Rect';
            const isPath = className === 'Path';
            
            // Check if this is a QNA border by checking parent structure
            // QNA borders are Rect or Path elements that are direct children of Groups containing Text elements
            let isQNABorder = false;
            if (isRect || isPath) {
              const parent = element.getParent();
              if (parent) {
                // Check if parent or grandparent contains Text elements (qna_inline structure)
                let currentParent: Konva.Node | null = parent;
                while (currentParent) {
                  const konvaParent = currentParent as Konva.Group;
                  if (konvaParent.findOne && konvaParent.findOne('Text')) {
                    // Check if this element is a border (Rect with transparent fill or Path with stroke)
                    if (isRect) {
                      const rect = element as Konva.Rect;
                      const fill = rect.fill();
                      if (fill === 'transparent' || fill === '') {
                        isQNABorder = true;
                        break;
                      }
                    } else if (isPath) {
                      const path = element as Konva.Path;
                      const fill = path.fill();
                      if ((fill === 'transparent' || fill === '') && path.stroke()) {
                        isQNABorder = true;
                        break;
                      }
                    }
                  }
                  currentParent = currentParent.getParent();
                }
              }
            }
            
            // Also check if element has strokeScaleEnabled
            const hasStrokeScaleEnabled = element.strokeScaleEnabled ? element.strokeScaleEnabled() : false;
            
            // ALL elements need to be INCREASED for PDF, but with different factors
            // The issue is that PDF scaling makes everything thinner, regardless of strokeScaleEnabled
            // IMPORTANT: Shapes and Lines are rendered as Path elements with strokeScaleEnabled={false}
            // Strategy: All elements with strokeScaleEnabled={false} (except QNA borders) get high compensation
            let newStrokeWidth = currentStrokeWidth;
            let compensationType = 'none';
            
            if (isQNABorder) {
              // QNA borders: They already scale with zoom, so they need minimal or even reduced compensation
              // Use a smaller factor (0.3) to keep them from being too thick (user-adjusted value)
              const qnaCompensation = strokeScaleCompensation * 0.24;
              newStrokeWidth = currentStrokeWidth * qnaCompensation;
              compensationType = 'QNA';
            } else if (!hasStrokeScaleEnabled) {
              // All elements WITHOUT strokeScaleEnabled (Shapes, Lines, etc.): Use same thickness as QNA borders
              // This includes: Path elements (shapes/lines), Line elements, Rect elements (shape rectangles)
              // Set to 0.3 to match QNA border thickness in PDF export (only affects PDF, not canvas)
              const enhancedCompensation = strokeScaleCompensation * 0.24;
              newStrokeWidth = currentStrokeWidth * enhancedCompensation;
              compensationType = 'no-scale';
            } else {
              // Elements WITH strokeScaleEnabled={true} that are not QNA borders: Use same thickness as QNA borders
              // Set to 0.3 to match QNA border thickness in PDF export (only affects PDF, not canvas)
              const standardCompensation = strokeScaleCompensation * 0.24;
              newStrokeWidth = currentStrokeWidth * standardCompensation;
              compensationType = 'with-scale';
            }
            
            // Apply the new stroke width
            element.strokeWidth(newStrokeWidth);
            
            // Verify the stroke width was actually set
            const verifyStrokeWidth = element.strokeWidth();
            
            // Debug logging for ALL elements - we need to find the missing shapes/lines
            // Log all elements to see what we're actually finding
            if (index < 30 || originalStrokeWidth > 15 || className === 'Path' || (className === 'Rect' && !isQNABorder)) {
              console.log(`[PDF Export] Element ${index}: ${className}, strokeScaleEnabled=${hasStrokeScaleEnabled}, isQNABorder=${isQNABorder}, original=${originalStrokeWidth.toFixed(2)}, new=${newStrokeWidth.toFixed(2)}, verified=${verifyStrokeWidth.toFixed(2)}, type=${compensationType}`);
            }
          }
        });
      }
      
      tempStage.draw();
    }

    // Export to data URL without pixelRatio since stroke widths are already scaled
    const dataURL = tempStage.toDataURL({
      mimeType: 'image/png',
      quality: 1.0,
      pixelRatio: 1
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
  } finally {
    window.dispatchEvent(new CustomEvent('setBackgroundQuality', { detail: { mode: 'preview' } }));
  }
};

// Helper function to create pattern tile (same as in canvas.tsx)
const createPatternTile = (pattern: any, color: string, size: number, strokeWidth: number = 1): HTMLCanvasElement => {
  const tileSize = 20 * size;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  
  if (pattern.id === 'dots') {
    ctx.beginPath();
    ctx.arc(tileSize/2, tileSize/2, tileSize * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (pattern.id === 'grid') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tileSize, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, tileSize);
    ctx.stroke();
  } else if (pattern.id === 'diagonal') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, tileSize);
    ctx.lineTo(tileSize, 0);
    ctx.stroke();
  } else if (pattern.id === 'cross') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(0, tileSize);
    ctx.lineTo(tileSize, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(tileSize, tileSize);
    ctx.stroke();
  } else if (pattern.id === 'waves') {
    ctx.lineWidth = strokeWidth * 2;
    ctx.beginPath();
    ctx.moveTo(0, tileSize/2);
    ctx.quadraticCurveTo(tileSize/4, 0, tileSize/2, tileSize/2);
    ctx.quadraticCurveTo(3*tileSize/4, tileSize, tileSize, tileSize/2);
    ctx.stroke();
  } else if (pattern.id === 'hexagon') {
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    const centerX = tileSize/2;
    const centerY = tileSize/2;
    const radius = tileSize * 0.3;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  
  return canvas;
};