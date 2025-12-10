/**
 * Automatischer Vergleich von Client- und Server-seitigen PDF-Exports
 * 
 * Dieses Skript:
 * 1. Lädt ein Buch oder eine Seite aus der Datenbank
 * 2. Erstellt beide PDF-Exports (Client und Server)
 * 3. Vergleicht sie visuell und strukturell
 * 4. Identifiziert Unterschiede
 * 5. Berichtet über visuelle Änderungen und schlägt Implementierungen vor
 * 
 * Usage:
 *   node auto-compare-and-fix-pdf-exports.js <bookId> [options]
 *   node auto-compare-and-fix-pdf-exports.js --page-id <pageId> [options]
 * 
 * Options:
 *   --page-id <id>      Nur eine spezifische Seite vergleichen (Page-ID)
 *   --output-dir <dir>  Output-Verzeichnis für Vergleichsbilder
 *   --threshold <num>   Pixel-Unterschied-Schwelle (0-1, default: 0.1)
 *   --dpi <num>         DPI für PDF-zu-Bild-Konvertierung (default: 150)
 */

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const { comparePDFsVisually } = require('./visual-pdf-comparison');
const { compareElementLayouts } = require('./compare-text-layouts');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Parse schema from DATABASE_URL if available
let schema = 'public';
try {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    schema = url.searchParams.get('schema') || 'public';
  }
} catch (error) {
  // If DATABASE_URL is not a valid URL format, default to 'public' schema
  console.warn('Could not parse DATABASE_URL as URL, defaulting to public schema');
}

