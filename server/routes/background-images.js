const express = require('express')
const path = require('path')
const fs = require('fs')
const sharp = require('sharp')
const backgroundImagesService = require('../services/background-images')
const backgroundImageDesignerService = require('../services/background-image-designer')
const { requireAppOrigin } = require('../middleware/require-app-origin')
const { getUploadsSubdir, isPathWithinUploads } = require('../utils/uploads-path')

const router = express.Router()

// Serve background image file – requires Referer/Origin from app (no auth)
router.get('/:identifier/file', requireAppOrigin, async (req, res) => {
  try {
    const image = await backgroundImagesService.getBackgroundImage(req.params.identifier)
    if (!image || !image.storage?.filePath) {
      return res.status(404).json({ error: 'Background image not found' })
    }
    const relPath = image.storage.filePath.replace(/^\/+/, '')
    const fullPath = path.resolve(path.join(getUploadsSubdir('background-images'), relPath))
    if (!isPathWithinUploads(fullPath)) {
      return res.status(403).json({ error: 'Invalid file path' })
    }
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Background image file not found' })
    }
    const ext = path.extname(fullPath).toLowerCase()
    const mimeTypes = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.sendFile(fullPath)
  } catch (error) {
    console.error('Error serving background image file:', error)
    res.status(500).json({ error: 'Failed to load background image' })
  }
})

// Serve background image thumbnail – requires Referer/Origin from app (no auth)
router.get('/:identifier/thumbnail', requireAppOrigin, async (req, res) => {
  try {
    const image = await backgroundImagesService.getBackgroundImage(req.params.identifier)
    if (!image || !image.storage?.filePath) {
      return res.status(404).json({ error: 'Background image thumbnail not found' })
    }
    const relPath = (image.storage.thumbnailPath || image.storage.filePath || '').replace(/^\/+/, '')
    if (!relPath) return res.status(404).json({ error: 'Background image thumbnail not found' })
    const fullPath = path.resolve(path.join(getUploadsSubdir('background-images'), relPath))
    if (!isPathWithinUploads(fullPath)) {
      return res.status(403).json({ error: 'Invalid file path' })
    }
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Background image thumbnail not found' })
    }
    const ext = path.extname(fullPath).toLowerCase()
    const mimeTypes = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.sendFile(fullPath)
  } catch (error) {
    console.error('Error serving background image thumbnail:', error)
    res.status(500).json({ error: 'Failed to load background image' })
  }
})

router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      pageSize = '100',
      search,
      category,
    } = req.query

    const result = await backgroundImagesService.listBackgroundImages({
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 100, 500),
      search,
      categorySlug: category,
      sort: 'name',
      order: 'asc',
    })

    res.json(result)
  } catch (error) {
    console.error('Public background-images list error:', error)
    res.status(500).json({ error: 'Failed to fetch background images' })
  }
})

router.get('/categories', async (_req, res) => {
  try {
    const categories = await backgroundImagesService.listCategories()
    res.json({ items: categories })
  } catch (error) {
    console.error('Public background-images categories error:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

router.get('/designer', async (req, res) => {
  try {
    const {
      page = '1',
      pageSize = '100',
      search,
      category,
      sort,
      order,
    } = req.query

    const result = await backgroundImageDesignerService.listDesignerImages({
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 100, 500),
      search,
      categorySlug: category,
      sort,
      order,
    })

    res.json(result)
  } catch (error) {
    console.error('Public designer background-images list error:', error)
    res.status(500).json({ error: 'Failed to fetch designer background images' })
  }
})

router.get('/designer/:identifier', async (req, res) => {
  try {
    const image = await backgroundImageDesignerService.getDesignerImageByIdentifier(req.params.identifier)
    if (!image) {
      return res.status(404).json({ error: 'Designer background image not found' })
    }
    res.json({ image })
  } catch (error) {
    console.error('Public designer background image error:', error)
    res.status(500).json({ error: 'Failed to fetch designer background image' })
  }
})

router.get('/designer/assets/*', requireAppOrigin, async (req, res) => {
  try {
    const relativePath = (req.params[0] || '').replace(/^\/+/, '')

    if (!relativePath) {
      return res.status(400).json({ error: 'Missing asset path' })
    }

    if (
      !relativePath.startsWith('_designer/') &&
      !relativePath.startsWith('designer/') &&
      !relativePath.startsWith('_image_assets/')
    ) {
      return res.status(403).json({ error: 'Invalid designer asset path' })
    }

    const fullPath = path.resolve(path.join(getUploadsSubdir('background-images'), relativePath))
    if (!isPathWithinUploads(fullPath)) {
      return res.status(403).json({ error: 'Invalid file path' })
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Designer asset not found' })
    }

    const requestedFormat = String(req.query.format || '').toLowerCase()
    const ext = path.extname(fullPath).toLowerCase()

    // Headless canvas rendering is more robust with raster images than SVG.
    if (requestedFormat === 'png' && ext === '.svg') {
      const pngBuffer = await sharp(fullPath, { density: 300 }).png().toBuffer()
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Cache-Control', 'private, max-age=3600')
      return res.send(pngBuffer)
    }

    const mimeTypes = {
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    }
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.sendFile(fullPath)
  } catch (error) {
    console.error('Error serving designer asset file:', error)
    res.status(500).json({ error: 'Failed to load designer asset' })
  }
})

router.get('/:identifier', async (req, res) => {
  try {
    const image = await backgroundImagesService.getBackgroundImage(req.params.identifier)
    if (!image) {
      return res.status(404).json({ error: 'Background image not found' })
    }
    res.json({ image })
  } catch (error) {
    console.error('Public background image error:', error)
    res.status(500).json({ error: 'Failed to fetch background image' })
  }
})

module.exports = router

