const express = require('express');
const { authenticateToken } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/requireAdmin');
const service = require('../../services/themes-palettes-layouts');

const router = express.Router();
router.use(authenticateToken, requireAdmin);

router.post('/', async (req, res) => {
  try {
    const theme = await service.createTheme(req.body);
    if (!theme) {
      return res.status(500).json({ error: 'Failed to create theme' });
    }
    res.status(201).json({ theme });
  } catch (error) {
    console.error('Admin create theme error:', error);
    res.status(500).json({ error: 'Failed to create theme' });
  }
});

router.get('/', async (_req, res) => {
  try {
    const themes = await service.listThemes();
    res.json({ items: themes });
  } catch (error) {
    console.error('Admin themes list error:', error);
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const theme = await service.getThemeById(req.params.id);
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    res.json({ theme });
  } catch (error) {
    console.error('Admin get theme error:', error);
    res.status(500).json({ error: 'Failed to fetch theme' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updated = await service.updateTheme(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    res.json({ theme: updated });
  } catch (error) {
    console.error('Admin update theme error:', error);
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

router.get('/:id/page-background', async (req, res) => {
  try {
    const theme = await service.getThemeById(req.params.id);
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    const pageBackground = await service.getThemePageBackground(req.params.id);
    res.json({ pageBackground: pageBackground || null });
  } catch (error) {
    console.error('Admin get theme page background error:', error);
    res.status(500).json({ error: 'Failed to fetch theme page background' });
  }
});

router.put('/:id/page-background', async (req, res) => {
  try {
    const theme = await service.getThemeById(req.params.id);
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    const pageBackground = await service.upsertThemePageBackground(req.params.id, req.body);
    res.json({ pageBackground });
  } catch (error) {
    console.error('Admin update theme page background error:', error);
    res.status(500).json({ error: 'Failed to update theme page background' });
  }
});

router.delete('/:id/page-background', async (req, res) => {
  try {
    const theme = await service.getThemeById(req.params.id);
    if (!theme) {
      return res.status(404).json({ error: 'Theme not found' });
    }
    await service.deleteThemePageBackground(req.params.id);
    res.status(204).end();
  } catch (error) {
    console.error('Admin delete theme page background error:', error);
    res.status(500).json({ error: 'Failed to delete theme page background' });
  }
});

module.exports = router;
