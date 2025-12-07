# PDF-Export Tests ausführen - Anleitung

## 📋 Übersicht

Die PDF-Export-Tests wurden erstellt, aber noch nicht ausgeführt. Diese Anleitung zeigt Ihnen, wie Sie die Tests selbst durchführen können.

## ✅ Erstellte Test-Dateien

1. **`client/src/utils/__tests__/pdf-export-shared-functions.test.ts`**
   - Tests für shared Funktionen im PDF-Export
   - ~15 Tests

2. **`client/src/utils/__tests__/pdf-export-comparison.test.ts`**
   - Vergleichstests zwischen Client und Server
   - ~6 Tests

## 🚀 Test-Ausführung

### Schritt 1: Wechseln Sie ins Client-Verzeichnis

```bash
cd client
```

### Schritt 2: Führen Sie die PDF-Export-Tests aus

**Option A: Alle PDF-Export-Tests**
```bash
npm test -- --run pdf-export
```

**Option B: Nur Shared Functions Tests**
```bash
npm test -- --run pdf-export-shared-functions
```

**Option C: Nur Comparison Tests**
```bash
npm test -- --run pdf-export-comparison
```

**Option D: Spezifische Test-Datei**
```bash
npm test -- --run src/utils/__tests__/pdf-export-shared-functions.test.ts
npm test -- --run src/utils/__tests__/pdf-export-comparison.test.ts
```

**Option E: Alle Tests (inkl. PDF-Export)**
```bash
npm test -- --run
```

## 📊 Erwartete Tests

### PDF Export Shared Functions (~15 Tests)

#### Text Layout Functions (5 Tests)
- ✅ should use shared buildFont function
- ✅ should use shared getLineHeight function
- ✅ should use shared measureText function
- ✅ should use shared calculateTextX function for alignment
- ✅ should use shared wrapText function

#### QnA Layout Functions (5 Tests)
- ✅ should use shared createLayout function for inline layout
- ✅ should use shared createLayout function for block layout
- ✅ should use shared createBlockLayout function directly
- ✅ should handle empty text in createLayout
- ✅ should handle different layout variants

#### Feature Flag Integration (1 Test)
- ✅ should have access to all shared functions

#### PDF Export Specific Scenarios (4 Tests)
- ✅ should create layout for PDF export dimensions
- ✅ should handle long text that wraps multiple lines
- ✅ should handle different alignments for PDF export
- ✅ should handle block layout with different question positions

### PDF Export Comparison (~6 Tests)

#### Shared Functions Usage (2 Tests)
- ✅ should have access to same shared text layout functions
- ✅ should have access to same shared qna layout functions

#### Layout Consistency (2 Tests)
- ✅ should produce identical layouts for same input parameters
- ✅ should handle same parameters consistently across calls

#### PDF Export Specific Scenarios (2 Tests)
- ✅ should handle typical PDF export dimensions
- ✅ should handle different layout variants consistently

## 🔍 Was zu prüfen ist

Bitte führen Sie die Tests aus und teilen Sie mir mit:

1. **Gesamtergebnis:**
   - Anzahl bestandener Tests
   - Anzahl fehlgeschlagener Tests
   - Dauer der Test-Ausführung

2. **Fehlermeldungen (falls vorhanden):**
   - Welche Tests sind fehlgeschlagen?
   - Komplette Fehlermeldungen
   - Besonders Import-Fehler oder Canvas-Probleme

3. **Spezifische Probleme:**
   - Probleme mit `@shared`-Importen?
   - Probleme mit Canvas-Mocks?
   - Andere Fehler?

## 🐛 Bekannte potenzielle Probleme

### 1. Import-Pfade
- **Problem:** Tests verwenden `@shared`-Alias
- **Lösung:** Sollte durch Vitest-Konfiguration aufgelöst werden
- **Falls Fehler:** Bitte Fehlermeldung teilen

### 2. Canvas-Mock
- **Problem:** Tests benötigen Canvas-Context
- **Lösung:** Canvas-Mock ist in `canvas-setup.ts` vorhanden
- **Falls Fehler:** Canvas-Mock könnte angepasst werden müssen

### 3. JSON-Imports
- **Problem:** Tests importieren möglicherweise JSON-Dateien
- **Lösung:** Sollte durch Vite/Vitest unterstützt werden
- **Falls Fehler:** Bitte Fehlermeldung teilen

## ✅ Erfolgreiche Ausführung

Wenn alle Tests erfolgreich sind, sollten Sie sehen:

```
✓ src/utils/__tests__/pdf-export-shared-functions.test.ts (15)
  ✓ PDF Export Shared Functions Usage (15)
    ✓ Text Layout Functions (5)
    ✓ QnA Layout Functions (5)
    ✓ Feature Flag Integration (1)
    ✓ PDF Export Specific Scenarios (4)

✓ src/utils/__tests__/pdf-export-comparison.test.ts (6)
  ✓ PDF Export Comparison (Client vs. Server) (6)
    ✓ Shared Functions Usage (2)
    ✓ Layout Consistency (2)
    ✓ PDF Export Specific Scenarios (2)

Test Files  2 passed (2)
Tests  21 passed (21)
```

## 📝 Beispiel-Output

Bitte kopieren Sie den kompletten Test-Output und teilen Sie ihn mit mir, damit ich eventuelle Probleme beheben kann.

## 🔄 Alternative: Schrittweise Ausführung

Falls alle Tests zusammen zu lange dauern, können Sie sie auch einzeln ausführen:

```bash
# Nur die ersten Tests
npm test -- --run pdf-export-shared-functions

# Dann die Vergleichstests
npm test -- --run pdf-export-comparison
```

## 💡 Tipps

1. **Geduld:** Tests können einige Sekunden benötigen
2. **Fehler:** Falls Fehler auftreten, bitte komplette Fehlermeldung kopieren
3. **Einzeln testen:** Falls Probleme auftreten, einzelne Test-Dateien ausführen

