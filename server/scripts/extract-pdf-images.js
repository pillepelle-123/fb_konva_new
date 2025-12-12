/**
 * Extrahiert und analysiert Bilder aus PDF-Dateien
 * 
 * Verwendung:
 * node server/scripts/extract-pdf-images.js <pdf1> <pdf2>
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');

async function extractImagesFromPDF(pdfPath) {
  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    const images = [];
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      
      // Versuche, Bilder von der Seite zu extrahieren
      // pdf-lib hat keine direkte Methode, aber wir können die Content-Stream analysieren
      const pageDict = page.node;
      
      // Versuche, eingebettete Bilder zu finden
      // Dies ist eine vereinfachte Methode - pdf-lib hat keine direkte Bild-Extraktion
      images.push({
        pageNumber: i + 1,
        pageWidth: width,
        pageHeight: height,
        note: 'Bild-Extraktion aus pdf-lib ist begrenzt'
      });
    }
    
    return {
      filePath: pdfPath,
      fileName: path.basename(pdfPath),
      pageCount: pages.length,
      images: images
    };
  } catch (error) {
    console.error(`Fehler beim Analysieren von ${pdfPath}:`, error.message);
    return null;
  }
}

async function analyzePDFImages(pdfPath, outputDir) {
  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Versuche, alle eingebetteten Bilder zu finden
    // pdf-lib hat keine direkte Methode, aber wir können die Dokument-Struktur analysieren
    const imageInfo = [];
    
    // Durchsuche alle Objekte im PDF nach Bildern
    const pdfDict = pdfDoc.context;
    
    // Versuche, Bilder über die Seiten zu finden
    const pages = pdfDoc.getPages();
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      
      // Versuche, Bilder zu extrahieren (dies ist eine vereinfachte Methode)
      // In einem echten PDF sind Bilder als XObject eingebettet
      imageInfo.push({
        page: i + 1,
        pageWidth: width,
        pageHeight: height,
        imagesFound: 'Bild-Extraktion aus pdf-lib ist komplex'
      });
    }
    
    return {
      pdfPath: pdfPath,
      fileName: path.basename(pdfPath),
      pageCount: pages.length,
      imageInfo: imageInfo
    };
  } catch (error) {
    console.error(`Fehler beim Analysieren von ${pdfPath}:`, error.message);
    throw error;
  }
}

async function comparePDFImages(pdf1Path, pdf2Path) {
  console.log('='.repeat(80));
  console.log('PDF Bild-Analyse');
  console.log('='.repeat(80));
  console.log('');
  
  // Lade beide PDFs
  const pdf1Bytes = await fs.readFile(pdf1Path);
  const pdf2Bytes = await fs.readFile(pdf2Path);
  
  const pdf1Doc = await PDFDocument.load(pdf1Bytes);
  const pdf2Doc = await PDFDocument.load(pdf2Bytes);
  
  console.log('📄 PDF 1:', path.basename(pdf1Path));
  console.log(`   Dateigröße: ${(pdf1Bytes.length / 1024).toFixed(2)} KB`);
  console.log(`   Seiten: ${pdf1Doc.getPageCount()}`);
  console.log('');
  
  console.log('📄 PDF 2:', path.basename(pdf2Path));
  console.log(`   Dateigröße: ${(pdf2Bytes.length / 1024).toFixed(2)} KB`);
  console.log(`   Seiten: ${pdf2Doc.getPageCount()}`);
  console.log('');
  
  // Versuche, Bilder zu extrahieren und zu analysieren
  console.log('🔍 Analysiere eingebettete Bilder...');
  console.log('');
  
  // Extrahiere Bilder aus beiden PDFs
  const pages1 = pdf1Doc.getPages();
  const pages2 = pdf2Doc.getPages();
  
  const minPages = Math.min(pages1.length, pages2.length);
  
  for (let i = 0; i < minPages; i++) {
    const page1 = pages1[i];
    const page2 = pages2[i];
    
    const { width: w1, height: h1 } = page1.getSize();
    const { width: w2, height: h2 } = page2.getSize();
    
    console.log(`📄 Seite ${i + 1}:`);
    console.log(`   PDF 1: ${w1.toFixed(2)} x ${h1.toFixed(2)} pt`);
    console.log(`   PDF 2: ${w2.toFixed(2)} x ${h2.toFixed(2)} pt`);
    
    // Versuche, Bilder zu finden (vereinfacht)
    // In einem echten PDF sind Bilder als XObject eingebettet
    // pdf-lib hat keine direkte Methode zur Bild-Extraktion
    
    // Berechne erwartete Bildgröße basierend auf DPI
    // A4 bei 300 DPI = 2480 x 3508 Pixel
    // A4 bei 200 DPI = 1653 x 2339 Pixel
    // A4 bei 150 DPI = 1240 x 1754 Pixel
    // A4 bei 72 DPI = 595 x 842 Pixel
    
    const pageWidthPt = w1;
    const pageHeightPt = h1;
    
    console.log(`   Erwartete Bildgrößen (basierend auf DPI):`);
    console.log(`     72 DPI:  ${Math.round(pageWidthPt)} x ${Math.round(pageHeightPt)} px`);
    console.log(`     150 DPI: ${Math.round(pageWidthPt * 150/72)} x ${Math.round(pageHeightPt * 150/72)} px`);
    console.log(`     200 DPI: ${Math.round(pageWidthPt * 200/72)} x ${Math.round(pageHeightPt * 200/72)} px`);
    console.log(`     300 DPI: ${Math.round(pageWidthPt * 300/72)} x ${Math.round(pageHeightPt * 300/72)} px`);
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('');
  console.log('💡 Hinweis: pdf-lib hat keine direkte Methode zur Bild-Extraktion.');
  console.log('   Für eine detaillierte Analyse müssten wir ein Tool wie pdf.js');
  console.log('   oder pdfium verwenden.');
  console.log('');
  console.log('📋 Alternative Analyse-Methoden:');
  console.log('   1. PDFs in Bilder konvertieren (z.B. mit ImageMagick oder Ghostscript)');
  console.log('   2. Bilder manuell extrahieren und analysieren');
  console.log('   3. PDF-Struktur mit einem PDF-Analyse-Tool untersuchen');
  console.log('');
}

// Hauptfunktion
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Verwendung: node extract-pdf-images.js <pdf1> <pdf2>');
    process.exit(1);
  }
  
  const pdf1Path = path.resolve(args[0]);
  const pdf2Path = path.resolve(args[1]);
  
  comparePDFImages(pdf1Path, pdf2Path)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('[ERROR] Unerwarteter Fehler:', error);
      process.exit(1);
    });
}

module.exports = { comparePDFImages, extractImagesFromPDF };

