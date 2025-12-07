# Phase 7.2: Ruled Lines - Status und nächste Schritte

## ✅ Code vorhanden

**PDFRenderer Komponente:**
- ✅ Ruled Lines Rendering-Code vorhanden (Zeilen 2782-2893)
- ✅ `linePositions` werden für inline Layout generiert (Zeilen 2506-2737)
- ✅ Debug-Logs vorhanden (Zeile 2786-2795)

**Bedingungen für Ruled Lines:**
```typescript
if (ruledLines && linePositions && linePositions.length > 0 && layoutVariant !== 'block') {
  // Render ruled lines
}
```

## Analyse

**Code-Struktur:**
1. **Inline Layout:** `linePositionsInline` wird während Text-Rendering erstellt
2. **Speichern:** `linePositions = linePositionsInline` (Zeile 2737)
3. **Rendering:** Ruled Lines werden gerendert, wenn `linePositions.length > 0`

**Test-PDF Element:**
- `ruledLines: true` ✅
- `layoutVariant: 'inline'` ✅
- Sollte funktionieren!

## Mögliche Probleme

### Problem 1: `linePositions` sind leer
- **Ursache:** Text-Rendering wird möglicherweise übersprungen oder `linePositionsInline` wird nicht korrekt gefüllt
- **Lösung:** Debug-Logs prüfen, ob `linePositionsCount > 0`

### Problem 2: Ruled Lines werden nicht sichtbar
- **Ursache:** Opacity zu niedrig, Stroke-Width zu klein, oder Farbe nicht sichtbar
- **Lösung:** Prüfen, ob Linien gerendert werden (`ruledLinesNodes.length > 0`)

### Problem 3: Rough.js nicht verfügbar
- **Ursache:** `(window as any).rough` ist undefined
- **Lösung:** Fallback zu einfachen Linien sollte funktionieren

## Nächste Schritte

1. **Logs analysieren:** Test-PDF Logs prüfen für:
   - `[PDFRenderer] Ruled lines check:` - Zeigt `linePositionsCount`
   - Werden Linien gerendert? (`ruledLinesNodes.length > 0`)

2. **Visuell prüfen:** PDF öffnen und schauen, ob Ruled Lines sichtbar sind

3. **Falls nicht sichtbar:** 
   - Prüfen, ob `linePositions` generiert werden
   - Prüfen, ob Linien zum Layer hinzugefügt werden
   - Prüfen, ob Opacity/Stroke-Width korrekt sind

## Empfehlung

**Code sieht korrekt aus.** Problem könnte sein:
- `linePositions` werden nicht generiert (Text-Rendering-Probleme)
- Linien werden gerendert, aber nicht sichtbar (Opacity/Stroke)
- Rough.js Path-Generierung schlägt fehl, Fallback funktioniert nicht

**Nächste Aktion:** Test-PDF Logs analysieren oder PDF visuell prüfen, ob Ruled Lines vorhanden sind.

