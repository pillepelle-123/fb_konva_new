# Phase 7.2: Nachbesserungen - Implementierungs-Strategie

## Übersicht

Diese Strategie beschreibt den systematischen Ansatz zur Behebung der identifizierten visuellen Unterschiede. Die Probleme werden nach Priorität und Komplexität angegangen.

## Analyse-Ergebnisse

### Was bereits implementiert ist

1. ✅ **Background Opacity (Color)** - Code vorhanden in `render-background.js` Zeile 94, 102
2. ✅ **Pattern Background Color** - Code vorhanden in `render-background.js` Zeile 131-141
3. ✅ **QnA Inline Background Fill** - Code vorhanden in `render-qna-inline.js` Zeile 263-348
4. ✅ **Element-Sortierung** - Teilweise vorhanden in `shared/rendering/index.js` Zeile 53-75

### Was fehlt oder problematisch ist

1. ❌ **Z-Index-Sortierung** - Server sortiert nicht nach zIndex (nur nach questionOrder/y)
2. ❌ **Image Background** - Muss überprüft werden
3. ❌ **Rough Theme** - Muss überprüft werden
4. ❌ **Google Fonts** - Muss implementiert werden
5. ❌ **Ruled Lines** - Muss überprüft werden
6. ❌ **Circle Element Size** - Muss überprüft werden

## Implementierungs-Strategie

### Phase 1: Einfache Korrekturen (sofort möglich)

1. **Z-Index-Sortierung korrigieren**
   - Server-Sortierung muss zIndex berücksichtigen (wie Client PDFRenderer)
   - `shared/rendering/index.js` anpassen

### Phase 2: Code-Analyse erforderlich

2. **Pattern Background Issues analysieren**
   - Überprüfen, ob Code korrekt funktioniert
   - Pattern Size und Opacity testen

3. **Background Opacity analysieren**
   - Überprüfen, ob Opacity wirklich nicht funktioniert
   - Canvas-Opacity-Handling testen

### Phase 3: Komplexe Implementierungen

4. **Image Background** - Muss implementiert werden
5. **Rough Theme** - Muss integriert werden
6. **Google Fonts** - Muss implementiert werden
7. **Ruled Lines** - Muss überprüft werden
8. **Circle Element Size** - Muss analysiert werden

## Nächste Schritte

1. ⏳ Z-Index-Sortierung korrigieren (einfach)
2. ⏳ Code-Analyse für andere Probleme
3. ⏳ Systematische Behebung nach Analyse

## Empfehlung

Da die Nachbesserungen komplex sind und eine sorgfältige Analyse erfordern, sollte zunächst:

1. Die Z-Index-Sortierung korrigiert werden (einfach, aber wichtig)
2. Eine detaillierte Analyse der anderen Probleme durchgeführt werden
3. Systematisch nach Analyse vorgegangen werden

Die meisten Probleme erfordern eine tiefere Analyse der Client- vs. Server-Implementierung, um die genauen Ursachen zu identifizieren.

