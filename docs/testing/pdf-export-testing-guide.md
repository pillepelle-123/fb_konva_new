# PDF Export Testing & Validierung Guide

## Übersicht

Dieses Dokument beschreibt, wie die visuelle Parität zwischen Browser-Export und Server-Export (Puppeteer) getestet werden kann.

## Test-Setup

### Voraussetzungen

1. **Browser-Export**: Funktioniert über die UI im Editor
2. **Server-Export**: Funktioniert über die Export-Seite (`/books/[bookId]/export`)

### Test-Daten vorbereiten

Erstelle Test-Bücher mit verschiedenen Elementtypen und Konfigurationen:

1. **Test-Buch 1: Alle Elementtypen**
   - Rect mit verschiedenen Fills, Strokes, Themes
   - Circle mit verschiedenen Fills, Strokes, Themes
   - Text mit verschiedenen Fonts, Colors, Alignments
   - Image mit verschiedenen Crops, Opacities
   - QnA Inline mit und ohne Ruled Lines

2. **Test-Buch 2: Background-Varianten**
   - Color Backgrounds (verschiedene Farben, Opacities)
   - Pattern Backgrounds (alle Pattern-Typen)
   - Image Backgrounds (verschiedene Bilder, Crops)

3. **Test-Buch 3: Theme & Palette Tests**
   - Verschiedene Themes (Rough, Default, Custom)
   - Verschiedene Color Palettes
   - Page-level vs. Book-level Palettes

## Test-Checkliste

### 1. Visuelle Parität - Elementtypen

#### Rect Elemente
- [ ] Rect mit Fill (verschiedene Farben)
- [ ] Rect mit Stroke (verschiedene Farben, Breiten)
- [ ] Rect mit Fill und Stroke
- [ ] Rect mit Rough Theme
- [ ] Rect mit Default Theme
- [ ] Rect mit Opacity < 1
- [ ] Rect mit Rotation
- [ ] Rect mit Corner Radius

#### Circle Elemente
- [ ] Circle mit Fill (verschiedene Farben)
- [ ] Circle mit Stroke (verschiedene Farben, Breiten)
- [ ] Circle mit Fill und Stroke
- [ ] Circle mit Rough Theme
- [ ] Circle mit Default Theme
- [ ] Circle mit Opacity < 1
- [ ] Circle mit Rotation

#### Text Elemente
- [ ] Text mit verschiedenen Fonts (Arial, Mynerve, etc.)
- [ ] Text mit verschiedenen Font Sizes
- [ ] Text mit verschiedenen Colors
- [ ] Text mit verschiedenen Alignments (left, center, right)
- [ ] Text mit Bold/Italic
- [ ] Text mit Opacity < 1
- [ ] Text mit Rotation
- [ ] Text mit Word Wrap
- [ ] Mehrzeiliger Text

#### Image Elemente
- [ ] Image mit verschiedenen Crops
- [ ] Image mit verschiedenen Opacities
- [ ] Image mit verschiedenen Sizes
- [ ] Image mit Rotation
- [ ] Image mit Aspect Ratio Preservation
- [ ] Sehr große Images
- [ ] Sehr kleine Images

#### QnA Inline Elemente
- [ ] QnA Inline ohne Ruled Lines
- [ ] QnA Inline mit Ruled Lines
- [ ] QnA Inline mit verschiedenen Themes
- [ ] QnA Inline mit verschiedenen Color Palettes
- [ ] QnA Inline mit Question-Text
- [ ] QnA Inline ohne Question-Text
- [ ] QnA Inline mit verschiedenen Font Sizes für Question/Answer
- [ ] QnA Inline mit Background
- [ ] QnA Inline mit Border

### 2. Visuelle Parität - Background-Rendering

#### Color Backgrounds
- [ ] Color Background (verschiedene Farben)
- [ ] Color Background mit Opacity < 1
- [ ] Color Background mit Palette-Farben

