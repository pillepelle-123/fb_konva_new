# Phase 6.3: Server-seitige Rendering-Tests - Test-Plan

## Übersicht

Phase 6.3 fokussiert sich auf Tests für die Server-seitige Rendering-Funktionalität, insbesondere auf die Verwendung der shared Funktionen im Server-Rendering.

## Aktuelle Situation

### Server-seitiges Rendering Status

**Dateien:**
- `shared/rendering/render-qna.js` ✅ Verwendet shared Funktionen
- `shared/rendering/render-qna-inline.js` ✅ Verwendet shared Funktionen
- `server/services/pdf-export.js` ✅ Verwendet shared Rendering-Module
- `server/services/pdf-renderer-service.js` ✅ Verwendet shared Rendering-Module

**Shared Funktionen-Verwendung:**
- ✅ `shared/utils/text-layout.server.js` - Text-Layout-Funktionen (CommonJS)
- ✅ `shared/utils/qna-layout.server.js` - QnA-Layout-Funktionen (CommonJS)
- ✅ `shared/rendering/utils/theme-utils.js` - Theme-Utilities
- ✅ `shared/rendering/utils/palette-utils.js` - Palette-Utilities

## Test-Strategie

### 1. Unit-Tests für Server-seitige Shared-Funktionen

**Ziel:** Sicherstellen, dass alle shared Funktionen im Server-Kontext verfügbar sind und funktionieren

**Herausforderung:** Server-seitige Tests benötigen Node.js-Umgebung, Canvas-Bibliothek

**Lösung:**
- Unit-Tests für die `.server.js` Versionen der shared Funktionen
- Mock-Tests für Funktion-Verfügbarkeit
- Vergleichstests zwischen `.ts` und `.server.js` Versionen

### 2. Vergleichstests Client vs. Server

**Ziel:** Sicherstellen, dass Client- und Server-Export die gleichen shared Funktionen verwenden

**Tests:**
- ✅ Beide verwenden `shared/utils/text-layout` (Client: `.ts`, Server: `.server.js`)
- ✅ Beide verwenden `shared/utils/qna-layout` (Client: `.ts`, Server: `.server.js`)
- ✅ Beide verwenden identische Berechnungen

### 3. Server-seitige Rendering-Tests

**Ziel:** Validierung der Server-seitigen Rendering-Funktionen

**Herausforderung:** Benötigt Node.js Canvas, komplexes Setup

**Lösung:**
- Unit-Tests für isolierte Funktionen
- Mock-Tests für Rendering-Logik
- Validierung der shared Funktionen-Verwendung

## Implementierungs-Plan

### Schritt 1: Vergleichstests Client vs. Server ✅

- ✅ Tests erstellen, die sicherstellen, dass beide die gleichen shared Funktionen verwenden
- ✅ Vergleich der Funktions-Signaturen
- ✅ Vergleich der Berechnungen

### Schritt 2: Server-seitige Funktionen-Tests

- ⏳ Tests für `.server.js` Versionen der shared Funktionen
- ⏳ Validierung der CommonJS-Exports
- ⏳ Vergleich mit TypeScript-Versionen

### Schritt 3: Server-seitige Rendering-Integrationstests

- ⏳ Tests für `render-qna.js` und `render-qna-inline.js`
- ⏳ Validierung der shared Funktionen-Verwendung
- ⏳ Mock-Tests für Rendering-Logik

## Bekannte Herausforderungen

1. **Node.js-Umgebung:** Server-Tests benötigen Node.js-Canvas-Bibliothek
2. **CommonJS vs. ES Modules:** Server verwendet CommonJS, Client verwendet ES Modules
3. **Canvas-Bibliothek:** Benötigt `canvas` npm-Package für Node.js
4. **Komplexität:** Server-seitiges Rendering ist komplex (Puppeteer, Canvas, etc.)

## Lösungsansätze

1. **Unit-Tests:** Fokus auf isolierte Funktionen
2. **Mock-Tests:** Mocking von Canvas und komplexen Dependencies
3. **Vergleichstests:** Vergleich zwischen Client- und Server-Implementierungen
4. **Dokumentation:** Bereits vorhandene Dokumentation nutzen

## Status

**Phase 6.3:** ⏳ **In Arbeit**

- ✅ Vergleichstests erstellt (in Phase 5.2)
- ⏳ Server-seitige Funktionen-Tests
- ⏳ Server-seitige Rendering-Integrationstests
- ✅ Dokumentation vorhanden

Die Vergleichstests wurden bereits in Phase 5.2 erstellt. Weitere Tests können nach Bedarf hinzugefügt werden.

