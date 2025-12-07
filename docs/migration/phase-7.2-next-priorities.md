# Phase 7.2: Nächste Prioritäten

## ✅ Bereits behoben

1. ✅ **Z-Index-Reihenfolge** - Element-Sortierung korrigiert
2. ✅ **Background Opacity** - Pattern Background Color Opacity korrigiert  
3. ✅ **Seite 2 Rendering** - `answerText`/`questionText` Property-Support hinzugefügt
4. ✅ **Seite 2 Background** - Background wird korrekt gerendert

## 📋 Verbleibende Probleme

### Hoch-Priorität (noch zu prüfen/bestätigen)

Basierend auf den visuellen Check-Ergebnissen:
- ✅ **Rough Theme** - Funktioniert bereits! (Rect & Circle haben handgezeichnete Ränder)
- ✅ **Ruled Lines** - Funktioniert bereits! (sind sichtbar auf Seite 1)
- ✅ **QnA Inline Background Fill** - Funktioniert bereits! (weißer Hintergrund sichtbar)
- ⏳ **Google Fonts** - Font-Loading ist implementiert, muss getestet werden
- ⏳ **Image Background** - CORS-Problem (niedrige Priorität, Test-URL existiert nicht)

### Mittel-Priorität

- ⏳ **Circle Element Size** - Ist zu klein (muss gemessen werden)
- ⏳ **Pattern Background Size** - Ist zu klein (niedrig-mittel Priorität)

## 🎯 Nächste Schritte

### 1. Google Fonts verifizieren

**Status:** Font-Loading ist bereits implementiert in `pdf-renderer-service.js`
- Font-Stylesheets werden geladen (Zeile 88-106)
- `document.fonts.ready` wird abgewartet (Zeile 485)
- Font-Faces werden einzeln geladen (Zeile 488-491)

**Test erforderlich:**
- PDF mit Google Fonts generieren (z.B. Mynerve, Amatic SC)
- Visuell prüfen, ob Fonts korrekt verwendet werden
- Falls nicht: Font-Loading-Mechanismus debuggen

### 2. Circle Element Size prüfen

**Problem:** Circle-Elemente sind im Server-Rendering zu klein

**Aktion:**
- Client-seitige Größenberechnung prüfen
- Server-seitige Größenberechnung prüfen
- Unterschiede identifizieren und korrigieren

### 3. Pattern Background Size prüfen

**Problem:** Pattern-Größe ist zu klein

**Aktion:**
- Pattern-Scaling prüfen
- Größenberechnung anpassen

## Status-Zusammenfassung

**Behoben:** 4 Probleme
**Funktioniert bereits:** 3 Probleme (Rough Theme, Ruled Lines, QnA Background Fill)
**Verbleibend:** 3 Probleme (Google Fonts, Circle Size, Pattern Size)
**Niedrige Priorität:** 1 Problem (Image Background CORS)

## Empfehlung

1. **Google Fonts testen:** PDF mit verschiedenen Google Fonts generieren und visuell prüfen
2. **Circle Size messen:** Client vs. Server Größenvergleich durchführen
3. **Pattern Size anpassen:** Falls tatsächlich zu klein, Scaling korrigieren

