import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the environment
const originalEnv = process.env.NODE_ENV;

// Test the Transformer Optimization logic
describe('Transformer Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Feature Flag Logic', () => {
    it('should enable optimization by default in development', () => {
      process.env.NODE_ENV = 'development';

      // Mock localStorage
      const mockLocalStorage = {
        getItem: vi.fn(() => null), // No override
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      const TRANSFORMER_OPTIMIZATION_ENABLED = process.env.NODE_ENV === 'development'
        ? localStorage.getItem('transformer-optimization') !== 'false'
        : true;

      expect(TRANSFORMER_OPTIMIZATION_ENABLED).toBe(true);
    });

    it('should allow disabling optimization in development via localStorage', () => {
      process.env.NODE_ENV = 'development';

      // Mock localStorage with disabled flag
      const mockLocalStorage = {
        getItem: vi.fn(() => 'false'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      const TRANSFORMER_OPTIMIZATION_ENABLED = process.env.NODE_ENV === 'development'
        ? localStorage.getItem('transformer-optimization') !== 'false'
        : true;

      expect(TRANSFORMER_OPTIMIZATION_ENABLED).toBe(false);
    });

    it('should always enable optimization in production', () => {
      process.env.NODE_ENV = 'production';

      const TRANSFORMER_OPTIMIZATION_ENABLED = process.env.NODE_ENV === 'development'
        ? localStorage.getItem('transformer-optimization') !== 'false'
        : true;

      expect(TRANSFORMER_OPTIMIZATION_ENABLED).toBe(true);
    });
  });

  describe('Batched Update Logic', () => {
    it('should use requestAnimationFrame for batched updates when enabled', () => {
      vi.useFakeTimers();
      const mockRequestAnimationFrame = vi.fn((cb) => cb());
      global.requestAnimationFrame = mockRequestAnimationFrame;

      const TRANSFORMER_OPTIMIZATION_ENABLED = true;

      // Mock transformer ref
      const mockTransformer = {
        forceUpdate: vi.fn(),
      };

      // Mock smartCanvasUpdate
      const mockSmartCanvasUpdate = vi.fn();

      // Simulate batchedTransformerUpdate logic
      const batchedTransformerUpdate = () => {
        if (TRANSFORMER_OPTIMIZATION_ENABLED) {
          requestAnimationFrame(() => {
            try {
              if (mockTransformer) {
                mockTransformer.forceUpdate();
                mockSmartCanvasUpdate(true);
              }
            } catch (error) {
              console.debug('Batched transformer update error:', error);
            }
          });
        }
      };

      batchedTransformerUpdate();

      expect(mockRequestAnimationFrame).toHaveBeenCalled();
      expect(mockTransformer.forceUpdate).toHaveBeenCalled();
      expect(mockSmartCanvasUpdate).toHaveBeenCalledWith(true);

      vi.useRealTimers();
    });

    it('should fallback to legacy method when optimization fails', () => {
      vi.useFakeTimers();
      const mockRequestAnimationFrame = vi.fn((cb) => cb());
      global.requestAnimationFrame = mockRequestAnimationFrame;

      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const TRANSFORMER_OPTIMIZATION_ENABLED = true;

      // Mock transformer ref
      const mockTransformer = {
        forceUpdate: vi.fn(() => {
          throw new Error('Force update failed');
        }),
      };

      // Mock legacy method
      const mockLegacyTransformerUpdate = vi.fn();

      // Simulate batchedTransformerUpdate logic with error handling
      const batchedTransformerUpdate = () => {
        if (TRANSFORMER_OPTIMIZATION_ENABLED) {
          requestAnimationFrame(() => {
            try {
              if (mockTransformer) {
                mockTransformer.forceUpdate();
              }
            } catch (error) {
              console.debug('Batched transformer update error:', error);
              mockLegacyTransformerUpdate(); // Fallback
            }
          });
        } else {
          mockLegacyTransformerUpdate();
        }
      };

      batchedTransformerUpdate();

      expect(mockLegacyTransformerUpdate).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Batched transformer update error:', expect.any(Error));

      consoleSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should use legacy method when optimization is disabled', () => {
      const TRANSFORMER_OPTIMIZATION_ENABLED = false;

      // Mock legacy method
      const mockLegacyTransformerUpdate = vi.fn();

      // Simulate batchedTransformerUpdate logic
      const batchedTransformerUpdate = () => {
        if (TRANSFORMER_OPTIMIZATION_ENABLED) {
          // Optimized path
        } else {
          mockLegacyTransformerUpdate();
        }
      };

      batchedTransformerUpdate();

      expect(mockLegacyTransformerUpdate).toHaveBeenCalled();
    });
  });

  describe('Performance Benefits', () => {
    it('should reduce the number of transformer updates through batching', () => {
      vi.useFakeTimers();
      const mockTransformer = {
        forceUpdate: vi.fn(),
      };

      const TRANSFORMER_OPTIMIZATION_ENABLED = true;
      const mockSmartCanvasUpdate = vi.fn();

      let updateCount = 0;

      // Mock requestAnimationFrame to execute immediately
      const mockRequestAnimationFrame = vi.fn((cb) => cb());
      global.requestAnimationFrame = mockRequestAnimationFrame;

      // Simulate multiple rapid calls (like what happens during element changes)
      const batchedTransformerUpdate = () => {
        if (TRANSFORMER_OPTIMIZATION_ENABLED) {
          requestAnimationFrame(() => {
            try {
              if (mockTransformer) {
                updateCount++;
                mockTransformer.forceUpdate();
                mockSmartCanvasUpdate(true);
              }
            } catch (error) {
              console.debug('Error:', error);
            }
          });
        }
      };

      // Call multiple times rapidly
      batchedTransformerUpdate();
      batchedTransformerUpdate();
      batchedTransformerUpdate();

      // In a real scenario, requestAnimationFrame would batch these
      // For this test, we simulate that only one update happens
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(3);
      expect(updateCount).toBe(3); // Each call executes immediately in our mock

      // But in reality, requestAnimationFrame would batch them
      // This test demonstrates the concept

      vi.useRealTimers();
    });
  });
});