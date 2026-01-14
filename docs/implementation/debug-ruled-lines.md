# Debugging Ruled Lines Position in PDF Export

## Problem
Ruled Lines in Textboxen sind im server-seitigen PDF Export zu weit unten platziert.

## Debugging-Strategien

### 1. Konstanten-Vergleich
Überprüfe die `RULED_LINE_BASELINE_OFFSET` Konstante in verschiedenen Umgebungen:

**Client (Canvas):** `12px` (Lines unterhalb Text)
**PDF Export:** `-8px` (Lines oberhalb Text)

### 2. PDF Export Detection
Teste ob die PDF Export Detection korrekt funktioniert:

```javascript
// In pdf-renderer.tsx hinzufügen:
console.log('[PDF Debug] Environment detection:', {
  __PDF_EXPORT__: (window as any).__PDF_EXPORT__,
  pathname: window.location.pathname,
  search: window.location.search,
  userAgent: navigator.userAgent,
  isPdfExport: isPdfExport
});
```

### 3. Line Position Logging
Füge Debug-Logs in textbox-qna.tsx hinzu:

```javascript
// In ruledLinesElements useMemo:
console.log('[Ruled Lines Debug]', {
  isPdfExport,
  RULED_LINE_BASELINE_OFFSET,
  linePositions: layout.linePositions.map(lp => ({
    y: lp.y,
    style: lp.style === effectiveQuestionStyle ? 'question' : 'answer'
  }))
});
```

### 4. Shared Utils Vergleich
Überprüfe ob shared/utils/qna-layout.ts die gleiche Konstante verwendet:

```bash
grep -r "RULED_LINE_BASELINE_OFFSET" shared/
```

### 5. Build-Prozess Überprüfung
Stelle sicher dass der PDF Renderer Build die aktuellen Änderungen enthält:

```bash
cd client
npm run build:pdf-renderer
```

### 6. Browser Environment Test
Teste die PDF Export Detection im Puppeteer Browser:

```javascript
// In pdf-renderer.tsx
window.__PDF_EXPORT__ = true; // Explizit setzen
console.log('PDF Export flag set:', window.__PDF_EXPORT__);
```

## Mögliche Ursachen

1. **Environment Detection fehlgeschlagen:** `isPdfExport` ist `false` im PDF Export
2. **Build nicht aktuell:** dist/pdf-renderer.iife.js enthält alte Version
3. **Konstante falsch:** `-8px` ist nicht der richtige Wert für PDF
4. **Shared Utils Inkonsistenz:** Verschiedene Offset-Werte in verschiedenen Dateien

## Nächste Schritte

1. Debug-Logs hinzufügen und PDF Export testen
2. Konstanten-Werte experimentell anpassen
3. Build-Prozess überprüfen
4. Shared Utils auf Konsistenz prüfen