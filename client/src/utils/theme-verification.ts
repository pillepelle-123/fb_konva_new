// Simple verification that themes are working correctly
import { themes, getThemeRenderer } from './themes-client';
import type { CanvasElement } from '../context/editor-context';

// Test element for verification
const testElement: CanvasElement = {
  id: 'test-123',
  type: 'rect',
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  stroke: '#1f2937',
  strokeWidth: 2,
  theme: 'rough'
};

// Verify all themes are available
export function verifyThemes(): boolean {
  const requiredThemes = ['rough', 'default'];
  
  for (const themeName of requiredThemes) {
    if (!themes[themeName as keyof typeof themes]) {
      console.error(`Theme ${themeName} not found`);
      return false;
    }
    
    const renderer = getThemeRenderer(themeName as any);
    if (!renderer) {
      console.error(`Renderer for theme ${themeName} not found`);
      return false;
    }
    
    // Test path generation
    try {
      const path = renderer.generatePath(testElement);
      if (typeof path !== 'string') {
        console.error(`Invalid path generated for theme ${themeName}`);
        return false;
      }
    } catch (error) {
      console.error(`Error generating path for theme ${themeName}:`, error);
      return false;
    }
    
    // Test stroke props
    try {
      const props = renderer.getStrokeProps(testElement);
      if (!props.stroke || typeof props.strokeWidth !== 'number') {
        console.error(`Invalid stroke props for theme ${themeName}`);
        return false;
      }
    } catch (error) {
      console.error(`Error generating stroke props for theme ${themeName}:`, error);
      return false;
    }
  }
  
  // console.log('All themes verified successfully');
  return true;
}

// Run verification in development
if (import.meta.env.DEV) {
  verifyThemes();
}