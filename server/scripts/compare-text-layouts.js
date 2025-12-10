/**
 * Direkter Vergleich der Layout-Berechnungen zwischen Client und Server
 * 
 * Dieses Skript:
 * 1. Ruft die gleichen Layout-Funktionen auf (shared)
 * 2. Vergleicht die resultierenden Text-Runs
 * 3. Identifiziert Unterschiede in Positionen
 * 4. Schlägt präzise Fixes vor
 */

const { createLayout: createLayoutServer } = require('../../shared/utils/qna-layout.server');
const { buildFont, getLineHeight, measureText, calculateTextX, wrapText } = require('../../shared/utils/text-layout.server');

/**
 * Simuliert Client-seitige Layout-Berechnung
 * (Verwendet die gleichen shared-Funktionen, aber mit Client-spezifischen Parametern)
 */
function createLayoutClient(params) {
  const {
    questionText,
    answerText,
    questionStyle,
    answerStyle,
    width,
    height,
    padding,
    ctx,
    answerInNewRow = false,
    questionAnswerGap = 0,
    layoutVariant = 'inline',
    questionPosition = 'left',
    questionWidth = 40,
    ruledLinesTarget = 'answer',
    blockQuestionAnswerGap = 10
  } = params;
  
  // Verwende die gleiche Server-Funktion (shared)
  return createLayoutServer({
    questionText,
    answerText,
    questionStyle,
    answerStyle,
    width,
    height,
    padding,
    ctx,
    answerInNewRow,
    questionAnswerGap,
    layoutVariant,
    questionPosition,
    questionWidth,
    ruledLinesTarget,
    blockQuestionAnswerGap
  });
}

/**
 * Extrahiert Text-Runs mit vollständigen Metadaten
 */
function extractRunMetadata(runs, style, isClient) {
  return runs.map((run, idx) => {
    const fontSize = run.style.fontSize || style.fontSize;
    const baselineOffset = fontSize * 0.8;
    
    return {
      index: idx,
      text: run.text,
      x: run.x,
      y: run.y, // Baseline Y für Client, Baseline Y für Server (vor Konvertierung)
      fontSize: fontSize,
      fontFamily: run.style.fontFamily || style.fontFamily,
      fontBold: run.style.fontBold ?? false,
      fontItalic: run.style.fontItalic ?? false,
      align: run.style.align || 'left',
      baselineOffset: baselineOffset,
      // Für Server: berechne Top Y (wie es in render-qna.js gemacht wird)
      topY: isClient ? null : run.y - baselineOffset,
      // Für Client: Top Y wäre baselineY - baselineOffset
      clientTopY: isClient ? run.y - baselineOffset : null,
      style: run.style
    };
  });
}

/**
 * Vergleicht zwei Layout-Ergebnisse
 */
function compareLayouts(clientLayout, serverLayout, tolerance = 0.5) {
  const differences = [];
  
  // Vergleiche Runs
  const clientRuns = clientLayout.runs || [];
  const serverRuns = serverLayout.runs || [];
  
  if (clientRuns.length !== serverRuns.length) {
    differences.push({
      type: 'run_count_mismatch',
      clientCount: clientRuns.length,
      serverCount: serverRuns.length,
      severity: 'high'
    });
  }
  
  // Vergleiche einzelne Runs
  const maxRuns = Math.max(clientRuns.length, serverRuns.length);
  for (let i = 0; i < maxRuns; i++) {
    const clientRun = clientRuns[i];
    const serverRun = serverRuns[i];
    
    if (!clientRun) {
      differences.push({
        type: 'missing_client_run',
        index: i,
        serverRun: serverRun,
        severity: 'high'
      });
      continue;
    }
    
    if (!serverRun) {
      differences.push({
        type: 'missing_server_run',
        index: i,
        clientRun: clientRun,
        severity: 'high'
      });
      continue;
    }
    
    // Vergleiche Text
    if (clientRun.text !== serverRun.text) {
      differences.push({
        type: 'text_mismatch',
        index: i,
        clientText: clientRun.text,
        serverText: serverRun.text,
        severity: 'high'
      });
    }
    
    // Vergleiche X-Position
    const xDiff = Math.abs(clientRun.x - serverRun.x);
    if (xDiff > tolerance) {
      differences.push({
        type: 'x_position_mismatch',
        index: i,
        text: clientRun.text,
        clientX: clientRun.x,
        serverX: serverRun.x,
        difference: xDiff,
        severity: xDiff > 2 ? 'high' : 'medium'
      });
    }
    
    // Vergleiche Y-Position (Baseline)
    // WICHTIG: Beide Layouts geben Baseline Y zurück
    // Die Konvertierung zu Top Y passiert erst beim Rendering
    const yDiff = Math.abs(clientRun.y - serverRun.y);
    if (yDiff > tolerance) {
      const fontSize = clientRun.style.fontSize || 16;
      const baselineOffset = fontSize * 0.8;
      
      differences.push({
        type: 'y_position_mismatch',
        index: i,
        text: clientRun.text,
        fontSize: fontSize,
        clientY: clientRun.y,
        serverY: serverRun.y,
        difference: yDiff,
        // Berechne wie die Konvertierung aussehen würde
        clientTopY: clientRun.y - baselineOffset,
        serverTopY: serverRun.y - baselineOffset,
        topYDifference: Math.abs((clientRun.y - baselineOffset) - (serverRun.y - baselineOffset)),
        severity: yDiff > 2 ? 'high' : 'medium'
      });
    }
    
    // Vergleiche Styles
    const styleDiffs = compareStyles(clientRun.style, serverRun.style);
    if (styleDiffs.length > 0) {
      differences.push({
        type: 'style_mismatch',
        index: i,
        text: clientRun.text,
        differences: styleDiffs,
        severity: 'medium'
      });
    }
  }
  
  // Vergleiche contentHeight
  const heightDiff = Math.abs((clientLayout.contentHeight || 0) - (serverLayout.contentHeight || 0));
  if (heightDiff > tolerance) {
    differences.push({
      type: 'content_height_mismatch',
      clientHeight: clientLayout.contentHeight,
      serverHeight: serverLayout.contentHeight,
      difference: heightDiff,
      severity: heightDiff > 5 ? 'high' : 'medium'
    });
  }
  
  return differences;
}

