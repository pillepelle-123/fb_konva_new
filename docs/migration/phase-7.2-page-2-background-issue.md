# Phase 7.2: Seite 2 Background nicht sichtbar

## Status

✅ **QnA Inline Text funktioniert jetzt!**
- Frage- und Antworttext werden korrekt gerendert
- Fix für `answerText` Property funktioniert

❌ **Background ist nicht sichtbar**
- Background wird gerendert (Shape vorhanden in Logs)
- Aber nicht sichtbar im PDF

## Log-Analyse

**Seite 2 Layer Info:**
- Layer 0: 0 Children (leer)
- Layer 1: 3 Children:
  1. Shape bei x:0, y:0, width:2480, height:3508 (Background!)
  2. Shape bei x:60, y:61.68 (Question Text)
  3. Shape bei x:139.76, y:61.68 (Answer Text)

**Background-Daten (Test):**
```javascript
background: {
  type: 'color',
  value: '#F0F0F0',
  opacity: 0.5
}
```

## Mögliche Ursachen

1. **Opacity zu niedrig:** 0.5 Opacity auf weißem Papier könnte zu subtil sein
2. **Color-Format:** Hex-Farbe wird möglicherweise nicht korrekt angewendet
3. **Z-Index:** Background könnte unter Text liegen (sollte aber zuerst gerendert werden)
4. **Screenshot-Timing:** Background wird möglicherweise nicht korrekt erfasst

## Debugging-Logs hinzugefügt

Debug-Logs wurden hinzugefügt, um zu sehen:
- Welche Farbe verwendet wird
- Welche Opacity angewendet wird
- Layer-Index und Children-Count

## Nächste Schritte

1. ⏳ **Build ausführen:** Bundle neu bauen mit Debug-Logs
2. ⏳ **PDF erneut generieren:** Logs prüfen
3. ⏳ **Opacity erhöhen:** Test mit opacity: 1.0
4. ⏳ **Color-Format testen:** RGB statt Hex testen

