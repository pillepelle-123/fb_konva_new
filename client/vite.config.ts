import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sharedPath = path.resolve(__dirname, '../shared')

// Plugin to prefer TypeScript files over JavaScript files in shared directory
const preferTypeScriptInShared = () => {
  return {
    name: 'prefer-typescript-in-shared',
    enforce: 'pre',
    resolveId(source: string, importer?: string) {
      // Only handle relative imports
      if (!source.startsWith('.') || !importer) {
        return null
      }

      // Check if importer is in shared directory or imports from shared
      const importerDir = path.dirname(importer)
      const resolvedPath = path.resolve(importerDir, source)
      const normalizedResolved = resolvedPath.replace(/\\/g, '/')
      const normalizedShared = sharedPath.replace(/\\/g, '/')

      // Check if resolved path is within shared directory
      if (normalizedResolved.startsWith(normalizedShared)) {
        // Check if both .ts and .js files exist
        const tsPath = normalizedResolved + '.ts'
        const jsPath = normalizedResolved + '.js'
        const tsExists = fs.existsSync(tsPath)
        const jsExists = fs.existsSync(jsPath)

        // Prefer .ts file if both exist
        if (tsExists && jsExists) {
          return tsPath
        }

        // Check extensions in order: .ts, .tsx, .js, .jsx
        const extensions = ['.ts', '.tsx', '.js', '.jsx']
        for (const ext of extensions) {
          const testPath = normalizedResolved + ext
          if (fs.existsSync(testPath)) {
            return testPath
          }
        }
      }

      return null
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [preferTypeScriptInShared(), react()],
  logLevel: 'silent',
  resolve: {
    extensions: ['.mts', '.ts', '.mjs', '.js', '.tsx', '.jsx', '.json'],
  },
})