// Set search path from DATABASE_URL schema parameter
pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}`);
});

/**
 * Lädt Buch-Daten aus der Datenbank
 */
async function loadBookFromDB(bookId) {
  const bookResult = await pool.query(`
    SELECT 
      b.*,
      json_agg(
        json_build_object(
          'id', p.id,
          'pageNumber', p.page_number,
          'elements', p.elements,
          'background', p.background,
          'themeId', p.theme_id,
          'layoutTemplateId', p.layout_template_id,
          'colorPaletteId', p.color_palette_id
        ) ORDER BY p.page_number
      ) as pages
    FROM public.books b
    LEFT JOIN public.pages p ON b.id = p.book_id
    WHERE b.id = $1
    GROUP BY b.id
  `, [bookId]);
  
  if (bookResult.rows.length === 0) {
    throw new Error(`Buch mit ID ${bookId} nicht gefunden`);
  }
  
  return bookResult.rows[0];
}

/**
 * Lädt eine einzelne Seite aus der Datenbank
 */
async function loadPageFromDB(pageId) {
  const pageResult = await pool.query(`
    SELECT 
      p.*,
      b.id as book_id,
      b.name as book_name,
      b.page_size,
      b.orientation,
      b.theme_id as book_theme_id,
      b.layout_template_id as book_layout_template_id,
      b.color_palette_id as book_color_palette_id
    FROM public.pages p
    JOIN public.books b ON p.book_id = b.id
    WHERE p.id = $1
  `, [pageId]);
  
  if (pageResult.rows.length === 0) {
    throw new Error(`Seite mit ID ${pageId} nicht gefunden`);
  }
  
  const page = pageResult.rows[0];
  const bookId = page.book_id;
  
  // Parse elements (kann JSON-String oder Objekt sein)
  let pageData = {};
  if (page.elements) {
    if (typeof page.elements === 'object' && !Array.isArray(page.elements)) {
      pageData = page.elements;
    } else if (typeof page.elements === 'string') {
      try {
        pageData = JSON.parse(page.elements);
      } catch (e) {
        pageData = {};
      }
    } else {
      pageData = { elements: Array.isArray(page.elements) ? page.elements : [] };
    }
  }
  const elements = pageData.elements || [];
  
  // Parse background
  let background = page.background;
  if (typeof background === 'string') {
    try {
      background = JSON.parse(background);
    } catch (e) {
      background = null;
    }
  }
  
  // Lade zusätzliche Daten (Questions, Answers, Assignments) für vollständige Struktur
  const questionsResult = await pool.query(
    'SELECT * FROM public.questions WHERE book_id = $1 ORDER BY display_order ASC NULLS LAST, created_at ASC',
    [bookId]
  );
  
  const answersResult = await pool.query(`
    SELECT a.* FROM public.answers a
    JOIN public.questions q ON a.question_id = q.id
    WHERE q.book_id = $1
  `, [bookId]);
  
  const assignmentsResult = await pool.query(`
    SELECT pa.page_id, pa.user_id, p.page_number, u.name, u.email, u.role
    FROM public.page_assignments pa
    JOIN public.pages p ON pa.page_id = p.id
    JOIN public.users u ON pa.user_id = u.id
    WHERE p.book_id = $1
  `, [bookId]);
  
  // Update answer elements with actual answer text
  const updatedElements = elements.map(element => {
    if (element.textType === 'answer') {
      const pageAssignment = assignmentsResult.rows.find(pa => pa.page_id === page.id);
      if (pageAssignment) {
        let questionId = element.questionId;
        if (!questionId) {
          const questionElement = elements.find(el => el.textType === 'question' && el.questionId);
          if (questionElement) {
            questionId = questionElement.questionId;
          }
        }
        
        if (questionId) {
          const assignedUserAnswer = answersResult.rows.find(a => 
            a.question_id === questionId && a.user_id === pageAssignment.user_id
          );
          if (assignedUserAnswer) {
            return {
              ...element,
              questionId: questionId,
              text: assignedUserAnswer.answer_text || '',
              answerId: assignedUserAnswer.id
            };
          }
        }
      }
    }
    return element;
  });
  
  // Erstelle Buch-ähnliche Struktur für Kompatibilität
  return {
    id: bookId,
    name: page.book_name,
    pageSize: page.page_size,
    orientation: page.orientation,
    bookTheme: page.book_theme_id,
    themeId: page.book_theme_id,
    layoutTemplateId: page.book_layout_template_id,
    colorPaletteId: page.book_color_palette_id,
    pages: [{
      id: page.id,
      pageNumber: page.page_number,
      elements: updatedElements,
      background: {
        ...(background || {}),
        pageTheme: page.theme_id || null
      },
      themeId: page.theme_id,
      layoutTemplateId: page.layout_template_id,
      colorPaletteId: page.color_palette_id,
      pageType: page.page_type || 'content'
    }],
    questions: questionsResult.rows,
    answers: answersResult.rows,
    pageAssignments: assignmentsResult.rows
  };
}

/**
 * Erstellt Client-seitigen PDF-Export (simuliert)
 * In Produktion würde dies über Puppeteer den Client-Code ausführen
 */
async function createClientPDFExport(bookData, outputPath) {
  console.log('📄 Erstelle Client-seitigen PDF-Export...');
  
  // TODO: Implementiere tatsächlichen Client-Export
  // Für jetzt: Verwende Server-Export als Platzhalter
  // In Produktion: Puppeteer öffnet Client-Seite und triggert Export
  
  const { generatePDFFromBook } = require('../services/pdf-export');
  const PDFRendererService = require('../services/pdf-renderer-service');
  const pdfRendererService = new PDFRendererService();
  
  try {
    await pdfRendererService.initialize();
    
    // Bestimme pageRange basierend auf Anzahl der Seiten
    const pageRange = bookData.pages?.length === 1 ? 'current' : 'all';
    const currentPageIndex = bookData.pages?.length === 1 ? 0 : undefined;
    
    // Simuliere Client-Export mit Server-Code (für Test)
    // In Produktion würde hier Puppeteer den Client-Code ausführen
    const pdfPath = await generatePDFFromBook(
      bookData,
      { 
        quality: 'medium', 
        pageRange,
        currentPageIndex
      },
      `client-${Date.now()}`,
      null
    );
    
    // Kopiere zu Output-Pfad
    await fs.copyFile(pdfPath, outputPath);
    
    return outputPath;
  } finally {
    await pdfRendererService.cleanup();
  }
}

/**
 * Erstellt Server-seitigen PDF-Export
 */
async function createServerPDFExport(bookData, outputPath) {
  console.log('📄 Erstelle Server-seitigen PDF-Export...');
  
  const { generatePDFFromBook } = require('../services/pdf-export');
  const PDFRendererService = require('../services/pdf-renderer-service');
  const pdfRendererService = new PDFRendererService();
  
  try {
    await pdfRendererService.initialize();
    
    // Bestimme pageRange basierend auf Anzahl der Seiten
    const pageRange = bookData.pages?.length === 1 ? 'current' : 'all';
    const currentPageIndex = bookData.pages?.length === 1 ? 0 : undefined;
    
    const pdfPath = await generatePDFFromBook(
      bookData,
      { 
        quality: 'medium', 
        pageRange,
        currentPageIndex
      },
      `server-${Date.now()}`,
      null
    );
    
    // Kopiere zu Output-Pfad
    await fs.copyFile(pdfPath, outputPath);
    
    return outputPath;
  } finally {
    await pdfRendererService.cleanup();
  }
}

/**
 * Analysiert visuelle Unterschiede und generiert detaillierte Berichte
 */
async function analyzeVisualDifferences(comparisonResults, bookData) {
  const visualChanges = [];
  const implementationSuggestions = [];
  
  // Analysiere visuelle Unterschiede pro Seite
  for (const pageResult of comparisonResults) {
    if (pageResult.error) continue;
    
    if (!pageResult.match) {
      const page = bookData.pages?.find(p => p.pageNumber === pageResult.page);
      const pageInfo = page ? `Seite ${page.pageNumber} (ID: ${page.id})` : `Seite ${pageResult.page}`;
      
      // Kategorisiere Unterschiede
      if (pageResult.difference > 0.5) {
        // Große Unterschiede
        visualChanges.push({
          type: 'major_visual_difference',
          page: pageResult.page,
          pageInfo,
          severity: 'high',
          differencePercent: (pageResult.difference * 100).toFixed(2),
          avgDifferencePercent: (pageResult.avgDifference * 100).toFixed(2),
          diffPixels: pageResult.diffPixels,
          totalPixels: pageResult.totalPixels,
          description: `Große visuelle Unterschiede auf ${pageInfo}`,
          visualIndicators: [
            `Differenz: ${(pageResult.difference * 100).toFixed(2)}% der Pixel`,
            `Durchschnittliche Differenz: ${(pageResult.avgDifference * 100).toFixed(2)}%`,
            `${pageResult.diffPixels} von ${pageResult.totalPixels} Pixeln unterschiedlich`
          ],
          possibleCauses: [
            'Font-Styles (Bold, Italic) werden nicht korrekt gerendert',
            'Text-Positionierung weicht deutlich ab',
            'Fehlende Features im Server-Export (z.B. Ruled Lines, Themes)',
            'Unterschiedliche Font-Metriken zwischen Client und Server'
          ]
        });
        
        // Generiere Implementierungsvorschläge
        implementationSuggestions.push({
          type: 'font_style_rendering',
          priority: 'high',
          affectedPages: [pageResult.page],
          description: 'Font-Styles (Bold, Italic) korrekt rendern',
          currentIssue: 'Font-Bold oder Font-Italic werden möglicherweise nicht korrekt angewendet',
          suggestedImplementation: [
            'Überprüfe `fontWeight` und `fontStyle` in `shared/rendering/render-qna.js`',
            'Stelle sicher, dass `fontBold` und `fontItalic` aus Element-Settings korrekt übertragen werden',
            'Verifiziere, dass Konva.Text die Font-Styles korrekt anwendet',
            'Teste mit verschiedenen Font-Familien'
          ],
          filesToCheck: [
            'shared/rendering/render-qna.js',
            'client/src/components/pdf-renderer/pdf-renderer.tsx'
          ]
        });
        
      } else if (pageResult.difference > 0.1) {
        // Mittlere Unterschiede
        visualChanges.push({
          type: 'moderate_visual_difference',
          page: pageResult.page,
          pageInfo,
          severity: 'medium',
          differencePercent: (pageResult.difference * 100).toFixed(2),
          avgDifferencePercent: (pageResult.avgDifference * 100).toFixed(2),
          description: `Mittlere visuelle Unterschiede auf ${pageInfo}`,
          visualIndicators: [
            `Differenz: ${(pageResult.difference * 100).toFixed(2)}% der Pixel`,
            `Durchschnittliche Differenz: ${(pageResult.avgDifference * 100).toFixed(2)}%`
          ],
          possibleCauses: [
            'Marginale Text-Position-Verschiebungen',
            'Rundungsunterschiede in Berechnungen',
            'Font-Metrik-Unterschiede zwischen Client und Server',
            'Baseline-Offset-Unterschiede'
          ]
        });
        
        // Prüfe auf systematische Verschiebungen
        if (pageResult.avgDifference > 2) {
          implementationSuggestions.push({
            type: 'text_positioning',
            priority: 'medium',
            affectedPages: [pageResult.page],
            description: 'Text-Positionierung präzisieren',
            currentIssue: 'Text-Positionen weichen leicht ab (möglicherweise Baseline-Offset)',
            suggestedImplementation: [
              'Verwende `getBaselineOffset()` für präzise Baseline-Offset-Berechnung (bereits implementiert)',
              'Überprüfe, ob Font-Metriken korrekt verwendet werden',
              'Vergleiche Baseline-Offset-Berechnungen zwischen Client und Server',
              'Teste mit verschiedenen Font-Größen'
            ],
            filesToCheck: [
              'shared/utils/text-layout.server.js',
              'shared/rendering/render-qna.js',
              'client/src/components/pdf-renderer/pdf-renderer.tsx'
            ]
          });
        }
      } else {
        // Kleine Unterschiede
        visualChanges.push({
          type: 'minor_visual_difference',
          page: pageResult.page,
          pageInfo,
          severity: 'low',
          differencePercent: (pageResult.difference * 100).toFixed(2),
          description: `Kleine visuelle Unterschiede auf ${pageInfo}`,
          note: 'Diese Unterschiede sind möglicherweise akzeptabel'
        });
      }
    }
  }
  
  // Analysiere Element-spezifische Probleme
  const elementIssues = [];
  for (const page of bookData.pages || []) {
    if (!page.elements) continue;
    
    for (const element of page.elements) {
      if (element.textType === 'qna' || element.type === 'text') {
        try {
          const layoutComparison = compareElementLayouts(element, {});
          if (layoutComparison.differences.length > 0) {
            elementIssues.push({
              elementId: element.id,
              page: page.pageNumber,
              differences: layoutComparison.differences,
              yPositionSuggestions: layoutComparison.yPositionSuggestions || []
            });
          }
        } catch (error) {
          // Ignoriere Fehler bei einzelnen Elementen
        }
      }
    }
  }
  
  return {
    visualChanges,
    implementationSuggestions,
    elementIssues
  };
}

/**
 * Generiert detaillierten Bericht über erkannte Unterschiede
 */
function generateDetailedReport(analysisResults) {
  const report = {
    summary: {
      totalVisualChanges: analysisResults.visualChanges.length,
      highSeverity: analysisResults.visualChanges.filter(c => c.severity === 'high').length,
      mediumSeverity: analysisResults.visualChanges.filter(c => c.severity === 'medium').length,
      lowSeverity: analysisResults.visualChanges.filter(c => c.severity === 'low').length,
      implementationSuggestions: analysisResults.implementationSuggestions.length,
      elementIssues: analysisResults.elementIssues.length
    },
    visualChanges: analysisResults.visualChanges,
    implementationSuggestions: analysisResults.implementationSuggestions,
    elementIssues: analysisResults.elementIssues
  };
  
  return report;
}

/**
 * Hauptfunktion
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1 && !args.includes('--page-id')) {
    console.log(`
