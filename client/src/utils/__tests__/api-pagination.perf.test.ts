import { describe, it, expect, beforeEach } from 'vitest';
import { measurePerformanceDuration, createBenchmark, metricsCollector } from '../performance-metrics';
import type { Page, Book } from '../../types';

/**
 * Performance tests for API pagination
 */
describe('API Pagination Performance', () => {
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

  // Simulate API response with pagination
  function simulateApiResponse(
    allPages: Page[],
    pageOffset: number,
    pageLimit: number
  ): { pages: Page[]; pagination: { totalPages: number; limit: number; offset: number } } {
    const start = pageOffset;
    const end = Math.min(start + pageLimit, allPages.length);
    return {
      pages: allPages.slice(start, end),
      pagination: {
        totalPages: allPages.length,
        limit: pageLimit,
        offset: pageOffset,
      },
    };
  }

  it('should fetch paginated pages efficiently', async () => {
    const allPages = Array.from({ length: 128 }, (_, i) => createMockPage(i + 1, 10));
    const pageLimit = 20;

    const duration = await measurePerformanceDuration('api-pagination-fetch', () => {
      simulateApiResponse(allPages, 0, pageLimit);
    });

    expect(duration).toBeLessThan(10); // Should be very fast
  });

  it('should handle multiple pagination requests', async () => {
    const allPages = Array.from({ length: 128 }, (_, i) => createMockPage(i + 1, 10));
    const pageLimit = 20;
    const chunks = [
      { offset: 0, limit: pageLimit },
      { offset: 20, limit: pageLimit },
      { offset: 40, limit: pageLimit },
      { offset: 60, limit: pageLimit },
    ];

    const benchmark = createBenchmark('api-pagination-multiple-chunks');

    const { metrics } = await benchmark.run(
      () => {
        return chunks.map((chunk) => simulateApiResponse(allPages, chunk.offset, chunk.limit));
      },
      10
    );

    console.log('Multiple Chunks Metrics:', metrics);
    expect(metrics.average).toBeLessThan(50); // Should be fast
  });

  it('should merge paginated pages efficiently', async () => {
    const existingPages = Array.from({ length: 20 }, (_, i) => createMockPage(i + 1, 10));
    const newPages = Array.from({ length: 20 }, (_, i) => createMockPage(i + 21, 10));

    const duration = await measurePerformanceDuration('api-pagination-merge', () => {
      // Simulate merging new pages into existing array
      const merged = [...existingPages];
      newPages.forEach((newPage) => {
        const index = merged.findIndex((p) => p.id === newPage.id);
        if (index >= 0) {
          merged[index] = newPage;
        } else {
          merged.push(newPage);
        }
      });
    });

    expect(duration).toBeLessThan(10); // Should be fast
  });

  it('should scale well with different book sizes', async () => {
    const sizes = [32, 64, 128];
    const pageLimit = 20;
    const results: Record<number, number> = {};

    for (const size of sizes) {
      const allPages = Array.from({ length: size }, (_, i) => createMockPage(i + 1, 10));

      const benchmark = createBenchmark(`api-pagination-${size}-pages`);

      const { metrics } = await benchmark.run(
        () => {
          // Simulate loading first chunk
          return simulateApiResponse(allPages, 0, pageLimit);
        },
        20
      );

      results[size] = metrics.average;
      console.log(`Book with ${size} pages: ${metrics.average.toFixed(2)}ms average`);
    }

    // Performance should remain relatively constant
    // (since we're always loading the same chunk size)
    const maxTime = Math.max(...Object.values(results));
    expect(maxTime).toBeLessThan(20); // Should be fast regardless of total size
  });
});

