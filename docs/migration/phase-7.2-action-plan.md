# Phase 7.2: Nachbesserungen - Aktions-Plan

## Übersicht

Dieser Aktions-Plan beschreibt die konkreten Schritte zur Behebung der identifizierten visuellen Unterschiede.

## Analyse-Status

### Bereits analysiert

- ✅ Z-Index-Sortierung: Client verwendet zIndex, Server nicht
- ✅ Background Opacity: Code vorhanden, muss getestet werden
- ✅ Pattern Background: Code vorhanden, muss getestet werden

### Zu analysieren

- ⏳ Image Background: Warum fehlt es?
- ⏳ Rough Theme: Warum wird es nicht angewendet?
- ⏳ Google Fonts: Warum werden sie nicht geladen?
- ⏳ Ruled Lines: Warum fehlen sie?
- ⏳ Circle Size: Warum ist es falsch?

## Implementierungs-Plan

### Schritt 1: Z-Index-Sortierung korrigieren

**Problem:** Server sortiert nicht nach zIndex

**Lösung:** Element-Sortierung in `shared/rendering/index.js` anpassen, um zIndex zu berücksichtigen (wie Client PDFRenderer)

**Aktion:**
- Sortierung erweitern, um zIndex zu berücksichtigen
- Fallback auf bestehende Sortierung, wenn zIndex nicht vorhanden

### Schritt 2-9: Weitere Nachbesserungen

Die weiteren Nachbesserungen erfordern eine detaillierte Analyse jedes Problems, um die genauen Ursachen zu identifizieren. Die Probleme sind komplex und erfordern:

1. Code-Analyse (Client vs. Server)
2. Identifizierung der Unterschiede
3. Implementierung der Lösungen
4. Tests

## Empfehlung

Da die Nachbesserungen sehr komplex sind und eine sorgfältige Analyse erfordern, sollte zunächst ein detaillierter Analyse-Plan erstellt werden, bevor die Implementierungen beginnen.

Die wichtigsten Probleme (Hoch-Priorität) sollten zuerst analysiert und behoben werden.

