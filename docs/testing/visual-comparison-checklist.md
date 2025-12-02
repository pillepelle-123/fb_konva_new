# Visueller Vergleich: Client-side vs. Server-side PDF Export

## Vergleichsdateien

- **Client-Export**: `server/uploads/pdf-exports/565/73_client.pdf`
- **Server-Export**: `server/uploads/pdf-exports/565/73_server.pdf`

## Vergleichsmethode

### Option 1: Side-by-Side Vergleich

1. Öffne beide PDFs in Adobe Acrobat (oder einem anderen PDF-Viewer)
2. Stelle beide PDFs nebeneinander dar
3. Stelle sicher, dass beide PDFs auf 100% Zoom sind
4. Vergleiche Seite für Seite

### Option 2: Overlay-Vergleich (empfohlen)

1. Öffne beide PDFs in Adobe Acrobat
2. Verwende die "Compare Documents" Funktion (falls verfügbar)
3. Oder öffne beide PDFs und wechsle zwischen ihnen hin und her

### Option 3: Screenshot-Vergleich

1. Erstelle Screenshots beider PDFs (gleicher Zoom-Level)
2. Vergleiche die Screenshots visuell
3. Verwende ein Bildvergleichs-Tool (z.B. ImageMagick, GIMP, Photoshop)

## Checkliste für visuellen Vergleich

### 1. Gesamtlayout

- [✓] **Seitengröße**: Sind beide PDFs gleich groß?
- [✓] **Ausrichtung**: Gleiche Orientierung (Portrait/Landscape)?
- [✓] **Seitenränder**: Gleiche Abstände zum Rand?
- [X] **Hintergrund**: Gleicher Hintergrund (Farbe, Pattern, Bild)?
   - siehe unter "4. Hintergründe"

### 2. Elemente - Position und Größe

- [✓] **Rect-Elemente**: Gleiche Position, Größe, Rotation?
- [X] **Circle-Elemente**: Gleiche Position, Größe, Rotation?
   - Position ist ok
   - die Größe ist zu klein beim Server-side Rendering
- [✓] **Text-Elemente**: Gleiche Position, Größe, Ausrichtung?
- [✓] **Image-Elemente**: Gleiche Position, Größe, Crop?
- [X] **QnA Inline**: Gleiche Position, Größe, Ruled Lines?
   - Position und Größe ok.
   - Ruled Lines fehlen in Server-side Rendering

### 3. Elemente - Styling

- [✓] **Farben**: Gleiche Fill-Farben?
   - Hintergrund-Fill für QNA-INLINE-TEXTBOX fehlt in Server-side Rendering 
- [✓] **Strokes**: Gleiche Stroke-Farben und -Breiten?
- [✓] **Opacity**: Gleiche Transparenz?
- [X] **Themes**: Gleiche Theme-Anwendung (Rough, Default)?
   - Rough Theme fehlt in Server-side Rendering
- [X] **Fonts**: Gleiche Schriftarten und -größen?
   - Schriftgröße ok.
   - Schriftart nicht dieselbe (Google Font import fehlt? -> hier müssen alle Fonts aus @font darstellbar sein)


### 4. Hintergründe

- [X] **Color Background**: Gleiche Farbe und Opacity?
   - Farbe ok.
   - Opacity fehlt in Server-side Rendering 
- [X] **Pattern Background**: Gleiches Pattern, Farbe, Größe, Stroke-Width?
   - Gleiche Pattern -> Ok.
   - Pattern size zu klein in Server-side Rendering
   - Pattern color ok.
   - Pattern Stroke Width passt gut.
   - Pattern Opacity fehlt in Server-side Rendering
   - Background color fehlt in Server-side Rendering (stattdessen weiß)
- [X] **Image Background**: Gleiches Bild, Crop, Position?
   - Hintergrundbild fehlt in Server-side Rendering


### 5. Spezielle Features

- [X] **Rough Theme**: Gleiche handgezeichnete Optik?
   - Rough theme fehlt in Server-side Rendering
- [✓] **Color Palettes**: Gleiche Farbpaletten-Anwendung?
- [X] **Element-Overlays**: Gleiche Überlagerungen?
   - Ein shape Objekt liegt im Server-side Rendering hinter einer QNA-INLINE-TEXTBOX, obwohl sie im Editor davor platziert wurde.
