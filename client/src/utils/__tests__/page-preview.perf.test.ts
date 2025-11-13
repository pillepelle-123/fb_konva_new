import { describe, it, expect, beforeEach } from 'vitest';
import { measurePerformance, createBenchmark, metricsCollector } from '../performance-metrics';
import { generatePagePreview } from '../page-preview-generator';
import type { Page, Book } from '../../types';

/**
 * Performance tests for page preview generation
 */
describe('Page Preview Performance', () => {
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

  it.skip('should generate single page preview within acceptable time', async () => {
    const page = createMockPage(1, 10);
    const book = createMockBook(1, 10);

    const duration = await measurePerformance('page-preview-single', async () => {
      await generatePagePreview({
        page,
        book,
        previewWidth: 200,
        previewHeight: 280,
      });
    });

    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });

  it.skip('should generate multiple page previews efficiently', async () => {
    const book = createMockBook(10, 10);
    const benchmark = createBenchmark('page-preview-batch');

    const { metrics } = await benchmark.run(
      async () => {
        const promises = book.pages.map((page) =>
          generatePagePreview({
            page,
            book,
            previewWidth: 200,
            previewHeight: 280,
          })
        );
        await Promise.all(promises);
      },
      3 // Run 3 iterations
    );

    console.log('Batch Preview Metrics:', metrics);
    expect(metrics.average).toBeLessThan(5000); // Should complete within 5 seconds for 10 pages
  });

  it.skip('should handle pages with many elements efficiently', async () => {
    const page = createMockPage(1, 100); // 100 elements
    const book = createMockBook(1, 100);

    const duration = await measurePerformance('page-preview-many-elements', async () => {
      await generatePagePreview({
        page,
        book,
        previewWidth: 200,
        previewHeight: 280,
      });
    });

    expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
  });

  it.skip('should scale well with different book sizes', async () => {
    const sizes = [32, 64, 128];
    const results: Record<number, number> = {};

    for (const size of sizes) {
      const book = createMockBook(size, 10);
      const benchmark = createBenchmark(`page-preview-book-${size}-pages`);

      const { metrics } = await benchmark.run(
        async () => {
          // Generate previews for first 5 pages only (representative sample)
          const samplePages = book.pages.slice(0, 5);
          const promises = samplePages.map((page) =>
            generatePagePreview({
              page,
              book,
              previewWidth: 200,
              previewHeight: 280,
            })
          );
          await Promise.all(promises);
        },
        2
      );

      results[size] = metrics.average;
      console.log(`Book with ${size} pages: ${metrics.average.toFixed(2)}ms average`);
    }

    // Performance should not degrade significantly with book size
    // (since we're only generating previews for a sample)
    const ratio = results[128]! / results[32]!;
    expect(ratio).toBeLessThan(2); // Should not be more than 2x slower
  });
});

