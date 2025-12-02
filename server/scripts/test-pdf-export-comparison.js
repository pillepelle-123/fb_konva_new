/**
 * Test script to compare Browser and Server PDF exports
 * 
 * Usage:
 *   node server/scripts/test-pdf-export-comparison.js <bookId> [pageNumber]
 * 
 * This script:
 * 1. Creates a browser export (requires manual export first)
 * 2. Creates a server export
 * 3. Compares the results (basic file size and page count comparison)
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function getPDFInfo(pdfPath) {
  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    // CRITICAL: pdf-lib getWidth()/getHeight() return values in POINTS, not mm!
    // 1 point = 1/72 inch = 0.352778 mm
    const PT_TO_MM = 0.352778;
    
    return {
      pageCount: pages.length,
      fileSize: pdfBytes.length,
      firstPageSize: pages[0] ? {
        width: pages[0].getWidth() * PT_TO_MM,  // Convert points to mm
        height: pages[0].getHeight() * PT_TO_MM  // Convert points to mm
      } : null
    };
  } catch (error) {
    console.error(`Error reading PDF ${pdfPath}:`, error.message);
    return null;
  }
}

async function comparePDFs(browserPDFPath, serverPDFPath) {
  console.log('\n=== PDF Export Comparison ===\n');
  
  const browserInfo = await getPDFInfo(browserPDFPath);
  const serverInfo = await getPDFInfo(serverPDFPath);
  
  if (!browserInfo || !serverInfo) {
    console.error('Failed to read one or both PDFs');
    return false;
  }
  
  console.log('Browser Export:');
  console.log(`  File: ${browserPDFPath}`);
  console.log(`  Size: ${(browserInfo.fileSize / 1024).toFixed(2)} KB`);
  console.log(`  Pages: ${browserInfo.pageCount}`);
  if (browserInfo.firstPageSize) {
    console.log(`  First Page: ${browserInfo.firstPageSize.width.toFixed(2)} x ${browserInfo.firstPageSize.height.toFixed(2)} mm`);
  }
  
  console.log('\nServer Export:');
  console.log(`  File: ${serverPDFPath}`);
  console.log(`  Size: ${(serverInfo.fileSize / 1024).toFixed(2)} KB`);
  console.log(`  Pages: ${serverInfo.pageCount}`);
  if (serverInfo.firstPageSize) {
    console.log(`  First Page: ${serverInfo.firstPageSize.width.toFixed(2)} x ${serverInfo.firstPageSize.height.toFixed(2)} mm`);
  }
  
  console.log('\n=== Comparison Results ===\n');
  
  let allMatch = true;
  
  // Compare page count
  if (browserInfo.pageCount !== serverInfo.pageCount) {
    console.log(`❌ Page count mismatch: Browser=${browserInfo.pageCount}, Server=${serverInfo.pageCount}`);
    allMatch = false;
  } else {
    console.log(`✅ Page count matches: ${browserInfo.pageCount} pages`);
  }
  
  // Compare first page size (with tolerance)
  if (browserInfo.firstPageSize && serverInfo.firstPageSize) {
    const widthDiff = Math.abs(browserInfo.firstPageSize.width - serverInfo.firstPageSize.width);
    const heightDiff = Math.abs(browserInfo.firstPageSize.height - serverInfo.firstPageSize.height);
    const tolerance = 0.1; // 0.1mm tolerance
    
    if (widthDiff > tolerance || heightDiff > tolerance) {
      console.log(`❌ Page size mismatch:`);
      console.log(`   Browser: ${browserInfo.firstPageSize.width.toFixed(2)} x ${browserInfo.firstPageSize.height.toFixed(2)} mm`);
      console.log(`   Server: ${serverInfo.firstPageSize.width.toFixed(2)} x ${serverInfo.firstPageSize.height.toFixed(2)} mm`);
      console.log(`   Difference: ${widthDiff.toFixed(2)} x ${heightDiff.toFixed(2)} mm`);
      allMatch = false;
    } else {
      console.log(`✅ Page size matches: ${browserInfo.firstPageSize.width.toFixed(2)} x ${browserInfo.firstPageSize.height.toFixed(2)} mm`);
    }
  }
  
  // Compare file size (with tolerance - file size can vary due to compression)
  const sizeDiff = Math.abs(browserInfo.fileSize - serverInfo.fileSize);
  const sizeDiffPercent = (sizeDiff / Math.max(browserInfo.fileSize, serverInfo.fileSize)) * 100;
  
  if (sizeDiffPercent > 10) { // More than 10% difference
    console.log(`⚠️  File size difference: ${sizeDiffPercent.toFixed(2)}%`);
    console.log(`   This might indicate rendering differences, but could also be due to compression`);
  } else {
    console.log(`✅ File size similar: ${sizeDiffPercent.toFixed(2)}% difference`);
  }
  
  console.log('\n=== Summary ===\n');
  
  if (allMatch) {
    console.log('✅ Basic comparison passed!');
    console.log('⚠️  Note: This is only a basic comparison. Visual inspection is still required.');
  } else {
    console.log('❌ Basic comparison failed!');
    console.log('⚠️  Visual inspection required to identify differences.');
  }
  
  return allMatch;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node test-pdf-export-comparison.js <browserPDFPath> <serverPDFPath>');
    console.log('\nExample:');
    console.log('  node test-pdf-export-comparison.js ./browser-export.pdf ./server-export.pdf');
    process.exit(1);
  }
  
  const browserPDFPath = path.resolve(args[0]);
  const serverPDFPath = path.resolve(args[1]);
  
  // Check if files exist
  try {
    await fs.access(browserPDFPath);
    await fs.access(serverPDFPath);
  } catch (error) {
    console.error('Error: One or both PDF files not found');
    console.error(`Browser PDF: ${browserPDFPath}`);
    console.error(`Server PDF: ${serverPDFPath}`);
    process.exit(1);
  }
  
  const result = await comparePDFs(browserPDFPath, serverPDFPath);
  process.exit(result ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { comparePDFs, getPDFInfo };

