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

function slugify(value, fallback = 'background-image') {
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
        FROM background_images
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
        FROM background_image_categories
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

function mapImageRow(row) {
  const slug = row.slug || ''
  const localFileUrl =
    row.file_path && slug
      ? `/api/background-images/${encodeURIComponent(slug)}/file`
      : null

  const localThumbnailUrl = slug
    ? `/api/background-images/${encodeURIComponent(slug)}/thumbnail`
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
    defaults: {
      size: row.default_size,
      position: row.default_position,
      repeat: row.default_repeat,
      width: row.default_width,
      opacity: row.default_opacity,
      backgroundColor: row.background_color || null,
    },
    paletteSlots: row.palette_slots,
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
      FROM background_image_categories
      ORDER BY name ASC
    `,
  )
  return rows.map(mapCategoryRow)
}

async function createCategory(name) {
  const slug = await ensureUniqueCategorySlug(slugify(name, 'category'))
  const { rows } = await pool.query(
    `
      INSERT INTO background_image_categories (name, slug)
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
      UPDATE background_image_categories
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
      DELETE FROM background_image_categories
      WHERE id = $1
    `,
    [id],
  )
}

async function listBackgroundImages({
  page = 1,
  pageSize = 50,
  search,
  categorySlug,
  sort = 'updated_at',
  order = 'desc',
}) {
  const offset = (page - 1) * pageSize
  const filters = []
  const values = []

  if (search) {
    values.push(`%${search.toLowerCase()}%`)
    filters.push(`(LOWER(bi.name) LIKE $${values.length} OR LOWER(bi.slug) LIKE $${values.length})`)
  }

  if (categorySlug) {
    values.push(categorySlug)
    filters.push(`LOWER(c.slug) = LOWER($${values.length})`)
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  const sortableColumns = new Set(['name', 'created_at', 'updated_at'])
  const orderBy = sortableColumns.has(sort) ? sort : 'updated_at'
  const direction = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

  const totalQuery = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM background_images bi
      JOIN background_image_categories c ON c.id = bi.category_id
      ${whereClause}
    `,
    values,
  )

  values.push(pageSize)
  values.push(offset)

  const { rows } = await pool.query(
    `
      SELECT
        bi.*,
        c.name AS category_name,
        c.slug AS category_slug,
        c.created_at AS category_created_at,
        c.updated_at AS category_updated_at
      FROM background_images bi
      JOIN background_image_categories c ON c.id = bi.category_id
      ${whereClause}
      ORDER BY bi.${orderBy} ${direction}
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values,
  )

  return {
    items: rows.map(mapImageRow),
    total: Number(totalQuery.rows[0].total || 0),
    page,
    pageSize,
  }
}

async function getBackgroundImage(identifier) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(identifier)
  const { rows } = await pool.query(
    `
      SELECT
        bi.*,
        c.name AS category_name,
        c.slug AS category_slug,
        c.created_at AS category_created_at,
        c.updated_at AS category_updated_at
      FROM background_images bi
      JOIN background_image_categories c ON c.id = bi.category_id
      WHERE ${isUuid ? 'bi.id = $1' : 'bi.slug = $1'}
      LIMIT 1
    `,
    [identifier],
  )
  return rows.length ? mapImageRow(rows[0]) : null
}

async function createBackgroundImage(payload) {
  const {
    name,
    slug: providedSlug,
    categoryId,
    description,
    format,
    filePath,
    thumbnailPath,
    defaults = {},
    paletteSlots,
    tags,
    metadata = {},
  } = payload

  const slug = await ensureUniqueSlug(providedSlug || slugify(name))

  const { rows } = await pool.query(
    `
      INSERT INTO background_images (
        slug,
        name,
        category_id,
        description,
        format,
        file_path,
        thumbnail_path,
        default_size,
        default_position,
        default_repeat,
        default_width,
        default_opacity,
        background_color,
        palette_slots,
        tags,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8, $9, $10, $11, $12,
        $13::jsonb,
        $14, $15,
        $16::jsonb,
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
      defaults.size || null,
      defaults.position || null,
      defaults.repeat || null,
      typeof defaults.width === 'number' ? defaults.width : null,
      typeof defaults.opacity === 'number' ? defaults.opacity : 1,
      defaults.backgroundColor ? JSON.stringify(defaults.backgroundColor) : null,
      paletteSlots || null,
      Array.isArray(tags) && tags.length > 0 ? tags : null,
      JSON.stringify(metadata),
    ],
  )

  const identifier = rows[0]?.slug || rows[0]?.id
  return identifier ? getBackgroundImage(identifier) : null
}

