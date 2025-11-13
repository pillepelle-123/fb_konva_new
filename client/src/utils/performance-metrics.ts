/**
 * Performance Metrics Collection Utility
 * 
 * Collects and aggregates performance metrics for the editor application.
 */

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface MetricSummary {
  name: string;
  count: number;
  total: number;
  average: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

class PerformanceMetricsCollector {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 10000; // Limit to prevent memory issues

  /**
   * Record a performance metric
   */
  record(name: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Remove oldest metrics if we exceed the limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Dispatch custom event for real-time monitoring
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('performance:metric', {
          detail: metric,
        })
      );
    }
  }

  /**
   * Get summary statistics for a metric name
   */
  getSummary(metricName: string): MetricSummary | null {
    const filtered = this.metrics.filter((m) => m.name === metricName);
    if (filtered.length === 0) {
      return null;
    }

    const durations = filtered.map((m) => m.duration).sort((a, b) => a - b);
    const total = durations.reduce((sum, d) => sum + d, 0);
    const average = total / durations.length;
    const min = durations[0];
    const max = durations[durations.length - 1];
    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    return {
      name: metricName,
      count: durations.length,
      total,
      average,
      min,
      max,
      p50,
      p95,
      p99,
    };
  }

  /**
   * Get all summaries
   */
  getAllSummaries(): Record<string, MetricSummary> {
    const names = new Set(this.metrics.map((m) => m.name));
    const summaries: Record<string, MetricSummary> = {};

    for (const name of names) {
      const summary = this.getSummary(name);
      if (summary) {
        summaries[name] = summary;
      }
    }

    return summaries;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get metrics for a specific name
   */
  getMetrics(metricName: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === metricName);
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        summaries: this.getAllSummaries(),
        timestamp: Date.now(),
      },
      null,
      2
    );
  }
}

// Singleton instance
export const metricsCollector = new PerformanceMetricsCollector();

/**
 * Measure performance of a function
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    metricsCollector.record(name, duration, metadata);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    metricsCollector.record(name, duration, { ...metadata, error: true });
    throw error;
  }
}

/**
 * Measure performance and return duration
 */
export async function measurePerformanceDuration(
  name: string,
  fn: () => void | Promise<void>,
  metadata?: Record<string, any>
): Promise<number> {
  const start = performance.now();
  try {
    await fn();
    const duration = performance.now() - start;
    metricsCollector.record(name, duration, metadata);
    return duration;
  } catch (error) {
    const duration = performance.now() - start;
    metricsCollector.record(name, duration, { ...metadata, error: true });
    throw error;
  }
}

/**
 * Create a performance benchmark
 */
export function createBenchmark(name: string) {
  return {
    async run<T>(
      fn: () => T | Promise<T>,
      iterations: number = 1,
      metadata?: Record<string, any>
    ): Promise<{
      results: T[];
      metrics: {
        total: number;
        average: number;
        min: number;
        max: number;
      };
    }> {
      const durations: number[] = [];
      const results: T[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const result = await fn();
        const duration = performance.now() - start;
        durations.push(duration);
        results.push(result);
        metricsCollector.record(name, duration, { ...metadata, iteration: i });
      }

      const total = durations.reduce((sum, d) => sum + d, 0);
      const average = total / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);

      return {
        results,
        metrics: {
          total,
          average,
          min,
          max,
        },
      };
    },
  };
}