#### Pattern Backgrounds
- [ ] Pattern: Dots
- [ ] Pattern: Grid
- [ ] Pattern: Diagonal Lines
- [ ] Pattern: Cross Hatch
- [ ] Pattern: Waves
- [ ] Pattern: Hexagons
- [ ] Pattern mit verschiedenen Colors
- [ ] Pattern mit verschiedenen Sizes
- [ ] Pattern mit verschiedenen Stroke Widths
- [ ] Pattern mit Opacity < 1

#### Image Backgrounds
- [ ] Image Background (verschiedene Bilder)
- [ ] Image Background mit Cover Size
- [ ] Image Background mit Contain Size
- [ ] Image Background mit Repeat
- [ ] Image Background mit verschiedenen Positions
- [ ] Image Background mit Opacity < 1
- [ ] Image Background mit Crop

### 3. Visuelle Parität - Theme-Anwendung

- [ ] Rough Theme für Rect
- [ ] Rough Theme für Circle
- [ ] Rough Theme für Text
- [ ] Rough Theme für QnA Inline
- [ ] Default Theme für alle Elemente
- [ ] Custom Themes für alle Elemente
- [ ] Theme-Hierarchie (Page > Book)

### 4. Visuelle Parität - Color Palette-Anwendung

- [ ] Verschiedene Palettes
- [ ] Page-level Palette
- [ ] Book-level Palette
- [ ] Palette-Hierarchie (Page > Book)
- [ ] Palette-Anwendung auf Backgrounds
- [ ] Palette-Anwendung auf Elemente

### 5. Edge Cases

#### Leere Seiten
- [ ] Seite ohne Elemente, ohne Background
- [ ] Seite ohne Elemente, mit Background
- [ ] Seite mit Elementen, ohne Background
- [ ] Seite mit nur einem Element

#### Fehlerbehandlung
- [ ] Fehlende Bilder (Error-Handling, Fallback)
- [ ] Ungültige Bild-URLs
- [ ] Sehr große Bilder (Memory-Test)
- [ ] Sehr viele Elemente (Performance-Test)
- [ ] Sehr große Seiten (Performance-Test)

#### Grenzwerte
- [ ] Elemente außerhalb des Canvas-Bereichs
- [ ] Negative Koordinaten
- [ ] Sehr große Rotation-Werte (360°, 720°, etc.)
- [ ] Sehr kleine Elemente
- [ ] Sehr große Elemente

### 6. Performance-Tests

- [ ] Rendering-Geschwindigkeit für einzelne Seite
- [ ] Rendering-Geschwindigkeit für mehrere Seiten
- [ ] Memory-Verbrauch für große Bücher
- [ ] Memory-Verbrauch für viele Elemente
- [ ] Memory-Verbrauch für große Bilder

## Test-Durchführung

### Schritt 1: Browser-Export erstellen

1. Öffne ein Test-Buch im Editor
2. Navigiere zur Export-Seite oder verwende den Export-Button im Editor
3. Wähle "Browser Export" (falls verfügbar) oder nutze den normalen Export
4. Speichere das generierte PDF als `browser-export-[test-name].pdf`

### Schritt 2: Server-Export erstellen

1. Öffne die Export-Seite: `/books/[bookId]/export`
2. Erstelle einen neuen Server-Export mit denselben Optionen
3. Warte auf die Fertigstellung
4. Lade das generierte PDF herunter als `server-export-[test-name].pdf`

### Schritt 3: Vergleich durchführen

#### Visueller Vergleich

1. Öffne beide PDFs in einem PDF-Viewer (z.B. Adobe Reader, PDF.js)
2. Stelle sicher, dass beide im gleichen Zoom-Level sind
3. Vergleiche Seite für Seite:
   - Sind alle Elemente vorhanden?
   - Haben Elemente die gleiche Position?
   - Haben Elemente die gleiche Größe?
   - Haben Elemente die gleichen Farben?
   - Haben Elemente die gleichen Fonts?
   - Sind Backgrounds identisch?
   - Sind Themes korrekt angewendet?
   - Sind Palettes korrekt angewendet?

