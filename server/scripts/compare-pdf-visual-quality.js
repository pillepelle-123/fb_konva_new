/**
 * Vergleicht zwei PDFs visuell, indem sie zu Bildern konvertiert werden
 * 
 * Verwendung:
 * node server/scripts/compare-pdf-visual-quality.js <pdf1> <pdf2>
 */

const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');
const sharp = require('sharp');

async function pdfToImage(pdfPath, pageNumber = 0, dpi = 300) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Setze Viewport für hohe Qualität
    await page.setViewport({
      width: 2480,
      height: 3508,
      deviceScaleFactor: 1
    });
    
    // Lade PDF
    const pdfUrl = `file://${path.resolve(pdfPath)}`;
    await page.goto(pdfUrl, { waitUntil: 'networkidle0' });
    
    // Warte kurz, damit alles geladen ist
    await page.waitForTimeout(1000);
    
    // Screenshot mit hoher Qualität
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: true
    });
    
    return screenshot;
  } finally {
    await browser.close();
  }
}

async function analyzeImage(imageBuffer, label) {
  const metadata = await sharp(imageBuffer).metadata();
  
  return {
    label: label,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: imageBuffer.length,
    channels: metadata.channels,
    hasAlpha: metadata.hasAlpha,
    density: metadata.density
  };
}

async function comparePDFs(pdf1Path, pdf2Path) {
  console.log('='.repeat(80));
  console.log('PDF Visuelle Qualitätsvergleich');
  console.log('='.repeat(80));
  console.log('');
  
  console.log('📄 PDF 1:', path.basename(pdf1Path));
  console.log('📄 PDF 2:', path.basename(pdf2Path));
  console.log('');
  
  console.log('🔄 Konvertiere PDFs zu Bildern...');
  
  try {
    // Konvertiere beide PDFs zu Bildern
    console.log('   Konvertiere PDF 1...');
    const image1 = await pdfToImage(pdf1Path, 0, 300);
    
    console.log('   Konvertiere PDF 2...');
    const image2 = await pdfToImage(pdf2Path, 0, 300);
    
    console.log('   ✓ Konvertierung abgeschlossen');
    console.log('');
    
    // Analysiere Bilder
    console.log('🔍 Analysiere Bilder...');
    const info1 = await analyzeImage(image1, 'PDF 1');
    const info2 = await analyzeImage(image2, 'PDF 2');
    
    console.log('');
    console.log('📊 Bild-Informationen:');
    console.log('');
    console.log(`📄 ${info1.label}:`);
    console.log(`   Dimensionen: ${info1.width} x ${info1.height} Pixel`);
    console.log(`   Format: ${info1.format}`);
    console.log(`   Größe: ${(info1.size / 1024).toFixed(2)} KB`);
    console.log(`   Kanäle: ${info1.channels}`);
    console.log(`   Alpha-Kanal: ${info1.hasAlpha ? 'Ja' : 'Nein'}`);
    console.log('');
    
    console.log(`📄 ${info2.label}:`);
    console.log(`   Dimensionen: ${info2.width} x ${info2.height} Pixel`);
    console.log(`   Format: ${info2.format}`);
    console.log(`   Größe: ${(info2.size / 1024).toFixed(2)} KB`);
    console.log(`   Kanäle: ${info2.channels}`);
    console.log(`   Alpha-Kanal: ${info2.hasAlpha ? 'Ja' : 'Nein'}`);
    console.log('');
    
    // Vergleich
    console.log('📊 Vergleich:');
    const widthMatch = info1.width === info2.width;
    const heightMatch = info1.height === info2.height;
    const sizeDiff = Math.abs(info1.size - info2.size);
    const sizeDiffPercent = ((sizeDiff / Math.max(info1.size, info2.size)) * 100).toFixed(2);
    
    console.log(`   Dimensionen: ${widthMatch && heightMatch ? '✅ Identisch' : '❌ Unterschiedlich'}`);
    if (!widthMatch || !heightMatch) {
      console.log(`     PDF 1: ${info1.width} x ${info1.height}`);
      console.log(`     PDF 2: ${info2.width} x ${info2.height}`);
    }
    console.log(`   Dateigröße: ${sizeDiff < 1000 ? '✅ Sehr ähnlich' : `❌ Unterschiedlich (${sizeDiffPercent}%)`}`);
    console.log('');
    
    // Speichere Bilder für manuelle Prüfung
    const outputDir = path.join(__dirname, '..', '..', 'comparison-output');
    await fs.mkdir(outputDir, { recursive: true });
    
    const image1Path = path.join(outputDir, 'pdf1_image.png');
    const image2Path = path.join(outputDir, 'pdf2_image.png');
    
    await fs.writeFile(image1Path, image1);
    await fs.writeFile(image2Path, image2);
    
    console.log('💾 Bilder gespeichert:');
    console.log(`   ${image1Path}`);
    console.log(`   ${image2Path}`);
    console.log('');
    
    // Berechne DPI basierend auf Bildgröße
    // A4 = 210mm x 297mm = 8.27" x 11.69"
    const a4WidthInch = 8.27;
    const a4HeightInch = 11.69;
    
    const dpi1Width = Math.round(info1.width / a4WidthInch);
    const dpi1Height = Math.round(info1.height / a4HeightInch);
    const dpi2Width = Math.round(info2.width / a4WidthInch);
    const dpi2Height = Math.round(info2.height / a4HeightInch);
    
    console.log('📐 Geschätzte DPI (basierend auf A4):');
    console.log(`   PDF 1: ~${dpi1Width} DPI (Breite) / ~${dpi1Height} DPI (Höhe)`);
    console.log(`   PDF 2: ~${dpi2Width} DPI (Breite) / ~${dpi2Height} DPI (Höhe)`);
    console.log('');
    
    // Qualitätsbewertung
    console.log('⭐ Qualitätsbewertung:');
    if (dpi1Width > dpi2Width) {
      console.log(`   📄 PDF 1 hat höhere Auflösung (${dpi1Width} vs ${dpi2Width} DPI)`);
      console.log(`   → PDF 1 sollte bessere Bildqualität haben`);
    } else if (dpi2Width > dpi1Width) {
      console.log(`   📄 PDF 2 hat höhere Auflösung (${dpi2Width} vs ${dpi1Width} DPI)`);
      console.log(`   → PDF 2 sollte bessere Bildqualität haben`);
    } else {
      console.log(`   📄 Beide PDFs haben ähnliche Auflösung`);
      console.log(`   → Qualität sollte ähnlich sein`);
    }
    console.log('');
    
    console.log('='.repeat(80));
    console.log('');
    console.log('💡 Tipp: Öffnen Sie die gespeicherten Bilder für eine visuelle Prüfung.');
    console.log('');
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Hauptfunktion
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Verwendung: node compare-pdf-visual-quality.js <pdf1> <pdf2>');
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

module.exports = { comparePDFs, pdfToImage };



