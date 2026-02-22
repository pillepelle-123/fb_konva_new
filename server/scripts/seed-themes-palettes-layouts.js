/**
 * Seed script: Import themes, color palettes, and layout templates from JSON files into the database.
 * Run after create_themes_palettes_layouts_tables.sql migration.
 *
 * Usage: node scripts/seed-themes-palettes-layouts.js
 * Requires: DATABASE_URL in .env
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

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

    // 1. Run migration if tables don't exist
    const migrationPath = path.join(__dirname, '../migrations/create_themes_palettes_layouts_tables.sql');
    const migrationSql = await fs.readFile(migrationPath, 'utf8');
    await client.query(migrationSql);

    const projectRoot = path.join(__dirname, '../..');

    // 2. Seed themes
    const themesPath = path.join(projectRoot, 'shared/data/templates/themes.json');
    const themesRaw = await fs.readFile(themesPath, 'utf8');
    const themesData = JSON.parse(themesRaw);

    for (const [id, theme] of Object.entries(themesData)) {
      const config = {
        pageSettings: theme.pageSettings || {},
        elementDefaults: theme.elementDefaults || {},
      };
      await client.query(
        `INSERT INTO themes (id, name, description, palette_id, config, sort_order)
         VALUES ($1, $2, $3, $4, $5::jsonb, 0)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           palette_id = EXCLUDED.palette_id,
           config = EXCLUDED.config,
           updated_at = NOW()`,
        [
          id,
          theme.name || id,
          theme.description || null,
          theme.palette || null,
          JSON.stringify(config),
        ]
      );
    }
    console.log(`Seeded ${Object.keys(themesData).length} themes`);

    // 3. Seed color palettes
    const palettesPath = path.join(projectRoot, 'shared/data/templates/color-palettes.json');
    const palettesRaw = await fs.readFile(palettesPath, 'utf8');
    const palettesData = JSON.parse(palettesRaw);
    const palettes = palettesData.palettes || [];

    for (let i = 0; i < palettes.length; i++) {
      const p = palettes[i];
      await client.query(
        `INSERT INTO color_palettes (id, name, colors, parts, contrast, sort_order)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           colors = EXCLUDED.colors,
           parts = EXCLUDED.parts,
           contrast = EXCLUDED.contrast,
           sort_order = EXCLUDED.sort_order,
           updated_at = NOW()`,
        [
          p.id,
          p.name || p.id,
          JSON.stringify(p.colors || {}),
          JSON.stringify(p.parts || {}),
          p.contrast || null,
          i,
        ]
      );
    }
    console.log(`Seeded ${palettes.length} color palettes`);

    // 4. Seed layout templates
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
        `INSERT INTO layout_templates (id, name, category, thumbnail, textboxes, elements, meta, sort_order)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           thumbnail = EXCLUDED.thumbnail,
           textboxes = EXCLUDED.textboxes,
           elements = EXCLUDED.elements,
           meta = EXCLUDED.meta,
           sort_order = EXCLUDED.sort_order,
           updated_at = NOW()`,
        [
          lt.id,
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
    console.log(`Seeded ${layouts.length} layout templates`);

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
