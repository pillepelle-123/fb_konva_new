const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const { Pool } = require('pg')

// .env Laden (Root oder server/.env)
const dotenv = require('dotenv')
dotenv.config()
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const { getUploadsSubdir } = require('../utils/uploads-path')

const DATA_PATH = path.join(__dirname, '..', '..', 'client', 'src', 'data', 'templates', 'background-images.json')
const SOURCE_ASSET_ROOT = path.join(__dirname, '..', '..', 'client', 'src', 'assets', 'background-images')
const DEST_ASSET_ROOT = getUploadsSubdir('background-images')

function titleCase(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function slugify(value, fallback = 'background-image') {
  if (!value) return fallback
  const base = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || fallback
}

function extractRepeatMode(defaultSize) {
  if (!defaultSize) return null
  return defaultSize.includes('repeat') ? 'repeat' : null
}

async function copyAsset(relativePath) {
  if (!relativePath) return null
  const sourcePath = path.join(SOURCE_ASSET_ROOT, relativePath)
  try {
    await fsp.access(sourcePath)
  } catch {
    console.warn(`Asset nicht gefunden: ${sourcePath}`)
    return null
  }

  const destinationPath = path.join(DEST_ASSET_ROOT, relativePath)
  await fsp.mkdir(path.dirname(destinationPath), { recursive: true })

  try {
    await fsp.copyFile(sourcePath, destinationPath)
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error
    }
  }

  return relativePath.replace(/\\/g, '/')
}

async function importBackgroundImages() {
  const databaseUrlString = process.env.DATABASE_URL
  if (!databaseUrlString) {
    throw new Error('DATABASE_URL ist nicht gesetzt. Bitte .env prüfen oder Variable vor dem Skriptaufruf setzen.')
  }

  const pool = new Pool({
    connectionString: databaseUrlString,
  })

  const databaseUrl = new URL(databaseUrlString)
  const schema = databaseUrl.searchParams.get('schema') || 'public'

  pool.on('connect', (client) => {
    client.query(`SET search_path TO ${schema}`)
  })

  const client = await pool.connect()

  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    const images = Array.isArray(parsed?.images) ? parsed.images : []

    if (images.length === 0) {
      console.log('Keine Hintergrundbilder in JSON gefunden – Abbruch.')
      return
    }

    await client.query('BEGIN')

    const categoryIdMap = new Map()

    for (const image of images) {
      const slug = slugify(String(image.category || '').trim().toLowerCase(), 'uncategorized')

      if (categoryIdMap.has(slug)) continue

      const displayName = titleCase(slug)
      const result = await client.query(
        `
          INSERT INTO background_image_categories (name, slug, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (slug)
          DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
          RETURNING id
        `,
        [displayName, slug],
      )

      categoryIdMap.set(slug, result.rows[0].id)
    }

    let imported = 0

    for (const image of images) {
      const slug = slugify(String(image.id || '').trim().toLowerCase(), null)
      const categorySlug = slugify(String(image.category || '').trim().toLowerCase(), 'uncategorized')
      if (!slug || !categorySlug) continue

      const categoryId = categoryIdMap.get(categorySlug)
      if (!categoryId) continue

      const copiedFilePath =
        (await copyAsset(image.filePath || `${categorySlug}/${slug}.${image.format === 'pixel' ? 'png' : 'svg'}`)) || image.filePath || null
      const copiedThumbnailPath = image.thumbnail ? await copyAsset(image.thumbnail) : copiedFilePath

      const backgroundColor = image.backgroundColor ? JSON.stringify(image.backgroundColor) : null
      const tags = Array.isArray(image.tags) && image.tags.length > 0 ? image.tags : null
      const metadata = {
        legacySource: 'background-images.json',
        legacyId: image.id,
        uploadedFromJson: true,
      }

      await client.query(
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
            $8, $9, $10,
            $11, $12,
            $13::jsonb, $14,
            $15,
            $16::jsonb,
            NOW(),
            NOW()
          )
          ON CONFLICT (slug)
          DO UPDATE SET
            name = EXCLUDED.name,
            category_id = EXCLUDED.category_id,
            description = EXCLUDED.description,
            format = EXCLUDED.format,
            file_path = EXCLUDED.file_path,
            thumbnail_path = EXCLUDED.thumbnail_path,
            default_size = EXCLUDED.default_size,
            default_position = EXCLUDED.default_position,
            default_repeat = EXCLUDED.default_repeat,
            default_width = EXCLUDED.default_width,
            default_opacity = EXCLUDED.default_opacity,
            background_color = EXCLUDED.background_color,
            palette_slots = EXCLUDED.palette_slots,
            tags = EXCLUDED.tags,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
        `,
        [
          slug,
          image.name || titleCase(slug),
          categoryId,
          image.description || null,
          image.format || 'vector',
          copiedFilePath,
          copiedThumbnailPath,
          image.defaultSize || null,
          image.defaultPosition || null,
          extractRepeatMode(image.defaultSize),
          typeof image.defaultWidth === 'number' ? image.defaultWidth : null,
          typeof image.defaultOpacity === 'number' ? image.defaultOpacity : 1,
          backgroundColor,
          image.paletteSlots || null,
          tags,
          JSON.stringify(metadata),
        ],
      )

      imported += 1
    }

    await client.query('COMMIT')
    console.log(`Import abgeschlossen: ${imported} Hintergrundbilder synchronisiert.`)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Import fehlgeschlagen:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

importBackgroundImages()

