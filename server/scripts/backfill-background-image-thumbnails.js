const path = require('path')
const fs = require('fs/promises')
const sharp = require('sharp')
const { Pool } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { getUploadsSubdir } = require('../utils/uploads-path')

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Please configure server/.env first.')
  process.exit(1)
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const limitArg = args.find((arg) => arg.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : null
const thumbnailMaxSize = 512

function parseDbSchema(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl)
    return parsed.searchParams.get('schema') || 'public'
  } catch {
    return 'public'
  }
}

function normalizeRelPath(relPath) {
  return String(relPath || '').replace(/^\/+/, '').replace(/\\/g, '/')
}

function fileExists(filePath) {
  return fs
    .access(filePath)
    .then(() => true)
    .catch(() => false)
}

function getThumbFormat(sourceExt) {
  if (sourceExt === '.svg') return '.png'
  if (sourceExt === '.jpg' || sourceExt === '.jpeg') return '.jpg'
  if (sourceExt === '.webp') return '.webp'
  return '.png'
}

function buildDesiredThumbRelativePath(sourceRelativePath) {
  const sourceExt = path.extname(sourceRelativePath).toLowerCase()
  const thumbExt = getThumbFormat(sourceExt)
  const sourceDir = path.dirname(sourceRelativePath)
  const sourceBaseName = path.basename(sourceRelativePath, sourceExt)
  const thumbName = `${sourceBaseName}_thumb${thumbExt}`
  return sourceDir === '.' ? thumbName : path.posix.join(sourceDir, thumbName)
}

async function generateThumbnailFile({ sourceAbsolutePath, targetAbsolutePath, sourceExt }) {
  let pipeline =
    sourceExt === '.svg'
      ? sharp(sourceAbsolutePath, { density: 300, limitInputPixels: false })
      : sharp(sourceAbsolutePath, { limitInputPixels: false }).rotate()

  pipeline = pipeline.resize(thumbnailMaxSize, thumbnailMaxSize, {
    fit: 'inside',
    withoutEnlargement: true,
  })

  if (sourceExt === '.jpg' || sourceExt === '.jpeg') {
    pipeline = pipeline.jpeg({ quality: 80 })
  } else if (sourceExt === '.webp') {
    pipeline = pipeline.webp({ quality: 80 })
  } else {
    pipeline = pipeline.png({ quality: 80 })
  }

  await fs.mkdir(path.dirname(targetAbsolutePath), { recursive: true })
  await pipeline.toFile(targetAbsolutePath)
}

async function backfillBackgroundImageThumbnails() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const schema = parseDbSchema(process.env.DATABASE_URL)
  const uploadsDir = getUploadsSubdir('background-images')

  pool.on('connect', (client) => {
    client.query(`SET search_path TO ${schema}`)
  })

  const stats = {
    total: 0,
    skippedAlreadyValid: 0,
    skippedMissingSource: 0,
    generated: 0,
    updatedDbOnly: 0,
    errors: 0,
  }

  try {
    const query = `
      SELECT id, slug, file_path, thumbnail_path
      FROM background_images
      WHERE file_path IS NOT NULL AND file_path <> ''
      ORDER BY created_at DESC
    `

    const { rows } = await pool.query(query)
    const rowsToProcess = typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? rows.slice(0, limit) : rows

    stats.total = rowsToProcess.length

    console.log(
      `[backfill-background-image-thumbnails] Starting: total=${stats.total}, dryRun=${dryRun}, force=${force}`,
    )

    for (const row of rowsToProcess) {
      const identifier = row.slug || row.id
      const sourceRelative = normalizeRelPath(row.file_path)
      const currentThumbRelative = normalizeRelPath(row.thumbnail_path || '')

      const sourceAbsolute = path.resolve(path.join(uploadsDir, sourceRelative))
      const sourceExists = await fileExists(sourceAbsolute)
      if (!sourceExists) {
        stats.skippedMissingSource += 1
        console.warn(`[skip:missing-source] ${identifier} -> ${sourceRelative}`)
        continue
      }

      const desiredThumbRelative = buildDesiredThumbRelativePath(sourceRelative)
      const desiredThumbAbsolute = path.resolve(path.join(uploadsDir, desiredThumbRelative))
      const desiredThumbExists = await fileExists(desiredThumbAbsolute)

      const hasCustomExistingThumb =
        currentThumbRelative && currentThumbRelative !== sourceRelative && currentThumbRelative !== desiredThumbRelative

      if (hasCustomExistingThumb && !force) {
        const existingThumbAbsolute = path.resolve(path.join(uploadsDir, currentThumbRelative))
        const existingThumbExists = await fileExists(existingThumbAbsolute)
        if (existingThumbExists) {
          stats.skippedAlreadyValid += 1
          continue
        }
      }

      const sourceExt = path.extname(sourceRelative).toLowerCase()
      const shouldGenerate = force || !desiredThumbExists

      try {
        if (shouldGenerate) {
          if (!dryRun) {
            await generateThumbnailFile({
              sourceAbsolutePath: sourceAbsolute,
              targetAbsolutePath: desiredThumbAbsolute,
              sourceExt,
            })
          }
          stats.generated += 1
        } else {
          stats.skippedAlreadyValid += 1
        }

        const shouldUpdateDb = currentThumbRelative !== desiredThumbRelative
        if (shouldUpdateDb) {
          if (!dryRun) {
            await pool.query(
              `
                UPDATE background_images
                SET thumbnail_path = $1, updated_at = NOW()
                WHERE id = $2
              `,
              [desiredThumbRelative, row.id],
            )
          }
          stats.updatedDbOnly += 1
        }
      } catch (error) {
        stats.errors += 1
        console.error(`[error] ${identifier}: ${error.message}`)
      }
    }

    console.log('[backfill-background-image-thumbnails] Done')
    console.log(JSON.stringify(stats, null, 2))
  } catch (error) {
    console.error('Backfill failed:', error)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

backfillBackgroundImageThumbnails()
