# Debug-Anleitung: Font-Metriken-Vergleich

## Implementierte Debug-Logging

### Server-seitig (`shared/rendering/render-qna.js`)
- Loggt Font-Metriken für die ersten 3 Text-Runs
- Enthält: `actualBoundingBoxAscent`, `actualBoundingBoxDescent`, `baselineOffset`, `font`, `fontSize`, `fontFamily`, `fontWeight`, `fontStyle`
- Console-Output: `[SERVER render-qna] Font metrics for run:`

### Client-seitig (`client/src/components/pdf-renderer/pdf-renderer.tsx`)
- Loggt Font-Metriken für die ersten 3 Text-Runs
- Enthält: `actualBoundingBoxAscent`, `actualBoundingBoxDescent`, `baselineOffset`, `font`, `fontSize`, `fontFamily`, `fontWeight`, `fontStyle`
- Console-Output: `[CLIENT PDFRenderer] Font metrics for run:`

## Verwendung

### 1. Server-seitiges Logging
Beim Server-seitigen PDF-Export werden die Logs in der Konsole ausgegeben:
```bash
node server/services/pdf-export.js
# oder beim Export über die API
```

### 2. Client-seitiges Logging
Beim Client-seitigen PDF-Export werden die Logs in der Browser-Konsole ausgegeben:
- Öffne Browser DevTools (F12)
- Gehe zu Console-Tab
- Führe Client-seitigen PDF-Export durch
- Suche nach `[CLIENT PDFRenderer] Font metrics for run:`

## Vergleich der Metriken

### Zu vergleichende Werte:
1. **`actualBoundingBoxAscent`** - Sollte identisch sein zwischen Client und Server
2. **`baselineOffset`** - Sollte identisch sein zwischen Client und Server
3. **`font`** - Font-String sollte identisch formatiert sein
4. **`topY`** - Finale Y-Position sollte identisch sein

### Mögliche Unterschiede:
- **Unterschiedliche `actualBoundingBoxAscent`**: Font wird möglicherweise unterschiedlich geladen oder gerendert
- **Unterschiedliche `baselineOffset`**: Font-Metriken werden unterschiedlich berechnet
- **Unterschiedliche `topY`**: Baseline-Offset-Berechnung führt zu unterschiedlichen Positionen

## Nächste Schritte

1. **Server-seitigen PDF-Export durchführen** und Logs sammeln
2. **Client-seitigen PDF-Export durchführen** und Logs sammeln
3. **Logs vergleichen** und Unterschiede identifizieren
4. **Anpassungen vornehmen** basierend auf den gefundenen Unterschieden



