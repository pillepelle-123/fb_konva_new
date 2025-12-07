/**
 * Visuelle Prüfung des generierten Test-PDFs
 * Erstellt Screenshots und analysiert das PDF
 * 
 * Verwendung:
 * node server/scripts/check-pdf-visual.js
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const PDF_PATH = path.join(__dirname, '../uploads/pdf-exports/999/999.pdf');

async function checkPDF() {
  console.log('='.repeat(80));
  console.log('PDF Visuelle Prüfung');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Prüfe ob PDF existiert
    try {
      await fs.access(PDF_PATH);
      console.log('✅ PDF gefunden:', PDF_PATH);
    } catch (error) {
      console.error('❌ PDF nicht gefunden:', PDF_PATH);
      console.error('Bitte führen Sie zuerst aus: node scripts/test-pdf-debug.js');
      process.exit(1);
    }

    // Lade PDF
    const pdfBytes = await fs.readFile(PDF_PATH);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Analysiere PDF
    const pageCount = pdfDoc.getPageCount();
    console.log('');
    console.log('📄 PDF-Informationen:');
    console.log(`   Seiten: ${pageCount}`);
    console.log(`   Titel: ${pdfDoc.getTitle() || 'Nicht gesetzt'}`);
    console.log(`   Größe: ${(pdfBytes.length / 1024).toFixed(2)} KB`);
    console.log('');

    // Prüfe jede Seite
    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();
      
      console.log(`📄 Seite ${i + 1}:`);
      console.log(`   Dimensionen: ${width.toFixed(2)} x ${height.toFixed(2)} pt`);
      console.log(`   (${(width / 72 * 25.4).toFixed(2)} x ${(height / 72 * 25.4).toFixed(2)} mm)`);
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ PDF-Analyse abgeschlossen');
    console.log('='.repeat(80));
    console.log('');
    console.log('📋 Visuelle Prüfungs-Checkliste:');
    console.log('');
    console.log('Öffnen Sie das PDF und prüfen Sie folgende Punkte:');
    console.log('');
    console.log('SEITE 1:');
    console.log('  □ Rect mit Rough Theme (rot, handgezeichnet)');
    console.log('  □ Circle mit Rough Theme (grün, handgezeichnet)');
    console.log('  □ QnA Inline mit Ruled Lines (sollte Linien haben)');
    console.log('  □ QnA Inline mit Background Fill (weißer Hintergrund)');
    console.log('  □ Shape mit höherem Z-Index (sollte über QnA Inline liegen)');
    console.log('  □ Image Background (sollte fehlschlagen, kein Bild sichtbar)');
    console.log('');
    console.log('SEITE 2:');
    console.log('  □ QnA Inline OHNE Ruled Lines (keine Linien)');
    console.log('  □ QnA Inline OHNE Background Fill (kein Hintergrund)');
    console.log('  □ Color Background mit Opacity < 1 (halbtransparent)');
    console.log('');
    console.log('ALLGEMEIN:');
    console.log('  □ Alle Elemente sind sichtbar');
    console.log('  □ Z-Index-Sortierung ist korrekt');
    console.log('  □ Keine überlappenden Elemente (außer beabsichtigt)');
    console.log('');
    console.log('='.repeat(80));
    console.log('');
    console.log('💡 Tipp: Dokumentieren Sie alle gefundenen Probleme!');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Fehler bei PDF-Prüfung:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Hauptfunktion
if (require.main === module) {
  checkPDF()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('[ERROR] Unerwarteter Fehler:', error);
      process.exit(1);
    });
}

module.exports = { checkPDF };