- [✓] **Rotation**: Gleiche Rotationswinkel?

## Dokumentation der Ergebnisse

### Wenn alles identisch ist:

```
✅ Visueller Vergleich: BESTANDEN
- Alle Elemente identisch positioniert
- Alle Farben identisch
- Alle Themes identisch angewendet
- Keine Unterschiede festgestellt
```

### Wenn Unterschiede gefunden werden:

Für jeden Unterschied dokumentiere:

1. **Element-Typ**: (z.B. Rect, Circle, Text, Image)
2. **Position**: Wo auf der Seite?
3. **Art des Unterschieds**: (Farbe, Größe, Position, Theme, etc.)
4. **Beschreibung**: Detaillierte Beschreibung des Unterschieds
5. **Screenshot**: Falls möglich, Screenshot des Unterschieds

Beispiel:
```
❌ Unterschied gefunden:
- Element-Typ: Rect
- Position: Oben links (x: 100, y: 50)
- Art: Farbe
- Beschreibung: Client-Export zeigt #FF0000, Server-Export zeigt #FF0001
- Screenshot: [Pfad zum Screenshot]
```

## Nächste Schritte nach dem Vergleich

1. **Wenn identisch**: 
   - Markiere Vergleich als erfolgreich
   - Dokumentiere in TEST_RESULTS.md
   - Optional: Weitere Tests mit verschiedenen Elementtypen durchführen

2. **Wenn Unterschiede gefunden**:
   - Dokumentiere alle Unterschiede
   - Analysiere die Ursache (Rendering-Logik, Konstante, etc.)
   - Behebe die Unterschiede
   - Wiederhole den Vergleich

## Tools für erweiterte Analyse

### PDF-Analyse-Tools

- **Adobe Acrobat**: Vergleichsfunktion (falls verfügbar)
- **PDFtk**: PDF-Manipulation und Vergleich
- **ImageMagick**: PDF zu Bild konvertieren und vergleichen

### Automatischer Pixel-Vergleich (empfohlen)

Ein Skript wurde erstellt, das PDFs automatisch vergleicht:

```powershell
# Automatischer Vergleich aller Seiten
node server/scripts/visual-pdf-comparison.js server/uploads/pdf-exports/565/73_client.pdf server/uploads/pdf-exports/565/73_server.pdf

# Vergleich einer spezifischen Seite (0-basiert)
node server/scripts/visual-pdf-comparison.js server/uploads/pdf-exports/565/73_client.pdf server/uploads/pdf-exports/565/73_server.pdf --page 0

# Mit höherer Auflösung (300 DPI)
node server/scripts/visual-pdf-comparison.js server/uploads/pdf-exports/565/73_client.pdf server/uploads/pdf-exports/565/73_server.pdf --dpi 300

# Mit angepasstem Threshold (Standard: 0.1)
node server/scripts/visual-pdf-comparison.js server/uploads/pdf-exports/565/73_client.pdf server/uploads/pdf-exports/565/73_server.pdf --threshold 0.05

# Ausgabe in spezifisches Verzeichnis
node server/scripts/visual-pdf-comparison.js server/uploads/pdf-exports/565/73_client.pdf server/uploads/pdf-exports/565/73_server.pdf --output-dir ./my-comparison
```

Das Skript erstellt:
- `client_page_*.png` - Client PDF Seiten als Bilder
- `server_page_*.png` - Server PDF Seiten als Bilder  
- `difference_page_*.png` - Visualisierung der Unterschiede (rote Pixel = Unterschiede)

### Bildvergleich mit ImageMagick (Alternative)

```powershell
# PDFs zu Bildern konvertieren (mit ImageMagick)
magick convert 73_client.pdf[0] client_page.png
magick convert 73_server.pdf[0] server_page.png

# Bilder vergleichen
magick compare client_page.png server_page.png difference.png
```

## Erwartetes Ergebnis

Nach der Migration zu pdf-lib sollten beide PDFs **visuell identisch** sein, da:
- ✅ Gleiche Rendering-Logik (shared/rendering/)
- ✅ Gleiche Bibliothek (pdf-lib)
- ✅ Gleiche Konstanten (PAGE_DIMENSIONS, CANVAS_DIMS, PATTERNS)
- ✅ Gleiche Metadaten-Struktur

