/**
 * Test-Skript für PDF-Export mit Debugging-Logs
 * Generiert ein Test-PDF und zeigt alle Debugging-Logs
 * 
 * Verwendung:
 * node server/scripts/test-pdf-debug.js
 */

const { generatePDFFromBook } = require('../services/pdf-export');
const path = require('path');
const fs = require('fs').promises;

// Test-Buch-Daten mit allen kritischen Elementen
const testBookData = {
  id: 999,
  name: 'Debug Test Book',
  pageSize: 'A4',
  orientation: 'portrait',
  colorPaletteId: null,
  theme: 'rough', // Rough Theme für Book-Level
  pages: [
    {
      id: 1,
      pageNumber: 1,
      background: {
        type: 'image',
        value: 'https://example.com/test-background.jpg', // Test-URL - wird fehlschlagen, aber Logs zeigen das Problem
        backgroundImageTemplateId: null,
        opacity: 0.8,
        imageSize: 'cover',
        backgroundColorEnabled: false
      },
      elements: [
            {
              id: 'rect-1',
              type: 'rect',
              x: 50,
              y: 50,
              width: 200,
              height: 150,
              fill: '#EF4444', // Helles Rot für besseren Kontrast
              stroke: '#1a1a1a', // Dunkles Grau statt Schwarz
              strokeWidth: 2,
              theme: 'rough', // Rough Theme für Rect
              rotation: 0,
              opacity: 1,
              zIndex: 1
            },
            {
              id: 'circle-1',
              type: 'circle',
              x: 300,
              y: 50,
              width: 150,
              height: 150,
              fill: '#10B981', // Helles Grün für besseren Kontrast
              stroke: '#1a1a1a', // Dunkles Grau statt Schwarz
              strokeWidth: 2,
              theme: 'rough', // Rough Theme für Circle
              rotation: 0,
              opacity: 1,
              zIndex: 2
            },
            {
              id: 'qna-inline-1',
              type: 'text',
              textType: 'qna_inline',
              x: 50,
              y: 250,
              width: 400,
              height: 300,
              questionText: 'Was ist dein Name?',
              answerText: 'Mein Name ist Test',
              ruledLines: true, // Ruled Lines aktiviert
              ruledLinesTheme: 'rough',
              ruledLinesColor: '#1f2937',
              backgroundEnabled: true, // Background Fill aktiviert
              backgroundColor: '#E8F4F8', // Helles Blau für besseren Kontrast
              backgroundOpacity: 1.0, // Volle Opacity für bessere Sichtbarkeit
              padding: 10,
              layoutVariant: 'inline',
              questionOrder: 1,
              rotation: 0,
              opacity: 1,
              zIndex: 0,
              questionSettings: {
                fontSize: 16,
                fontFamily: 'Arial, sans-serif',
                fontColor: '#1a1a1a', // Dunkles Grau für besseren Kontrast
                paragraphSpacing: 'medium'
              },
              answerSettings: {
                fontSize: 14,
                fontFamily: 'Arial, sans-serif',
                fontColor: '#1a1a1a', // Dunkles Grau für besseren Kontrast
                paragraphSpacing: 'medium'
              }
            },
            {
              id: 'shape-1',
              type: 'rect',
              x: 100,
              y: 300,
              width: 100,
              height: 100,
              fill: '#3B82F6', // Helles Blau für besseren Kontrast
              stroke: '#1a1a1a', // Dunkles Grau statt Schwarz
              strokeWidth: 1,
              theme: 'default',
              rotation: 0,
              opacity: 1,
              zIndex: 3 // Höherer Z-Index als QnA Inline
            }
      ]
    },
        {
          id: 2,
          pageNumber: 2,
          background: {
            type: 'color',
            value: '#F5F5F5', // Helleres Grau für besseren Kontrast
            opacity: 1.0
          },
      elements: [
            {
              id: 'qna-inline-2',
              type: 'text',
              textType: 'qna_inline',
              x: 50,
              y: 50,
              width: 400,
              height: 200,
              questionText: 'Test Frage',
              answerText: 'Test Antwort',
              ruledLines: false, // Ruled Lines deaktiviert (zum Vergleich)
              backgroundEnabled: false, // Background Fill deaktiviert (zum Vergleich)
              padding: 10,
              layoutVariant: 'inline',
              questionOrder: 1,
              rotation: 0,
              opacity: 1,
              zIndex: 0,
              questionSettings: {
                fontSize: 16,
                fontFamily: 'Arial, sans-serif',
                fontColor: '#1a1a1a', // Dunkles Grau für besseren Kontrast
                paragraphSpacing: 'medium'
              },
              answerSettings: {
                fontSize: 14,
                fontFamily: 'Arial, sans-serif',
                fontColor: '#1a1a1a', // Dunkles Grau für besseren Kontrast
                paragraphSpacing: 'medium'
              }
            }
      ]
    }
  ]
};

