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
  const basePageSettings = row.config?.pageSettings || {};
  let backgroundImage = basePageSettings.backgroundImage || { enabled: false, applyPalette: true, paletteMode: 'palette' };

  // If theme_page_backgrounds exists, build backgroundImage from tpb + bi
  if (row.tpb_theme_id != null && row.bi_slug) {
    backgroundImage = {
      enabled: true,
      templateId: row.bi_slug,
      size: row.tpb_size || 'cover',
      position: row.tpb_position || 'top-left',
      repeat: Boolean(row.tpb_repeat),
      width: row.tpb_width ?? 100,
      opacity: row.tpb_opacity ?? 1,
      applyPalette: Boolean(row.tpb_apply_palette),
      paletteMode: row.tpb_palette_mode || 'palette',
    };
  }

  const pageSettings = { ...basePageSettings, backgroundImage };

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    palette: row.color_palette_id,
    color_palette_id: row.color_palette_id,
    is_default: Boolean(row.is_default),
    pageSettings,
    elementDefaults: row.config?.elementDefaults || {},
    config: { ...row.config, pageSettings },
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
    `SELECT t.id, t.name, t.description, t.color_palette_id, t.config, t.sort_order, t.created_at, t.updated_at,
            tpb.theme_id AS tpb_theme_id, tpb.size AS tpb_size, tpb.position AS tpb_position,
            tpb.repeat AS tpb_repeat, tpb.width AS tpb_width, tpb.opacity AS tpb_opacity,
            tpb.apply_palette AS tpb_apply_palette, tpb.palette_mode AS tpb_palette_mode,
            bi.slug AS bi_slug
     FROM themes t
     LEFT JOIN theme_page_backgrounds tpb ON tpb.theme_id = t.id
     LEFT JOIN background_images bi ON bi.id = tpb.background_image_id
     ORDER BY t.sort_order ASC, t.name ASC`
  );
  return rows.map(mapThemeRow);
}

async function getThemeById(id) {
  const { rows } = await pool.query(
    `SELECT t.id, t.name, t.description, t.color_palette_id, COALESCE(t.is_default, false) AS is_default,
            t.config, t.sort_order, t.created_at, t.updated_at,
            tpb.theme_id AS tpb_theme_id, tpb.size AS tpb_size, tpb.position AS tpb_position,
            tpb.repeat AS tpb_repeat, tpb.width AS tpb_width, tpb.opacity AS tpb_opacity,
            tpb.apply_palette AS tpb_apply_palette, tpb.palette_mode AS tpb_palette_mode,
            bi.slug AS bi_slug
     FROM themes t
     LEFT JOIN theme_page_backgrounds tpb ON tpb.theme_id = t.id
     LEFT JOIN background_images bi ON bi.id = tpb.background_image_id
     WHERE t.id = $1`,
    [id]
  );
  return rows.length ? mapThemeRow(rows[0]) : null;
}

async function createTheme(data) {
  const { name, description, palette_id, color_palette_id, palette, config } = data;
  const paletteId = palette_id ?? color_palette_id ?? palette ?? null;
  const configJson = config || { pageSettings: {}, elementDefaults: {} };

  const { rows } = await pool.query(
    `INSERT INTO themes (name, description, color_palette_id, config, sort_order)
     VALUES ($1, $2, $3, $4::jsonb, 0)
     RETURNING id, name, description, color_palette_id, config, sort_order, created_at, updated_at`,
    [name ?? 'Theme', description ?? null, paletteId, JSON.stringify(configJson)]
  );
  return rows.length ? mapThemeRow(rows[0]) : null;
}

async function updateTheme(id, data) {
  const { name, description, palette_id, color_palette_id, palette, config, pageSettings, elementDefaults } = data;
  const paletteId = palette_id ?? color_palette_id ?? palette ?? null;
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
         color_palette_id = COALESCE($4, color_palette_id),
         config = COALESCE($5::jsonb, config),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, description, color_palette_id, config, sort_order, created_at, updated_at`,
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

async function getThemePageBackground(themeId) {
  const { rows } = await pool.query(
    `SELECT tpb.theme_id, tpb.background_image_id, tpb.size, tpb.position, tpb.repeat,
            tpb.width, tpb.opacity, tpb.apply_palette, tpb.palette_mode,
            bi.id AS background_image_id, bi.slug, bi.name
     FROM theme_page_backgrounds tpb
     JOIN background_images bi ON bi.id = tpb.background_image_id
     WHERE tpb.theme_id = $1`,
    [themeId]
  );
  return rows.length ? rows[0] : null;
}

async function upsertThemePageBackground(themeId, data) {
  const {
    background_image_id,
    size = 'cover',
    position = 'top-left',
    repeat = false,
    width = 100,
    opacity = 1,
    apply_palette = true,
    palette_mode = 'palette',
  } = data;

  if (!background_image_id) {
    throw new Error('background_image_id is required');
  }

  const { rows } = await pool.query(
    `INSERT INTO theme_page_backgrounds (theme_id, background_image_id, size, position, repeat, width, opacity, apply_palette, palette_mode)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (theme_id) DO UPDATE SET
       background_image_id = EXCLUDED.background_image_id,
       size = EXCLUDED.size,
       position = EXCLUDED.position,
       repeat = EXCLUDED.repeat,
       width = EXCLUDED.width,
       opacity = EXCLUDED.opacity,
       apply_palette = EXCLUDED.apply_palette,
       palette_mode = EXCLUDED.palette_mode`,
    [themeId, background_image_id, size, position, repeat, Math.min(200, Math.max(10, width)), opacity, apply_palette, palette_mode]
  );

  await pool.query(`UPDATE themes SET updated_at = NOW() WHERE id = $1`, [themeId]);
  return getThemePageBackground(themeId);
}

async function deleteThemePageBackground(themeId) {
  const result = await pool.query(`DELETE FROM theme_page_backgrounds WHERE theme_id = $1`, [themeId]);
  if (result.rowCount > 0) {
    await pool.query(`UPDATE themes SET updated_at = NOW() WHERE id = $1`, [themeId]);
  }
  return result.rowCount > 0;
}

module.exports = {
  listThemes,
  getThemeById,
  createTheme,
  updateTheme,
  getThemePageBackground,
  upsertThemePageBackground,
  deleteThemePageBackground,
  listColorPalettes,
  getColorPaletteById,
  createColorPalette,
  updateColorPalette,
  listLayouts,
  getLayoutById,
  updateLayout,
};
