# PDF Größenproblem - Analyse und Lösung

## Problem

Beim Vergleich von Browser-Export und Server-Export wurde ein Größenunterschied festgestellt:

- **Browser-Export**: 595.28 x 841.89 mm (A1 Format - falsch)
- **Server-Export**: 210.00 x 297.00 mm (A4 Format - korrekt)

**Verhältnis**: 595.28 / 210 = 2.834, 841.89 / 297 = 2.834

## Analyse

### Mögliche Ursachen

1. **jsPDF Format-Interpretation**
   - jsPDF könnte die `format` Option als Punkte statt Millimeter interpretieren
   - 595.28 mm ≈ 210 mm * 2.834
   - 2.834 ≈ 72/25.4 (Konvertierung zwischen Punkten und Millimetern)

2. **Canvas-Größe vs. PDF-Größe**
   - Canvas: 2480 x 3508 Pixel (für A4 bei 300 DPI)
   - PDF sollte sein: 210 x 297 mm
   - Verhältnis: 2480/210 = 11.81 Pixel/mm = 300 DPI

### Implementierte Lösung

Die aktuelle Implementierung versucht, die Seitengröße explizit zu setzen:

```typescript
const pdf = new jsPDF({
  unit: 'mm',
  format: [pdfWidth, pdfHeight],
  compress: true
});

// Fix page size if jsPDF interpreted it incorrectly
const expectedWidthPt = pdfWidth / 0.352778;
const expectedHeightPt = pdfHeight / 0.352778;
const actualWidthPt = pdf.internal.pageSize.getWidth();
const actualHeightPt = pdf.internal.pageSize.getHeight();

if (Math.abs(actualWidthPt - expectedWidthPt) > 1 || 
    Math.abs(actualHeightPt - expectedHeightPt) > 1) {
  pdf.internal.pageSize.setWidth(expectedWidthPt);
  pdf.internal.pageSize.setHeight(expectedHeightPt);
}

// Use actual page size for addImage
const pageWidthMm = pdf.internal.pageSize.getWidth() * 0.352778;
const pageHeightMm = pdf.internal.pageSize.getHeight() * 0.352778;
pdf.addImage(dataURL, 'PNG', 0, 0, pageWidthMm, pageHeightMm, undefined, 'FAST');
```

## Debugging

Die Implementierung enthält jetzt Console-Logs, die beim nächsten Browser-Export folgende Informationen zeigen:

1. Erwartete PDF-Größe (in mm und Punkten)
2. Tatsächliche PDF-Größe (in Punkten und mm)
3. Ob eine Korrektur durchgeführt wurde
4. Die verwendete Bildgröße beim Hinzufügen

## Nächste Schritte

1. **Browser-Export erneut durchführen** und die Console-Logs prüfen
2. **Die Logs analysieren** um zu sehen, was jsPDF tatsächlich macht
3. **Basierend auf den Logs** die Lösung anpassen

## Alternative Lösungen (falls aktuelle Lösung nicht funktioniert)

### Lösung A: Ohne format-Option

```typescript
const pdf = new jsPDF({
  unit: 'mm',
  compress: true
});

pdf.deletePage(1);
pdf.addPage([pdfWidth, pdfHeight], book.orientation);
```

### Lösung B: Explizite Punkte-Konvertierung

```typescript
// Konvertiere mm zu Punkten explizit
const widthPt = pdfWidth / 0.352778;
const heightPt = pdfHeight / 0.352778;

const pdf = new jsPDF({
  unit: 'pt',  // Verwende Punkte statt mm
  format: [widthPt, heightPt],
  compress: true
});
```

### Lösung C: String-Format verwenden

```typescript
// Verwende String-Format statt Array
const formatString = book.pageSize.toLowerCase(); // 'a4', 'a5', etc.
const pdf = new jsPDF({
  unit: 'mm',
  format: formatString,
  orientation: book.orientation,
  compress: true
});
```

## Test-Status

- [ ] Browser-Export mit Debug-Logs durchführen
- [ ] Console-Logs analysieren
- [ ] PDF-Größe erneut vergleichen
- [ ] Lösung anpassen falls nötig

