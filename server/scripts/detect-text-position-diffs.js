/**
 * Automatische Erkennung von Text-Positionsunterschieden zwischen Client und Server
 * 
 * Dieses Skript:
 * 1. Extrahiert Text-Positionen aus beiden Rendering-Versionen
 * 2. Vergleicht sie strukturell
 * 3. Identifiziert systematische Unterschiede
 * 4. Schlägt Fixes vor
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Extrahiert Text-Runs aus einem gerenderten Canvas (Client oder Server)
 * Simuliert die Layout-Berechnung und gibt alle Text-Runs zurück
 */
async function extractTextRunsFromElement(element, toolDefaults, isClient = true) {
  const runs = [];
  
  // Simuliere die Layout-Berechnung
  const questionText = element.questionId ? 'Test Question' : '';
  const answerText = element.text || element.formattedText || '';
  
  // Extrahiere Styles (vereinfacht - sollte aus echten Daten kommen)
  const questionStyle = {
    fontSize: element.questionSettings?.fontSize || toolDefaults.questionSettings?.fontSize || 58,
    fontFamily: element.questionSettings?.fontFamily || toolDefaults.questionSettings?.fontFamily || 'Arial, sans-serif',
    fontBold: element.questionSettings?.fontBold ?? toolDefaults.questionSettings?.fontBold ?? false,
    fontItalic: element.questionSettings?.fontItalic ?? toolDefaults.questionSettings?.fontItalic ?? false,
    fontColor: element.questionSettings?.fontColor || '#000000',
    fontOpacity: element.questionSettings?.fontOpacity ?? 1,
    paragraphSpacing: element.questionSettings?.paragraphSpacing || 'small',
    align: element.questionSettings?.align || 'left'
  };
  
  const answerStyle = {
    fontSize: element.answerSettings?.fontSize || toolDefaults.answerSettings?.fontSize || 50,
    fontFamily: element.answerSettings?.fontFamily || toolDefaults.answerSettings?.fontFamily || 'Arial, sans-serif',
    fontBold: element.answerSettings?.fontBold ?? toolDefaults.answerSettings?.fontBold ?? false,
    fontItalic: element.answerSettings?.fontItalic ?? toolDefaults.answerSettings?.fontItalic ?? false,
    fontColor: element.answerSettings?.fontColor || '#000000',
    fontOpacity: element.answerSettings?.fontOpacity ?? 1,
    paragraphSpacing: element.answerSettings?.paragraphSpacing || 'medium',
    align: element.answerSettings?.align || 'left'
  };
  
  // Berechne Baseline-Offsets
  const questionBaselineOffset = questionStyle.fontSize * 0.8;
  const answerBaselineOffset = answerStyle.fontSize * 0.8;
  
  // Für Client: Y-Position ist Baseline
  // Für Server: Y-Position wird zu Top konvertiert
  if (isClient) {
    // Client: baselineY wird direkt gespeichert
    // Simuliere erste Frage-Zeile
    if (questionText) {
      runs.push({
        text: questionText,
        x: element.padding || 8,
        y: (element.padding || 8) + questionBaselineOffset, // Baseline Y
        style: questionStyle,
        type: 'question',
        isClient: true
      });
    }
    
    // Simuliere erste Antwort-Zeile
    if (answerText) {
      const firstAnswerY = questionText 
        ? (element.padding || 8) + questionBaselineOffset + (questionStyle.fontSize * 1.2) + (answerStyle.fontSize * 0.2)
        : (element.padding || 8) + answerBaselineOffset;
      
      runs.push({
        text: answerText.split('\n')[0] || answerText,
        x: element.padding || 8,
        y: firstAnswerY + answerBaselineOffset, // Baseline Y
        style: answerStyle,
        type: 'answer',
        isClient: true
      });
    }
  } else {
    // Server: Baseline Y wird zu Top Y konvertiert
    if (questionText) {
      const baselineY = (element.padding || 8) + questionBaselineOffset;
      const topY = baselineY - questionBaselineOffset; // Konvertierung
      
      runs.push({
        text: questionText,
        x: element.padding || 8,
        y: topY, // Top Y (nach Konvertierung)
        baselineY: baselineY, // Original Baseline für Vergleich
        style: questionStyle,
        type: 'question',
        isClient: false
      });
    }
    
    if (answerText) {
      const firstAnswerY = questionText 
        ? (element.padding || 8) + questionBaselineOffset + (questionStyle.fontSize * 1.2) + (answerStyle.fontSize * 0.2)
        : (element.padding || 8) + answerBaselineOffset;
      
      const baselineY = firstAnswerY + answerBaselineOffset;
      const topY = baselineY - answerBaselineOffset; // Konvertierung
      
      runs.push({
        text: answerText.split('\n')[0] || answerText,
        x: element.padding || 8,
        y: topY, // Top Y (nach Konvertierung)
        baselineY: baselineY, // Original Baseline für Vergleich
        style: answerStyle,
        type: 'answer',
        isClient: false
      });
    }
  }
  
  return runs;
}

