import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'src/components/features/editor/canvas/__tests__/canvas-listening-optimization.test.tsx',
      'src/components/features/editor/canvas/__tests__/canvas-debounced-updates.test.tsx',
      'src/components/features/editor/canvas/__tests__/canvas-transformer-optimization.test.tsx',
      'src/components/features/editor/canvas/__tests__/canvas-direct-panning.test.tsx',
      'src/components/features/editor/canvas/__tests__/canvas-adaptive-pixel-ratio.test.tsx'
    ],
    exclude: ['node_modules', 'dist'],
  },
});