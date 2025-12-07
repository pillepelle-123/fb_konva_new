const express = require('express')
const stickersService = require('../services/stickers')

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      pageSize = '100',
      search,
      category,
      storageType,
      format,
    } = req.query

    const result = await stickersService.listStickers({
      page: Number(page) || 1,
      pageSize: Math.min(Number(pageSize) || 100, 500),
      search,
      categorySlug: category,
      storageType,
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
