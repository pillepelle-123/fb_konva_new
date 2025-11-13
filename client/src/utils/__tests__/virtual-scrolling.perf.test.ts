import { describe, it, expect, beforeEach } from 'vitest';
import { measurePerformanceDuration, createBenchmark, metricsCollector } from '../performance-metrics';
import type { Page } from '../../types';

/**
 * Performance tests for virtual scrolling in page explorer
 */
describe('Virtual Scrolling Performance', () => {
  beforeEach(() => {
    metricsCollector.clear();
  });

  const createMockPage = (pageNumber: number): Page => ({
    id: pageNumber,
    pageNumber,
    elements: [],
    background: { pageTheme: null },
  });

  const createPageArray = (count: number): Page[] => {
    return Array.from({ length: count }, (_, i) => createMockPage(i + 1));
  };

  it('should calculate virtual range efficiently', async () => {
    const pages = createPageArray(128);
    const itemHeight = 116;
    const containerHeight = 500;
    const buffer = 4;

    const duration = await measurePerformanceDuration('virtual-scrolling-calculate-range', () => {
      const scrollTop = 1000;
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const end = Math.min(pages.length, start + visibleCount + buffer * 2);
    });

    expect(duration).toBeLessThan(1); // Should be extremely fast
  });

  it('should slice pages array efficiently', async () => {
    const pages = createPageArray(128);
    const virtualRange = { start: 10, end: 20 };

    const duration = await measurePerformanceDuration('virtual-scrolling-slice', () => {
      pages.slice(virtualRange.start, virtualRange.end);
    });

    expect(duration).toBeLessThan(1); // Should be extremely fast
  });

  it('should handle scrolling through large page lists', async () => {
    const pages = createPageArray(128);
    const itemHeight = 116;
    const containerHeight = 500;
    const buffer = 4;

    const benchmark = createBenchmark('virtual-scrolling-scroll-through');

    const { metrics } = await benchmark.run(
      () => {
        // Simulate scrolling through the list
        const scrollPositions = [0, 500, 1000, 2000, 3000, 5000];
        const ranges = scrollPositions.map((scrollTop) => {
          const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
          const visibleCount = Math.ceil(containerHeight / itemHeight);
          const end = Math.min(pages.length, start + visibleCount + buffer * 2);
          return pages.slice(start, end);
        });
        return ranges;
      },
      10
    );

    console.log('Scroll Through Metrics:', metrics);
    expect(metrics.average).toBeLessThan(10); // Should be very fast
  });

  it('should scale well with different page counts', async () => {
    const sizes = [32, 64, 128, 256];
    const results: Record<number, number> = {};

    for (const size of sizes) {
      const pages = createPageArray(size);
      const virtualRange = { start: Math.floor(size / 4), end: Math.floor(size / 2) };

      const benchmark = createBenchmark(`virtual-scrolling-${size}-pages`);

      const { metrics } = await benchmark.run(
        () => {
          return pages.slice(virtualRange.start, virtualRange.end);
        },
        100
      );

      results[size] = metrics.average;
      console.log(`${size} pages: ${metrics.average.toFixed(4)}ms average`);
    }

    // Performance should remain constant regardless of total page count
    // (since we're only rendering visible pages)
    const maxTime = Math.max(...Object.values(results));
    expect(maxTime).toBeLessThan(1); // Should be extremely fast
  });
});

