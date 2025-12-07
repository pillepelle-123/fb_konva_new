# Phase 7.2: Circle Size Logs - Immer ausgeben

## Problem

Die Circle-Logs wurden nur im `else`-Block (Fallback) ausgegeben, was bedeutet, dass sie nicht erscheinen, wenn ein Theme-Path generiert wird (z.B. Rough Theme). Da das Circle-Element im Test-Skript ein Rough Theme hat, wurden die Logs nie ausgegeben.

## Fix

**Änderung:** Circle-Logs werden jetzt IMMER ausgegeben, unabhängig davon, ob:
- Ein Theme verwendet wird (Rough, etc.)
- Ein Path generiert wird
- Der Fallback verwendet wird

**Vorher:**
```javascript
if (pathData) {
  // Path wird verwendet - keine Logs
  layer.add(shapePath);
} else {
  if (element.type === 'circle') {
    // Logs nur hier - werden nie erreicht bei Rough Theme
    console.log('[DEBUG PDFRenderer] Circle rendered:');
    ...
  }
}
```

**Nachher:**
```javascript
// Logs IMMER am Anfang, bevor Theme-Path geprüft wird
if (element.type === 'circle') {
  console.log('[DEBUG PDFRenderer] Circle rendered:');
  console.log('  useTheme:', useTheme);
  console.log('  hasPathData:', !!pathData);
  ...
}

if (pathData) {
  // Path wird verwendet
  layer.add(shapePath);
} else {
  // Fallback
  ...
}
```

## Geänderte Dateien

1. `client/src/components/pdf-renderer/pdf-renderer.tsx`
   - Logs am Anfang der Shape-Rendering-Logik verschoben
   - Logs auch im else-Block (kein Theme) hinzugefügt

## Erwartete Ausgabe

**Mit Rough Theme:**
```
[DEBUG PDFRenderer] Circle rendered:
  elementId: circle-1
  elementWidth: 150
  elementHeight: 150
  radius: 75 (calculated: Math.min(150, 150) / 2 = 75)
  centerX: 375
  centerY: 125
  strokeWidth: 2
  useTheme: true
  theme: rough
  hasPathData: true
```

**Ohne Theme:**
```
[DEBUG PDFRenderer] Circle rendered (no theme):
  elementId: circle-1
  elementWidth: 150
  elementHeight: 150
  radius: 75 (calculated: Math.min(150, 150) / 2 = 75)
  centerX: 375
  centerY: 125
  strokeWidth: 2
  useTheme: false
```

## Nächster Schritt

**Bundle neu erstellt** - Jetzt sollten die Circle-Logs sichtbar sein:

```powershell
cd server
node scripts/test-pdf-debug.js
```

**Bitte suchen Sie nach:**
- `[DEBUG PDFRenderer] Circle rendered:`
- `[DEBUG PDFRenderer] Circle rendered (no theme):`

