/**
 * Background Image Designer Service
 * Handles CRUD operations for designer-created background images
 */

const { Pool } = require('pg');
const { getUploadsSubdir } = require('../utils/uploads-path');
const fs = require('fs/promises');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const databaseUrl = new URL(process.env.DATABASE_URL);
const schema = databaseUrl.searchParams.get('schema') || 'public';

pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}`);
});

function mapDesignerRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    type: 'designer',
    category: row.category_id
      ? {
          id: row.category_id,
          name: row.category_name,
          slug: row.category_slug,
        }
      : null,
    canvas: {
      canvasWidth: row.canvas_width,
      canvasHeight: row.canvas_height,
      structure: row.canvas_structure,
      version: row.version,
      lastGeneratedAt: row.last_generated_at,
    },
    defaults: {
      opacity: row.default_opacity,
    },
    storage: {
      filePath: row.file_path,
      thumbnailPath: row.thumbnail_path,
      publicUrl: row.slug ? `/api/background-images/${encodeURIComponent(row.slug)}/file` : null,
      thumbnailUrl: row.slug ? `/api/background-images/${encodeURIComponent(row.slug)}/thumbnail` : null,
    },
    tags: row.tags || [],
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDesignerAssetRow(row) {
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    width: row.width,
    height: row.height,
    storage: {
      filePath: row.file_path,
      thumbnailPath: row.thumbnail_path,
      publicUrl: `/api/background-images/designer/assets/${row.file_path.replace(/^\/+/, '')}`,
      thumbnailUrl: `/api/background-images/designer/assets/${(row.thumbnail_path || row.file_path).replace(/^\/+/, '')}`,
    },
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function extractCanvasAssetIds(canvasStructure) {
  if (!canvasStructure || !Array.isArray(canvasStructure.items)) {
    return [];
  }

  const ids = new Set();
  for (const item of canvasStructure.items) {
    if (item?.type === 'image' && isUuid(item.assetId)) {
      ids.add(item.assetId);
    }
  }

  return Array.from(ids);
}

async function syncDesignAssetLinks(client, designId, canvasStructure) {
  const assetIds = extractCanvasAssetIds(canvasStructure);

  await client.query(
    `DELETE FROM background_image_design_asset_links WHERE design_id = $1`,
    [designId],
  );

  if (assetIds.length === 0) {
    return;
  }

  const { rows: existingAssets } = await client.query(
    `SELECT id FROM background_image_designer_image_assets WHERE id = ANY($1::uuid[])`,
    [assetIds],
  );

  if (!existingAssets.length) {
    return;
  }

  for (const row of existingAssets) {
    await client.query(
      `
        INSERT INTO background_image_design_asset_links (design_id, asset_id)
        VALUES ($1, $2)
        ON CONFLICT (design_id, asset_id) DO NOTHING
      `,
      [designId, row.id],
    );
  }
}

async function listDesignerImages({
  page = 1,
  pageSize = 50,
  search,
  categorySlug,
  sort = 'updated_at',
  order = 'desc',
} = {}) {
  const offset = (page - 1) * pageSize;
  const filters = [`bi.type = 'designer'`];
  const values = [];

  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    filters.push(`(LOWER(bi.name) LIKE $${values.length} OR LOWER(bi.slug) LIKE $${values.length})`);
  }

  if (categorySlug) {
    values.push(categorySlug);
    filters.push(`LOWER(bic.slug) = LOWER($${values.length})`);
  }

  const whereClause = `WHERE ${filters.join(' AND ')}`;
  const sortableColumns = new Set(['name', 'created_at', 'updated_at']);
  const orderBy = sortableColumns.has(sort) ? sort : 'updated_at';
  const direction = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const totalQuery = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM background_images bi
      INNER JOIN background_image_designs bid ON bi.id = bid.id
      LEFT JOIN background_image_categories bic ON bi.category_id = bic.id
      ${whereClause}
    `,
    values,
  );

  values.push(pageSize);
  values.push(offset);

  const { rows } = await pool.query(
    `
      SELECT
        bi.*,
        bid.*,
        bic.id as category_id,
        bic.name as category_name,
        bic.slug as category_slug
      FROM background_images bi
      INNER JOIN background_image_designs bid ON bi.id = bid.id
      LEFT JOIN background_image_categories bic ON bi.category_id = bic.id
      ${whereClause}
      ORDER BY bi.${orderBy} ${direction}
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values,
  );

  return {
    items: rows.map(mapDesignerRow),
    total: Number(totalQuery.rows[0]?.total || 0),
    page,
    pageSize,
  };
}

/**
 * Create a new designer background image
 * @param {Object} data - Designer image data
 * @returns {Promise<Object>} Created designer image
 */
async function createDesignerImage(data) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Insert into background_images
    const imageResult = await client.query(
      `
        INSERT INTO background_images (
          slug, name, category_id, description, type,
          default_opacity, tags, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        data.slug,
        data.name,
        data.categoryId,
        data.description || null,
        'designer',
        data.defaultOpacity || 1,
        data.tags || [],
        data.metadata || {},
      ]
    );

    const backgroundImage = imageResult.rows[0];

    // Insert into background_image_designs
    const initialCanvasStructure = data.canvasStructure || { backgroundColor: '#ffffff', backgroundOpacity: 1, items: [] };

    const designResult = await client.query(
      `
        INSERT INTO background_image_designs (
          id, canvas_structure, canvas_width, canvas_height, version
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        backgroundImage.id,
        JSON.stringify(initialCanvasStructure),
        data.canvasWidth || 1200,
        data.canvasHeight || 1600,
        1,
      ]
    );

    await syncDesignAssetLinks(client, backgroundImage.id, initialCanvasStructure);

    await client.query('COMMIT');

    return {
      ...backgroundImage,
      canvas: designResult.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get designer image by ID
 * @param {string} id - Background image ID (UUID)
 * @returns {Promise<Object|null>} Designer image or null
 */
async function getDesignerImage(id) {
  const result = await pool.query(
    `
      SELECT 
        bi.*, 
        bid.*, 
        bic.id as category_id,
        bic.name as category_name,
        bic.slug as category_slug
      FROM background_images bi
      INNER JOIN background_image_designs bid ON bi.id = bid.id
      LEFT JOIN background_image_categories bic ON bi.category_id = bic.id
      WHERE bi.id = $1 AND bi.type = 'designer'
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapDesignerRow(result.rows[0]);
}

