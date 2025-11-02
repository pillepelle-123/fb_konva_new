const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Load template and palette data
async function loadTemplates() {
  const data = await fs.readFile(path.join(__dirname, '../data/templates.json'), 'utf8');
  return JSON.parse(data);
}

async function loadColorPalettes() {
  // Load from client-side JSON file (single source of truth)
  const data = await fs.readFile(path.join(__dirname, '../../client/src/data/templates/color-palettes.json'), 'utf8');
  return JSON.parse(data);
}

// GET /api/templates - returns all templates with optional category filter
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const templateData = await loadTemplates();
    
    let templates = templateData.templates;
    if (category && category !== 'all') {
      templates = templates.filter(t => t.category === category);
    }
    
    res.json({
      version: templateData.version,
      templates
    });
  } catch (error) {
    console.error('Error loading templates:', error);
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

// GET /api/templates/:id - returns specific template by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const templateData = await loadTemplates();
    
    const template = templateData.templates.find(t => t.id === id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error loading template:', error);
    res.status(500).json({ error: 'Failed to load template' });
  }
});

// GET /api/color-palettes - returns all color palettes  
router.get('/color-palettes', async (req, res) => {
  try {
    const paletteData = await loadColorPalettes();
    res.json({
      version: paletteData.version,
      palettes: paletteData.palettes
    });
  } catch (error) {
    console.error('Error loading color palettes:', error);
    res.status(500).json({ error: 'Failed to load color palettes' });
  }
});

// POST /api/pages/from-template - creates page from template (requires auth)
router.post('/from-template', authenticateToken, async (req, res) => {
  try {
    const { templateId, paletteId, pageIndex, customizations } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!templateId || !pageIndex) {
      return res.status(400).json({ error: 'templateId and pageIndex are required' });
    }
    
    // Load template and palette data
    const templateData = await loadTemplates();
    const paletteData = await loadColorPalettes();
    
    const template = templateData.templates.find(t => t.id === templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    let palette = null;
    if (paletteId) {
      palette = paletteData.palettes.find(p => p.id === paletteId);
      if (!palette) {
        return res.status(404).json({ error: 'Color palette not found' });
      }
    }
    
    // Apply customizations and palette
    let finalTemplate = { ...template };
    if (palette) {
      finalTemplate.colorPalette = palette.colors;
    }
    if (customizations) {
      // Apply customizations (question count, arrangement, etc.)
      if (customizations.questionCount) {
        // Adjust textboxes based on question count
        // Implementation would depend on specific customization logic
      }
    }
    
    // Convert template to canvas elements
    const elements = [];
    
    // Convert textboxes
    finalTemplate.textboxes.forEach((textbox, index) => {
      elements.push({
        id: uuidv4(),
        type: 'text',
        textType: 'qna_inline',
        x: textbox.position.x,
        y: textbox.position.y,
        width: textbox.size.width,
        height: textbox.size.height,
        text: '',
        fontColor: finalTemplate.colorPalette.text,
        backgroundColor: finalTemplate.colorPalette.background,
        fontSize: 14,
        fontFamily: 'Century Gothic, sans-serif',
        align: 'left',
        padding: 12,
        cornerRadius: 8
      });
    });
    
    // Convert image slots
    finalTemplate.elements.filter(el => el.type === 'image').forEach(imageSlot => {
      elements.push({
        id: uuidv4(),
        type: 'placeholder',
        x: imageSlot.position.x,
        y: imageSlot.position.y,
        width: imageSlot.size.width,
        height: imageSlot.size.height,
        fill: '#e5e7eb',
        stroke: '#9ca3af',
        strokeWidth: 2,
        cornerRadius: 8
      });
    });
    
    // Convert stickers
    finalTemplate.elements.filter(el => el.type === 'sticker').forEach(sticker => {
      elements.push({
        id: uuidv4(),
        type: 'circle',
        x: sticker.position.x,
        y: sticker.position.y,
        width: sticker.size.width,
        height: sticker.size.height,
        fill: '#fbbf24',
        stroke: '#f59e0b',
        strokeWidth: 2
      });
    });
    
    res.json({
      template: finalTemplate,
      elements,
      background: finalTemplate.background,
      message: 'Page created from template successfully'
    });
    
  } catch (error) {
    console.error('Error creating page from template:', error);
    res.status(500).json({ error: 'Failed to create page from template' });
  }
});

module.exports = router;