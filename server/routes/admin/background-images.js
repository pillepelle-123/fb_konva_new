const express = require('express')
const multer = require('multer')
const { authenticateToken } = require('../../middleware/auth')
const { requireAdmin } = require('../../middleware/requireAdmin')
const backgroundImagesService = require('../../services/background-images')
const { saveBackgroundImageFile } = require('../../services/file-storage')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.BACKGROUND_IMAGE_MAX_FILE_SIZE || 10 * 1024 * 1024),
    files: Number(process.env.BACKGROUND_IMAGE_MAX_FILES || 20),
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
      sort,
      order,
    } = req.query

    const result = await backgroundImagesService.listBackgroundImages({
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 50, 500),
      search,
      categorySlug: category,
      sort,
      order,
    })

    res.json(result)
  } catch (error) {
    console.error('Admin background-images list error:', error)
    res.status(500).json({ error: 'Failed to fetch background images' })
  }
})

router.get('/categories', async (_req, res) => {
  try {
    const categories = await backgroundImagesService.listCategories()
    res.json({ items: categories })
  } catch (error) {
    console.error('Admin background-images categories error:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

router.post('/categories', async (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' })
  }

  try {
    const category = await backgroundImagesService.createCategory(name.trim())
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
    const updated = await backgroundImagesService.updateCategory(Number(id), name.trim())
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
    await backgroundImagesService.deleteCategory(Number(id))
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
  const payload = Array.isArray(req.body?.images) ? req.body.images : [req.body]
  const created = []

  try {
    for (const image of payload) {
      if (!image || !image.name || !image.categoryId) {
        continue
      }
      const record = await backgroundImagesService.createBackgroundImage(image)
      created.push(record)
    }

    res.status(201).json({ items: created })
  } catch (error) {
    console.error('Admin create background image error:', error)
    res.status(500).json({ error: 'Failed to create background image(s)' })
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
        })
        return {
          originalName: file.originalname,
          storage: stored,
        }
      }),
    )
    res.status(201).json({ items })
  } catch (error) {
    console.error('Admin upload background image error:', error)
    res.status(500).json({ error: 'Failed to store background image files' })
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
    console.error('Admin get background image error:', error)
    res.status(500).json({ error: 'Failed to fetch background image' })
  }
})

router.patch('/:identifier', async (req, res) => {
  try {
    const updated = await backgroundImagesService.updateBackgroundImage(req.params.identifier, req.body || {})
    if (!updated) {
      return res.status(404).json({ error: 'Background image not found' })
    }
    res.json({ image: updated })
  } catch (error) {
    console.error('Admin update background image error:', error)
    res.status(500).json({ error: 'Failed to update background image' })
  }
})

router.delete('/:identifier', async (req, res) => {
  try {
    await backgroundImagesService.deleteBackgroundImage(req.params.identifier)
    res.status(204).end()
  } catch (error) {
    console.error('Admin delete background image error:', error)
    res.status(500).json({ error: 'Failed to delete background image' })
  }
})

router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body || {}
    const result = await backgroundImagesService.bulkDeleteBackgroundImages(ids)
    res.json(result)
  } catch (error) {
    console.error('Admin bulk delete background image error:', error)
    res.status(500).json({ error: 'Failed to delete background images' })
  }
})

router.post('/export', async (req, res) => {
  try {
    const slugs = Array.isArray(req.body?.slugs) ? req.body.slugs : []
    if (slugs.length === 0) {
      return res.status(400).json({ error: 'At least one slug is required' })
    }
    const date = new Date().toISOString().slice(0, 10)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="export-background-images-${date}.zip"`,
    )
    res.setHeader('Content-Type', 'application/zip')
    await backgroundImagesService.exportBackgroundImages(slugs, res)
  } catch (error) {
    console.error('Admin export background images error:', error)
    res.status(500).json({ error: 'Failed to export background images' })
  }
})

router.post('/import', upload.fields([{ name: 'file', maxCount: 1 }]), async (req, res) => {
  try {
    const file = req.files?.file?.[0]
    if (!file || !file.buffer) {
      return res.status(400).json({ error: 'ZIP file is required' })
    }
    let resolution = {}
    if (req.body?.resolution) {
      try {
        resolution = JSON.parse(req.body.resolution)
      } catch {
        return res.status(400).json({ error: 'Invalid resolution JSON' })
      }
    }
    const result = await backgroundImagesService.importBackgroundImages(file.buffer, resolution)
    if (result.conflicts) {
      return res.status(409).json(result)
    }
    res.status(201).json(result)
  } catch (error) {
    console.error('Admin import background images error:', error)
    res.status(500).json({ error: 'Failed to import background images' })
  }
})

module.exports = router

