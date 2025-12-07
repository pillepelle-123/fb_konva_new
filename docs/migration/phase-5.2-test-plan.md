# Phase 5.2: PDF-Export Tests und Validierung - Test-Plan

## Übersicht

Phase 5.2 fokussiert sich auf Tests für die PDF-Export-Funktionalität, insbesondere auf die Verwendung der shared Funktionen im PDFRenderer.

## Aktuelle Situation

### PDFRenderer Status

**Datei:** `client/src/components/pdf-renderer/pdf-renderer.tsx`

- ✅ Importiert shared Funktionen:
  - `sharedBuildFont`, `sharedGetLineHeight`, `sharedMeasureText`, `sharedCalculateTextX`, `sharedWrapText`
  - `sharedCreateLayout`, `sharedCreateBlockLayout`
- ✅ Feature-Flags vorhanden
- ⏳ Verwendet teilweise noch lokale Implementierungen für Block-Layout
- ✅ Verwendet shared Funktionen für Text-Layout (wenn Feature-Flag aktiviert)

### Server-seitiger Export

- ✅ Verwendet shared Funktionen aus `shared/utils/text-layout.server.js`
- ✅ Verwendet shared Funktionen aus `shared/utils/qna-layout.server.js`
- ✅ Verwendet shared Rendering-Module aus `shared/rendering/`

## Test-Strategie

### 1. Unit-Tests für Shared-Funktions-Verfügbarkeit

**Ziel:** Sicherstellen, dass alle shared Funktionen verfügbar sind und funktionieren

**Tests:**
- ✅ Shared Text-Layout-Funktionen sind verfügbar
- ✅ Shared QnA-Layout-Funktionen sind verfügbar
- ✅ Funktionen arbeiten korrekt mit Canvas-Context

**Datei:** `client/src/utils/__tests__/pdf-export-shared-functions.test.ts` ✅

### 2. Integrationstests für PDFRenderer

**Ziel:** Testen, dass PDFRenderer die shared Funktionen verwendet

**Herausforderung:** PDFRenderer ist eine React-Komponente mit Konva, benötigt komplexes Setup

**Lösung:** 
- Mock-Tests für Funktion-Verfügbarkeit
- Integrationstests für Layout-Berechnungen

**Status:** ⏳ Zu erstellen

### 3. Vergleichstests Client vs. Server

**Ziel:** Sicherstellen, dass Client- und Server-Export die gleichen shared Funktionen verwenden

**Tests:**
- ✅ Beide verwenden `shared/utils/text-layout`
- ✅ Beide verwenden `shared/utils/qna-layout`
- ✅ Beide verwenden identische Berechnungen

**Status:** ⏳ Zu erstellen

### 4. Visuelle Tests

**Ziel:** Visuelle Parität zwischen Client- und Server-Export

**Herausforderung:** Benötigt echte Browser-Umgebung und PDF-Generierung

**Lösung:** 
- Manuelle Tests (wie in `docs/testing/pdf-export-testing-guide.md`)
- Automatisierte PDF-Vergleichs-Skripte (bereits vorhanden)

**Status:** ✅ Dokumentation vorhanden

## Implementierungs-Plan

### Schritt 1: Unit-Tests für Shared-Funktionen ✅

- ✅ `pdf-export-shared-functions.test.ts` erstellt
- ✅ Testet alle shared Funktionen
- ✅ Testet PDF-Export-spezifische Szenarien

### Schritt 2: Integrationstests

- ⏳ Mock-Tests für PDFRenderer-Komponente
- ⏳ Tests für Layout-Berechnungen in PDF-Kontext

### Schritt 3: Vergleichstests

- ⏳ Vergleich Client- vs. Server-Implementierung
- ⏳ Validierung identischer Berechnungen

## Bekannte Herausforderungen

1. **Komplexität:** PDFRenderer ist eine komplexe React-Komponente
2. **Konva-Abhängigkeit:** Benötigt Konva.js für Rendering
3. **Canvas-Kontext:** Benötigt echten Canvas-Kontext für Tests
4. **Browser-Umgebung:** Einige Tests benötigen Browser-APIs

## Lösungsansätze

1. **Unit-Tests:** Fokus auf isolierte Funktionen
2. **Mock-Tests:** Mocking von Konva und Canvas
3. **Integrationstests:** Testen der Layout-Berechnungen
4. **Manuelle Tests:** Für visuelle Validierung

## Nächste Schritte

1. ✅ Unit-Tests für shared Funktionen erstellt
2. ⏳ Integrationstests erstellen (optional, wenn nötig)
3. ⏳ Vergleichstests erstellen
4. ✅ Dokumentation vorhanden für manuelle Tests

## Status

**Phase 5.2:** ⏳ **In Arbeit**

- ✅ Unit-Tests für shared Funktionen erstellt
- ⏳ Integrationstests (optional)
- ⏳ Vergleichstests
- ✅ Dokumentation vorhanden

Die grundlegenden Tests sind erstellt. Weitere Tests können nach Bedarf hinzugefügt werden.

