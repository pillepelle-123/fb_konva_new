# Vergleich Seite 441 (nach Server-Anpassungen)

**Datum:** 2025-12-09  
**Verglichene PDFs:**
- Client: `uploads/pdf-exports/569/441_client.pdf`
- Server: `uploads/pdf-exports/569/441_server.pdf` (neu generiert nach Anpassungen)

## 📊 Vergleichsergebnisse

### Gesamtunterschied
- **4.08% Pixel-Unterschied** (88.770 von 2.174.960 Pixeln)
- **Durchschnittliche Farbdifferenz:** 1.26% pro Pixel
- **Status:** ❌ Unterschiede gefunden (identisch mit vorherigen Vergleichen)

### Implementierte Anpassungen

1. ✅ **Font-Family-Auflösung:** `resolveFontFamily()` implementiert (entspricht Client-Logik)
2. ✅ **Farb-Normalisierung entfernt:** Farben werden direkt verwendet (wie Client)
3. ✅ **Baseline-Offset:** Bereits korrekt implementiert

### Analyse

Die Unterschiede bleiben bei **4.08%**, was darauf hindeutet, dass:
- Die Änderungen möglicherweise noch nicht vollständig wirksam sind
- Oder es gibt andere strukturelle Unterschiede zwischen Client und Server

## 🔍 Mögliche weitere Ursachen

### 1. Font-Loading-Unterschiede
- Client lädt Fonts über Google Fonts im Browser
- Server lädt Fonts möglicherweise anders oder nicht vollständig

### 2. Rendering-Engine-Unterschiede
- Client: Browser-Konva.js Rendering
- Server: Puppeteer/Chromium Rendering
- Unterschiedliche Anti-Aliasing- oder Subpixel-Rendering-Algorithmen

### 3. Canvas-Kontext-Unterschiede
- Unterschiedliche Canvas-Auflösung oder DPI-Einstellungen
- Unterschiedliche Text-Rendering-Hints

### 4. Layout-Berechnungs-Unterschiede
- Mögliche Unterschiede in der `createLayout()` Funktion
- Unterschiedliche Text-Wrapping-Logik

## 💡 Nächste Schritte

1. **Visuelle Analyse:** Vergleichsbilder öffnen und Unterschiede identifizieren
2. **Debug-Logging:** Server-seitiges Rendering mit Debug-Output versehen
3. **Element-spezifische Analyse:** Prüfen, welche Elemente die größten Unterschiede verursachen
4. **Font-Metriken-Vergleich:** Font-Metriken zwischen Client und Server vergleichen



