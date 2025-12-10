/**
 * Vergleicht bereits existierende Client- und Server-PDF-Exports
 * 
 * Dieses Skript ist nützlich, wenn du die PDFs bereits manuell erstellt hast
 * und sie nur vergleichen möchtest.
 * 
 * Usage:
 *   node compare-existing-pdf-exports.js <clientPDF> <serverPDF> [options]
 * 
 * Options:
 *   --output-dir <dir>  Output-Verzeichnis (default: ./comparison-output)
 *   --threshold <num>   Pixel-Unterschied-Schwelle (default: 0.1)
 *   --dpi <num>         DPI für Konvertierung (default: 150)
 */

const fs = require('fs').promises;
const path = require('path');
const { comparePDFsVisually } = require('./visual-pdf-comparison');
const { PDFDocument } = require('pdf-lib');

/**
 * Extrahiert strukturelle Informationen aus PDF
 */
async function extractPDFStructure(pdfPath) {
  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    return {
      pageCount: pages.length,
      pages: pages.map((page, idx) => ({
        pageNumber: idx + 1,
        width: page.getWidth(),
        height: page.getHeight(),
        size: page.getSize()
      }))
    };
  } catch (error) {
    console.error(`Fehler beim Lesen von ${pdfPath}:`, error.message);
    return null;
  }
}

/**
 * Analysiert Unterschiede und generiert Fix-Vorschläge
 */
function generateFixSuggestions(comparisonResults) {
  const suggestions = [];
  
  for (const result of comparisonResults) {
    if (result.error) continue;
    
    if (!result.match) {
      // Kategorisiere Unterschiede
      if (result.difference > 0.5) {
        suggestions.push({
          type: 'major_difference',
          page: result.page,
          severity: 'high',
          difference: result.difference,
          description: `Große Unterschiede auf Seite ${result.page}: ${(result.difference * 100).toFixed(2)}%`,
          possibleCauses: [
            'Font-Styles (Bold, Italic) fehlen',
            'Text-Positionierung unterschiedlich',
            'Fehlende Features im Server-Export'
          ],
          suggestedFixes: [
            'Überprüfe Font-Bold und Font-Italic in Rendering-Funktionen',
            'Überprüfe Baseline-Offset-Berechnung',
            'Vergleiche Element-spezifische Einstellungen'
          ]
        });
      } else if (result.difference > 0.1) {
        suggestions.push({
          type: 'minor_difference',
          page: result.page,
          severity: 'medium',
          difference: result.difference,
          description: `Kleine Unterschiede auf Seite ${result.page}: ${(result.difference * 100).toFixed(2)}%`,
          possibleCauses: [
            'Marginale Text-Position-Verschiebungen',
            'Rundungsunterschiede',
            'Font-Metrik-Unterschiede'
          ],
          suggestedFixes: [
            'Überprüfe Baseline-Offset-Berechnung (getBaselineOffset)',
            'Vergleiche Font-Metriken zwischen Client und Server'
          ]
        });
      }
    }
  }
  
  return suggestions;
}

