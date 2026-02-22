/**
 * Vitest setup for canvas/Konva tests.
 * Minimal setup - extend as needed for canvas-specific tests.
 */

import { vi } from 'vitest';

// Mock HTMLCanvasElement.getContext for Konva/canvas usage
vi.stubGlobal('HTMLCanvasElement', class {
  getContext() {
    return {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    };
  }
});
