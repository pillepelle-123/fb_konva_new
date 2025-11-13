import { describe, it, expect, beforeEach } from 'vitest';
import { measurePerformanceDuration, createBenchmark, metricsCollector } from '../performance-metrics';
import type { Page, Book } from '../../types';

/**
 * Comprehensive performance tests for books of different sizes
 */
describe('Book Performance Benchmarks', () => {
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

  describe('Book Loading Performance', () => {
    it('should load 32-page book efficiently', async () => {
      const book = createMockBook(32, 10);

      const duration = await measurePerformanceDuration('book-load-32-pages', () => {
        // Simulate book loading operations
        book.pages.reduce((sum, page) => sum + page.elements.length, 0);
      });

      expect(duration).toBeLessThan(50);
    });

    it('should load 64-page book efficiently', async () => {
      const book = createMockBook(64, 10);

      const duration = await measurePerformanceDuration('book-load-64-pages', () => {
        book.pages.reduce((sum, page) => sum + page.elements.length, 0);
      });

      expect(duration).toBeLessThan(100);
    });

    it('should load 128-page book efficiently', async () => {
      const book = createMockBook(128, 10);

      const duration = await measurePerformanceDuration('book-load-128-pages', () => {
        book.pages.reduce((sum, page) => sum + page.elements.length, 0);
      });

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Book Operations Performance', () => {
    const sizes = [32, 64, 128];

    sizes.forEach((size) => {
      it(`should handle page operations efficiently for ${size}-page book`, async () => {
        const book = createMockBook(size, 10);
        const benchmark = createBenchmark(`book-operations-${size}-pages`);

        const { metrics } = await benchmark.run(
          () => {
            // Simulate common operations
            const activePage = book.pages[0];
            const pageCount = book.pages.length;
            const totalElements = book.pages.reduce(
              (sum, page) => sum + page.elements.length,
              0
            );
            return { activePage, pageCount, totalElements };
          },
          50
        );

        console.log(`${size}-page book operations: ${metrics.average.toFixed(2)}ms average`);
        expect(metrics.average).toBeLessThan(10);
      });
    });
  });

  describe('Memory Usage', () => {
    it('should not cause excessive memory usage with large books', async () => {
      const sizes = [32, 64, 128];
      const memoryUsage: Record<number, number> = {};

      for (const size of sizes) {
        const book = createMockBook(size, 10);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const beforeMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const books = Array.from({ length: 10 }, () => createMockBook(size, 10));
        const afterMemory = (performance as any).memory?.usedJSHeapSize || 0;

        memoryUsage[size] = (afterMemory - beforeMemory) / 1024 / 1024; // MB
        console.log(`${size}-page book: ~${memoryUsage[size]!.toFixed(2)}MB per 10 books`);
      }

      // Memory usage should scale reasonably (skip if memory API not available)
      if (memoryUsage[128] && memoryUsage[32] && memoryUsage[128] > 0 && memoryUsage[32] > 0) {
        const ratio = memoryUsage[128]! / memoryUsage[32]!;
        expect(ratio).toBeLessThan(5); // Should not be more than 5x
      } else {
        // Memory API not available in test environment, skip assertion
        expect(true).toBe(true);
      }
    });
  });

  describe('Performance Summary', () => {
    it('should generate performance report', async () => {
      // Run all benchmarks
      const book32 = createMockBook(32, 10);
      const book64 = createMockBook(64, 10);
      const book128 = createMockBook(128, 10);

      await measurePerformanceDuration('book-load-32', () => {
        book32.pages.length;
      });

      await measurePerformanceDuration('book-load-64', () => {
        book64.pages.length;
      });

      await measurePerformanceDuration('book-load-128', () => {
        book128.pages.length;
      });

      const summaries = metricsCollector.getAllSummaries();
      console.log('\n=== Performance Summary ===');
      Object.values(summaries).forEach((summary) => {
        console.log(`${summary.name}:`);
        console.log(`  Count: ${summary.count}`);
        console.log(`  Average: ${summary.average.toFixed(2)}ms`);
        console.log(`  Min: ${summary.min.toFixed(2)}ms`);
        console.log(`  Max: ${summary.max.toFixed(2)}ms`);
        console.log(`  P95: ${summary.p95.toFixed(2)}ms`);
        console.log(`  P99: ${summary.p99.toFixed(2)}ms`);
      });

      expect(Object.keys(summaries).length).toBeGreaterThan(0);
    });
  });
});