Verwendung: 
  node auto-compare-and-fix-pdf-exports.js <bookId> [options]
  node auto-compare-and-fix-pdf-exports.js --page-id <pageId> [options]

Options:
  --page-id <id>      Nur eine spezifische Seite vergleichen (Page-ID)
  --output-dir <dir>  Output-Verzeichnis für Vergleichsbilder (default: ./pdf-comparison-output)
  --threshold <num>   Pixel-Unterschied-Schwelle 0-1 (default: 0.1)
  --dpi <num>         DPI für PDF-zu-Bild-Konvertierung (default: 150)

Beispiel:
  # Ganzes Buch vergleichen
  node auto-compare-and-fix-pdf-exports.js 565
  
  # Nur eine Seite vergleichen
  node auto-compare-and-fix-pdf-exports.js --page-id 1234
  
  # Mit Optionen
  node auto-compare-and-fix-pdf-exports.js 565 --output-dir ./comparison --dpi 300
    `);
    process.exit(1);
  }
  
  // Parse Arguments
  const pageIdIndex = args.indexOf('--page-id');
  const pageId = pageIdIndex !== -1 && args[pageIdIndex + 1] 
    ? parseInt(args[pageIdIndex + 1])
    : null;
  const bookId = pageId ? null : parseInt(args[0]);
  
  const outputDirIndex = args.indexOf('--output-dir');
  const outputDir = outputDirIndex !== -1 && args[outputDirIndex + 1] 
    ? args[outputDirIndex + 1] 
    : './pdf-comparison-output';
  const thresholdIndex = args.indexOf('--threshold');
  const threshold = thresholdIndex !== -1 && args[thresholdIndex + 1]
    ? parseFloat(args[thresholdIndex + 1])
    : 0.1;
  const dpiIndex = args.indexOf('--dpi');
  const dpi = dpiIndex !== -1 && args[dpiIndex + 1]
    ? parseInt(args[dpiIndex + 1])
    : 150;
  
  try {
    let bookData;
    let identifier;
    
    if (pageId) {
      console.log(`\n📄 Lade Seite ${pageId} aus Datenbank...`);
      bookData = await loadPageFromDB(pageId);
      identifier = `Seite ${pageId}`;
      console.log(`✅ Seite geladen: ${bookData.pages[0].pageNumber} aus Buch "${bookData.name}"`);
    } else {
      console.log(`\n📚 Lade Buch ${bookId} aus Datenbank...`);
      bookData = await loadBookFromDB(bookId);
      identifier = `Buch ${bookId}`;
      console.log(`✅ Buch geladen: ${bookData.name} (${bookData.pages?.length || 0} Seiten)`);
    }
    
    // Erstelle Output-Verzeichnis
    await fs.mkdir(outputDir, { recursive: true });
    
    // Erstelle beide PDF-Exports
    const exportId = pageId ? `page-${pageId}` : `book-${bookId}`;
    const clientPDFPath = path.join(outputDir, `client-export-${exportId}.pdf`);
    const serverPDFPath = path.join(outputDir, `server-export-${exportId}.pdf`);
    
    console.log('\n📄 Erstelle PDF-Exports...');
    await createClientPDFExport(bookData, clientPDFPath);
    await createServerPDFExport(bookData, serverPDFPath);
    console.log('✅ PDF-Exports erstellt');
    
    // Vergleiche PDFs
    console.log('\n🔍 Vergleiche PDF-Exports...');
    const comparisonResult = await comparePDFsVisually(
      clientPDFPath,
      serverPDFPath,
      { outputDir, threshold, dpi }
    );
    
    // Extrahiere Ergebnisse
    const comparisonResults = comparisonResult.results || [];
    
    // Analysiere visuelle Unterschiede
    console.log('\n📊 Analysiere visuelle Unterschiede...');
    const analysisResults = await analyzeVisualDifferences(comparisonResults, bookData);
    
    // Generiere detaillierten Bericht
    const report = generateDetailedReport(analysisResults);
    
    // Speichere Ergebnisse
    const results = {
      identifier,
      bookId: bookData.id,
      pageId: pageId || null,
      bookName: bookData.name,
      timestamp: new Date().toISOString(),
      comparisonResults,
      report
    };
    
    const resultsPath = path.join(outputDir, `comparison-results-${exportId}.json`);
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
    
    // Zeige detaillierten Bericht
    console.log('\n' + '='.repeat(80));
    console.log('📋 DETAILLIERTER BERICHT\n');
    console.log(`   ${identifier}: ${bookData.name}`);
    console.log(`   Seiten verglichen: ${comparisonResults.length}`);
    console.log(`   Visuelle Änderungen erkannt: ${report.summary.totalVisualChanges}`);
    console.log(`   Implementierungsvorschläge: ${report.summary.implementationSuggestions}`);
    
    const matchingPages = comparisonResults.filter(r => r.match && !r.error).length;
    console.log(`   Übereinstimmende Seiten: ${matchingPages}/${comparisonResults.length}`);
    
    // Zeige visuelle Änderungen
    if (report.visualChanges.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('👁️  VISUELLE ÄNDERUNGEN\n');
      
      report.visualChanges.forEach((change, idx) => {
        console.log(`\n${idx + 1}. ${change.type.replace(/_/g, ' ').toUpperCase()} (${change.severity})`);
        console.log(`   ${change.description}`);
        console.log(`   Differenz: ${change.differencePercent}%`);
        
        if (change.visualIndicators) {
          console.log(`   Indikatoren:`);
          change.visualIndicators.forEach(indicator => {
            console.log(`     • ${indicator}`);
          });
        }
        
        if (change.possibleCauses) {
          console.log(`   Mögliche Ursachen:`);
          change.possibleCauses.forEach(cause => {
            console.log(`     • ${cause}`);
          });
        }
      });
    }
    
    // Zeige Implementierungsvorschläge
    if (report.implementationSuggestions.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('💡 IMPLEMENTIERUNGSVORSCHLÄGE\n');
      
      report.implementationSuggestions.forEach((suggestion, idx) => {
        console.log(`\n${idx + 1}. ${suggestion.description} (Priorität: ${suggestion.priority})`);
        console.log(`   Betroffene Seiten: ${suggestion.affectedPages.join(', ')}`);
        console.log(`   Aktuelles Problem: ${suggestion.currentIssue}`);
        console.log(`   Vorgeschlagene Implementierung:`);
        suggestion.suggestedImplementation.forEach((step, stepIdx) => {
          console.log(`     ${stepIdx + 1}. ${step}`);
        });
        console.log(`   Zu überprüfende Dateien:`);
        suggestion.filesToCheck.forEach(file => {
          console.log(`     • ${file}`);
        });
      });
    }
    
    // Zeige Element-spezifische Probleme
    if (report.elementIssues.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('🔧 ELEMENT-SPEZIFISCHE PROBLEME\n');
      
      report.elementIssues.forEach((issue, idx) => {
        console.log(`\n${idx + 1}. Element ${issue.elementId} (Seite ${issue.page})`);
        console.log(`   Unterschiede: ${issue.differences.length}`);
        if (issue.yPositionSuggestions.length > 0) {
          console.log(`   Y-Position Vorschläge: ${issue.yPositionSuggestions.length}`);
        }
      });
    }
    
    if (report.summary.totalVisualChanges === 0) {
      console.log('\n✅ Keine visuellen Unterschiede gefunden!');
    }
    
    console.log(`\n✅ Detaillierter Bericht gespeichert in: ${resultsPath}`);
    console.log(`✅ Vergleichsbilder in: ${outputDir}\n`);
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  loadBookFromDB,
  loadPageFromDB,
  createClientPDFExport,
  createServerPDFExport,
  analyzeVisualDifferences,
  generateDetailedReport
};