async function updateBackgroundImage(identifier, payload) {
  const existing = await getBackgroundImage(identifier)
  if (!existing) return null

  const id = existing.id

  const slug =
    payload.slug && payload.slug !== existing.slug
      ? await ensureUniqueSlug(slugify(payload.slug), id)
      : existing.slug

  const name = payload.name || existing.name
  const categoryId = payload.categoryId || existing.category.id

  const defaults = {
    size: payload.defaults?.size ?? existing.defaults.size,
    position: payload.defaults?.position ?? existing.defaults.position,
    repeat: payload.defaults?.repeat ?? existing.defaults.repeat,
    width:
      payload.defaults && Object.prototype.hasOwnProperty.call(payload.defaults, 'width')
        ? payload.defaults.width
        : existing.defaults.width,
    opacity:
      payload.defaults && Object.prototype.hasOwnProperty.call(payload.defaults, 'opacity')
        ? payload.defaults.opacity
        : existing.defaults.opacity,
    backgroundColor:
      payload.defaults && Object.prototype.hasOwnProperty.call(payload.defaults, 'backgroundColor')
        ? payload.defaults.backgroundColor
        : existing.defaults.backgroundColor,
  }

  const metadata = payload.metadata ? { ...existing.metadata, ...payload.metadata } : existing.metadata

  const { rows } = await pool.query(
    `
      UPDATE background_images
      SET
        slug = $1,
        name = $2,
        category_id = $3,
        description = $4,
        format = $5,
        file_path = $6,
        thumbnail_path = $7,
        default_size = $8,
        default_position = $9,
        default_repeat = $10,
        default_width = $11,
        default_opacity = $12,
        background_color = $13::jsonb,
        palette_slots = $14,
        tags = $15,
        metadata = $16::jsonb,
        updated_at = NOW()
      WHERE id = $17
      RETURNING *
    `,
    [
      slug,
      name,
      categoryId,
      payload.description || existing.description,
      payload.format || existing.format,
      payload.filePath !== undefined ? payload.filePath : existing.storage.filePath,
      payload.thumbnailPath !== undefined ? payload.thumbnailPath : existing.storage.thumbnailPath,
      defaults.size,
      defaults.position,
      defaults.repeat,
      typeof defaults.width === 'number' ? defaults.width : null,
      typeof defaults.opacity === 'number' ? defaults.opacity : 1,
      defaults.backgroundColor ? JSON.stringify(defaults.backgroundColor) : null,
      payload.paletteSlots !== undefined ? payload.paletteSlots : existing.paletteSlots,
      Array.isArray(payload.tags) ? payload.tags : existing.tags,
      JSON.stringify(metadata),
      id,
    ],
  )

  if (!rows.length) return null

  return getBackgroundImage(slug)
}

async function deleteBackgroundImage(identifier) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(identifier)
  await deleteBackgroundImageFileWithLookup(identifier)
  await pool.query(
    `
      DELETE FROM background_images
      WHERE ${isUuid ? 'id = $1' : 'slug = $1'}
    `,
    [identifier],
  )
}

async function deleteBackgroundImageFileWithLookup(identifier) {
  const image = await getBackgroundImage(identifier)
  if (!image) {
    return
  }

  if (image.storage?.filePath) {
    await deleteBackgroundImageFile({
      filePath: image.storage.filePath,
      uploadPath: 'background-images',
    })
  }
}