async function getDesignerImageByIdentifier(identifier) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(String(identifier));
  const isNumericId = /^\d+$/.test(String(identifier));
  const value = isNumericId ? parseInt(String(identifier), 10) : identifier;
  const whereClause = isUuid || isNumericId ? 'bi.id = $1' : 'bi.slug = $1';

  const { rows } = await pool.query(
    `
      SELECT
        bi.*,
        bid.*,
        bic.id as category_id,
        bic.name as category_name,
        bic.slug as category_slug
      FROM background_images bi
      INNER JOIN background_image_designs bid ON bi.id = bid.id
      LEFT JOIN background_image_categories bic ON bi.category_id = bic.id
      WHERE ${whereClause} AND bi.type = 'designer'
      LIMIT 1
    `,
    [value],
  );

  return rows.length ? mapDesignerRow(rows[0]) : null;
}

/**
 * Update designer image
 * @param {string} id - Background image ID
 * @param {Object} data - Update data
 * @returns {Promise<Object|null>} Updated designer image or null
 */
async function updateDesignerImage(id, data) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Update background_images
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(data.name);
    }
    if (data.slug !== undefined) {
      updateFields.push(`slug = $${paramIndex++}`);
      updateValues.push(data.slug);
    }
    if (data.categoryId !== undefined) {
      updateFields.push(`category_id = $${paramIndex++}`);
      updateValues.push(data.categoryId);
    }
    if (data.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(data.description);
    }
    if (data.defaultOpacity !== undefined) {
      updateFields.push(`default_opacity = $${paramIndex++}`);
      updateValues.push(data.defaultOpacity);
    }
    if (data.tags !== undefined) {
      updateFields.push(`tags = $${paramIndex++}`);
      updateValues.push(data.tags);
    }
    if (data.metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex++}`);
      updateValues.push(JSON.stringify(data.metadata));
    }
    if (data.filePath !== undefined) {
      updateFields.push(`file_path = $${paramIndex++}`);
      updateValues.push(data.filePath);
    }
    if (data.thumbnailPath !== undefined) {
      updateFields.push(`thumbnail_path = $${paramIndex++}`);
      updateValues.push(data.thumbnailPath);
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    if (updateFields.length > 1) { // More than just updated_at
      const query = `
        UPDATE background_images
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND type = 'designer'
        RETURNING *
      `;
      await client.query(query, updateValues);
    }

    // Update background_image_designs if canvas structure changed
    if (data.canvasStructure !== undefined) {
      await client.query(
        `
          UPDATE background_image_designs
          SET canvas_structure = $1::jsonb,
              version = version + 1
          WHERE id = $2
        `,
        [JSON.stringify(data.canvasStructure), id]
      );

      await syncDesignAssetLinks(client, id, data.canvasStructure);
    }

    await client.query('COMMIT');

    // Fetch updated image
    return await getDesignerImage(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete designer image
 * @param {string} id - Background image ID
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteDesignerImage(id) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get file paths before deletion
    const result = await client.query(
      'SELECT file_path, thumbnail_path FROM background_images WHERE id = $1 AND type = \'designer\'',
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    const { file_path, thumbnail_path } = result.rows[0];

    // Delete from database (cascades to background_image_designs)
    await client.query(
      'DELETE FROM background_images WHERE id = $1 AND type = \'designer\'',
      [id]
    );

    await client.query('COMMIT');

    // Delete files (best effort, don't fail if files don't exist)
    if (file_path) {
      try {
        const fullPath = path.join(getUploadsSubdir(''), file_path);
        await fs.unlink(fullPath);
      } catch (err) {
        console.warn('Could not delete file:', file_path, err.message);
      }
    }

    if (thumbnail_path) {
      try {
        const fullPath = path.join(getUploadsSubdir(''), thumbnail_path);
        await fs.unlink(fullPath);
      } catch (err) {
        console.warn('Could not delete thumbnail:', thumbnail_path, err.message);
      }
    }

    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all designer assets for a specific designer image
 * Extracts asset paths from canvas structure
 * @param {string} id - Designer image ID
 * @returns {Promise<string[]>} Array of asset paths
 */
async function getDesignerAssets(id) {
  const designerImage = await getDesignerImage(id);
  
  if (!designerImage || !designerImage.canvas.structure.items) {
    return [];
  }

  const assets = [];
  
  for (const item of designerImage.canvas.structure.items) {
    if (item.type === 'image' && item.uploadPath) {
      assets.push(item.uploadPath);
    }
  }

  return assets;
}

/**
 * Mark designer image as generated
 * @param {string} id - Designer image ID
 * @param {string} filePath - Generated file path
 * @param {string} thumbnailPath - Generated thumbnail path
 */
async function markAsGenerated(id, filePath, thumbnailPath) {
  await pool.query(
    `
      UPDATE background_images
      SET file_path = $1, thumbnail_path = $2, updated_at = NOW()
      WHERE id = $3
    `,
    [filePath, thumbnailPath, id]
  );

  await pool.query(
    `
      UPDATE background_image_designs
      SET last_generated_at = NOW()
      WHERE id = $1
    `,
    [id]
  );
}

async function listDesignerImageAssets({ page = 1, pageSize = 100, search } = {}) {
  const offset = (page - 1) * pageSize;
  const values = [];
  let whereClause = '';

  if (search) {
    values.push(`%${String(search).toLowerCase()}%`);
    whereClause = `WHERE LOWER(file_name) LIKE $${values.length}`;
  }

  const totalQuery = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM background_image_designer_image_assets
      ${whereClause}
    `,
    values,
  );

  values.push(pageSize);
  values.push(offset);

  const { rows } = await pool.query(
    `
      SELECT *
      FROM background_image_designer_image_assets
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values,
  );

  return {
    items: rows.map(mapDesignerAssetRow),
    total: Number(totalQuery.rows[0]?.total || 0),
    page,
    pageSize,
  };
}

async function createDesignerImageAsset({
  fileName,
  filePath,
  thumbnailPath,
  mimeType,
  fileSizeBytes,
  width,
  height,
  uploadedBy,
}) {
  const { rows } = await pool.query(
    `
      INSERT INTO background_image_designer_image_assets (
        file_name,
        file_path,
        thumbnail_path,
        mime_type,
        file_size_bytes,
        width,
        height,
        uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [fileName, filePath, thumbnailPath, mimeType, fileSizeBytes ?? null, width ?? null, height ?? null, uploadedBy ?? null],
  );

  return mapDesignerAssetRow(rows[0]);
}

async function deleteDesignerImageAsset(assetId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT file_path, thumbnail_path FROM background_image_designer_image_assets WHERE id = $1 LIMIT 1`,
      [assetId],
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return false;
    }

    await client.query(
      `DELETE FROM background_image_designer_image_assets WHERE id = $1`,
      [assetId],
    );

    await client.query('COMMIT');

    const filePaths = [rows[0].file_path, rows[0].thumbnail_path].filter(Boolean);
    for (const relPath of filePaths) {
      const absolutePath = path.join(getUploadsSubdir('background-images'), relPath);
      try {
        await fs.unlink(absolutePath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.warn('Could not delete designer asset file:', relPath, err.message);
        }
      }
    }

    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  listDesignerImages,
  createDesignerImage,
  getDesignerImage,
  getDesignerImageByIdentifier,
  updateDesignerImage,
  deleteDesignerImage,
  getDesignerAssets,
  markAsGenerated,
  listDesignerImageAssets,
  createDesignerImageAsset,
  deleteDesignerImageAsset,
};
