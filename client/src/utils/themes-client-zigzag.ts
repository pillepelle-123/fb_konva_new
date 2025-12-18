/**
 * Client-side Wrapper für Zigzag-Theme (PoC)
 * Wrapper um shared/utils/themes-engine.js für React-Konva
 */

import type { ThemeRenderer } from './themes';
import type { CanvasElement } from '../context/editor-context';
import { generateZigzagPath, getStrokeProps } from '../../../shared/utils/themes-engine';

/**
 * Minimal ThemeRenderer Interface für Zigzag-PoC
 */
const zigzagThemeRenderer: ThemeRenderer = {
  generatePath: (element: CanvasElement, zoom = 1) => {
    const options = {
      document: typeof document !== 'undefined' ? document : undefined,
      zoom
    };
    return generateZigzagPath(element as any, options);
  },
  
  getStrokeProps: (element: CanvasElement, zoom = 1) => {
    const options = {
      document: typeof document !== 'undefined' ? document : undefined,
      zoom
    };
    return getStrokeProps(element as any, 'zigzag', options);
  }
};

/**
 * Get theme renderer for Zigzag theme (PoC)
 * @param theme - Currently only 'zigzag' is supported in PoC
 * @returns ThemeRenderer or null
 */
export function getThemeRendererZigzag(theme: 'zigzag' = 'zigzag'): ThemeRenderer | null {
  if (theme === 'zigzag') {
    return zigzagThemeRenderer;
  }
  return null;
}

export type { ThemeRenderer } from './themes';

