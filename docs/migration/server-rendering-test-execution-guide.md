# Server-seitige Rendering-Vergleichstests ausführen - Anleitung

## 📋 Übersicht

Die Server-seitigen Rendering-Vergleichstests wurden erstellt, um sicherzustellen, dass Client und Server die gleichen shared Funktionen verwenden. Diese Anleitung zeigt Ihnen, wie Sie die Tests selbst durchführen können.

## ✅ Erstellte Test-Dateien

1. **`client/src/utils/__tests__/server-rendering-comparison.test.ts`**
   - Vergleichstests zwischen Client- und Server-Implementierung
   - ~7 Tests

2. **Bereits vorhandene Vergleichstests (aus Phase 5.2):**
   - `client/src/utils/__tests__/pdf-export-comparison.test.ts`
   - `client/src/utils/__tests__/pdf-export-shared-functions.test.ts`

## 🚀 Test-Ausführung

### Schritt 1: Wechseln Sie ins Client-Verzeichnis

```bash
cd client
```

### Schritt 2: Führen Sie die Server-Rendering-Vergleichstests aus

**Option A: Nur Server-Rendering-Vergleichstests**
```bash
npm test -- --run server-rendering-comparison
```

**Option B: Alle Vergleichstests (inkl. PDF-Export)**
```bash
npm test -- --run comparison
```

**Option C: Spezifische Test-Datei**
```bash
npm test -- --run src/utils/__tests__/server-rendering-comparison.test.ts
```

**Option D: Alle Tests (inkl. Vergleichstests)**
```bash
npm test -- --run
```

## 📊 Erwartete Tests

### Server Rendering Comparison (~7 Tests)

#### Shared Functions Usage (2 Tests)
- ✅ should use same shared text layout functions (client .ts vs server .server.js)
- ✅ should use same shared qna layout functions (client .ts vs server .server.js)

#### Function Signature Consistency (2 Tests)
- ✅ should have consistent function signatures between client and server
- ✅ should produce identical results for same input parameters

#### Layout Function Consistency (1 Test)
- ✅ should have consistent createLayout function signature

#### Server-side Rendering Module Availability (1 Test)
- ✅ should have access to shared rendering modules structure

#### Import Path Consistency (2 Tests)
- ✅ should use consistent import paths for shared functions
- ✅ should use consistent import paths for qna layout functions

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

### 3. TypeScript vs. CommonJS
- **Problem:** Tests importieren TypeScript-Versionen, Server verwendet CommonJS
- **Lösung:** Beide verwenden die gleiche Implementierung, nur unterschiedliche Export-Formate
- **Falls Fehler:** Bitte Fehlermeldung teilen

## ✅ Erfolgreiche Ausführung

Wenn alle Tests erfolgreich sind, sollten Sie sehen:

```
✓ src/utils/__tests__/server-rendering-comparison.test.ts (7)
  ✓ Server-side Rendering Comparison (Client vs. Server) (7)
    ✓ Shared Functions Usage (2)
    ✓ Function Signature Consistency (2)
    ✓ Layout Function Consistency (1)
    ✓ Server-side Rendering Module Availability (1)
    ✓ Import Path Consistency (2)

Test Files  1 passed (1)
Tests  7 passed (7)
```

## 📝 Beispiel-Output

Bitte kopieren Sie den kompletten Test-Output und teilen Sie ihn mit mir, damit ich eventuelle Probleme beheben kann.

## 🔄 Alternative: Schrittweise Ausführung

Falls alle Tests zusammen zu lange dauern, können Sie sie auch einzeln ausführen:

```bash
# Nur die Server-Rendering-Vergleichstests
npm test -- --run server-rendering-comparison

# Dann die PDF-Export-Vergleichstests
npm test -- --run pdf-export-comparison
```

## 💡 Kombinierte Test-Ausführung

Sie können auch alle Vergleichstests zusammen ausführen:

```bash
# Alle Vergleichstests (Server-Rendering + PDF-Export)
npm test -- --run "comparison|pdf-export"
```

## 🎯 Was wird getestet

### 1. Shared-Funktions-Verfügbarkeit
- Beide (Client und Server) haben Zugriff auf gleiche shared Funktionen
- Funktions-Signaturen sind konsistent

### 2. Funktions-Konsistenz
- Gleiche Parameter produzieren identische Ergebnisse
- Layout-Funktionen haben konsistente Signaturen

### 3. Import-Pfad-Konsistenz
- Client verwendet TypeScript-Imports (`.ts`)
- Server verwendet CommonJS-Imports (`.server.js`)
- Beide verwenden die gleiche Implementierung

## 📚 Weitere Informationen

- **Dokumentation:** `docs/migration/client-server-rendering-differences.md`
- **Test-Plan:** `docs/migration/phase-6.3-test-plan.md`
- **Zusammenfassung:** `docs/migration/phase-6.3-summary.md`

## 💡 Tipps

1. **Geduld:** Tests können einige Sekunden benötigen
2. **Fehler:** Falls Fehler auftreten, bitte komplette Fehlermeldung kopieren
3. **Einzeln testen:** Falls Probleme auftreten, einzelne Test-Dateien ausführen
4. **Canvas-Mock:** Der Canvas-Mock sollte automatisch geladen werden (setupFiles in vitest.config.ts)

