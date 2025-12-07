# Phase 7.2: Seite 2 Rendering-Problem - Analyse

## Problem

**Seite 2 wird nicht gerendert** - Die gesamte Seite ist weiß/leer.

## Test-Daten für Seite 2

```javascript
{
  id: 2,
  pageNumber: 2,
  background: {
    type: 'color',
    value: '#F0F0F0',
    opacity: 0.5 // Background Opacity < 1
  },
  elements: [
    {
      id: 'qna-inline-2',
      type: 'text',
      textType: 'qna_inline',
      x: 50,
      y: 50,
      width: 400,
      height: 200,
      questionText: 'Test Frage',
      answerText: 'Test Antwort',
      ruledLines: false,
      backgroundEnabled: false,
      padding: 10,
      layoutVariant: 'inline',
      questionOrder: 1,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      questionSettings: { ... },
      answerSettings: { ... }
    }
  ]
}
```

## Was erwartet wird

1. **Color Background:**
   - Grauer Hintergrund (#F0F0F0)
   - Opacity 0.5 (halbtransparent)

2. **QnA Inline Element:**
   - Text "Test Frage" / "Test Antwort"
   - KEINE Ruled Lines
   - KEIN Background Fill

## Mögliche Ursachen

### 1. Background-Rendering Problem

**Prüfen in `shared/rendering/render-background.js`:**
- Wird Color Background korrekt gerendert?
- Wird Opacity korrekt angewendet?
- Wird Background-Layer zum Layer hinzugefügt?

### 2. QnA Inline Rendering Problem

**Prüfen in `shared/rendering/render-qna-inline.js`:**
- Wird Element korrekt gerendert wenn `ruledLines: false`?
- Wird Element korrekt gerendert wenn `backgroundEnabled: false`?
- Werden Text-Runs korrekt erstellt?

### 3. Layer-Stage-Problem

**Prüfen in `server/services/pdf-export.js`:**
- Wird Layer korrekt zum Stage hinzugefügt?
- Wird `window.stage.add(result.layer)` aufgerufen?

### 4. Screenshot-Timing Problem

**Prüfen in `server/services/pdf-renderer-service.js`:**
- Wird Screenshot zu früh gemacht?
- Wird auf `renderComplete` gewartet?
- Wird auf Image-Promises gewartet?

## Debugging-Strategie

### Schritt 1: Logs hinzufügen

Fügen Sie Logs hinzu, um zu prüfen:
1. Wird Seite 2 überhaupt gerendert?
2. Werden Background und Elemente verarbeitet?
3. Wird Layer zum Stage hinzugefügt?

### Schritt 2: Screenshot-Timing prüfen

Prüfen Sie, ob der Screenshot gemacht wird, bevor das Rendering abgeschlossen ist.

### Schritt 3: Test mit einfacherem Element

Testen Sie mit einem einfachen Rect-Element statt QnA Inline, um zu isolieren, ob das Problem beim QnA Inline oder allgemein bei Seite 2 liegt.

## Nächste Schritte

1. [ ] Problem lokalisiert - welche Komponente schlägt fehl?
2. [ ] Fix implementiert
3. [ ] Erneut getestet - Seite 2 sichtbar?

