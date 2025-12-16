/**
 * Analysiert die PDF-Struktur, um Informationen über eingebettete Bilder zu erhalten
 * 
 * Verwendung:
 * node server/scripts/analyze-pdf-structure.js <pdf1> <pdf2>
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

function findImageObjects(pdfBytes) {
  const pdfString = pdfBytes.toString('binary');
  const images = [];
  
  // Suche nach XObject-Referenzen (Bilder werden oft als XObject eingebettet)
  const xObjectPattern = /\/XObject\s*<<([^>]*)>>/g;
  let match;
  
  while ((match = xObjectPattern.exec(pdfString)) !== null) {
    const xObjectContent = match[1];
    // Suche nach Bild-Objekten
    const imageRefPattern = /\/Im(\d+)\s+(\d+)\s+0\s+R/g;
    let imageMatch;
    
    while ((imageMatch = imageRefPattern.exec(xObjectContent)) !== null) {
      images.push({
        name: `Im${imageMatch[1]}`,
        objectNumber: parseInt(imageMatch[2])
      });
    }
  }
  
  // Suche nach Bild-Daten direkt im PDF
  const imageDataPattern = /\/Width\s+(\d+).*?\/Height\s+(\d+).*?\/BitsPerComponent\s+(\d+).*?\/ColorSpace\s*\/(\w+)/gs;
  const imageMatches = [];
  let imgMatch;
  
  while ((imgMatch = imageDataPattern.exec(pdfString)) !== null) {
    imageMatches.push({
      width: parseInt(imgMatch[1]),
      height: parseInt(imgMatch[2]),
      bitsPerComponent: parseInt(imgMatch[3]),
      colorSpace: imgMatch[4]
    });
  }
  
  return {
    xObjects: images,
    imageData: imageMatches
  };
}

async function analyzePDFStructure(pdfPath) {
  const pdfBytes = await fs.promises.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const pages = pdfDoc.getPages();
  const pageInfo = [];
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    
    pageInfo.push({
      pageNumber: i + 1,
      width: width,
      height: height,
      widthMm: (width / 72 * 25.4).toFixed(2),
      heightMm: (height / 72 * 25.4).toFixed(2)
    });
  }
  
  // Analysiere PDF-Rohdaten
  const imageInfo = findImageObjects(pdfBytes);
  
  return {
    fileName: path.basename(pdfPath),
    fileSize: pdfBytes.length,
    pageCount: pages.length,
    pages: pageInfo,
    images: imageInfo
  };
}

async function comparePDFs(pdf1Path, pdf2Path) {
  console.log('='.repeat(80));
  console.log('PDF Struktur-Analyse');
  console.log('='.repeat(80));
  console.log('');
  
  const info1 = await analyzePDFStructure(pdf1Path);
  const info2 = await analyzePDFStructure(pdf2Path);
  
  console.log('📄 PDF 1:', info1.fileName);
  console.log(`   Dateigröße: ${(info1.fileSize / 1024).toFixed(2)} KB`);
  console.log(`   Seiten: ${info1.pageCount}`);
  console.log(`   Gefundene XObjects: ${info1.images.xObjects.length}`);
  console.log(`   Gefundene Bild-Daten: ${info1.images.imageData.length}`);
  console.log('');
  
  console.log('📄 PDF 2:', info2.fileName);
  console.log(`   Dateigröße: ${(info2.fileSize / 1024).toFixed(2)} KB`);
  console.log(`   Seiten: ${info2.pageCount}`);
  console.log(`   Gefundene XObjects: ${info2.images.xObjects.length}`);
  console.log(`   Gefundene Bild-Daten: ${info2.images.imageData.length}`);
  console.log('');
  
  if (info1.images.imageData.length > 0) {
    console.log('🖼️  PDF 1 - Bild-Informationen:');
    info1.images.imageData.forEach((img, idx) => {
      console.log(`   Bild ${idx + 1}:`);
      console.log(`     Dimensionen: ${img.width} x ${img.height} Pixel`);
      console.log(`     Bits pro Komponente: ${img.bitsPerComponent}`);
      console.log(`     Farbraum: ${img.colorSpace}`);
      
      // Berechne geschätzte DPI
      const a4WidthInch = 8.27;
      const a4HeightInch = 11.69;
      const dpiWidth = Math.round(img.width / a4WidthInch);
      const dpiHeight = Math.round(img.height / a4HeightInch);
      console.log(`     Geschätzte DPI: ~${dpiWidth} (Breite) / ~${dpiHeight} (Höhe)`);
      console.log('');
    });
  }
  
  if (info2.images.imageData.length > 0) {
    console.log('🖼️  PDF 2 - Bild-Informationen:');
    info2.images.imageData.forEach((img, idx) => {
      console.log(`   Bild ${idx + 1}:`);
      console.log(`     Dimensionen: ${img.width} x ${img.height} Pixel`);
      console.log(`     Bits pro Komponente: ${img.bitsPerComponent}`);
      console.log(`     Farbraum: ${img.colorSpace}`);
      
      // Berechne geschätzte DPI
      const a4WidthInch = 8.27;
      const a4HeightInch = 11.69;
      const dpiWidth = Math.round(img.width / a4WidthInch);
      const dpiHeight = Math.round(img.height / a4HeightInch);
      console.log(`     Geschätzte DPI: ~${dpiWidth} (Breite) / ~${dpiHeight} (Höhe)`);
      console.log('');
    });
  }
  
  // Vergleich
  console.log('='.repeat(80));
  console.log('📊 Vergleich:');
  console.log('');
  
  if (info1.images.imageData.length > 0 && info2.images.imageData.length > 0) {
    const img1 = info1.images.imageData[0];
    const img2 = info2.images.imageData[0];
    
    const widthMatch = img1.width === img2.width;
    const heightMatch = img1.height === img2.height;
    
    console.log(`   Bild-Dimensionen: ${widthMatch && heightMatch ? '✅ Identisch' : '❌ Unterschiedlich'}`);
    if (!widthMatch || !heightMatch) {
      console.log(`     PDF 1: ${img1.width} x ${img1.height} Pixel`);
      console.log(`     PDF 2: ${img2.width} x ${img2.height} Pixel`);
      
      const a4WidthInch = 8.27;
      const dpi1 = Math.round(img1.width / a4WidthInch);
      const dpi2 = Math.round(img2.width / a4WidthInch);
      
      console.log('');
      console.log(`   Geschätzte DPI:`);
      console.log(`     PDF 1: ~${dpi1} DPI`);
      console.log(`     PDF 2: ~${dpi2} DPI`);
      console.log('');
      
      if (dpi1 > dpi2) {
        console.log(`   ⭐ PDF 1 hat höhere Auflösung → sollte bessere Qualität haben`);
      } else if (dpi2 > dpi1) {
        console.log(`   ⭐ PDF 2 hat höhere Auflösung → sollte bessere Qualität haben`);
      } else {
        console.log(`   ⭐ Beide PDFs haben ähnliche Auflösung → Qualität sollte ähnlich sein`);
      }
    }
  } else {
    console.log('   ⚠️  Konnte Bild-Informationen nicht extrahieren');
    console.log('   → Beide PDFs haben identische Dateigröße');
    console.log('   → Für Qualitätsvergleich: PDFs manuell öffnen und visuell vergleichen');
  }
  
  console.log('');
  console.log('='.repeat(80));
}

// Hauptfunktion
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Verwendung: node analyze-pdf-structure.js <pdf1> <pdf2>');
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
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { analyzePDFStructure, comparePDFs };



