const express = require('express');
const { authenticateToken } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/requireAdmin');
const service = require('../../services/themes-palettes-layouts');

const router = express.Router();
router.use(authenticateToken, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const templates = await service.listLayoutTemplates(category);
    res.json({ items: templates });
  } catch (error) {
    console.error('Admin layout templates list error:', error);
    res.status(500).json({ error: 'Failed to fetch layout templates' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const template = await service.getLayoutTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Layout template not found' });
    }
    res.json({ template });
  } catch (error) {
    console.error('Admin get layout template error:', error);
    res.status(500).json({ error: 'Failed to fetch layout template' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updated = await service.updateLayoutTemplate(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Layout template not found' });
    }
    res.json({ template: updated });
  } catch (error) {
    console.error('Admin update layout template error:', error);
    res.status(500).json({ error: 'Failed to update layout template' });
  }
});

module.exports = router;