async function bulkDeleteBackgroundImages(idsOrSlugs = []) {
  if (!Array.isArray(idsOrSlugs) || idsOrSlugs.length === 0) {
    return { deleted: 0 }
  }

  for (const identifier of idsOrSlugs) {
    try {
      await deleteBackgroundImageFileWithLookup(identifier)
    } catch (error) {
      console.warn(`Failed to delete file for background image ${identifier}:`, error.message)
    }
  }

  const { rows } = await pool.query(
    `
      DELETE FROM background_images
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

async function exportBackgroundImages(slugs, res) {
  const uploadsDir = getUploadsSubdir('background-images')
  const items = []
  const images = []

  for (const slug of slugs) {
    const image = await getBackgroundImage(slug)
    if (!image || !image.storage?.filePath) continue
    images.push(image)
    const relPath = image.storage.filePath.replace(/^\/+/, '')
    const fileRef = `files/${relPath}`
    items.push({
      slug: image.slug,
      name: image.name,
      description: image.description,
      category: { name: image.category.name, slug: image.category.slug },
      format: image.format,
      fileRef,
      thumbnailRef: image.storage.thumbnailPath
        ? `files/${image.storage.thumbnailPath.replace(/^\/+/, '')}`
        : fileRef,
      defaults: image.defaults,
      paletteSlots: image.paletteSlots,
      tags: image.tags,
      metadata: image.metadata,
    })
  }

  const manifest = {
    version: 1,
    type: 'background-images',
    exportedAt: new Date().toISOString(),
    items,
  }

  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.pipe(res)

  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })

  for (const image of images) {
    const relPath = image.storage.filePath.replace(/^\/+/, '')
    const fullPath = path.join(uploadsDir, relPath)
    try {
      const buffer = await fs.readFile(fullPath)
      const zipPath = `files/${relPath}`
      archive.append(buffer, { name: zipPath })
      if (
        image.storage.thumbnailPath &&
        image.storage.thumbnailPath !== image.storage.filePath
      ) {
        const thumbRelPath = image.storage.thumbnailPath.replace(/^\/+/, '')
        const thumbFullPath = path.join(uploadsDir, thumbRelPath)
        try {
          const thumbBuffer = await fs.readFile(thumbFullPath)
          archive.append(thumbBuffer, { name: `files/${thumbRelPath}` })
        } catch {
          // Thumbnail optional, use main file as fallback
        }
      }
    } catch (err) {
      console.warn(`Export: Could not read file for ${image.slug}:`, err.message)
    }
  }

  await archive.finalize()
}

async function getOrCreateCategoryBySlug(name, slug) {
  const { rows } = await pool.query(
    `SELECT id FROM background_image_categories WHERE slug = $1 LIMIT 1`,
    [slug],
  )
  if (rows.length > 0) return rows[0].id
  const category = await createCategory(name || slug)
  return category.id
}

async function slugExists(slug) {
  const { rows } = await pool.query(
    `SELECT 1 FROM background_images WHERE slug = $1 LIMIT 1`,
    [slug],
  )
  return rows.length > 0
}

async function getExistingNameBySlug(slug) {
  const { rows } = await pool.query(
    `SELECT name FROM background_images WHERE slug = $1 LIMIT 1`,
    [slug],
  )
  return rows.length ? rows[0].name : null
}

async function importBackgroundImages(zipBuffer, resolution = {}) {
  const zip = new AdmZip(zipBuffer)
  const manifestEntry = zip.getEntry('manifest.json')
  if (!manifestEntry) {
    throw new Error('Invalid export: manifest.json not found')
  }
  const manifest = JSON.parse(manifestEntry.getData().toString('utf8'))
  if (manifest.type !== 'background-images' || !Array.isArray(manifest.items)) {
    throw new Error('Invalid export: invalid manifest type or items')
  }

  const conflicts = []
  for (const item of manifest.items) {
    const exists = await slugExists(item.slug)
    if (exists) {
      const existingName = await getExistingNameBySlug(item.slug)
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
    } else if (await slugExists(item.slug)) {
      continue
    }

    if (action === 'overwrite') {
      await deleteBackgroundImageFileWithLookup(item.slug)
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
      uploadPath: 'background-images',
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
          uploadPath: 'background-images',
        })
      }
    }

    const categoryId = await getOrCreateCategoryBySlug(item.category?.name, item.category?.slug || 'uncategorized')
    const record = await createBackgroundImage({
      name: item.name,
      slug: effectiveSlug,
      categoryId,
      description: item.description ?? null,
      format: item.format || 'vector',
      filePath: savedPath,
      thumbnailPath,
      defaults: item.defaults || {},
      paletteSlots: item.paletteSlots ?? null,
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
  listBackgroundImages,
  getBackgroundImage: getBackgroundImage,
  createBackgroundImage,
  updateBackgroundImage,
  deleteBackgroundImage,
  bulkDeleteBackgroundImages,
  exportBackgroundImages,
  importBackgroundImages,
  slugify,
  pool,
}

