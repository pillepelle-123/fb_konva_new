# Phase 7.2: Nachbesserungen - Implementierungs-Plan

## Übersicht

Dieser Plan beschreibt die systematische Behebung der identifizierten visuellen Unterschiede zwischen Client und Server Rendering.

## Priorisierung

### Hoch-Priorität (Kritisch)

1. ✅ **Z-Index-Reihenfolge** - Element-Sortierung
2. ✅ **Ruled Lines** - Rendering für QnA Inline
3. ✅ **Image Background** - Hintergrundbild-Rendering
4. ✅ **Rough Theme** - Rough.js Integration
5. ✅ **Google Fonts** - Font-Loading

### Mittel-Priorität

6. ✅ **Background Opacity** - Opacity-Handling
7. ✅ **Pattern Background** - Color, Size, Opacity
8. ✅ **QnA Inline Background Fill** - Hintergrund-Rendering
9. ✅ **Circle Element Size** - Größenkorrektur

### Niedrig-Mittel-Priorität

10. ⏳ **Pattern Background Size** - Größenanpassung

## Implementierungs-Reihenfolge

### Schritt 1: Z-Index-Reihenfolge (Hoch) ✅

**Problem:** Element-Reihenfolge wird nicht korrekt berücksichtigt

**Lösung:** Element-Sortierung nach Z-Index vor Rendering

**Dateien:**
- `shared/rendering/index.js` - Element-Sortierung

### Schritt 2: Background Opacity (Mittel) ✅

**Problem:** Opacity wird nicht angewendet

**Lösung:** Opacity-Handling korrigieren

**Dateien:**
- `shared/rendering/render-background.js` - Opacity für Color Background
- `shared/rendering/render-background.js` - Opacity für Pattern Background

### Schritt 3: Pattern Background Issues (Mittel) ✅

**Problem:** Pattern Background Color fehlt, Size ist falsch

**Lösung:** Pattern-Rendering korrigieren

**Dateien:**
- `shared/rendering/render-background.js` - Pattern Background Color
- `shared/rendering/render-background.js` - Pattern Size

### Schritt 4: QnA Inline Background Fill (Mittel) ✅

**Problem:** Hintergrund-Fill fehlt

**Lösung:** Background-Rendering überprüfen

**Dateien:**
- `shared/rendering/render-qna-inline.js` - Background Fill

### Schritt 5: Ruled Lines (Hoch) ✅

**Problem:** Ruled Lines fehlen

**Lösung:** Ruled Lines-Rendering sicherstellen

**Dateien:**
- `shared/rendering/render-qna-inline.js` - Ruled Lines
- `shared/rendering/render-qna.js` - Ruled Lines (falls vorhanden)

### Schritt 6: Image Background (Hoch) ✅

**Problem:** Hintergrundbild fehlt komplett

**Lösung:** Image Background-Rendering überprüfen

**Dateien:**
- `shared/rendering/render-background.js` - Image Background

### Schritt 7: Rough Theme (Hoch) ⏳

**Problem:** Rough Theme fehlt

**Lösung:** Rough.js-Integration sicherstellen

**Dateien:**
- `shared/rendering/render-element.js` - Rough Theme Rendering

### Schritt 8: Google Fonts (Hoch) ⏳

**Problem:** Fonts werden nicht geladen

**Lösung:** Font-Loading-Mechanismus implementieren

**Dateien:**
- Server-seitige Font-Loading-Implementierung

### Schritt 9: Circle Element Size (Mittel) ⏳

**Problem:** Circle-Elemente sind zu klein

**Lösung:** Größenberechnung korrigieren

**Dateien:**
- `shared/rendering/render-element.js` - Circle Rendering

## Status-Tracking

### In Arbeit
- ⏳ Schritt-für-Schritt Implementierung

### Abgeschlossen
- ✅ Plan erstellt
- ✅ Priorisierung durchgeführt

