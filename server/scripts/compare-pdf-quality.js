/**
 * Vergleicht zwei PDF-Dateien hinsichtlich Bildqualität
 * 
 * Verwendung:
 * node server/scripts/compare-pdf-quality.js <pdf1> <pdf2>
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function analyzePDF(pdfPath) {
  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    const info = {
      fileSize: pdfBytes.length,
      pageCount: pages.length,
      pages: []
    };
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      
      // Versuche, eingebettete Bilder zu finden
      const pageDict = page.node;
      const contentStream = pageDict.get('Contents');
      
      info.pages.push({
        pageNumber: i + 1,
        width: width.toFixed(2),
        height: height.toFixed(2),
        widthMm: (width / 72 * 25.4).toFixed(2),
        heightMm: (height / 72 * 25.4).toFixed(2)
      });
    }
    
    return info;
  } catch (error) {
    console.error(`Fehler beim Analysieren von ${pdfPath}:`, error.message);
    return null;
  }
}

async function comparePDFs(pdf1Path, pdf2Path) {
  console.log('='.repeat(80));
  console.log('PDF Qualitätsvergleich');
  console.log('='.repeat(80));
  console.log('');
  
  const info1 = await analyzePDF(pdf1Path);
  const info2 = await analyzePDF(pdf2Path);
  
  if (!info1 || !info2) {
    console.error('Fehler beim Laden der PDFs');
    process.exit(1);
  }
  
  console.log('📄 PDF 1:', path.basename(pdf1Path));
  console.log(`   Dateigröße: ${(info1.fileSize / 1024).toFixed(2)} KB`);
  console.log(`   Seiten: ${info1.pageCount}`);
  console.log('');
  
  console.log('📄 PDF 2:', path.basename(pdf2Path));
  console.log(`   Dateigröße: ${(info2.fileSize / 1024).toFixed(2)} KB`);
  console.log(`   Seiten: ${info2.pageCount}`);
  console.log('');
  
  console.log('📊 Vergleich:');
  console.log(`   Dateigröße: ${info1.fileSize === info2.fileSize ? '✅ Identisch' : `❌ Unterschiedlich (${((info2.fileSize - info1.fileSize) / 1024).toFixed(2)} KB)`}`);
  console.log(`   Seitenanzahl: ${info1.pageCount === info2.pageCount ? '✅ Identisch' : '❌ Unterschiedlich'}`);
  console.log('');
  
  if (info1.pages.length > 0 && info2.pages.length > 0) {
    console.log('📐 Seitendimensionen:');
    for (let i = 0; i < Math.min(info1.pages.length, info2.pages.length); i++) {
      const p1 = info1.pages[i];
      const p2 = info2.pages[i];
      console.log(`   Seite ${i + 1}:`);
      console.log(`     PDF 1: ${p1.width} x ${p1.height} pt (${p1.widthMm} x ${p1.heightMm} mm)`);
      console.log(`     PDF 2: ${p2.width} x ${p2.height} pt (${p2.widthMm} x ${p2.heightMm} mm)`);
      const widthMatch = p1.width === p2.width;
      const heightMatch = p1.height === p2.height;
      console.log(`     Dimensionen: ${widthMatch && heightMatch ? '✅ Identisch' : '❌ Unterschiedlich'}`);
    }
  }
  
  console.log('');
  console.log('='.repeat(80));
  console.log('');
  console.log('💡 Hinweis: Für eine visuelle Qualitätsprüfung müssen die PDFs');
  console.log('   manuell geöffnet und verglichen werden. Die Dateigröße allein');
  console.log('   ist kein zuverlässiger Indikator für Bildqualität.');
  console.log('');
  console.log('📋 Empfohlene Prüfpunkte:');
  console.log('   1. Schärfe von Text und Linien');
  console.log('   2. Klarheit von Bildern und Grafiken');
  console.log('   3. Farbgenauigkeit');
  console.log('   4. Fehlen von Artefakten oder Komprimierungsfehlern');
  console.log('');
}

// Hauptfunktion
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Verwendung: node compare-pdf-quality.js <pdf1> <pdf2>');
    process.exit(1);
  }
  
  const pdf1Path = path.resolve(args[0]);
  const pdf2Path = path.resolve(args[1]);
  
  comparePDFs(pdf1Path, pdf2Path)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('[ERROR] Unerwarteter Fehler:', error);
      process.exit(1);
    });
}

module.exports = { comparePDFs, analyzePDF };

