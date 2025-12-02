# Test Issue Analysis: PDF Size Mismatch

## Problem

Beim Vergleich von Browser-Export und Server-Export wurde ein Größenunterschied festgestellt:

- **Browser-Export**: 595.28 x 841.89 mm (A1 Format)
- **Server-Export**: 210.00 x 297.00 mm (A4 Format)

## Analyse

### Mögliche Ursachen

1. **jsPDF Format-Konfiguration**
   - Der Browser-Export verwendet `format: [pdfWidth, pdfHeight]` mit `unit: 'mm'`
   - Möglicherweise interpretiert jsPDF die `format` Option falsch, wenn `orientation` ebenfalls gesetzt ist

2. **Canvas-Größe vs. PDF-Größe**
   - Canvas-Größe: 2480 x 3508 Pixel (für A4)
   - PDF-Größe sollte sein: 210 x 297 mm (für A4)
   - Das Verhältnis ist: 2480/210 = 11.81 Pixel/mm = 300 DPI

3. **Skalierungsproblem**
   - 595.28 mm ≈ 210 mm * 2.834
   - 841.89 mm ≈ 297 mm * 2.834
   - Dies deutet auf eine falsche Skalierung hin

### Code-Analyse

**Browser-Export (`client/src/utils/pdf-export.ts`):**
```typescript
const pdf = new jsPDF({
  orientation: (book.orientation === 'portrait' ? 'portrait' : 'landscape'),
  unit: 'mm',
  format: [pdfWidth, pdfHeight],  // pdfWidth/pdfHeight in mm
  compress: true
});

pdf.addImage(dataURL, 'PNG', 0, 0, pdfWidth, pdfHeight);
```

**Server-Export (`server/services/pdf-export.js`):**
```javascript
const pdfDoc = await PDFDocument.create();
const pdfPage = pdfDoc.addPage([pdfWidth, pdfHeight]);  // pdfWidth/pdfHeight in mm
pdfPage.drawImage(imageEmbed, {
  x: 0,
  y: 0,
  width: pdfWidth,
  height: pdfHeight,
});
```

### Vermutete Ursache

Das Problem könnte sein, dass jsPDF die `format` Option nicht korrekt interpretiert, wenn sowohl `format` als auch `orientation` angegeben werden. Möglicherweise wird die erste Seite mit einer Standardgröße erstellt und dann mit `addImage` überschrieben.

## Lösungsvorschläge

### Lösung 1: Explizite Seitengröße setzen

```typescript
// Nach dem Erstellen des PDFs, explizit die erste Seite setzen
const pdf = new jsPDF({
  unit: 'mm',
  format: [pdfWidth, pdfHeight],
  compress: true
});

// Explizit die erste Seite löschen und neu erstellen mit korrekter Größe
pdf.deletePage(1);
pdf.addPage([pdfWidth, pdfHeight], book.orientation);
```

### Lösung 2: Ohne format-Option arbeiten

```typescript
// PDF ohne format erstellen, dann explizit erste Seite hinzufügen
const pdf = new jsPDF({
  unit: 'mm',
  compress: true
});

// Erste Seite explizit hinzufügen
pdf.addPage([pdfWidth, pdfHeight], book.orientation);
```

### Lösung 3: Skalierung explizit berechnen

```typescript
// Canvas-Größe in Pixeln
const canvasWidth = 2480;  // für A4
const canvasHeight = 3508; // für A4

// PDF-Größe in mm
const pdfWidth = 210;   // für A4
const pdfHeight = 297;  // für A4

// Skalierungsfaktor berechnen
const scaleX = pdfWidth / (canvasWidth / 96 * 25.4);  // 96 DPI zu mm
const scaleY = pdfHeight / (canvasHeight / 96 * 25.4);

// Oder direkt: Canvas-Pixel zu mm bei 300 DPI
const scaleX = pdfWidth / (canvasWidth / 300 * 25.4);
const scaleY = pdfHeight / (canvasHeight / 300 * 25.4);
```

## Empfohlene Lösung

Die wahrscheinlichste Lösung ist **Lösung 2**: Das PDF ohne `format` und `orientation` im Konstruktor zu erstellen, und dann explizit die erste Seite mit der korrekten Größe hinzuzufügen.

## Nächste Schritte

1. Implementiere Lösung 2
2. Teste erneut mit demselben Buch
3. Vergleiche die PDF-Größen erneut
4. Dokumentiere das Ergebnis

