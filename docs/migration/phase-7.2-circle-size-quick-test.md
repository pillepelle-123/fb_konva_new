# Schnelltest: Circle Element Size

## Einfache Test-Anleitung

### Schritt 1: PDF generieren
```powershell
cd server
node scripts/test-pdf-debug.js
```

### Schritt 2: In der Konsole nach folgenden Zeilen suchen

**Für Client-seitiges Rendering:**
- Suche nach: `[DEBUG PDFRenderer] Circle rendered:`

**Für Server-seitiges Rendering:**
- Suche nach: `[DEBUG renderElement] Rendering circle:`

### Schritt 3: Werte vergleichen

**Vergleiche diese Werte zwischen beiden Logs:**
- `elementWidth` - sollte identisch sein
- `elementHeight` - sollte identisch sein  
- `radius` - sollte identisch sein

### Schritt 4: PDF visuell prüfen

1. Öffne: `server/uploads/pdf-exports/999/999.pdf`
2. Gehe zu Seite 1
3. Prüfe den grünen Circle (circle-1)
4. Vergleich mit dem roten Rect (rect-1)
   - Rect: 200x150 (Breite x Höhe)
   - Circle: 150x150 (sollte Radius 75 haben)

**Frage:** Ist der Circle wirklich kleiner als erwartet, oder sieht er korrekt aus?

## Erwartete Werte (aus Test-Skript)

**Circle-1 Element:**
- x: 300
- y: 50
- width: 150
- height: 150
- **Erwarteter Radius:** 75 (Math.min(150, 150) / 2)

**Rect-1 Element:**
- x: 50
- y: 50
- width: 200
- height: 150

**Visueller Vergleich:**
- Rect ist breiter (200 vs 150)
- Circle ist quadratisch (150x150)
- Circle sollte etwa 3/4 der Breite des Rects haben

