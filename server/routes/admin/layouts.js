const express = require('express');
const { authenticateToken } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/requireAdmin');
const service = require('../../services/themes-palettes-layouts');

const router = express.Router();
router.use(authenticateToken, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const templates = await service.listLayouts(category);
    res.json({ items: templates });
  } catch (error) {
    console.error('Admin layouts list error:', error);
    res.status(500).json({ error: 'Failed to fetch layouts' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const template = await service.getLayoutById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Layout not found' });
    }
    res.json({ template });
  } catch (error) {
    console.error('Admin get layout error:', error);
    res.status(500).json({ error: 'Failed to fetch layout' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updated = await service.updateLayout(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Layout not found' });
    }
    res.json({ template: updated });
  } catch (error) {
    console.error('Admin update layout error:', error);
    res.status(500).json({ error: 'Failed to update layout' });
  }
});

module.exports = router;