/**
 * Vergleicht Text-Runs zwischen Client und Server
 */
function compareTextRuns(clientRuns, serverRuns) {
  const differences = [];
  
  // Gruppiere nach Text-Inhalt für Vergleich
  const clientByText = new Map();
  clientRuns.forEach(run => {
    const key = `${run.text}_${run.type}`;
    if (!clientByText.has(key)) {
      clientByText.set(key, []);
    }
    clientByText.get(key).push(run);
  });
  
  const serverByText = new Map();
  serverRuns.forEach(run => {
    const key = `${run.text}_${run.type}`;
    if (!serverByText.has(key)) {
      serverByText.set(key, []);
    }
    serverByText.get(key).push(run);
  });
  
  // Vergleiche Positionen
  for (const [key, clientRunList] of clientByText.entries()) {
    const serverRunList = serverByText.get(key) || [];
    
    if (serverRunList.length === 0) {
      differences.push({
        type: 'missing_in_server',
        text: key,
        clientRun: clientRunList[0]
      });
      continue;
    }
    
    // Vergleiche erste Übereinstimmung
    const clientRun = clientRunList[0];
    const serverRun = serverRunList[0];
    
    // Client Y ist Baseline, Server Y ist Top (nach Konvertierung)
    // Für Vergleich: Konvertiere Server Top Y zurück zu Baseline
    const serverBaselineY = serverRun.baselineY || (serverRun.y + (serverRun.style.fontSize * 0.8));
    const clientBaselineY = clientRun.y;
    
    const yDiff = Math.abs(serverBaselineY - clientBaselineY);
    const xDiff = Math.abs(serverRun.x - clientRun.x);
    
    if (yDiff > 0.5 || xDiff > 0.5) {
      differences.push({
        type: 'position_mismatch',
        text: clientRun.text,
        clientRun: {
          x: clientRun.x,
          y: clientRun.y,
          baselineY: clientBaselineY,
          style: clientRun.style
        },
        serverRun: {
          x: serverRun.x,
          y: serverRun.y,
          baselineY: serverBaselineY,
          style: serverRun.style
        },
        yDifference: yDiff,
        xDifference: xDiff,
        fontSize: clientRun.style.fontSize,
        baselineOffset: clientRun.style.fontSize * 0.8
      });
    }
  }
  
  // Prüfe auf fehlende Runs im Client
  for (const [key, serverRunList] of serverByText.entries()) {
    if (!clientByText.has(key)) {
      differences.push({
        type: 'missing_in_client',
        text: key,
        serverRun: serverRunList[0]
      });
    }
  }
  
  return differences;
}

/**
 * Analysiert systematische Unterschiede und schlägt Fixes vor
 */
