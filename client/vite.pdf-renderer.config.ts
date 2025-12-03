import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin that resolves TypeScript imports by adding extensions
const resolveTypeScriptExtensions = () => {
  return {
    name: 'resolve-typescript-extensions',
    enforce: 'pre',
    resolveId(source, importer) {
      // Only handle relative imports
      if (!source.startsWith('.') || !importer) {
        return null;
      }

      // Only process files in src directory
      const srcPath = path.resolve(__dirname, 'src').replace(/\\/g, '/');
      const normalizedImporter = importer.replace(/\\/g, '/');
      
      if (!normalizedImporter.includes(srcPath)) {
        return null;
      }

      const extensions = ['.tsx', '.ts', '.jsx', '.js'];
      const importerDir = path.dirname(importer);
      
      // Try resolving with each extension
      for (const ext of extensions) {
        const resolvedPath = path.resolve(importerDir, source + ext);
        try {
          if (fs.existsSync(resolvedPath)) {
            // Return normalized path with forward slashes
            return resolvedPath.replace(/\\/g, '/');
          }
        } catch {
          // Continue
        }
      }

      // Try as directory with index file
      for (const ext of extensions) {
        const indexPath = path.resolve(importerDir, source, 'index' + ext);
        try {
          if (fs.existsSync(indexPath)) {
            return indexPath.replace(/\\/g, '/');
          }
        } catch {
          // Continue
        }
      }

      return null;
    },
  };
};


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    resolveTypeScriptExtensions(), // Must be first
    tsconfigPaths(), // Resolve TypeScript paths from tsconfig
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/components/pdf-renderer/index.ts'),
      name: 'PDFRenderer',
      formats: ['iife'],
      fileName: 'pdf-renderer',
    },
    rollupOptions: {
      external: [],
      output: {
        inlineDynamicImports: true,
      },
    },
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
    chunkSizeWarningLimit: 2000,
    target: 'es2020',
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  define: {
    'process.env': '{}',
    'process.env.NODE_ENV': '"production"',
    'process': '{}',
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-konva',
      'konva',
      'roughjs',
    ],
  },
});
