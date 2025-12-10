# Detaillierte Analyse: Vergleich Seite 441

**Datum:** 2025-12-09  
**Verglichene PDFs:**
- Client: `uploads/pdf-exports/569/441_client.pdf`
- Server: `uploads/pdf-exports/569/441_server.pdf` (nach Anpassungen)

## 📊 Vergleichsergebnisse

### Gesamtunterschied
- **4.08% Pixel-Unterschied** (88.770 von 2.174.960 Pixeln)
- **Durchschnittliche Farbdifferenz:** 1.26% pro Pixel
- **Status:** ❌ Unterschiede gefunden (identisch mit vorherigen Vergleichen)

### Regionale Verteilung
Die größten Unterschiede befinden sich in den **zentralen Text-Bereichen**:

| Region | Unterschied | Durchschnittliche Farbdifferenz |
|--------|-------------|----------------------------------|
| **top-center** | 9.41% | R=88.9, G=112.5, B=113.6 |
| **top-left** | 6.40% | R=94.4, G=105.9, B=101.2 |
| **middle-center** | 5.51% | R=103.1, G=111.8, B=111.0 |

### Vertikale Hotspots
- **Y 525-700px:** 10.54% Unterschied (höchste Differenz)
- **Y 350-525px:** 10.22% Unterschied
- **Y 1050-1225px:** 6.17% Unterschied

### Horizontale Hotspots
- **X 372-496px:** 8.39% Unterschied (höchste Differenz)
- **X 496-620px:** 6.94% Unterschied
- **X 248-372px:** 6.65% Unterschied

### Farbmuster
- **67.1% "mostly-blue"** - Unterschiede hauptsächlich in Blau-Komponente
- **20.2% "mostly-red"** - Unterschiede in Rot-Komponente
- **12.6% "mostly-green"** - Unterschiede in Grün-Komponente

## ✅ Implementierte Anpassungen

1. ✅ **Font-Family-Auflösung:** `resolveFontFamily()` implementiert
2. ✅ **Farb-Normalisierung entfernt:** Farben werden direkt verwendet
3. ✅ **Baseline-Offset:** Context wird mit Font-Einstellung konfiguriert

## 🔍 Mögliche weitere Ursachen

Da die Unterschiede identisch bleiben, gibt es möglicherweise andere strukturelle Unterschiede:

### 1. Baseline-Offset-Berechnung im Client
**Problem:** Client konfiguriert Context nicht vor `getBaselineOffset()` Aufruf

**Client (`pdf-renderer.tsx` Zeile 3315):**
```typescript
const canvasContext = typeof document !== 'undefined' 
  ? document.createElement('canvas').getContext('2d')
  : null;
const baselineOffset = sharedGetBaselineOffset(fontSize, canvasContext, fontFamily);
```

**Server (`render-qna.js` Zeile 702-705):**
```javascript
ctx.save();
ctx.font = `${fontWeight} ${fontStyle} ${style.fontSize}px ${fontFamily}`;
const baselineOffset = getBaselineOffset(style.fontSize, ctx, fontFamily);
ctx.restore();
```

**Lösung:** Client sollte auch Context mit Font-Einstellung konfigurieren, bevor `getBaselineOffset()` aufgerufen wird.

### 2. Font-Loading-Unterschiede
- Client lädt Fonts über Google Fonts im Browser
- Server lädt Fonts möglicherweise anders oder nicht vollständig
- Unterschiedliche Font-Rendering-Engines

### 3. Canvas/DPI-Unterschiede
- Unterschiedliche Canvas-Auflösung
- Unterschiedliche DPI-Einstellungen zwischen Browser und Puppeteer
- Unterschiedliche Anti-Aliasing-Algorithmen

### 4. Text-Rendering-Hints
- Unterschiedliche Text-Rendering-Hints zwischen Browser und Puppeteer
- Unterschiedliche Subpixel-Rendering-Einstellungen

## 💡 Empfohlene nächste Schritte

1. **Client Baseline-Offset anpassen:** Context mit Font-Einstellung konfigurieren
2. **Visuelle Analyse:** Vergleichsbilder öffnen und Unterschiede identifizieren
3. **Debug-Logging:** Font-Metriken zwischen Client und Server vergleichen
4. **Element-spezifische Analyse:** Prüfen, welche Elemente die größten Unterschiede verursachen



