const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const PDFRendererService = require('./pdf-renderer-service');

// Paths to ICC profiles
// Note: Use the 300% TAC variant for ISO Coated v2
const ISO_COATED_V2_ICC_PATH = path.join(__dirname, '../assets/icc-profiles/ISOcoated_v2_300_eci.icc');
const FOGRA39_ICC_PATH = path.join(__dirname, '../assets/icc-profiles/CoatedFOGRA39.icc');

// ICC Profile mapping
const ICC_PROFILES = {
  'iso-coated-v2': {
    name: 'ISO Coated v2 300% ECI',
    path: ISO_COATED_V2_ICC_PATH,
    description: 'Standard für europäischen Offsetdruck'
  },
  'fogra39': {
    name: 'FOGRA 39 (Coated FOGRA39)',
    path: FOGRA39_ICC_PATH,
    description: 'Empfohlen für Prodigi Softcover-Fotobücher'
  }
};

// Load theme data files
// Hinweis: Die JSON-Dateien liegen im gemeinsamen `shared`-Ordner, nicht mehr im Client
const colorPalettesJson = require('../../shared/data/templates/color-palettes.json');
const themesJson = require('../../shared/data/templates/themes.json');

// Load shared constants from shared/rendering/utils/constants.js
const { PAGE_DIMENSIONS, CANVAS_DIMS, PATTERNS } = require('../../shared/utils/constants');

// Note: Shared rendering modules are embedded as browser-compatible code
// They are loaded from shared/rendering/ and converted to browser-compatible format

/**
 * Generates PDF from book data using Puppeteer
 * @param {Object} bookData - Complete book data with pages
 * @param {Object} options - Export options (quality, pageRange, startPage, endPage)
 * @param {number} exportId - Export ID for tracking
 * @param {Function} updateProgress - Callback to update progress (0-100)
 * @returns {Promise<string>} - Path to generated PDF file
 */
