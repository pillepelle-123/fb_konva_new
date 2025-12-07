# Phase 7.2: Test-PDF generieren - Anleitung

## Übersicht

Diese Anleitung zeigt, wie Sie ein Test-PDF generieren können, um die Debugging-Logs auszuwerten.

## Option 1: Test-Skript verwenden (Empfohlen)

Ein Test-Skript wurde erstellt, das ein Test-PDF mit allen kritischen Elementen generiert.

### Schritt 1: Skript ausführen

```bash
cd server
node scripts/test-pdf-debug.js
```

### Schritt 2: Logs auswerten

Das Skript gibt alle Debugging-Logs mit `[DEBUG]` Präfix in der Konsole aus. Filtern Sie nach:

```bash
# In PowerShell (nach Ausführung):
# Die Logs werden direkt in der Konsole ausgegeben
# Suchen Sie nach [DEBUG] in der Ausgabe
```

### Was wird getestet

Das Test-Skript erstellt ein Test-Buch mit:

1. **Rect mit Rough Theme** - Testet Rough Theme für Rect-Elemente
2. **Circle mit Rough Theme** - Testet Rough Theme für Circle-Elemente
3. **QnA Inline mit Ruled Lines** - Testet Ruled Lines Rendering
4. **QnA Inline mit Background Fill** - Testet Background Fill Rendering
5. **Page mit Image Background** - Testet Image Background Loading (wird fehlschlagen, zeigt aber Logs)
6. **Page mit Color Background (Opacity < 1)** - Testet Background Opacity

## Option 2: Manueller Test über UI

### Schritt 1: Test-Buch in Editor erstellen

Erstellen Sie ein Test-Buch mit folgenden Elementen:

1. **Rect/Circle mit Rough Theme:**
   - Erstellen Sie ein Rect oder Circle Element
   - Setzen Sie Theme auf 'rough'
   - Speichern Sie das Buch

2. **QnA Inline mit Ruled Lines:**
   - Erstellen Sie ein QnA Inline Element
   - Aktivieren Sie Ruled Lines (`ruledLines: true`)
   - Speichern Sie das Buch

3. **QnA Inline mit Background Fill:**
   - Erstellen Sie ein QnA Inline Element
   - Aktivieren Sie Background Fill (`backgroundEnabled: true`)
   - Setzen Sie eine Background-Color
   - Speichern Sie das Buch

4. **Page mit Image Background:**
   - Erstellen Sie eine Page
   - Setzen Sie Background Type auf 'image'
   - Wählen Sie ein Bild aus
   - Speichern Sie das Buch

### Schritt 2: PDF-Export starten

1. Öffnen Sie die Export-Seite: `/books/[bookId]/export`
2. Klicken Sie auf "Export PDF"
3. Warten Sie, bis der Export abgeschlossen ist

### Schritt 3: Server-Logs prüfen

Die Debugging-Logs werden in den Server-Logs ausgegeben. Prüfen Sie die Server-Console für:

```
[DEBUG renderPageWithKonva] ...
[DEBUG renderElement] ...
[DEBUG renderQnAInline] ...
[DEBUG renderBackground] ...
[DEBUG renderRuledLines] ...
```

## Option 3: Direkter API-Aufruf (Für Entwickler)

```bash
# Setzen Sie Ihre JWT-Token und Book-ID
TOKEN="your-jwt-token"
BOOK_ID=123

# API-Aufruf
curl -X POST http://localhost:5000/api/pdf-exports \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"bookId\": $BOOK_ID,
    \"quality\": \"preview\",
    \"pageRange\": \"all\"
  }"
```

## Was in den Logs zu suchen ist

### Rough Theme Logs

Suchen Sie nach:
```
[DEBUG renderElement] Rough theme detected for rect/circle: {
  elementId: "...",
  elementTheme: "rough",
  hasRoughInstance: true/false,  ← Wichtig!
  useRough: true/false,          ← Wichtig!
  roughInstanceType: "object"/"undefined"
}
```

**Problem-Identifikation:**
- `hasRoughInstance: false` → Rough.js wird nicht geladen
- `useRough: false` trotz Theme 'rough' → Rough Instance fehlt
- `elementTheme` nicht 'rough' → Theme wird falsch gelesen

### Ruled Lines Logs

Suchen Sie nach:
```
[DEBUG renderQnAInline] Ruled lines check: {
  elementId: "...",
  ruledLines: true/false,        ← Wichtig!
  ruledLinesEnabled: true/false, ← Wichtig!
  ruledLinesType: "boolean"/"undefined"
}
```

**Problem-Identifikation:**
- `ruledLinesEnabled: false` → `element.ruledLines` ist nicht `true`
- Log `Ruled lines NOT rendered` → Ruled Lines werden nicht gerendert
- `ruledLinesCount: 0` → Ruled Lines werden gerendert, aber keine erstellt

### Image Background Logs

Suchen Sie nach:
```
[DEBUG renderBackground] Image background: {
  backgroundType: "image",
  resolvedImageUrl: "...",       ← Wichtig!
  isS3Url: true/false            ← Wichtig!
}
```

**Problem-Identifikation:**
- `Background image failed to load` → Image-Loading-Problem
- `isS3Url: true` + Fehler → CORS-Problem wahrscheinlich
- `resolvedImageUrl: undefined` → URL-Auflösung fehlgeschlagen

### Background Fill Logs

Suchen Sie nach:
```
[DEBUG renderQnAInline] Background check: {
  elementId: "...",
  backgroundEnabled: true/false/undefined, ← Wichtig!
  showBackground: true/false,              ← Wichtig!
  backgroundColor: "..."
}
```

**Problem-Identifikation:**
- `showBackground: false` → Background wird nicht gerendert
- `backgroundEnabled: undefined` → Property fehlt im Element

## Log-Datei erstellen (Optional)

Wenn Sie die Logs in eine Datei speichern möchten:

```bash
# Redirect stdout und stderr zu Datei
node scripts/test-pdf-debug.js > debug-logs.txt 2>&1

# Oder filtern Sie nur [DEBUG] Logs
node scripts/test-pdf-debug.js 2>&1 | grep "\[DEBUG" > debug-logs.txt
```

## Nächste Schritte nach Log-Auswertung

1. **Identifizieren Sie die Probleme:**
   - Basierend auf den Logs
   - Dokumentieren Sie, was nicht funktioniert

2. **Gezielt beheben:**
   - Nur die identifizierten Probleme angehen
   - Nach jeder Behebung erneut testen

3. **Logs aktualisieren:**
   - Entfernen Sie Debugging-Logs nach Behebung (optional)
   - Oder behalten Sie sie als bedingte Logs (nur bei Fehlern)

## Hinweis

Das Test-Skript verwendet Beispiel-URLs für Image Backgrounds, die möglicherweise nicht existieren. Das ist beabsichtigt, um zu zeigen, wie Fehler geloggt werden.

Für echte Tests sollten Sie ein Buch mit tatsächlichen Bildern verwenden.

