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
const colorPalettesJson = require('../../client/src/data/templates/color-palettes.json');
const themesJson = require('../../client/src/data/templates/themes.json');

// Load shared constants from shared/rendering/utils/constants.js
const { PAGE_DIMENSIONS, CANVAS_DIMS, PATTERNS } = require('../../shared/rendering/utils/constants');

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
    } else if (options.pageRange === 'current' && options.currentPageIndex !== undefined) {
      pagesToExport = [pagesToExport[options.currentPageIndex]];
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
        const jpegQuality = options.quality === 'preview' || options.quality === 'medium' ? 88 : 92;

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
            chromaSubsampling: '4:4:4',
            mozjpeg: true
          })
          .toBuffer();
        useJpeg = true;
      } else if (useCMYK && !iccProfileExists) {
        // CMYK export without ICC profile (fallback)
        console.warn(`[PDF Export] CMYK export requested but ICC profile not found. Converting to CMYK without profile.`);
        const jpegQuality = options.quality === 'preview' || options.quality === 'medium' ? 88 : 92;

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
            chromaSubsampling: '4:4:4',
            mozjpeg: true
          })
          .toBuffer();
        useJpeg = true;
      } else if (options.quality === 'preview' || options.quality === 'medium') {
        // CRITICAL FIX: Use PNG instead of JPEG for preview/medium to prevent color shifts
        // JPEG compression causes color shifts, especially with background images
        // PNG preserves colors accurately, and we can still compress it
        // The file size difference is acceptable for better color accuracy
        // Remove color profiles and ensure sRGB to match browser rendering (without removing alpha for transparency)
        // Apply gamma correction and saturation reduction to match browser rendering
        optimizedImage = await sharp(pageImage)
          .gamma(2.15) // Slightly lower gamma (from 2.2 to 2.15) to reduce red tendency and match browser rendering
          .resize(targetWidthPx, targetHeightPx, {
            fit: 'fill',
            withoutEnlargement: false,
            kernel: 'lanczos3' // Use high-quality resampling to preserve colors
          })
          .toColorspace('srgb') // Explicitly set sRGB color space to match browser rendering (removes custom ICC profiles)
          .modulate({
            saturation: 0.92, // Reduce saturation by 8% to match browser rendering (alpha channel is preserved)
            brightness: 0.97  // Slightly darker to reduce red intensity (alpha channel is preserved)
          })
          // Note: withMetadata() cannot remove metadata with false values - toColorspace('srgb') already normalizes color space
          .png({ 
            compressionLevel: options.quality === 'preview' ? 6 : 7, // Lower compression for preview, higher for medium
            adaptiveFiltering: true,
            palette: false // Don't use palette mode to preserve full color accuracy
          })
          .toBuffer();
        useJpeg = false;
      } else {
        // Use PNG with compression for printing and excellent (lossless)
        // Scale down from rendered size to target size
        // Remove color profiles and ensure sRGB to match browser rendering (without removing alpha for transparency)
        // Note: toColorspace('srgb') normalizes the color space, effectively removing custom ICC profiles
        // Apply gamma correction and saturation reduction to match browser rendering
        optimizedImage = await sharp(pageImage)
          .gamma(2.15) // Slightly lower gamma (from 2.2 to 2.15) to reduce red tendency and match browser rendering
          .resize(targetWidthPx, targetHeightPx, {
            fit: 'fill',
            withoutEnlargement: false,
            kernel: 'lanczos3' // Use high-quality resampling to preserve colors
          })
          .toColorspace('srgb') // Explicitly set sRGB color space to match browser rendering (removes custom ICC profiles)
          .modulate({
            saturation: 0.92, // Reduce saturation by 8% to match browser rendering (alpha channel is preserved)
            brightness: 0.97  // Slightly darker to reduce red intensity (alpha channel is preserved)
          })
          // Note: withMetadata() cannot remove metadata with false values - toColorspace('srgb') already normalizes color space
          .png({ 
            compressionLevel: 9,
            adaptiveFiltering: true
          })
          .toBuffer();
        useJpeg = false;
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

/**
 * Write shared rendering modules to temporary files and return their paths
 * This function reads the modules from shared/rendering/, converts them to
 * browser-compatible format, and writes them to temporary files
 * @param {Object} themesData - Themes data object
 * @param {Array} colorPalettes - Color palettes array
 * @returns {Object} Object with tempDir and moduleFiles array
 */
function writeSharedRenderingModulesToFiles(themesData, colorPalettes) {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  // Create temporary directory
  const tempDir = path.join(os.tmpdir(), `pdf-rendering-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  fs.mkdirSync(tempDir, { recursive: true });
  
  // Helper function to remove module.exports (handles multiline exports with balanced braces)
  function removeModuleExports(code) {
    let result = code;
    let changed = true;
    
    while (changed) {
      changed = false;
      const match = result.match(/module\.exports\s*=\s*\{/);
      if (match) {
        const start = match.index;
        let depth = 0;
        let i = start + match[0].length;
        let found = false;
        
        for (; i < result.length; i++) {
          const char = result[i];
          if (char === '{') {
            depth++;
          } else if (char === '}') {
            if (depth === 0) {
              // Found the closing brace
              let end = i + 1;
              // Check for semicolon
              if (result[end] === ';') end++;
              // Remove trailing whitespace/newlines
              while (end < result.length && /\s/.test(result[end])) end++;
              result = result.substring(0, start) + result.substring(end);
              changed = true;
              found = true;
            break;
          }
            depth--;
          }
        }
        
        if (!found) break;
          } else {
        break;
          }
        }
    
        return result;
      }
      
  // Helper function to remove require statements
  function removeRequires(code) {
    // Remove destructured requires: const { ... } = require(...)
    let result = code.replace(/const\s+\{[^}]*\}\s*=\s*require\([^)]+\);?\s*/g, '');
    // Remove simple requires: const name = require(...)
    result = result.replace(/const\s+\w+\s*=\s*require\([^)]+\);?\s*/g, '');
    // Remove any remaining require statements
    result = result.replace(/require\([^)]+\);?\s*/g, '');
    return result;
  }
  
  // Read module files
  const constantsCode = fs.readFileSync(path.join(__dirname, '../../shared/rendering/utils/constants.js'), 'utf-8');
  const colorUtilsCode = fs.readFileSync(path.join(__dirname, '../../shared/rendering/utils/color-utils.js'), 'utf-8');
  const paletteUtilsCode = fs.readFileSync(path.join(__dirname, '../../shared/rendering/utils/palette-utils.js'), 'utf-8');
  const themeUtilsCode = fs.readFileSync(path.join(__dirname, '../../shared/rendering/utils/theme-utils.js'), 'utf-8');
  const imageUtilsCode = fs.readFileSync(path.join(__dirname, '../../shared/rendering/utils/image-utils.js'), 'utf-8');
  const renderRuledLinesCode = fs.readFileSync(path.join(__dirname, '../../shared/rendering/render-ruled-lines.js'), 'utf-8');
  const renderQnaCode = fs.readFileSync(path.join(__dirname, '../../shared/rendering/render-qna.js'), 'utf-8');
  const renderBackgroundCode = fs.readFileSync(path.join(__dirname, '../../shared/rendering/render-background.js'), 'utf-8');
  const renderElementCode = fs.readFileSync(path.join(__dirname, '../../shared/rendering/render-element.js'), 'utf-8');
  const indexCode = fs.readFileSync(path.join(__dirname, '../../shared/rendering/index.js'), 'utf-8');
  
  // Process and write modules
  const moduleFiles = [];
  
  // Process constants.js - keep PATTERNS, PAGE_DIMENSIONS, CANVAS_DIMS and make them globally available
  let browserConstants = removeModuleExports(constantsCode);
  browserConstants += '\n// Make constants globally available\nwindow.PATTERNS = PATTERNS;\nwindow.PAGE_DIMENSIONS = PAGE_DIMENSIONS;\nwindow.CANVAS_DIMS = CANVAS_DIMS;';
  const constantsFile = path.join(tempDir, 'constants.js');
  fs.writeFileSync(constantsFile, browserConstants);
  moduleFiles.push(constantsFile);
  
  // Process color-utils.js - make functions globally available
  let browserColorUtils = removeModuleExports(colorUtilsCode);
  browserColorUtils += '\n// Make functions globally available\nwindow.hexToRgba = hexToRgba;\nwindow.applyFillOpacity = applyFillOpacity;\nwindow.applyStrokeOpacity = applyStrokeOpacity;';
  const colorUtilsFile = path.join(tempDir, 'color-utils.js');
  fs.writeFileSync(colorUtilsFile, browserColorUtils);
  moduleFiles.push(colorUtilsFile);
  
  // Process palette-utils.js - replace loadColorPalettes and make functions globally available
  // First, remove the loadColorPalettes function completely
  let browserPaletteUtils = paletteUtilsCode
    .replace(/const\s+path\s*=\s*require\([^)]+\);?\s*/g, '')
    .replace(/const\s+fs\s*=\s*require\([^)]+\);?\s*/g, '');
  
  // Remove loadColorPalettes function with balanced braces
  const loadColorPalettesMatch = browserPaletteUtils.match(/function\s+loadColorPalettes\(\)\s*\{/);
  if (loadColorPalettesMatch) {
    const start = loadColorPalettesMatch.index;
    let depth = 0;
    let i = start + loadColorPalettesMatch[0].length;
    let found = false;
    
    for (; i < browserPaletteUtils.length; i++) {
      const char = browserPaletteUtils[i];
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        if (depth === 0) {
          let end = i + 1;
          while (end < browserPaletteUtils.length && /\s/.test(browserPaletteUtils[end])) end++;
          browserPaletteUtils = browserPaletteUtils.substring(0, start) + browserPaletteUtils.substring(end);
          found = true;
          break;
        }
        depth--;
      }
    }
  }
  
  // Remove COLOR_PALETTES variable declaration if it exists
  browserPaletteUtils = browserPaletteUtils.replace(/let\s+COLOR_PALETTES\s*=\s*null;?\s*/g, '');
  
  // Add COLOR_PALETTES constant at the beginning
  browserPaletteUtils = `// Color palettes are provided as parameter\nconst COLOR_PALETTES = ${JSON.stringify(colorPalettes)};\n\n` + browserPaletteUtils;
  
  // Replace getPalette function
  browserPaletteUtils = browserPaletteUtils.replace(/function\s+getPalette\(paletteId\)\s*\{[\s\S]*?\}\s*/g,
    `function getPalette(paletteId) {
  if (!paletteId) return undefined;
  return COLOR_PALETTES.find(p => p.id === paletteId);
}`);
  
  // Replace all loadColorPalettes() calls
  browserPaletteUtils = browserPaletteUtils.replace(/loadColorPalettes\(\)/g, 'COLOR_PALETTES');
  browserPaletteUtils = browserPaletteUtils.replace(/const\s+palettes\s*=\s*loadColorPalettes\(\);?\s*/g, 'const palettes = COLOR_PALETTES;');
  
  browserPaletteUtils = removeModuleExports(browserPaletteUtils);
  browserPaletteUtils += '\n// Make functions globally available\nwindow.getPalettePartColor = getPalettePartColor;\nwindow.resolveBackgroundImageUrl = resolveBackgroundImageUrl;\nwindow.getPalette = getPalette;\nwindow.resolveImageUrlThroughProxy = resolveImageUrlThroughProxy;';
  const paletteUtilsFile = path.join(tempDir, 'palette-utils.js');
  fs.writeFileSync(paletteUtilsFile, browserPaletteUtils);
  moduleFiles.push(paletteUtilsFile);
  
  // Process theme-utils.js - replace loadThemes and make functions globally available
  let browserThemeUtils = themeUtilsCode
    .replace(/const\s+path\s*=\s*require\([^)]+\);?\s*/g, '')
    .replace(/const\s+fs\s*=\s*require\([^)]+\);?\s*/g, '');
  
  // Remove ALL require statements (including those inside functions)
  // First remove destructured requires (with multiline support)
  browserThemeUtils = browserThemeUtils.replace(/const\s+\{[^}]*\}\s*=\s*require\([^)]+\);?\s*/g, '');
  // Then remove simple requires
  browserThemeUtils = browserThemeUtils.replace(/const\s+\w+\s*=\s*require\([^)]+\);?\s*/g, '');
  // Finally remove any remaining require() calls (including destructured ones inside functions)
  // This regex handles: const { getPalette } = require('./palette-utils');
  browserThemeUtils = browserThemeUtils.replace(/const\s+\{\s*[^}]*\s*\}\s*=\s*require\([^)]+\);?\s*/g, '');
  browserThemeUtils = browserThemeUtils.replace(/require\([^)]+\);?\s*/g, '');
  
  // Remove loadThemes function with balanced braces
  const loadThemesMatch = browserThemeUtils.match(/function\s+loadThemes\(\)\s*\{/);
  if (loadThemesMatch) {
    const start = loadThemesMatch.index;
    let depth = 0;
    let i = start + loadThemesMatch[0].length;
    let found = false;
    
    for (; i < browserThemeUtils.length; i++) {
      const char = browserThemeUtils[i];
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        if (depth === 0) {
          let end = i + 1;
          while (end < browserThemeUtils.length && /\s/.test(browserThemeUtils[end])) end++;
          browserThemeUtils = browserThemeUtils.substring(0, start) + browserThemeUtils.substring(end);
          found = true;
          break;
        }
        depth--;
      }
    }
  }
  
  // Remove THEMES_DATA variable declaration if it exists
  browserThemeUtils = browserThemeUtils.replace(/let\s+THEMES_DATA\s*=\s*null;?\s*/g, '');
  
  // Add THEMES_DATA constant at the beginning
  browserThemeUtils = `// Themes data is provided as parameter\nconst THEMES_DATA = ${JSON.stringify(themesData)};\n\n` + browserThemeUtils;
  
  // Replace all loadThemes() calls
  browserThemeUtils = browserThemeUtils.replace(/loadThemes\(\)/g, 'THEMES_DATA.themes || THEMES_DATA');
  browserThemeUtils = browserThemeUtils.replace(/const\s+themes\s*=\s*loadThemes\(\);?\s*/g, 'const themes = THEMES_DATA.themes || THEMES_DATA;');
  
  // Replace getPalette calls to use global function
  browserThemeUtils = browserThemeUtils.replace(/\bgetPalette\(/g, '(window.getPalette || getPalette)(');
  
  browserThemeUtils = removeModuleExports(browserThemeUtils);
  browserThemeUtils += '\n// Make functions globally available\nwindow.getGlobalThemeDefaults = getGlobalThemeDefaults;\nwindow.getThemeRenderer = getThemeRenderer;\nwindow.deepMerge = deepMerge;\nwindow.applyPaletteToElement = applyPaletteToElement;\nwindow.commonToActualStrokeWidth = commonToActualStrokeWidth;';
  const themeUtilsFile = path.join(tempDir, 'theme-utils.js');
  fs.writeFileSync(themeUtilsFile, browserThemeUtils);
  moduleFiles.push(themeUtilsFile);
  
  // Process image-utils.js - make functions globally available
  let browserImageUtils = removeModuleExports(imageUtilsCode);
  browserImageUtils += '\n// Make functions globally available\nwindow.getCrop = getCrop;';
  const imageUtilsFile = path.join(tempDir, 'image-utils.js');
  fs.writeFileSync(imageUtilsFile, browserImageUtils);
  moduleFiles.push(imageUtilsFile);
  
  // Process render-ruled-lines.js - make functions globally available
  let browserRenderRuledLines = renderRuledLinesCode
    .replace(/const\s+\{\s*[^}]*\}\s*=\s*require\([^)]+\);?\s*/g, '');
  browserRenderRuledLines = removeModuleExports(browserRenderRuledLines);
  browserRenderRuledLines += '\n// Make functions globally available\nwindow.renderRuledLines = renderRuledLines;\nwindow.getLineHeightMultiplier = getLineHeightMultiplier;';
  const renderRuledLinesFile = path.join(tempDir, 'render-ruled-lines.js');
  fs.writeFileSync(renderRuledLinesFile, browserRenderRuledLines);
  moduleFiles.push(renderRuledLinesFile);
  
  // Process render-qna.js - make functions globally available
  // Remove require statements but keep function calls as-is - they will use global functions
  let browserRenderQna = renderQnaCode
    .replace(/const\s+\{\s*getGlobalThemeDefaults,\s*deepMerge\s*\}\s*=\s*require\([^)]+\);?\s*/g, '')
    .replace(/const\s+\{\s*getGlobalThemeDefaults\s*\}\s*=\s*require\([^)]+\);?\s*/g, '')
    .replace(/const\s+\{\s*deepMerge\s*\}\s*=\s*require\([^)]+\);?\s*/g, '');
  
  browserRenderQna = removeModuleExports(browserRenderQna);
  browserRenderQna += '\n// Make functions globally available\nwindow.renderQnA = renderQnA;\nwindow.parseQuestionPayload = parseQuestionPayload;';
  const renderQnaFile = path.join(tempDir, 'render-qna.js');
  fs.writeFileSync(renderQnaFile, browserRenderQna);
  moduleFiles.push(renderQnaFile);
  
  // Process render-background.js - use PATTERNS from global scope (already loaded from constants.js)
  // Remove require statements but keep function calls as-is - they will use global functions
  let browserRenderBackground = renderBackgroundCode
    .replace(/const\s+\{\s*PATTERNS\s*\}\s*=\s*require\([^)]+\);?\s*/g, '')
    .replace(/const\s+\{\s*resolveBackgroundImageUrl,\s*getPalettePartColor,\s*getPalette\s*\}\s*=\s*require\([^)]+\);?\s*/g, '');
  
  // Replace PATTERNS to use global PATTERNS (simple replacement)
  browserRenderBackground = browserRenderBackground.replace(/\bPATTERNS\.find\b/g, '(window.PATTERNS || PATTERNS).find');
  
  browserRenderBackground = removeModuleExports(browserRenderBackground);
  browserRenderBackground += '\n// Make functions globally available\nwindow.renderBackground = renderBackground;\nwindow.createPatternImage = createPatternImage;';
  const renderBackgroundFile = path.join(tempDir, 'render-background.js');
  fs.writeFileSync(renderBackgroundFile, browserRenderBackground);
  moduleFiles.push(renderBackgroundFile);
  
  // Process render-element.js - make functions globally available
  // Remove require statements but keep function calls as-is - they will use global functions
  let browserRenderElement = renderElementCode
    .replace(/const\s+\{\s*renderQnA\s*\}\s*=\s*require\([^)]+\);?\s*/g, '')
    .replace(/const\s+\{\s*getCrop\s*\}\s*=\s*require\([^)]+\);?\s*/g, '')
    .replace(/const\s+\{\s*applyFillOpacity,\s*applyStrokeOpacity\s*\}\s*=\s*require\([^)]+\);?\s*/g, '')
    .replace(/const\s+\{\s*getGlobalThemeDefaults\s*\}\s*=\s*require\([^)]+\);?\s*/g, '');
  
  browserRenderElement = removeModuleExports(browserRenderElement);
  browserRenderElement += '\n// Make functions globally available\nwindow.renderElement = renderElement;';
  const renderElementFile = path.join(tempDir, 'render-element.js');
  fs.writeFileSync(renderElementFile, browserRenderElement);
  moduleFiles.push(renderElementFile);
  
  // Process index.js - this must be loaded last, use global functions
  // Remove require statements but keep function calls as-is - they will use global functions
  let browserIndex = indexCode
    .replace(/const\s+\{\s*renderBackground\s*\}\s*=\s*require\([^)]+\);?\s*/g, '')
    .replace(/const\s+\{\s*renderElement\s*\}\s*=\s*require\([^)]+\);?\s*/g, '')
    .replace(/const\s+\{\s*loadThemes\s*\}\s*=\s*require\([^)]+\);?\s*/g, '')
    .replace(/const\s+\{\s*loadColorPalettes\s*\}\s*=\s*require\([^)]+\);?\s*/g, '')
    .replace(/const\s+themesData\s*=\s*loadThemes\(\);?\s*/g, 'const themesData = THEMES_DATA;')
    .replace(/const\s+colorPalettes\s*=\s*loadColorPalettes\(\);?\s*/g, 'const colorPalettes = COLOR_PALETTES;');
  
  browserIndex = removeModuleExports(browserIndex);
  browserIndex += '\n// Make function globally available\nwindow.renderPageWithKonva = renderPageWithKonva;';
  const indexFile = path.join(tempDir, 'index.js');
  fs.writeFileSync(indexFile, browserIndex);
  moduleFiles.push(indexFile);
  
  return { tempDir, moduleFiles };
}


