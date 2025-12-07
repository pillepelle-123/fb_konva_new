# Phase 7.2: Nachbesserungen - Analyse-Ergebnisse

## ✅ Behoben (2 Probleme)

1. **Z-Index-Reihenfolge** - Element-Sortierung korrigiert
2. **Background Opacity** - Pattern Background Color Opacity korrigiert

## 📋 Analyse-Ergebnisse für verbleibende Probleme

### 1. Image Background (Hoch-Priorität)

**Status:** Code vorhanden, aber mögliches Problem identifiziert

**Befund:**
- Image-Loading-Code ist vorhanden in `shared/rendering/render-background.js` (Zeile 221-324)
- Promise wird korrekt zu `imagePromises` hinzugefügt
- Promise wird in `pdf-export.js` mit `Promise.all(allImagePromises)` abgewartet

**Mögliche Probleme:**
1. **CORS-Probleme:** S3-URLs können CORS-Probleme verursachen
   - Lösung: Background-Images sollten ebenfalls über Proxy-Endpoint geladen werden (wie normale Images)
   - Proxy-Endpoint: `/api/images/proxy?url=...&token=...`
   
2. **URL-Auflösung:** `resolveBackgroundImageUrl` gibt möglicherweise nicht die korrekte URL zurück
   - Client verwendet `resolveBackgroundImageUrl` mit Palette-Optionen
   - Server verwendet die gleiche Funktion, aber möglicherweise fehlen Optionen

**Empfohlene Lösung:**
- Background-Image-URLs über Proxy-Endpoint laden, wenn es S3-URLs sind
- Sicherstellen, dass `resolveBackgroundImageUrl` korrekt funktioniert

### 2. Rough Theme (Hoch-Priorität)

**Status:** Code vorhanden, sollte funktionieren

**Befund:**
- Rough.js wird im HTML geladen: `<script src="https://unpkg.com/roughjs@4/bundled/rough.js"></script>`
- Rough.js wird als `options.rough` übergeben: `const roughInstance = options.rough;`
- Rough.js wird verwendet für:
  - Rect-Elemente mit Theme 'rough' (render-element.js Zeile 290-344)
  - Circle-Elemente mit Theme 'rough' (render-element.js Zeile 376-416)
  - QnA Borders mit Theme 'rough'/'sketchy' (render-qna.js, render-qna-inline.js)
  - Ruled Lines mit Theme 'rough' (render-qna.js, render-ruled-lines.js)

**Mögliche Probleme:**
1. Rough.js wird möglicherweise nicht korrekt geladen
2. Theme wird möglicherweise nicht richtig erkannt (`elementTheme === 'rough'`)

**Empfohlene Lösung:**
- Debugging-Logs hinzufügen, um zu prüfen, ob Rough.js geladen wird
- Prüfen, ob Theme korrekt aus Element-Daten gelesen wird

### 3. Ruled Lines (Hoch-Priorität)

**Status:** Code vorhanden, sollte funktionieren

**Befund:**
- Ruled Lines werden gerendert in:
  - `render-qna-inline.js` Zeile 1299-1320 (ruft `renderRuledLines` auf)
  - `render-qna.js` Zeile 532-675 (direktes Rendering)
  - `render-ruled-lines.js` (dedizierte Funktion)

**Mögliche Probleme:**
1. `ruledLinesEnabled` ist möglicherweise `false`
   - Bedingung: `const ruledLinesEnabled = element.ruledLines === true;`
   - Muss explizit auf `true` gesetzt sein

2. `linePositions` könnten leer sein
   - Ruled Lines benötigen `layout.linePositions`
   - Diese werden von `createLayout` oder `createBlockLayout` erstellt

**Empfohlene Lösung:**
- Debugging-Logs hinzufügen, um zu prüfen:
  - Ob `ruledLinesEnabled` true ist
  - Ob `linePositions` vorhanden und nicht leer sind
  - Ob `renderRuledLines` aufgerufen wird

### 4. Google Fonts (Hoch-Priorität)

**Status:** Müssen implementiert werden

**Befund:**
- Google Fonts werden im HTML geladen in `pdf-export.js` (Zeile 450-456)
- Mehrere Font-Familien werden geladen
- ABER: Fonts müssen möglicherweise auch in Canvas-Kontext geladen werden

**Problem:**
- Canvas kann möglicherweise keine externen Fonts laden (CORS, Timing)
- Fonts müssen möglicherweise als Data-URLs oder base64 eingebettet werden

**Empfohlene Lösung:**
- Font-Loading-Mechanismus für Canvas implementieren
- Fonts vor Rendering laden und warten, bis sie geladen sind
- Oder Fonts als Data-URLs einbetten

### 5. QnA Inline Background Fill (Mittel-Priorität)

**Status:** Code vorhanden, möglicherweise funktioniert es

**Befund:**
- Background-Rendering ist vorhanden in `render-qna-inline.js` Zeile 263-383
- Bedingung: `const showBackground = element.backgroundEnabled ?? ... ?? false;`
- Background wird gerendert, wenn `showBackground === true`

**Mögliche Probleme:**
1. `backgroundEnabled` ist möglicherweise nicht gesetzt
2. `backgroundColor` ist möglicherweise 'transparent'

**Empfohlene Lösung:**
- Prüfen, ob `backgroundEnabled` korrekt aus Element-Daten gelesen wird

## 🎯 Nächste Schritte

### Priorität 1: Image Background
1. Background-Image-URLs über Proxy-Endpoint laden
2. URL-Auflösung testen

### Priorität 2: Rough Theme
1. Debugging-Logs hinzufügen
2. Prüfen, ob Rough.js geladen wird
3. Prüfen, ob Theme korrekt erkannt wird

### Priorität 3: Ruled Lines
1. Debugging-Logs hinzufügen
2. Prüfen, ob `ruledLinesEnabled` true ist
3. Prüfen, ob `linePositions` vorhanden sind

### Priorität 4: Google Fonts
1. Font-Loading-Mechanismus implementieren
2. Fonts vor Rendering laden

### Priorität 5: QnA Inline Background Fill
1. Prüfen, ob `backgroundEnabled` korrekt gesetzt ist

## 📝 Hinweis

Die meisten Probleme scheinen nicht Code-Probleme zu sein, sondern eher Konfigurations- oder Datenprobleme. Debugging-Logs würden helfen, die genauen Ursachen zu identifizieren.

