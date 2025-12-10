/**
 * Visual PDF Comparison Script
 * 
 * Converts PDFs to images using Puppeteer and performs pixel-by-pixel comparison
 * 
 * Usage:
 *   node server/scripts/visual-pdf-comparison.js <clientPDF> <serverPDF> [options]
 * 
 * Options:
 *   --output-dir <dir>     Output directory for comparison images (default: ./comparison-output)
 *   --threshold <number>   Pixel difference threshold (0-1, default: 0.1)
 *   --dpi <number>         DPI for PDF to image conversion (default: 150)
 *   --page <number>        Specific page to compare (default: all pages)
 * 
 * Example:
 *   node server/scripts/visual-pdf-comparison.js client.pdf server.pdf
 *   node server/scripts/visual-pdf-comparison.js client.pdf server.pdf --page 0 --dpi 300
 */

const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');

// Try to use canvas for image manipulation
let createCanvas, loadImage;
try {
  const canvas = require('canvas');
  createCanvas = canvas.createCanvas;
  loadImage = canvas.loadImage;
} catch (e) {
  console.warn('Warning: canvas not found. Install it with: npm install canvas');
}

/**
 * Convert PDF page to image using Puppeteer
 */
async function pdfPageToImage(pdfPath, pageNumber, dpi = 150) {
  if (!createCanvas) {
    throw new Error('canvas is required for image comparison');
  }

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    // Load PDF in browser
    const pdfUrl = `file://${path.resolve(pdfPath)}`;
    await page.goto(pdfUrl, { waitUntil: 'networkidle0' });
    
    // Wait for PDF to render
    await page.waitForTimeout(1000);
    
    // Get PDF page count and dimensions
    const pdfInfo = await page.evaluate(() => {
      const viewer = document.querySelector('embed') || document.querySelector('object');
      if (!viewer) return null;
      
      // Try to get PDF info from viewer
      return {
        pageCount: 1, // We'll handle this differently
        width: window.innerWidth,
        height: window.innerHeight
      };
    });
    
    // Use a different approach: render PDF page as image
    // Calculate viewport size based on DPI
    const scale = dpi / 72; // 72 DPI is default for PDFs
    const viewportWidth = 595 * scale; // A4 width in points * scale
    const viewportHeight = 842 * scale; // A4 height in points * scale
    
    await page.setViewport({
      width: Math.round(viewportWidth),
      height: Math.round(viewportHeight)
    });
    
    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false
    });
    
    return screenshot;
  } finally {
    await browser.close();
  }
}

/**
 * Alternative: Convert PDF page to image using pdf-lib and canvas
 * This approach extracts the image from the PDF directly
 */
async function pdfPageToImageDirect(pdfPath, pageNumber, dpi = 150) {
  if (!createCanvas) {
    throw new Error('canvas is required for PDF to image conversion');
  }

  const pdfBytes = await fs.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  if (pageNumber >= pages.length) {
    throw new Error(`Page ${pageNumber} does not exist (PDF has ${pages.length} pages)`);
  }
  
  const pdfPage = pages[pageNumber];
  const width = pdfPage.getWidth();
  const height = pdfPage.getHeight();
  
  // Scale based on DPI
  const scale = dpi / 72;
  const canvasWidth = Math.round(width * scale);
  const canvasHeight = Math.round(height * scale);
  
  // For now, we'll use Puppeteer to render the PDF page
  // This is more reliable than trying to extract images from pdf-lib
  return await pdfPageToImage(pdfPath, pageNumber, dpi);
}

/**
 * Simple pixel comparison using canvas
 */