/**
 * Vergleicht zwei Style-Objekte
 */
function compareStyles(clientStyle, serverStyle) {
  const diffs = [];
  const keys = new Set([...Object.keys(clientStyle), ...Object.keys(serverStyle)]);
  
  for (const key of keys) {
    const clientValue = clientStyle[key];
    const serverValue = serverStyle[key];
    
    if (clientValue !== serverValue) {
      // Für Zahlen: Toleranz
      if (typeof clientValue === 'number' && typeof serverValue === 'number') {
        if (Math.abs(clientValue - serverValue) > 0.01) {
          diffs.push({ key, clientValue, serverValue });
        }
      } else {
        diffs.push({ key, clientValue, serverValue });
      }
    }
  }
  
  return diffs;
}

/**
 * Analysiert Y-Positionsunterschiede und schlägt Baseline-Offset-Korrekturen vor
 */
function analyzeYPositionDifferences(differences) {
  const yMismatches = differences.filter(d => d.type === 'y_position_mismatch');
  
  if (yMismatches.length === 0) {
    return [];
  }
  
  const suggestions = [];
  
  // Gruppiere nach fontSize
  const byFontSize = new Map();
  yMismatches.forEach(diff => {
    const fontSize = diff.fontSize;
    if (!byFontSize.has(fontSize)) {
      byFontSize.set(fontSize, []);
    }
    byFontSize.get(fontSize).push(diff);
  });
  
  // Analysiere für jede fontSize
  for (const [fontSize, diffs] of byFontSize.entries()) {
    const avgDiff = diffs.reduce((sum, d) => sum + d.difference, 0) / diffs.length;
    const avgTopDiff = diffs.reduce((sum, d) => sum + (d.topYDifference || 0), 0) / diffs.length;
    
    // Wenn die Differenz proportional zu fontSize ist, könnte es ein Baseline-Offset-Problem sein
    const currentOffset = fontSize * 0.8;
    const correctionFactor = avgDiff / fontSize;
    
    if (Math.abs(correctionFactor) > 0.01) {
      suggestions.push({
        fontSize: fontSize,
        currentBaselineOffset: currentOffset,
        averageYDifference: avgDiff,
        averageTopYDifference: avgTopDiff,
        suggestedOffset: currentOffset + avgDiff,
        suggestedFormula: `baselineOffset = fontSize * ${((currentOffset + avgDiff) / fontSize).toFixed(4)}`,
        correctionFactor: correctionFactor,
        affectedRuns: diffs.length,
        fixLocations: [
          'shared/rendering/render-qna.js:693',
          'client/src/components/pdf-renderer/pdf-renderer.tsx:3302'
        ]
      });
    }
  }
  
  return suggestions;
}

/**
 * Hauptfunktion: Vergleicht Layouts für ein Element
 */
