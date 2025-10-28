import type { PageTemplate } from '../types/template-types';

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Lazy loading utility for templates
 */
export class TemplateLazyLoader {
  private loadedTemplates = new Map<string, PageTemplate>();
  private loadingPromises = new Map<string, Promise<PageTemplate>>();

  async loadTemplate(templateId: string): Promise<PageTemplate | null> {
    // Return cached template if available
    if (this.loadedTemplates.has(templateId)) {
      return this.loadedTemplates.get(templateId)!;
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(templateId)) {
      return this.loadingPromises.get(templateId)!;
    }

    // Start loading template
    const loadingPromise = this.fetchTemplate(templateId);
    this.loadingPromises.set(templateId, loadingPromise);

    try {
      const template = await loadingPromise;
      this.loadedTemplates.set(templateId, template);
      this.loadingPromises.delete(templateId);
      return template;
    } catch (error) {
      this.loadingPromises.delete(templateId);
      console.error(`Failed to load template ${templateId}:`, error);
      return null;
    }
  }

  private async fetchTemplate(templateId: string): Promise<PageTemplate> {
    // Simulate dynamic import or API call
    const { pageTemplates } = await import('../data/templates/page-templates');
    const template = pageTemplates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    return template;
  }

  preloadTemplates(templateIds: string[]): Promise<void[]> {
    return Promise.all(
      templateIds.map(id => this.loadTemplate(id).catch(() => null))
    ).then(() => []);
  }

  clearCache(): void {
    this.loadedTemplates.clear();
    this.loadingPromises.clear();
  }
}

/**
 * Thumbnail cache with LRU eviction
 */
export class ThumbnailCache {
  private cache = new Map<string, string>();
  private accessOrder = new Map<string, number>();
  private maxSize: number;
  private accessCounter = 0;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  get(templateId: string): string | null {
    const thumbnail = this.cache.get(templateId);
    if (thumbnail) {
      this.accessOrder.set(templateId, ++this.accessCounter);
      return thumbnail;
    }
    return null;
  }

  set(templateId: string, thumbnail: string): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(templateId)) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.accessOrder.delete(oldestKey);
      }
    }

    this.cache.set(templateId, thumbnail);
    this.accessOrder.set(templateId, ++this.accessCounter);
  }

  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, access] of this.accessOrder) {
      if (access < oldestAccess) {
        oldestAccess = access;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Batch processing utility for template operations
 */
export class BatchProcessor<T, R> {
  private queue: T[] = [];
  private processing = false;
  private batchSize: number;
  private delay: number;

  constructor(
    private processor: (items: T[]) => Promise<R[]>,
    batchSize = 10,
    delay = 100
  ) {
    this.batchSize = batchSize;
    this.delay = delay;
  }

  add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject } as any);
      this.scheduleProcessing();
    });
  }

  private scheduleProcessing(): void {
    if (this.processing) return;

    setTimeout(() => {
      this.processBatch();
    }, this.delay);
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      const items = batch.map((b: any) => b.item);
      const results = await this.processor(items);
      
      batch.forEach((b: any, index) => {
        b.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach((b: any) => {
        b.reject(error);
      });
    } finally {
      this.processing = false;
      
      // Process next batch if queue is not empty
      if (this.queue.length > 0) {
        this.scheduleProcessing();
      }
    }
  }
}

/**
 * Memory usage monitor for template operations
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private memoryThreshold = 50 * 1024 * 1024; // 50MB
  private checkInterval = 30000; // 30 seconds
  private intervalId: NodeJS.Timeout | null = null;

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  startMonitoring(onThresholdExceeded?: () => void): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      if (this.isMemoryUsageHigh()) {
        console.warn('High memory usage detected in template system');
        onThresholdExceeded?.();
      }
    }, this.checkInterval);
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private isMemoryUsageHigh(): boolean {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return memInfo.usedJSHeapSize > this.memoryThreshold;
    }
    return false;
  }

  getMemoryUsage(): { used: number; total: number; percentage: number } | null {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      return {
        used: memInfo.usedJSHeapSize,
        total: memInfo.totalJSHeapSize,
        percentage: (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100
      };
    }
    return null;
  }
}

/**
 * Performance optimization hooks and utilities
 */
export const performanceUtils = {
  // Debounced template preview update
  debouncedPreviewUpdate: debounce((template: PageTemplate, callback: (template: PageTemplate) => void) => {
    callback(template);
  }, 300),

  // Throttled scroll handler for template gallery
  throttledScrollHandler: throttle((callback: () => void) => {
    callback();
  }, 100),

  // Lazy loader instance
  templateLoader: new TemplateLazyLoader(),

  // Thumbnail cache instance
  thumbnailCache: new ThumbnailCache(100),

  // Memory monitor instance
  memoryMonitor: MemoryMonitor.getInstance(),

  // Batch processor for thumbnail generation
  thumbnailBatchProcessor: new BatchProcessor(
    async (templateIds: string[]) => {
      const { generateTemplateThumbnail } = await import('./thumbnail-generator');
      const { pageTemplates } = await import('../data/templates/page-templates');
      
      return templateIds.map(id => {
        const template = pageTemplates.find(t => t.id === id);
        return template ? generateTemplateThumbnail(template) : '';
      });
    },
    5, // Process 5 thumbnails at a time
    50  // 50ms delay between batches
  )
};

/**
 * Performance measurement utility
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const end = performance.now();
      console.log(`${name} took ${end - start} milliseconds`);
    });
  } else {
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }
}

/**
 * Cleanup utility for template system
 */
export function cleanupTemplateSystem(): void {
  performanceUtils.templateLoader.clearCache();
  performanceUtils.thumbnailCache.clear();
  performanceUtils.memoryMonitor.stopMonitoring();
  
  // Clear any remaining timeouts/intervals
  if (typeof window !== 'undefined') {
    // Clear any template-related event listeners
    window.removeEventListener('beforeunload', cleanupTemplateSystem);
  }
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupTemplateSystem);
}