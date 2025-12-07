# Phase 7.2: Circle Element Size - Revert und Analyse

## Problem nach Fix

**Nach dem Fix (radius statt radius * 2):**
- Circle ist nur noch halb so groß (~72-75 Pixel statt 145 Pixel)

**Das bedeutet:**
- Rough.js `rc.circle()` erwartet tatsächlich den **Durchmesser** (radius * 2)
- Der ursprüngliche Code war korrekt

## Ursprüngliches Problem

**Ursprünglicher Durchmesser:** ~145 Pixel  
**Erwarteter Durchmesser:** 150 Pixel

**Abweichung:** ~5 Pixel zu klein

## Mögliche Ursachen für die 5-Pixel-Abweichung

Da die Berechnung korrekt ist (radius * 2), liegt das Problem vermutlich woanders:

### 1. Stroke-Width-Einfluss
- Stroke-Width: 2 Pixel
- Wenn Stroke "nach innen" gezeichnet wird, reduziert das die sichtbare Größe
- Aber: 2 Pixel Stroke sollten nur 4 Pixel Durchmesser-Differenz verursachen (2 Pixel auf jeder Seite)
- Passt nicht ganz zu 5 Pixel

### 2. Rough.js Path-Variation
- Rough.js generiert "handgezeichnete" Paths mit Variationen
- Die tatsächliche Größe kann leicht variieren
- Aber: 5 Pixel ist relativ groß für eine Variation

### 3. PDF-Rendering-Skalierung
- PDF wird bei 300 DPI gerendert
- Rundungsfehler bei der Skalierung
- Könnte zu leichten Größenunterschieden führen

### 4. Path-Extraktion aus Rough.js
- Der Path wird aus dem Rough.js SVG-Element extrahiert
- Möglicherweise werden nicht alle Path-Segmente korrekt extrahiert
- Oder die Path-Koordinaten werden anders interpretiert

## Nächste Schritte

1. **Code zurückgesetzt** - `radius * 2` wiederhergestellt
2. **Weitere Analyse erforderlich:**
   - Prüfen, ob der Path korrekt extrahiert wird
   - Prüfen, ob Stroke-Width die Größe beeinflusst
   - Vergleich zwischen Konva.Circle (ohne Theme) und Rough Path

## Status

✅ **Code korrekt** - Rough.js erwartet Durchmesser (radius * 2)  
❓ **5-Pixel-Abweichung** - Ursache noch unklar, vermutlich Stroke-Width oder Path-Extraktion

