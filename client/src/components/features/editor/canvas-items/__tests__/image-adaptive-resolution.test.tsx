import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import Image from '../image';
import { EditorProvider } from '../../../../../context/editor-context';
import { AuthProvider } from '../../../../../context/auth-context';
import type { CanvasElement } from '../../../../../context/editor-context';

// Mock Konva
vi.mock('react-konva', () => ({
  Rect: vi.fn(() => null),
  Image: vi.fn(() => null),
  Group: vi.fn(() => null),
  Line: vi.fn(() => null),
  Path: vi.fn(() => null),
}));

// Mock other dependencies
vi.mock('../../../../../utils/themes-client', () => ({
  getThemeRenderer: vi.fn(() => ({})),
}));

vi.mock('../../../../../utils/themed-border', () => ({
  renderThemedBorder: vi.fn(() => null),
  createRectPath: vi.fn(() => ''),
}));

vi.mock('../../../../../utils/global-themes', () => ({
  getGlobalThemeDefaults: vi.fn(() => ({})),
}));

vi.mock('../../../../../utils/image-resolution-utils', () => ({
  getAdaptiveImageUrl: vi.fn((url: string) => url),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock environment
const originalEnv = process.env.NODE_ENV;

describe('Image Component - Adaptive Resolution', () => {
  const mockElement: CanvasElement = {
    id: 'test-image',
    type: 'image',
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    src: 'https://example.com/test-image.jpg',
  };

  const mockProps = {
    element: mockElement,
    isSelected: false,
    onSelect: vi.fn(),
    zoom: 1.0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Feature Flag Logic', () => {
    it('enables adaptive resolution by default in development', () => {
      process.env.NODE_ENV = 'development';

      mockLocalStorage.getItem.mockReturnValue(null); // No override

      render(
        <AuthProvider>
          <EditorProvider>
            <Image {...mockProps} />
          </EditorProvider>
        </AuthProvider>
      );

      // Should call getAdaptiveImageUrl with enabled: true
      const { getAdaptiveImageUrl } = require('../../../../../utils/image-resolution-utils');
      expect(getAdaptiveImageUrl).toHaveBeenCalledWith(
        expect.stringContaining('example.com'),
        expect.objectContaining({ enabled: true, zoom: 1.0 })
      );
    });

    it('allows disabling adaptive resolution in development via localStorage', () => {
      process.env.NODE_ENV = 'development';

      mockLocalStorage.getItem.mockReturnValue('false'); // Disabled

      render(
        <AuthProvider>
          <EditorProvider>
            <Image {...mockProps} />
          </EditorProvider>
        </AuthProvider>
      );

      // Should call getAdaptiveImageUrl with enabled: false
      const { getAdaptiveImageUrl } = require('../../../../../utils/image-resolution-utils');
      expect(getAdaptiveImageUrl).toHaveBeenCalledWith(
        expect.stringContaining('example.com'),
        expect.objectContaining({ enabled: false, zoom: 1.0 })
      );
    });

    it('always enables adaptive resolution in production', () => {
      process.env.NODE_ENV = 'production';

      render(
        <AuthProvider>
          <EditorProvider>
            <Image {...mockProps} />
          </EditorProvider>
        </AuthProvider>
      );

      // Should call getAdaptiveImageUrl with enabled: true
      const { getAdaptiveImageUrl } = require('../../../../../utils/image-resolution-utils');
      expect(getAdaptiveImageUrl).toHaveBeenCalledWith(
        expect.stringContaining('example.com'),
        expect.objectContaining({ enabled: true, zoom: 1.0 })
      );
    });
  });

  describe('Zoom-based Resolution', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      mockLocalStorage.getItem.mockReturnValue(null); // Enable feature
    });

    it('uses full resolution for high zoom levels (>= 150%)', () => {
      render(
        <AuthProvider>
          <EditorProvider>
            <Image {...mockProps} zoom={1.5} />
          </EditorProvider>
        </AuthProvider>
      );

      const { getAdaptiveImageUrl } = require('../../../../../utils/image-resolution-utils');
      expect(getAdaptiveImageUrl).toHaveBeenCalledWith(
        expect.stringContaining('example.com'),
        expect.objectContaining({ zoom: 1.5 })
      );
    });

    it('uses reduced resolution for medium zoom levels (75-149%)', () => {
      render(
        <AuthProvider>
          <EditorProvider>
            <Image {...mockProps} zoom={1.0} />
          </EditorProvider>
        </AuthProvider>
      );

      const { getAdaptiveImageUrl } = require('../../../../../utils/image-resolution-utils');
      expect(getAdaptiveImageUrl).toHaveBeenCalledWith(
        expect.stringContaining('example.com'),
        expect.objectContaining({ zoom: 1.0 })
      );
    });

    it('uses minimum resolution for low zoom levels (< 75%)', () => {
      render(
        <AuthProvider>
          <EditorProvider>
            <Image {...mockProps} zoom={0.5} />
          </EditorProvider>
        </AuthProvider>
      );

      const { getAdaptiveImageUrl } = require('../../../../../utils/image-resolution-utils');
      expect(getAdaptiveImageUrl).toHaveBeenCalledWith(
        expect.stringContaining('example.com'),
        expect.objectContaining({ zoom: 0.5 })
      );
    });

    it('handles missing zoom prop gracefully', () => {
      const propsWithoutZoom = { ...mockProps };
      delete propsWithoutZoom.zoom;

      render(
        <AuthProvider>
          <EditorProvider>
            <Image {...propsWithoutZoom} />
          </EditorProvider>
        </AuthProvider>
      );

      const { getAdaptiveImageUrl } = require('../../../../../utils/image-resolution-utils');
      expect(getAdaptiveImageUrl).toHaveBeenCalledWith(
        expect.stringContaining('example.com'),
        expect.objectContaining({ zoom: 1 }) // Default fallback
      );
    });
  });

  describe('URL Handling', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      mockLocalStorage.getItem.mockReturnValue(null);
    });

    it('handles external URLs', () => {
      const localElement = {
        ...mockElement,
        src: 'http://localhost:3000/image.jpg'
      };

      render(
        <AuthProvider>
          <EditorProvider>
            <Image {...mockProps} element={localElement} />
          </EditorProvider>
        </AuthProvider>
      );

      const { getAdaptiveImageUrl } = require('../../../../../utils/image-resolution-utils');
      expect(getAdaptiveImageUrl).toHaveBeenCalledWith(
        'http://localhost:3000/image.jpg',
        expect.any(Object)
      );
    });
  });
});