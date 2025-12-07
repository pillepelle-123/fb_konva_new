import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedPath = path.resolve(__dirname, '../shared');

// Custom plugin to resolve shared imports
const resolveSharedImports = () => {
  return {
    name: 'resolve-shared-imports',
    enforce: 'pre',
    resolveId(source: string, importer?: string) {
      // Handle relative paths that go to shared directory
      if (!source.startsWith('.')) {
        return null;
      }
      
      if (!importer) {
        return null;
      }
      
      // Check if the path points to shared directory
      const importerDir = path.dirname(importer);
      const resolvedPath = path.resolve(importerDir, source);
      const normalizedResolved = resolvedPath.replace(/\\/g, '/');
      const normalizedShared = sharedPath.replace(/\\/g, '/');
      
      // Check if resolved path is within shared directory
      if (normalizedResolved.startsWith(normalizedShared)) {
        // Check if file exists
        const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
        for (const ext of extensions) {
          const testPath = normalizedResolved + ext;
          if (fs.existsSync(testPath)) {
            return testPath;
          }
        }
      }
      
      return null;
    },
  };
};

export default defineConfig({
  plugins: [resolveSharedImports(), react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['src/**/*.perf.test.{ts,tsx}', 'node_modules', 'dist'],
    setupFiles: ['src/test-setup/canvas-setup.ts'],
  },
  resolve: {
    alias: {
      '@shared': sharedPath,
    },
  },
});

