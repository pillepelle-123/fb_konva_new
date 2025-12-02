# Anleitung: Vergleich Client-side vs. Server-side PDF Export

## Voraussetzungen

Beide Exports verwenden jetzt **pdf-lib**, daher sollten sie identische Ergebnisse liefern.

## Schritt-für-Schritt Anleitung

### 1. Browser-Export erstellen

1. Öffne ein Test-Buch im Editor (z.B. Buch ID 565)
2. Klicke auf "Export to PDF" oder verwende die Export-Funktion
3. Wähle die gewünschten Optionen (Quality, Page Range)
4. Führe den Export durch
5. **WICHTIG**: Speichere das PDF mit einem eindeutigen Namen, z.B. `74_client_new.pdf`
6. Kopiere das PDF in das Vergleichsverzeichnis: `server/uploads/pdf-exports/565/`

### 2. Server-Export erstellen

1. Öffne die Export-Seite: `/books/[bookId]/export`
2. Klicke auf "Create Export"
3. Wähle die gleichen Optionen wie beim Browser-Export
4. Warte, bis der Export fertig ist
5. Notiere die Export-ID (z.B. 74)

### 3. Vergleich durchführen

Führe das Vergleichs-Skript aus:

```powershell
node server/scripts/test-pdf-export-comparison.js server/uploads/pdf-exports/565/74_client_new.pdf server/uploads/pdf-exports/565/74.pdf
```

### 4. Erwartete Ergebnisse

Mit der neuen pdf-lib Implementierung sollten beide PDFs **identisch** sein:

- ✅ **Seitenanzahl**: Sollte identisch sein
- ✅ **Seitengröße**: Sollte identisch sein (210 x 297 mm für A4)
- ✅ **Dateigröße**: Kann leicht variieren (Komprimierung), aber sollte ähnlich sein (< 10% Unterschied)
- ✅ **Metadaten**: Sollten identisch sein

### 5. Visueller Vergleich

Auch wenn die automatisierten Tests bestehen, sollte ein visueller Vergleich durchgeführt werden:

1. Öffne beide PDFs in Adobe Acrobat (oder einem anderen PDF-Viewer)
2. Stelle sicher, dass beide PDFs identisch aussehen:
   - Gleiche Elemente an gleichen Positionen
   - Gleiche Farben
   - Gleiche Schriftarten
   - Gleiche Hintergründe (Patterns, Colors, Images)
   - Gleiche Themes (Rough, Default)

## Bekannte Unterschiede (die OK sind)

- **Dateigröße**: Kann leicht variieren aufgrund von Komprimierung
- **Metadaten-Timestamp**: Kann unterschiedlich sein (nicht kritisch)

## Probleme melden

Wenn Unterschiede gefunden werden:

1. Dokumentiere die Unterschiede in `TEST_RESULTS.md`
2. Erwähne:
   - Welche Elemente unterschiedlich sind
   - Screenshots der Unterschiede
   - Console-Logs (falls vorhanden)

