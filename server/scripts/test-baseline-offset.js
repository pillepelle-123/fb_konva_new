/**
 * Test-Skript für Baseline-Offset-Berechnung
 * 
 * Testet die getBaselineOffset-Funktion mit verschiedenen Font-Größen
 * und vergleicht die Ergebnisse mit der Approximation (fontSize * 0.8)
 */

const { getBaselineOffset } = require('../../shared/utils/text-layout.server');

// Erstelle Canvas-Context für Font-Metriken
let canvas;
let ctx;

try {
  // Versuche node-canvas zu verwenden (falls verfügbar)
  canvas = require('canvas').createCanvas(100, 100);
  ctx = canvas.getContext('2d');
} catch (error) {
  // Fallback: Kein Canvas verfügbar
  console.warn('⚠️  node-canvas nicht verfügbar, verwende Approximation');
  ctx = null;
}

/**
 * Testet Baseline-Offset für verschiedene Font-Größen
 */
function testBaselineOffset() {
  console.log('\n📊 Teste Baseline-Offset-Berechnung\n');
  console.log('='.repeat(80));
  
  const testCases = [
    { fontSize: 16, fontFamily: 'Arial, sans-serif', description: 'Kleine Schrift' },
    { fontSize: 24, fontFamily: 'Arial, sans-serif', description: 'Normale Schrift' },
    { fontSize: 32, fontFamily: 'Arial, sans-serif', description: 'Mittlere Schrift' },
    { fontSize: 42, fontFamily: 'Arial, sans-serif', description: 'Große Schrift (Question)' },
    { fontSize: 48, fontFamily: 'Arial, sans-serif', description: 'Große Schrift (Answer)' },
    { fontSize: 58, fontFamily: 'Arial, sans-serif', description: 'Sehr große Schrift (Question)' },
    { fontSize: 50, fontFamily: 'Arial, sans-serif', description: 'Sehr große Schrift (Answer)' },
    { fontSize: 72, fontFamily: 'Arial, sans-serif', description: 'Extra große Schrift' },
  ];
  
  const results = [];
  
  testCases.forEach((testCase, index) => {
    const { fontSize, fontFamily, description } = testCase;
    
    // Berechne mit getBaselineOffset
    const preciseOffset = getBaselineOffset(fontSize, ctx, fontFamily);
    
    // Berechne mit Approximation
    const approximateOffset = fontSize * 0.8;
    
    // Differenz
    const difference = Math.abs(preciseOffset - approximateOffset);
    const differencePercent = (difference / approximateOffset) * 100;
    
    results.push({
      fontSize,
      description,
      preciseOffset: preciseOffset.toFixed(2),
      approximateOffset: approximateOffset.toFixed(2),
      difference: difference.toFixed(2),
      differencePercent: differencePercent.toFixed(2) + '%',
      usesMetrics: ctx !== null && preciseOffset !== approximateOffset
    });
    
    console.log(`\n${index + 1}. ${description} (${fontSize}px)`);
    console.log(`   Präziser Offset:    ${preciseOffset.toFixed(2)}px`);
    console.log(`   Approximation:      ${approximateOffset.toFixed(2)}px`);
    console.log(`   Differenz:          ${difference.toFixed(2)}px (${differencePercent.toFixed(2)}%)`);
    if (ctx && preciseOffset !== approximateOffset) {
      console.log(`   ✅ Verwendet Font-Metriken`);
    } else {
      console.log(`   ℹ️  Verwendet Approximation`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Zusammenfassung:\n');
  
  const avgDifference = results.reduce((sum, r) => sum + parseFloat(r.difference), 0) / results.length;
  const maxDifference = Math.max(...results.map(r => parseFloat(r.difference)));
  const usesMetricsCount = results.filter(r => r.usesMetrics).length;
  
  console.log(`   Durchschnittliche Differenz: ${avgDifference.toFixed(2)}px`);
  console.log(`   Maximale Differenz:         ${maxDifference.toFixed(2)}px`);
  console.log(`   Font-Metriken verwendet:    ${usesMetricsCount}/${results.length}`);
  
  if (avgDifference < 0.1) {
    console.log(`\n   ✅ Approximation ist sehr genau (< 0.1px Durchschnitt)`);
  } else if (avgDifference < 1) {
    console.log(`\n   ⚠️  Approximation ist akzeptabel (< 1px Durchschnitt)`);
  } else {
    console.log(`\n   ❌ Approximation könnte verbessert werden (> 1px Durchschnitt)`);
  }
  
  // Teste verschiedene Font-Familien
  if (ctx) {
    console.log('\n' + '='.repeat(80));
    console.log('\n🔤 Teste verschiedene Font-Familien (48px):\n');
    
    const fontFamilies = [
      'Arial, sans-serif',
      'Times New Roman, serif',
      'Courier New, monospace',
      'Comic Sans MS, cursive'
    ];
    
    fontFamilies.forEach(fontFamily => {
      const offset = getBaselineOffset(48, ctx, fontFamily);
      const approximate = 48 * 0.8;
      const diff = Math.abs(offset - approximate);
      
      console.log(`   ${fontFamily}`);
      console.log(`     Präziser: ${offset.toFixed(2)}px, Approximation: ${approximate.toFixed(2)}px, Diff: ${diff.toFixed(2)}px`);
    });
  }
  
  return results;
}

// Führe Tests aus
try {
  const results = testBaselineOffset();
  
  // Speichere Ergebnisse
  const fs = require('fs').promises;
  fs.writeFile('baseline-offset-test-results.json', JSON.stringify(results, null, 2))
    .then(() => {
      console.log('\n✅ Ergebnisse gespeichert in: baseline-offset-test-results.json\n');
    })
    .catch(err => {
      console.warn('⚠️  Konnte Ergebnisse nicht speichern:', err.message);
    });
  
} catch (error) {
  console.error('❌ Fehler beim Testen:', error.message);
  console.error(error.stack);
  process.exit(1);
}


