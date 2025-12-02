# Migration von jsPDF zu pdf-lib

## Zusammenfassung

Die Browser-seitige PDF-Export-Funktion wurde komplett von `jsPDF` auf `pdf-lib` umgestellt, um korrekte Metadaten und Seitengrößen zu garantieren.

## Änderungen

### Vorher (jsPDF)
- Verwendete `jsPDF` für PDF-Erstellung
- Probleme mit Metadaten (falsche Seitengröße in Adobe Acrobat)
- Komplexe Workarounds für Seitengrößen-Korrektur nötig
- Inkonsistent mit Server-Export (der bereits `pdf-lib` verwendet)

### Nachher (pdf-lib)
- Verwendet `pdf-lib` für PDF-Erstellung (wie Server-Export)
- Korrekte Metadaten und Seitengrößen
- Konsistente Implementierung zwischen Browser und Server
- Einfacherer, wartbarer Code

## Implementierungsdetails

### PDF-Erstellung
```typescript
// PDF-Dokument erstellen
const pdfDoc = await PDFDocument.create();

// Metadaten setzen
pdfDoc.setTitle(book.name);
pdfDoc.setSubject(`PDF Export - ${book.name}`);
pdfDoc.setCreator('FB Konva Editor');
pdfDoc.setProducer('FB Konva Editor');
```

### Seitengrößen
```typescript
// Konvertierung von mm zu Punkten (pdf-lib verwendet Punkte)
const widthPt = pdfWidth / 0.352778;  // 210 mm → 595.28 pt
const heightPt = pdfHeight / 0.352778; // 297 mm → 841.89 pt

// Seite hinzufügen
const pdfPage = pdfDoc.addPage([widthPt, heightPt]);
```

### Bild-Einbettung
```typescript
// Canvas-Bild exportieren
const dataURL = tempStage.toDataURL({ mimeType: 'image/png', quality: 1.0 });

// Zu Uint8Array konvertieren
const response = await fetch(dataURL);
const arrayBuffer = await response.arrayBuffer();
const uint8Array = new Uint8Array(arrayBuffer);

// In PDF einbetten
const imageEmbed = await pdfDoc.embedPng(uint8Array);

// Bild auf Seite zeichnen
pdfPage.drawImage(imageEmbed, {
  x: 0,
  y: 0,
  width: widthPt,
  height: heightPt,
});
```

## Vorteile

1. **Korrekte Metadaten**: pdf-lib speichert Seitengrößen korrekt in Punkten
2. **Konsistenz**: Gleiche Bibliothek wie Server-Export
3. **Einfacherer Code**: Keine komplexen Workarounds mehr nötig
4. **Bessere Wartbarkeit**: Einheitliche Implementierung

## Beibehaltene Features

- ✅ Pattern Backgrounds
- ✅ No-Print Elements
- ✅ Placeholder Elements
- ✅ Page Navigation
- ✅ Progress Callbacks
- ✅ Abort Signal Support
- ✅ User Role Restrictions

## Nächste Schritte

1. Browser-Export testen
2. Metadaten in Adobe Acrobat prüfen (sollten jetzt korrekt sein)
3. Vergleich mit Server-Export durchführen
4. Visuelle Parität verifizieren

## Dateien

- **Geändert**: `client/src/utils/pdf-export.ts`
- **Entfernt**: jsPDF-Abhängigkeit (wird nicht mehr benötigt, aber bleibt in package.json für mögliche andere Verwendungen)

