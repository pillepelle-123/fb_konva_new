import { describe, it, expect, beforeEach } from 'vitest';
import { measurePerformanceDuration, createBenchmark, metricsCollector } from '../performance-metrics';
import type { Page, Book } from '../../types';

/**
 * Performance tests for Undo/Redo operations
 */
describe('Undo/Redo Performance', () => {
  beforeEach(() => {
    metricsCollector.clear();
  });

  const createMockPage = (pageNumber: number, elementCount: number = 10): Page => ({
    id: pageNumber,
    pageNumber,
    elements: Array.from({ length: elementCount }, (_, i) => ({
      id: `element-${i}`,
      type: 'text',
      x: 50 + i * 10,
      y: 50 + i * 10,
      width: 200,
      height: 40,
      text: `Element ${i}`,
      textType: 'question' as const,
    })),
    background: { pageTheme: null },
  });

  const createMockBook = (pageCount: number, elementsPerPage: number = 10): Book => ({
    id: 1,
    name: 'Test Book',
    pageSize: 'A4',
    orientation: 'portrait',
    pages: Array.from({ length: pageCount }, (_, i) =>
      createMockPage(i + 1, elementsPerPage)
    ),
  });

  // Simulate page-scoped snapshot creation (simplified version)
  function createPageSnapshot(page: Page): Page {
    return JSON.parse(JSON.stringify(page));
  }

  function createBookSnapshot(book: Book, affectedPageIndexes: number[]): {
    bookMeta: any;
    pageSnapshots: Map<number, Page>;
  } {
    const bookMeta = {
      id: book.id,
      name: book.name,
      pageSize: book.pageSize,
      orientation: book.orientation,
    };

    const pageSnapshots = new Map<number, Page>();
    affectedPageIndexes.forEach((index) => {
      if (book.pages[index]) {
        pageSnapshots.set(index, createPageSnapshot(book.pages[index]!));
      }
    });

    return { bookMeta, pageSnapshots };
  }

  it('should create page-scoped snapshots efficiently', async () => {
    const book = createMockBook(64, 20);
    const affectedIndexes = [0, 1, 2]; // Only 3 pages affected

    const duration = await measurePerformanceDuration('undo-redo-snapshot-creation', () => {
      createBookSnapshot(book, affectedIndexes);
    });

    expect(duration).toBeLessThan(100); // Should be very fast (< 100ms)
  });

  it('should handle large books with page-scoped snapshots', async () => {
    const sizes = [32, 64, 128];
    const results: Record<number, number> = {};

    for (const size of sizes) {
      const book = createMockBook(size, 20);
      const affectedIndexes = [0]; // Only one page affected

      const benchmark = createBenchmark(`undo-redo-snapshot-${size}-pages`);

      const { metrics } = await benchmark.run(
        () => {
          createBookSnapshot(book, affectedIndexes);
        },
        10
      );

      results[size] = metrics.average;
      console.log(`Book with ${size} pages: ${metrics.average.toFixed(2)}ms average`);
    }

    // Performance should remain constant regardless of book size
    // (since we're only snapshotting affected pages)
    const maxTime = Math.max(...Object.values(results));
    expect(maxTime).toBeLessThan(50); // Should be very fast even for large books
  });

  it('should restore from snapshot efficiently', async () => {
    const book = createMockBook(64, 20);
    const { bookMeta, pageSnapshots } = createBookSnapshot(book, [0, 1, 2]);

    const duration = await measurePerformanceDuration('undo-redo-restore', () => {
      // Simulate restore operation
      const restoredPages = book.pages.map((page, index) => {
        const snapshot = pageSnapshots.get(index);
        return snapshot || page;
      });
    });

    expect(duration).toBeLessThan(50); // Should be very fast
  });

  it('should handle multiple undo/redo operations efficiently', async () => {
    const book = createMockBook(64, 20);
    const history: Array<{ bookMeta: any; pageSnapshots: Map<number, Page> }> = [];

    // Simulate creating history entries
    for (let i = 0; i < 50; i++) {
      const affectedIndexes = [i % book.pages.length];
      history.push(createBookSnapshot(book, affectedIndexes));
    }

    const benchmark = createBenchmark('undo-redo-multiple-operations');

    const { metrics } = await benchmark.run(
      () => {
        // Simulate navigating through history
        const currentIndex = 25;
        const snapshot = history[currentIndex]!;
        const restoredPages = book.pages.map((page, index) => {
          const pageSnapshot = snapshot.pageSnapshots.get(index);
          return pageSnapshot || page;
        });
        return { ...snapshot.bookMeta, pages: restoredPages };
      },
      20
    );

    console.log('Multiple Undo/Redo Metrics:', metrics);
    expect(metrics.average).toBeLessThan(10); // Should be very fast
  });
});

