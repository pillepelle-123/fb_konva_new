// Canvas test setup
// This file sets up the test environment for canvas-related tests

import { vi } from 'vitest';

// Mock canvas APIs
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  value: vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Array(4),
    })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
  })),
});

// Mock Image
global.Image = class MockImage {
  src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  complete = false;
  naturalWidth = 100;
  naturalHeight = 100;

  constructor() {
    setTimeout(() => {
      this.complete = true;
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
} as any;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));

// Mock Konva globally
vi.mock('konva', () => ({
  default: {
    Stage: vi.fn(() => ({
      batchDraw: vi.fn(),
    })),
    Layer: vi.fn(() => ({
      add: vi.fn(),
      draw: vi.fn(),
    })),
    Group: vi.fn(() => ({
      add: vi.fn(),
      destroy: vi.fn(),
    })),
    Rect: vi.fn(() => ({
      fill: vi.fn(),
      stroke: vi.fn(),
      destroy: vi.fn(),
    })),
    Image: vi.fn(() => ({
      image: vi.fn(),
      destroy: vi.fn(),
    })),
    Text: vi.fn(() => ({
      text: vi.fn(),
      destroy: vi.fn(),
    })),
  },
}));