async function testPDFExport() {
  console.log('='.repeat(80));
  console.log('PDF Export Debug Test');
  console.log('='.repeat(80));
  console.log('');
  console.log('Dieses Skript generiert ein Test-PDF mit Debugging-Logs.');
  console.log('Alle Logs mit [DEBUG] Präfix werden in der Konsole ausgegeben.');
  console.log('');
  console.log('Test-Buch enthält:');
  console.log('- Rect mit Rough Theme');
  console.log('- Circle mit Rough Theme');
  console.log('- QnA Inline mit Ruled Lines');
  console.log('- QnA Inline mit Background Fill');
  console.log('- Shape mit höherem Z-Index (Test für Z-Index-Sortierung)');
  console.log('- Page mit Image Background (wird fehlschlagen, zeigt aber Logs)');
  console.log('- Page mit Color Background (Opacity < 1)');
  console.log('');
  console.log('='.repeat(80));
  console.log('');

  try {
    const exportId = 999;
    const options = {
      quality: 'preview',
      pageRange: 'all'
    };

    let progressCount = 0;
    const updateProgress = (progress) => {
      progressCount++;
      if (progressCount % 10 === 0 || progress === 100) {
        console.log(`[PROGRESS] PDF Export Progress: ${progress}%`);
      }
    };

    console.log('[INFO] Starting PDF export...');
    console.log('[INFO] Looking for [DEBUG] logs below...');
    console.log('[INFO] Filter logs by searching for "[DEBUG" in the output');
    console.log('');

    const pdfPath = await generatePDFFromBook(testBookData, options, exportId, updateProgress);

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ PDF Export erfolgreich!');
    console.log('='.repeat(80));
    console.log('');
    console.log(`PDF gespeichert unter: ${pdfPath}`);
    console.log('');
    console.log('Bitte prüfen Sie die [DEBUG] Logs oben, um Probleme zu identifizieren.');
    console.log('');

    // Versuche, die Log-Datei zu erstellen (falls gewünscht)
    const logFilePath = path.join(__dirname, '../logs/debug-pdf-export.log');
    try {
      await fs.mkdir(path.dirname(logFilePath), { recursive: true });
      console.log(`[INFO] Log-Datei würde gespeichert unter: ${logFilePath}`);
    } catch (err) {
      // Ignore if log directory doesn't exist
    }

  } catch (error) {
    console.error('');
    console.error('='.repeat(80));
    console.error('❌ PDF Export fehlgeschlagen!');
    console.error('='.repeat(80));
    console.error('');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('');
    console.error('Bitte prüfen Sie die [DEBUG] Logs oben, um das Problem zu identifizieren.');
    console.error('');
    process.exit(1);
  }
}

// Hauptfunktion
if (require.main === module) {
  testPDFExport()
    .then(() => {
      console.log('[INFO] Test abgeschlossen.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[ERROR] Unerwarteter Fehler:', error);
      process.exit(1);
    });
}

module.exports = { testPDFExport, testBookData };

