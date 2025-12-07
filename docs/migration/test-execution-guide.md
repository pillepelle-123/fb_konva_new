# Test-Ausführungs-Anleitung

## Aktuelle Änderungen

### 1. Vitest-Konfiguration verbessert
- ✅ Custom-Plugin für shared-Import-Auflösung hinzugefügt
- ✅ Alias `@shared` konfiguriert

### 2. Test-Import-Pfade angepasst
- ✅ `textbox-qna-rendering.test.tsx` verwendet jetzt `@shared`-Alias statt relativer Pfade

## Tests ausführen

### Alle Tests ausführen
```bash
cd client
npm test -- --run
```

### Nur den neuen Integrationstest
```bash
cd client
npm test -- --run textbox-qna-rendering
```

### Nur die visuellen Vergleichstests
```bash
cd client
npm test -- --run visual-comparison
```

### Spezifische Test-Datei
```bash
cd client
npm test -- --run src/components/features/editor/canvas-items/__tests__/textbox-qna-rendering.test.tsx
```

## Was zu prüfen ist

Bitte geben Sie mir die folgenden Informationen:

1. **Welche Tests fehlschlagen?**
   - Test-Datei
   - Test-Name
   - Fehlermeldung

2. **Import-Fehler?**
   - Gibt es noch Fehler wie "Failed to resolve import"?
   - Welcher Pfad/Modul kann nicht gefunden werden?

3. **Andere Fehler?**
   - TypeScript-Fehler?
   - Runtime-Fehler?
   - Canvas-Mock-Probleme?

## Erwartete Test-Dateien

Folgende Test-Dateien sollten vorhanden sein:
- ✅ `client/src/utils/__tests__/text-layout.test.ts`
- ✅ `client/src/utils/__tests__/qna-layout.test.ts`
- ✅ `client/src/utils/__tests__/palette-utils.test.ts`
- ✅ `client/src/utils/__tests__/theme-utils.test.ts`
- ✅ `client/src/utils/__tests__/visual-comparison.test.tsx`
- ✅ `client/src/components/features/editor/canvas-items/__tests__/textbox-qna-rendering.test.tsx`

## Bekannte Probleme

1. **Import-Pfade zu shared**: 
   - Lösung: Alias `@shared` verwenden
   - Status: ✅ Implementiert in `textbox-qna-rendering.test.tsx`

2. **Canvas-Mock**:
   - Status: ✅ Implementiert in `canvas-setup.ts`

3. **Test-Ausführungszeit**:
   - Die Tests können etwas Zeit benötigen
   - Bitte Geduld haben oder einzelne Tests ausführen

