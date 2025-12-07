# Phase 7.2: Ruled Lines - Analyse und nächste Schritte

## Problem

Ruled Lines fehlen im Server-seitigen Rendering für QnA Inline Elemente.

## Status

**Code vorhanden:**
- ✅ `shared/rendering/render-ruled-lines.js` - Dedizierte Funktion
- ✅ `shared/rendering/render-qna-inline.js` - Ruft `renderRuledLines` auf
- ✅ Debugging-Logs vorhanden

## Analyse

### 1. Bedingung für Ruled Lines

Ruled Lines werden nur gerendert, wenn:
```javascript
const isEnabled = element.ruledLines === true;
```

**Wichtig:** Muss explizit `true` sein, nicht nur truthy!

### 2. Test-PDF Element

Im Test-PDF (`server/scripts/test-pdf-debug.js`):
```javascript
{
  id: 'qna-inline-1',
  type: 'text',
  textType: 'qna_inline',
  ruledLines: true,  // ✅ Explizit true
  ...
}
```

### 3. Rendering-Pfade

**Server-seitig (Konva):**
- `render-qna-inline.js` Zeile 1332-1360: Ruft `renderRuledLines` auf
- `render-ruled-lines.js`: Rendert die Linien

**Client-seitig (React/Puppeteer):**
- `pdf-renderer.tsx`: Möglicherweise unterschiedliche Logik?

## Nächste Schritte

### Schritt 1: Client-seitige Implementierung prüfen

Prüfen, ob `PDFRenderer` Komponente Ruled Lines unterstützt:
- Gibt es Code für Ruled Lines in `pdf-renderer.tsx`?
- Wird `renderRuledLines` aufgerufen?

### Schritt 2: Logs analysieren

Aus den Test-PDF Logs prüfen:
- Werden Ruled Lines Debug-Logs ausgegeben?
- Ist `ruledLinesEnabled` true?
- Werden Linien tatsächlich gerendert (`ruledLinesCount > 0`)?

### Schritt 3: Vergleich Client vs. Server

- Client-seitiges Rendering (Browser-Editor) - funktioniert es?
- Server-seitiges Rendering (PDFRenderer) - fehlt es hier?

## Vermutetes Problem

**Mögliche Ursache:** Ruled Lines werden nur im direkten Konva-Rendering (`shared/rendering/render-qna-inline.js`) gerendert, aber NICHT im React-basierten `PDFRenderer` Komponente (`client/src/components/pdf-renderer/pdf-renderer.tsx`).

**Lösung:** Ruled Lines Rendering-Logik in `PDFRenderer` Komponente hinzufügen oder sicherstellen, dass die shared Funktion verwendet wird.

