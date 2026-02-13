const express = require('express')
const path = require('path')
const fs = require('fs')
const stickersService = require('../services/stickers')
const { authenticateToken } = require('../middleware/auth')
const { getUploadsDir, getUploadsSubdir, isPathWithinUploads } = require('../utils/uploads-path')

const router = express.Router()

// Protected: Serve sticker file (must be before /:identifier)
router.get('/:identifier/file', authenticateToken, async (req, res) => {
  try {
    const sticker = await stickersService.getSticker(req.params.identifier)
    if (!sticker || !sticker.storage?.filePath) {
      return res.status(404).json({ error: 'Sticker not found' })
    }
    const relPath = sticker.storage.filePath.replace(/^\/+/, '')
    const fullPath = path.resolve(path.join(getUploadsSubdir('stickers'), relPath))
    if (!isPathWithinUploads(fullPath)) {
      return res.status(403).json({ error: 'Invalid file path' })
    }
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Sticker file not found' })
    }
    const ext = path.extname(fullPath).toLowerCase()
    const mimeTypes = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.sendFile(fullPath)
  } catch (error) {
    console.error('Error serving sticker file:', error)
    res.status(500).json({ error: 'Failed to load sticker' })
  }
})

// Protected: Serve sticker thumbnail
router.get('/:identifier/thumbnail', authenticateToken, async (req, res) => {
  try {
    const sticker = await stickersService.getSticker(req.params.identifier)
    if (!sticker || !sticker.storage?.filePath) {
      return res.status(404).json({ error: 'Sticker not found' })
    }
    const relPath = (sticker.storage.thumbnailPath || sticker.storage.filePath || '').replace(/^\/+/, '')
    if (!relPath) return res.status(404).json({ error: 'Sticker thumbnail not found' })
    const fullPath = path.resolve(path.join(getUploadsSubdir('stickers'), relPath))
    if (!isPathWithinUploads(fullPath)) {
      return res.status(403).json({ error: 'Invalid file path' })
    }
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Sticker thumbnail not found' })
    }
    const ext = path.extname(fullPath).toLowerCase()
    const mimeTypes = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.sendFile(fullPath)
  } catch (error) {
    console.error('Error serving sticker thumbnail:', error)
    res.status(500).json({ error: 'Failed to load sticker' })
  }
})

router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      pageSize = '100',
      search,
      category,
      format,
    } = req.query

    const result = await stickersService.listStickers({
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 100, 500),
      search,
      categorySlug: category,
      format,
      sort: 'name',
      order: 'asc',
    })

    res.json(result)
  } catch (error) {
    console.error('Public stickers list error:', error)
    res.status(500).json({ error: 'Failed to fetch stickers' })
  }
})

router.get('/categories', async (_req, res) => {
  try {
    const categories = await stickersService.listCategories()
    res.json({ items: categories })
  } catch (error) {
    console.error('Public stickers categories error:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

router.get('/:identifier', async (req, res) => {
  try {
    const sticker = await stickersService.getSticker(req.params.identifier)
    if (!sticker) {
      return res.status(404).json({ error: 'Sticker not found' })
    }
    res.json({ sticker })
  } catch (error) {
    console.error('Public sticker error:', error)
    res.status(500).json({ error: 'Failed to fetch sticker' })
  }
})

module.exports = router












