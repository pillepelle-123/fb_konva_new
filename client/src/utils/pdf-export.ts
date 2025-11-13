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
      
      // Remove the page border (CanvasPageEditArea) from export
      const pageRect = clonedLayer.findOne('Rect');
      if (pageRect && !pageRect.id()) {
        pageRect.destroy();
      }
      
      // Remove elements with no-print name
      const noPrintElements = clonedLayer.find('.no-print');
      noPrintElements.forEach(element => element.destroy());
      
      tempStage.add(clonedLayer);
      
      // Adjust background elements positioning for PDF export FIRST
      // This must be done before finding the page content group
      const backgroundRects = clonedLayer.find('Rect').filter(rect => !rect.listening());
      backgroundRects.forEach(rect => {
        rect.x(0);
        rect.y(0);
      });
      
      // Also adjust background Groups (pattern backgrounds are in a Group)
      const backgroundGroups = clonedLayer.find('Group').filter((group: any) => {
        const children = group.getChildren();
        // Background groups typically contain only Rects with listening={false}
        const hasOnlyBackgroundRects = children.length > 0 && 
          children.every((child: any) => 
            child.getClassName() === 'Rect' && !child.listening()
          );
        return hasOnlyBackgroundRects;
      });
      
      backgroundGroups.forEach((group: any) => {
        group.x(0);
        group.y(0);
        // Also ensure all child Rects are at (0,0)
        const childRects = group.find('Rect');
        childRects.forEach((rect: any) => {
          rect.x(0);
          rect.y(0);
        });
      });
      
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
            
            // Ensure rect dimensions match canvas dimensions exactly
            rect.width(canvasWidth);
            rect.height(canvasHeight);
            rect.x(0);
            rect.y(0);
          });
        }
      }
      
      // Find the page content group (the one containing elements, not background)
      // Background groups typically have listening={false} or contain only Rects
      // The elements group is the one that contains multiple child Groups (one per element)
      const allGroups = clonedLayer.find('Group');
      let pageGroup: Konva.Group | null = null;
      
      // Find the group that contains element groups (has many child Groups)
      // This is the elements container group, not the background group
      for (let i = 0; i < allGroups.length; i++) {
        const group = allGroups[i] as Konva.Group;
        const children = group.getChildren();
        // The elements group typically has many child Groups (one per element)
        // Background groups typically have only Rects or fewer children
        const hasManyChildGroups = children.filter((child: any) => child.getClassName() === 'Group').length > 1;
        const hasTextOrPathChildren = children.some((child: any) => 
          child.getClassName() === 'Text' || 
          child.getClassName() === 'Path' ||
          (child.getClassName() === 'Group' && child.getChildren().some((grandchild: any) => 
            grandchild.getClassName() === 'Text' || grandchild.getClassName() === 'Path'
          ))
        );
        
        // The elements group is the one with many child Groups or Text/Path children
        if (hasManyChildGroups || hasTextOrPathChildren) {
          pageGroup = group;
          break;
        }
      }
      
      // Fallback: if no group found with the above criteria, use the last Group
      // (background groups are typically rendered first, elements group last)
      if (!pageGroup && allGroups.length > 0) {
        pageGroup = allGroups[allGroups.length - 1] as Konva.Group;
      }
      
      // Adjust the page content group positioning
      if (pageGroup) {
        // Get the original offset (should be pageOffsetX/pageOffsetY from canvas)
        const originalX = pageGroup.x();
        const originalY = pageGroup.y();
        
        // Reset to 0,0 for PDF export
        pageGroup.x(0);
        pageGroup.y(0);
      }
      
      // Increase stroke widths to compensate for PDF thinning - do this after adding to stage
      const allElements = tempStage.find('Path, Line, Rect, Circle, Ellipse, Ring, Arc, RegularPolygon, Star, Shape');
      allElements.forEach(element => {
        const currentStrokeWidth = element.strokeWidth();
        if (currentStrokeWidth) {
          // Check if this is a ruled line
          // Ruled lines are Path elements with listening={false} that are horizontal lines
          // They are typically part of a Group that contains Text elements (qna_inline textboxes)
          let isRuledLine = false;
          
          if (element.getClassName() === 'Path') {
            const pathElement = element as Konva.Path;
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
              const grandParent = parent?.getParent();
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
          
          // Scale all elements except ruled lines
          if (!isRuledLine) {
            element.strokeWidth(currentStrokeWidth * 3.5);
          }
        }
      });
      
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