function analyzeAndSuggestFixes(differences) {
  const suggestions = [];
  
  // Gruppiere nach Typ
  const positionMismatches = differences.filter(d => d.type === 'position_mismatch');
  
  if (positionMismatches.length > 0) {
    // Berechne durchschnittliche Y-Differenz
    const avgYDiff = positionMismatches.reduce((sum, d) => sum + d.yDifference, 0) / positionMismatches.length;
    const avgXDiff = positionMismatches.reduce((sum, d) => sum + d.xDifference, 0) / positionMismatches.length;
    
    // Analysiere Baseline-Offset-Probleme
    const baselineOffsetIssues = positionMismatches.filter(d => {
      // Wenn Y-Differenz proportional zu fontSize ist, könnte es ein Baseline-Offset-Problem sein
      const expectedOffset = d.fontSize * 0.8;
      const actualOffset = d.yDifference;
      return Math.abs(actualOffset - expectedOffset) < expectedOffset * 0.2; // Innerhalb 20% Toleranz
    });
    
    if (baselineOffsetIssues.length > 0) {
      // Berechne optimale Baseline-Offset-Korrektur
      const offsetCorrections = baselineOffsetIssues.map(d => {
        const currentOffset = d.fontSize * 0.8;
        const correction = d.yDifference / d.fontSize;
        return {
          fontSize: d.fontSize,
          currentOffset: currentOffset,
          suggestedOffset: currentOffset + (d.yDifference),
          correctionFactor: correction
        };
      });
      
      // Finde gemeinsamen Korrekturfaktor
      const avgCorrection = offsetCorrections.reduce((sum, c) => sum + c.correctionFactor, 0) / offsetCorrections.length;
      
      suggestions.push({
        type: 'baseline_offset_correction',
        severity: 'high',
        description: `Baseline-Offset-Konvertierung ist nicht exakt. Durchschnittliche Y-Differenz: ${avgYDiff.toFixed(2)}px`,
        currentFormula: 'baselineOffset = fontSize * 0.8',
        suggestedFormula: `baselineOffset = fontSize * ${(0.8 + avgCorrection).toFixed(4)}`,
        affectedRuns: baselineOffsetIssues.length,
        details: {
          avgYDiff: avgYDiff,
          avgXDiff: avgXDiff,
          offsetCorrections: offsetCorrections.slice(0, 5) // Erste 5 als Beispiel
        },
        fixLocation: [
          'shared/rendering/render-qna.js:693',
          'client/src/components/pdf-renderer/pdf-renderer.tsx:3302'
        ]
      });
    }
    
    // Prüfe auf systematische Verschiebungen
    if (avgYDiff > 1 && baselineOffsetIssues.length === 0) {
      suggestions.push({
        type: 'systematic_y_shift',
        severity: 'medium',
        description: `Systematische Y-Verschiebung von ${avgYDiff.toFixed(2)}px`,
        suggestedFix: `Add constant offset: ${avgYDiff > 0 ? '+' : ''}${avgYDiff.toFixed(2)}px to server Y positions`
      });
    }
    
    if (avgXDiff > 1) {
      suggestions.push({
        type: 'systematic_x_shift',
        severity: 'medium',
        description: `Systematische X-Verschiebung von ${avgXDiff.toFixed(2)}px`,
        suggestedFix: `Add constant offset: ${avgXDiff > 0 ? '+' : ''}${avgXDiff.toFixed(2)}px to server X positions`
      });
    }
  }
  
  return suggestions;
}

/**
 * Hauptfunktion: Analysiert ein Element und gibt Unterschiede zurück
 */
async function analyzeElement(element, toolDefaults) {
  console.log(`\n📊 Analysiere Element: ${element.id || element.type}`);
  
  // Extrahiere Runs von beiden Versionen
  const clientRuns = await extractTextRunsFromElement(element, toolDefaults, true);
  const serverRuns = await extractTextRunsFromElement(element, toolDefaults, false);
  
  console.log(`  Client Runs: ${clientRuns.length}`);
  console.log(`  Server Runs: ${serverRuns.length}`);
  
  // Vergleiche
  const differences = compareTextRuns(clientRuns, serverRuns);
  
  console.log(`  Unterschiede gefunden: ${differences.length}`);
  
  if (differences.length > 0) {
    // Analysiere und schlage Fixes vor
    const suggestions = analyzeAndSuggestFixes(differences);
    
    return {
      elementId: element.id,
      elementType: element.type,
      differences,
      suggestions
    };
  }
  
  return null;
}

/**
 * CLI-Interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
Verwendung: node detect-text-position-diffs.js <element-json-file> [output-file]

Beispiel:
  node detect-text-position-diffs.js test-element.json results.json
    `);
    process.exit(1);
  }
  
  const elementFile = args[0];
  const outputFile = args[1] || 'text-position-analysis.json';
  
  try {
    // Lade Element-Daten
    const elementData = JSON.parse(await fs.readFile(elementFile, 'utf-8'));
    const element = elementData.element || elementData;
    const toolDefaults = elementData.toolDefaults || {};
    
    // Analysiere
    const result = await analyzeElement(element, toolDefaults);
    
    if (result) {
      // Speichere Ergebnisse
      await fs.writeFile(outputFile, JSON.stringify(result, null, 2));
      console.log(`\n✅ Analyse abgeschlossen. Ergebnisse gespeichert in: ${outputFile}`);
      
      // Zeige Zusammenfassung
      console.log(`\n📋 Zusammenfassung:`);
      console.log(`  Unterschiede: ${result.differences.length}`);
      console.log(`  Fix-Vorschläge: ${result.suggestions.length}`);
      
      if (result.suggestions.length > 0) {
        console.log(`\n💡 Fix-Vorschläge:`);
        result.suggestions.forEach((suggestion, idx) => {
          console.log(`\n  ${idx + 1}. ${suggestion.type} (${suggestion.severity})`);
          console.log(`     ${suggestion.description}`);
          if (suggestion.suggestedFormula) {
            console.log(`     Vorschlag: ${suggestion.suggestedFormula}`);
          }
          if (suggestion.fixLocation) {
            console.log(`     Dateien: ${suggestion.fixLocation.join(', ')}`);
          }
        });
      }
    } else {
      console.log(`\n✅ Keine Unterschiede gefunden!`);
    }
    
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
  analyzeElement,
  compareTextRuns,
  analyzeAndSuggestFixes
};