async function compareImages(image1Buffer, image2Buffer, threshold = 0.1) {
  if (!createCanvas || !loadImage) {
    throw new Error('canvas is required for image comparison');
  }

  const img1 = await loadImage(image1Buffer);
  const img2 = await loadImage(image2Buffer);
  
  // Check if images have same dimensions
  if (img1.width !== img2.width || img1.height !== img2.height) {
    return {
      match: false,
      difference: 100,
      message: `Image dimensions differ: ${img1.width}x${img1.height} vs ${img2.width}x${img2.height}`
    };
  }
  
  // Create canvases for comparison
  const canvas1 = createCanvas(img1.width, img1.height);
  const ctx1 = canvas1.getContext('2d');
  ctx1.drawImage(img1, 0, 0);
  
  const canvas2 = createCanvas(img2.width, img2.height);
  const ctx2 = canvas2.getContext('2d');
  ctx2.drawImage(img2, 0, 0);
  
  // Get image data
  const data1 = ctx1.getImageData(0, 0, img1.width, img1.height);
  const data2 = ctx2.getImageData(0, 0, img2.width, img2.height);
  
  // Compare pixels
  let diffPixels = 0;
  let totalDiff = 0;
  const diffData = new Uint8ClampedArray(data1.data.length);
  
  for (let i = 0; i < data1.data.length; i += 4) {
    const r1 = data1.data[i];
    const g1 = data1.data[i + 1];
    const b1 = data1.data[i + 2];
    const a1 = data1.data[i + 3];
    
    const r2 = data2.data[i];
    const g2 = data2.data[i + 1];
    const b2 = data2.data[i + 2];
    const a2 = data2.data[i + 3];
    
    // Calculate difference (RGB + Alpha)
    const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) + Math.abs(a1 - a2);
    const normalizedDiff = diff / (255 * 4); // Normalize to 0-1
    
    if (normalizedDiff > threshold) {
      diffPixels++;
      // Highlight differences in red
      diffData[i] = 255;     // R
      diffData[i + 1] = 0;   // G
      diffData[i + 2] = 0;   // B
      diffData[i + 3] = 255; // A
    } else {
      // Keep original pixel (grayscale)
      const gray = (r1 + g1 + b1) / 3;
      diffData[i] = gray;
      diffData[i + 1] = gray;
      diffData[i + 2] = gray;
      diffData[i + 3] = 255;
    }
    
    totalDiff += normalizedDiff;
  }
  
  const diffPercentage = (diffPixels / (img1.width * img1.height)) * 100;
  const avgDiff = (totalDiff / (img1.width * img1.height)) * 100;
  
  // Create difference image
  const diffCanvas = createCanvas(img1.width, img1.height);
  const diffCtx = diffCanvas.getContext('2d');
  const diffImageData = diffCtx.createImageData(img1.width, img1.height);
  diffImageData.data.set(diffData);
  diffCtx.putImageData(diffImageData, 0, 0);
  
  return {
    match: diffPercentage < 1, // Less than 1% different pixels
    difference: diffPercentage,
    avgDifference: avgDiff,
    diffPixels: diffPixels,
    totalPixels: img1.width * img1.height,
    diffImageBuffer: diffCanvas.toBuffer('image/png'),
    width: img1.width,
    height: img1.height
  };
}

/**
 * Get PDF page count
 */
async function getPDFPageCount(pdfPath) {
  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error(`Error reading PDF ${pdfPath}:`, error.message);
    return 0;
  }
}

/**
 * Convert PDF page to image using Puppeteer with PDF.js
 */