function compareElementLayouts(element, toolDefaults) {
  // Erstelle Canvas Context für Messungen
  const canvas = typeof document !== 'undefined' 
    ? document.createElement('canvas')
    : require('canvas').createCanvas(1, 1);
  const ctx = canvas.getContext('2d');
  
  // Bereite Parameter vor
  const questionText = element.questionId ? 'Test Question Text' : '';
  const answerText = element.text || element.formattedText || '';
  
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
  
  const params = {
    questionText,
    answerText,
    questionStyle,
    answerStyle,
    width: element.width || 800,
    height: element.height || 600,
    padding: element.padding || 8,
    ctx,
    answerInNewRow: element.answerInNewRow ?? false,
    questionAnswerGap: element.questionAnswerGap ?? 0,
    layoutVariant: element.layoutVariant || 'inline',
    questionPosition: element.questionPosition || 'left',
    questionWidth: element.questionWidth ?? 40,
    ruledLinesTarget: element.ruledLinesTarget || 'answer',
    blockQuestionAnswerGap: element.blockQuestionAnswerGap ?? 10
  };
  
  // Berechne Layouts (beide verwenden die gleiche shared-Funktion)
  const clientLayout = createLayoutClient(params);
  const serverLayout = createLayoutServer(params);
  
  // Vergleiche
  const differences = compareLayouts(clientLayout, serverLayout);
  
  // Analysiere Y-Positionsunterschiede
  const yPositionSuggestions = analyzeYPositionDifferences(differences);
  
  return {
    elementId: element.id,
    elementType: element.type,
    differences,
    yPositionSuggestions,
    clientRunCount: clientLayout.runs?.length || 0,
    serverRunCount: serverLayout.runs?.length || 0,
    clientContentHeight: clientLayout.contentHeight,
    serverContentHeight: serverLayout.contentHeight
  };
}

/**
 * CLI-Interface
 */
async function main() {
  const fs = require('fs').promises;
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
Verwendung: node compare-text-layouts.js <element-json-file> [output-file]

Beispiel:
  node compare-text-layouts.js test-element.json layout-comparison.json
    `);
    process.exit(1);
  }
  
  const elementFile = args[0];
  const outputFile = args[1] || 'layout-comparison.json';
  
  try {
    // Lade Element-Daten
    const elementData = JSON.parse(await fs.readFile(elementFile, 'utf-8'));
    const element = elementData.element || elementData;
    const toolDefaults = elementData.toolDefaults || {};
    
    console.log(`\n📊 Vergleiche Layouts für Element: ${element.id || element.type}`);
    
    // Vergleiche
    const result = compareElementLayouts(element, toolDefaults);
    
    // Speichere Ergebnisse
    await fs.writeFile(outputFile, JSON.stringify(result, null, 2));
    
    // Zeige Zusammenfassung
    console.log(`\n📋 Ergebnisse:`);
    console.log(`  Client Runs: ${result.clientRunCount}`);
    console.log(`  Server Runs: ${result.serverRunCount}`);
    console.log(`  Unterschiede: ${result.differences.length}`);
    console.log(`  Y-Position Vorschläge: ${result.yPositionSuggestions.length}`);
    
    if (result.differences.length > 0) {
      console.log(`\n⚠️  Unterschiede gefunden:`);
      result.differences.slice(0, 5).forEach((diff, idx) => {
        console.log(`  ${idx + 1}. ${diff.type} (${diff.severity})`);
        if (diff.difference !== undefined) {
          console.log(`     Differenz: ${diff.difference.toFixed(2)}px`);
        }
      });
    }
    
    if (result.yPositionSuggestions.length > 0) {
      console.log(`\n💡 Baseline-Offset Vorschläge:`);
      result.yPositionSuggestions.forEach((suggestion, idx) => {
        console.log(`\n  ${idx + 1}. FontSize: ${suggestion.fontSize}px`);
        console.log(`     Aktuell: fontSize * 0.8 = ${suggestion.currentBaselineOffset.toFixed(2)}px`);
        console.log(`     Durchschnittliche Y-Differenz: ${suggestion.averageYDifference.toFixed(2)}px`);
        console.log(`     Vorschlag: ${suggestion.suggestedFormula}`);
        console.log(`     Betroffene Runs: ${suggestion.affectedRuns}`);
      });
    } else if (result.differences.length === 0) {
      console.log(`\n✅ Keine Unterschiede gefunden! Layouts sind identisch.`);
    }
    
    console.log(`\n✅ Ergebnisse gespeichert in: ${outputFile}`);
    
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
  compareElementLayouts,
  compareLayouts,
  analyzeYPositionDifferences
};


