# Analyse-Bericht: PDF-Vergleich Seite 435 (Buch 569)

**Datum:** 2025-12-09  
**Verglichene PDFs:**
- Client: `uploads/pdf-exports/569/435_client.pdf`
- Server: `uploads/pdf-exports/569/435_server.pdf`

## Zusammenfassung

- **Gesamtunterschied:** 3.18% (69.234 von 2.174.960 Pixeln)
- **Durchschnittliche Differenz pro Pixel:** 0.96%
- **Status:** ❌ Unterschiede gefunden

## Farbanalyse

### Farbmuster der Unterschiede:
- **74.3% "mostly-blue"** - Unterschiede in der Blau-Komponente (hauptsächlich)
- **25.7% "mostly-red"** - Unterschiede in der Rot-Komponente

**Interpretation:** Die Unterschiede sind hauptsächlich in der Blau-Komponente, was auf unterschiedliche Textfarben, Hintergrundfarben oder Rendering-Unterschiede hindeutet.

## Regionale Verteilung

Die größten Unterschiede befinden sich in den **zentralen Bereichen** der Seite:

| Region | Unterschied | Durchschnittliche Farbdifferenz |
|--------|-------------|--------------------------------|
| **top-center** | 5.71% | R=101.5, G=104.2, B=107.1 |
| **middle-center** | 5.11% | R=107.9, G=112.3, B=112.3 |
| **bottom-center** | 4.29% | R=83.3, G=99.4, B=110.8 |
| top-left | 4.03% | R=104.5, G=92.6, B=83.6 |
| middle-left | 3.42% | R=95.0, G=104.1, B=102.4 |
| top-right | 2.25% | R=102.3, G=78.8, B=61.2 |
| bottom-left | 1.72% | R=72.6, G=85.0, B=92.3 |
| bottom-right | 1.22% | R=71.7, G=83.2, B=89.8 |
| middle-right | 0.92% | R=104.3, G=59.5, B=23.2 |

**Interpretation:** Die Unterschiede konzentrieren sich auf den Hauptinhalt (zentrale Bereiche), nicht auf Ränder oder Hintergründe.

## Vertikale Hotspots

Die größten Unterschiede befinden sich bei:
- **Y 350-525px:** 6.95% Unterschied
- **Y 1050-1225px:** 6.15% Unterschied

**Interpretation:** Es gibt zwei vertikale Bereiche mit besonders hohen Unterschieden, möglicherweise Textblöcke oder spezielle Elemente.

## Horizontale Hotspots

Die größten Unterschiede befinden sich bei:
- **X 372-496px:** 6.90% Unterschied
- **X 496-620px:** 5.31% Unterschied

**Interpretation:** Die Unterschiede konzentrieren sich auf die linke bis mittlere Seite, was typisch für Textinhalte ist.

## Mögliche Ursachen

Basierend auf der Analyse und dem Code-Review:

### 1. Font-Bold-Problem (Wahrscheinlich)
- **Problem:** Bold-Schrift wird möglicherweise nicht korrekt gerendert
- **Beweis:** 
  - Unterschiede in zentralen Textbereichen
  - Hohe Farbdifferenzen (R=83-108, G=78-112, B=61-112)
  - 74.3% "mostly-blue" Unterschiede (könnte auf unterschiedliche Textrendering hindeuten)
- **Code-Review:**
  - ✅ `render-qna.js` setzt `fontWeight` korrekt aus `fontBold`
  - ✅ `pdf-renderer.tsx` setzt `fontWeight` korrekt aus `fontBold`
  - ⚠️ **Problem gefunden:** In `pdf-renderer.tsx` Zeilen 1267, 1291, 1336, 1360 wird `fontStyle` verwendet, um sowohl Bold als auch Italic zu kombinieren, aber Konva.Text benötigt separate Attribute:
    - `fontStyle` sollte nur 'italic' oder 'normal' sein
    - `fontWeight` sollte 'bold' oder 'normal' sein
  - **Aktueller Code:**
    ```typescript
    fontStyle: `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic' : ''}`.trim() || 'normal',
    ```
  - **Sollte sein:**
    ```typescript
    fontStyle: qFontItalic ? 'italic' : 'normal',
    fontWeight: qFontBold ? 'bold' : 'normal',
    ```

### 2. Text-Positionierung (Wahrscheinlich gering)
- **Status:** Bereits behoben mit `getBaselineOffset()`
- **Mögliche Restunterschiede:** Rundungsunterschiede oder Font-Metrik-Unterschiede zwischen Client und Server

### 3. Font-Familie-Auflösung (Möglich)
- **Problem:** Unterschiedliche Font-Familien zwischen Client und Server
- **Code-Review:** `resolveFontFamily()` wird verwendet, sollte aber überprüft werden

## Empfohlene Fixes

### Priorität 1: Font-Bold/Italic in pdf-renderer.tsx
**Datei:** `client/src/components/pdf-renderer/pdf-renderer.tsx`

**Problem:** `fontStyle` wird fälschlicherweise für Bold verwendet, sollte `fontWeight` sein.

**Zu ändern:**
- Zeile ~1267 (question text, inline layout)
- Zeile ~1291 (question text, inline layout, alternative)
- Zeile ~1336 (answer text, inline layout)
- Zeile ~1360 (answer text, inline layout, alternative)

**Änderung:**
```typescript
// VORHER:
fontStyle: `${qFontBold ? 'bold ' : ''}${qFontItalic ? 'italic' : ''}`.trim() || 'normal',

// NACHHER:
fontStyle: qFontItalic ? 'italic' : 'normal',
fontWeight: qFontBold ? 'bold' : 'normal',
```

### Priorität 2: Überprüfung der Font-Familie-Auflösung
- Überprüfe, ob `resolveFontFamily()` in Client und Server identisch funktioniert
- Stelle sicher, dass Bold-Varianten der Fonts korrekt geladen werden

### Priorität 3: Weitere Tests
- Nach Fix von Priorität 1: Erneuter Vergleich durchführen
- Wenn Unterschiede bleiben: Detaillierte Analyse der verbleibenden Unterschiede

## Nächste Schritte

1. ✅ Analyse abgeschlossen
2. ⏳ Fix für Font-Bold/Italic in `pdf-renderer.tsx` implementieren
3. ⏳ Erneuten Vergleich durchführen
4. ⏳ Weitere Unterschiede analysieren falls vorhanden