async function generatePDFFromBook(bookData, options, exportId, updateProgress) {
  const pdfRendererService = new PDFRendererService();
  try {
    // Initialize PDF renderer service (creates reusable browser instance)
    await pdfRendererService.initialize();

    // Determine which pages to export
    let pagesToExport = bookData.pages || [];
    if (options.pageRange === 'range' && options.startPage && options.endPage) {
      const start = Math.max(1, options.startPage) - 1;
      const end = Math.min(pagesToExport.length, options.endPage);
      pagesToExport = pagesToExport.slice(start, end);
    } else if (options.pageRange === 'current') {
      // Prefer currentPageNumber over currentPageIndex for accuracy
      // This fixes issues when pages are added and array order doesn't match pageNumber
      if (options.currentPageNumber !== undefined) {
        const page = pagesToExport.find(p => p.pageNumber === options.currentPageNumber);
        if (page) {
          pagesToExport = [page];
        } else {
          // Fallback to index if pageNumber not found
          console.warn(`Page with pageNumber ${options.currentPageNumber} not found, falling back to index`);
          if (options.currentPageIndex !== undefined) {
            pagesToExport = [pagesToExport[options.currentPageIndex]];
          }
        }
      } else if (options.currentPageIndex !== undefined) {
        // Legacy support: use index if pageNumber not provided
        pagesToExport = [pagesToExport[options.currentPageIndex]];
      }
    }

    if (pagesToExport.length === 0) {
      throw new Error('No pages to export');
    }

    // Get PDF dimensions
    const dimensions = PAGE_DIMENSIONS[bookData.pageSize] || PAGE_DIMENSIONS.A4;
    const pdfWidth = bookData.orientation === 'landscape' ? dimensions.height : dimensions.width;
    const pdfHeight = bookData.orientation === 'landscape' ? dimensions.width : dimensions.height;

    // Get canvas dimensions
    const canvasDims = CANVAS_DIMS[bookData.pageSize] || CANVAS_DIMS.A4;
    const canvasWidth = bookData.orientation === 'landscape' ? canvasDims.height : canvasDims.width;
    const canvasHeight = bookData.orientation === 'landscape' ? canvasDims.width : canvasDims.height;

    // Create PDF document
    const pdfDoc = await PDFDocument.create();

    // Render each page using PDFRendererService
    for (let i = 0; i < pagesToExport.length; i++) {
      const bookPage = pagesToExport[i];
      
      if (updateProgress) {
        updateProgress(((i + 1) / pagesToExport.length) * 100);
      }

      // Calculate PDF page dimensions in points
      // CRITICAL: pdf-lib addPage expects dimensions in POINTS, not mm!
      // 1 point = 1/72 inch = 0.352778 mm
      const widthPt = pdfWidth / 0.352778;
      const heightPt = pdfHeight / 0.352778;
      
      // Determine target DPI based on quality
      // Canvas is already at 300 DPI, so we render at scale 1.0 and then resize to target DPI
      let targetDpi = 100;
      if (options.quality === 'excellent') {
        targetDpi = 300; // 300 DPI for excellent print quality (use canvas resolution)
      } else if (options.quality === 'printing') {
        // Für druckfähige PDFs auf Druckerei-Niveau ebenfalls 300 DPI verwenden
        targetDpi = 300;
      } else if (options.quality === 'medium') {
        targetDpi = 150; // 150 DPI for medium quality
      } else {
        // preview
        targetDpi = 100; // 100 DPI for preview (increased from 72 DPI for better quality)
      }
      
      // Always render at scale 1.0 (canvas resolution)
      const scale = 1.0;
      
      // Render page with PDFRendererService
      const pageImage = await pdfRendererService.renderPage({
        page: bookPage,
        book: bookData,
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight
      }, {
        scale: scale,
        user: options.user || null,
        token: options.token || null
      });
      
      if (!pageImage || pageImage.length === 0) {
        throw new Error(`Failed to render page ${bookPage.pageNumber}`);
      }
      
      // Get actual rendered image dimensions
      const imageMetadata = await sharp(pageImage).metadata();
      const renderedWidth = imageMetadata.width;
      const renderedHeight = imageMetadata.height;
      
      // Calculate target image dimensions in pixels based on target DPI
      // targetDpi / 72 = pixels per point
      const pixelsPerPoint = targetDpi / 72;
      const targetWidthPx = Math.round(widthPt * pixelsPerPoint);
      const targetHeightPx = Math.round(heightPt * pixelsPerPoint);
      
      // Debug logging
      const iccProfileName = options.iccProfile || 'iso-coated-v2';
      console.log(`[PDF Export] Quality: ${options.quality}, CMYK: ${options.useCMYK || false}, ICC Profile: ${iccProfileName}, Rendered: ${renderedWidth}x${renderedHeight}, Target: ${targetWidthPx}x${targetHeightPx}, PDF Page: ${widthPt.toFixed(2)}x${heightPt.toFixed(2)}pt`);
      
      // Optimize image based on quality setting and CMYK option
      let optimizedImage = pageImage;
      let useJpeg = false;
      
      // Check if CMYK export is requested
      const useCMYK = options.useCMYK === true;
      
      // Determine which ICC profile to use
      let selectedIccProfile = null;
      let iccProfilePath = null;
      let iccProfileExists = false;
      
      if (useCMYK) {
        // Get selected profile or default to ISO Coated v2
        const profileKey = options.iccProfile || 'iso-coated-v2';
        selectedIccProfile = ICC_PROFILES[profileKey];
        
        if (selectedIccProfile) {
          iccProfilePath = selectedIccProfile.path;
          try {
            await fs.access(iccProfilePath);
            iccProfileExists = true;
          } catch (error) {
            console.warn(`[PDF Export] Warning: ICC profile "${selectedIccProfile.name}" not found at ${iccProfilePath}. CMYK export will continue without ICC profile.`);
          }
        } else {
          console.warn(`[PDF Export] Warning: Unknown ICC profile "${profileKey}". Using default ISO Coated v2.`);
          // Fallback to ISO Coated v2
          try {
            await fs.access(ISO_COATED_V2_ICC_PATH);
            iccProfilePath = ISO_COATED_V2_ICC_PATH;
            iccProfileExists = true;
            selectedIccProfile = ICC_PROFILES['iso-coated-v2'];
          } catch (error) {
            console.warn(`[PDF Export] Warning: Default ISO Coated v2 ICC profile not found. CMYK export will continue without ICC profile.`);
          }
        }
      }
      
      if (useCMYK && iccProfileExists && selectedIccProfile) {
        // CMYK export with selected ICC profile
        // PNG mit CMYK ist in vielen Viewern problematisch; nutze JPEG ohne Alpha
        // Verwende 4:2:0 Subsampling und Qualität 88 für bessere Dateigröße bei dennoch hoher Druckqualität
        const jpegQuality = 88;

        optimizedImage = await sharp(pageImage)
          .resize(targetWidthPx, targetHeightPx, {
            fit: 'fill',
            withoutEnlargement: false,
            kernel: 'lanczos3' // Use high-quality resampling to preserve colors
          })
          .flatten({ background: '#ffffff' }) // remove alpha before CMYK JPEG
          .toColorspace('cmyk') // Convert to CMYK color space
          .withMetadata({ icc: iccProfilePath }) // Apply selected ICC profile (use file path, not buffer)
          .jpeg({
            quality: jpegQuality,
            chromaSubsampling: '4:2:0',
            mozjpeg: true
          })
          .toBuffer();
        useJpeg = true;
      } else if (useCMYK && !iccProfileExists) {
        // CMYK export without ICC profile (fallback)
        console.warn(`[PDF Export] CMYK export requested but ICC profile not found. Converting to CMYK without profile.`);
        // Gleiche Einstellungen wie oben: 4:2:0 Subsampling und Qualität 88
        const jpegQuality = 88;

        optimizedImage = await sharp(pageImage)
          .resize(targetWidthPx, targetHeightPx, {
            fit: 'fill',
            withoutEnlargement: false,
            kernel: 'lanczos3'
          })
          .flatten({ background: '#ffffff' }) // remove alpha before CMYK JPEG
          .toColorspace('cmyk') // Convert to CMYK color space without ICC profile
          .jpeg({
            quality: jpegQuality,
            chromaSubsampling: '4:2:0',
            mozjpeg: true
          })
          .toBuffer();
        useJpeg = true;
      } else if (options.quality === 'preview' || options.quality === 'medium') {
        // RGB export for preview/medium quality
        // Verwende JPEG (sRGB) mit moderater Kompression für kleinere Dateigrößen
        const jpegQuality = 88;

        optimizedImage = await sharp(pageImage)
          .gamma(2.15) // leicht angepasste Gamma-Einstellung, wie bisher
          .resize(targetWidthPx, targetHeightPx, {
            fit: 'fill',
            withoutEnlargement: false,
            kernel: 'lanczos3'
          })
          .toColorspace('srgb')
          .modulate({
            saturation: 0.92,
            brightness: 0.97
          })
          .flatten({ background: '#ffffff' }) // entferne Alpha, da JPEG keinen Alphakanal unterstützt
          .jpeg({
            quality: jpegQuality,
            chromaSubsampling: '4:2:0',
            mozjpeg: true
          })
          .toBuffer();
        useJpeg = true;
      } else {
        // RGB export for printing/excellent quality
        // Verwende JPEG (sRGB) mit höherer Qualität für druckfertige PDFs
        const jpegQuality = 92;

        optimizedImage = await sharp(pageImage)
          .gamma(2.15)
          .resize(targetWidthPx, targetHeightPx, {
            fit: 'fill',
            withoutEnlargement: false,
            kernel: 'lanczos3'
          })
          .toColorspace('srgb')
          .modulate({
            saturation: 0.92,
            brightness: 0.97
          })
          .flatten({ background: '#ffffff' })
          .jpeg({
            quality: jpegQuality,
            chromaSubsampling: '4:2:0',
            mozjpeg: true
          })
          .toBuffer();
        useJpeg = true;
      }
      
      // Add page to PDF
      const pdfPage = pdfDoc.addPage([widthPt, heightPt]);
      
      // Convert buffer to Uint8Array for pdf-lib and embed
      const uint8Array = new Uint8Array(optimizedImage);
      const imageEmbed = useJpeg 
        ? await pdfDoc.embedJpg(uint8Array)
        : await pdfDoc.embedPng(uint8Array);
      
      // pdf-lib drawImage scales the image to fit the specified dimensions
      // All images are now resized to appropriate DPI before embedding
      pdfPage.drawImage(imageEmbed, {
        x: 0,
        y: 0,
        width: widthPt,
        height: heightPt,
      });
    }

    // Save PDF to file
    const pdfBytes = await pdfDoc.save();
    const { getUploadsSubdir } = require('../utils/uploads-path');
    const pdfExportsDir = path.join(getUploadsSubdir('pdf-exports'), bookData.id.toString());
    await fs.mkdir(pdfExportsDir, { recursive: true });
    
    const pdfPath = path.join(pdfExportsDir, `${exportId}.pdf`);
    await fs.writeFile(pdfPath, pdfBytes);

    return pdfPath;
  } finally {
    // Cleanup PDF renderer service (closes browser instance)
    await pdfRendererService.cleanup();
  }
}

// NOTE: The server-side Konva fallback and shared-rendering packaging code
// were removed to keep the server-side PDF export strictly using the
// primary Puppeteer/React `PDFRendererService` implementation.
// If you need to restore the fallback temporarily, revert the commit
// that removed `writeSharedRenderingModulesToFiles` and `renderPageWithKonva`.

module.exports = {
  generatePDFFromBook
};

