#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Entry points for the application
const ENTRY_POINTS = [
  // Client entry points
  'client/src/main.tsx',
  'client/src/app.tsx',
  'client/src/admin/routes.tsx',
  'client/src/admin/AdminApp.tsx',
  'client/src/components/pdf-renderer/pdf-renderer-app.tsx',
  
  // Server entry points
  'server/index.js',
];

// Additional server routes that are registered dynamically
const SERVER_ROUTES = [
  'server/routes/auth.js',
  'server/routes/books.js',
  'server/routes/questions.js',
  'server/routes/upload.js',
  'server/routes/images.js',
  'server/routes/page-assignments.js',
  'server/routes/users.js',
  'server/routes/friendships.js',
  'server/routes/friends.js',
  'server/routes/answers.js',
  'server/routes/messenger.js',
  'server/routes/dashboard.js',
  'server/routes/editor-settings.js',
  'server/routes/user-question-assignments.js',
  'server/routes/invitations.js',
  'server/routes/question-pool.js',
  'server/routes/templates.js',
  'server/routes/admin.js',
  'server/routes/background-images.js',
  'server/routes/stickers.js',
  'server/routes/pdf-exports.js',
];

// Directories and files to exclude from dead code detection
const EXCLUDED_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist\//,
  /build\//,
  /coverage\//,
  /\.test\./,
  /\.spec\./,
  /\.config\./,
  /vitest\./,
  /tsconfig\./,
  /eslint\./,
  /postcss\./,
  /tailwind\./,
  /vite\./,
  /package\.json/,
  /package-lock\.json/,
  /\.md$/,
  /\.sh$/,
  /\.html$/,
  /\.css$/,
  /\.svg$/,
  /\.ico$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.webp$/,
  /\.json$/,
  /\.txt$/,
  /migrations\//,
  /scripts\//,
  /docs\//,
  /tools\//,
  /uploads\//,
  /public\//,
  /\.cursor\//,
  /\.vscode\//,
  /\.env/,
  /\.gitignore/,
  /\.cursorignore/,
  /README/,
  /docs\/implementation\/IMPLEMENTATION_SUMMARY/,
  /deploy_fb\.sh/,
  /scripts\/initDb\.js/,
  /scripts\/migrate_.*\.js$/,
];

const usedFiles = new Set();
const allSourceFiles = new Set();
const indexFileExports = new Map();
const projectRoot = path.resolve(__dirname, '..');

// Normalize path for cross-platform compatibility
function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

// Check if a file should be excluded
function shouldExclude(filePath) {
  const normalizedPath = normalizePath(filePath);
  return EXCLUDED_PATTERNS.some(pattern => pattern.test(normalizedPath));
}

// Resolve import path to actual file path
function resolveImportPath(importPath, fromFile) {
  const fromDir = path.dirname(fromFile);
  
  // Handle relative imports
  if (importPath.startsWith('.')) {
    const resolved = path.resolve(fromDir, importPath);
    
    // Try with various extensions
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
        return withExt;
      }
    }
    
    // Try as directory with index file
    const indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
    for (const indexFile of indexFiles) {
      const indexPath = path.join(resolved, indexFile);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
  }
  
  // Handle absolute imports from src
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    // Try client/src
    const clientSrcPath = path.join(projectRoot, 'client/src', importPath);
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      const withExt = clientSrcPath + ext;
      if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
        return withExt;
      }
    }
    
    // Try as directory with index
    const indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
    for (const indexFile of indexFiles) {
      const indexPath = path.join(clientSrcPath, indexFile);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
  }
  
  return null;
}

// Extract imports from file content
function extractImports(content, filePath) {
  const imports = [];
  
  // Match ES6 imports: import ... from '...'
  const es6ImportRegex = /import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = es6ImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Match require statements: require('...')
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Match dynamic imports: import('...')
  const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Match lazy imports: lazy(() => import('...'))
  const lazyImportRegex = /lazy\s*\(\s*\(\s*\)\s*=>\s*import\s*\(['"]([^'"]+)['"]\)/g;
  while ((match = lazyImportRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  // Match export ... from '...'
  const exportFromRegex = /export\s+(?:type\s+)?(?:\*|{[^}]+})\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = exportFromRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

// Recursively process a file and its dependencies
function processFile(filePath) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(projectRoot, filePath);
  
  // Skip if already processed or excluded
  if (usedFiles.has(absolutePath) || shouldExclude(absolutePath)) {
    return;
  }
  
  // Check if file exists
  if (!fs.existsSync(absolutePath)) {
    console.warn(`Warning: File not found: ${absolutePath}`);
    return;
  }
  
  usedFiles.add(absolutePath);
  
  try {
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const imports = extractImports(content, absolutePath);
    
    // If this is an index file, track what it exports
    if (path.basename(absolutePath).match(/^index\.(ts|tsx|js|jsx)$/)) {
      indexFileExports.set(absolutePath, imports.filter(imp => imp.startsWith('.')));
    }
    
    for (const importPath of imports) {
      // Skip node_modules and external packages
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        continue;
      }
      
      const resolvedPath = resolveImportPath(importPath, absolutePath);
      if (resolvedPath) {
        processFile(resolvedPath);
      }
    }
  } catch (err) {
    console.error(`Error processing ${absolutePath}:`, err.message);
  }
}

// Recursively find all source files
function findAllSourceFiles(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    
    if (shouldExclude(filePath)) {
      continue;
    }
    
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findAllSourceFiles(filePath);
    } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(file)) {
      allSourceFiles.add(filePath);
    }
  }
}

