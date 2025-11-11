const path = require('path')
const fs = require('fs/promises')
const { randomUUID } = require('crypto')

const STORAGE_ROOT = process.env.BACKGROUND_IMAGE_STORAGE_PATH || path.join(process.cwd(), 'uploads', 'background-images')
const STORAGE_TYPE = process.env.BACKGROUND_IMAGE_STORAGE_TYPE || 'local'

function slugify(value, fallback = 'file') {
  if (!value) return fallback
  const base = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || fallback
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

async function generateFileName(dirPath, desiredName) {
  const ext = path.extname(desiredName)
  const name = path.basename(desiredName, ext)
  let candidate = `${name}${ext}`
  let counter = 0
  while (true) {
    try {
      await fs.access(path.join(dirPath, candidate))
      counter += 1
      candidate = `${name}-${counter}${ext}`
    } catch {
      return candidate
    }
  }
}

async function saveLocalBackgroundImage({ category, originalName, buffer }) {
  const categorySlug = slugify(category, 'uncategorized')
  const ext = path.extname(originalName) || '.svg'
  const baseName = slugify(path.basename(originalName, ext), randomUUID())
  const targetDir = path.join(STORAGE_ROOT, categorySlug)
  await ensureDir(targetDir)
  const fileName = await generateFileName(targetDir, `${baseName}${ext}`)
  const filePath = path.join(targetDir, fileName)
  await fs.writeFile(filePath, buffer)
  const relativePath = path.join(categorySlug, fileName).replace(/\\/g, '/')
  return {
    storageType: 'local',
    filePath: relativePath,
    thumbnailPath: relativePath,
    bucket: null,
    objectKey: null,
  }
}

async function deleteLocalBackgroundImage({ filePath }) {
  if (!filePath) return
  const absolutePath = path.join(STORAGE_ROOT, filePath)
  try {
    await fs.unlink(absolutePath)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }
  }
}

async function saveBackgroundImageFile({ category, originalName, buffer }) {
  if (STORAGE_TYPE === 's3') {
    throw new Error('S3 storage not yet implemented. Configure local storage or extend file-storage.js')
  }
  return saveLocalBackgroundImage({ category, originalName, buffer })
}

async function deleteBackgroundImageFile({ storageType, filePath, bucket, objectKey }) {
  if (storageType === 's3') {
    // Placeholder for S3 deletion when implemented
    return
  }
  await deleteLocalBackgroundImage({ filePath })
}

module.exports = {
  saveBackgroundImageFile,
  deleteBackgroundImageFile,
}

