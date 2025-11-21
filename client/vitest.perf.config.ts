import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'performance',
    globals: true,
    environment: 'jsdom',
    include: ['**/*.perf.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 60000, // 60 seconds for performance tests
    hookTimeout: 60000,
    teardownTimeout: 10000,
    coverage: {
      enabled: false, // Disable coverage for performance tests
    },
  },
});












