const fs = require('fs');
const path = require('path');

const EXTENSIONS = ['.tsx', '.ts', '.json', '.js'];
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', 'tmp', 'temp', 'uploads', '.pillepelle', 'logs', 'coverage', '.vite', '.cache', '.parcel-cache', '.next', '.nuxt', 'assets', 'migrations'];

function getFileSizeInKB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024).toFixed(2);
}

function scanDirectory(dir, files = [], isRoot = false) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(item) && !item.endsWith('.log')) {
        scanDirectory(fullPath, files, false);
      }
    } else if (stat.isFile() && !isRoot) {
      const ext = path.extname(item);
      if (EXTENSIONS.includes(ext)) {
        files.push({
          path: fullPath,
          size: parseFloat(getFileSizeInKB(fullPath)),
          ext: ext
        });
      }
    }
  }
  
  return files;
}

const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const serverDir = path.join(rootDir, 'server');

console.log('Analysiere Source-Code-Dateien...\n');

let allFiles = [];

if (fs.existsSync(clientDir)) {
  allFiles = allFiles.concat(scanDirectory(clientDir, [], true));
}

if (fs.existsSync(serverDir)) {
  allFiles = allFiles.concat(scanDirectory(serverDir, [], true));
}

allFiles.sort((a, b) => b.size - a.size);

console.log(`Gefundene Dateien: ${allFiles.length}\n`);
console.log('Größe (KB) | Format | Datei');
console.log('-'.repeat(90));

allFiles.forEach(file => {
  const relativePath = path.relative(rootDir, file.path);
  console.log(`${file.size.toString().padStart(10)} | ${file.ext.padEnd(6)} | ${relativePath}`);
});

const totalSize = allFiles.reduce((sum, file) => sum + file.size, 0);
console.log('-'.repeat(90));
console.log(`Gesamt: ${totalSize.toFixed(2)} KB (${(totalSize / 1024).toFixed(2)} MB)`);
