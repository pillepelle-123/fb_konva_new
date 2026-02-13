const fs = require('fs/promises')
const path = require('path')
const archiver = require('archiver')
const AdmZip = require('adm-zip')
const { Pool } = require('pg')
const { deleteBackgroundImageFile, saveBackgroundImageAtPath } = require('./file-storage')
const { getUploadsSubdir } = require('../utils/uploads-path')

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
  const slug = row.slug || ''
  const localFileUrl =
    row.file_path && slug
      ? `/api/stickers/${encodeURIComponent(slug)}/file`
      : null

  const localThumbnailUrl = slug
    ? `/api/stickers/${encodeURIComponent(slug)}/thumbnail`
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
      filePath: row.file_path,
      thumbnailPath: row.thumbnail_path,
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
    filePath,
    thumbnailPath,
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
        file_path,
        thumbnail_path,
        tags,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8,
        $9::jsonb,
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
      filePath || null,
      thumbnailPath || null,
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
        file_path = $6,
        thumbnail_path = $7,
        tags = $8,
        metadata = $9::jsonb,
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `,
    [
      slug,
      name,
      categoryId,
      payload.description !== undefined ? payload.description : existing.description,
      payload.format || existing.format,
      payload.filePath !== undefined ? payload.filePath : existing.storage.filePath,
      payload.thumbnailPath !== undefined ? payload.thumbnailPath : existing.storage.thumbnailPath,
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

  if (sticker.storage?.filePath) {
    await deleteBackgroundImageFile({
      filePath: sticker.storage.filePath,
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

async function exportStickers(slugs, res) {
  const uploadsDir = getUploadsSubdir('stickers')
  const items = []
  const stickers = []

  for (const slug of slugs) {
    const sticker = await getSticker(slug)
    if (!sticker || !sticker.storage?.filePath) continue
    stickers.push(sticker)
    const relPath = sticker.storage.filePath.replace(/^\/+/, '')
    const fileRef = `files/${relPath}`
    items.push({
      slug: sticker.slug,
      name: sticker.name,
      description: sticker.description,
      category: { name: sticker.category.name, slug: sticker.category.slug },
      format: sticker.format,
      fileRef,
      thumbnailRef: sticker.storage.thumbnailPath
        ? `files/${sticker.storage.thumbnailPath.replace(/^\/+/, '')}`
        : fileRef,
      tags: sticker.tags,
      metadata: sticker.metadata,
    })
  }

  const manifest = {
    version: 1,
    type: 'stickers',
    exportedAt: new Date().toISOString(),
    items,
  }

  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.pipe(res)

  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })

  for (const sticker of stickers) {
    const relPath = sticker.storage.filePath.replace(/^\/+/, '')
    const fullPath = path.join(uploadsDir, relPath)
    try {
      const buffer = await fs.readFile(fullPath)
      const zipPath = `files/${relPath}`
      archive.append(buffer, { name: zipPath })
      if (
        sticker.storage.thumbnailPath &&
        sticker.storage.thumbnailPath !== sticker.storage.filePath
      ) {
        const thumbRelPath = sticker.storage.thumbnailPath.replace(/^\/+/, '')
        const thumbFullPath = path.join(uploadsDir, thumbRelPath)
        try {
          const thumbBuffer = await fs.readFile(thumbFullPath)
          archive.append(thumbBuffer, { name: `files/${thumbRelPath}` })
        } catch {
          // Thumbnail optional
        }
      }
    } catch (err) {
      console.warn(`Export: Could not read file for ${sticker.slug}:`, err.message)
    }
  }

  await archive.finalize()
}

async function getOrCreateStickerCategoryBySlug(name, slug) {
  const { rows } = await pool.query(
    `SELECT id FROM sticker_categories WHERE slug = $1 LIMIT 1`,
    [slug],
  )
  if (rows.length > 0) return rows[0].id
  const category = await createCategory(name || slug)
  return category.id
}

async function stickerSlugExists(slug) {
  const { rows } = await pool.query(
    `SELECT 1 FROM stickers WHERE slug = $1 LIMIT 1`,
    [slug],
  )
  return rows.length > 0
}

async function getExistingStickerNameBySlug(slug) {
  const { rows } = await pool.query(
    `SELECT name FROM stickers WHERE slug = $1 LIMIT 1`,
    [slug],
  )
  return rows.length ? rows[0].name : null
}

async function importStickers(zipBuffer, resolution = {}) {
  const zip = new AdmZip(zipBuffer)
  const manifestEntry = zip.getEntry('manifest.json')
  if (!manifestEntry) {
    throw new Error('Invalid export: manifest.json not found')
  }
  const manifest = JSON.parse(manifestEntry.getData().toString('utf8'))
  if (manifest.type !== 'stickers' || !Array.isArray(manifest.items)) {
    throw new Error('Invalid export: invalid manifest type or items')
  }

  const conflicts = []
  for (const item of manifest.items) {
    const exists = await stickerSlugExists(item.slug)
    if (exists) {
      const existingName = await getExistingStickerNameBySlug(item.slug)
      conflicts.push({ slug: item.slug, name: item.name, existingName })
    }
  }

  if (conflicts.length > 0 && Object.keys(resolution).length === 0) {
    return { conflicts, totalItems: manifest.items.length }
  }

  const imported = []

  for (const item of manifest.items) {
    let effectiveSlug = item.slug
    let action = 'create'
    if (resolution[item.slug] === 'skip') continue
    if (resolution[item.slug] === 'overwrite') {
      action = 'overwrite'
    } else if (typeof resolution[item.slug] === 'string' && resolution[item.slug] !== 'overwrite') {
      effectiveSlug = resolution[item.slug]
    } else if (await stickerSlugExists(item.slug)) {
      continue
    }

    if (action === 'overwrite') {
      await deleteStickerFileWithLookup(item.slug)
    }

    const fileRef = item.fileRef || `files/${item.category.slug}/${item.slug}${item.format === 'pixel' ? '.png' : '.svg'}`
    const relPath = fileRef.replace(/^files\//, '')
    const fileEntry = zip.getEntry(fileRef)
    if (!fileEntry) {
      console.warn(`Import: File not found in ZIP: ${fileRef}`)
      continue
    }
    const buffer = fileEntry.getData()
    const savedPath = await saveBackgroundImageAtPath({
      relativePath: relPath,
      buffer,
      uploadPath: 'stickers',
    })
    const thumbnailRef = item.thumbnailRef || fileRef
    const thumbRelPath = thumbnailRef.replace(/^files\//, '')
    let thumbnailPath = savedPath
    if (thumbRelPath !== relPath) {
      const thumbEntry = zip.getEntry(thumbnailRef)
      if (thumbEntry) {
        const thumbBuffer = thumbEntry.getData()
        thumbnailPath = await saveBackgroundImageAtPath({
          relativePath: thumbRelPath,
          buffer: thumbBuffer,
          uploadPath: 'stickers',
        })
      }
    }

    const categoryId = await getOrCreateStickerCategoryBySlug(item.category?.name, item.category?.slug || 'uncategorized')
    const record = await createSticker({
      name: item.name,
      slug: effectiveSlug,
      categoryId,
      description: item.description ?? null,
      format: item.format || 'vector',
      filePath: savedPath,
      thumbnailPath,
      tags: item.tags || [],
      metadata: item.metadata || {},
    })
    if (record) imported.push(record)
  }

  return { imported, totalItems: manifest.items.length }
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
  exportStickers,
  importStickers,
  slugify,
  pool,
}