// Main execution
console.log('🔍 Analyzing code dependencies...\n');

// Process all entry points
console.log('Processing entry points...');
[...ENTRY_POINTS, ...SERVER_ROUTES].forEach(entryPoint => {
  console.log(`  - ${entryPoint}`);
  processFile(entryPoint);
});

console.log(`\n✓ Found ${usedFiles.size} used files\n`);

// Find all source files
console.log('Finding all source files...');
findAllSourceFiles(path.join(projectRoot, 'client/src'));
findAllSourceFiles(path.join(projectRoot, 'server'));
findAllSourceFiles(path.join(projectRoot, 'shared'));

console.log(`✓ Found ${allSourceFiles.size} total source files\n`);

// Find dead code
const deadCode = [];
const indexFiles = [];

for (const file of allSourceFiles) {
  if (!usedFiles.has(file)) {
    // Check if this file is an index file
    if (path.basename(file).match(/^index\.(ts|tsx|js|jsx)$/)) {
      indexFiles.push(file);
    } else {
      deadCode.push(file);
    }
  }
}

// Analyze index files - only mark as dead if ALL exports are unused
for (const indexFile of indexFiles) {
  const dir = path.dirname(indexFile);
  const filesInDir = Array.from(allSourceFiles).filter(f => 
    path.dirname(f) === dir && f !== indexFile
  );
  
  // If all files in the directory are unused, the index is also unused
  const allFilesUnused = filesInDir.every(f => 
    deadCode.includes(f) || !usedFiles.has(f)
  );
  
  if (allFilesUnused && filesInDir.length > 0) {
    deadCode.push(indexFile);
  }
}

// Sort dead code by directory
deadCode.sort();

// Group by directory
const deadCodeByDir = {};
for (const file of deadCode) {
  const relativePath = path.relative(projectRoot, file);
  const dir = path.dirname(relativePath);
  
  if (!deadCodeByDir[dir]) {
    deadCodeByDir[dir] = [];
  }
  deadCodeByDir[dir].push(path.basename(file));
}

// Output results
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 DEAD CODE ANALYSIS RESULTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (deadCode.length === 0) {
  console.log('✨ No dead code found! All source files are used.\n');
} else {
  console.log(`⚠️  Found ${deadCode.length} potentially unused files:\n`);
  
  for (const [dir, files] of Object.entries(deadCodeByDir)) {
    console.log(`\n📁 ${dir}/`);
    files.forEach(file => {
      const isIndex = file.match(/^index\.(ts|tsx|js|jsx)$/);
      console.log(`   ${isIndex ? '📦' : '-'} ${file}`);
    });
  }
  
  console.log('\n💡 Files marked with 📦 are index files (only unused if all exports are unused)');
  
  // Write detailed report to file
  const reportPath = path.join(projectRoot, 'dead-code-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalSourceFiles: allSourceFiles.size,
      usedFiles: usedFiles.size,
      deadCodeFiles: deadCode.length,
      percentageUnused: ((deadCode.length / allSourceFiles.size) * 100).toFixed(2) + '%'
    },
    deadCode: deadCode.map(file => path.relative(projectRoot, file)),
    deadCodeByDirectory: deadCodeByDir,
    indexFilesAnalyzed: Array.from(indexFileExports.keys()).map(f => path.relative(projectRoot, f))
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: dead-code-report.json`);
  
  // Generate deletion script
  const deleteScriptPath = path.join(projectRoot, 'delete-dead-code.sh');
  const deleteScript = [
    '#!/bin/bash',
    '# Auto-generated script to delete dead code',
    '# Review carefully before running!',
    '',
    `echo "⚠️  This will delete ${deadCode.length} files"`,
    'echo "Press Ctrl+C to cancel, or Enter to continue..."',
    'read',
    '',
    ...deadCode.map(file => `rm "${path.relative(projectRoot, file)}"`),
    '',
    'echo "✓ Dead code deleted"'
  ].join('\n');
  
  fs.writeFileSync(deleteScriptPath, deleteScript, { mode: 0o755 });
  console.log(`📝 Deletion script saved to: delete-dead-code.sh`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
