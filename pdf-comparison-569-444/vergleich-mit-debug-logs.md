# Vergleich Seite 444 (mit Debug-Logs)

**Datum:** 2025-12-09  
**Verglichene PDFs:**
- Client: `uploads/pdf-exports/569/444_client.pdf`
- Server: `uploads/pdf-exports/569/444_server.pdf` (neu generiert mit Debug-Logs)

## 📊 Vergleichsergebnisse

### Gesamtunterschied
- **4.08% Pixel-Unterschied** (88.770 von 2.174.960 Pixeln)
- **Durchschnittliche Farbdifferenz:** 1.26% pro Pixel
- **Status:** ❌ Unterschiede gefunden (identisch mit vorherigen Vergleichen)

### Implementierte Anpassungen

1. ✅ **Font-Family-Auflösung:** `resolveFontFamily()` implementiert
2. ✅ **Farb-Normalisierung entfernt:** Farben werden direkt verwendet
3. ✅ **Baseline-Offset erweitert:** `getBaselineOffset()` unterstützt jetzt `fontWeight` und `fontStyle`
4. ✅ **Debug-Logging:** Font-Metriken werden jetzt explizit extrahiert und geloggt

## 🔍 Debug-Logging Status

### Server-seitig (`shared/rendering/render-qna.js`)
- Loggt Font-Metriken für die ersten 3 Text-Runs
- Metriken-Werte werden jetzt explizit extrahiert (nicht mehr als JSHandle)
- Console-Output: `[SERVER render-qna] Font metrics for run:`

**Erwartete Log-Ausgabe:**
```json
{
  "runIndex": 0,
  "text": "...",
  "font": "bold italic 71px Mynerve, cursive",
  "fontSize": 71,
  "fontFamily": "Mynerve, cursive",
  "fontWeight": "bold",
  "fontStyle": "italic",
  "actualBoundingBoxAscent": <number>,
  "actualBoundingBoxDescent": <number>,
  "width": <number>,
  "baselineOffset": <number>,
  "fallback": 56.8,
  "usingMetrics": true/false,
  "baselineY": <number>,
  "topY": <number>
}
```

### Client-seitig (`client/src/components/pdf-renderer/pdf-renderer.tsx`)
- Loggt Font-Metriken für die ersten 3 Text-Runs
- Wird nur beim Server-seitigen Export über Puppeteer ausgelöst
- Client-seitiger Export (`pdf-export.ts`) klont den bereits gerenderten Stage, daher werden diese Logs nicht ausgelöst

## 📋 Nächste Schritte

1. **Server-Logs analysieren:** Prüfen, ob die Font-Metriken-Werte jetzt korrekt ausgegeben werden
2. **Metriken vergleichen:** Wenn die Server-Logs die Werte zeigen, können wir diese mit den erwarteten Werten vergleichen
3. **Weitere Anpassungen:** Basierend auf den Metriken-Unterschieden weitere Optimierungen vornehmen

## 💡 Mögliche Ursachen für 4.08% Unterschied

Da die Unterschiede identisch bleiben, gibt es möglicherweise andere strukturelle Unterschiede:

1. **Font-Loading-Unterschiede:** Client lädt Fonts über Google Fonts im Browser, Server möglicherweise anders
2. **Canvas/DPI-Unterschiede:** Unterschiedliche Canvas-Auflösung oder DPI-Einstellungen
3. **Text-Rendering-Hints:** Unterschiedliche Text-Rendering-Hints zwischen Browser und Puppeteer
4. **Anti-Aliasing:** Unterschiedliche Anti-Aliasing-Algorithmen




