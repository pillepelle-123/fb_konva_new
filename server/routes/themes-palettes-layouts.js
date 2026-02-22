/**
 * Public API routes for themes, color palettes, and layouts.
 * Data is loaded from the database (no auth required for read).
 */
const express = require('express');
const service = require('../services/themes-palettes-layouts');

const themesRouter = express.Router();
themesRouter.get('/', async (_req, res) => {
  try {
    const themes = await service.listThemes();
    res.json({ themes });
  } catch (error) {
    console.error('Themes list error:', error);
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
});

const colorPalettesRouter = express.Router();
colorPalettesRouter.get('/', async (_req, res) => {
  try {
    const palettes = await service.listColorPalettes();
    res.json({ version: '1.0.0', palettes });
  } catch (error) {
    console.error('Color palettes list error:', error);
    res.status(500).json({ error: 'Failed to fetch color palettes' });
  }
});

const layoutsRouter = express.Router();
layoutsRouter.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const templates = await service.listLayouts(category);
    res.json({ version: '1.0.0', templates });
  } catch (error) {
    console.error('Layouts list error:', error);
    res.status(500).json({ error: 'Failed to fetch layouts' });
  }
});

module.exports = {
  themesRouter,
  colorPalettesRouter,
  layoutsRouter,
};
