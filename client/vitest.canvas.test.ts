import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/components/features/editor/canvas/__tests__/canvas-listening-optimization.test.tsx'],
    exclude: ['node_modules', 'dist'],
  },
});