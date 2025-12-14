const express = require('express')
const multer = require('multer')
const { authenticateToken } = require('../../middleware/auth')
const { requireAdmin } = require('../../middleware/requireAdmin')
const stickersService = require('../../services/stickers')
const { saveBackgroundImageFile } = require('../../services/file-storage')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.STICKER_MAX_FILE_SIZE || 10 * 1024 * 1024),
    files: Number(process.env.STICKER_MAX_FILES || 20),
  },
})

const router = express.Router()

router.use(authenticateToken, requireAdmin)

router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      pageSize = '50',
      search,
      category,
      storageType,
      format,
      sort,
      order,
    } = req.query

    const result = await stickersService.listStickers({
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 50, 500),
      search,
      categorySlug: category,
      storageType,
      format,
      sort,
      order,
    })

    res.json(result)
  } catch (error) {
    console.error('Admin stickers list error:', error)
    res.status(500).json({ error: 'Failed to fetch stickers' })
  }
})

router.get('/categories', async (_req, res) => {
  try {
    const categories = await stickersService.listCategories()
    res.json({ items: categories })
  } catch (error) {
    console.error('Admin stickers categories error:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

router.post('/categories', async (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' })
  }

  try {
    const category = await stickersService.createCategory(name.trim())
    res.status(201).json({ category })
  } catch (error) {
    console.error('Admin create category error:', error)
    res.status(500).json({ error: 'Failed to create category' })
  }
})

router.patch('/categories/:id', async (req, res) => {
  const { id } = req.params
  const { name } = req.body

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' })
  }

  try {
    const updated = await stickersService.updateCategory(Number(id), name.trim())
    if (!updated) {
      return res.status(404).json({ error: 'Category not found' })
    }
    res.json({ category: updated })
  } catch (error) {
    console.error('Admin update category error:', error)
    res.status(500).json({ error: 'Failed to update category' })
  }
})

router.delete('/categories/:id', async (req, res) => {
  const { id } = req.params

  try {
    await stickersService.deleteCategory(Number(id))
    res.status(204).end()
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({ error: 'Category is in use and cannot be deleted' })
    }
    console.error('Admin delete category error:', error)
    res.status(500).json({ error: 'Failed to delete category' })
  }
})

router.post('/', async (req, res) => {
  const payload = Array.isArray(req.body?.stickers) ? req.body.stickers : [req.body]
  const created = []

  try {
    for (const sticker of payload) {
      if (!sticker || !sticker.name || !sticker.categoryId) {
        continue
      }
      const record = await stickersService.createSticker(sticker)
      created.push(record)
    }

    res.status(201).json({ items: created })
  } catch (error) {
    console.error('Admin create sticker error:', error)
    res.status(500).json({ error: 'Failed to create sticker(s)' })
  }
})

router.post('/upload', upload.array('files'), async (req, res) => {
  const category = req.body?.category
  if (!category) {
    return res.status(400).json({ error: 'category is required' })
  }
  if (!Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' })
  }

  try {
    const items = await Promise.all(
      req.files.map(async (file) => {
        const stored = await saveBackgroundImageFile({
          category,
          originalName: file.originalname,
          buffer: file.buffer,
          mimetype: file.mimetype,
          uploadPath: 'stickers',
        })
        return {
          originalName: file.originalname,
          storage: stored,
        }
      }),
    )
    res.status(201).json({ items })
  } catch (error) {
    console.error('Admin upload sticker error:', error)
    res.status(500).json({ error: 'Failed to store sticker files' })
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
    console.error('Admin get sticker error:', error)
    res.status(500).json({ error: 'Failed to fetch sticker' })
  }
})

router.patch('/:identifier', async (req, res) => {
  try {
    const updated = await stickersService.updateSticker(req.params.identifier, req.body || {})
    if (!updated) {
      return res.status(404).json({ error: 'Sticker not found' })
    }
    res.json({ sticker: updated })
  } catch (error) {
    console.error('Admin update sticker error:', error)
    res.status(500).json({ error: 'Failed to update sticker' })
  }
})

router.delete('/:identifier', async (req, res) => {
  try {
    await stickersService.deleteSticker(req.params.identifier)
    res.status(204).end()
  } catch (error) {
    console.error('Admin delete sticker error:', error)
    res.status(500).json({ error: 'Failed to delete sticker' })
  }
})

router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body || {}
    const result = await stickersService.bulkDeleteStickers(ids)
    res.json(result)
  } catch (error) {
    console.error('Admin bulk delete sticker error:', error)
    res.status(500).json({ error: 'Failed to delete stickers' })
  }
})

module.exports = router







