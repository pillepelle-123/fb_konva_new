# Circle Size Test - Schritt-für-Schritt Anleitung

## 🎯 Ziel

Prüfen, ob Circle-Elemente im PDF zu klein gerendert werden.

## 📋 Voraussetzungen

- ✅ Server läuft (localhost:5000)
- ✅ Bundle ist gebaut (`client/dist/pdf-renderer.iife.js`)

## 🚀 Test durchführen

### Option 1: Einfacher Test (empfohlen)

```powershell
# 1. In Server-Verzeichnis wechseln
cd server

# 2. PDF generieren (Logs werden in Konsole angezeigt)
node scripts/test-pdf-debug.js
```

**In der Konsole suchen nach:**
- `Circle rendered:` (Client)
- `Rendering circle:` (Server)

### Option 2: Logs in Datei speichern

```powershell
# 1. In Server-Verzeichnis wechseln
cd server

# 2. PDF generieren und Logs speichern
node scripts/test-pdf-debug.js > circle-test-logs.txt 2>&1

# 3. Logs öffnen und nach "Circle" suchen
notepad circle-test-logs.txt
# Oder in PowerShell:
Get-Content circle-test-logs.txt | Select-String "Circle"
```

### Option 3: Nur Circle-Logs extrahieren

```powershell
# 1. PDF generieren
node scripts/test-pdf-debug.js > all-logs.txt 2>&1

# 2. Nur Circle-relevante Logs extrahieren
Get-Content all-logs.txt | Select-String -Pattern "Circle|circle-1|elementWidth|elementHeight|radius" > circle-only-logs.txt

# 3. Logs anzeigen
Get-Content circle-only-logs.txt
```

## 📊 Was zu prüfen ist

### 1. Logs prüfen

**Suche nach diesen Log-Zeilen:**

```
[DEBUG PDFRenderer] Circle rendered: {
  elementId: 'circle-1',
  elementWidth: ???,
  elementHeight: ???,
  radius: ???
}
```

```
[DEBUG renderElement] Rendering circle: {
  elementId: 'circle-1',
  elementWidth: ???,
  elementHeight: ???,
  width: ???,
  height: ???,
  radius: ???
}
```

**Vergleiche:**
- ✅ Sind `elementWidth` Werte identisch?
- ✅ Sind `elementHeight` Werte identisch?
- ✅ Ist `radius` = `Math.min(width, height) / 2`?

### 2. PDF visuell prüfen

**Datei öffnen:**
- `server/uploads/pdf-exports/999/999.pdf`

**Auf Seite 1 prüfen:**
- 🔴 **Rot:** Rect (rect-1) - 200x150 Pixel
- 🟢 **Grün:** Circle (circle-1) - sollte 150x150 Pixel sein

**Vergleich:**
- Circle sollte etwa 75% der Breite des Rects haben (150/200 = 0.75)
- Circle sollte quadratisch sein
- Circle sollte größer als die Hälfte des Rects sein

### 3. Problem identifizieren

**Wenn Logs identisch sind:**
- ✅ Dimensionen sind korrekt
- ❓ Problem liegt woanders (visuelle Täuschung, Stroke-Width, etc.)

**Wenn Logs unterschiedlich sind:**
- ❌ Problem identifiziert: Dimensionen werden unterschiedlich geladen
- 🔧 Lösung: Dimensionen-Berechnung harmonisieren

## 📝 Ergebnisse dokumentieren

Bitte tragen Sie die Ergebnisse ein in:
- `docs/migration/phase-7.2-visual-check-results-template.md`
- Oder erstellen Sie eine neue Datei: `docs/migration/phase-7.2-circle-size-test-results.md`

## 💡 Tipps

- **Logs sind sehr lang** - verwenden Sie `Select-String` zum Filtern
- **PDF ist groß** (2480x3508 Pixel) - zoom in zum genaueren Vergleich
- **Circle ist grün** - leicht zu finden auf Seite 1

