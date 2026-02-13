const express = require('express')
const path = require('path')
const fs = require('fs')
const backgroundImagesService = require('../services/background-images')
const { authenticateToken } = require('../middleware/auth')
const { getUploadsSubdir, isPathWithinUploads } = require('../utils/uploads-path')

const router = express.Router()

// Protected: Serve background image file (must be before /:identifier)
router.get('/:identifier/file', authenticateToken, async (req, res) => {
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

// Protected: Serve background image thumbnail
router.get('/:identifier/thumbnail', authenticateToken, async (req, res) => {
  try {
    const image = await backgroundImagesService.getBackgroundImage(req.params.identifier)
    if (!image || !image.storage?.filePath) {
      return res.status(404).json({ error: 'Background image not found' })
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

