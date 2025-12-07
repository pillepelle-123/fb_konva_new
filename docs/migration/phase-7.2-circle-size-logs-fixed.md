# Phase 7.2: Circle Size Logs - Fix angewendet

## Problem

Die Debug-Logs wurden als `JSHandle@object` ausgegeben, was bedeutet, dass die Objekte nicht serialisiert werden konnten und die Werte nicht lesbar waren.

## Fix

**Änderung:** Logs werden jetzt als einzelne `console.log` Statements ausgegeben, nicht als Objekte.

**Vorher:**
```javascript
console.log('[DEBUG renderElement] Rendering circle:', {
  elementId: element.id,
  elementWidth: element.width,
  ...
});
```

**Nachher:**
```javascript
console.log('[DEBUG renderElement] Rendering circle:');
console.log('  elementId:', element.id);
console.log('  elementWidth:', element.width);
console.log('  elementHeight:', element.height);
...
```

## Geänderte Dateien

1. `shared/rendering/render-element.js` - Server-seitige Logs
2. `client/src/components/pdf-renderer/pdf-renderer.tsx` - Client-seitige Logs

## Nächster Schritt

**Bundle neu erstellt** - Jetzt können die Logs getestet werden:

```powershell
cd server
node scripts/test-pdf-debug.js
```

**Erwartete Ausgabe:**
```
[DEBUG renderElement] Rendering circle:
  elementId: circle-1
  elementWidth: 150
  elementHeight: 150
  width: 150
  height: 150
  radius: 75 (calculated: Math.min(150, 150) / 2 = 75)
  x: 300
  y: 50
  centerX: 375
  centerY: 125
  strokeWidth: 2
  elementTheme: rough
  useRough: true
```

