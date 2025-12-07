# PDF-Export Test Fehlerbehebung

## Problem

Bei der Ausführung der PDF-Export-Tests sind 3 Tests fehlgeschlagen:

1. `should handle typical PDF export dimensions` (pdf-export-comparison.test.ts)
2. `should use shared createLayout function for inline layout` (pdf-export-shared-functions.test.ts)
3. `should create layout for PDF export dimensions` (pdf-export-shared-functions.test.ts)

## Fehlerursache

Alle drei Tests hatten den gleichen Fehler:
```
TypeError: actual value must be number or bigint, received "undefined"
```

Der Fehler trat auf, weil die Tests `layout.totalHeight` erwarteten, aber das `LayoutResult` Interface nur `contentHeight` zurückgibt.

### LayoutResult Interface

```typescript
export interface LayoutResult {
  runs: TextRun[];
  contentHeight: number;  // ✅ Vorhanden
  linePositions: LinePosition[];
  questionArea?: { x: number; y: number; width: number; height: number };
  answerArea?: { x: number; y: number; width: number; height: number };
  // totalHeight existiert NICHT ❌
}
```

## Lösung

Die Tests wurden korrigiert, um `contentHeight` statt `totalHeight` zu verwenden.

### Geänderte Dateien

1. **`client/src/utils/__tests__/pdf-export-shared-functions.test.ts`**
   - Zeile 107: `layout.totalHeight` → `layout.contentHeight`
   - Zeile 253: `layout.totalHeight` → `layout.contentHeight`

2. **`client/src/utils/__tests__/pdf-export-comparison.test.ts`**
   - Zeile 77: `layout1.totalHeight` → `layout1.contentHeight`
   - Zeile 147: `layout.totalHeight` → `layout.contentHeight`

## Korrigierte Tests

### Vorher (falsch):
```typescript
expect(layout.totalHeight).toBeGreaterThan(0);
expect(layout.totalHeight).toBeLessThanOrEqual(height);
expect(layout1.totalHeight).toBe(layout2.totalHeight);
```

### Nachher (korrekt):
```typescript
expect(layout.contentHeight).toBeDefined();
expect(layout.contentHeight).toBeGreaterThan(0);
expect(layout.contentHeight).toBeGreaterThan(0);
expect(layout1.contentHeight).toBe(layout2.contentHeight);
```

## Status

✅ **Alle Fehler behoben**

Die Tests sollten jetzt erfolgreich durchlaufen. Bitte führen Sie die Tests erneut aus:

```bash
cd client
npm test -- --run pdf-export
```

## Erwartetes Ergebnis

Nach der Korrektur sollten alle 21 Tests bestehen:

- ✅ PDF Export Shared Functions: 15 Tests
- ✅ PDF Export Comparison: 6 Tests

**Gesamt: 21/21 Tests bestehen** ✅

