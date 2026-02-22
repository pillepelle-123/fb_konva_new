const { Pool } = require('pg');

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

pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}`);
});

function mapThemeRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    palette: row.palette_id,
    palette_id: row.palette_id,
    pageSettings: row.config?.pageSettings || {},
    elementDefaults: row.config?.elementDefaults || {},
    config: row.config || {},
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapPaletteRow(row) {
  return {
    id: row.id,
    name: row.name,
    colors: row.colors || {},
    parts: row.parts || {},
    contrast: row.contrast,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapLayoutRow(row) {
  const meta = row.meta || {};
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    thumbnail: row.thumbnail,
    textboxes: row.textboxes || [],
    elements: row.elements || [],
    meta: { qnaInlineCount: meta.qnaInlineCount, imageCount: meta.imageCount, columns: meta.columns },
    columns: meta.columns,
    constraints: meta.constraints,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listThemes() {
  const { rows } = await pool.query(
    `SELECT id, name, description, palette_id, config, sort_order, created_at, updated_at
     FROM themes ORDER BY sort_order ASC, name ASC`
  );
  return rows.map(mapThemeRow);
}

async function getThemeById(id) {
  const { rows } = await pool.query(
    `SELECT id, name, description, palette_id, config, sort_order, created_at, updated_at
     FROM themes WHERE id = $1`,
    [id]
  );
  return rows.length ? mapThemeRow(rows[0]) : null;
}

async function createTheme(data) {
  const { name, description, palette_id, palette, config } = data;
  const paletteId = palette_id ?? palette ?? null;
  const configJson = config || { pageSettings: {}, elementDefaults: {} };

  const { rows } = await pool.query(
    `INSERT INTO themes (name, description, palette_id, config, sort_order)
     VALUES ($1, $2, $3, $4::jsonb, 0)
     RETURNING id, name, description, palette_id, config, sort_order, created_at, updated_at`,
    [name ?? 'Theme', description ?? null, paletteId, JSON.stringify(configJson)]
  );
  return rows.length ? mapThemeRow(rows[0]) : null;
}

async function updateTheme(id, data) {
  const { name, description, palette_id, palette, config, pageSettings, elementDefaults } = data;
  const paletteId = palette_id ?? palette ?? null;
  let configJson = config;
  if (configJson === undefined && (pageSettings !== undefined || elementDefaults !== undefined)) {
    const existing = await getThemeById(id);
    const existingConfig = existing?.config || {};
    configJson = {
      pageSettings: pageSettings ?? existingConfig.pageSettings ?? {},
      elementDefaults: elementDefaults ?? existingConfig.elementDefaults ?? {},
    };
  }
  if (configJson === undefined) {
    const existing = await getThemeById(id);
    configJson = existing?.config || {};
  }

  const { rows } = await pool.query(
    `UPDATE themes
     SET name = COALESCE($2, name),
         description = COALESCE($3, description),
         palette_id = COALESCE($4, palette_id),
         config = COALESCE($5::jsonb, config),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, description, palette_id, config, sort_order, created_at, updated_at`,
    [id, name ?? null, description ?? null, paletteId, JSON.stringify(configJson)]
  );
  return rows.length ? mapThemeRow(rows[0]) : null;
}

async function listColorPalettes() {
  const { rows } = await pool.query(
    `SELECT id, name, colors, parts, contrast, sort_order, created_at, updated_at
     FROM color_palettes ORDER BY sort_order ASC, name ASC`
  );
  return rows.map(mapPaletteRow);
}

async function getColorPaletteById(id) {
  const { rows } = await pool.query(
    `SELECT id, name, colors, parts, contrast, sort_order, created_at, updated_at
     FROM color_palettes WHERE id = $1`,
    [id]
  );
  return rows.length ? mapPaletteRow(rows[0]) : null;
}

async function createColorPalette(data) {
  const { name, colors, parts, contrast } = data;
  const colorsJson = colors || {};
  const partsJson = parts || {};

  const { rows } = await pool.query(
    `INSERT INTO color_palettes (name, colors, parts, contrast, sort_order)
     VALUES ($1, $2::jsonb, $3::jsonb, $4, 0)
     RETURNING id, name, colors, parts, contrast, sort_order, created_at, updated_at`,
    [name ?? 'Palette', JSON.stringify(colorsJson), JSON.stringify(partsJson), contrast ?? 'AA']
  );
  return rows.length ? mapPaletteRow(rows[0]) : null;
}

async function updateColorPalette(id, data) {
  const { name, colors, parts, contrast } = data;
  const { rows } = await pool.query(
    `UPDATE color_palettes
     SET name = COALESCE($2, name),
         colors = COALESCE($3::jsonb, colors),
         parts = COALESCE($4::jsonb, parts),
         contrast = COALESCE($5, contrast),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, colors, parts, contrast, sort_order, created_at, updated_at`,
    [id, name ?? null, colors ? JSON.stringify(colors) : null, parts ? JSON.stringify(parts) : null, contrast ?? null]
  );
  return rows.length ? mapPaletteRow(rows[0]) : null;
}

async function listLayouts(category) {
  let query = `SELECT id, name, category, thumbnail, textboxes, elements, meta, sort_order, created_at, updated_at
               FROM layouts`;
  const values = [];
  if (category && category !== 'all') {
    values.push(category);
    query += ` WHERE category = $1`;
  }
  query += ` ORDER BY sort_order ASC, name ASC`;
  const { rows } = await pool.query(query, values);
  return rows.map(mapLayoutRow);
}

async function getLayoutById(id) {
  const { rows } = await pool.query(
    `SELECT id, name, category, thumbnail, textboxes, elements, meta, sort_order, created_at, updated_at
     FROM layouts WHERE id = $1`,
    [id]
  );
  return rows.length ? mapLayoutRow(rows[0]) : null;
}

async function updateLayout(id, data) {
  const { name, category, thumbnail, textboxes, elements, meta } = data;
  const { rows } = await pool.query(
    `UPDATE layouts
     SET name = COALESCE($2, name),
         category = COALESCE($3, category),
         thumbnail = COALESCE($4, thumbnail),
         textboxes = COALESCE($5::jsonb, textboxes),
         elements = COALESCE($6::jsonb, elements),
         meta = COALESCE($7::jsonb, meta),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, category, thumbnail, textboxes, elements, meta, sort_order, created_at, updated_at`,
    [
      id,
      name ?? null,
      category ?? null,
      thumbnail ?? null,
      textboxes ? JSON.stringify(textboxes) : null,
      elements ? JSON.stringify(elements) : null,
      meta ? JSON.stringify(meta) : null,
    ]
  );
  return rows.length ? mapLayoutRow(rows[0]) : null;
}

module.exports = {
  listThemes,
  getThemeById,
  createTheme,
  updateTheme,
  listColorPalettes,
  getColorPaletteById,
  createColorPalette,
  updateColorPalette,
  listLayouts,
  getLayoutById,
  updateLayout,
};
