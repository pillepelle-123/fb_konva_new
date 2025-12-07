# Phase 7.2: Background Opacity Test

## Änderung im Test-Skript

**Datei:** `server/scripts/test-pdf-debug.js`

**Änderung:**
- Opacity von `0.5` auf `1.0` erhöht
- Ziel: Testen, ob Background bei voller Opacity sichtbar ist

**Vorher:**
```javascript
background: {
  type: 'color',
  value: '#F0F0F0',
  opacity: 0.5 // Background Opacity < 1
}
```

**Nachher:**
```javascript
background: {
  type: 'color',
  value: '#F0F0F0',
  opacity: 1.0 // Background Opacity = 1.0 (für Test auf vollständige Sichtbarkeit)
}
```

## Erwartetes Ergebnis

Wenn Background jetzt sichtbar ist:
- ✅ Problem war die zu niedrige Opacity (0.5 zu subtil)
- ✅ Lösung: Opacity korrekt anwenden oder bei niedrigen Werten warnen

Wenn Background immer noch nicht sichtbar ist:
- ❌ Problem liegt woanders (z.B. Rendering-Reihenfolge, Color-Format)
- ❌ Weitere Debugging-Schritte erforderlich

## Debug-Logs

Die neuen Debug-Logs sollten zeigen:
```
[DEBUG PDFRenderer] Background rendered: {
  type: 'color',
  color: '#F0F0F0',
  opacity: 1.0,
  width: 2480,
  height: 3508,
  ...
}
```

## Nächste Schritte

1. ⏳ **PDF generieren** mit opacity: 1.0
2. ⏳ **Visuell prüfen** - ist Background jetzt sichtbar?
3. ⏳ **Logs prüfen** - wird Background korrekt gerendert?
4. ⏳ **Entscheidung treffen:**
   - Wenn sichtbar: Opacity-Handling anpassen
   - Wenn nicht sichtbar: Weitere Ursachen untersuchen