async function pdfPageToImageImproved(pdfPath, pageNumber, dpi = 150) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  try {
    // Read PDF file as base64
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfBase64 = pdfBytes.toString('base64');
    
    // Calculate viewport size based on DPI
    // A4 at 72 DPI: 595 x 842 points
    const scale = dpi / 72;
    const viewportWidth = Math.round(595 * scale);
    const viewportHeight = Math.round(842 * scale);
    
    await page.setViewport({
      width: viewportWidth,
      height: viewportHeight
    });
    
    // Create HTML page with PDF.js to render the PDF
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              background: white;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            canvas { 
              display: block;
            }
          </style>
        </head>
        <body>
          <canvas id="pdf-canvas"></canvas>
          <script>
            (async function() {
              try {
                // Configure PDF.js worker
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                
                // Load PDF from base64
                const pdfData = atob('${pdfBase64}');
                const loadingTask = pdfjsLib.getDocument({ data: pdfData });
                const pdf = await loadingTask.promise;
                
                // Get the requested page (pageNumber is 0-based, PDF.js uses 1-based)
                const page = await pdf.getPage(${pageNumber + 1});
                
                // Get viewport at specified scale
                const viewport = page.getViewport({ scale: ${scale} });
                
                // Set canvas dimensions
                const canvas = document.getElementById('pdf-canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                // Render PDF page to canvas
                const renderContext = {
                  canvasContext: context,
                  viewport: viewport
                };
                
                await page.render(renderContext).promise;
                
                // Signal that rendering is complete
                window.pdfRendered = true;
              } catch (error) {
                console.error('PDF rendering error:', error);
                window.pdfError = error.message;
              }
            })();
          </script>
        </body>
      </html>
    `;
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Wait for PDF to render
    await page.waitForFunction(() => window.pdfRendered === true || window.pdfError !== undefined, { timeout: 30000 });
    
    // Check for errors
    const error = await page.evaluate(() => window.pdfError);
    if (error) {
      throw new Error(`PDF rendering failed: ${error}`);
    }
    
    // Wait a bit more to ensure rendering is complete
    await page.waitForTimeout(500);
    
    // Take screenshot of the canvas
    const screenshot = await page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: viewportWidth,
        height: viewportHeight
      }
    });
    
    return screenshot;
  } finally {
    await browser.close();
  }
}

/**
 * Main comparison function
 * @param {string} clientPDFPath - Path to client PDF
 * @param {string} serverPDFPath - Path to server PDF
 * @param {Object} options - Comparison options
 * @param {string} options.outputDir - Output directory for images
 * @param {number} options.threshold - Pixel difference threshold (0-1)
 * @param {number} options.dpi - DPI for conversion
 * @param {number} options.page - Specific page to compare (optional)
 * @returns {Promise<Array>} Comparison results
 */
async function comparePDFsVisually(clientPDFPath, serverPDFPath, options = {}) {
  const {
    outputDir = './comparison-output',
    threshold = 0.1,
    dpi = 150,
    pageNumber = null
  } = options;
  
  console.log('\n=== Visual PDF Comparison ===\n');
  console.log(`Client PDF: ${clientPDFPath}`);
  console.log(`Server PDF: ${serverPDFPath}`);
  console.log(`Output Directory: ${outputDir}`);
  console.log(`DPI: ${dpi}`);
  console.log(`Threshold: ${threshold}`);
  if (pageNumber !== null) {
    console.log(`Page: ${pageNumber}`);
  }
  console.log('');
  
  // Check if files exist
  try {
    await fs.access(clientPDFPath);
    await fs.access(serverPDFPath);
  } catch (error) {
    throw new Error(`One or both PDF files not found: ${error.message}`);
  }
  
  // Check if canvas is available
  if (!createCanvas) {
    console.error('\n❌ Error: Required dependencies missing!');
    console.error('\nPlease install:');
    console.error('  npm install canvas');
    process.exit(1);
  }
  
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });
  
  // Get page counts
  const clientPageCount = await getPDFPageCount(clientPDFPath);
  const serverPageCount = await getPDFPageCount(serverPDFPath);
  
  console.log(`Client PDF pages: ${clientPageCount}`);
  console.log(`Server PDF pages: ${serverPageCount}`);
  
  if (clientPageCount !== serverPageCount) {
    console.warn(`⚠️  Warning: Page counts differ!`);
  }
  
  const pagesToCompare = pageNumber !== null 
    ? [pageNumber] 
    : Array.from({ length: Math.min(clientPageCount, serverPageCount) }, (_, i) => i);
  
  console.log(`\nComparing ${pagesToCompare.length} page(s)...\n`);
  
  const results = [];
  
  for (const pageNum of pagesToCompare) {
    console.log(`Processing page ${pageNum + 1}...`);
    
    try {
      // Convert PDF pages to images using Puppeteer
      console.log(`  Converting client PDF page ${pageNum + 1} to image...`);
      const clientImage = await pdfPageToImageImproved(clientPDFPath, pageNum, dpi);
      
      console.log(`  Converting server PDF page ${pageNum + 1} to image...`);
      const serverImage = await pdfPageToImageImproved(serverPDFPath, pageNum, dpi);
      
      // Save individual page images
      const clientImagePath = path.join(outputDir, `client_page_${pageNum + 1}.png`);
      const serverImagePath = path.join(outputDir, `server_page_${pageNum + 1}.png`);
      
      await fs.writeFile(clientImagePath, clientImage);
      await fs.writeFile(serverImagePath, serverImage);
      
      console.log(`  ✓ Converted to images`);
      
      // Compare images
      console.log(`  Comparing images...`);
      const comparison = await compareImages(clientImage, serverImage, threshold);
      
      // Save difference image
      const diffImagePath = path.join(outputDir, `difference_page_${pageNum + 1}.png`);
      await fs.writeFile(diffImagePath, comparison.diffImageBuffer);
      
      results.push({
        page: pageNum + 1,
        ...comparison
      });
      
      console.log(`  ✓ Comparison complete`);
      console.log(`    Difference: ${comparison.difference.toFixed(2)}%`);
      console.log(`    Avg Difference: ${comparison.avgDifference.toFixed(2)}%`);
      console.log(`    Different Pixels: ${comparison.diffPixels} / ${comparison.totalPixels}`);
      console.log(`    Status: ${comparison.match ? '✅ MATCH' : '❌ DIFFERENT'}`);
      console.log(`    Images saved to: ${outputDir}`);
      console.log('');
      
    } catch (error) {
      console.error(`  ❌ Error processing page ${pageNum + 1}:`, error.message);
      results.push({
        page: pageNum + 1,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log('\n=== Summary ===\n');
  
  const successfulComparisons = results.filter(r => !r.error);
  const matches = successfulComparisons.filter(r => r.match);
  const differences = successfulComparisons.filter(r => !r.match);
  
  console.log(`Total pages compared: ${successfulComparisons.length}`);
  console.log(`✅ Matching pages: ${matches.length}`);
  console.log(`❌ Different pages: ${differences.length}`);
  
  if (differences.length > 0) {
    console.log('\nPages with differences:');
    differences.forEach(r => {
      console.log(`  Page ${r.page}: ${r.difference.toFixed(2)}% different`);
    });
  }
  
  if (results.some(r => r.error)) {
    console.log('\n⚠️  Errors occurred:');
    results.filter(r => r.error).forEach(r => {
      console.log(`  Page ${r.page}: ${r.error}`);
    });
  }
  
  console.log(`\nOutput directory: ${path.resolve(outputDir)}`);
  console.log('\nGenerated files:');
  console.log(`  - client_page_*.png (Client PDF pages)`);
  console.log(`  - server_page_*.png (Server PDF pages)`);
  console.log(`  - difference_page_*.png (Difference visualization)`);
  console.log('');
  
  return {
    success: differences.length === 0 && results.every(r => !r.error),
    results: results
  };
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    outputDir: './comparison-output',
    threshold: 0.1,
    dpi: 150,
    pageNumber: null
  };
  
  const files = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--output-dir' && i + 1 < args.length) {
      options.outputDir = args[++i];
    } else if (arg === '--threshold' && i + 1 < args.length) {
      options.threshold = parseFloat(args[++i]);
    } else if (arg === '--dpi' && i + 1 < args.length) {
      options.dpi = parseInt(args[++i], 10);
    } else if (arg === '--page' && i + 1 < args.length) {
      options.pageNumber = parseInt(args[++i], 10);
    } else if (!arg.startsWith('--')) {
      files.push(arg);
    }
  }
  
  return { files, options };
}

/**
 * Main function
 */
async function main() {
  const { files, options } = parseArgs();
  
  if (files.length < 2) {
    console.log('Usage: node visual-pdf-comparison.js <clientPDF> <serverPDF> [options]');
    console.log('\nOptions:');
    console.log('  --output-dir <dir>     Output directory (default: ./comparison-output)');
    console.log('  --threshold <number>   Pixel difference threshold 0-1 (default: 0.1)');
    console.log('  --dpi <number>         DPI for conversion (default: 150)');
    console.log('  --page <number>        Specific page to compare (0-based, default: all)');
    console.log('\nExample:');
    console.log('  node visual-pdf-comparison.js client.pdf server.pdf');
    console.log('  node visual-pdf-comparison.js client.pdf server.pdf --page 0 --dpi 300');
    process.exit(1);
  }
  
  const clientPDFPath = path.resolve(files[0]);
  const serverPDFPath = path.resolve(files[1]);
  
  try {
    const result = await comparePDFsVisually(clientPDFPath, serverPDFPath, options);
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { comparePDFsVisually, pdfPageToImageImproved, compareImages };
