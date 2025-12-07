# Phase 7.2: Circle Element Size - Test-Anleitung

## Vorbereitung

1. **Server starten** (falls nicht bereits gestartet)
2. **Bundle ist bereits gebaut** - `client/dist/pdf-renderer.iife.js` enthält die Debug-Logs

## Test-Schritte

### 1. PDF generieren

```powershell
cd server
node scripts/test-pdf-debug.js > circle-test-output.txt 2>&1
```

Oder ohne Datei (Logs in Konsole):
```powershell
cd server
node scripts/test-pdf-debug.js
```

### 2. Logs extrahieren

**Option A: PowerShell (empfohlen)**
```powershell
Get-Content circle-test-output.txt | Select-String -Pattern "Circle rendered|Rendering circle" -Context 0,15
```

**Option B: PowerShell - Nur Dimensionen**
```powershell
Get-Content circle-test-output.txt | Select-String -Pattern "elementWidth|elementHeight|radius:" | Select-Object -First 20
```

**Option C: Manuell suchen**
Öffnen Sie `circle-test-output.txt` und suchen Sie nach:
- `[DEBUG PDFRenderer] Circle rendered:`
- `[DEBUG renderElement] Rendering circle:`

### 3. Erwartete Logs

**Client-seitig (PDFRenderer):**
```
[DEBUG PDFRenderer] Circle rendered: {
  elementId: 'circle-1',
  elementWidth: 150,
  elementHeight: 150,
  radius: 75,
  x: 375,
  y: 125,
  strokeWidth: 2
}
```

**Server-seitig (render-element.js):**
```
[DEBUG renderElement] Rendering circle: {
  elementId: 'circle-1',
  elementWidth: 150,
  elementHeight: 150,
  width: 150,
  height: 150,
  radius: 75,
  x: 300,
  y: 50,
  centerX: 375,
  centerY: 125,
  strokeWidth: 2,
  ...
}
```

### 4. Vergleich durchführen

**Zu vergleichen:**
- ✅ `elementWidth` (sollte identisch sein)
- ✅ `elementHeight` (sollte identisch sein)
- ✅ `radius` (sollte identisch sein: `Math.min(width, height) / 2`)
- ⚠️ `x`, `y` (können unterschiedlich sein, da unterschiedliche Koordinatensysteme)
- ✅ `strokeWidth` (sollte identisch sein)

**Wichtige Checks:**
1. Sind `elementWidth` und `elementHeight` identisch?
2. Ist `radius` korrekt berechnet? (`Math.min(width, height) / 2`)
3. Gibt es Unterschiede in den Dimensionen?

### 5. Visuelle Prüfung

1. **PDF öffnen:** `server/uploads/pdf-exports/999/999.pdf`
2. **Seite 1 prüfen:** Circle mit Rough Theme sollte sichtbar sein
3. **Größe messen:** Ist der Circle wirklich zu klein?
   - Vergleich mit Rect (rect-1 sollte 200x150 sein)
   - Circle sollte 150x150 sein
   - Radius sollte 75 sein

## Problem-Diagnose

### Wenn Dimensionen identisch sind:
- Problem liegt woanders (visuelle Täuschung, Stroke-Width, etc.)
- Weitere Analyse erforderlich

### Wenn Dimensionen unterschiedlich sind:
- **Problem identifiziert:** Element-Dimensionen werden unterschiedlich geladen
- **Lösung:** Dimensionen-Berechnung harmonisieren

## Beispiel-Log-Analyse

```javascript
// Client (PDFRenderer)
{
  elementWidth: 150,
  elementHeight: 150,
  radius: 75
}

// Server (render-element.js)
{
  elementWidth: 150,
  elementHeight: 150,
  width: 150,
  height: 150,
  radius: 75
}

// ✅ IDENTISCH - Problem liegt woanders
```

```javascript
// Client (PDFRenderer)
{
  elementWidth: 150,
  elementHeight: 150,
  radius: 75
}

// Server (render-element.js)
{
  elementWidth: 100,  // ❌ UNTERSCHIEDLICH!
  elementHeight: 100, // ❌ UNTERSCHIEDLICH!
  width: 100,
  height: 100,
  radius: 50  // ❌ UNTERSCHIEDLICH!
}

// ❌ PROBLEM IDENTIFIZIERT - Dimensionen werden unterschiedlich geladen
```

## Alternative: Logs in Datei speichern

```powershell
# Vollständige Logs speichern
node scripts/test-pdf-debug.js > circle-full-logs.txt 2>&1

# Nur Circle-Logs extrahieren
Get-Content circle-full-logs.txt | Select-String -Pattern "Circle|circle-1" > circle-filtered-logs.txt
```

## Nächste Schritte nach dem Test

1. **Logs analysieren** - Dimensionen vergleichen
2. **Ergebnisse dokumentieren** - In `phase-7.2-visual-check-results-template.md` eintragen
3. **Fix implementieren** - Falls Problem gefunden

