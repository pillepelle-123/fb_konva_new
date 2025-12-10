# Vergleich Seite 442 (nach Baseline-Offset-Erweiterung)

**Datum:** 2025-12-09  
**Verglichene PDFs:**
- Client: `uploads/pdf-exports/569/442_client.pdf`
- Server: `uploads/pdf-exports/569/442_server.pdf` (neu generiert nach Baseline-Offset-Erweiterung)

## 📊 Vergleichsergebnisse

### Gesamtunterschied
- **4.08% Pixel-Unterschied** (88.770 von 2.174.960 Pixeln)
- **Durchschnittliche Farbdifferenz:** 1.26% pro Pixel
- **Status:** ❌ Unterschiede gefunden (identisch mit vorherigen Vergleichen)

### Implementierte Anpassungen

1. ✅ **Font-Family-Auflösung:** `resolveFontFamily()` implementiert
2. ✅ **Farb-Normalisierung entfernt:** Farben werden direkt verwendet
3. ✅ **Baseline-Offset erweitert:** `getBaselineOffset()` unterstützt jetzt `fontWeight` und `fontStyle`

### Analyse

Die Unterschiede bleiben bei **4.08%**, was darauf hindeutet, dass:
- Die Baseline-Offset-Erweiterung möglicherweise noch nicht vollständig wirksam ist
- Oder es gibt andere strukturelle Unterschiede, die nicht durch Baseline-Offset behoben werden können

## 🔍 Mögliche weitere Ursachen

### 1. Font-Loading-Unterschiede
- Client lädt Fonts über Google Fonts im Browser
- Server lädt Fonts möglicherweise anders oder nicht vollständig
- Unterschiedliche Font-Rendering-Engines

### 2. Canvas/DPI-Unterschiede
- Unterschiedliche Canvas-Auflösung
- Unterschiedliche DPI-Einstellungen zwischen Browser und Puppeteer
- Unterschiedliche Anti-Aliasing-Algorithmen

### 3. Text-Rendering-Hints
- Unterschiedliche Text-Rendering-Hints zwischen Browser und Puppeteer
- Unterschiedliche Subpixel-Rendering-Einstellungen

### 4. Layout-Berechnungs-Unterschiede
- Mögliche Unterschiede in der `createLayout()` Funktion
- Unterschiedliche Text-Wrapping-Logik

## 💡 Nächste Schritte

1. **Visuelle Analyse:** Vergleichsbilder öffnen und Unterschiede identifizieren
2. **Debug-Logging:** Font-Metriken zwischen Client und Server vergleichen
3. **Element-spezifische Analyse:** Prüfen, welche Elemente die größten Unterschiede verursachen
4. **Font-Metriken-Vergleich:** Prüfen, ob die Baseline-Offset-Berechnung tatsächlich unterschiedliche Werte liefert



