const express = require('express');
const { authenticateToken } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/requireAdmin');
const service = require('../../services/themes-palettes-layouts');

const router = express.Router();
router.use(authenticateToken, requireAdmin);

router.get('/', async (_req, res) => {
  try {
    const palettes = await service.listColorPalettes();
    res.json({ items: palettes });
  } catch (error) {
    console.error('Admin color palettes list error:', error);
    res.status(500).json({ error: 'Failed to fetch color palettes' });
  }
});

router.post('/', async (req, res) => {
  try {
    const palette = await service.createColorPalette(req.body);
    res.status(201).json({ palette });
  } catch (error) {
    console.error('Admin create color palette error:', error);
    res.status(500).json({ error: 'Failed to create color palette' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const palette = await service.getColorPaletteById(req.params.id);
    if (!palette) {
      return res.status(404).json({ error: 'Color palette not found' });
    }
    res.json({ palette });
  } catch (error) {
    console.error('Admin get color palette error:', error);
    res.status(500).json({ error: 'Failed to fetch color palette' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updated = await service.updateColorPalette(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Color palette not found' });
    }
    res.json({ palette: updated });
  } catch (error) {
    console.error('Admin update color palette error:', error);
    res.status(500).json({ error: 'Failed to update color palette' });
  }
});

module.exports = router;
