const express = require('express')
const backgroundImagesService = require('../services/background-images')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      pageSize = '100',
      search,
      category,
      storageType,
    } = req.query

    const result = await backgroundImagesService.listBackgroundImages({
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 100, 500),
      search,
      categorySlug: category,
      storageType,
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

