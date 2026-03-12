const path = require('path')
const fs = require('fs/promises')
const { randomUUID } = require('crypto')
const sharp = require('sharp')
const { getUploadsSubdir } = require('../utils/uploads-path')

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

async function saveLocalBackgroundImage({ category, originalName, preferredName, buffer, uploadPath = 'background-images' }) {
  const categorySlug = slugify(category, 'uncategorized')
  const ext = path.extname(originalName) || '.svg'
  const fallbackBase = path.basename(originalName, ext)
  const baseName = slugify(preferredName || fallbackBase, randomUUID())
  
  // Use UPLOADS_DIR from environment or fallback to root/uploads
  const storageDir = getUploadsSubdir(uploadPath)
  const targetDir = path.join(storageDir, categorySlug)
  await ensureDir(targetDir)
  const fileName = await generateFileName(targetDir, `${baseName}${ext}`)
  const filePath = path.join(targetDir, fileName)
  await fs.writeFile(filePath, buffer)
  const relativePath = path.join(categorySlug, fileName).replace(/\\/g, '/')

  let thumbnailRelativePath = relativePath
  let thumbnailPublicUrl = null

  try {
    const fileNameExt = path.extname(fileName).toLowerCase()
    const fileNameBase = path.basename(fileName, fileNameExt)
    const isSvg = fileNameExt === '.svg'
    const thumbExt = isSvg ? '.png' : fileNameExt
    const thumbFileName = await generateFileName(targetDir, `${fileNameBase}_thumb${thumbExt}`)
    const thumbAbsolutePath = path.join(targetDir, thumbFileName)

    let thumbPipeline = isSvg
      ? sharp(buffer, { density: 300 })
      : sharp(buffer).rotate()

    thumbPipeline = thumbPipeline.resize(512, 512, {
      fit: 'inside',
      withoutEnlargement: true,
    })

    if (thumbExt === '.jpg' || thumbExt === '.jpeg') {
      thumbPipeline = thumbPipeline.jpeg({ quality: 80 })
    } else if (thumbExt === '.webp') {
      thumbPipeline = thumbPipeline.webp({ quality: 80 })
    } else {
      thumbPipeline = thumbPipeline.png({ quality: 80 })
    }

    await thumbPipeline.toFile(thumbAbsolutePath)

    thumbnailRelativePath = path.join(categorySlug, thumbFileName).replace(/\\/g, '/')
    thumbnailPublicUrl = `/uploads/${uploadPath}/${thumbnailRelativePath.replace(/^\/+/, '')}`
  } catch (error) {
    console.warn(`Failed to generate thumbnail for ${originalName}:`, error.message)
  }

  const normalizedRelative = relativePath.replace(/^\/+/, '')
  const publicUrl = `/uploads/${uploadPath}/${normalizedRelative}`

  return {
    filePath: relativePath,
    thumbnailPath: thumbnailRelativePath,
    publicUrl,
    thumbnailUrl: thumbnailPublicUrl || publicUrl,
  }
}

async function deleteLocalBackgroundImage({ filePath, uploadPath = 'background-images' }) {
  if (!filePath) return
  // filePath is relative (e.g., "category/image.svg"), so we need to construct the full path
  const storageDir = getUploadsSubdir(uploadPath)
  const absolutePath = path.join(storageDir, filePath)
  try {
    await fs.unlink(absolutePath)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }
  }
}

async function saveBackgroundImageFile({ category, originalName, preferredName, buffer, uploadPath = 'background-images' }) {
  return saveLocalBackgroundImage({ category, originalName, preferredName, buffer, uploadPath })
}

async function deleteBackgroundImageFile({ filePath, uploadPath = 'background-images' }) {
  await deleteLocalBackgroundImage({ filePath, uploadPath })
}

async function saveBackgroundImageAtPath({ relativePath, buffer, uploadPath = 'background-images' }) {
  const storageDir = getUploadsSubdir(uploadPath)
  const fullPath = path.join(storageDir, relativePath)
  await ensureDir(path.dirname(fullPath))
  await fs.writeFile(fullPath, buffer)
  return relativePath.replace(/\\/g, '/')
}

module.exports = {
  saveBackgroundImageFile,
  deleteBackgroundImageFile,
  saveBackgroundImageAtPath,
}