/**
 * Hauptfunktion
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
Verwendung: node compare-existing-pdf-exports.js <clientPDF> <serverPDF> [options]

Options:
  --auto-fix          Zeige Auto-Fix-Vorschläge
  --output-dir <dir>  Output-Verzeichnis (default: ./comparison-output)
  --threshold <num>   Pixel-Unterschied-Schwelle (default: 0.1)
  --dpi <num>         DPI für Konvertierung (default: 150)

Beispiel:
  node compare-existing-pdf-exports.js client.pdf server.pdf
  node compare-existing-pdf-exports.js client.pdf server.pdf --auto-fix --dpi 300
    `);
    process.exit(1);
  }
  
  const clientPDFPath = path.resolve(args[0]);
  const serverPDFPath = path.resolve(args[1]);
  const outputDirIndex = args.indexOf('--output-dir');
  const outputDir = outputDirIndex !== -1 && args[outputDirIndex + 1] 
    ? args[outputDirIndex + 1] 
    : './comparison-output';
  const thresholdIndex = args.indexOf('--threshold');
  const threshold = thresholdIndex !== -1 && args[thresholdIndex + 1]
    ? parseFloat(args[thresholdIndex + 1])
    : 0.1;
  const dpiIndex = args.indexOf('--dpi');
  const dpi = dpiIndex !== -1 && args[dpiIndex + 1]
    ? parseInt(args[dpiIndex + 1])
    : 150;
  
  try {
    // Prüfe ob Dateien existieren
    await fs.access(clientPDFPath);
    await fs.access(serverPDFPath);
    
    console.log('\n📄 Analysiere PDF-Strukturen...');
    const clientStructure = await extractPDFStructure(clientPDFPath);
    const serverStructure = await extractPDFStructure(serverPDFPath);
    
    if (clientStructure && serverStructure) {
      console.log(`   Client: ${clientStructure.pageCount} Seiten`);
      console.log(`   Server: ${serverStructure.pageCount} Seiten`);
      
      if (clientStructure.pageCount !== serverStructure.pageCount) {
        console.warn(`   ⚠️  Warnung: Unterschiedliche Seitenanzahl!`);
      }
    }
    
    // Vergleiche PDFs
    console.log('\n🔍 Vergleiche PDF-Exports...');
    const comparisonResult = await comparePDFsVisually(
      clientPDFPath,
      serverPDFPath,
      { outputDir, threshold, dpi }
    );
    
    const comparisonResults = comparisonResult.results || [];
    
    // Generiere Fix-Vorschläge
    const suggestions = generateFixSuggestions(comparisonResults);
    
    // Speichere Ergebnisse
    const results = {
      clientPDF: clientPDFPath,
      serverPDF: serverPDFPath,
      timestamp: new Date().toISOString(),
      comparisonResults,
      suggestions,
      clientStructure,
      serverStructure
    };
    
    const resultsPath = path.join(outputDir, `comparison-results-${Date.now()}.json`);
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
    
    // Zeige Zusammenfassung
    console.log('\n' + '='.repeat(80));
    console.log('📋 ZUSAMMENFASSUNG\n');
    
    const matchingPages = comparisonResults.filter(r => r.match && !r.error).length;
    const totalPages = comparisonResults.filter(r => !r.error).length;
    const avgDifference = comparisonResults
      .filter(r => !r.error)
      .reduce((sum, r) => sum + (r.difference || 0), 0) / totalPages || 0;
    
    console.log(`   Seiten verglichen: ${totalPages}`);
    console.log(`   Übereinstimmende Seiten: ${matchingPages}/${totalPages}`);
    console.log(`   Durchschnittliche Differenz: ${(avgDifference * 100).toFixed(2)}%`);
    console.log(`   Fix-Vorschläge: ${suggestions.length}`);
    
    if (suggestions.length > 0) {
      console.log('\n💡 Fix-Vorschläge:\n');
      suggestions.forEach((suggestion, idx) => {
        console.log(`   ${idx + 1}. ${suggestion.type} (${suggestion.severity}) - Seite ${suggestion.page}`);
        console.log(`      ${suggestion.description}`);
        if (suggestion.possibleCauses) {
          console.log(`      Mögliche Ursachen:`);
          suggestion.possibleCauses.forEach(cause => {
            console.log(`        - ${cause}`);
          });
        }
        if (suggestion.suggestedFixes) {
          console.log(`      Vorschläge:`);
          suggestion.suggestedFixes.forEach(fix => {
            console.log(`        - ${fix}`);
          });
        }
        console.log('');
      });
    } else {
      console.log('\n✅ Keine Probleme gefunden!');
    }
    
    console.log(`\n✅ Ergebnisse gespeichert in: ${resultsPath}`);
    console.log(`✅ Vergleichsbilder in: ${outputDir}\n`);
    
    // Zeige Status implementierter Fixes
    console.log('🔧 Status implementierter Fixes:\n');
    console.log('   ✅ Text-Position: getBaselineOffset() für präzise Baseline-Offset-Berechnung');
    console.log('   ⏳ Font-Bold: In Arbeit');
    console.log('');
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  extractPDFStructure,
  generateFixSuggestions
};

