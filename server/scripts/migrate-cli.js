const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const serverRoot = path.join(__dirname, '..');
const migrationsDir = path.join(serverRoot, 'migrations');
const migrationsGlob = `${migrationsDir.replace(/\\/g, '/')}/[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]__*.sql`;
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('No migration command provided. Example: up, down, status, create <name>');
  process.exit(1);
}

fs.mkdirSync(migrationsDir, { recursive: true });

function formatUtcTimestamp(date) {
  const p = (value) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`;
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

if (args[0] === 'create') {
  const rawName = args.slice(1).find((arg) => !arg.startsWith('-'));
  const slug = slugify(rawName || '');

  if (!slug) {
    console.error('Please provide a migration name. Example: npm run migrate:create -- add_user_status');
    process.exit(1);
  }

  const filename = `${formatUtcTimestamp(new Date())}__${slug}.sql`;
  const filePath = path.join(migrationsDir, filename);

  if (fs.existsSync(filePath)) {
    console.error(`Migration already exists: ${filename}`);
    process.exit(1);
  }

  const template = `BEGIN;\n\n-- TODO: migration SQL\n\nCOMMIT;\n`;
  fs.writeFileSync(filePath, template, 'utf8');
  console.log(`Created migration: ${path.relative(serverRoot, filePath)}`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Please configure server/.env first.');
  process.exit(1);
}

// node-pg-migrate v8 no longer supports "status" directly.
const normalizedArgs = args[0] === 'status' ? ['up', '--dry-run'] : args;

const cliPath = require.resolve('node-pg-migrate/bin/node-pg-migrate');
const result = spawnSync(
  process.execPath,
  [cliPath, ...normalizedArgs, '--migrations-dir', migrationsGlob, '--use-glob'],
  {
    cwd: serverRoot,
    env: process.env,
    stdio: 'inherit',
  }
);

if (result.error) {
  console.error('Failed to execute node-pg-migrate:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
