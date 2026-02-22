/**
 * Seed script: Import themes, color palettes, and layouts from JSON files into the database.
 * Run after create_themes_palettes_layouts_tables.sql and migrate_serial_ids_and_layouts.sql.
 *
 * Usage: node scripts/seed-themes-palettes-layouts.js
 * Requires: DATABASE_URL in .env
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const fs = require('fs').promises;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let schema = 'public';
try {
  const url = new URL(process.env.DATABASE_URL);
  schema = url.searchParams.get('schema') || 'public';
} catch {
  // DATABASE_URL may not be a valid URL
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${schema}`);

    // 1. Run migrations if tables don't exist (old schema first, then migrate to new)
    const createPath = path.join(__dirname, '../migrations/create_themes_palettes_layouts_tables.sql');
    const migratePath = path.join(__dirname, '../migrations/migrate_serial_ids_and_layouts.sql');
    let createSql = await fs.readFile(createPath, 'utf8');
    let migrateSql = await fs.readFile(migratePath, 'utf8');
    if (createSql.charCodeAt(0) === 0xFEFF) createSql = createSql.slice(1);
    if (migrateSql.charCodeAt(0) === 0xFEFF) migrateSql = migrateSql.slice(1);
    await client.query(createSql);
    await client.query(migrateSql);

    const projectRoot = path.join(__dirname, '../..');

    // 2. Seed color palettes first (SERIAL id, no explicit id)
    const palettesPath = path.join(projectRoot, 'shared/data/templates/color-palettes.json');
    const palettesRaw = await fs.readFile(palettesPath, 'utf8');
    const palettesData = JSON.parse(palettesRaw);
    const palettes = palettesData.palettes || [];
    const paletteNameToId = {};

    for (let i = 0; i < palettes.length; i++) {
      const p = palettes[i];
      const res = await client.query(
        `INSERT INTO color_palettes (name, colors, parts, contrast, sort_order)
         VALUES ($1, $2::jsonb, $3::jsonb, $4, $5)
         RETURNING id, name`,
        [
          p.name || p.id,
          JSON.stringify(p.colors || {}),
          JSON.stringify(p.parts || {}),
          p.contrast || null,
          i,
        ]
      );
      if (res.rows[0]) {
        paletteNameToId[p.name || p.id] = res.rows[0].id;
      }
    }
    console.log(`Seeded ${palettes.length} color palettes`);

    // 3. Seed themes (SERIAL id, palette_id from lookup)
    const themesPath = path.join(projectRoot, 'shared/data/templates/themes.json');
    const themesRaw = await fs.readFile(themesPath, 'utf8');
    const themesData = JSON.parse(themesRaw);

    for (const [id, theme] of Object.entries(themesData)) {
      const config = {
        pageSettings: theme.pageSettings || {},
        elementDefaults: theme.elementDefaults || {},
      };
      const paletteId = paletteNameToId[theme.palette || 'default'] ?? null;
      await client.query(
        `INSERT INTO themes (name, description, palette_id, config, sort_order)
         VALUES ($1, $2, $3, $4::jsonb, 0)`,
        [
          theme.name || id,
          theme.description || null,
          paletteId,
          JSON.stringify(config),
        ]
      );
    }
    console.log(`Seeded ${Object.keys(themesData).length} themes`);

    // 4. Seed layouts (SERIAL id, table: layouts)
    const layoutsPath = path.join(projectRoot, 'client/src/data/templates/layout.json');
    const layoutsRaw = await fs.readFile(layoutsPath, 'utf8');
    const layoutsData = JSON.parse(layoutsRaw);
    const layouts = Array.isArray(layoutsData) ? layoutsData : [];

    for (let i = 0; i < layouts.length; i++) {
      const lt = layouts[i];
      const textboxes = lt.textboxes || [];
      const elements = lt.elements || [];
      const meta = {
        ...(lt.meta || {}),
        columns: lt.columns,
        constraints: lt.constraints,
      };

      await client.query(
        `INSERT INTO layouts (name, category, thumbnail, textboxes, elements, meta, sort_order)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)`,
        [
          lt.name || lt.id,
          lt.category || null,
          lt.thumbnail || null,
          JSON.stringify(textboxes),
          JSON.stringify(elements),
          JSON.stringify(meta),
          i,
        ]
      );
    }
    console.log(`Seeded ${layouts.length} layouts`);

    console.log('Seed completed successfully.');
  } catch (err) {
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
