const { Pool } = require('pg')
const { deleteBackgroundImageFile } = require('./file-storage')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const databaseUrl = new URL(process.env.DATABASE_URL)
const schema = databaseUrl.searchParams.get('schema') || 'public'

pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}`)
})

function slugify(value, fallback = 'sticker') {
  if (!value) return fallback
  const base = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base.length > 0 ? base : fallback
}

async function ensureUniqueSlug(baseSlug, excludeId) {
  let attempt = 0
  let candidate = baseSlug

  while (true) {
    const { rows } = await pool.query(
      `
        SELECT 1
        FROM stickers
        WHERE slug = $1
        ${excludeId ? 'AND id <> $2' : ''}
        LIMIT 1
      `,
      excludeId ? [candidate, excludeId] : [candidate],
    )

    if (rows.length === 0) {
      return candidate
    }

    attempt += 1
    candidate = `${baseSlug}-${attempt}`
  }
}

async function ensureUniqueCategorySlug(baseSlug, excludeId) {
  let attempt = 0
  let candidate = baseSlug

  while (true) {
    const { rows } = await pool.query(
      `
        SELECT 1
        FROM sticker_categories
        WHERE slug = $1
        ${excludeId ? 'AND id <> $2' : ''}
        LIMIT 1
      `,
      excludeId ? [candidate, excludeId] : [candidate],
    )

    if (rows.length === 0) {
      return candidate
    }

    attempt += 1
    candidate = `${baseSlug}-${attempt}`
  }
}

function mapCategoryRow(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapStickerRow(row) {
  const normalizeRelativePath = (value) =>
    typeof value === 'string' ? value.replace(/^\/+/, '') : value

  const localFileUrl =
    row.storage_type === 'local' && row.file_path
      ? `/uploads/stickers/${normalizeRelativePath(row.file_path)}`
      : null

  const localThumbnailUrl =
    row.storage_type === 'local' && row.thumbnail_path
      ? `/uploads/stickers/${normalizeRelativePath(row.thumbnail_path)}`
      : null

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: {
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug,
      createdAt: row.category_created_at,
      updatedAt: row.category_updated_at,
    },
    format: row.format,
    storage: {
      type: row.storage_type,
      filePath: row.file_path,
      thumbnailPath: row.thumbnail_path,
      bucket: row.bucket,
      objectKey: row.object_key,
      publicUrl: localFileUrl,
      thumbnailUrl: localThumbnailUrl || localFileUrl,
    },
    tags: row.tags || [],
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function listCategories() {
  const { rows } = await pool.query(
    `
      SELECT id, name, slug, created_at, updated_at
      FROM sticker_categories
      ORDER BY name ASC
    `,
  )
  return rows.map(mapCategoryRow)
}

async function createCategory(name) {
  const slug = await ensureUniqueCategorySlug(slugify(name, 'category'))
  const { rows } = await pool.query(
    `
      INSERT INTO sticker_categories (name, slug)
      VALUES ($1, $2)
      RETURNING id, name, slug, created_at, updated_at
    `,
    [name, slug],
  )
  return mapCategoryRow(rows[0])
}

async function updateCategory(id, name) {
  const slug = await ensureUniqueCategorySlug(slugify(name, 'category'), id)
  const { rows } = await pool.query(
    `
      UPDATE sticker_categories
      SET name = $1, slug = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, slug, created_at, updated_at
    `,
    [name, slug, id],
  )
  return rows.length ? mapCategoryRow(rows[0]) : null
}

async function deleteCategory(id) {
  await pool.query(
    `
      DELETE FROM sticker_categories
      WHERE id = $1
    `,
    [id],
  )
}

async function listStickers({
  page = 1,
  pageSize = 50,
  search,
  categorySlug,
  storageType,
  format,
  sort = 'updated_at',
  order = 'desc',
}) {
  const offset = (page - 1) * pageSize
  const filters = []
  const values = []

  if (search) {
    values.push(`%${search.toLowerCase()}%`)
    filters.push(`(LOWER(s.name) LIKE $${values.length} OR LOWER(s.slug) LIKE $${values.length})`)
  }

  if (categorySlug) {
    values.push(categorySlug)
    filters.push(`LOWER(c.slug) = LOWER($${values.length})`)
  }

  if (storageType) {
    values.push(storageType)
    filters.push(`s.storage_type = $${values.length}`)
  }

  if (format) {
    values.push(format)
    filters.push(`s.format = $${values.length}`)
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  const sortableColumns = new Set(['name', 'created_at', 'updated_at'])
  const orderBy = sortableColumns.has(sort) ? sort : 'updated_at'
  const direction = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  const totalQuery = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM stickers s
      JOIN sticker_categories c ON c.id = s.category_id
      ${whereClause}
    `,
    values,
  )

  values.push(pageSize)
  values.push(offset)

  const { rows } = await pool.query(
    `
      SELECT
        s.*,
        c.name AS category_name,
        c.slug AS category_slug,
        c.created_at AS category_created_at,
        c.updated_at AS category_updated_at
      FROM stickers s
      JOIN sticker_categories c ON c.id = s.category_id
      ${whereClause}
      ORDER BY s.${orderBy} ${direction}
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values,
  )

  return {
    items: rows.map(mapStickerRow),
    total: Number(totalQuery.rows[0].total || 0),
    page,
    pageSize,
  }
}

async function getSticker(identifier) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(identifier)
  const { rows } = await pool.query(
    `
      SELECT
        s.*,
        c.name AS category_name,
        c.slug AS category_slug,
        c.created_at AS category_created_at,
        c.updated_at AS category_updated_at
      FROM stickers s
      JOIN sticker_categories c ON c.id = s.category_id
      WHERE ${isUuid ? 's.id = $1' : 's.slug = $1'}
      LIMIT 1
    `,
    [identifier],
  )
  return rows.length ? mapStickerRow(rows[0]) : null
}

async function createSticker(payload) {
  const {
    name,
    slug: providedSlug,
    categoryId,
    description,
    format,
    storageType = 'local',
    filePath,
    thumbnailPath,
    bucket,
    objectKey,
    tags,
    metadata = {},
  } = payload

  const slug = await ensureUniqueSlug(providedSlug || slugify(name))

  const { rows } = await pool.query(
    `
      INSERT INTO stickers (
        slug,
        name,
        category_id,
        description,
        format,
        storage_type,
        file_path,
        thumbnail_path,
        bucket,
        object_key,
        tags,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6,
        $7, $8,
        $9, $10,
        $11,
        $12::jsonb,
        NOW(), NOW()
      )
      RETURNING *
    `,
    [
      slug,
      name,
      categoryId,
      description || null,
      format || 'vector',
      storageType,
      filePath || null,
      thumbnailPath || null,
      bucket || null,
      objectKey || null,
      Array.isArray(tags) && tags.length > 0 ? tags : null,
      JSON.stringify(metadata),
    ],
  )

  const identifier = rows[0]?.slug || rows[0]?.id
  return identifier ? getSticker(identifier) : null
}

async function updateSticker(identifier, payload) {
  const existing = await getSticker(identifier)
  if (!existing) return null

  const id = existing.id

  const slug =
    payload.slug && payload.slug !== existing.slug
      ? await ensureUniqueSlug(slugify(payload.slug), id)
      : existing.slug

  const name = payload.name || existing.name
  const categoryId = payload.categoryId || existing.category.id
  const storageType = payload.storageType || existing.storage.type

  const metadata = payload.metadata ? { ...existing.metadata, ...payload.metadata } : existing.metadata

  const { rows } = await pool.query(
    `
      UPDATE stickers
      SET
        slug = $1,
        name = $2,
        category_id = $3,
        description = $4,
        format = $5,
        storage_type = $6,
        file_path = $7,
        thumbnail_path = $8,
        bucket = $9,
        object_key = $10,
        tags = $11,
        metadata = $12::jsonb,
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `,
    [
      slug,
      name,
      categoryId,
      payload.description !== undefined ? payload.description : existing.description,
      payload.format || existing.format,
      storageType,
      payload.filePath !== undefined ? payload.filePath : existing.storage.filePath,
      payload.thumbnailPath !== undefined ? payload.thumbnailPath : existing.storage.thumbnailPath,
      payload.bucket !== undefined ? payload.bucket : existing.storage.bucket,
      payload.objectKey !== undefined ? payload.objectKey : existing.storage.objectKey,
      Array.isArray(payload.tags) ? payload.tags : existing.tags,
      JSON.stringify(metadata),
      id,
    ],
  )

  if (!rows.length) return null

  return getSticker(slug)
}

async function deleteSticker(identifier) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(identifier)
  await deleteStickerFileWithLookup(identifier)
  await pool.query(
    `
      DELETE FROM stickers
      WHERE ${isUuid ? 'id = $1' : 'slug = $1'}
    `,
    [identifier],
  )
}

async function deleteStickerFileWithLookup(identifier) {
  const sticker = await getSticker(identifier)
  if (!sticker) {
    return
  }

  if (sticker.storage?.type === 'local' && sticker.storage?.filePath) {
    await deleteBackgroundImageFile({
      storageType: sticker.storage.type,
      filePath: sticker.storage.filePath,
      bucket: sticker.storage.bucket,
      objectKey: sticker.storage.objectKey,
      uploadPath: 'stickers',
    })
  }
}

async function bulkDeleteStickers(idsOrSlugs = []) {
  if (!Array.isArray(idsOrSlugs) || idsOrSlugs.length === 0) {
    return { deleted: 0 }
  }

  for (const identifier of idsOrSlugs) {
    try {
      await deleteStickerFileWithLookup(identifier)
    } catch (error) {
      console.warn(`Failed to delete file for sticker ${identifier}:`, error.message)
    }
  }

  const { rows } = await pool.query(
    `
      DELETE FROM stickers
      WHERE slug = ANY($1::text[])
         OR id::text = ANY($1::text[])
      RETURNING slug
    `,
    [idsOrSlugs],
  )

  return {
    deleted: rows.length,
    slugs: rows.map((row) => row.slug),
  }
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listStickers,
  getSticker: getSticker,
  createSticker,
  updateSticker,
  deleteSticker,
  bulkDeleteStickers,
  slugify,
  pool,
}