#### Pixel-Vergleich (Optional)

Für automatisierten Vergleich können Tools wie `pixelmatch` oder `sharp` verwendet werden:

```javascript
// Beispiel: Pixel-Vergleich mit sharp
const sharp = require('sharp');
const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');

async function comparePDFs(browserPDF, serverPDF) {
  // Konvertiere PDF-Seiten zu PNG
  const browserPNG = await convertPDFPageToPNG(browserPDF, 0);
  const serverPNG = await convertPDFPageToPNG(serverPDF, 0);
  
  // Vergleiche Pixel
  const diff = new PNG({ width: browserPNG.width, height: browserPNG.height });
  const numDiffPixels = pixelmatch(
    browserPNG.data,
    serverPNG.data,
    diff.data,
    browserPNG.width,
    browserPNG.height,
    { threshold: 0.1 }
  );
  
  const diffPercentage = (numDiffPixels / (browserPNG.width * browserPNG.height)) * 100;
  console.log(`Difference: ${diffPercentage.toFixed(2)}%`);
  
  return diffPercentage < 1; // Weniger als 1% Unterschied
}
```

## Bekannte Probleme dokumentieren

Wenn Unterschiede gefunden werden, dokumentiere:

1. **Elementtyp**: Welches Element ist betroffen?
2. **Unterschied**: Was ist anders?
3. **Screenshot**: Screenshot des Unterschieds
4. **Reproduzierbarkeit**: Kann der Unterschied reproduziert werden?
5. **Schweregrad**: Kritisch / Mittel / Niedrig

## Test-Ergebnisse

### Test-Datum: [Datum]
### Getestet von: [Name]
### Test-Bücher: [Liste der Test-Bücher]

#### Ergebnisse nach Kategorie:

**Elementtypen:**
- Rect: ✅ / ❌ / ⚠️ (Anmerkungen)
- Circle: ✅ / ❌ / ⚠️ (Anmerkungen)
- Text: ✅ / ❌ / ⚠️ (Anmerkungen)
- Image: ✅ / ❌ / ⚠️ (Anmerkungen)
- QnA Inline: ✅ / ❌ / ⚠️ (Anmerkungen)

**Backgrounds:**
- Color: ✅ / ❌ / ⚠️ (Anmerkungen)
- Pattern: ✅ / ❌ / ⚠️ (Anmerkungen)
- Image: ✅ / ❌ / ⚠️ (Anmerkungen)

**Themes:**
- Rough: ✅ / ❌ / ⚠️ (Anmerkungen)
- Default: ✅ / ❌ / ⚠️ (Anmerkungen)
- Custom: ✅ / ❌ / ⚠️ (Anmerkungen)

**Palettes:**
- Page-level: ✅ / ❌ / ⚠️ (Anmerkungen)
- Book-level: ✅ / ❌ / ⚠️ (Anmerkungen)

**Edge Cases:**
- Leere Seiten: ✅ / ❌ / ⚠️ (Anmerkungen)
- Fehlerbehandlung: ✅ / ❌ / ⚠️ (Anmerkungen)
- Grenzwerte: ✅ / ❌ / ⚠️ (Anmerkungen)

**Performance:**
- Rendering-Geschwindigkeit: ✅ / ❌ / ⚠️ (Anmerkungen)
- Memory-Verbrauch: ✅ / ❌ / ⚠️ (Anmerkungen)

## Nächste Schritte

Nach Abschluss der Tests:

1. **Kritische Unterschiede beheben**: Priorisiere Unterschiede nach Schweregrad
2. **Dokumentation aktualisieren**: Aktualisiere diese Test-Dokumentation mit Ergebnissen
3. **Regression-Tests**: Stelle sicher, dass behobene Probleme nicht wieder auftreten
4. **Automatisierung**: Erwäge, häufige Tests zu automatisieren