/**
 * Renders a single page with Konva using Puppeteer
 * @param {Object} page - Puppeteer page instance
 * @param {Object} pageData - Page data with elements
 * @param {Object} bookData - Book data
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @returns {Promise<Buffer>} - PNG image buffer
 */
async function renderPageWithKonva(page, pageData, bookData, canvasWidth, canvasHeight) {
  // Write shared rendering modules to temporary files
  const fs = require('fs');
  const path = require('path');
  const { tempDir, moduleFiles } = writeSharedRenderingModulesToFiles(themesJson, colorPalettesJson.palettes);
  
  try {
    // Create minimal HTML template (without embedded modules)
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amatic+SC:wght@400;700&family=Aguafina+Script&family=Arizonia&family=Astloch:wght@400;700&family=Audiowide&family=Ballet&family=Barrio&family=Bigelow+Rules&family=Bilbo+Swash+Caps&family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Bonheur+Royale&family=Bowlby+One+SC&family=Bungee&family=Bungee+Hairline&family=Bungee+Outline&family=Bungee+Shade&family=Caesar+Dressing&family=Calligraffitti&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Chewy&family=Cherish&family=Climate+Crisis&family=Comic+Neue:ital,wght@0,400;0,700;1,400&family=Corinthia:wght@400;700&family=Creepster&family=Delicious+Handrawn&family=Diplomata+SC&family=Doto:wght@400;700&family=Dr+Sugiyama&family=DynaPuff:wght@400;700&family=Electrolize&family=Emblema+One&family=Emilys+Candy&family=Fascinate&family=Give+You+Glory&family=Gloria+Hallelujah&family=Gochi+Hand&family=Grape+Nuts&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Henny+Penny&family=Homemade+Apple&family=Inclusive+Sans&family=Italiana&family=Julius+Sans+One&family=Kablammo&family=Knewave&family=Lacquer&family=Lobster&family=Luckiest+Guy&family=Meddon&family=Megrim&family=Miltonian&family=Mohave:wght@400;700&family=Molle:ital@1&family=Monofett&family=Monsieur+La+Doulaise&family=Monoton&family=Mynerve&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&family=Noto+Sans+Symbols:wght@400;700&family=Noto+Sans+Symbols+2:wght@400;700&family=Permanent+Marker&family=Playwrite+DE+VA&family=Poiret+One&family=Ribeye+Marrow&family=Rock+Salt&family=Rubik+Dirt&family=Rubik+Glitch&family=Rubik+Wet+Paint&family=Rye&family=Saira+Stencil+One&family=Schoolbell&family=Shadows+Into+Light+Two&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Shojumaru&family=Sigmar+One&family=Silkscreen:wght@400;700&family=Stalemate&family=Sunflower:wght@400;700&family=Syne+Mono&family=Tourney:wght@400;700&family=Turret+Road:wght@400;700&family=UnifrakturCook:wght@400;700&family=Vast+Shadow&family=WindSong&family=Yarndings+12&family=Zeyada&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/konva@9/konva.min.js"></script>
  <script src="https://unpkg.com/roughjs@4.6.6/bundled/rough.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    #container {
      width: ${canvasWidth}px;
      height: ${canvasHeight}px;
    }
    @font-face {
      font-family: 'Mynerve', cursive;
      src: url('https://fonts.gstatic.com/s/minerve/v1/7cH1v4Uiz5qdl1MvLwQ.woff2') format('woff2');
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }
  </style>
</head>
<body>
  <div id="container"></div>
  <script>
    // Initialize global variables
    window.stage = null;
    window.renderComplete = false;
    window.initKonvaCalled = false;
    
    // Wait for Konva and modules to load, then execute rendering
    window.initKonva = async function() {
      if (window.initKonvaCalled) {
        console.warn('initKonva already called, skipping');
        return;
      }
      
      if (typeof Konva === 'undefined') {
        return;
      }
      
      if (typeof renderPageWithKonva === 'undefined') {
        return;
      }
      
      window.initKonvaCalled = true;
      
      // Debug: Test log to verify console.log works
      console.log('[DEBUG] 🔍 TEST LOG - initKonva called, about to start rendering');
      console.log('[DEBUG] Available functions:', {
        hasRenderPageWithKonva: typeof renderPageWithKonva !== 'undefined',
        hasKonva: typeof Konva !== 'undefined',
        hasRough: typeof rough !== 'undefined'
      });
      
      // Use IIFE to avoid variable conflicts, but keep stage in global scope
      (async function() {
        const pageData = ${JSON.stringify(pageData)};
        const bookData = ${JSON.stringify(bookData)};
        
        // Debug: Log page data
        console.log('[DEBUG] 📄 Page data loaded:', {
          pageNumber: pageData.pageNumber,
          elementsCount: pageData.elements?.length || 0,
          hasBackground: !!pageData.background,
          theme: pageData.theme || bookData.theme || 'default'
        });
        
        // Embed theme data (available from shared modules)
        const COLOR_PALETTES = ${JSON.stringify(colorPalettesJson.palettes)};
        const THEMES_DATA = ${JSON.stringify(themesJson)};
        
        // Store element count globally for debugging
        window.pageDataElementsCount = pageData.elements?.length || 0;
        
        // Initialize image promise arrays
        window.imagePromises = [];
        window.backgroundImagePromises = [];
        
        // Create stage in global scope so it's accessible for screenshot
        try {
          window.stage = new Konva.Stage({
            container: 'container',
            width: ${canvasWidth},
            height: ${canvasHeight}
          });
        } catch (e) {
          console.error('Error creating stage:', e.message, e.stack);
          return;
        }
        
        // Use shared rendering function
        try {
          // Try to get rough from global scope (window.rough or just rough)
          const roughInstance = (typeof window !== 'undefined' && window.rough) || (typeof rough !== 'undefined' ? rough : null);
          
          // Debug: Log before calling renderPageWithKonva
          console.log('[DEBUG] ⚠️ ABOUT TO CALL renderPageWithKonva:', {
            hasRoughInstance: !!roughInstance,
            roughType: typeof roughInstance,
            elementsCount: pageData.elements?.length || 0,
            pageTheme: pageData.theme || bookData.theme || 'default'
          });
          
          const result = await renderPageWithKonva(
            pageData,
            bookData,
            ${canvasWidth},
            ${canvasHeight},
            Konva,
            document,
            Image,
            { rough: roughInstance }
          );
          
          // Debug: Log after calling renderPageWithKonva
          console.log('[DEBUG] ✅ renderPageWithKonva completed:', {
            hasLayer: !!result.layer,
            hasImagePromises: !!result.imagePromises,
            imagePromisesCount: result.imagePromises?.length || 0
          });
          
          // Debug: Log before adding layer to stage
          console.log('[DEBUG] ⚠️ ADDING LAYER TO STAGE:', {
            pageNumber: pageData.pageNumber,
            hasLayer: !!result.layer,
            layerChildrenCount: result.layer?.getChildren().length || 0,
            stageLayersBefore: window.stage.getLayers().length
          });
          
          // Add layer to stage
          window.stage.add(result.layer);
          
          // Debug: Log after adding layer to stage
          console.log('[DEBUG] ✅ LAYER ADDED TO STAGE:', {
            pageNumber: pageData.pageNumber,
            stageLayersAfter: window.stage.getLayers().length,
            layerChildrenCount: result.layer?.getChildren().length || 0,
            stageChildrenCount: window.stage.getLayers().reduce((sum, l) => sum + l.getChildren().length, 0)
          });
          
          // Wait for all images to load
          const allImagePromises = result.imagePromises || [];
          if (allImagePromises.length > 0) {
            await Promise.all(allImagePromises);
          }
          
          // Draw stage
          result.layer.draw();
            window.stage.draw();
          
          window.renderComplete = true;
          } catch (e) {
          console.error('Error rendering page:', e.message, e.stack);
          window.renderComplete = true; // Mark as complete even on error
      }
      })();
    }
    
    // Don't call initKonva automatically - let page.evaluate() call it
  </script>
</body>
</html>`;

  // Listen to console messages from the page BEFORE setting content
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    console.log('[Browser Console]', text);
  });
  
  // Also listen to page errors
  page.on('pageerror', error => {
    console.error('[Browser Error]', error.message);
  });
  
    // Set HTML content first
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Load shared rendering modules via addScriptTag
    for (const moduleFile of moduleFiles) {
      try {
        await page.addScriptTag({ path: moduleFile });
      } catch (error) {
        console.error('Error loading module:', moduleFile, error.message);
        throw error;
      }
    }
    
    // Inject theme data into page context
    await page.evaluate((themesData, colorPalettes) => {
      window.THEMES_DATA = themesData;
      window.COLOR_PALETTES = colorPalettes;
    }, themesJson, colorPalettesJson.palettes);
    
    // Wait for modules to load and verify renderPageWithKonva is available
    await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        let checkCount = 0;
        const checkModules = setInterval(() => {
          checkCount++;
          
          // Check if renderPageWithKonva function is available
          if (typeof renderPageWithKonva === 'undefined') {
            if (checkCount > 100) {
              clearInterval(checkModules);
              reject(new Error('Rendering modules failed to load after 10 seconds'));
            }
            return;
          }
          
          // Modules are loaded
          clearInterval(checkModules);
          resolve();
        }, 100);
      });
    });
  
  // Wait for Konva to load, then trigger initialization and wait for completion
  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      let checkCount = 0;
      const checkComplete = setInterval(() => {
        checkCount++;
        
        // Check if Konva is loaded
        if (typeof Konva === 'undefined') {
          if (checkCount > 100) {
            clearInterval(checkComplete);
            reject(new Error('Konva library failed to load after 10 seconds'));
          }
          return;
        }
        
        // Konva is loaded, check if initKonva was called
        if (!window.initKonvaCalled && typeof window.initKonva === 'function') {
          try {
            // Reset image promises array
            window.imagePromises = [];
            window.initKonva();
          } catch (e) {
            console.error('Error calling initKonva:', e.message, e.stack);
            clearInterval(checkComplete);
            reject(new Error('Error calling initKonva: ' + e.message));
            return;
          }
        }
        
        // Check if stage is created
        if (!window.stage) {
          if (checkCount > 100) {
            clearInterval(checkComplete);
            reject(new Error('Stage was not created after 10 seconds. Konva loaded: ' + (typeof Konva !== 'undefined') + ', initKonvaCalled: ' + (window.initKonvaCalled || false)));
          }
          return;
        }
        
        // Check if render is complete (including images)
        if (!window.renderComplete) {
          if (checkCount > 600) {
            clearInterval(checkComplete);
            console.warn('Render timeout after 60 seconds, proceeding anyway');
            resolve(); // Resolve instead of reject to continue with what we have
          }
          return;
        }
        
        // Everything is ready - wait a bit more to ensure all images are rendered
        setTimeout(() => {
          clearInterval(checkComplete);
          resolve();
        }, 500);
      }, 100);
    });
  });

  // Additional wait for any async operations
  await page.waitForTimeout(500);

    // Debug: Comprehensive analysis of layer structure
  const debugInfo = await page.evaluate(() => {
    const stage = window.stage;
    if (!stage) {
      return { error: 'Stage not found' };
    }
    
    const layers = stage.getLayers();
    const layer = layers[0];
    if (!layer) {
      return { error: 'No layers found' };
    }
    
    const children = layer.getChildren();
      
      // Find qna background and border nodes
      const qnaBackgroundNodes = [];
      const qnaBorderNodes = [];
      const pageBackgroundNodes = [];
      const textNodes = [];
      const otherNodes = [];
      
      const stageWidth = stage.width();
      const stageHeight = stage.height();
      
      children.forEach((node, idx) => {
        const className = node.getClassName();
        const nodeX = node.x ? node.x() : 0;
        const nodeY = node.y ? node.y() : 0;
        const nodeWidth = node.width ? node.width() : 0;
        const nodeHeight = node.height ? node.height() : 0;
        
        // Check if it's a page background (full canvas size at 0,0)
        if ((className === 'Rect' || className === 'Image') && 
            nodeX === 0 && nodeY === 0 && 
            nodeWidth === stageWidth && nodeHeight === stageHeight) {
          pageBackgroundNodes.push({
            idx,
            className,
            x: nodeX,
            y: nodeY,
            width: nodeWidth,
            height: nodeHeight,
            fill: node.fill ? node.fill() : 'N/A',
            opacity: node.opacity(),
            visible: node.visible(),
            zIndex: node.zIndex()
          });
        }
        // Check if it's a qna background (Rect with fill, not at 0,0)
        else if (className === 'Rect' && 
                 (nodeX !== 0 || nodeY !== 0 || nodeWidth !== stageWidth || nodeHeight !== stageHeight)) {
          const fill = node.fill ? node.fill() : 'transparent';
          const stroke = node.stroke ? node.stroke() : 'transparent';
          if (fill !== 'transparent' && fill !== undefined && fill !== null) {
            qnaBackgroundNodes.push({
              idx,
              className,
              x: nodeX,
              y: nodeY,
              width: nodeWidth,
              height: nodeHeight,
              fill: fill,
              opacity: node.opacity(),
              visible: node.visible(),
              zIndex: node.zIndex(),
              cornerRadius: node.cornerRadius ? node.cornerRadius() : 0
            });
          } else if (stroke !== 'transparent' && stroke !== undefined && stroke !== null && 
                     node.strokeWidth && node.strokeWidth() > 0) {
            qnaBorderNodes.push({
              idx,
              className,
              x: nodeX,
              y: nodeY,
              width: nodeWidth,
              height: nodeHeight,
              stroke: stroke,
              strokeWidth: node.strokeWidth(),
              opacity: node.opacity(),
              visible: node.visible(),
              zIndex: node.zIndex(),
              cornerRadius: node.cornerRadius ? node.cornerRadius() : 0
            });
          }
        }
        // Check if it's a Path (rough.js border)
        else if (className === 'Path') {
          const stroke = node.stroke ? node.stroke() : 'transparent';
          if (stroke !== 'transparent' && stroke !== undefined && stroke !== null) {
            qnaBorderNodes.push({
              idx,
              className,
              x: nodeX,
              y: nodeY,
              data: node.data ? node.data().substring(0, 100) + '...' : 'N/A',
              stroke: stroke,
              strokeWidth: node.strokeWidth(),
              opacity: node.opacity(),
              visible: node.visible(),
              zIndex: node.zIndex()
            });
          }
        }
        // Check if it's a Text node
        else if (className === 'Text') {
          textNodes.push({
            idx,
            className,
            x: nodeX,
            y: nodeY,
            text: node.text ? node.text().substring(0, 50) : 'N/A',
            fontSize: node.fontSize ? node.fontSize() : 'N/A',
            fill: node.fill ? node.fill() : 'N/A',
            visible: node.visible(),
            opacity: node.opacity()
          });
        }
        else {
          otherNodes.push({
            idx,
            className,
            x: nodeX,
            y: nodeY,
            width: nodeWidth,
            height: nodeHeight
          });
        }
      });
      
      const childrenInfo = children.map((c, idx) => ({
        idx,
      className: c.getClassName(),
        x: c.x ? c.x() : 0,
        y: c.y ? c.y() : 0,
        width: c.width ? c.width() : 0,
        height: c.height ? c.height() : 0,
      visible: c.visible(),
        opacity: c.opacity(),
        zIndex: c.zIndex(),
        fill: c.fill ? c.fill() : 'N/A',
        stroke: c.stroke ? c.stroke() : 'N/A',
        strokeWidth: c.strokeWidth ? c.strokeWidth() : 'N/A'
    }));
    
    return {
      stageExists: true,
      layerCount: layers.length,
      childrenCount: children.length,
        stageSize: { width: stageWidth, height: stageHeight },
        pageBackgroundNodes: pageBackgroundNodes,
        qnaBackgroundNodes: qnaBackgroundNodes,
        qnaBorderNodes: qnaBorderNodes,
        textNodes: textNodes,
        otherNodes: otherNodes,
        allChildren: childrenInfo,
      renderComplete: window.renderComplete || false
    };
  });

  // Verify stage exists before taking screenshot
  const stageCheck = await page.evaluate(() => {
    return {
      stageExists: !!window.stage,
      renderComplete: !!window.renderComplete,
      stageType: window.stage ? typeof window.stage : 'undefined',
      stageConstructor: window.stage ? window.stage.constructor?.name : 'undefined'
    };
  });
  
  if (!stageCheck.stageExists) {
    throw new Error('Konva stage not found before screenshot. Stage check: ' + JSON.stringify(stageCheck));
  }
    
    // Debug: Take a screenshot before PDF export to see what's actually rendered
    try {
      const { getUploadsDir } = require('../utils/uploads-path');
      const debugScreenshotPath = path.join(getUploadsDir(), `debug-screenshot-${Date.now()}.png`);
      const debugScreenshot = await page.screenshot({ 
        path: debugScreenshotPath,
        fullPage: false 
      });
    } catch (e) {
      console.warn('Could not save debug screenshot:', e.message);
    }
  
  // Fix z-order: Move qna background and border nodes after page background
  await page.evaluate(() => {
    const stage = window.stage;
    if (!stage) return;
    
    const layers = stage.getLayers();
    if (layers.length === 0) return;
    
    const layer = layers[0];
    const children = layer.getChildren();
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    
    // Find all page background nodes (full canvas size at 0,0)
    const pageBackgroundIndices = [];
    children.forEach((node, idx) => {
      if (node.getClassName() !== 'Rect' && node.getClassName() !== 'Image') return;
      const nodeX = node.x ? node.x() : 0;
      const nodeY = node.y ? node.y() : 0;
      const nodeWidth = node.width ? node.width() : 0;
      const nodeHeight = node.height ? node.height() : 0;
      if (nodeX === 0 && nodeY === 0 && nodeWidth === stageWidth && nodeHeight === stageHeight) {
        pageBackgroundIndices.push(idx);
      }
    });
    
    if (pageBackgroundIndices.length === 0) return;
    
    const lastPageBgIndex = Math.max(...pageBackgroundIndices);
    
    // Find qna background and border nodes (not at 0,0, not full canvas size)
    const qnaNodes = [];
    children.forEach((node, idx) => {
      if (idx <= lastPageBgIndex) return; // Skip page background nodes
      const className = node.getClassName();
      const nodeX = node.x ? node.x() : 0;
      const nodeY = node.y ? node.y() : 0;
      const nodeWidth = node.width ? node.width() : 0;
      const nodeHeight = node.height ? node.height() : 0;
      
      // Check if it's a qna background (Rect with fill, not at 0,0)
      if (className === 'Rect') {
        const fill = node.fill ? node.fill() : 'transparent';
        if (fill !== 'transparent' && fill !== undefined && fill !== null &&
            (nodeX !== 0 || nodeY !== 0 || nodeWidth !== stageWidth || nodeHeight !== stageHeight)) {
          qnaNodes.push({ node, idx, type: 'background' });
        }
      }
      // Check if it's a qna border (Path or Rect with stroke)
      else if (className === 'Path' || className === 'Rect') {
        const stroke = node.stroke ? node.stroke() : 'transparent';
        if (stroke !== 'transparent' && stroke !== undefined && stroke !== null &&
            node.strokeWidth && node.strokeWidth() > 0 &&
            (nodeX !== 0 || nodeY !== 0 || nodeWidth !== stageWidth || nodeHeight !== stageHeight)) {
          qnaNodes.push({ node, idx, type: 'border' });
        }
      }
    });
    
    // Sort qna nodes: background first, then border
    qnaNodes.sort((a, b) => {
      if (a.type === 'background' && b.type === 'border') return -1;
      if (a.type === 'border' && b.type === 'background') return 1;
      return a.idx - b.idx;
    });
    
    // Move qna nodes to position right after last page background node
    let insertIndex = lastPageBgIndex + 1;
    qnaNodes.forEach(({ node, idx }) => {
      const currentIndex = layer.getChildren().indexOf(node);
      if (currentIndex !== -1 && currentIndex !== insertIndex) {
        layer.getChildren().splice(currentIndex, 1);
        // Adjust insertIndex if we removed a node before it
        if (currentIndex < insertIndex) {
          insertIndex--;
        }
        layer.getChildren().splice(insertIndex, 0, node);
        insertIndex++;
      } else if (currentIndex === insertIndex) {
        insertIndex++;
      }
    });
    
    // Force redraw
    layer.draw();
    stage.draw();
  });
  
  // Take screenshot of the canvas element specifically
  const screenshot = await page.evaluate((width, height) => {
    const stage = window.stage;
    if (!stage) {
      throw new Error('Konva stage not found in evaluate');
    }
    
    const layers = stage.getLayers();
    if (layers.length === 0) {
      throw new Error('No layers found in stage');
    }
    
    const layer = layers[0];
    
    // Force a redraw to ensure everything is rendered
    layer.draw();
    stage.draw();
    
    // Wait a bit for rendering to complete
    return new Promise((resolve) => {
      setTimeout(() => {
        // Export stage to data URL
        const dataURL = stage.toDataURL({
          mimeType: 'image/png',
          quality: 1.0,
          pixelRatio: 1
        });
        
        resolve(dataURL);
      }, 100);
    });
  }, canvasWidth, canvasHeight);

  // Convert data URL to buffer
  const base64Data = screenshot.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  return buffer;
  } finally {
    // Clean up temporary files
    try {
      if (tempDir && fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(tempDir, file));
        }
        fs.rmdirSync(tempDir);
      }
    } catch (error) {
      // Silently ignore cleanup errors
    }
  }
}

module.exports = {
  generatePDFFromBook
};

