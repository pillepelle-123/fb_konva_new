# Phase 7.2: Ruled Lines Debug-Logs erweitert

## Problem

Die Logs zeigten, dass `answerRuledLines: true` ist, aber es war nicht klar, ob die Ruled Lines tatsächlich gerendert werden.

## Fix

**Erweiterte Debug-Logs hinzugefügt:**

1. **Ruled Lines Check (erweitert):**
   - `hasQuestionText` und `hasAnswerText` hinzugefügt
   - Zeigt, ob die notwendigen Texte vorhanden sind

2. **Ruled Lines Rendering Start:**
   - Logs beim Start des Rendering-Prozesses

3. **Inline Layout Details:**
   - `canFitOnSameLine`
   - `answerLineIndex start`
   - `aLineHeight`
   - `endY`
   - `combinedLineBaseline`

4. **Ruled Lines Count Tracking:**
   - Zähler `ruledLinesRenderedCount` hinzugefügt
   - Wird bei jedem `layer.add(line)` oder `layer.add(linePath)` erhöht

5. **Ergebnis-Logs:**
   - Block Layout: Zeigt `linesCount` nach Rendering
   - Inline Layout: Zeigt `linesCount`, `questionLineCount`, `canFitOnSameLine`
   - Total: Zeigt `totalLinesCount` für beide Layouts

## Erwartete Ausgabe

```
[DEBUG PDFRenderer] Ruled lines check (first path):
  elementId: qna-inline-1
  element.ruledLines: true
  answerRuledLines: true
  layoutVariant: inline
  hasQuestionText: true
  hasAnswerText: true

[DEBUG PDFRenderer] Starting ruled lines rendering (first path):
  elementId: qna-inline-1
  layoutVariant: inline

[DEBUG PDFRenderer] Inline layout - starting answer lines generation:
  elementId: qna-inline-1
  canFitOnSameLine: false/true
  answerLineIndex start: 0/1
  aLineHeight: X
  endY: Y
  combinedLineBaseline: Z

[DEBUG PDFRenderer] Inline layout ruled lines rendered:
  elementId: qna-inline-1
  linesCount: X
  questionLineCount: Y
  canFitOnSameLine: false/true

[DEBUG PDFRenderer] Total ruled lines rendered (first path):
  elementId: qna-inline-1
  totalLinesCount: X
```

## Nächster Schritt

**Bundle wurde neu erstellt.** Bitte Test-PDF erneut generieren:

```powershell
cd server
node scripts/test-pdf-debug.js
```

**Jetzt sollten wir sehen:**
- Ob Ruled Lines tatsächlich gerendert werden
- Wie viele Linien gerendert werden
- Warum möglicherweise keine Linien gerendert werden (falls `totalLinesCount: 0`)

