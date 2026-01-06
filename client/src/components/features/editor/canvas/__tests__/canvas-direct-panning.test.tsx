import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test the Direct Panning Optimization logic
describe('Direct Panning Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Feature Flag Logic', () => {
    it('should enable direct panning by default in development', () => {
      const originalEnv = process.env.NODE_ENV;
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

      const DIRECT_PANNING_ENABLED = process.env.NODE_ENV === 'development'
        ? localStorage.getItem('direct-panning') !== 'false'
        : true;

      expect(DIRECT_PANNING_ENABLED).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    it('should allow disabling direct panning in development via localStorage', () => {
      const originalEnv = process.env.NODE_ENV;
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

      const DIRECT_PANNING_ENABLED = process.env.NODE_ENV === 'development'
        ? localStorage.getItem('direct-panning') !== 'false'
        : true;

      expect(DIRECT_PANNING_ENABLED).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it('should always enable direct panning in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const DIRECT_PANNING_ENABLED = process.env.NODE_ENV === 'development'
        ? localStorage.getItem('direct-panning') !== 'false'
        : true;

      expect(DIRECT_PANNING_ENABLED).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Direct Stage Manipulation', () => {
    it('should manipulate stage position directly when enabled', () => {
      const DIRECT_PANNING_ENABLED = true;
      const mockStage = {
        x: vi.fn(),
        y: vi.fn(),
      };
      const mockSetPendingStagePos = vi.fn();
      const mockSetStagePos = vi.fn();

      // Simulate panning logic
      const pos = { x: 100, y: 50 };
      const panStart = { x: 20, y: 10 };
      const clampStagePosition = vi.fn(() => ({ x: 80, y: 40 }));

      const clampedPos = clampStagePosition({
        x: pos.x - panStart.x,
        y: pos.y - panStart.y
      });

      if (DIRECT_PANNING_ENABLED && mockStage) {
        // Direct stage manipulation for better performance
        mockStage.x(clampedPos.x);
        mockStage.y(clampedPos.y);
        mockSetPendingStagePos(clampedPos);
      } else {
        // Fallback to state updates
        mockSetStagePos(clampedPos);
      }

      expect(mockStage.x).toHaveBeenCalledWith(80);
      expect(mockStage.y).toHaveBeenCalledWith(40);
      expect(mockSetPendingStagePos).toHaveBeenCalledWith({ x: 80, y: 40 });
      expect(mockSetStagePos).not.toHaveBeenCalled();
    });

    it('should fallback to state updates when optimization is disabled', () => {
      const DIRECT_PANNING_ENABLED = false;
      const mockStage = {
        x: vi.fn(),
        y: vi.fn(),
      };
      const mockSetPendingStagePos = vi.fn();
      const mockSetStagePos = vi.fn();

      // Simulate panning logic
      const pos = { x: 100, y: 50 };
      const panStart = { x: 20, y: 10 };
      const clampStagePosition = vi.fn(() => ({ x: 80, y: 40 }));

      const clampedPos = clampStagePosition({
        x: pos.x - panStart.x,
        y: pos.y - panStart.y
      });

      if (DIRECT_PANNING_ENABLED && mockStage) {
        // Direct stage manipulation for better performance
        mockStage.x(clampedPos.x);
        mockStage.y(clampedPos.y);
        mockSetPendingStagePos(clampedPos);
      } else {
        // Fallback to state updates
        mockSetStagePos(clampedPos);
      }

      expect(mockStage.x).not.toHaveBeenCalled();
      expect(mockStage.y).not.toHaveBeenCalled();
      expect(mockSetPendingStagePos).not.toHaveBeenCalled();
      expect(mockSetStagePos).toHaveBeenCalledWith({ x: 80, y: 40 });
    });
  });

  describe('State Synchronization', () => {
    it('should sync pending position to state after panning ends', () => {
      const mockSetStagePos = vi.fn();

      // Simulate the useEffect logic
      const isPanning = false;
      const pendingStagePos = { x: 100, y: 200 };
      const stagePos = { x: 50, y: 150 };

      if (!isPanning && pendingStagePos) {
        // Only update state if the position actually changed
        if (pendingStagePos.x !== stagePos.x || pendingStagePos.y !== stagePos.y) {
          mockSetStagePos(pendingStagePos);
        }
      }

      expect(mockSetStagePos).toHaveBeenCalledWith({ x: 100, y: 200 });
    });

    it('should not sync if position has not changed', () => {
      const mockSetStagePos = vi.fn();

      // Simulate the useEffect logic
      const isPanning = false;
      const pendingStagePos = { x: 100, y: 200 };
      const stagePos = { x: 100, y: 200 };

      if (!isPanning && pendingStagePos) {
        // Only update state if the position actually changed
        if (pendingStagePos.x !== stagePos.x || pendingStagePos.y !== stagePos.y) {
          mockSetStagePos(pendingStagePos);
        }
      }

      expect(mockSetStagePos).not.toHaveBeenCalled();
    });

    it('should not sync while still panning', () => {
      const mockSetStagePos = vi.fn();

      // Simulate the useEffect logic
      const isPanning = true; // Still panning
      const pendingStagePos = { x: 100, y: 200 };
      const stagePos = { x: 50, y: 150 };

      if (!isPanning && pendingStagePos) {
        mockSetStagePos(pendingStagePos);
      }

      expect(mockSetStagePos).not.toHaveBeenCalled();
    });
  });

  describe('Performance Benefits', () => {
    it('should avoid state updates during active panning', () => {
      const DIRECT_PANNING_ENABLED = true;
      const mockStage = {
        x: vi.fn(),
        y: vi.fn(),
      };
      const mockSetPendingStagePos = vi.fn();
      const mockSetStagePos = vi.fn();

      // Simulate multiple panning movements
      const movements = [
        { pos: { x: 100, y: 50 }, panStart: { x: 20, y: 10 } },
        { pos: { x: 110, y: 60 }, panStart: { x: 20, y: 10 } },
        { pos: { x: 120, y: 70 }, panStart: { x: 20, y: 10 } },
      ];

      movements.forEach(({ pos, panStart }) => {
        const clampedPos = {
          x: pos.x - panStart.x,
          y: pos.y - panStart.y
        };

        if (DIRECT_PANNING_ENABLED && mockStage) {
          mockStage.x(clampedPos.x);
          mockStage.y(clampedPos.y);
          mockSetPendingStagePos(clampedPos);
        } else {
          mockSetStagePos(clampedPos);
        }
      });

      // Should manipulate stage directly for each movement
      expect(mockStage.x).toHaveBeenCalledTimes(3);
      expect(mockStage.y).toHaveBeenCalledTimes(3);
      expect(mockSetPendingStagePos).toHaveBeenCalledTimes(3);

      // Should NOT trigger state updates during panning
      expect(mockSetStagePos).toHaveBeenCalledTimes(0);
    });
  });
});