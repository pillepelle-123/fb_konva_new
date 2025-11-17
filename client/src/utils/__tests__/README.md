# Performance Tests

Dieses Verzeichnis enthält Performance-Tests für die Editor-Anwendung.

## Übersicht

Die Performance-Tests decken folgende Bereiche ab:

1. **Page Preview Performance** (`page-preview.perf.test.ts`)
   - Generierung einzelner Page Previews
   - Batch-Generierung mehrerer Previews
   - Skalierung mit verschiedenen Buchgrößen

2. **Undo/Redo Performance** (`undo-redo.perf.test.ts`)
   - Erstellung von Page-scoped Snapshots
   - Wiederherstellung aus Snapshots
   - Performance bei großen Büchern

3. **Virtual Scrolling Performance** (`virtual-scrolling.perf.test.ts`)
   - Berechnung des virtuellen Bereichs
   - Slicing von Page-Arrays
   - Scroll-Performance bei großen Listen

4. **API Pagination Performance** (`api-pagination.perf.test.ts`)
   - Abruf paginierter Seiten
   - Merging von paginierten Daten
   - Skalierung mit verschiedenen Buchgrößen

5. **Book Performance Benchmarks** (`book-performance.perf.test.ts`)
   - Umfassende Tests für Bücher mit 32, 64 und 128 Seiten
   - Memory-Usage-Tests
   - Performance-Report-Generierung

## Ausführung

### Alle Performance-Tests ausführen:
```bash
npm run test:perf
```

### Performance-Tests im Watch-Modus:
```bash
npm run test:perf:watch
```

### Einzelne Test-Datei ausführen:
```bash
npx vitest run --config vitest.perf.config.ts src/utils/__tests__/page-preview.perf.test.ts
```

## Metriken

Die Tests verwenden das `performance-metrics` System, das folgende Metriken sammelt:

- **Duration**: Ausführungszeit in Millisekunden
- **Count**: Anzahl der Durchläufe
- **Average**: Durchschnittliche Ausführungszeit
- **Min/Max**: Minimale und maximale Ausführungszeit
- **P50/P95/P99**: Perzentile für Performance-Analyse

## Performance-Ziele

### Page Preview
- Einzelnes Preview: < 1000ms
- Batch (10 Seiten): < 5000ms
- Viele Elemente (100): < 2000ms

### Undo/Redo
- Snapshot-Erstellung: < 100ms
- Wiederherstellung: < 50ms
- Multiple Operationen: < 10ms

### Virtual Scrolling
- Range-Berechnung: < 1ms
- Array-Slicing: < 1ms
- Scroll-Durchlauf: < 10ms

### API Pagination
- Einzelner Chunk: < 10ms
- Multiple Chunks: < 50ms
- Merging: < 10ms

### Book Operations
- 32 Seiten: < 50ms
- 64 Seiten: < 100ms
- 128 Seiten: < 200ms

## Ergebnisse exportieren

Die Metriken können als JSON exportiert werden:

```typescript
import { metricsCollector } from '../performance-metrics';

const exportData = metricsCollector.export();
console.log(exportData);
```

## Anpassung der Tests

Um die Tests für Ihre Umgebung anzupassen:

1. **Timeouts anpassen**: In `vitest.perf.config.ts` die `testTimeout` anpassen
2. **Schwellenwerte ändern**: Die `expect()`-Assertions in den Test-Dateien anpassen
3. **Weitere Metriken hinzufügen**: Neue Tests in den entsprechenden Dateien hinzufügen







