// Simple verification that styles are working correctly
import { styles, getStyleRenderer } from './styles-client';
import type { CanvasElement } from '../context/editor-context';

const testElement: CanvasElement = {
  id: 'test-123',
  type: 'rect',
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  stroke: '#1f2937',
  strokeWidth: 2,
  inheritStyle: 'rough'
} as CanvasElement;

export function verifyStyles(): boolean {
  const requiredStyles = ['rough', 'default'];
  
  for (const styleName of requiredStyles) {
    if (!styles[styleName as keyof typeof styles]) {
      console.error(`Style ${styleName} not found`);
      return false;
    }
    
    const renderer = getStyleRenderer(styleName as any);
    if (!renderer) {
      console.error(`Renderer for style ${styleName} not found`);
      return false;
    }
    
    try {
      const path = renderer.generatePath(testElement);
      if (typeof path !== 'string') {
        console.error(`Invalid path generated for style ${styleName}`);
        return false;
      }
    } catch (error) {
      console.error(`Error generating path for style ${styleName}:`, error);
      return false;
    }
    
    try {
      const props = renderer.getStrokeProps(testElement);
      if (!props.stroke || typeof props.strokeWidth !== 'number') {
        console.error(`Invalid stroke props for style ${styleName}`);
        return false;
      }
    } catch (error) {
      console.error(`Error generating stroke props for style ${styleName}:`, error);
      return false;
    }
  }
  
  return true;
}

if (import.meta.env.DEV) {
  verifyStyles();
}
